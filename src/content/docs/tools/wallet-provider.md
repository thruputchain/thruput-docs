---
title: Wallet provider reference
description: Wallet provider wire methods, data formats, validation rules, and SDK adapter APIs.
---

| Audience | Entry point |
| --- | --- |
| Application developers | [Connect a wallet](/tools/wallet-integration/), [Send transactions](/typescript/transactions/) |
| Wallet and bridge implementers | Provider contract `1.0.0`; requirements below apply at the wallet boundary |
| Complete signatures | [Generated client API](https://client-ts.thruput.network/) |
| Imports | Wire types and validators: `/provider`; application adapter: `/wallet` |

## Interface and Methods

| Type / member | Shape |
| --- | --- |
| `WalletAccount` | `{ address: string; publicKey: string; nonce: string }` |
| `WalletSession` | `{ networkHash: string; accounts: readonly WalletAccount[] }` |
| `WalletProvider.info` | `{ id: string; name: string; version: "1.0.0" }` |
| `WalletProvider.supportedMethods?` | Optional readonly method-name list |
| `request(request)` | `Promise<unknown>`; validate each result |
| `on("change", listener)` | Subscribe to a full session snapshot; returns an idempotent unsubscribe function |

| Request method | Parameters | Result / requirement |
| --- | --- | --- |
| `connect` | None | Prompt for origin-scoped access; successful session has at least one account |
| `getSession` | None | Non-interactive session snapshot; never grants access |
| `disconnect` | None | `null`; idempotently revokes origin permission and pending approvals |
| `getCapabilities` | `{ account, networkHash }` | `WalletCapabilities`; requires an authorized account on that network |
| `signTransaction` | `{ account, networkHash, transaction }` | `{ signedTransaction, hash }`; approval and signing only |
| `submitTransaction` | `{ account, networkHash, signedTransaction }` | `{ hash }`; broadcast acknowledgement, not an execution receipt |

| Rule | Requirement |
| --- | --- |
| Request shape | Exactly the method's defined fields, including nested `params` |
| Selection | Explicit account and network; no implicit network switch |
| `WalletCapabilities` | `{ account, networkHash, atomicBatch: { maxCalls: number } \| null }` |
| Capability advertisement | Include `getCapabilities` in `supportedMethods` to enable the adapter's capability request |
| Unsupported capabilities | No advertisement or a `4200` response means unsupported batching; other request errors propagate |
| Atomic batch | Ordered, all-or-nothing DefaultWallet calls; honor `maxCalls` |

## Canonical Data and Limits

| Value | Required format / bound |
| --- | --- |
| Address, public key, hash | 32-byte lowercase `0x`-prefixed hex |
| Network hash | 64 lowercase hex characters without `0x` |
| Account nonce | Canonical decimal u64, at most `18446744073709551615`; address derivation, not transaction replay nonce |
| Session accounts | At most 32 unique addresses |
| Provider ID | 1–64 ASCII letters, digits, dots, underscores, or hyphens |
| Provider name | 1–80 characters; no controls or surrounding whitespace; render as text |
| Provider version | Exactly `"1.0.0"` |
| Error message | At most 1,024 characters |
| Unsigned transaction | Canonical classic XDR, at most 1,048,500 decoded bytes |
| Signed transaction | Canonical classic XDR, at most 1,048,576 decoded bytes |
| Transaction hex | Lowercase, even-length, `0x`-prefixed; at most 2,097,002 unsigned or 2,097,154 signed characters |
| Account derivation | Protocol pubkey account matching its public key and nonce; Ed25519 key must be non-small-order and prime-order |

| Validation boundary | Requirement |
| --- | --- |
| Canonical values | Reject malformed values rather than normalizing |
| XDR | Consume all input; re-encoding must reproduce the supplied bytes |
| Before approval | Enforce unsigned size limit; 76 bytes are reserved for one decorated signature |
| Bridges | Bound raw messages before parsing and bound pending requests; allow for JSON envelope size |
| Data parsers | Return snapshots |
| Provider parser | Preserves the live object's identity and method receivers; does not establish trust |

## Permissions and Session Events

| Event / state | Requirement |
| --- | --- |
| Unauthorized or disconnected origin | Empty accounts, current network hash retained |
| Accounts, permission, account metadata, or network changes | Emit `change` with a full session snapshot |
| Subscription | Does not emit an initial snapshot; call `getSession` |
| Connect/disconnect ordering | Page-facing changes arrive before the request resolves, including across bridges |
| Pending operation | Recheck authorization before signing or broadcasting |
| Session change | Clear approvals; old approval cannot survive a changed session |

## Signing and Transaction Identity

| Item | Requirement |
| --- | --- |
| Root identity | Transaction root address and complete pubkey claim match the selected account |
| Signed bytes | Preserve unsigned transaction byte-for-byte |
| Signature | Exactly one Ed25519 signature with public-key ID zero |
| Preimage | `cxs(DomainSeparator("Transaction")) \|\| networkHash \|\| txs(transaction)` |
| Verification | Strict Ed25519 with ZIP-215 disabled; public key and signature point R are non-small-order and prime-order |
| Signing | Sign the preimage directly, without an extra pre-hash |
| Result hash | `0x` plus lowercase SHA-256 of unsigned transaction XDR; excludes signatures and network |
| Web Crypto | Required by SDK signature verification; HTTPS or localhost in browsers |

## Approval and Submission

| Boundary | Requirement |
| --- | --- |
| Trusted caller | Derive origin in trusted wallet/bridge code, not page-supplied parameters |
| Retained approval | Bind exact signed bytes to origin, account, and network |
| Submission | Reject bytes outside the retained approval; return the approved canonical hash |
| Approval lifecycle | Clear on disconnect/session change; bound retained approvals; fail closed after eviction, restart, or lost state |
| Application persistence | Save signed result, hash, account, and original network before broadcast |
| Uncertain submission | Observe the saved hash on the original network; do not automatically sign a replacement |
| Identical-byte resubmission | Requires an explicit recovery policy and still-valid provider approval |
| Usage | [Transaction observation](/typescript/transaction-status/) |

## Errors

| Code | Meaning |
| --- | --- |
| `4001` | User rejected the request |
| `4100` | Unauthorized origin/account, stale session, or missing approval |
| `4200` | Unsupported method |
| `4900` | Provider disconnected or transport unavailable |
| `4901` | Requested network does not match |
| `-32602` | Invalid parameters, encoding, or limits |
| `-32603` | Internal error or invalid provider result |
| `-32002` | Another operation is pending |

| Rule | Requirement |
| --- | --- |
| Across contexts | Preserve numeric code and message; use `parseWalletProviderError`, not `instanceof` |
| Unknown method | Return `4200` |
| Malformed known request | Return `-32602` |

## Multiple-Provider Discovery

| API / rule | Behavior |
| --- | --- |
| `registerWalletProvider(provider, target = window)` | Validate, announce immediately, and respond to provider requests |
| `discoverWalletProviders(listener, target = window)` | Subscribe before requesting announcements; validate and deduplicate IDs |
| Request event | `groundhog:requestProvider` |
| Announcement event | `groundhog:announceProvider`; `detail` is the provider itself |
| Discovery limits | At most 32 IDs; first valid announcement for an ID wins |
| Cleanup | Idempotent; removes listeners, but does not disconnect sessions |
| Registration removal | Does not retract an already discovered provider |
| Outside browsers | Imports are safe; supply an `EventTarget` to discovery helpers |
| Trust | Shape validation is not wallet identity or origin authorization |

## Validation Helpers

| Helper | Validates / returns |
| --- | --- |
| `parseWalletAccount`, `parseWalletSession`, `parseWalletProviderInfo` | Canonical data and frozen snapshots; separately require nonempty accounts after connect |
| `parseWalletProvider` | Metadata and callable methods on the live object |
| `parseWalletHex32`, `parseWalletNetworkHash` | Distinct hex encodings |
| `parseWalletCapabilities` | Account, network, and batch capability shape |
| `parseProviderRequest` | Exact request union and bounded XDR |
| `parseTransactionHex`, `parseSignedTransactionHex` | Canonical decoded objects, without signature verification |
| `parseSignTransactionResult`, `parseSubmitTransactionResult` | Result shape; not signature, approval, or broadcast verification |
| `assertWalletTransaction(tx, account)` | Root address and complete pubkey claim; mismatch is `4100` |
| `verifySignTransactionResult(value, transaction, account, networkHash)` | Exact bytes, account claim, strict signature, and hash; invalid result is `-32603` |
| `parseWalletProviderError` | Recognized code and bounded message |

| Constant | Value |
| --- | --- |
| `MAX_TRANSACTION_BYTES` | `1_048_576` |
| `MAX_UNSIGNED_TRANSACTION_BYTES` | `1_048_500` |
| `MAX_WALLET_ACCOUNTS` | `32` |
| `MAX_DISCOVERED_PROVIDERS` | `32` |

## SDK Adapter Behavior

| API | Result / behavior |
| --- | --- |
| `createProviderWalletClient({ client, provider, account, networkHash })` | Synchronous separate binding for an authorized wire account; does not connect or mutate client |
| `getCapabilities()` | Fresh account/network capabilities when advertised; absence or `4200` means unsupported batching |
| `prepareExecution(request)` | Unsigned DefaultWallet transaction with nonce, expiry, and size handling |
| `prepareBatchExecution(request)` | Unsigned atomic batch after support checks |
| `signTransaction(transaction)` | Verified approval; never broadcasts |
| `submitTransaction(signed)` | Consumes latest approval once, including on failure; verifies response hash |
| `executeAndWait(request, controls)` | Prepare, sign, save through `onSigned`, submit, and observe successful execution |
| `executeCallsAndWait(request, controls)` | Atomic typed calls and ordered decoded results |
| `prepareDeployment(plan, options)` / `deployContractAndWait(plan, options, controls)` | Explicit funding and optional atomic initialization |
| `dispose()` | Idempotently unsubscribe and permanently invalidate; does not revoke permission |

| Lifecycle rule | Behavior |
| --- | --- |
| Inputs | Snapshot configuration and inputs before async work; validate account derivation and client network identity |
| Session | Check before preparation/signing/submission; every change or failed/mismatched session read invalidates the adapter |
| Concurrency | One in-flight operation; overlapping work fails with `-32002` |
| New approval | Clears the previous approval after local transaction validation; refusal does not restore it |
| Execution controls | Required `onSigned` persistence callback; optional `wait` settings and cancellation signal |
| Cleanup | No automatic reconnect/retry, UI deadline, or provider-request cancellation; late results cannot reactivate or submit |
| Usage | [Connect a wallet](/tools/wallet-integration/), [Send transactions](/typescript/transactions/) |

## Design References

| Reference | Relationship |
| --- | --- |
| [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193), [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963), [Wallet Standard](https://github.com/wallet-standard/wallet-standard) | Design influences, not compatibility claims |
| Scope | No arbitrary-message signing, implicit network addition, WalletConnect, hardware-wallet protocol, or source-address account support in this provider contract |
