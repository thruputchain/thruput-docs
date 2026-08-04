---
title: Groundhog CLI
description: How Groundhog CLI commands fit into RV32 builds, local nodes, tests, deployment, and TypeScript bindings.
---

Run normal Rust loops with `cargo`. Run Groundhog-specific work with `groundhog`: scaffolds, RV32 artifacts, local nodes, deployments, RPC calls, state inspection, keys, wallets, and generated bindings. RV32 is Groundhog's 32-bit RISC-V contract target.

:::note[Version checked]
This page was last checked against Groundhog CLI `0.6.1` and SDK `0.17.1` on August 4, 2026.
:::

## First-Run Setup

Early-access Cargo registry credentials are handled by Cargo, not the CLI. Configure Cargo from your onboarding instructions before creating or building SDK projects.

After installing the CLI, run the guided setup before creating your first project:

```bash
groundhog init
```

`groundhog init` creates your global configuration with `local` and `devnet` profiles ready to use, then guides you through the rest of the first-time setup.

`groundhog node` and `groundhog test --integration` also require a compatible `hog-devnode` executable, which is distributed separately. `groundhog node` accepts `--hog-devnode-binary`; both commands support `GROUNDHOG_DEVNODE_BINARY`, a sibling executable beside `groundhog`, or `PATH`. Integration mode does not accept the command-line flag.

`groundhog new <name>` creates a project from the `counter` or `stub` template. `groundhog status` checks toolchain, key, and project config state. `groundhog completion <shell>` prints shell completions.

## Foundry Mental Model

If you know Foundry, `groundhog node` is closest to `anvil`: it starts a standalone local development chain on port `9545`. Generated Groundhog projects select the `local` network. While the node is running, the CLI fills in missing endpoint and runtime-manifest values from the active local runtime.

| Foundry habit                                                  | Groundhog command     | What to remember                                                                                                                       |
| -------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `anvil`                                                        | `groundhog node`      | Starts a local chain backed by `hog-devnode`; default port is `9545`.                                                                  |
| `forge script ... --broadcast --rpc-url http://localhost:8545` | `groundhog deploy`    | Signs and submits a deploy transaction for an existing `.rv32a` artifact.                                                              |
| `cast call`                                                    | `groundhog view`      | Runs a read-only sandboxed simulation against committed state.                                                                         |
| `cast send`                                                    | `groundhog call`      | Sends a signed state-changing transaction.                                                                                             |
| Anvil's funded dev accounts                                    | `dev-0`, `dev-1`, ... | Bootstrap accounts come from the active local runtime. `dev-0` is the fallback when the active local profile and global config do not select another key. |

Groundhog is not EVM-compatible. The analogy is about local workflow, not bytecode, ABI, accounts, or transaction format.

## Common Workflow

Start with native tests and the default RV32 build:

```bash
groundhog new my-counter     # create the project
cd my-counter
groundhog config set default-key dev-0 --profile local --project
cargo test                   # fast native tests
groundhog build              # write the RV32 artifact and lowering metadata
```

Run a local chain in a second terminal:

```bash
groundhog node
```

Then deploy and interact from the project directory:

```bash
groundhog deploy
groundhog call my-counter increment 1
groundhog view my-counter get
```

On a successful deploy, the CLI saves a project-name contract alias in `groundhog.toml`. Use that alias, such as `my-counter`, or the `0x...` address printed by `groundhog deploy`.

For complete command sequences, follow [Develop Locally with the CLI](/tutorials/develop-locally/) first, then [Develop on Devnet with the CLI](/tutorials/develop-on-devnet/).

## Which Command Should I Use?

