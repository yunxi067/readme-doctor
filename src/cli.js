#!/usr/bin/env node

import { auditReadme, formatTextReport } from './audit.js';
import { fetchRepositoryReadme } from './github.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const json = args.includes('--json');
const repoInput = args.find((arg) => !arg.startsWith('-'));

if (!repoInput) {
  printHelp();
  process.exit(1);
}

try {
  const repository = await fetchRepositoryReadme(repoInput, { token: process.env.GITHUB_TOKEN });
  const audit = auditReadme(repository.readme, repository.metadata);
  const payload = {
    repository: repository.repo,
    ...audit
  };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(formatTextReport(repository.repo, audit));
  }
} catch (error) {
  console.error(`readme-doctor: ${error.message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage:
  readme-doctor <owner/repo>
  readme-doctor https://github.com/<owner>/<repo>

Options:
  --json    Print machine-readable JSON
  --help    Show this help

Environment:
  GITHUB_TOKEN can be set to increase GitHub API rate limits.`);
}
