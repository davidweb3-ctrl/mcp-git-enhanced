#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleGitDiff,
  handleGitLog,
  handleGitBranch,
  handleGitStatus,
  handleGitCommitAnalyze,
} from "./tools.js";

// Tool definitions
const GIT_DIFF_TOOL: Tool = {
  name: "git_diff",
  description:
    "Analyze code changes between commits, branches, or working directory. " +
    "Provides detailed diff analysis with statistics and file categorization.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute path to the git repository",
      },
      target: {
        type: "string",
        description:
          "Target to diff against (commit hash, branch name, or 'HEAD'). " +
          "If omitted, shows uncommitted changes.",
      },
      source: {
        type: "string",
        description:
          "Source to diff from (commit hash, branch name). " +
          "If omitted with target, diffs target against working directory.",
      },
      filePath: {
        type: "string",
        description: "Specific file or directory path to diff (relative to repo root)",
      },
      staged: {
        type: "boolean",
        description: "Show staged changes only (git diff --cached)",
      },
    },
    required: ["repoPath"],
  },
};

const GIT_LOG_TOOL: Tool = {
  name: "git_log",
  description:
    "Analyze commit history with filtering and statistics. " +
    "Provides insights into commit patterns, contributors, and code evolution.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute path to the git repository",
      },
      maxCount: {
        type: "number",
        description: "Maximum number of commits to show (default: 20)",
      },
      author: {
        type: "string",
        description: "Filter commits by author name or email",
      },
      since: {
        type: "string",
        description: "Show commits more recent than date (e.g., '2024-01-01', '1 week ago')",
      },
      until: {
        type: "string",
        description: "Show commits older than date",
      },
      filePath: {
        type: "string",
        description: "Show commits affecting specific file or directory",
      },
      branch: {
        type: "string",
        description: "Branch to log (default: current branch)",
      },
      oneline: {
        type: "boolean",
        description: "Show commits in one-line format",
      },
      stat: {
        type: "boolean",
        description: "Include file change statistics",
      },
    },
    required: ["repoPath"],
  },
};

const GIT_BRANCH_TOOL: Tool = {
  name: "git_branch",
  description:
    "Manage and analyze git branches. " +
    "Provides branch listing, comparison, and management suggestions.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute path to the git repository",
      },
      action: {
        type: "string",
        enum: ["list", "compare", "suggest_cleanup"],
        description: "Action to perform: list branches, compare branches, or suggest cleanup",
      },
      branchName: {
        type: "string",
        description: "Branch name for specific operations",
      },
      baseBranch: {
        type: "string",
        description: "Base branch for comparison (default: main or master)",
      },
      includeRemote: {
        type: "boolean",
        description: "Include remote branches in listing",
      },
    },
    required: ["repoPath", "action"],
  },
};

const GIT_STATUS_TOOL: Tool = {
  name: "git_status",
  description:
    "Get comprehensive repository status including staged, unstaged, and untracked files.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute path to the git repository",
      },
      short: {
        type: "boolean",
        description: "Show short format output",
      },
    },
    required: ["repoPath"],
  },
};

const GIT_COMMIT_ANALYZE_TOOL: Tool = {
  name: "git_commit_analyze",
  description:
    "Analyze a specific commit in detail including changed files, statistics, and impact.",
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute path to the git repository",
      },
      commitHash: {
        type: "string",
        description: "Commit hash to analyze (default: HEAD)",
      },
    },
    required: ["repoPath"],
  },
};

// Main server setup
const server = new Server(
  {
    name: "mcp-git-enhanced",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [GIT_DIFF_TOOL, GIT_LOG_TOOL, GIT_BRANCH_TOOL, GIT_STATUS_TOOL, GIT_COMMIT_ANALYZE_TOOL],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "git_diff":
        return handleGitDiff(
          args as {
            repoPath: string;
            target?: string;
            source?: string;
            filePath?: string;
            staged?: boolean;
          }
        );
      case "git_log":
        return handleGitLog(
          args as {
            repoPath: string;
            maxCount?: number;
            author?: string;
            since?: string;
            until?: string;
            filePath?: string;
            branch?: string;
            oneline?: boolean;
            stat?: boolean;
          }
        );
      case "git_branch":
        return handleGitBranch(
          args as {
            repoPath: string;
            action: string;
            branchName?: string;
            baseBranch?: string;
            includeRemote?: boolean;
          }
        );
      case "git_status":
        return handleGitStatus(args as { repoPath: string; short?: boolean });
      case "git_commit_analyze":
        return handleGitCommitAnalyze(args as { repoPath: string; commitHash?: string });
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Git Enhanced Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
