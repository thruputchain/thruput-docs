---
title: TypeScript SDK
description: Use @groundhogchain/client and related TypeScript packages with Groundhog JSON-RPC.
---

`@groundhogchain/client` wraps the Groundhog JSON-RPC gateway with typed actions, transports, transaction primitives, signer interfaces, and contract calldata helpers.

Use this page for current package setup and supported chain reads. For contract-specific invocation builders, see [TypeScript Bindings](/tools/typescript-bindings/).

:::caution[Check gateway compatibility]
The client's generated JSON-RPC schema may lag the gateway. Check `groundhog_version` on your target network and consult the client release notes before depending on version-specific response shapes. Use the CLI for wallet-backed transaction submission until the client provides the same wallet builder.
:::

## Install

Dependencies are hosted on GitHub Packages. Add the scope and a token with `read:packages` to your npm configuration:

```ini
@groundhogchain:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

With `NODE_AUTH_TOKEN` set to a token with `read:packages`, install the published client and the direct dependencies used by generated bindings:

```bash
npm install \
  @groundhogchain/client \
  @groundhogchain/protocol \
  @groundhogchain/contract-spec \
  @groundhogchain/xdr
```

Generated bindings import `contract-spec` directly and import `xdr` when event decoders are present. Declare them in applications that compile generated files, especially with pnpm's strict dependency layout.

## Minimal Client

```typescript
import { createGroundhogClient, HttpTransport } from "@groundhogchain/client";

const client = createGroundhogClient(
  new HttpTransport("http://127.0.0.1:9545"),
);

const tip = await client.getChainTip();
const version = await client.getVersion();
```

`HttpTransport` sends JSON-RPC 2.0 requests over HTTP. `MockTransport` provides deterministic in-memory responses for tests.

## Transport Options and Errors

```typescript
import { HttpTransport, JsonRpcError } from "@groundhogchain/client";

const transport = new HttpTransport("http://127.0.0.1:9545", {
  timeoutMs: 10_000,
  headers: { Authorization: "Bearer <token>" },
});

try {
  const tip = await transport.request("groundhog_chainTip");
  console.log(tip);
} catch (error) {
  if (error instanceof JsonRpcError) {
    console.error(error.code, error.method, error.message);
  }
}
```

JSON-RPC error responses throw `JsonRpcError`. HTTP failures, timeouts, and malformed responses throw other exceptions.

## Supported Reads

The convenience client supports:

- Chain tip and gateway version
- Native HOG balances
- Read-only contract views
- Transaction status and committed receipts
- Address-rooted transaction history
- Event queries
- Raw committed storage reads

`getBlockByNumber` and `getPendingTransactionCount` are present in the published client, but current gateway source returns JSON-RPC error `-32052` for both.

Read a native HOG balance:

```typescript
import { addressFromHex } from "@groundhogchain/client";

const address = addressFromHex("0x<64-character-address>");
const balance = await client.getBalance(address);

console.log(balance.rawBalance);
```

`rawBalance` is a `bigint` in raw protocol units. Apply token-specific decimal formatting in display code.

## View Calls

Generated bindings build an `Invocation`. Convert its fields into the `ViewRequest` expected by the client:

```typescript
const invocation = Counter.get(contract, gasLimit);

const response = await client.view({
  contract: invocation.invoked_address,
  entrypoint: invocation.entrypoint,
  calldata: invocation.calldata,
  caller,
});

if (response.output.result !== "return") {
  throw new Error(`view failed: ${response.output.result}`);
}

const returnData = response.output.returnData;
```

`returnData` is raw CXS bytes. Current generated bindings build arguments and decode declared events, but they do not generate method return-value decoders.

## Transaction Model

A generated contract invocation is normally the **inner application invocation**. It is not usually the root invocation that should be signed and submitted.

For a wallet-backed account, the root invocation targets the user's wallet contract. The application invocation is encoded into the wallet's `do_action` call, then the transaction is authorized using the wallet's configured key. Wallet entrypoint IDs come from the active runtime manifest or hosted network descriptor and should not be hard-coded.

:::caution[No high-level wallet builder yet]
Current `client-ts` exposes low-level `createTransaction`, `signTransaction`, `PrivateKeySigner`, and `Signer` primitives, but it does not provide the descriptor-driven wallet transaction builder used by the current CLI. Do not pass a generated application invocation directly to `createTransaction` and assume it is wallet-authorized. Use `groundhog call` for supported transaction submission today.
:::

The transaction uniqueness key is the root invoked address plus the `(block_expiry_height, nonce)` pair. The nonce is a caller-chosen `u64`, not a sequential account nonce.

When reading a committed receipt through the SDK, use `execResult`, not the JSON wire field name `status`:

```typescript
import { ExecResult } from "@groundhogchain/protocol";

const receipt = await client.getTransactionReceipt(txHash);
if (receipt?.execResult === ExecResult.ExecResultOK) {
  console.log(receipt.returnData, receipt.events);
}
```

## SDK vs Bindings

| Use case | Tool |
|----------|------|
| Connect to JSON-RPC | `@groundhogchain/client` |
| Read tip, version, balances, storage, views, receipts, transaction history, or events | `@groundhogchain/client` |
| Build calldata for a contract method | generated TypeScript binding |
| Decode a declared contract event | generated TypeScript binding |
| Decode method return bytes | contract-specific CXS codec code |
| Submit a wallet-backed transaction today | Groundhog CLI |

## Package Map

| Package | Source repository | Use for |
|---------|-------------------|---------|
| `@groundhogchain/client` | `groundhogchain/client-ts` | JSON-RPC client, transaction primitives, standard contract bindings |
| `@groundhogchain/protocol` | `groundhogchain/protocol-ts` | Core protocol types, branded byte types, and codecs |
| `@groundhogchain/contract-spec` | `groundhogchain/protocol-ts` | Contract spec AST types used by generated bindings |
| `@groundhogchain/xdr` | `groundhogchain/protocol-ts` | Low-level XDR and CXS readers, writers, and codecs |
| `@groundhogchain/gateway` | `groundhogchain/protocol-ts` | Gateway and indexer protocol types |
| `@groundhogchain/rpc` | `groundhogchain/protocol-ts` | Lower-level ONC-RPC and internal RPC types |

## Generate API Docs Locally

The source repositories contain TypeDoc configuration. Generate the client reference locally:

```bash
cd /path/to/client-ts
NODE_AUTH_TOKEN="$(gh auth token)" npm install
npm run docs
```

Use `npm run docs:check` to validate TypeDoc without writing output. The protocol packages are published from the separate `protocol-ts` repository.

## Related Documentation

- [TypeScript Bindings](/tools/typescript-bindings/) for generated contract-specific bindings
- [Wallet Integration](/tools/wallet-integration/) for the current signer and browser-wallet support boundary
- [Groundhog CLI](/tools/groundhog-cli/) for supported transaction submission
- [JSON-RPC API](/reference/json-rpc-api/) for the current gateway method surface
