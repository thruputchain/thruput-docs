import { docsPath, logicalDocsPath, docsPrefix } from '../scripts/docs-routing.mjs';
interface NavigationGroup {
  label: string;
  directory: string;
  items: string[];
  collapsed?: boolean;
}

interface NavigationLink {
  label: string;
  link: string;
}

interface DocumentationSection {
  id: string;
  label: string;
  href: string;
  items: (string | NavigationGroup | NavigationLink)[];
}

// URLs follow their sidebar section and group. Each page has one sidebar owner.
export const sections: DocumentationSection[] = [
  {
    id: 'get-started', label: 'Get Started', href: '/get-started/',
    items: [
      'get-started',
      'get-started/cli', 'get-started/contract', 'get-started/typescript', 'get-started/react',
      'get-started/build-with-an-agent',
    ],
  },
  {
    id: 'architecture', label: 'Understand Project Thruput', href: '/architecture/',
    items: [
      'architecture',
      'architecture/system-overview',
      'architecture/execution-model', 'architecture/transaction-lifecycle',
      'architecture/storage-economics',
      'architecture/consensus', 'architecture/networking',
      { label: 'Coming from...', directory: 'coming-from', collapsed: true, items: [
        'architecture/coming-from/blockchain',
        'architecture/coming-from/evm', 'architecture/coming-from/solana', 'architecture/coming-from/stellar',
        'architecture/coming-from/backend', 'architecture/coming-from/distributed-systems',
      ] },
      'architecture/roadmap',
    ],
  },
  {
    id: 'cli', label: 'CLI', href: '/cli/',
    items: [
      'cli',
      'cli/install',
      'cli/configuration', 'cli/wallets',
      'cli/create-project', 'cli/build-and-test', 'cli/local-node', 'cli/deploy-and-call',
      'cli/transactions', 'cli/codegen', 'cli/agent-tools', 'cli/automation', 'cli/troubleshooting', 'cli/reference',
    ],
  },
  {
    id: 'contracts', label: 'Smart Contracts', href: '/contracts/',
    items: [
      'contracts',
      'contracts/project-structure', 'contracts/methods',
      'contracts/execution', 'contracts/storage-types', 'contracts/nnint',
      'contracts/authorization', 'contracts/errors', 'contracts/events',
      'contracts/cross-contract-calls', 'contracts/invocation-frames',
      'contracts/testing', 'contracts/debugging',
      'contracts/client-bindings', 'contracts/artifacts-and-addresses',
      { label: 'Reference', directory: 'reference', collapsed: true, items: [
        'contracts/reference/rust-api-docs', 'contracts/reference/storage-types', 'contracts/reference/sdk-macros', 'contracts/reference/syscalls',
      ] },
    ],
  },
  {
    id: 'typescript', label: 'TypeScript', href: '/typescript/',
    items: [
      'typescript',
      'typescript/setup',
      'typescript/connect', 'typescript/transport', 'typescript/values',
      'typescript/bindings', 'typescript/reads', 'typescript/events',
      'typescript/wallet-clients', 'typescript/wallet-integration', 'typescript/accounts', 'typescript/transactions',
      'typescript/transaction-status', 'typescript/deployment',
      { label: 'Reference', directory: 'reference', collapsed: true, items: [
        'typescript/reference/sdk', 'typescript/reference/wallet-provider',
      ] },
    ],
  },
  {
    id: 'react', label: 'React', href: '/react/',
    items: [
      'react', 'react/setup', 'react/providers',
      'react/reads', 'react/balances', 'react/queries', 'react/events',
      'react/wallets', 'react/transactions', 'react/transaction-status', 'react/reference',
    ],
  },
  {
    id: 'tutorials', label: 'Tutorials', href: '/tutorials/',
    items: [
      'tutorials',
      'tutorials/build-a-counter', 'tutorials/work-with-thruput-from-typescript',
      'tutorials/build-a-counter-with-react', 'tutorials/connect-a-wallet-to-your-app',
    ],
  },
  {
    id: 'guides', label: 'Guides', href: '/guides/',
    items: [
      'guides',
      'guides/build-a-token', 'guides/build-an-amm', 'guides/consume-the-firehose',
    ],
  },
  {
    id: 'tools', label: 'Tools', href: '/tools/faucet/',
    items: ['tools/faucet', 'tools/block-explorer', 'tools/wallet-extension'],
  },
  {
    id: 'reference', label: 'Reference', href: '/reference/json-rpc-api/',
    items: [
      'reference/json-rpc-api', 'reference/contract-spec', 'reference/xdr-protocol', 'reference/firehose',
      { label: 'TypeScript Client API', link: 'https://client-ts.thruput.network/' },
      { label: 'TypeScript Protocol API', link: 'https://protocol-ts.thruput.network/' },
    ],
  },
];

const routeItem = (item: string | NavigationGroup | NavigationLink): string | Omit<NavigationGroup, 'directory'> | NavigationLink =>
  typeof item === 'string' ? `${docsPrefix.slice(1)}${docsPrefix ? '/' : ''}${item}` :
  'items' in item ? { label: item.label, collapsed: item.collapsed, items: item.items.map(value => routeItem(value) as string) } :
  { ...item, link: docsPath(item.link) };
export const sidebar = sections.map(({ label, items }) => ({ label, items: items.map(routeItem), collapsed: true }));

export function sectionForPath(pathname: string): DocumentationSection | undefined {
  const slug = logicalDocsPath(pathname).replace(/^\/+|\/+$/g, '');
  // Exact ownership also handles sections without an index page.
  return sections.find(section => section.items.some(item =>
    typeof item === 'string' ? item === slug : 'items' in item && item.items.includes(slug)
  )) ?? sections.find(section => slug === section.id || slug.startsWith(`${section.id}/`));
}
