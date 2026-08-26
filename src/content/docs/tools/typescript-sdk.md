---
title: TypeScript SDK
description: Use @groundhogchain/client and related TypeScript packages with Groundhog JSON-RPC.
---

`@groundhogchain/client` provides typed JSON-RPC actions, transaction construction and signing, contract helpers, transports, and generated standard contract bindings.

Use this page for client setup, typed views, receipts, transactions, and deployment. For contract-specific generated APIs, see [TypeScript Bindings](/tools/typescript-bindings/).

For a guided CLI-to-application workflow, start with [Work with Groundhog from TypeScript](/tutorials/work-with-groundhog-from-typescript/).

:::note[Version checked]
This page was source-checked against `@groundhogchain/client` `0.4.0`, protocol packages `0.8.0`, Groundhog CLI `0.10.3`, and RPC wire `3.3.0` on August 26, 2026.
:::

## Install

Packages are hosted on GitHub Packages. Add the scope and a token with `read:packages` to your npm configuration:

```ini
@groundhogchain:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

The client requires Node.js `22.12.0` or newer. Install the client and the direct dependencies used by generated bindings:

```bash
NODE_AUTH_TOKEN="$(gh auth token)" npm install \
  @groundhogchain/client@0.4.0 \
  @groundhogchain/protocol@0.8.0 \
  @groundhogchain/contract-spec@0.8.0
```

## Version Matrix

| Component                    | Version checked | Status                                                   |
| ---------------------------- | --------------- | -------------------------------------------------------- |
| `@groundhogchain/client`     | `0.4.0`         | Cluster, wallet-client, and generated descriptor APIs    |
| TypeScript protocol packages | `0.8.0`         | Coordinated generated-binding dependencies               |
| Groundhog CLI codegen        | `0.10.3`        | Generated TypeScript binding shape                       |
| Client's pinned OpenRPC      | wire `3.3.0`    | Network identity, airdrop, read, and transaction methods |

## Create a Client

```ts
import { createGroundhogClient, localnet } from "@groundhogchain/client";

const client = await createGroundhogClient({ cluster: localnet() });

const tip = await client.getChainTip();
const version = await client.getVersion();
```

`createGroundhogClient()` is asynchronous. A cluster client fetches network information and validates the endpoint before returning. The predefined clusters are `localnet()`, `devnet()`, and `mainnet()`. Pass a custom `HttpTransport` instead when the application does not need cluster qualification.

## Transport Options and Errors

```ts
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

JSON-RPC error responses throw `JsonRpcError`. HTTP failures, timeouts, invalid JSON, and malformed response envelopes throw other exceptions. Typed actions also validate the result shape they consume.

## Supported Reads

The current gateway-backed client supports:

- Chain tip and gateway version queries
- Native HOG balances
- Read-only contract views
- Transaction status, committed receipts, and receipt polling
- Event queries
- Transaction history by root invocation address
- Raw committed storage reads

Read a native HOG balance:

```ts
import { addressFromHex } from "@groundhogchain/client";

const address = addressFromHex("0x<64-character-address>");
const balance = await client.getBalance(address);

console.log(balance.rawBalance);
```

`rawBalance` is a `bigint` in raw protocol units. Apply token-specific decimal formatting in display code.

## Typed Views

Generated method descriptors call `client.view()` and decode the method return value:

```ts
const result = await Counter.get.view({
  client,
  contract,
  caller,
});

console.log(result.value, result.height, result.events);
```

Methods with arguments take a generated `args` object. Generated names use camelCase even when the contract ABI uses snake_case:

```ts
import { ERC20 } from "@groundhogchain/client/contracts";

await ERC20.getBalanceOf.view({
  client,
  contract: token,
  caller,
  args: { addr: caller },
});
```

`view()` throws `ContractViewError` when the contract aborts or faults. Use `viewOutcome()` when the application needs to handle those outcomes directly:

```ts
const outcome = await Counter.get.viewOutcome({ client, contract, caller });

switch (outcome.kind) {
  case "return":
    console.log(outcome.value);
    break;
  case "abort":
    console.error(outcome.exception);
    break;
  case "fault":
    console.error("Contract execution faulted");
}
```

Transport and JSON-RPC errors pass through unchanged. Malformed return or abort data throws `ContractDecodeError` from both view APIs.

## Wallet Clients and Transactions

Generated descriptors build application invocations:

```ts
const invocation = Counter.increment.invocation(contract, gasLimit, {
  amount: 1n,
});
```

For a new single-key account, create a pubkey account and bind it to a cluster client:

```ts
import { randomBytes } from "node:crypto";
import {
  PrivateKeySigner,
  createPubkeyAccount,
  createWalletClient,
} from "@groundhogchain/client";

const account = createPubkeyAccount({
  signer: new PrivateKeySigner(randomBytes(32)),
});
const wallet = createWalletClient({ client, account });

const airdrop = await wallet.requestAirdrop();
if (airdrop.status.result !== "ok") {
  throw new Error(`Airdrop failed with ${airdrop.status.result}`);
}

const txHash = await wallet.execute({
  invocation,
  gasLimit: walletGasLimit,
});
const receipt = await wallet.waitForTransactionReceipt(txHash);
```

Pubkey accounts use `kPubkeySignature` authorization. The wallet client selects the native-compatible DefaultWallet adapter automatically, wraps the application invocation in `DefaultWallet.execute`, binds the signature to the connected network hash, and submits the root transaction.

