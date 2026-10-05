---
title: Create a project
description: Create a contract project and keep its generated compiler, build, and test configuration together.
---

Use `groundhog new` to create a Rust contract project. If this is your first setup, [install the CLI](/cli/install/) and run `groundhog init` first.

## Choose a template

```bash
groundhog new my-counter
cd my-counter
```

The default `counter` template includes contract methods, an event, an error, and tests. To start with less example logic, use the `stub` template instead:

```bash
groundhog new my-contract --template stub
```

Both templates include the files needed for native tests, RV32 builds, and integration tests. Keep the generated `Cargo.toml`, `rust-toolchain.toml`, and `.cargo/` configuration together. You do not need to select SDK or compiler versions yourself.

## Find the code

- `src/implementation.rs`: contract logic and storage.
- `tests/test.rs`: native logic tests.
- `tests/test_rv32.rs`: artifact tests.
- `tests/integration.rs`: RPC integration test entry point.
- `groundhog.toml`: project profiles and deployment aliases.

See [Project structure](/contracts/project-structure/) for the complete layout and generated artifacts.

## Select a network

The scaffold selects the local profile by default. Inspect the inherited Devnet settings before deploying:

```bash
groundhog config get devnet --sources
```

Use `--profile devnet` on deployments and calls to select that network. Builds and native/artifact tests run on your machine regardless of the profile. See [Profiles and networks](/cli/configuration/).

## Work in a Cargo workspace

Keep shared `groundhog.toml`, `.cargo/`, and `rust-toolchain.toml` files at the workspace root. Select a package when building from that root:

```bash
groundhog build -p my-counter
groundhog test -p my-counter
```
