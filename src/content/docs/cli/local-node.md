---
title: Run a local node
description: Start an isolated development chain, select its accounts, and preserve or inspect local state.
---

Use a local node for disposable development and RPC tests. For a first hosted deployment, follow the [Futurenet contract quickstart](/get-started/contract/).

## Start the node

```bash
thruput node
```

Keep this terminal running. The CLI starts its managed `hog-devnode` and exposes JSON-RPC at `http://127.0.0.1:9545` by default. If the selected runtime is missing, the CLI can download its verified bundle.

The CLI records the active endpoint and runtime manifest so commands using a local profile can find the node.

The node funds the selected project/global key. If local and Futurenet profiles
use different keys, run `THRUPUT_PROFILE=local thruput node` so startup uses the
key selected by local commands. `--key NAME` explicitly selects a stored key.

## Select a local account

From another terminal in your project:

```bash
thruput status --profile local
thruput balance --profile local
```

`status` shows the effective key. On a fresh chain, the node gives that key's account 100 native tokens. `thruput balance` then shows slightly less, because the account's first storage deposit comes out of that allocation. Use `thruput node --initial-account-tokens AMOUNT` to change the amount. The faucet key is private to the node, and the node creates no other accounts. An ML-DSA-65 key gets no genesis allocation. To fund it, or any other key, run `thruput airdrop NAME --profile local`.

If the profile already selects a saved wallet, key selection alone does not replace that wallet. Inspect `thruput status --profile local` and [wallet selection](/cli/wallets/#select-an-account) before submitting.

You can now use the normal [deployment and call commands](/cli/deploy-and-call/) with `--profile local`.

## Preserve state

Without a data directory, stopping the node discards its chain state. Stored signing keys and project configuration remain, but the local deployments and balances do not.

```bash
thruput node --data-dir .thruput/node
```

Restart with the same data directory to reuse the chain. Repeat the same `--network-config` overrides, and omit `--init-network-hash`. A runtime older than `0.1.31-rc.10` created data directories that the current runtime cannot open. Use a new directory for them.

Stop the node before backing up or restoring that directory:

```bash
thruput chain dump --data-dir .thruput/node --output chain-backup.json
thruput chain restore --data-dir .thruput/node --input chain-backup.json
```

Restore asks before replacing populated state. Use `--yes` only when that replacement is intended.

## Change the endpoint or logging

```bash
thruput node --port 9546
thruput node --verbose
```

Choose logging before reproducing a problem: restarting an ephemeral node to enable it loses the old state. `RUST_LOG` provides finer control and overrides the verbose preset.

The public listener binds to loopback by default. `--host` changes that listener for container or VM access; exposing it beyond loopback exposes an unauthenticated development RPC endpoint.

## Control blocks and time

Contracts that depend on time, such as vesting, expiry, auctions, and interest, need days of chain time in a test that runs for seconds. A local node can produce blocks on request and move block time forward. These controls need thruput CLI 0.46.0 or later.

`--block-driver` selects how the node produces blocks:

| Mode | Blocks |
| --- | --- |
| `instant` (default) | One block for each accepted transaction submission |
| `interval` | One block every `--block-interval-ms` milliseconds, empty or not |
| `manual` | Only on request |

```bash
thruput node --block-driver manual
```

In every mode, these local-only JSON-RPC methods control blocks and block time. They follow Anvil's mining and time methods:

| Method | Anvil | Effect |
| --- | --- | --- |
| `dev_produceBlock` | `evm_mine` | Produce one block now. It can be empty. An optional `blockTimepoint` sets its time |
| `dev_produceBlocks` | `anvil_mine` | Produce 1 to 1000 blocks, optionally `intervalNanoseconds` apart |
| `dev_setNextBlockTimepoint` | `evm_setNextBlockTimestamp` | Set the time of the next block |
| `dev_increaseTime` | `evm_increaseTime` | Move the clock forward for every later block. Produces no block |
| `dev_setBlockDriver` | `evm_setAutomine` | Change the block driver mode. Switching to `instant` mines pending transactions |

Block time follows these rules:

- Timepoints are Unix nanoseconds as decimal strings, the value contracts read with `get_block_timepoint()`.
- After a time change, later blocks continue from the new time. They do not fall back to the wall clock.
- Blocks never move backward. A timepoint earlier than the chain tip's returns `-32602`.
- A contract view sees a new time only after a block exists at that time, so produce one after `dev_increaseTime`.

For example, move 30 days ahead and make the new time visible:

```bash
curl -s http://127.0.0.1:9545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"dev_increaseTime","params":{"nanoseconds":"2592000000000000"}}'
curl -s http://127.0.0.1:9545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"dev_produceBlock","params":{}}'
```

:::note
Contract views run at the later of the wall clock and the tip's time from hog-devnode 0.1.35, the default runtime from thruput CLI 0.46.1. With hog-devnode 0.1.34 and earlier, views use the wall clock, so a view does not see a block time ahead of it.
:::

The [JSON-RPC reference](/reference/json-rpc-api/#block-and-time-methods) lists the parameters and results. In Rust, [testkit](/contracts/testing/#testkit) wraps these methods on `Network`.

## Runtime selection

The CLI selects a default from its bundled runtime catalog. See [local runtime setup](/cli/install/#set-up-the-local-runtime) to inspect and install managed runtimes.

To inspect the effective configuration:

```bash
thruput status --json
```

An explicit `--hog-devnode-binary`, `THRUPUT_DEVNODE_BINARY`, or adjacent binary can take precedence over managed selection. Use `--hog-devnode-version VERSION` when intentionally selecting an exact catalog entry. `--offline` prevents managed downloads, not RPC or Cargo traffic.

If the runtime is incompatible, select matching binaries. `--hogd-protocol` changes a handshake token only; it does not make different wire formats compatible.

For isolated automated runs, prefer [integration tests](/cli/build-and-test/#integration-and-workspace-runs) rather than managing a long-running node yourself.
