#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Tool definitions
const GIT_DIFF_TOOL: Tool = {
  name: "git_diff",
  description: "Analyze code changes between commits, branches, or working directory. " +
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
        description: "Target to diff against (commit hash, branch name, or 'HEAD'). " +
          "If omitted, shows uncommitted changes.",
      },
      source: {
        type: "string",
        description: "Source to diff from (commit hash, branch name). " +
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
  description: "Analyze commit history with filtering and statistics. " +
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
  description: "Manage and analyze git branches. " +
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
  description: "Get comprehensive repository status including staged, unstaged, and untracked files.",
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
  description: "Analyze a specific commit in detail including changed files, statistics, and impact.",
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

// Helper functions
function validateRepoPath(repoPath: string): void {
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Invalid git repository: ${repoPath}`);
  }
}

function execGit(args: string[], repoPath: string): string {
  try {
    const result = execSync(`git ${args.join(" ")}`, {
      cwd: repoPath,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return result.trim();
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

// Tool handlers
function handleGitDiff(args: any) {
  const { repoPath, target, source, filePath, staged } = args;
  validateRepoPath(repoPath);

  const gitArgs = ["diff"];

  if (staged) {
    gitArgs.push("--cached");
  }

  if (source && target) {
    gitArgs.push(`${source}..${target}`);
  } else if (target) {
    gitArgs.push(target);
  }

  if (filePath) {
    gitArgs.push("--", filePath);
  }

  // Get the diff
  const diffOutput = execGit(gitArgs, repoPath);

  // Get statistics
  const statArgs = [...gitArgs];
  statArgs.splice(1, 0, "--stat");
  const statOutput = execGit(statArgs, repoPath);

  return {
    content: [
      {
        type: "text",
        text: `# Git Diff Analysis\n\n## Statistics\n\n\`\`\`\n${statOutput || "No changes"}\n\`\`\`\n\n## Detailed Diff\n\n\`\`\`diff\n${diffOutput || "No changes"}\n\`\`\``,
      },
    ],
  };
}

function handleGitLog(args: any) {
  const { repoPath, maxCount = 20, author, since, until, filePath, branch, oneline, stat } = args;
  validateRepoPath(repoPath);

  const gitArgs = ["log"];

  gitArgs.push(`-${maxCount}`);

  if (oneline) {
    gitArgs.push("--oneline");
  } else {
    gitArgs.push("--format=%H|%an|%ae|%ad|%s");
    gitArgs.push("--date=short");
  }

  if (author) {
    gitArgs.push(`--author=${author}`);
  }

  if (since) {
    gitArgs.push(`--since=${since}`);
  }

  if (until) {
    gitArgs.push(`--until=${until}`);
  }

  if (stat) {
    gitArgs.push("--stat");
  }

  if (branch) {
    gitArgs.push(branch);
  }

  if (filePath) {
    gitArgs.push("--", filePath);
  }

  const output = execGit(gitArgs, repoPath);

  // Parse and format output
  let formattedOutput = output;
  if (!oneline && output) {
    const commits = output.split("\n").map(line => {
      const parts = line.split("|");
      if (parts.length >= 5) {
        return {
          hash: parts[0].substring(0, 8),
          author: parts[1],
          email: parts[2],
          date: parts[3],
          message: parts[4],
        };
      }
      return null;
    }).filter(Boolean);

    formattedOutput = commits.map((c: any) => 
      `\`${c.hash}\` - ${c.message}\n  Author: ${c.author} <${c.email}>\n  Date: ${c.date}`
    ).join("\n\n");
  }

  // Get contributor stats
  const contributorStats = execGit(
    ["shortlog", "-sn", `-${maxCount}`, "HEAD"],
    repoPath
  );

  return {
    content: [
      {
        type: "text",
        text: `# Git Log Analysis\n\n## Recent Commits\n\n${formattedOutput || "No commits found"}\n\n## Top Contributors\n\n\`\`\`\n${contributorStats || "No contributor data"}\n\`\`\``,
      },
    ],
  };
}

