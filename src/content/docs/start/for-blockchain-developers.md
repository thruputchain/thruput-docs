---
title: "For Blockchain Developers"
description: Map your Ethereum, Solana, or Move experience to Groundhog's programming model.
---

The contract lifecycle is familiar: write, test, deploy, and call. The main changes are how storage updates combine and how execution and storage are funded. This page introduces those shifts using a Solidity transfer as the starting point.

---

## Token Transfers

A token transfer on Solidity:

```solidity
function transfer(address to, uint256 amount) public {
    require(balances[msg.sender] >= amount, "insufficient");
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

The same transfer on Groundhog:

```rust
fn transfer(&mut self, receiver: &ContractAddress, amount: Amount) {
    let sender = get_caller();
    self.balances.at_mut(&sender).decrease(amount);
    self.balances.at_mut(receiver).lazy_increase(amount);
}
```

The code stays familiar. `balances` is a `Map<ContractAddress, Balance>`. Calling `at_mut(address)` selects the balance that will change and returns a mutable handle. Selecting it does not load the balance.

`decrease(amount)` loads the sender's snapshot balance because the contract needs to fail immediately when funds are insufficient. `lazy_increase(amount)` skips the receiver load because the contract does not need an immediate overflow result. Its bound is checked when the transaction's completed delta batch is admitted. Both calls produce deltas that can merge with compatible transactions. `Balance` accepts only nonnegative amounts and exposes no absolute `set` operation.

That is enough of the model for this transfer. [Build a Token](/tutorials/build-a-token/) uses this pattern in a complete contract. [Merged Deltas](/programming-model/execution/#merged-deltas) explains how Groundhog combines changes across a block.

---

## Reentrancy and Balance Checks

`Balance::decrease` checks the transaction's current balance view. The runtime also checks aggregate bounds when concurrent deltas are reserved. This does not replace authorization or application-specific checks.

Contract calls also have different reentrancy rules from the EVM. See the [EVM reentrancy comparison](/ecosystem/evm/#reentrancy) for that call pattern, and [Authorization](/how-it-works/authorization/) for caller checks and signed permissions.

---

## Resource and Transaction Rules

Groundhog exposes these rules to contract developers:

- **Gas price estimation.** Gas limits exist for metering, but gas costs zero. The declared gas limit still consumes scheduling capacity.
- **Ordering-sensitive balance updates.** Commutative balance deltas have the same merged outcome in any execution order. Application flows that conflict still need protocol-aware design.
- **Nonces.** Replay protection uses a unique expiry-height and nonce pair, without a sequential account counter.
- **Fee-driven compute tuning.** Gas limits still bound each transaction and child call, but using more gas does not increase a token fee.
- **Access lists.** Unlike Solana, where every account a transaction touches must be declared up front, Groundhog discovers storage access during execution. (EVM only requires explicit access lists when opting into EIP-2930.)
- **Storage slot packing.** Typed fields via `#[sdk::storage]`. No manual layout, no packing variables into 256-bit slots.
- **TTL management.** No storage expiry. Data persists as long as its HOG deposit is held. Delete the data, get the deposit back.

---

## The Programming Model in Brief

Choose operations that express the change you intend. Use `Balance` for ordinary balance adjustments, `Map` for separate records, and other storage types when the application needs different merge rules. Compatible arithmetic can combine, but ordering-sensitive workflows still need an explicit design.

[Contract Execution](/programming-model/execution/) explains snapshots and deltas. [Storage Types](/programming-model/storage-types/) covers the available APIs, and [NNInt In Depth](/programming-model/nnint/) covers the lower-level integer model.

---

## Storage Choices and Parallelism

The transfer example uses relative balance adjustments so compatible transfers can share a block. Replacing those adjustments with absolute values changes the conflict rules. Review your data model, not just the syntax, when adapting an existing contract.

---

## Next Steps

Continue in layers:

1. [Contract quickstart](/get-started/contract/) builds and deploys your first contract.
2. [Build a Token](/tutorials/build-a-token/) applies checked and lazy balance operations in a complete ERC-20-style contract.
3. [Contract Execution](/programming-model/execution/) and [Storage Types](/programming-model/storage-types/) give the full contract-author model.
4. [How Conflicts Are Resolved](/how-it-works/execution-model/#how-conflicts-are-resolved) explains the engine's reservation machinery.

For a detailed Solidity-to-Groundhog mapping, see [EVM & Solidity](/ecosystem/evm/).
