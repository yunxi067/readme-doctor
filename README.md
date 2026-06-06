# README Doctor

README Doctor is a small CLI that audits a GitHub repository README for the essentials that help open source visitors trust and use a project.

![README Doctor CLI demo](./docs/demo.svg)

## Installation

Run it directly from the repository:

```bash
git clone https://github.com/yunxi067/readme-doctor.git
cd readme-doctor
npm install
```

## Usage

Audit a public GitHub repository:

```bash
npm start -- octocat/Hello-World
```

Or run the CLI file directly:

```bash
node src/cli.js https://github.com/octocat/Hello-World
```

Print JSON for scripts:

```bash
node src/cli.js octocat/Hello-World --json
```

## What It Checks

README Doctor scores seven beginner-friendly README essentials:

- project title
- installation instructions
- usage example
- screenshot, GIF, video, or demo link
- license
- contributing guidance
- FAQ

Each item has equal weight. The CLI prints the score, passed checks, and focused suggestions for missing sections.

## GitHub API

README Doctor uses GitHub REST API endpoints for repository metadata, README content, and license metadata. Set `GITHUB_TOKEN` if you want higher API rate limits:

```bash
GITHUB_TOKEN=ghp_your_token_here node src/cli.js owner/repo
```

## FAQ

### Does it modify the target repository?

No. It only reads public GitHub API data and prints a local report.

### Can it audit private repositories?

Yes, if `GITHUB_TOKEN` has access to the private repository.

### Why does screenshot/demo count as a README essential?

For small tools, one visual proof point helps new visitors understand the project quickly.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the small development workflow.

## License

MIT

