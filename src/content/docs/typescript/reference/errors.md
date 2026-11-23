---
title: Error reference
description: ThruputError codes, typed context, and transaction facts in the TypeScript client.
---

| Topic | Entry point |
| --- | --- |
| Recovery after a failed write | [Track transaction results](/typescript/transaction-status/) |
| Complete signatures | [Generated client API](https://client-ts.thruput.network/) |
| Import | `ThruputError`, `isThruputError`, `parseThruputError` from `@thruputchain/client` |

## Error Shape

The client throws one class, `ThruputError`. Each error message links to its code on this page.

| Field | Contract |
| --- | --- |
| `name` | `"ThruputError"` |
| `code` | Stable camelCase code; never renamed or reused |
| `shortMessage` | One line, without details or the docs link |
| `details` | From a `ThruputError` cause only; never from your callbacks or signers |
| `message` | `shortMessage`, `details`, and the docs link |
| `context` | Frozen data typed by `code`; fields are never removed |
| `transaction` | [Transaction facts](#transaction-facts); present on every error after signing |
| `cause` | Underlying error, when present |
| `walk(predicate?)` | First matching error in the `cause` chain, or the last cause |

Invalid arguments and configuration throw native `Error`, `TypeError`, or `RangeError` before any network call.

## Checking Errors

| API | Rule |
| --- | --- |
| `isThruputError(error, code?)` | Checks `name` and `code`, not `instanceof`; works across realms and package copies; narrows `context` to the code |
| `error.code === code` | Narrows `context` after `isThruputError(error)` |
| `transactionErrorCodes` | Codes that always have `transaction` facts |
| `ThruputErrorContext` | Interface of all codes; other packages add codes through declaration merging |

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

## Transaction Facts

`transaction: { hash, outcome, reason, receipt?, submission? }`. Decide what to do from `outcome`.

| Outcome | Meaning |
| --- | --- |
| `succeeded` | Receipt shows success; a later step, such as decoding, failed |
| `failed` | Receipt shows failed execution |
| `notSubmitted` | The client did not dispatch the transaction |
| `unknown` | Outcome not known; never resend; observe `hash` on the original network |

| Field | Contract |
| --- | --- |
| `hash` | Transaction hash; each read returns a copy |
| `receipt` | Committed receipt, when known |
| `submission` | Signed bytes, transaction hash, and signing network, when known |

`reason` describes why the operation stopped. One reason can occur with different outcomes; use it for messages and diagnostics.

| Reason | Meaning |
| --- | --- |
| `aborted` / `faulted` | Receipt shows a contract abort or a fault |
| `executionFailed` | Receipt shows another execution failure |
| `resultUndecodable` | Execution succeeded; return data did not decode |
| `resultUnavailable` | Execution succeeded; the wallet does not keep child return data |
| `cancelled` | The caller's signal was aborted |
| `timeout` | The time budget ended |
| `persistenceFailed` | `onSigned` rejected; the client did not submit |
| `notDispatched` | This call did not send the request; with outcome `unknown`, an earlier call may have |
| `requestInvalid` | A local request or compatibility check failed before dispatch |
| `nodeRejected` | Node answered `invalidParams`, `transactionInvalid`, or `transactionRejected`, or stopped a funding attempt |
| `submissionFailed` | Submission failed after dispatch; the node may have the transaction |
| `disconnected` | Transient network or node failure during submission, or on the last read before the time budget ended |
| `statusUnknown` | Time budget ended; last status was `unknown` or unsupported |
| `recentFailure` | Time budget ended; last status was `recentFailure` |
| `networkChanged` | Observation endpoint reported a different network |
| `commitmentConflict` | Node reported two commitment heights for one transaction |
| `observationFailed` | Permanent read failure or invalid response |
| `admissionUnsupported` | Unsupported admission value from submission |
| `outcomeUnsupported` | Unsupported execution value in the receipt |

A node rejection stays `unknown`: another node or path can still have the transaction. Cancellation before signing throws the signal's reason; after signing, it throws a `ThruputError` with the reason as `cause`.

## Serialization

Structured clone keeps only the name, message, stack, and cause of an error.

| API | Contract |
| --- | --- |
| `error.toJSON()` | `code`, `shortMessage`, `details`, `context`, and `transaction`; bytes as hex, bigints as decimal strings; no `cause` |
| `parseThruputError(value)` | Rebuilds a `ThruputError`; checks shape and transaction facts; throws `TypeError` |
| Other errors in `context` | Keep only `name` |
| Parsed `context` | Not checked against the code's type; treat as untrusted |

## Transaction Codes

Every code in this section except `fundingStopped` always has `transaction` facts, as does `contractCallFailed`. After narrowing to one of them, `error.transaction` is required. Check `error.transaction` on `fundingStopped`.

### `transactionFailed`

**Outcome:** `failed`. `transaction.receipt` has the execution result.

### `transactionOutcomeUnsupported`

**Outcome:** `unknown`, reason `outcomeUnsupported`. Never treated as success or failure.

### `transactionResultUndecodable`

**Outcome:** `succeeded`. Thrown by `decodeExecution`, deployment decoding, and `decodeReceipt`. Do not repeat the write; decode `transaction.receipt` again.

### `transactionResultUnavailable`

**Outcome:** `succeeded`. The wallet does not keep child return data, for example DevWallet.

### `transactionNotSubmitted`

**Outcome:** `notSubmitted`. `transaction.submission` keeps the signed bytes.

### `transactionOutcomeUnknown`

**Outcome:** `unknown`. Submission or observation stopped. Never resend; observe `transaction.hash`.

| Context | Contract |
| --- | --- |
| `knownCommitment` | Commitment proved before observation stopped |
| `lastStatus` | Last reported status |
| `submissionError` | Submission failure, when observation continued after it |

### `transactionAdmissionUnsupported`

**Outcome:** `unknown`, reason `admissionUnsupported`. **Context:** `response`.

### `fundingStopped`

A faucet request stopped. `transaction` is present when the faucet identified a transaction. A stopped attempt with a successful receipt has outcome `succeeded`, reason `nodeRejected`.

| Context | Contract |
| --- | --- |
| `request` | `recipient`, `clientNonce`, `networkHash`; reconcile with the same nonce, because a new nonce can fund twice |
| `lastResponse` | Last faucet response, when the faucet answered |
| `knownCommitment` | Commitment proved before observation stopped |

## RPC and Transport Codes

### `rpcError`

JSON-RPC error object. **Context:** `code`, `rpcMessage`, `data`, `method`, `raw`. Custom transports throw this code.

### `nativeRpcError`

Native RPC method error. `context.kind` is a kind from the [error codes](/reference/json-rpc-api/#error-codes) and narrows `context.data`, or `unrecognized`. **Context:** also `code`, `rpcMessage`, `method`, `raw`. Neither kind grants retry permission.

```ts
if (isThruputError(error, "nativeRpcError") && error.context.kind === "stateHeightUnavailable") {
  console.log(error.context.data.observedStateBlockHeight);
}
```

### `httpResponseError`

Non-success HTTP status. **Context:** `status`, `statusText`, `endpoint`, `method`.

### `httpRequestFailed`

Network request failed. **Context:** `endpoint` (URL origin only), `method`.

### `rpcResponseInvalid`

Malformed JSON-RPC reply; the write outcome is unknown. **Context:** `raw`.

### `rpcValueInvalid`

Malformed result value. **Context:** `path`, `raw`.

### `rpcRequestInvalid`

Invalid local request; not dispatched. **Context:** `path`.

### `rpcIncompatible`

Unsupported wire format, network mismatch, or unadvertised method.

### `rpcValueUnsupported`

Value from a newer server. **Context:** `value`, an `UnsupportedRpcValue`.

### `networkMismatch`

Endpoint network does not match the cluster descriptor. **Context:** `cluster`, `actual`.

## Contract Codes

### `contractViewFailed`

View abort, fault, or unsupported result. **Context:** `method`, `entrypoint`, `outcome`. Read the typed failure with the method's `decodeError`:

```ts
try {
  await ERC20.v0_1.transfer.view({ client, address, args });
} catch (error) {
  const failure = ERC20.v0_1.transfer.decodeError(error);
  if (failure?.kind === "abort") console.log(failure.exception);
}
```

### `contractCallFailed`

Root receipt without a typed return. **Context:** `method`, `entrypoint`, `outcome`; read with `decodeError`. Always has `transaction` facts.

### `contractDecodeFailed`

Contract bytes do not match their declared type.

### `contractVerificationFailed`

Retrieved bytes or response metadata failed identity or canonical checks.

## Wallet Provider Codes

`createProviderWalletClient` maps each [wallet provider code](/typescript/reference/wallet-provider/#errors) to a named code. **Context:** `providerCode`, the numeric wire code.

### `userRejected`

Provider code `4001`: the user rejected the request.

### `walletUnauthorized`

Provider code `4100`: unauthorized origin or account, stale session, or missing approval.

### `walletMethodUnsupported`

Provider code `4200`: unsupported method.

### `walletDisconnected`

Provider code `4900`: provider disconnected or transport unavailable.

### `walletNetworkMismatch`

Provider code `4901`: requested network does not match.

### `walletInvalidParams`

Provider code `-32602`: invalid parameters, encoding, or limits.

### `walletInternalError`

Provider code `-32603`: internal error or invalid provider result.

### `walletRequestPending`

Provider code `-32002`: another operation is pending.

## Other Codes

### `amountInvalid`

`parseUnits` rejected the text. **Context:** `kind` (`malformed` or `precision`), `decimals`.

### `historyWalkFailed`

Regressed coverage, lost retention, duplicate or out-of-order rows, or a repeated cursor. **Context:** `page`.
