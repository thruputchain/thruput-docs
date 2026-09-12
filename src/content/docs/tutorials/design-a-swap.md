---
title: Design a Swap
description: How a constant-product AMM is built on Groundhog, and why the execution model shapes it.
draft: true
---

A constant-product AMM is a good example for this chain because a direct port
of one does not work well, and the reasons it does not work are the reasons
Groundhog behaves differently from an EVM chain.

This page walks through the design of the `swap-*` example suite. It is not a
source tour. The pricing math is UniswapV2's and is well explained elsewhere.
What is worth your time is the shape around that math, because every structural
decision in the suite was forced by a property of the execution model, and you
will meet the same forces in your own contracts.

**Prerequisites:** [Build a Token](/tutorials/build-a-token/). You should be
able to write a contract, deploy it, and call another contract through a
generated client.

:::note[Naming]
Contracts and types are named by identifier and by the crate that defines them,
for example `Queue` in `batch-driver`. The example suite lives in the
`groundhog-examples` repository.
:::

## The problem

A pair holds two reserves. Every operation reads them, computes against them,
and writes them back:

```rust
let (reserve0, reserve1) = self.reserves.get();
let amount_out = compute_output(amount_in, reserve0, reserve1);
self.reserves.set(&(reserve0 + amount_in, reserve1 - amount_out));
```

On Groundhog, every transaction in a block reads the same committed snapshot.
Two swaps in one block both read the same reserves, both compute from them, and
both write a whole new value. Those writes do not merge: they are two different
answers to the same question. One transaction commits and the other is excluded
from the block and returned to the mempool.

That is not a bug, and it is not a failure either. See
[Execution Model](/how-it-works/execution-model/) for what exclusion means. But
follow it through and the consequence is severe:

> A directly ported pair executes **one operation per block, for the whole
> network**, no matter how many users want to trade.

Every design decision below is a consequence of fixing that.

:::caution[The serial part stays serial]
Nothing here makes the pair's operations concurrent. They cannot be: each one
genuinely depends on the result of the last. What changes is *when* the serial
work happens, and how many users can be served in one pass of it.
:::

## Split acceptance from execution

The operation has to be serial. Accepting a request does not.

So the suite splits them. A user does not swap; a user submits a *request* to
swap. Requests land in a queue, and the queue is drained later, in a
transaction of its own.

```
  many transactions, one block              one transaction, later
  ┌──────────┐
  │ Alice    │──┐
  ├──────────┤  │   ┌───────────┐          ┌────────────────────┐
  │ Bob      │──┼──▶│   queue   │─────────▶│ drain: op, op, op  │
  ├──────────┤  │   └───────────┘          └────────────────────┘
  │ Carol    │──┘        RCQ                  serial, as required
  └──────────┘      inserts commute
```

The queue is an `RCQ`, a retro-causal queue provided by the SDK. Its inserts
**commute**: two transactions inserting in the same block do not conflict,
because neither has to read the queue to add to it. Any number of requests can
be accepted together.

Draining is the other half of the rule: only one transaction per block may
consume from a given queue. That is exactly the serialization the pair needs,
and now it costs one transaction per block instead of one per user.

The throughput ceiling moves. It is no longer "one operation per block". It is
"how many operations fit in one transaction".

:::tip[The general lesson]
When two transactions conflict, the fix is usually to change *what you write*,
not to add locking. A write that commutes (a queue insert, a balance delta) is
one that a concurrent transaction never has to wait for.
:::

## Batch the serial work

A drain is called a *crank*, and anyone may send one. `Queue::crank` in
`batch-driver` takes requests off the queue one at a time and hands each to a
closure that knows how to perform it. The swap driver's closure is the whole of
what it contributes:

```rust
self.queue.crank(|request, gas_limit| {
    cfg.handler()
        .with_commit_locking()
        .with_gas_limit(gas_limit)
        .try_handle_request(request)
})
```

