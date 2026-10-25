// Find `thruput ...` commands in docs Markdown and check them against the recorded
// CLI surface (scripts/cli-surface.json). Catches renamed or removed subcommands and flags.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const shellFences = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'shellsession']);
const operators = new Set(['&&', '||', ';', '|', '$(', '`', '(', ')']);

/** Split a shell line into words, keeping quotes and `<...>` placeholders whole and dropping optional `[...]` brackets. */
export function tokenize(line) {
  const tokens = [];
  let word = '';
  const flush = () => {
    word = word.replace(/^\[+/, '').replace(/\]+(\.\.\.)?$/, '');
    if (word) tokens.push(word);
    word = '';
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' || c === "'") {
      const end = line.indexOf(c, i + 1);
      word += line.slice(i, end < 0 ? line.length : end + 1);
      i = end < 0 ? line.length : end;
    } else if (c === '<' && /[A-Za-z]/.test(line[i + 1] ?? '')) {
      const end = line.indexOf('>', i);
      word += line.slice(i, end < 0 ? line.length : end + 1);
      i = end < 0 ? line.length : end;
    } else if (c === '#' && !word) {
      break;
    } else if (/\s/.test(c)) {
      flush();
    } else if (line.startsWith('$(', i)) {
      flush(); tokens.push('$('); i++;
    } else if (line.startsWith('&&', i) || line.startsWith('||', i)) {
      flush(); tokens.push(line.slice(i, i + 2)); i++;
    } else if (';|()`'.includes(c)) {
      flush(); tokens.push(c);
    } else {
      word += c;
    }
  }
  flush();
  return tokens;
}

/** Find each `thruput` invocation in a line and return its arguments. */
export function invocations(line) {
  const found = [];
  let segment = [];
  for (const token of [...tokenize(line), ';']) {
    if (token.startsWith('"') && token.includes('$(')) found.push(...invocations(token.slice(1, -1)));
    if (!operators.has(token)) { segment.push(token); continue; }
    let start = 0;
    if (segment[0] === '$') start++;
    while (/^[A-Z_][A-Z0-9_]*=/.test(segment[start] ?? '')) start++;
    if (segment[start] === 'thruput') found.push(segment.slice(start + 1));
    segment = [];
  }
  return found;
}

const placeholder = word => /^(<.*>|\$|[A-Z][A-Z0-9_]*$|\.\.\.)/.test(word);

/** Return problems with one invocation, or an empty list when the CLI accepts its shape. */
export function checkInvocation(args, commands) {
  const globals = new Set(commands[''].flags);
  const problems = [];
  let path = '';
  let positional = false;
  let previousFlag = false;
  for (const arg of args) {
    if (arg === '--') break;
    const node = commands[path];
    if (/^--?[A-Za-z]/.test(arg)) {
      const flag = arg.split('=')[0];
      const known = f => node.flags.includes(f) || globals.has(f);
      const bundled = /^-[A-Za-z]{2,}$/.test(flag) && [...flag.slice(1)].every(c => known(`-${c}`));
      if (!known(flag) && !bundled) problems.push(`unknown flag ${flag} for \`thruput${path ? ` ${path}` : ''}\``);
      previousFlag = !arg.includes('=');
      continue;
    }
    const subcommands = Object.entries(node.subcommands);
    if (!positional && !previousFlag && subcommands.length) {
      const match = subcommands.find(([name, aliases]) => name === arg || aliases.includes(arg));
      if (match) path = path ? `${path} ${match[0]}` : match[0];
      else {
        if (!placeholder(arg)) problems.push(`unknown subcommand ${arg} for \`thruput${path ? ` ${path}` : ''}\``);
        positional = true;
      }
    } else if (!previousFlag) {
      positional = true;
    }
    previousFlag = false;
  }
  return problems;
}

/** Yield `{ line, args }` for each `thruput` command in a Markdown page. */
export function* docCommands(markdown) {
  const lines = markdown.split('\n');
  let fence = null;
  let pending = '';
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const marker = text.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)/);
    if (marker && (!fence || marker[1].startsWith(fence.marker))) {
      fence = fence ? null : { marker: marker[1], shell: shellFences.has(marker[2].toLowerCase()) };
      continue;
    }
    if (fence) {
      if (!fence.shell) continue;
      pending += text.replace(/\\$/, ' ');
      if (text.endsWith('\\')) continue;
      for (const args of invocations(pending)) yield { line: i + 1, args };
      pending = '';
    } else {
      for (const [, code] of text.matchAll(/(?<!`)`([^`]+)`(?!`)/g)) {
        if (/^thruput(\s|$)/.test(code)) yield { line: i + 1, args: tokenize(code).slice(1) };
      }
    }
  }
}

export function* pages(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* pages(path);
    else if (/\.mdx?$/.test(entry.name)) yield path;
  }
}
