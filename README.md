# Groundhog Developer Docs

Developer documentation for the [Groundhog](https://groundhog.dev) L1 blockchain. Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build).

## Development

```bash
pnpm install       # Install dependencies
pnpm dev           # Dev server at localhost:4321
pnpm build         # Production build to dist/
pnpm preview       # Preview production build locally
```

## Content

Markdown files live in `src/content/docs/`, organized by section. The sidebar is manually configured in `astro.config.mjs`.

| Section | Path | Description |
|---------|------|-------------|
| Concepts | `start/` | Background guides by developer archetype |
| Tutorials | `start/`, `tutorials/` | Getting Started + step-by-step contract builds |
| Tools | `tools/` | TypeScript SDK, block explorer, wallet, faucet |
| How It Works | `how-it-works/` | Architecture, execution model, contracts |
| Reference | `reference/` | Storage types, syscalls, SDK macros, error handling |
| Migration Guides | `migration/` | Stellar, EVM, Solana migration paths |
| Community | `community/` | Contributing, security, roadmap |

## Deployment

The site is deployed to Railway. CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`, `pnpm astro check`, and `pnpm build` on every push and PR to `main`; the deployment serves the `dist/` output that build produces.

The repo carries two static-serving configs and does not record which one Railway uses. That choice lives in the Railway service settings, not here.

- `Caddyfile` serves `/app/dist` on `$PORT` with `try_files` for extensionless URLs, gzip/zstd compression, security headers, a custom 404 page, and an unauthenticated `/health` endpoint. Everything else sits behind `basic_auth`, configured through the `BASIC_AUTH_USER` and `BASIC_AUTH_HASH` environment variables.
- `Staticfile` contains a single `index_fallback: false` line, the config format read by static-site buildpacks.

If the Caddyfile is the live config, the `basic_auth` block is the gate that has to come down before the docs are public.

## Adding a Page

1. Create a `.md` file in the appropriate `src/content/docs/<section>/` directory
2. Add frontmatter with `title` and `description`
3. Add the slug to the sidebar array in `astro.config.mjs`
4. Run `pnpm build` to verify
