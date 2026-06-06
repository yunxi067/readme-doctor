import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(rootDir, 'src', 'cli.js');

test('CLI audits a local README file and can print markdown', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'readme-doctor-'));
  const readmePath = path.join(tempDir, 'README.md');

  await fs.writeFile(readmePath, `
# Local Tool

## Installation
npm install local-tool

## Usage
\`\`\`bash
local-tool README.md
\`\`\`

![demo](./demo.svg)

## Contributing
Open an issue.

## FAQ
Q: Local?
A: Yes.

## License
MIT
`);

  const result = await execFileAsync(process.execPath, [cliPath, readmePath, '--format', 'markdown']);

  assert.match(result.stdout, /^# README Doctor Report/m);
  assert.match(result.stdout, new RegExp(`\\*\\*Target:\\*\\* \`${escapeRegExp(readmePath)}`));
  assert.match(result.stdout, /\*\*Score:\*\* 100\/100 - Excellent/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
