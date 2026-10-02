---
title: Use the CLI in scripts
description: Use non-interactive commands and structured output without treating output flags as confirmation.
---

Use `--non-interactive` to disable questions and terminal UI. It does not authorize state changes. Commands that need confirmation still require their own `--force` flag.

## Set up explicitly

```bash
groundhog init --non-interactive --generate-key
```

`--generate-key` authorizes initial key creation when there are no stored keys or explicit selections. It does not replace an existing key. Use `groundhog new` separately to create a project in a script.

## Request structured output

```bash
groundhog config get devnet --json
groundhog test --json
```

The envelope identifies the command, its `ok` result, warnings, and command data. Payloads carry a command-specific `schemaVersion`; check it before relying on exact fields.

Check the process exit status as well as the envelope. A reported test failure can carry `ok: false` on stdout. Other command failures can emit an error envelope on stderr. Keep the streams separate instead of assuming every failed command produces a successful-data shape on stdout.

With `test --watch --json`, each completed run is a separate JSON record. A long-running `node` or watch command still runs until stopped.

## Confirm intended writes

For a deployment you intend to submit:

```bash
groundhog deploy --profile devnet --fund 10 --non-interactive --force --json
```

For preparation without submission, use `--dry-run` instead. Neither `--quiet` nor `--json` substitutes for confirmation.