| Goal                                        | Command                                        |
| ------------------------------------------- | ---------------------------------------------- |
| Create a starter contract                   | `groundhog new <name>`                         |
| Check local setup                           | `groundhog status`                             |
| Run fast logic tests                        | `cargo test`                                   |
| Build a deployable RV32 artifact            | `groundhog build`                              |
| Run executor-backed RV32 tests              | `groundhog test`                               |
| Keep a local chain running                  | `groundhog node`                               |
| Deploy to the selected profile              | `groundhog deploy`                             |
| Send a state-changing contract call         | `groundhog call <contract> <method> [args...]` |
| Transfer native HOG                         | `groundhog transfer <recipient> <amount>`      |
| Run a read-only contract simulation         | `groundhog view <contract> <method> [args...]` |
| Read raw committed storage                  | `groundhog storage <contract> 0x<key>`         |
| Inspect one transaction                     | `groundhog tx show <hash>`                     |
| List address-rooted transaction history     | `groundhog tx list <target>`                   |
| List or decode contract events              | `groundhog events list <contract>`             |
| List canonical token transfers              | `groundhog token transfers <token>`            |
| Create a contract wallet                    | `groundhog wallet create`                      |
| Select a default wallet                      | `groundhog wallet use <wallet>`                |
| Request additional HOG                      | `groundhog airdrop <recipient>`                |
| Read a native HOG balance                   | `groundhog balance <target>`                   |
| Inspect the selected profile                | `groundhog config get [profile] [--sources]`   |
| List configured profiles                    | `groundhog config profiles`                    |
| Create or select a profile                  | `groundhog config new`, `groundhog config use` |
| Run disposable local-node integration tests | `groundhog test --integration`                 |
| Compare WASM and RV32 integration behavior  | `groundhog test --integration --differential`  |
| Generate TypeScript contract bindings       | `groundhog codegen ts <spec.xdr> -o <file.ts>` |

:::caution[RV32 default]
`groundhog build`, `groundhog test`, and `groundhog test --integration` default to RV32. Use `cargo test` for fast native logic tests, `groundhog test` for executor-backed artifact tests, and `groundhog test --integration` for local-node RPC tests.
:::

## Shared Flags

Global flags work across commands:

```bash
groundhog --json status
groundhog --quiet build
groundhog --show-cargo-commands build
```

Most network-facing commands accept `--profile`. Profile selection checks the command-line flag, `GROUNDHOG_PROFILE`, project `default_profile`, then global `default_profile`. If none selects a profile, commands that require one fail.

By default, global config and keys live under `~/.config/groundhog/`. Cache and retry records live under `~/.cache/groundhog/`. Groundhog honors `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` when set.

## Configuration

Groundhog keeps reusable network configuration in a global file and allows each project to override it:

| Layer   | Location                                                  | Use                                                                                         |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Global  | `~/.config/groundhog/config.toml`                         | Reusable profiles, defaults, endpoint settings, key selection, and wallet bindings          |
| Project | Nearest ancestor `groundhog.toml`                         | Project defaults, profile overrides, contract aliases, and project-specific wallet bindings |

Profiles with the same name merge field by field. Project values override matching global values. Contract and wallet maps merge by entry, so a project can add its own aliases without copying global endpoint or wallet settings.

Generated projects include `local` and `devnet` project overlays. These small tables select a network and provide a place for deployed contract aliases. They do not need to duplicate complete global profiles.

### Inspect Profiles

List profiles from both layers:

```bash
groundhog config profiles
```

Inspect the selected persisted profile, or name one explicitly:

```bash
groundhog config get
groundhog config get devnet
groundhog config get devnet --sources
```

`--sources` identifies whether each value came from global or project config. `config get` reports the persisted merge. It does not apply active local-node state, signer fallback, `GROUNDHOG_RUNTIME_MANIFEST`, or command-line endpoint overrides. Use `groundhog status --profile <name>` when you need diagnostics for the effective runtime configuration.

### Create and Update Profiles

`groundhog init` creates the initial global `local` and `devnet` profiles. Inspect them before adding more:

```bash
groundhog config get local
groundhog config get devnet
```

Use `config new` for an additional profile. It fails if that profile already exists in the selected layer:

```bash
groundhog config new staging \
  --network devnet \
  --rpc-url "$STAGING_RPC_URL" \
  --global
```

Editable fields are `network`, `rpc-url`, `faucet-url`, and `default-key`. Remove one layer's value with `config unset`; an inherited value from the global profile may then become visible:

```bash
groundhog config unset rpc-url --profile devnet --project
```

Mutations always target one physical file. Outside a project, omitted scope means global. Inside a project, pass exactly one of `--global` or `--project`:

```bash
groundhog config set rpc-url https://project-rpc.example \
  --profile devnet \
  --project
```

Remove an entire layer-owned profile with `config rm`. Normal output asks for confirmation. `--json` and `--quiet` remove it without prompting.

Contract aliases and wallet bindings are not editable through `config set`. Successful deployments save aliases to the project overlay when run inside a project. Wallet commands manage wallet bindings.

