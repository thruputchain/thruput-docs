---
title: Smart Contracts
description: Write, test, and understand Project Thruput contracts with the Rust SDK.
sidebar:
  label: Overview
---

Build contract logic with the Rust SDK. Use this section for storage choices, authorization, events, testing, and the contract programming model.

## Write your first contract

Follow the [contract quickstart](/get-started/contract/) to deploy a counter on Futurenet. Then read [Build a Counter](/tutorials/build-a-counter/) to understand its code and tests, or [Project structure](/contracts/project-structure/) to find the generated files.

Use the [CLI section](/cli/) for build and deployment commands.

## Work on a contract

- [Define methods and interfaces](/contracts/methods/).
- [Choose storage types](/contracts/storage-types/) for your data.
- [Authorize calls](/contracts/authorization/).
- [Define and handle errors](/contracts/errors/).
- [Emit and test events](/contracts/events/).
- [Call another contract](/contracts/cross-contract-calls/).
- [Choose a test mode and write tests](/contracts/testing/).
- [Debug a contract](/contracts/debugging/).
- [Generate client bindings](/contracts/client-bindings/) for application developers.

## Understand the programming model

Read [Contract Execution](/contracts/execution/) first for snapshots, merged changes, and the rules that cause bugs. Then read [Storage Types](/contracts/storage-types/), starting with [Balance](/contracts/storage-types/#balance) for nonnegative counts and amounts. Continue with [NNInt and concurrent updates](/contracts/nnint/) to understand the underlying signed deltas, explicit bases, and merge rules. [Exclusive writes](/contracts/storage-types/#exclusive-writes) and [invocation frames](/contracts/invocation-frames/) cover other storage and call constraints.

Read [Contract artifacts and addresses](/contracts/artifacts-and-addresses/) to understand code hashes, deployment addresses, and immutability.

## Look up an API

Use the [storage API tables](/contracts/reference/storage-types/), [SDK macros](/contracts/reference/sdk-macros/), [syscalls](/contracts/reference/syscalls/), and [generated Rust API docs](/contracts/reference/rust-api-docs/).

For larger worked examples, visit [Guides](/guides/).
