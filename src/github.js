import { parseGitHubRepo } from './audit.js';

const API_ROOT = 'https://api.github.com';

export async function fetchRepositoryReadme(input, options = {}) {
  const { owner, repo } = parseGitHubRepo(input);
  const headers = buildHeaders(options.token);

  const [readmeResponse, repoResponse, licenseResponse] = await Promise.all([
    requestJson(`${API_ROOT}/repos/${owner}/${repo}/readme`, headers),
    requestJson(`${API_ROOT}/repos/${owner}/${repo}`, headers),
    requestJson(`${API_ROOT}/repos/${owner}/${repo}/license`, headers, { allowNotFound: true })
  ]);

  return {
    repo: `${owner}/${repo}`,
    readme: decodeContent(readmeResponse),
    metadata: {
      repo: {
        hasIssues: Boolean(repoResponse.has_issues)
      },
      license: {
        present: Boolean(repoResponse.license || licenseResponse),
        source: repoResponse.license || licenseResponse ? 'api' : undefined,
        key: repoResponse.license?.key ?? licenseResponse?.license?.key
      }
    }
  };
}

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function requestJson(url, headers, options = {}) {
  const response = await fetch(url, { headers });

  if (response.status === 404 && options.allowNotFound) return null;

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${message.slice(0, 180)}`);
  }

  return response.json();
}

function decodeContent(payload) {
  if (!payload?.content) {
    throw new Error('Repository README response did not include file content.');
  }

  return Buffer.from(payload.content, payload.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
}