Two things in that call are worth pausing on.

**`with_gas_limit`.** Each request carries its own budget, and the drain loop
checks that the frame can still afford one before taking it off the queue. A
request is never consumed and then dropped for want of gas to handle it.

**`with_commit_locking`.** A request that fails should not take the batch down
with it. Commit locking settles the sub-call's effects as it returns, so a
failed request rolls back alone and the drain continues to the next one. The
driver reports it and moves on.

### The gas limit is the batch size

Gas costs no tokens on Groundhog. What a root transaction is charged for is its
*declared* limit, which is the scheduling capacity it reserves. See
[Execution](/programming-model/execution/).

That has a pleasant consequence here: the drain runs until the queue is empty
or the frame can no longer afford another request, so **the caller chooses the
batch size by choosing a gas limit**. No batch size is fixed inside the
contract for everyone. Someone who wants their own request served quickly, at
small cost, asks for a small batch. Someone clearing a backlog asks for a large
one. `gas_for_batch` in `batch-driver` converts a request count into the limit
to declare.

## Nobody has to be on duty

Cranking needs no privilege, so the policy can be simple: after submitting a
request, send a crank as its own transaction with a short expiry, and stop.

Nothing needs to be polled, timed, or estimated, because every way a crank can
turn out is harmless:

| Outcome | What happens |
|---|---|
| Another crank won the block | Yours is excluded and returns to the mempool, landing in a later block |
| The queue was empty at the snapshot | Yours commits having done nothing, writing no delta and conflicting with nobody |
| Otherwise | It drains, up to the batch its gas limit bought |

The short expiry keeps the first case from becoming a nuisance: a crank that
loses several blocks running should give up rather than land much later as a
pointless no-op.

An operator running a keeper composes with this without any mode switch. While
the keeper runs it wins each block and everyone else's cranks defer harmlessly
behind it. If it stops, theirs start winning the very next block. Nobody has to
detect which is happening.

:::tip[The general lesson]
Design so that the *losing* case is a no-op. Then contention needs no
coordination, and a participant who guesses wrong has wasted nothing.
:::

### Why not wait for a bigger batch?

A driver could refuse to drain until the queue looked "ripe". It would be
wasted complexity. Only one drain per block can commit, so any arrival rate
faster than that builds a queue by itself, and the next crank takes whatever
accumulated. Waiting would add latency to a batch the next block would have
taken anyway.

The driver does enforce a floor in the other direction, which is a different
problem: a crank funded for a single request consumes the block's one drain
just as effectively as a full one. Left open, that lets someone hold a queue
near-empty one request at a time. So a crank must be able to take what is
waiting, up to a configured `min_crank_batch`, or it is refused before the
queue is touched.

## A queue costs storage, so it needs a ceiling

Storage on Groundhog is a refundable deposit paid from the contract's own
balance. See [Storage Economics](/how-it-works/storage-economics/). A queue
anyone can add to is therefore an unbounded claim on whoever funded the driver.

The ceiling is a `CapacityConstraint`, an SDK type that holds the room
*remaining* rather than the number of entries used:

```rust
self.slots.consume_capacity(1);   // take this request's room
```

Holding it as remaining room is what keeps enqueuing concurrent. A length would
have to be read before it could be incremented, and every enqueue in a block
would then conflict with every other. A remaining count is taken as a blind
delta, and the runtime checks the floor across the whole block when those
deltas are reserved. Concurrent enqueues conflict only with the ceiling, and
only in aggregate.

### Early is not the same as failed

Look again at that line. It does not check whether there is room. That is
deliberate, and it decides what a user experiences at a full queue.

- **Checked at call time**, an enqueue arriving at a full queue would revert
  its frame. The transaction stays in the block, has no effect, and is not
  retried. The user failed.
- **Checked at commit**, which is what `consume_capacity` does, the transaction
  is excluded from the block and returned to the mempool. It lands once a crank
  frees capacity. The user was early.