function handleGitBranch(args: any) {
  const { repoPath, action, branchName, baseBranch, includeRemote } = args;
  validateRepoPath(repoPath);

  if (action === "list") {
    const gitArgs = ["branch", "-vv"];
    if (includeRemote) {
      gitArgs.push("-a");
    }
    const output = execGit(gitArgs, repoPath);

    // Get current branch
    const currentBranch = execGit(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);

    return {
      content: [
        {
          type: "text",
          text: `# Branch List\n\nCurrent: **${currentBranch}**\n\n\`\`\`\n${output}\n\`\`\``,
        },
      ],
    };
  }

  if (action === "compare") {
    const base = baseBranch || execGit(["rev-parse", "--abbrev-ref", "origin/HEAD"], repoPath).replace("origin/", "") || "main";
    const compareBranch = branchName || execGit(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);

    // Get ahead/behind counts
    const aheadBehind = execGit(
      ["rev-list", "--left-right", "--count", `${base}...${compareBranch}`],
      repoPath
    );

    const [behind, ahead] = aheadBehind.split("\t").map(s => s.trim());

    // Get diff summary
    const diffStat = execGit(
      ["diff", "--stat", `${base}...${compareBranch}`],
      repoPath
    );

    return {
      content: [
        {
          type: "text",
          text: `# Branch Comparison: ${compareBranch} vs ${base}\n\n` +
            `**${compareBranch}** is:\n` +
            `- ${ahead} commits ahead of ${base}\n` +
            `- ${behind} commits behind ${base}\n\n` +
            `## Changes\n\n\`\`\`\n${diffStat || "No changes"}\n\`\`\``,
        },
      ],
    };
  }

  if (action === "suggest_cleanup") {
    // Find merged branches
    const mergedBranches = execGit(
      ["branch", "--merged", baseBranch || "main", "--format=%(refname:short)"],
      repoPath
    );

    // Find stale branches (no commits in 3 months)
    const staleBranches = execGit(
      ["for-each-ref", "--sort=-committerdate", "refs/heads/", 
       "--format=%(refname:short)|%(committerdate:relative)",
       "--count=50"],
      repoPath
    );

    const staleList = staleBranches.split("\n").filter(line => {
      const parts = line.split("|");
      return parts[1] && (parts[1].includes("month") || parts[1].includes("year"));
    });

    return {
      content: [
        {
          type: "text",
          text: `# Branch Cleanup Suggestions\n\n` +
            `## Already Merged (Safe to Delete)\n\n` +
            `${mergedBranches.split("\n").filter(b => b !== "main" && b !== "master").join("\n") || "None found"}\n\n` +
            `## Stale Branches (> 3 months old)\n\n` +
            `${staleList.join("\n") || "None found"}\n\n` +
            `### Cleanup Commands\n\n` +
            `\`\`\`bash\n` +
            `# Delete local merged branches\n` +
            `git branch --merged main | grep -v "main" | xargs git branch -d\n\n` +
            `# Delete remote merged branches\n` +
            `git branch -r --merged main | grep -v "HEAD" | sed 's/origin\\///' | xargs git push origin --delete\n` +
            `\`\`\``,
        },
      ],
    };
  }

  throw new Error(`Unknown action: ${action}`);
}

function handleGitStatus(args: any) {
  const { repoPath, short } = args;
  validateRepoPath(repoPath);

  const gitArgs = ["status"];
  if (short) {
    gitArgs.push("-s");
  } else {
    gitArgs.push("-sb");
  }

  const output = execGit(gitArgs, repoPath);

  // Get additional stats
  const statOutput = execGit(["diff", "--stat"], repoPath);
  const stagedStat = execGit(["diff", "--cached", "--stat"], repoPath);

  return {
    content: [
      {
        type: "text",
        text: `# Git Status\n\n` +
          `\`\`\`\n${output}\n\`\`\`\n\n` +
          `## Unstaged Changes\n\n` +
          `\`\`\`\n${statOutput || "None"}\n\`\`\`\n\n` +
          `## Staged Changes\n\n` +
          `\`\`\`\n${stagedStat || "None"}\n\`\`\``,
      },
    ],
  };
}

function handleGitCommitAnalyze(args: any) {
  const { repoPath, commitHash = "HEAD" } = args;
  validateRepoPath(repoPath);

  // Get commit details
  const commitInfo = execGit(
    ["show", "--format=Hash: %H%nAuthor: %an <%ae>%nDate: %ad%nMessage: %s%n%n%b", 
     "--no-patch", commitHash],
    repoPath
  );

  // Get changed files
  const changedFiles = execGit(
    ["diff-tree", "--no-commit-id", "--name-status", "-r", commitHash],
    repoPath
  );

  // Get statistics
  const stats = execGit(
    ["show", "--stat", commitHash],
    repoPath
  );

  // Get full diff
  const diff = execGit(
    ["show", commitHash],
    repoPath
  );

  return {
    content: [
      {
        type: "text",
        text: `# Commit Analysis: ${commitHash}\n\n` +
          `## Commit Info\n\n` +
          `\`\`\`\n${commitInfo}\n\`\`\`\n\n` +
          `## Changed Files\n\n` +
          `\`\`\`\n${changedFiles}\n\`\`\`\n\n` +
          `## Statistics\n\n` +
          `\`\`\`\n${stats}\n\`\`\`\n\n` +
          `## Full Diff\n\n` +
          `\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  };
}

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
    tools: [
      GIT_DIFF_TOOL,
      GIT_LOG_TOOL,
      GIT_BRANCH_TOOL,
      GIT_STATUS_TOOL,
      GIT_COMMIT_ANALYZE_TOOL,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "git_diff":
        return handleGitDiff(args);
      case "git_log":
        return handleGitLog(args);
      case "git_branch":
        return handleGitBranch(args);
      case "git_status":
        return handleGitStatus(args);
      case "git_commit_analyze":
        return handleGitCommitAnalyze(args);
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