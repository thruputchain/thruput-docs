---
title: TypeScript
description: Connect applications and services to Groundhog with the TypeScript client and typed contract bindings.
sidebar:
  label: Overview
---

Use `@groundhogchain/client` to connect an application or service to Groundhog. Start here for framework-neutral client and browser-wallet integration. For React components, see [React](/react/).

## Connect a client

Follow [installation](/tools/typescript-sdk/#install), then [connect to a cluster](/tools/typescript-sdk/#connect-to-a-cluster). The SDK guide explains the packages, access requirements, and network configuration.

## Work with a contract

Use [typed contract bindings](/tools/typescript-bindings/) to work with a contract's methods and results. For a complete sequence, follow [Work with Groundhog from TypeScript](/tutorials/work-with-groundhog-from-typescript/).

The SDK guide also covers [typed views](/tools/typescript-sdk/#typed-views), [transactions](/tools/typescript-sdk/#fund-and-execute-a-call), and [event pages](/tools/typescript-sdk/#event-pages).

## Connect a browser wallet

[Wallet Integration](/tools/wallet-integration/) explains discovery, connection, signing, and submission. The [wallet provider reference](/tools/wallet-provider/) defines the interfaces and errors.

For a complete application, the [wallet app guide](/tutorials/connect-a-wallet-to-your-app/) builds a vanilla TypeScript interface with connection controls and a transfer action. It lives in [Guides](/guides/) alongside the other worked projects.

For wire methods, see the [JSON-RPC API](/reference/json-rpc-api/).