For a queue that drains every block, "early" is the honest answer. A caller who
cannot wait indefinitely bounds the wait with the transaction's expiry height.

## Each link takes work only from its predecessor

A request names the account whose tokens it will spend. Nothing downstream can
check that claim, because only the first contract in the chain sees who is
actually calling.

```
  user ──▶ SwapRouter ──▶ SwapDriver ──▶ SwapHandler ──▶ pair operations
           sees the        accepts        accepts
           caller          only from      only from
                           the router     its driver
```

So the router is the only contract that can attribute a request to an account,
and each link afterwards accepts work only from its predecessor. `SwapDriver`
checks that its caller is the router before enqueuing; `SwapHandler` checks
that its caller is its driver before handling. Without those checks, anyone
could enqueue a request naming a victim as the payer and themselves as the
recipient, and be paid out of the victim's standing allowance.

This is worth generalizing: **a claim carried in data is not authorization.**
Authority lives where the caller is visible, which is the frame that
[`get_caller`](/how-it-works/invocation-frames/) reports, and it has to be
established there or not at all.

What stays open is as deliberate. `process_requests` takes no privilege at all:
cranking is permissionless, because a crank can only perform requests that were
already accepted, and the more people who can do it the better.

## Getting the answer back

A request is not served in the transaction that submits it, so the submitter
cannot be handed a result. It is handed an identifier instead.

`UniqueIds` (in `unique-ids`) mints that identifier from the submitting
transaction's hash and a counter. Both halves are needed: the counter separates
requests made in one transaction, and the transaction hash separates requests
made in different ones, including concurrent transactions in the same block
that observe the same counter because neither can see the other's delta.

The identifier is returned to the caller and stamped on the queued request, so
it reappears on whatever event that request eventually produces:

```
  submit ──▶ RequestAccepted { request_id }        (same transaction)
                    ⋮
  crank  ──▶ SwapEvent { request_id, ... }         (success)
         or  RequestFailed { request_id, cause, selector, payload }
```

An application watches for its identifier and learns the outcome. A failure
says why: `cause` distinguishes an exception from a fault, a rejection, or a
malformed result, and for an exception the `selector` names the error type
while `payload` carries its leading bytes. Both decode against the contract's
own spec, which the generated bindings already contain, so an application can
report `SwapRequestError::InsufficientOutputAmount` without any hand-written
table of error codes.

`RequestAccepted`, `RequestFailed` and `RequestsProcessed` are defined in
`batch-driver` and emitted by the queue itself, so every driver built on the
pattern reports its queue the same way.

## What the suite is made of

| Crate | Role |
|---|---|
| `swap-if` | Interfaces only: every trait, client, error, and shared value type |
| `swap-pair` | The fundamental operations. Not a contract; the handler runs it in its own invocation |
| `swap-handler` | Performs one request: prices it against live reserves, moves the assets |
| `swap-driver` | Holds the queue, batches requests, forwards each to the handler |
| `swap-router` | Builds requests from user operations and enqueues them |
| `swap-factory` | Creates pairs and keeps a registry |
| `batch-driver` | The reusable part: `Queue`, its crank policy, and the three events |
| `unique-ids` | `UniqueIds` |

The split between `swap-driver` and `batch-driver` matters if you build
something similar. Nothing in the queue, the crank floor, the drain loop, or
the events is specific to swapping. What `swap-driver` supplies is the one
thing the helper cannot know: how to hand a request to its handler.

## Next steps

- [Execution Model](/how-it-works/execution-model/) for snapshots, conflicts,
  and exclusion
- [Execution](/programming-model/execution/) for gas, scheduling capacity, and
  merged deltas
- [Storage Types](/programming-model/storage-types/) for `RCQ`, `NNInt`, and
  what commutes
- [Storage Economics](/how-it-works/storage-economics/) for deposits and who
  pays for them
