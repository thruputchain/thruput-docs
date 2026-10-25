import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkInvocation, docCommands, pages } from './cli-commands.mjs';
import { parseHelp, surfacePath } from './cli-surface.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('help parsing captures subcommands, aliases, and flags', () => {
  const help = [
    'Manage keys', '', 'Usage: thruput keys <COMMAND>', '', 'Commands:',
    '  generate  Generate a key', '  ls        List stored keys [alias: list]', '  help      Print help', '',
    'Options:', '  -y, --yes      Confirm [aliases: --force, -f]', '      --json     JSON output', '  -h, --help     Print help',
  ].join('\n');
  assert.deepEqual(parseHelp(help), {
    subcommands: { generate: [], ls: ['list'] },
    flags: ['--force', '--help', '--json', '--yes', '-f', '-h', '-y'],
  });
});

test('command extraction handles prompts, env prefixes, continuations, and pipes', () => {
  const page = [
    '```bash', '$ thruput keys ls', 'FOO=1 thruput deploy \\', '  --fund 10 | jq .', 'echo "$(thruput --version)"', '```',
    'Run `thruput tx show <HASH> [--json]` or `cargo build`.',
  ].join('\n');
  assert.deepEqual([...docCommands(page)].map(c => c.args), [
    ['keys', 'ls'], ['deploy', '--fund', '10'], ['--version'], ['tx', 'show', '<HASH>', '--json'],
  ]);
});

test('invocation check reports unknown subcommands and flags', () => {
  const commands = {
    '': { subcommands: { keys: [] }, flags: ['--json'] },
    keys: { subcommands: { ls: ['list'] }, flags: [] },
    'keys ls': { subcommands: {}, flags: ['-a', '-b'] },
  };
  assert.deepEqual(checkInvocation(['keys', 'list', '--json', '-ab'], commands), []);
  assert.deepEqual(checkInvocation(['keys', '<COMMAND>'], commands), []);
  assert.deepEqual(checkInvocation(['keys', 'show', 'alice', '--all'], commands), [
    'unknown subcommand show for `thruput keys`', 'unknown flag --all for `thruput keys`',
  ]);
});

test('docs use only commands and flags the target CLI accepts', () => {
  const { cli, commands } = JSON.parse(readFileSync(surfacePath, 'utf8'));
  const problems = [];
  for (const page of pages(join(root, 'src/content/docs'))) {
    for (const { line, args } of docCommands(readFileSync(page, 'utf8'))) {
      for (const problem of checkInvocation(args, commands)) problems.push(`${relative(root, page)}:${line}: ${problem}`);
    }
  }
  assert.deepEqual(problems, [], `Docs disagree with ${cli}. Fix the docs, or regenerate scripts/cli-surface.json for a newer CLI.`);
});
