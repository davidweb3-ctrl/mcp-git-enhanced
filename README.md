# 🦞 MCP Git Enhanced

An enhanced Git MCP (Model Context Protocol) server that provides AI assistants with powerful code review, commit analysis, and branch management capabilities.

## Features

- 🔍 **Code Diff Analysis** - Compare commits, branches, or working directory changes
- 📊 **Commit History Analysis** - Deep insights into commit patterns and contributors
- 🌿 **Branch Management** - List, compare, and cleanup suggestions
- 📈 **Repository Status** - Comprehensive working directory overview
- 🔎 **Commit Analysis** - Detailed single commit inspection

## Installation

### From npm (when published)
```bash
npm install -g @bountyclaw/mcp-git-enhanced
```

### From source
```bash
git clone https://github.com/bountyclaw/mcp-git-enhanced.git
cd mcp-git-enhanced
npm install
npm run build
```

## Usage with Claude Code

Add to your Claude Code configuration (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "git-enhanced": {
      "command": "npx",
      "args": ["@bountyclaw/mcp-git-enhanced"]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "git-enhanced": {
      "command": "node",
      "args": ["/path/to/mcp-git-enhanced/dist/index.js"]
    }
  }
}
```

## Available Tools

### git_diff
Analyze code changes between commits, branches, or working directory.

```json
{
  "repoPath": "/absolute/path/to/repo",
  "target": "HEAD~5",
  "source": "HEAD~10",
  "filePath": "src/",
  "staged": false
}
```

### git_log
Analyze commit history with filtering and statistics.

```json
{
  "repoPath": "/absolute/path/to/repo",
  "maxCount": 20,
  "author": "John Doe",
  "since": "1 week ago",
  "stat": true
}
```

### git_branch
Manage and analyze git branches.

```json
{
  "repoPath": "/absolute/path/to/repo",
  "action": "list|compare|suggest_cleanup",
  "includeRemote": true
}
```

### git_status
Get comprehensive repository status.

```json
{
  "repoPath": "/absolute/path/to/repo",
  "short": false
}
```

### git_commit_analyze
Analyze a specific commit in detail.

```json
{
  "repoPath": "/absolute/path/to/repo",
  "commitHash": "abc123"
}
```

## Example Use Cases

### Code Review
```
"Show me the diff between main and the feature branch"
"What files changed in the last 5 commits?"
"Analyze the impact of commit abc123"
```

### Repository Health
```
"List all branches that can be safely deleted"
"Show me commits from the last week"
"Who are the top contributors to this project?"
```

### Working Directory
```
"What's the current status of my repo?"
"Show me the staged changes"
"What files have uncommitted changes?"
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test locally
node dist/index.js
```

## Requirements

- Node.js >= 18.0.0
- Git installed and available in PATH

## License

MIT

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

Built with 🦞 by BountyClaw