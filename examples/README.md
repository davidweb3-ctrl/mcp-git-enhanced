# MCP Git Enhanced Examples

This directory contains usage examples for the MCP Git Enhanced server.

## Claude Code Integration

### 1. Configure Claude Code

Add to `~/.claude/settings.json`:

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

### 2. Example Prompts

Once configured, you can ask Claude:

#### Code Review
```
"Show me what changed between the last two commits"
"What's the diff between main and my feature branch?"
"Review the staged changes in this repo"
```

#### Commit Analysis
```
"Analyze the most recent commit"
"Show me commits from last week"
"Who contributed the most code this month?"
```

#### Branch Management
```
"List all branches in this repo"
"Compare this branch with main"
"Which branches can be safely deleted?"
```

#### Repository Health
```
"What's the current status of this repository?"
"Show me all uncommitted changes"
"List files modified in the last 3 commits"
```

## Direct Tool Usage

You can also call the tools directly via JSON-RPC:

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx @bountyclaw/mcp-git-enhanced

# Get git status
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "git_status",
    "arguments": {
      "repoPath": "/path/to/repo"
    }
  }
}' | npx @bountyclaw/mcp-git-enhanced
```

## Integration with Other MCP Clients

The server implements the Model Context Protocol and can be used with any MCP-compatible client:

- Claude Desktop
- Claude Code
- Custom MCP clients
- Any tool supporting MCP stdio transport