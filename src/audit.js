const CHECKS = [
  {
    id: 'title',
    label: 'Project title',
    weight: 1,
    suggestion: 'Add a clear H1 title so visitors know what the project is.'
  },
  {
    id: 'installation',
    label: 'Installation',
    weight: 1,
    suggestion: 'Add an Installation section with copyable setup commands.'
  },
  {
    id: 'usage',
    label: 'Usage example',
    weight: 1,
    suggestion: 'Add a Usage section or a command example that shows the main workflow.'
  },
  {
    id: 'screenshot',
    label: 'Screenshot or demo',
    weight: 1,
    suggestion: 'Add a screenshot, GIF, or demo link to make the tool easier to trust.'
  },
  {
    id: 'license',
    label: 'License',
    weight: 1,
    suggestion: 'Add a LICENSE file or a License section in the README.'
  },
  {
    id: 'contributing',
    label: 'Contributing',
    weight: 1,
    suggestion: 'Add a Contributing section or explain how people can report issues.'
  },
  {
    id: 'faq',
    label: 'FAQ',
    weight: 1,
    suggestion: 'Add a short FAQ that answers expected beginner questions.'
  }
];

export function parseGitHubRepo(input) {
  const value = String(input ?? '').trim();
  const sshMatch = value.match(/^git@github\.com:([^/\s]+)\/(.+?)(?:\.git)?$/i);
  const pathMatch = value.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/i);
  const match = sshMatch ?? pathMatch;

  if (!match) {
    throw new Error('Expected a GitHub repository like owner/repo or https://github.com/owner/repo');
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

export function auditReadme(readme, context = {}) {
  const content = String(readme ?? '');
  const normalized = content.toLowerCase();
  const licensePresent = Boolean(context.license?.present) || hasLicenseSection(normalized);
  const hasIssues = context.repo?.hasIssues !== false;

  const items = [
    result('title', /^#\s+\S+/m.test(content), 'Found an H1 title.'),
    result('installation', hasHeading(normalized, ['install', 'installation', 'getting started', 'setup', '安装', '快速开始', '快速上手']), 'Found setup guidance.'),
    result('usage', hasUsage(normalized), usageEvidence(normalized)),
    result('screenshot', hasScreenshot(normalized), 'Found an image, GIF, video, or demo link.'),
    result('license', licensePresent, licensePresent ? licenseEvidence(context) : ''),
    result('contributing', hasContributing(normalized, hasIssues), 'Found contribution or issue guidance.'),
    result('faq', hasHeading(normalized, ['faq', 'frequently asked questions', '常见问题', '问题']), 'Found an FAQ section.')
  ];

  const passedWeight = items.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const totalWeight = CHECKS.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  return {
    score,
    summary: score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs polish' : 'Needs work',
    items
  };
}

export function formatTextReport(repoInput, audit) {
  const lines = [
    `README Doctor report for ${repoInput}`,
    `Score: ${audit.score}/100 - ${audit.summary}`,
    ''
  ];

  for (const item of audit.items) {
    lines.push(`${item.passed ? '[x]' : '[ ]'} ${item.label}`);
    if (item.passed && item.evidence) lines.push(`    ${item.evidence}`);
    if (!item.passed) lines.push(`    ${item.suggestion}`);
  }

  return lines.join('\n');
}

export function formatMarkdownReport(repoInput, audit) {
  const lines = [
    '# README Doctor Report',
    '',
    `**Target:** \`${repoInput}\``,
    `**Score:** ${audit.score}/100 - ${audit.summary}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];

  for (const item of audit.items) {
    const status = item.passed ? 'Pass' : 'Missing';
    const detail = item.passed ? item.evidence : item.suggestion;
    lines.push(`| ${escapeMarkdownTable(item.label)} | ${status} | ${escapeMarkdownTable(detail)} |`);
  }

  return lines.join('\n');
}

function result(id, passed, evidence = '') {
  const check = CHECKS.find((item) => item.id === id);
  return {
    ...check,
    passed: Boolean(passed),
    evidence: passed ? evidence : ''
  };
}

function hasHeading(normalized, names) {
  return names.some((name) => {
    const escaped = escapeRegExp(name);
    const pattern = hasAsciiWord(name)
      ? `(^|\\n)#{1,6}\\s+.*\\b${escaped}\\b`
      : `(^|\\n)#{1,6}\\s+.*${escaped}`;
    return new RegExp(pattern, 'i').test(normalized);
  });
}

function hasUsage(normalized) {
  return hasHeading(normalized, ['usage', 'example', 'examples', 'quick start', '使用', '用法', '示例', '快速开始'])
    || /```[\s\S]*\b(npm|pnpm|yarn|node|npx|python|pip|go|cargo|docker|readme-doctor)\b/.test(normalized)
    || /`[^`]*(npm|pnpm|yarn|node|npx|python|pip|go|cargo|docker)\s+[^`]+`/.test(normalized);
}

function usageEvidence(normalized) {
  if (hasHeading(normalized, ['usage', 'example', 'examples', 'quick start', '使用', '用法', '示例', '快速开始'])) return 'Found a usage-oriented section.';
  return 'Found an inline command example.';
}

function hasScreenshot(normalized) {
  return /!\[[^\]]*]\([^)]+\)/.test(normalized)
    || /\.(png|jpe?g|gif|webp|svg)(\)|\s|$)/.test(normalized)
    || /\b(demo|screencast|video)\b/.test(normalized)
    || /(截图|演示|视频)/.test(normalized);
}

function hasLicenseSection(normalized) {
  return hasHeading(normalized, ['license', '许可证', '开源协议', '授权']) || /\b(mit|apache-2\.0|gpl|bsd-3-clause|mpl-2\.0)\b/.test(normalized);
}

function hasContributing(normalized, hasIssues) {
  return hasHeading(normalized, ['contributing', 'contribution', 'contribute', '参与贡献', '贡献', '贡献指南'])
    || /\b(pull request|open an issue|submit an issue|create an issue)\b/.test(normalized)
    || /(提交|创建|反馈).{0,8}(issue|问题)/.test(normalized)
    || hasIssues && /\b(issue|issues)\b/.test(normalized);
}

function licenseEvidence(context) {
  if (context.license?.source === 'api') return 'Found repository license metadata.';
  return 'Found license text in README.';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeMarkdownTable(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function hasAsciiWord(value) {
  return /[a-z0-9]/i.test(value);
}