## Build and Test

`groundhog build` defaults to `--target rv32` and writes the deployable 32-bit RISC-V artifact plus lowering metadata:

```text
target/groundhog/<name>.rv32a
target/groundhog/<name>.rv32.json
target/groundhog/<name>.spec.xdr
target/groundhog/<name>.spec.json
```

The spec sidecars are emitted when the contract contains spec metadata. Artifact names use the package's snake-case name, so `my-contract` produces `my_contract.*`.

Use the WASM target only for compatibility work:

```bash
groundhog build --target wasm
```

Test modes:

| Command                        | What runs                                                              |
| ------------------------------ | ---------------------------------------------------------------------- |
| `cargo test`                   | Native Rust tests on your host. Best for fast contract logic feedback. |
| `groundhog test`               | Executor-backed RV32 tests using `tests/test_rv32.rs`.                 |
| `groundhog test --target wasm` | WASM compatibility tests using `tests/test_wasm.rs`.                   |
| `groundhog test --integration` | Ephemeral local node, RV32 deploy, then `tests/integration.rs`.        |
| `groundhog test --integration --differential` | The same integration target against isolated WASM and RV32 nodes. |

Fresh projects created by `groundhog new` include `tests/integration.rs`, a small `build.rs`, and optional host-only RPC dependencies. The starter test verifies that the CLI provided a deployed contract and a live RPC node, then leaves a placeholder for contract-specific assertions. It stays ignored under ordinary `cargo test`; the integration command activates it without coupling activation to a particular test name.

