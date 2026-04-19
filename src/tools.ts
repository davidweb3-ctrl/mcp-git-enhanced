#!/usr/bin/env node

import { spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Helper functions
export function validateRepoPath(repoPath: string): void {
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Invalid git repository: ${repoPath}`);
  }
}

export function execGit(args: string[], repoPath: string): string {
  try {
    const result = spawnSync("git", args, {
      cwd: repoPath,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || `Git exited with code ${result.status}`);
    }
    return (result.stdout || "").trim();
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

// Tool handlers
export function handleGitDiff(args: {
  repoPath: string;
  target?: string;
  source?: string;
  filePath?: string;
  staged?: boolean;
}) {
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

export function handleGitLog(args: {
  repoPath: string;
  maxCount?: number;
  author?: string;
  since?: string;
  until?: string;
  filePath?: string;
  branch?: string;
  oneline?: boolean;
  stat?: boolean;
}) {
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
    const commits = output
      .split("\n")
      .map((line) => {
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
      })
      .filter(Boolean);

    formattedOutput = commits
      .map(
        (c: any) =>
          `\`${c.hash}\` - ${c.message}\n  Author: ${c.author} <${c.email}>\n  Date: ${c.date}`
      )
      .join("\n\n");
  }

  // Get contributor stats
  const contributorStats = execGit(["shortlog", "-sn", `-${maxCount}`, "HEAD"], repoPath);

  return {
    content: [
      {
        type: "text",
        text: `# Git Log Analysis\n\n## Recent Commits\n\n${formattedOutput || "No commits found"}\n\n## Top Contributors\n\n\`\`\`\n${contributorStats || "No contributor data"}\n\`\`\``,
      },
    ],
  };
}

export function handleGitBranch(args: {
  repoPath: string;
  action: string;
  branchName?: string;
  baseBranch?: string;
  includeRemote?: boolean;
}) {
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
    const base =
      baseBranch ||
      execGit(["rev-parse", "--abbrev-ref", "origin/HEAD"], repoPath).replace("origin/", "") ||
      "main";
    const compareBranch = branchName || execGit(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);

    // Get ahead/behind counts
    const aheadBehind = execGit(
      ["rev-list", "--left-right", "--count", `${base}...${compareBranch}`],
      repoPath
    );

    const [behind, ahead] = aheadBehind.split("\t").map((s) => s.trim());

    // Get diff summary
    const diffStat = execGit(["diff", "--stat", `${base}...${compareBranch}`], repoPath);

    return {
      content: [
        {
          type: "text",
          text:
            `# Branch Comparison: ${compareBranch} vs ${base}\n\n` +
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
      [
        "for-each-ref",
        "--sort=-committerdate",
        "refs/heads/",
        "--format=%(refname:short)|%(committerdate:relative)",
        "--count=50",
      ],
      repoPath
    );

    const staleList = staleBranches.split("\n").filter((line) => {
      const parts = line.split("|");
      return parts[1] && (parts[1].includes("month") || parts[1].includes("year"));
    });

    return {
      content: [
        {
          type: "text",
          text:
            `# Branch Cleanup Suggestions\n\n` +
            `## Already Merged (Safe to Delete)\n\n` +
            `${
              mergedBranches
                .split("\n")
                .filter((b) => b !== "main" && b !== "master")
                .join("\n") || "None found"
            }\n\n` +
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

export function handleGitStatus(args: { repoPath: string; short?: boolean }) {
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
        text:
          `# Git Status\n\n` +
          `\`\`\`\n${output}\n\`\`\`\n\n` +
          `## Unstaged Changes\n\n` +
          `\`\`\`\n${statOutput || "None"}\n\`\`\`\n\n` +
          `## Staged Changes\n\n` +
          `\`\`\`\n${stagedStat || "None"}\n\`\`\``,
      },
    ],
  };
}

export function handleGitCommitAnalyze(args: { repoPath: string; commitHash?: string }) {
  const { repoPath, commitHash = "HEAD" } = args;
  validateRepoPath(repoPath);

  // Get commit details
  const commitInfo = execGit(
    [
      "show",
      "--format=Hash: %H%nAuthor: %an <%ae>%nDate: %ad%nMessage: %s%n%n%b",
      "--no-patch",
      commitHash,
    ],
    repoPath
  );

  // Get changed files
  const changedFiles = execGit(
    ["diff-tree", "--no-commit-id", "--name-status", "-r", commitHash],
    repoPath
  );

  // Get statistics
  const stats = execGit(["show", "--stat", commitHash], repoPath);

  // Get full diff
  const diff = execGit(["show", commitHash], repoPath);

  return {
    content: [
      {
        type: "text",
        text:
          `# Commit Analysis: ${commitHash}\n\n` +
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