:::caution[Application invocations are not wallet roots]
A generated application invocation is normally an inner invocation. `wallet.execute()` constructs the wallet root for the account's configured adapter. Do not pass an application invocation to `wallet.sendInvocation()` unless that application contract is intentionally the authorization root.
:::

Use `createSourceAddressAccount()` and an explicit adapter such as `devWalletAdapter` for existing deployed account contracts. Use `prepareExecution()` to inspect the wrapped transaction before signing. `prepareTransaction()`, `signTransaction()`, `sendTransaction()`, and `sendInvocation()` remain available for explicit root workflows.

The transaction uniqueness key is the root invoked address plus `(block_expiry_height, nonce)`. The wallet client generates a random `u64` transaction nonce unless the caller overrides it. This transaction nonce is separate from the pubkey account's address-derivation nonce.

See [Wallet Integration](/tools/wallet-integration/) for the signer and wallet-root boundary.

## Root Receipt Decoding

Wait for a committed receipt, then decode it with the generated descriptor for the root method. For `wallet.execute()`, the root is `DefaultWallet.execute`:

```ts
import { DefaultWallet } from "@groundhogchain/client/contracts";

const receipt = await client.waitForTransactionReceipt(txHash);
const root = DefaultWallet.execute.decodeReceipt(receipt);
const childReturn = root.value[0];

if (!childReturn) {
  throw new Error("Expected one child return");
}

const childValue = Counter.increment.decodeReturn(childReturn);
```

`decodeReceipt()` returns the typed root value and receipt metadata. It throws `ContractReceiptError` for an abort, execution failure, or missing return data from a non-void method. `decodeReceiptOutcome()` returns a discriminated `return`, `abort`, or `failure` result instead. Both can throw `ContractDecodeError` for malformed return or abort data.

The caller must know that the receipt came from a transaction whose root invocation called that method. A receipt does not carry enough method identity for the descriptor to verify this.

DefaultWallet makes nested returns available as an ordered list of raw buffers. Decoding the child with `Counter.increment.decodeReturn()` is spec-driven deserialization. The application selects that descriptor because it knows which invocation it submitted; the client does not guess a nested method from the return bytes.

## Contract Deployment

DefaultWallet and DevWallet both expose a generated `deploy` method. Deployment is a wallet-specific root operation, so build that root descriptor and call `wallet.sendInvocation()` with the artifact in `contractsToDeploy`. The method's decoded receipt returns the deployed address.

The deployment nonce derives the contract address. It is separate from the transaction uniquifier's replay-protection nonce. `hashContract()` hashes the complete protocol `Contract`, not only its payload bytes.

See the maintained [contract deployment guide](https://github.com/groundhogchain/client-ts/blob/main/docs/contract-deployment.md) and [Counter deployment example](https://github.com/groundhogchain/client-ts/blob/main/examples/deploy-counter.ts) for the complete local DevWallet flow.

## SDK vs Bindings

| Use case                                                       | Owner                            |
| -------------------------------------------------------------- | -------------------------------- |
| Connect to JSON-RPC and validate network identity              | `createGroundhogClient()`        |
| Bind an account, wrap wallet calls, sign, submit, and poll      | `createWalletClient()`           |
| Construct or sign an explicit low-level transaction            | Client transaction helpers       |
| Build a typed application invocation                           | Generated method descriptor      |
| Decode method returns, exceptions, views, receipts, and events | Generated contract binding       |
| Connect browser account and approval UX                        | External wallet provider         |

## Public Entry Points

| Import                               | Use for                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `@groundhogchain/client`             | Common client, action, transaction, signer, and contract APIs |
| `@groundhogchain/client/transaction` | Transaction construction, serialization, and signing          |
| `@groundhogchain/client/transport`   | HTTP and mock transports                                      |
| `@groundhogchain/client/contract`    | Contract descriptor runtime and fixed-length helpers          |
| `@groundhogchain/client/contracts`   | Generated standard contract bindings                          |
| `@groundhogchain/client/signers`     | Signer interface and private-key signer                       |
| `@groundhogchain/client/actions`     | Standalone typed actions                                      |
| `@groundhogchain/client/local-dev`   | Node-only local bootstrap account loader                      |

## Maintained Examples

The client repository maintains examples for:

- [Chain tip](https://github.com/groundhogchain/client-ts/blob/main/examples/chain-tip.ts)
- [HOG balance views](https://github.com/groundhogchain/client-ts/blob/main/examples/view-hog-balance.ts)
- [HOG transfer](https://github.com/groundhogchain/client-ts/blob/main/examples/transfer-hog.ts)
- [Counter deployment](https://github.com/groundhogchain/client-ts/blob/main/examples/deploy-counter.ts)

The HOG transfer example is written for a wire `3.3.0` Devnet deployment with `groundhog_networkInfo` and `groundhog_requestAirdrop`. The current older public endpoint does not expose those methods yet, so treat the example as the target flow rather than current deployment evidence. The balance and counter examples use a local node; counter deployment uses its bootstrap source-address account and DevWallet adapter.

## Related Documentation

- [TypeScript Bindings](/tools/typescript-bindings/) for generated method and event descriptors
- [Wallet Integration](/tools/wallet-integration/) for signer and wallet-root integration boundaries
- [Groundhog CLI](/tools/groundhog-cli/) for supported build, deployment, and codegen workflows
- [JSON-RPC API](/reference/json-rpc-api/) for the underlying gateway methods
