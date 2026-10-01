interface NavigationGroup {
  label: string;
  items: string[];
  collapsed?: boolean;
}

interface DocumentationSection {
  id: string;
  label: string;
  href: string;
  items: (string | NavigationGroup)[];
}

// Keep current content routes here until each page is migrated. A page has one
// sidebar owner; cross-section links belong in the page content.
export const sections: DocumentationSection[] = [
  {
    id: 'get-started', label: 'Get Started', href: '/get-started/',
    items: [
      'get-started',
      'start/getting-started', 'start/build-with-an-agent', 'tools/faucet', 'tools/block-explorer',
    ],
  },
  {
    id: 'architecture', label: 'Understand Groundhog', href: '/architecture/',
    items: [
      'architecture',
      'how-it-works/execution-model', 'how-it-works/transaction-lifecycle',
      'how-it-works/storage-economics', 'how-it-works/architecture',
      'how-it-works/consensus', 'how-it-works/networking',
      { label: 'Coming from another platform', collapsed: true, items: [
        'start/for-blockchain-developers',
        'ecosystem/evm', 'ecosystem/solana', 'ecosystem/stellar',
        'start/for-backend-developers', 'start/for-distributed-systems-developers',
      ] },
    ],
  },
  {
    id: 'cli', label: 'CLI', href: '/cli/',
    items: [
      'cli',
      'tools/groundhog-cli', 'tutorials/develop-locally', 'tutorials/develop-on-devnet',
    ],
  },
  {
    id: 'contracts', label: 'Smart Contracts', href: '/contracts/',
    items: [
      'contracts',
      'programming-model/storage-types', 'reference/error-handling',
      'how-it-works/authorization', 'tutorials/add-events-to-a-contract',
      'reference/cross-contract-calls', 'programming-model/testing',
      'programming-model/execution', 'programming-model/nnint',
      'programming-model/advanced', 'how-it-works/contracts', 'how-it-works/invocation-frames',
      { label: 'Reference', collapsed: true, items: [
        'tools/rust-api-docs', 'reference/storage-types', 'reference/sdk-macros', 'reference/syscalls',
      ] },
    ],
  },
  {
    id: 'typescript', label: 'TypeScript', href: '/typescript/',
    items: [
      'typescript',
      'tools/typescript-sdk', 'tools/typescript-bindings',
      'tools/wallet-integration', 'tools/wallet-provider',
    ],
  },
  {
    id: 'react', label: 'React', href: '/react/',
    items: ['react'],
  },
  {
    id: 'guides', label: 'Guides', href: '/guides/',
    items: [
      'guides',
      'tutorials/build-a-counter', 'tutorials/work-with-groundhog-from-typescript',
      'tutorials/connect-a-wallet-to-your-app', 'tutorials/build-a-token', 'tutorials/design-a-swap',
    ],
  },
  {
    id: 'reference', label: 'Protocol Reference', href: '/reference/json-rpc-api/',
    items: ['reference/json-rpc-api', 'reference/contract-spec', 'reference/xdr-protocol'],
  },
  {
    id: 'community', label: 'Project', href: '/community/contributing/',
    items: ['community/contributing', 'community/security', 'community/roadmap'],
  },
];

export const sidebar = sections.map(({ label, items }) => ({ label, items, collapsed: true }));

export function sectionForPath(pathname: string): DocumentationSection | undefined {
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  // Exact ownership takes precedence over the root while legacy routes remain.
  return sections.find(section => section.items.some(item =>
    typeof item === 'string' ? item === slug : item.items.includes(slug)
  )) ?? sections.find(section => slug === section.id || slug.startsWith(`${section.id}/`));
}