Projects created with an older scaffold must add the integration target and activation wiring before running the command. Otherwise, it exits with `integration_test_not_found`. See [Testing](/programming-model/testing/#what-the-scaffold-gives-you) for the generated Cargo entries and build-script hook.

Integration mode accepts `--hogd-protocol hogp/<hash>` when a local devnode is slightly ahead of the published protocol token. `GROUNDHOG_HOGD_PROTOCOL` is its environment fallback. Shape mismatches still fail.

Integration tests receive:

| Variable                     | Value                                   |
| ---------------------------- | --------------------------------------- |
| `GROUNDHOG_INTEGRATION_TEST` | `1`; activates the scaffolded live test |
| `GROUNDHOG_RPC_URL`          | RPC URL for the ephemeral local node    |
| `GROUNDHOG_CONTRACT_ADDRESS` | Deployed contract address               |
| `GROUNDHOG_PROFILE`          | `integration`                           |
| `GROUNDHOG_DEFAULT_KEY`      | `dev-0`                                 |
| `GROUNDHOG_RUNTIME_MANIFEST` | Runtime manifest path, when available   |

For testing guidance, see [Testing](/programming-model/testing/).

## Local Node

`groundhog node` starts one supervised `hog-devnode`. It uses ephemeral state when `--data-dir` is omitted. Pass a data directory to preserve chain state across clean stop and restart cycles.

```bash
groundhog node
groundhog node --data-dir .groundhog/node
groundhog node --port 9546
groundhog node --verbose
groundhog node --block-driver interval
groundhog node --block-driver interval --block-interval-ms 1000
groundhog node --ramdb-bytes <bytes>
```

Useful flags and environment variables:

| Setting                         | Use for                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `--port`                        | Change the public JSON-RPC port. Default: `9545`.                                        |
| `--dev-account-count`           | Change how many deterministic dev accounts the node bootstraps.                          |
| `--hog-devnode-binary`          | Point at a specific `hog-devnode` binary.                                                |
| `--data-dir <dir>`              | Preserve chain state in a selected directory across clean restarts.                     |
| `--block-driver interval`       | Pace block production on a timer instead of waking immediately after successful submits. |
| `--block-driver instant`        | Use submit-wake block production. This is the default.                                   |
| `--block-interval-ms <ms>`      | Override the interval driver timer. Default: `500`. Requires `--block-driver interval`.  |
| `--rpc-max-connections <count>` | Set the public RPC connection cap. Default: `2000`.                                      |
| `--ramdb-bytes <size>`          | Set the RAM database capacity using decimal, hex, or K/M/G suffixes.                     |
| `--hogd-protocol hogp/<hash>`   | Override the local x23 protocol token when protocol shapes remain compatible.            |
| `GROUNDHOG_DEVNODE_BINARY`      | Default binary path when `--hog-devnode-binary` is omitted.                              |
| `GROUNDHOG_RUNTIME_MANIFEST`    | Point commands at a specific runtime manifest for `dev-N` accounts.                      |
| `RUST_LOG`                      | Control supervisor and forwarded node logs.                                              |

`groundhog node` records the active local endpoint and runtime manifest in global CLI state. Local profiles inherit only runtime fields they do not set explicitly. The implicit `dev-0` signer is available when the resolved endpoint and manifest match the active runtime. The node removes its active-runtime record when it shuts down. The command also prints an export line for `GROUNDHOG_RUNTIME_MANIFEST` when the node reports a manifest.

Use `groundhog test --integration` when you want disposable state per test run.

## Deploy and Interact

Build before deploying. `groundhog deploy` auto-detects the selected artifact (`.rv32a` by default), signs a deploy transaction with the active key, submits it to the selected profile, and saves a contract alias in `groundhog.toml` when deploy succeeds. If source files are newer than the artifact, it warns so you can rebuild before submitting stale code.

Use `groundhog call` for signed state changes and `groundhog view` for read-only simulation. Add `--from dev-0` to simulate a caller. `groundhog storage` reads one raw committed storage item; prefer contract methods and `groundhog view` when you want typed behavior. `groundhog balance`, `groundhog transfer`, and `groundhog airdrop` cover native HOG account work.

## Transactions, Events, and Tokens

The inspection commands return one page at a time. Cursors are opaque and must be reused with the same target and filters.

```bash
groundhog tx show 0x<32-byte-hash>
groundhog tx list my-counter --limit 50
groundhog events list my-counter --topic0 0x<topic>
groundhog token transfers HOG --account dev-0
```

`tx show` returns public status and receipt fields, not raw transaction bodies or deep traces. `tx list` filters by root invocation target. `events list` scans one contract newest first and supports repeated topic options for OR within a topic position. `token transfers` returns canonical ERC-20 transfer records and leaves amounts as base-unit decimal strings.

## Keys and Wallets

Signing keys are Ed25519 keypairs stored globally under `~/.config/groundhog/keys/` by default.

```bash
groundhog keys generate alice
groundhog keys ls
groundhog keys use alice
groundhog keys rm alice
```

### Create a Wallet

`groundhog init` can create and select the `default` signing key during first-time setup. From outside a project, create its Devnet contract wallet with:

```bash
groundhog wallet create --profile devnet
groundhog wallet ls --profile devnet
groundhog balance default --profile devnet
```

The wallet name defaults to the selected key name. On a fresh setup, the key and wallet are both named `default`. Hosted profiles use the configured faucet to prefund the address before creating the wallet, so a separate airdrop is not required for creation. The first wallet for the effective key normally becomes the profile's default wallet.

Request more HOG later when needed, then check the balance again. Devnet chooses the amount, so do not pass `--amount`:

```bash
groundhog airdrop default --profile devnet
groundhog balance default --profile devnet
```

Wallet writes go to the project overlay when run inside a project and to global config otherwise. Remove a saved wallet binding with `groundhog wallet rm <wallet-name> --profile devnet`. This removes local configuration, not the on-chain wallet.

`groundhog airdrop` accepts a saved wallet, a local `dev-N` account, or a direct address. On local profiles, `--amount` defaults to 10 HOG and accepts up to seven decimal places. `groundhog balance` also accepts contract aliases. Both commands require an explicit target.

While an active local runtime is recorded, `dev-0` is the fallback when the active local profile and global config do not select another key. See [Develop Locally with the CLI](/tutorials/develop-locally/) for the built-in account flow and [Develop on Devnet with the CLI](/tutorials/develop-on-devnet/) for the hosted wallet flow.

## TypeScript Bindings

RV32 builds emit a canonical `.spec.xdr` sidecar. Generate TypeScript from it:

```bash
groundhog build
groundhog codegen ts \
  ./target/groundhog/my_counter.spec.xdr \
  -o ./web/src/contracts/my-counter.ts
```

The shortcut `groundhog build --target wasm --bindings ts` remains WASM-only. For RV32, run `groundhog codegen ts` against the generated `.spec.xdr`.

For generated contract bindings, see [TypeScript Bindings](/tools/typescript-bindings/). For the app-facing client package, see [TypeScript SDK](/tools/typescript-sdk/).
