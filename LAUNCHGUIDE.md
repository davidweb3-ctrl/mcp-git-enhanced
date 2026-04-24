# MCP Git Enhanced - Launch Guide

## Server Overview

**MCP Git Enhanced** is an enhanced Git MCP Server that enables AI agents to perform advanced Git operations including code review, commit analysis, and branch management.

### Key Features

- 🔍 **Code Review**: Analyze diffs and provide intelligent code review feedback
- 📝 **Commit Analysis**: Understand commit history and generate summaries
- 🌿 **Branch Management**: List, compare, and manage Git branches
- 📊 **Repository Insights**: Get repository statistics and health metrics
- 🔗 **GitHub Integration**: Seamlessly works with GitHub repositories

### Use Cases

- AI-powered code review assistants
- Automated commit message generators
- Repository health monitoring tools
- Branch comparison and merge helpers

## Installation

```bash
npm install -g @davidweb3-ctrl/mcp-git-enhanced
```

## Configuration

### Required Environment Variables

This server requires a **GitHub Personal Access Token** for accessing private repositories and higher API rate limits.

| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| `GITHUB_TOKEN` | **Yes** | GitHub Personal Access Token | [Create here](https://github.com/settings/tokens) |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_AUTHOR_NAME` | Git config | Default author name for commits |
| `GIT_AUTHOR_EMAIL` | Git config | Default author email for commits |

## Getting Your GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories
   - `read:org` - Read org and team membership
   - `read:user` - Read user profile data
4. Generate and copy the token
5. Set as environment variable: `export GITHUB_TOKEN=your_token_here`

## Usage with Claude

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "git-enhanced": {
      "command": "npx",
      "args": ["@davidweb3-ctrl/mcp-git-enhanced"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

## Available Tools

### Repository Tools
- `git_repo_info` - Get repository information and statistics
- `git_branch_list` - List all branches in the repository
- `git_branch_compare` - Compare two branches

### Commit Tools
- `git_log` - View commit history with filtering
- `git_commit_analyze` - Analyze commit patterns and generate insights
- `git_diff` - Show differences between commits or branches

### Code Review Tools
- `git_review_pr` - Perform AI-powered code review on pull requests
- `git_blame` - Show line-by-line commit information

## Pricing

This server is **open source and free** to use.

For enterprise support or custom features, contact: prodavidweb3@gmail.com

## Security

- All Git operations are performed locally
- GitHub token is never logged or stored
- HTTPS-only communication with GitHub API
- No code is uploaded to external servers

## Support

- GitHub Issues: https://github.com/davidweb3-ctrl/mcp-git-enhanced/issues
- Email: prodavidweb3@gmail.com
- Documentation: See README.md in repository

## License

MIT License - Copyright (c) 2025 David Xia
