---
title: Build with an Agent
description: Give your coding agent the Groundhog skill and docs, then build a counter application on Devnet with one prompt.
---

Give your agent the Groundhog instructions and docs, then copy the prompt below. The goal is a working counter application: a Rust contract on Devnet, typed bindings, and a React interface.

## 1. Load the skill

Have your agent run:

```bash
groundhog --skill
```

This currently prints the instructions for the installed CLI. If you run it yourself, give the output to your agent. If the CLI is missing, start with [Install the CLI](/cli/install/).

## 2. Share the docs

```bash
groundhog docs
```

Keep the command running and give your agent the printed URL. This serves the bundled documentation, not a local blockchain. The app will use Devnet.

For an agent on another machine, share the relevant pages as files or provide access to the hosted docs; it cannot reach your localhost. Bundled docs are a snapshot, so use the installed CLI's skill and help output to confirm command behavior.

## 3. Copy the prompt

```text
Build a working Groundhog counter application for me on Devnet.

First read this project's AGENTS.md if present, run groundhog --skill,
and read the documentation at the URL or in the files I share. If you
cannot access the docs, ask me for a copy before guessing at an API.

Use the latest release installation instructions and preserve generated
dependency settings and lockfiles. Work in a new project unless I ask
you to extend an existing one. Preserve existing files, keys, and profiles.
Ask me to provide any missing Cargo or npm access through my environment.
Keep credentials and private keys out of this conversation and browser code.

Build and verify these stages:

1. Set up the CLI and a funded Devnet wallet. Use the hosted network;
   do not start a local blockchain node. A local documentation or app
   development server is fine.

2. Scaffold a Rust counter contract with the CLI. Build it and run its
   tests. Deploy it to Devnet with the funding described in the contract
   quickstart. Initialize the new counter to 10, increment by 5, and
   verify that its read-only view returns 15. Do not repeat initialization
   on a counter that has already been initialized for this walkthrough.

3. Generate TypeScript bindings from that contract's spec. Use the actual
   deployment address and generated methods rather than handwritten
   entrypoint IDs or a hardcoded example address.

4. Build a small React interface that displays the counter and has an
   Increment button. Use the Groundhog React library and typed bindings.
   Include loading, error, and pending-transaction states. Use a compatible
   browser wallet for signing; ask me to install or connect it and approve
   the test transaction when needed. Do not put a CLI signing key in the app.

5. Save the transaction evidence needed for recovery before broadcasting,
   wait for successful committed execution, and refresh the counter.
   Prevent duplicate submissions while a request is pending. If the outcome
   is uncertain, check the original transaction instead of signing another.

6. Run the app's build and test the browser flow. Verify that one successful
   increment changes the displayed counter by one. If wallet approval or
   a network service is unavailable, state which stage remains unverified.
   Do not replace a failed Devnet call with a mock and report success.

Use the CLI and contract quickstarts for setup and deployment, the
TypeScript binding docs for code generation, and the React and wallet
integration docs for the interface. Use groundhog <command> --help to
confirm command options. Adapt the read-only React quickstart to this
counter rather than treating it as a complete wallet application.

Finish with the project location, how to run the app, its contract address,
the transaction hashes you verified, and a short summary of what passed
and what still needs my action.
```

The prompt uses the [CLI](/get-started/cli/) and [contract](/get-started/contract/) quickstarts, [TypeScript bindings](/tools/typescript-bindings/), [React](/react/), and [wallet integration](/tools/wallet-integration/). Your agent can work through them while you provide access and approve wallet interactions.

For a smaller task, use the prompt in an individual [quickstart](/get-started/).
