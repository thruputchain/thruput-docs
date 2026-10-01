---
title: React
description: Use Groundhog's React provider and hooks for wallets and contract data.
sidebar:
  label: Overview
---

`@groundhogchain/react` provides wallet connection state, balance queries, and typed contract reads for React applications. It uses the [TypeScript client](/typescript/) for network interactions.

## Set up your application

Follow the [React quickstart](/get-started/react/) to display live Devnet contract data. [Package setup](/typescript/setup/) covers registry access.

The package provides a wallet provider, wallet and balance hooks, and typed contract queries. See the [package reference](https://github.com/groundhogchain/react#readme) for its public API.

## Choose the right layer

- **Wallet connection:** use the React provider and wallet hooks described in the package README.
- **Balances:** use the balance hooks with the documented query-provider setup.
- **Contract calls:** use the TypeScript client and [generated bindings](/tools/typescript-bindings/) for the contract operation.

For the framework-neutral wallet flow and provider protocol, see [Wallet Integration](/tools/wallet-integration/) and [Wallet Provider](/tools/wallet-provider/).

## Learn the client workflow

The [TypeScript walkthrough](/tutorials/work-with-groundhog-from-typescript/) explains contract deployment, typed reads, and transactions. It is a client walkthrough, not a React UI tutorial.
