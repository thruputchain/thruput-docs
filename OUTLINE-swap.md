---
title: Swap Walkthrough Outline
description: Working outline for the rewrite of Build a Swap. Not for publication.
draft: true
---

:::caution[Working draft]
This is an outline, not a page. It plans
[Design a Swap](/tutorials/design-a-swap/), which replaces
[Build a Swap](/tutorials/build-a-swap/), and should be deleted once that page
lands.
:::

## What changes, and why

The current page is a code walkthrough of a single `SwapV2Pair` contract that
lived in `sdk_rs/example-contracts/swap`. That contract is gone. The suite in
`groundhog-examples` is now six crates, and the interesting part is no longer
how a constant-product swap is computed (that part is UniswapV2, and readers
can get it from Uniswap) but **why the suite is shaped the way it is**. Every
structural decision in it was forced by a property of this chain.

So the new page changes genre: from "read this contract" to "watch a design get
derived from the execution model". A reader who finishes it should be able to
recognise the same forces in their own contract.

Concretely that means dropping the per-method sections (`Step 4: mint_lp`,
`Step 5: burn_lp`, ...). The AMM math is not what a Groundhog developer needs
this example for.

## Audience and prerequisites

After [Build a Token](/tutorials/build-a-token/). Assumes the reader can write
a contract, deploy it, and call another contract through a generated client.
Assumes no knowledge of AMMs beyond "it holds two reserves and prices trades
against them".

This is the page where a reader first meets a *multi-contract application* and
first has to think about what other transactions in the same block are doing.

## The spine

One question, asked early and answered for the rest of the page:

> A pair's reserves are a single value that every swap reads, computes against,
> and writes back. Under snapshot isolation, two swaps in one block conflict.
> So how does a pair serve more than one user per block?

Everything else follows from the answer: enqueue concurrently, execute serially
in a batch. Each section below is a consequence of that, in the order the
consequences actually bite.

## Section plan

Each entry: the claim, what anchors it on the page, and the chain concept it
teaches.

### 1. The problem: a naive AMM serializes

- **Claim.** Port UniswapV2 unchanged and you get a pair that executes one
  operation per block, for the whole network.
- **Anchor.** The reserves write. Two transactions, same block, both reading
  the same snapshot; one is excluded and returned to the mempool.
- **Teaches.** Snapshot isolation, delta conflicts, and that exclusion is
  *not* failure. Link [Execution Model](/how-it-works/execution-model/) and
  [Execution](/programming-model/execution/).
- **Note.** This is the section that has to land. If the reader does not feel
  the problem, the next five sections read as gratuitous complexity.

### 2. The queue: make acceptance commute

- **Claim.** Split "accept a request" from "perform the operation". Acceptance
  commutes, so any number of users can be accepted in one block; the operation
  stays serial, as it must.
- **Anchor.** `RCQ` inserts commute; only one transaction per block may consume
  from a queue.
- **Teaches.** That the fix for a conflict is usually to change *what you
  write*, not to add locking. Retro-causal queue semantics.
- **Payoff line.** The throughput ceiling stops being "one operation per block"
  and becomes "how many operations fit in one transaction".

### 3. The batch: one transaction does the serial work

- **Claim.** A "crank" transaction drains the queue and performs each operation
  against live reserves, in order.
- **Anchor.** `batch_driver::Queue::crank`, and the driver's handler closure.
- **Teaches.** Gas is free, but a root transaction's *declared* limit is the
  scheduling capacity it is charged for, so **the caller's gas limit is the
  batch size**. There is no batch size fixed inside the contract.
- **Also.** Commit-locking: why a failed request rolls back alone instead of
  taking the batch with it.

### 4. Who cranks, and why nobody has to be on duty

- **Claim.** Cranking needs no privilege and no keeper. Submit a request, then
  send a drain as its own transaction with a short expiry, and stop.
- **Anchor.** The three outcomes (someone else won the block; queue was empty;
  it drained) and why each is harmless.
- **Teaches.** Designing so that the *lossy* case is a no-op. This is the
  section with the most transferable idea in the page.
- **Include.** Why the driver does not wait for a "ripe" queue: batching is not
  something to arrange for, it falls out of one-drain-per-block.

### 5. Paying for a queue: storage is a deposit

- **Claim.** A queue anyone can add to is an unbounded claim on whoever funded
  the contract, so it needs a ceiling.
- **Anchor.** `CapacityConstraint`: capacity held as room *remaining*, taken as
  a blind delta.
- **Teaches.** [Storage economics](/how-it-works/storage-economics/): storage is
  a refundable deposit paid from the contract's own balance. And the
  lazy-vs-strict choice: at a full queue, "you were early" (deferred to the
  mempool) beats "you failed" (reverted, no retry).

### 6. Trust: each link takes work only from its predecessor

- **Claim.** A request names the account whose tokens it will spend. Only the
  router sees who is calling, so only the router may enqueue, and only the
  driver may hand work to the handler.
- **Anchor.** The `get_caller()` checks in `SwapDriver::request` and
  `SwapHandler::handle_request`.
- **Teaches.** That a claim made in data is not authorization, and where the
  authority actually sits in a call chain. Link
  [Invocation Frames](/how-it-works/invocation-frames/).
- **Include.** What stays deliberately open: cranking is permissionless.

### 7. Getting the answer back: events as the result channel

- **Claim.** A request is not served in the transaction that submits it, so the
  submitter gets an id, not a result.
- **Anchor.** The id stamped at enqueue, echoed into the terminal event.
  `RequestFailed` carries `cause`, `selector`, and the leading payload bytes,
  which decode against the contract's own spec.
- **Teaches.** Designing an asynchronous result path, and that a contract's
  spec is enough to decode its errors off-chain.

## What to leave out

- Line-by-line `mint_lp` / `burn_lp` / `swap`. Name the identifiers instead.
- The `U256` math and the cumulative-price oracle.
- The TypeScript app. It deserves its own page if it deserves one.
- **Pool bring-up.** `SwapFactory::create_pair` funds, deploys, and initializes
  three contracts in one transaction, which is a nice demonstration of
  deterministic deploy addresses. It is also intricate, and the intricacy is
  mostly about funding rather than about concurrency, which is what this page
  is for. Left out.

## Settled

1. **One page.** Seven sections, start to finish. Splitting would separate the
   problem from half of its consequences.
2. **Title: "Design a Swap."** Not "concurrent": the core of a pair stays
   strictly serial, and that is the point of the design rather than an
   embarrassment about it. What becomes concurrent is *acceptance*.
3. **Code.** Diagrams where a diagram carries it, and short excerpts only where
   a mechanism is easier to show than to describe. Otherwise name the
   identifier and the crate that defines it.
4. **No repository links.** There is no stable URL for the source yet, and the
   housing repository may move. Refer to `Queue` (in `batch-driver`) rather
   than to a path. This also keeps the page honest about what it is: an
   explanation, not a file index.
5. **Sidebar.** Last in Tutorials, where `build-a-swap` sits now. It is the
   hardest one and the only multi-contract one.

## Sources

- `groundhog-examples/docs/README-swap.md`, the design rationale this follows
- `groundhog-examples/helpers/batch-driver/src/lib.rs`, the pattern in general
- `groundhog-examples/contracts/swap-*`, `interfaces/swap-if`
