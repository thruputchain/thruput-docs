---
title: Faucet
description: Create a Devnet wallet and request HOG through the hosted faucet.
---

The hosted faucet supports two CLI workflows:

- `groundhog wallet create` prefunds a future address, deploys its wallet contract, and initializes it for your signing key.
- `groundhog airdrop` funds an existing wallet or address.

Run the first-use setup if you have not already:

```bash
groundhog init
```

`groundhog init` creates the global `devnet` profile with its RPC and faucet settings. Confirm the profile:

```bash
groundhog config get devnet --sources
```

See [Groundhog CLI configuration](/tools/groundhog-cli/#configuration) for global profiles, project overlays, and mutation scope.

Check that the faucet advertises the same RPC before using it:

```bash
DEVNET_RPC_URL=$(groundhog --json config get devnet | jq -er '.data.rpcUrl')
DEVNET_FAUCET_URL=$(groundhog --json config get devnet | jq -er '.data.faucetUrl')

curl -fsS "$DEVNET_FAUCET_URL/health" | jq .
curl -fsS "$DEVNET_FAUCET_URL/v1/network" | jq .
curl -fsS "$DEVNET_FAUCET_URL/v1/network" \
  | jq -e --arg rpc "$DEVNET_RPC_URL" '.endpoints.rpcUrl == $rpc'
```

## Create a Wallet

Create a contract wallet for the signing key selected during init:

```bash
groundhog wallet create --profile devnet
groundhog wallet ls --profile devnet
groundhog balance default --profile devnet
```

On a fresh setup, init creates the selected key as `default`, and the wallet inherits that name. Wallet creation prefunds the address before deploying and initializing the wallet, so an immediate airdrop is not required.

## Fund the Wallet

Request more HOG when needed, then check the balance:

```bash
groundhog airdrop default --profile devnet
groundhog balance default --profile devnet
```

Hosted requests are subject to deployment-specific quotas. Remote airdrops use the amount selected by the faucet, so omit `--amount`.

Wallet creation and airdrops keep idempotency records in the Groundhog cache. If either command reports a pending attempt, rerun the exact same command and keep the corresponding cache record until it completes.

For the complete setup, wallet, deployment, and contract interaction workflow, follow [Develop on Devnet with the CLI](/tutorials/develop-on-devnet/).
