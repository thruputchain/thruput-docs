---
title: Security
description: How to report a security issue in Groundhog privately.
---

Report vulnerabilities privately. Do not open a public issue, pull request, or
discussion for a security problem.

## Reporting

Use GitHub's private vulnerability reporting on the affected repository under
[github.com/groundhogchain](https://github.com/groundhogchain). Include the
component and version (`groundhog --version`, the SDK crate version, or the
`groundhog_version` response for a hosted endpoint), steps to reproduce, and
the impact you observed.

Reports that involve the hosted Devnet, its faucet, or the explorer count as
security reports too. Devnet holds test funds only; do not use it to hold
anything of value.

## Scope

- The `groundhog` CLI, `hog-devnode`, and the JSON-RPC gateway
- The Rust SDK and the standard interface crates
- The TypeScript client and wallet provider contract
- The hosted Devnet endpoints, faucet, and explorer

Bugs in example contracts and example applications are welcome as ordinary
issues on their repositories unless they expose a problem in the components
above.
