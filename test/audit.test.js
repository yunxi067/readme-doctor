import test from 'node:test';
import assert from 'node:assert/strict';

import { auditReadme, parseGitHubRepo } from '../src/audit.js';

test('parseGitHubRepo accepts common GitHub repository inputs', () => {
  assert.deepEqual(parseGitHubRepo('https://github.com/octocat/Hello-World'), {
    owner: 'octocat',
    repo: 'Hello-World'
  });
  assert.deepEqual(parseGitHubRepo('git@github.com:octocat/Hello-World.git'), {
    owner: 'octocat',
    repo: 'Hello-World'
  });
  assert.deepEqual(parseGitHubRepo('octocat/Hello-World'), {
    owner: 'octocat',
    repo: 'Hello-World'
  });
});

test('auditReadme reports complete README essentials with a perfect score', () => {
  const readme = `
# Useful Thing

## Installation
npm install useful-thing

## Usage
\`\`\`bash
useful-thing ./project
\`\`\`

![Screenshot](./screenshot.png)

## FAQ
Q: Does it work on Windows?
A: Yes.

## Contributing
Open an issue or pull request.

## License
MIT
`;

  const result = auditReadme(readme, {
    license: { present: true, source: 'api' },
    repo: { hasIssues: true }
  });

  assert.equal(result.score, 100);
  assert.equal(result.items.every((item) => item.passed), true);
});

test('auditReadme identifies missing installation, screenshot, contribution, FAQ, and license', () => {
  const result = auditReadme('# Tiny Tool\n\nThis tool trims text.', {
    license: { present: false },
    repo: { hasIssues: false }
  });

  const failedIds = result.items.filter((item) => !item.passed).map((item) => item.id);

  assert.deepEqual(failedIds, [
    'installation',
    'usage',
    'screenshot',
    'license',
    'contributing',
    'faq'
  ]);
  assert.equal(result.score, 14);
  assert.equal(result.summary, 'Needs work');
});

test('auditReadme gives partial credit for a usage command even without a usage heading', () => {
  const result = auditReadme('# Tool\n\nRun `node cli.js owner/repo` to check a repo.', {
    license: { present: false }
  });

  const usage = result.items.find((item) => item.id === 'usage');

  assert.equal(usage.passed, true);
  assert.equal(usage.evidence.includes('inline command'), true);
});
