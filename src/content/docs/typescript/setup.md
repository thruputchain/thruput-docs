---
title: Package setup
description: Configure access to Groundhog's JavaScript packages for TypeScript and React applications.
---

The TypeScript client and React library are distributed through GitHub Packages. Configure access once, then use the install command in your quickstart.

## Before you start

- Install the current Node.js LTS release and npm.
- Obtain access to Groundhog's GitHub packages.
- Install the [GitHub CLI](https://cli.github.com/) and sign in with `gh auth login`.

## Give npm package access

Authorize package reads, then make the token available to npm in this terminal:

```bash
gh auth refresh -h github.com -s read:packages
export NODE_AUTH_TOKEN="$(gh auth token)"
```

Create a `.npmrc` file in the application directory:

```ini
@groundhogchain:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Keep `${NODE_AUTH_TOKEN}` as a literal reference in this file. Do not replace it with the token. If your environment already supplies a package-read token, use that instead of the GitHub CLI commands.

Use the latest packages when starting a new project and keep the generated lockfile. A package-access error needs an account or token with the required permissions; repository access alone may not be enough.

## Continue

- [TypeScript quickstart](/get-started/typescript/)
- [React quickstart](/get-started/react/)
