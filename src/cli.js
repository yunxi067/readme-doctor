#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { auditReadme, formatMarkdownReport, formatTextReport } from './audit.js';
import { fetchRepositoryReadme } from './github.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const options = parseArgs(args);

if (!options.input) {
  printHelp();
  process.exit(1);
}

try {
  const repository = await loadReadme(options.input);
  const audit = auditReadme(repository.readme, repository.metadata);
  const payload = {
    repository: repository.repo,
    ...audit
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (options.format === 'markdown') {
    console.log(formatMarkdownReport(repository.repo, audit));
  } else {
    console.log(formatTextReport(repository.repo, audit));
  }
} catch (error) {
  console.error(`readme-doctor: ${error.message}`);
  process.exit(1);
}

function parseArgs(values) {
  const options = { json: false, format: 'text', input: '' };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--json') {
      options.json = true;
      continue;
    }
    if (value === '--format') {
      options.format = values[index + 1] === 'markdown' ? 'markdown' : 'text';
      index += 1;
      continue;
    }
    if (value.startsWith('--format=')) {
      options.format = value.slice('--format='.length) === 'markdown' ? 'markdown' : 'text';
      continue;
    }
    if (!value.startsWith('-') && !options.input) options.input = value;
  }

  return options;
}

async function loadReadme(input) {
  const local = await readLocalReadme(input);
  if (local) return local;
  return fetchRepositoryReadme(input, { token: process.env.GITHUB_TOKEN });
}

async function readLocalReadme(input) {
  try {
    const stat = await fs.stat(input);
    if (!stat.isFile()) return null;
    const readme = await fs.readFile(input, 'utf8');
    const licensePresent = await hasSiblingLicense(input);
    return {
      repo: input,
      readme,
      metadata: {
        repo: { hasIssues: false },
        license: {
          present: licensePresent,
          source: licensePresent ? 'local' : undefined
        }
      }
    };
  } catch {
    return null;
  }
}

async function hasSiblingLicense(input) {
  const directory = path.dirname(input);
  for (const name of ['LICENSE', 'LICENSE.md', 'COPYING']) {
    try {
      const stat = await fs.stat(path.join(directory, name));
      if (stat.isFile()) return true;
    } catch {
      // Try the next common license filename.
    }
  }
  return false;
}

function printHelp() {
  console.log(`Usage:
  readme-doctor <owner/repo>
  readme-doctor https://github.com/<owner>/<repo>
  readme-doctor ./README.md

Options:
  --json             Print machine-readable JSON
  --format markdown  Print a Markdown report
  --help             Show this help

Environment:
  GITHUB_TOKEN can be set to increase GitHub API rate limits.`);
}
