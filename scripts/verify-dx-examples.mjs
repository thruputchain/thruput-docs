// Verify executable tutorial blocks with the selected CLI and published packages.
// Usage: node scripts/verify-dx-examples.mjs /path/to/groundhog /tmp/opencode
// Uses the caller's npm/Cargo authentication; never writes credentials into fixtures.
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const cli = resolve(process.argv[2]);
const workspace = mkdtempSync(join(resolve(process.argv[3]), 'dx-docs-'));
const docs = resolve('src/content/docs');
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed; workspace: ${workspace}`);
};
const blocks = (file, language) => [...readFileSync(join(docs, file), 'utf8')
  .matchAll(new RegExp('```' + language + '\\n([\\s\\S]*?)```', 'g'))].map(match => match[1]);
console.log(`Tutorial verification workspace: ${workspace}`);

run(cli, ['new', 'my-counter'], workspace);
const counter = join(workspace, 'my-counter');
run('cargo', ['test'], counter);
run(cli, ['build', '--bindings', 'ts'], counter);

run(cli, ['new', 'counter'], workspace);
const events = join(workspace, 'counter');
const eventBlocks = blocks('tutorials/add-events-to-a-contract.md', 'rust');
const implementation = join(events, 'src/implementation.rs');
const original = readFileSync(implementation, 'utf8');
const increment = eventBlocks[1].match(/    pub fn increment[\s\S]*?\n    }/)[0];
assert.match(original, /    pub fn increment[\s\S]*?\n    }/);
writeFileSync(implementation, original.replace('emits(PingEvent)', 'emits(PingEvent, CounterIncremented)')
  .replace(/    pub fn increment[\s\S]*?\n    }/, increment) + '\n' + eventBlocks[0]);
const lib = join(events, 'src/lib.rs');
writeFileSync(lib, readFileSync(lib, 'utf8') + '\npub use implementation::CounterIncremented;\n');
writeFileSync(join(events, 'tests/test.rs'), eventBlocks.find(block => block.includes('fn test_increment_emits_event')));
run('cargo', ['test'], events);
run(cli, ['build', '--bindings', 'ts'], events);

run(cli, ['new', 'erc20', '--template', 'stub'], workspace);
const token = join(workspace, 'erc20');
const tokenBlocks = blocks('tutorials/build-a-token.md', 'rust');
const manifest = join(token, 'Cargo.toml');
let cargo = readFileSync(manifest, 'utf8');
assert.match(cargo, /dev = \["sdk\/dev"\]/);
cargo = cargo.replace('dev = ["sdk/dev"]', 'dev = ["sdk/dev", "groundhog-erc20-if/dev"]');
cargo += '\n[dependencies.groundhog-erc20-if]\nversion = "=0.1.41"\nregistry = "groundhog"\n';
writeFileSync(manifest, cargo);
writeFileSync(join(token, 'src/lib.rs'), tokenBlocks[0]);
writeFileSync(join(token, 'src/implementation.rs'), tokenBlocks.slice(1, 4).join('\n'));
writeFileSync(join(token, 'tests/test.rs'), tokenBlocks[4]);
run('cargo', ['test', '--test', 'test'], token);
run(cli, ['build'], token);

const consumer = join(workspace, 'consumer');
mkdirSync(join(consumer, 'contracts'), { recursive: true });
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
  '@groundhogchain/client': '0.12.0', '@groundhogchain/protocol': '0.12.0',
  '@groundhogchain/contract-spec': '0.12.0', typescript: '6.0.3', '@types/node': '25.9.1',
} }));
writeFileSync(join(consumer, '.npmrc'), '@groundhogchain:registry=https://npm.pkg.github.com\n');
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
  noUncheckedIndexedAccess: true, noEmit: true, skipLibCheck: false, types: ['node'],
}, include: ['*.ts', 'contracts/*.ts'] }));
writeFileSync(join(consumer, 'contracts/my-counter.ts'), readFileSync(join(counter, 'target/groundhog/my_counter.ts')));
const appBlocks = blocks('tutorials/work-with-groundhog-from-typescript.md', 'ts');
writeFileSync(join(consumer, 'view.ts'), appBlocks.find(block => block.includes('const rpcUrl =')));
writeFileSync(join(consumer, 'write.ts'), appBlocks.find(block => block.includes('const account = createPubkeyAccount')));
writeFileSync(join(consumer, 'history.ts'), blocks('tutorials/add-events-to-a-contract.md', 'ts')
  .find(block => block.includes('interface EventProgress')));
run('npm', ['install', '--ignore-scripts'], consumer);
run('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json'], consumer);
console.log(`Native/RV32 tutorial builds and strict published-package snippets passed: ${workspace}`);
