---
title: Wallet Integration Status
description: Use pubkey accounts, DefaultWallet, source-address wallets, and custom signers from TypeScript.
---

`@groundhogchain/client` `0.4.0` provides signer-bound wallet clients for TypeScript applications. It supports two account paths:

| Account path | Authorization | Wallet root | Use it for |
|---|---|---|---|
| Pubkey account | `kPubkeySignature` | Native-compatible `DefaultWallet` | New single-key accounts |
| Source-address account | `kSourceAddressAuthData` | An explicit adapter such as `devWalletAdapter` | Existing deployed account contracts and local bootstrap accounts |

No official browser wallet provider or connection protocol is published yet. Browser applications can build on the generic `Signer` and wallet-client APIs, but must still supply account selection, permission prompts, key custody, and network UX.

This page was source-checked against published `@groundhogchain/client` `0.4.0`, protocol packages `0.8.0`, and Groundhog CLI `0.10.3` on August 26, 2026.

## Pubkey Accounts and DefaultWallet

A pubkey account derives its address from an Ed25519 public key and an address nonce. It uses the protocol's `kPubkeySignature` authorization claim. The first account for a key uses nonce `0` by default.

When an undeployed pubkey-account address is invoked as the transaction root, the runtime resolves it to the chain's configured DefaultWallet. There is no wallet deployment or `create_wallet` step. The default wallet supports:

- `execute`, which runs up to 16 child contract calls atomically and returns one raw return buffer per call
- `deploy`, which deploys a contract with the wallet address as deployer

That is the raw contract interface. Client `0.4.0`'s high-level `wallet.execute()` helper accepts one application `invocation` and wraps it as a one-item `calls` list. For multicall, construct `DefaultWallet.execute.invocation()` directly and submit that root with `wallet.sendInvocation()`.

Create a cluster-validated client, account, and wallet client:

```ts
import { randomBytes } from "node:crypto";
import {
  PrivateKeySigner,
  createGroundhogClient,
  createPubkeyAccount,
  createWalletClient,
  localnet,
} from "@groundhogchain/client";

const client = await createGroundhogClient({ cluster: localnet() });
const account = createPubkeyAccount({
  signer: new PrivateKeySigner(randomBytes(32)),
});
const wallet = createWalletClient({ client, account });
```

`createWalletClient()` selects `defaultWalletAdapter` automatically for a pubkey account. It prepares fresh expiry and replay nonces, constructs a single-call `DefaultWallet.execute` root, signs for the connected network, and submits the transaction:

```ts
import { ERC20 } from "@groundhogchain/client/contracts";

const txHash = await wallet.execute({
  invocation: ERC20.transfer.invocation(token, callGasLimit, {
    receiver,
    amount,
  }),
  gasLimit: walletGasLimit,
});

const receipt = await wallet.waitForTransactionReceipt(txHash);
```

The account needs HOG before it can pay transaction and storage costs. A wallet client connected to a development cluster with the airdrop capability exposes `wallet.requestAirdrop()`. Check `airdrop.status.result === "ok"` before relying on the funding transaction; a completed request can still report a failed execution.

## Network-Bound Signing

Transaction signatures commit to the transaction domain, the protocol network hash, and the encoded transaction. A cluster client validates the endpoint and supplies its network hash to the wallet client:

```ts
const client = await createGroundhogClient({ cluster: localnet() });
const wallet = createWalletClient({ client, account });
```

If an application creates an unqualified client with a custom transport, it must pass the intended network hash explicitly:

```ts
const client = await createGroundhogClient({ transport });
const wallet = createWalletClient({ client, account, networkHash });
```

Do not copy a network hash from an unrelated endpoint. A signature for one network must not be valid on another.

## Existing Source-Address Wallets

Existing account contracts use address auth data rather than a pubkey-derived claim. Configure the address, signer IDs, allowed-key bitmap, required weight, and the adapter for that wallet interface.

The accounts produced by `groundhog node` use the local DevWallet interface:

```ts
import { bitMap, weight } from "@groundhogchain/protocol";
import {
  createGroundhogClient,
  createSourceAddressAccount,
  createWalletClient,
  devWalletAdapter,
  localnet,
} from "@groundhogchain/client";
import { loadLocalDevAccount } from "@groundhogchain/client/local-dev";

const local = await loadLocalDevAccount();
const client = await createGroundhogClient({ cluster: localnet() });
const account = createSourceAddressAccount({
  address: local.address,
  signers: [{ signer: local.signer, publicKeyId: 0n }],
  allowedKeys: bitMap(0x01n),
  requiredWeight: weight(1n),
});
const wallet = createWalletClient({
  client,
  account,
  invocationAdapter: devWalletAdapter,
});
```

`loadLocalDevAccount()` is Node-only and resolves a deterministic bootstrap signer from the active local runtime manifest. Never use that signer with production networks or funds of value.

Custom account contracts can publish a generated binding and implement the structural `WalletInvocationAdapter` interface. The application does not need to change the wallet client's signing and submission flow.

## Receipt Decoding

Decode the receipt with the generated descriptor for the root wallet method. DefaultWallet returns one raw child return per call:

```ts
import { DefaultWallet, ERC20 } from "@groundhogchain/client/contracts";

const result = DefaultWallet.execute.decodeReceipt(receipt);
const childReturn = result.value[0];

if (!childReturn) {
  throw new Error("Expected one child return");
}

ERC20.transfer.decodeReturn(childReturn);
```

The binding generated from a contract's Rust specification provides `decodeReturn()`, `decodeReceipt()`, and `decodeReceiptOutcome()`. The client does not infer which nested application method produced each DefaultWallet return item; the application already knows the calls it submitted and selects the matching generated descriptor.

## Signer Extension Point

Use the generic signer interface to connect a hardware signer, remote signer, browser wallet, or custom key manager:

```ts
import type { PublicKey, Signature } from "@groundhogchain/protocol";

export interface Signer {
  sign(message: Uint8Array): Promise<Signature>;
  publicKey: PublicKey;
}
```

An implementation signs the canonical bytes supplied by the wallet client. It must not rebuild the transaction or substitute a network identity after review.

## Browser-Wallet Boundary

The published TypeScript APIs cover account derivation, wallet-root construction, network-bound signing, submission, polling, and receipt decoding. A complete browser-wallet integration still needs a provider protocol for:

- Connecting and selecting accounts
- Reporting the active network and address
- Requesting user approval for application invocations
- Keeping private keys out of application memory
- Returning submission results and user-facing errors

Until that provider contract is published, use `PrivateKeySigner` only for scripts, tests, and controlled Node.js applications. Production browser applications should integrate a signer that keeps key custody outside the application.

## Examples

- [Transfer HOG with a pubkey account and DefaultWallet](https://github.com/groundhogchain/client-ts/blob/main/examples/transfer-hog.ts). This is the target flow for the pending wire `3.3.0` Devnet rollout, not a currently runnable public-endpoint example.
- [Deploy and call a counter through a local source-address account](https://github.com/groundhogchain/client-ts/blob/main/examples/deploy-counter.ts)
- [Work with Groundhog from TypeScript](/tutorials/work-with-groundhog-from-typescript/)
