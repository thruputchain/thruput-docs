---
title: Project Thruput roadmap
description: Things we'd like to see built in Thruput.
sidebar:
  label: Roadmap
---

Building something on Thruput? Tell us what you're trying to do and where you get stuck. Real examples help us decide what to build first and give us something to test as we go.

## Core improvements

### Sharded state storage

Sharded storage would increase the amount of state each validator can hold by spreading it across multiple HogDB instances. Applications would still see one key space and would not need to choose or manage shards. An [initial proposal](https://github.com/thruputchain/hogd/pull/3108) covers the first part of this work.

### Sponsored transactions

Today, the account that sends a transaction backs its scheduling with its own native tokens. A contract pays the storage deposits for data stored under its address, which lets an operator [sponsor its users' storage](/architecture/storage-economics/#sponsoring-users). We plan to let one party cover scheduling or storage deposits for another. If you need to bring users on without asking them to hold tokens, submit transactions for them, or let callers cover storage deposits, tell us who should pay and what they should be able to limit.

### Post-quantum consensus

Post-quantum signing with ML-DSA-65 is already supported for accounts and contracts. The next phase is to extend post-quantum support to validator signatures and consensus. This needs protocol design, performance testing, and an upgrade path for future validators that may need to transition from classical to post-quantum signatures.

## Exploring

### External calls

We're exploring how contracts could call services outside the chain within one atomic transaction. While a call is pending, executors would run other transactions. The proposer would record the response so other nodes could replay it. Responses would need to be self-authenticating, and block time would bound each call's timeout. The contract API and abuse protections still need design. If your app needs a market-maker quote, an oracle read, or a compliance check during a transaction, we'd like to hear how that call would work.

## Open to builders

### Additional storage types

Contracts use the [storage types](/contracts/storage-types/) the SDK provides today. Earlier research prototypes also used ordered sets and bitmaps. If the current types make something hard to store or update, show us what you're working with.

### Ecosystem tooling

The [wallet integration guide](/typescript/wallet-integration/) is a starting point for wallet builders. If you're missing a wallet integration, oracle, or a convention that would help apps work together, come talk to us in [GitHub Discussions](https://github.com/thruputchain/thruput-docs/discussions) or on [Discord](https://discord.com/channels/897514728459468821/1564948118162898954). We'd be glad to work through your use case with you.
