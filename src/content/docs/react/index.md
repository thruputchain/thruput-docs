---
title: React
description: Use Groundhog's React provider and hooks for wallet connection and balance queries.
sidebar:
  label: Overview
---

`@groundhogchain/react` provides wallet connection state and balance queries for React applications. It uses the [TypeScript client](/typescript/) for network interactions.

## Set up your application

Follow the package's [installation and provider setup](https://github.com/groundhogchain/react#readme). Check its current publication status and compatible dependency versions before installing it.

The package exports `WalletProvider`, `useWallet`, `useClient`, `useWalletClient`, `useBalance`, and `useTokenBalance`. See the [package source](https://github.com/groundhogchain/react/blob/main/src/index.ts) for its public exports.

## Choose the right layer

- **Wallet connection:** use the React provider and wallet hooks described in the package README.
- **Balances:** use the balance hooks with the documented query-provider setup.
- **Contract calls:** use the TypeScript client and [generated bindings](/tools/typescript-bindings/) for the contract operation.

For the framework-neutral wallet flow and provider protocol, see [Wallet Integration](/tools/wallet-integration/) and [Wallet Provider](/tools/wallet-provider/).

## Learn the client workflow

The [TypeScript walkthrough](/tutorials/work-with-groundhog-from-typescript/) explains contract deployment, typed reads, and transactions. It is a client walkthrough, not a React UI tutorial.
