---
title: Contributing
description: Where Groundhog development happens and how to file issues.
---

Groundhog is developed in the open at
[github.com/groundhogchain](https://github.com/groundhogchain). Each repository
carries its own build, test, and style conventions in its `README.md` and
`AGENTS.md` or `CLAUDE.md`; read those before opening a pull request.

## Where to go

| Area | Repository |
| --- | --- |
| `groundhog` CLI, JSON-RPC gateway, signing, simulator | `groundhog-rpc` |
| Rust contract SDK and standard interfaces | `sdk_rs` |
| Example contracts and applications | `groundhog-examples` |
| Node and protocol implementation | `hogd` |
| This documentation site | `developers-site` |

## Filing issues

File an issue on the repository that owns the behavior. Include the versions
involved (`groundhog --version`, `groundhog status --json`, the SDK version in
`Cargo.toml`) and a minimal reproduction. For anything security-related, follow
the [security policy](/community/security/) instead of opening a public issue.

## Documentation

Corrections to this site are pull requests against `developers-site`. Every
page states the release it was checked against; when you fix a claim, check it
against the source repository for that release and keep the version note
accurate.
