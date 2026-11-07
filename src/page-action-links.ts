export function pageActionLinks(title: string, markdownUrl: URL) {
  const prompt = `Read the Project Thruput documentation page “${title}”:
${markdownUrl.href}

Use it as context for my questions. If you cannot access the page, ask me to paste its Markdown. Keep Project Thruput APIs distinct from Stellar Soroban APIs.`;
  const chatgpt = new URL('https://chatgpt.com/');
  chatgpt.searchParams.set('q', prompt);
  const claude = new URL('https://claude.ai/new');
  claude.searchParams.set('q', prompt);
  return { chatgpt: chatgpt.href, claude: claude.href };
}
