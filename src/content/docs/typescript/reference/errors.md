---
title: Error reference
description: ThruputError codes, typed context, and transaction facts in the TypeScript client.
---

The client throws one error class, `ThruputError`. Identify an error by its stable `code` and read typed data from `context`. Every error message links to the code's section on this page.

| Field | Meaning |
| --- | --- |
| `name` | Always `ThruputError` |
| `code` | Stable camelCase code; see [Codes](#transactions) |
| `shortMessage` | One line, without details or the docs link |
| `details` | Detail from a `ThruputError` cause; never copied from your callbacks or signers |
| `message` | `shortMessage`, `details`, and the docs link |
| `context` | Typed, frozen data for the code |
| `transaction` | Facts about the signed transaction; present on every error after signing |
| `cause` | The underlying error, when there is one |
| `walk(predicate?)` | First error in the `cause` chain that matches, or the last cause |
| `toJSON()` | JSON-safe form for `postMessage` or storage |

Codes are stable. The client never renames or reuses a code, or removes a context field. Invalid arguments and configuration throw native `Error`, `TypeError`, or `RangeError` before any network call.

## Check an Error

```ts
import { isThruputError } from "@thruputchain/client";

try {
  await wallet.executeAndWait(request);
} catch (error) {
  if (isThruputError(error) && error.transaction?.outcome === "unknown") {
    saveForLaterObservation(error.transaction.hash);
  }
  throw error;
}
```

| API | Rule |
| --- | --- |
| `isThruputError(error, code?)` | Checks `name` and `code`, not `instanceof`; works across realms and with more than one copy of the package |
| `isThruputError(error, "amountInvalid")` | Narrows `error.context` to that code's context |
| `error.code === "..."` | Narrows `context` after `isThruputError(error)` |
| `ThruputErrorContext` | Interface of all codes; other packages add codes through declaration merging |

## Transaction Facts

Every error raised after a transaction is signed has `transaction: { hash, outcome, reason, receipt?, submission? }`. Decide what to do from `outcome` only.

| Outcome | Meaning |
| --- | --- |
| `succeeded` | The receipt shows success. The error is about a later step, such as decoding |
| `failed` | The receipt shows failed execution |
| `notSubmitted` | The client did not dispatch the transaction |
| `unknown` | The client cannot know. Never send it again. Observe `hash` on the original network |

| Field | Value |
| --- | --- |
| `hash` | Transaction hash; each read returns a new copy |
| `receipt` | The committed receipt, when the client has one |
| `submission` | Exact signed bytes, transaction hash, and signing network, when the client has them |

`reason` explains why the operation stopped. The same reason can occur with different outcomes, so use it for messages and diagnostics only.

| Reason | Meaning |
| --- | --- |
| `aborted` | The receipt shows a contract abort |
| `faulted` | The receipt shows a fault |
| `executionFailed` | The receipt shows another execution failure; the receipt has the exact result |
| `resultUndecodable` | Execution succeeded, but its return data did not decode |
| `resultUnavailable` | Execution succeeded, but the wallet does not keep child return data |
| `cancelled` | The caller's signal was aborted |
| `timeout` | The time budget ended |
| `persistenceFailed` | The `onSigned` callback rejected, so the client did not submit |
| `notDispatched` | The transport did not send the request |
| `requestInvalid` | A local request or compatibility check failed before dispatch |
| `nodeRejected` | The node answered `invalidParams`, `transactionInvalid`, or `transactionRejected`, or stopped a funding attempt |
| `submissionFailed` | Submission failed in a way that does not prove the node did not receive the transaction |
| `disconnected` | The time budget ended after the last read failed |
| `statusUnknown` | The time budget ended; the last status was `unknown` or unsupported |
| `recentFailure` | The time budget ended; the last status was `recentFailure` |
| `networkChanged` | The observation endpoint reported a different network |
| `commitmentConflict` | The node reported two commitment heights for one transaction |
| `observationFailed` | A permanent read failure or an invalid response stopped observation |
| `admissionUnsupported` | Submission returned an admission value this client does not support |
| `outcomeUnsupported` | The receipt has an execution value this client does not support |

A node rejection stays `unknown`, because another node or path can still have the transaction. Cancellation before signing throws the signal's reason; after signing, the client throws a `ThruputError` with the reason as `cause`. See [Track transaction results](/typescript/transaction-status/) for recovery.

## Send an Error Across Contexts

Structured clone keeps only the name, message, stack, and cause of an error.

| API | Rule |
| --- | --- |
| `error.toJSON()` | `code`, `shortMessage`, `details`, `context`, and `transaction`; bytes as hex, bigints as decimal strings; no `cause` |
| `parseThruputError(value)` | Rebuilds a `ThruputError`; checks shape and transaction facts strictly; throws `TypeError` |
| Other errors in `context` | Keep only their `name` |
| Context values | Decoded, but not checked against the code's type; treat as untrusted |

## Transactions

The client supplies `transaction` facts for these codes.

### `transactionFailed`

The receipt shows failed execution. Outcome `failed`; reason `aborted`, `faulted`, or `executionFailed`. `transaction.receipt` has the complete result.

### `transactionOutcomeUnsupported`

The receipt has an execution value this client does not support. Outcome `unknown`, reason `outcomeUnsupported`. The client never treats it as success or failure.

### `transactionResultUndecodable`

Execution succeeded, but its return data did not decode. Outcome `succeeded`. Do not repeat the write; decode `transaction.receipt` again with the right descriptors.

### `transactionResultUnavailable`

Execution succeeded, but the wallet does not keep child return data, for example DevWallet. Outcome `succeeded`.

### `transactionNotSubmitted`

The client did not dispatch the signed transaction. Outcome `notSubmitted`. `transaction.submission` keeps the signed bytes.

### `transactionOutcomeUnknown`

Submission or observation stopped before the client knew the outcome. Outcome `unknown`. Never resend; observe `transaction.hash`.

| Context | Meaning |
| --- | --- |
| `knownCommitment` | Commitment that the client proved before it stopped |
| `lastStatus` | The last status the node reported |
| `submissionError` | The submission failure, when observation continued after it |

### `transactionAdmissionUnsupported`

Submission returned an admission value this client does not support. Outcome `unknown`, reason `admissionUnsupported`. Context: `response`.

### `fundingStopped`

A faucet request stopped. `transaction` is present when the faucet identified a transaction. A stopped attempt with a successful receipt has outcome `succeeded` and reason `nodeRejected`.

| Context | Meaning |
| --- | --- |
| `request` | `recipient`, `clientNonce`, and `networkHash`; reconcile with the same nonce, because a new nonce can fund twice |
| `lastResponse` | The last faucet response, when the faucet answered |
| `knownCommitment` | Commitment that the client proved before it stopped |

## JSON-RPC and Transport

### `rpcError`

The endpoint returned a JSON-RPC error object. Context: `code`, `rpcMessage`, `data`, `method`, and the complete `raw` object. Custom transports throw this code.

### `nativeRpcError`

A native RPC method returned an error. `context.kind` is a kind from the [error codes](/reference/json-rpc-api/#error-codes) and narrows `context.data`, or it is `unrecognized` for unknown, malformed, or contradictory evidence. Context also has `code`, `rpcMessage`, `method`, and `raw`. Neither kind grants retry permission.

```ts
if (isThruputError(error, "nativeRpcError") && error.context.kind === "stateHeightUnavailable") {
  console.log(error.context.data.observedStateBlockHeight);
}
```

### `httpResponseError`

The HTTP response had a status that is not successful. Context: `status`, `statusText`, `endpoint`, `method`.

### `httpRequestFailed`

The HTTP request failed in the network layer. Context: `endpoint` (the URL origin only) and `method`.

### `rpcResponseInvalid`

The JSON-RPC reply was malformed. The write outcome of the request is unknown. Context: `raw`.

### `rpcValueInvalid`

A known RPC result value was malformed. Context: `path` and `raw`.

### `rpcRequestInvalid`

A local RPC request value was invalid. The transport was not called. Context: `path`.

### `rpcIncompatible`

The endpoint, network, or advertised method set does not match what the client requires.

### `rpcValueUnsupported`

The endpoint returned a value this client does not support. Context: `value`, an `UnsupportedRpcValue`.

### `networkMismatch`

The endpoint network does not match the cluster descriptor. Context: `cluster` and `actual`.

## Contracts

### `contractViewFailed`

A contract view aborted, faulted, or returned an unsupported outcome. Context: `method`, `entrypoint`, and `outcome`. Read the typed failure with the method's `decodeError`:

```ts
try {
  await ERC20.v0_1.transfer.view({ client, address, args });
} catch (error) {
  const failure = ERC20.v0_1.transfer.decodeError(error);
  if (failure?.kind === "abort") console.log(failure.exception);
}
```

### `contractCallFailed`

A root contract receipt did not produce a typed return. Context: `method`, `entrypoint`, and `outcome`; read the typed failure with `decodeError`. Has `transaction` facts from the receipt.

### `contractDecodeFailed`

Contract bytes do not match their declared type.

### `contractVerificationFailed`

Retrieved bytes or response metadata failed identity or canonical checks.

## Wallet Providers

`createProviderWalletClient` maps each [wallet provider code](/typescript/reference/wallet-provider/#errors) to a named code. Context: `providerCode`, the numeric wire code.

### `userRejected`

Provider code `4001`: the user rejected the request.

### `walletUnauthorized`

Provider code `4100`: unauthorized origin or account, stale session, or no matching approval.

### `walletMethodUnsupported`

Provider code `4200`: the provider does not support the method.

### `walletDisconnected`

Provider code `4900`: the provider is disconnected or its transport is unavailable.

### `walletNetworkMismatch`

Provider code `4901`: the wallet network does not match.

### `walletInvalidParams`

Provider code `-32602`: invalid parameters, noncanonical encoding, or exceeded limits.

### `walletInternalError`

Provider code `-32603`: internal error or invalid provider result.

### `walletRequestPending`

Provider code `-32002`: another operation is pending.

## Other

### `amountInvalid`

`parseUnits` received a malformed amount or too many decimal places. Context: `kind` (`malformed` or `precision`) and `decimals`.

### `historyWalkFailed`

History pages broke ordering, cursor, or identity rules across pages: regressed coverage, lost retention, duplicate or out-of-order rows, or a repeated cursor. Context: `page`.
