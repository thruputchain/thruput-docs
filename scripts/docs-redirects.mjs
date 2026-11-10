import { writeFile } from 'node:fs/promises';
import { legacyDocsRoutes } from './legacy-docs-routes.mjs';

// HTML aliases also work on static preview servers and in offline snapshots.
// Production serves HTTP redirects before Caddy's file server or host redirects.
export function caddyDocsRedirects() {
  return Object.entries(legacyDocsRoutes).map(([from, to], index) => `
@legacyDoc${index} path /${from} /${from}/ /docs/${from} /docs/${from}/
redir @legacyDoc${index} https://www.thruput.network/docs/${to}/{http.request.uri.prefixed_query} 301
redir /markdown/pages/${from}.md https://www.thruput.network/markdown/pages/${to}.md{http.request.uri.prefixed_query} 301
`).join('');
}

export default function docsRedirects() {
  return {
    name: 'docs-redirects',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (!process.env.THRUPUT_DOCS_SNAPSHOT) {
          await writeFile(new URL('docs-redirects.caddy', dir), caddyDocsRedirects());
        }
      },
    },
  };
}
