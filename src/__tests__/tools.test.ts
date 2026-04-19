import {
  validateRepoPath,
  execGit,
  handleGitDiff,
  handleGitLog,
  handleGitBranch,
  handleGitStatus,
  handleGitCommitAnalyze,
} from "../tools.js";
import * as fs from "fs";
import { spawnSync } from "child_process";
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("fs");
jest.mock("child_process");

const mockedFs = jest.mocked(fs);
const mockedSpawnSync = jest.mocked(spawnSync);

// Helper to create successful spawn result
function spawnResult(stdout: string, stderr = "", status = 0) {
  return {
    stdout,
    stderr,
    status,
    signal: null,
    pid: 12345,
    output: [null, stdout, stderr],
  };
}

describe("validateRepoPath", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not throw for valid git repository", () => {
    mockedFs.existsSync.mockReturnValue(true);

    expect(() => validateRepoPath("/valid/repo")).not.toThrow();
    expect(mockedFs.existsSync).toHaveBeenCalledWith("/valid/repo/.git");
  });

  it("should throw error for invalid git repository", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => validateRepoPath("/invalid/repo")).toThrow(
      "Invalid git repository: /invalid/repo"
    );
    expect(mockedFs.existsSync).toHaveBeenCalledWith("/invalid/repo/.git");
  });
});

describe("execGit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute git command and return trimmed output", () => {
    mockedSpawnSync.mockReturnValue(spawnResult("  git output  ") as any);

    const result = execGit(["status"], "/repo/path");

    expect(result).toBe("git output");
    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      ["status"],
      expect.objectContaining({
        cwd: "/repo/path",
        encoding: "utf-8",
      })
    );
  });

  it("should throw error when git command fails", () => {
    mockedSpawnSync.mockReturnValue(spawnResult("", "error message", 1) as any);

    expect(() => execGit(["invalid"], "/repo")).toThrow("Git command failed: error message");
  });

  it("should throw error when spawn fails", () => {
    mockedSpawnSync.mockImplementation(() => {
      throw new Error("spawn failed");
    });

    expect(() => execGit(["status"], "/repo")).toThrow("Git command failed: spawn failed");
  });
});

describe("handleGitDiff", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  it("should handle basic diff request", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("diff output") as any)
      .mockReturnValueOnce(spawnResult("stat output") as any);

    const result = handleGitDiff({ repoPath: "/repo" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Git Diff Analysis");
    expect(result.content[0].text).toContain("diff output");
    expect(result.content[0].text).toContain("stat output");
  });

  it("should handle staged changes", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("staged diff") as any)
      .mockReturnValueOnce(spawnResult("staged stat") as any);

    handleGitDiff({ repoPath: "/repo", staged: true });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["diff", "--cached"]),
      expect.any(Object)
    );
  });

  it("should handle source and target comparison", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("diff output") as any)
      .mockReturnValueOnce(spawnResult("stat output") as any);

    handleGitDiff({ repoPath: "/repo", source: "main", target: "feature" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["diff", "main..feature"]),
      expect.any(Object)
    );
  });

  it("should handle file path filtering", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("file diff") as any)
      .mockReturnValueOnce(spawnResult("file stat") as any);

    handleGitDiff({ repoPath: "/repo", filePath: "src/" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["diff", "--", "src/"]),
      expect.any(Object)
    );
  });

  it("should handle target only (diff against working directory)", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("target diff") as any)
      .mockReturnValueOnce(spawnResult("target stat") as any);

    handleGitDiff({ repoPath: "/repo", target: "HEAD~1" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["diff", "HEAD~1"]),
      expect.any(Object)
    );
  });

  it("should show 'No changes' when output is empty", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    const result = handleGitDiff({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("No changes");
  });

  it("should throw error for invalid repo", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => handleGitDiff({ repoPath: "/invalid" })).toThrow("Invalid git repository");
  });
});

describe("handleGitLog", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  it("should handle basic log request", () => {
    mockedSpawnSync
      .mockReturnValueOnce(
        spawnResult(
          "hash1|Author1|email1@test.com|2024-01-01|Message1\nhash2|Author2|email2@test.com|2024-01-02|Message2"
        ) as any
      )
      .mockReturnValueOnce(spawnResult("  10 Author1\n   5 Author2") as any);

    const result = handleGitLog({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("Git Log Analysis");
    expect(result.content[0].text).toContain("hash1");
    expect(result.content[0].text).toContain("Author1");
    expect(result.content[0].text).toContain("Top Contributors");
  });

  it("should use default maxCount of 20", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["log", "-20"]),
      expect.any(Object)
    );
  });

  it("should handle custom maxCount", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", maxCount: 50 });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["log", "-50"]),
      expect.any(Object)
    );
  });

  it("should handle oneline format", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("abc1234 Commit message") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    const result = handleGitLog({ repoPath: "/repo", oneline: true });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["log", "-20", "--oneline"]),
      expect.any(Object)
    );
    expect(result.content[0].text).toContain("abc1234 Commit message");
  });

  it("should handle author filter", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", author: "John Doe" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["--author=John Doe"]),
      expect.any(Object)
    );
  });

  it("should handle since filter", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", since: "1 week ago" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["--since=1 week ago"]),
      expect.any(Object)
    );
  });

  it("should handle until filter", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", until: "2024-01-01" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["--until=2024-01-01"]),
      expect.any(Object)
    );
  });

  it("should handle stat option", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", stat: true });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["--stat"]),
      expect.any(Object)
    );
  });

  it("should handle branch parameter", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", branch: "feature" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["feature"]),
      expect.any(Object)
    );
  });

  it("should handle filePath parameter", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitLog({ repoPath: "/repo", filePath: "src/index.ts" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["--", "src/index.ts"]),
      expect.any(Object)
    );
  });

  it("should show 'No commits found' when output is empty", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    const result = handleGitLog({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("No commits found");
  });

  it("should parse commit format correctly", () => {
    mockedSpawnSync
      .mockReturnValueOnce(
        spawnResult(
          "abc123def456|John Doe|john@example.com|2024-01-15|Fix bug\nxyz789ghi012|Jane Smith|jane@example.com|2024-01-14|Add feature"
        ) as any
      )
      .mockReturnValueOnce(spawnResult("") as any);

    const result = handleGitLog({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("abc123de");
    expect(result.content[0].text).toContain("Fix bug");
    expect(result.content[0].text).toContain("John Doe");
    expect(result.content[0].text).toContain("john@example.com");
  });

  it("should throw error for invalid repo", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => handleGitLog({ repoPath: "/invalid" })).toThrow("Invalid git repository");
  });
});

describe("handleGitBranch", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  describe("list action", () => {
    it("should list branches", () => {
      mockedSpawnSync
        .mockReturnValueOnce(
          spawnResult(
            "* main                commit1 [origin/main] Message1\n  feature             commit2 Message2"
          ) as any
        )
        .mockReturnValueOnce(spawnResult("main") as any);

      const result = handleGitBranch({ repoPath: "/repo", action: "list" });

      expect(result.content[0].text).toContain("Branch List");
      expect(result.content[0].text).toContain("main");
      expect(result.content[0].text).toContain("feature");
    });

    it("should include remote branches when specified", () => {
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("* main\n  remotes/origin/feature") as any)
        .mockReturnValueOnce(spawnResult("main") as any);

      handleGitBranch({ repoPath: "/repo", action: "list", includeRemote: true });

      expect(mockedSpawnSync).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["branch", "-vv", "-a"]),
        expect.any(Object)
      );
    });
  });

  describe("compare action", () => {
    it("should compare branches", () => {
      // When baseBranch is provided, origin/HEAD is NOT called (short-circuit)
      // But when branchName IS provided, the current branch call is also skipped
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("5\t3") as any) // ahead/behind (first call)
        .mockReturnValueOnce(spawnResult("file1.ts | 10 +++---") as any); // diff stat

      const result = handleGitBranch({
        repoPath: "/repo",
        action: "compare",
        branchName: "feature",
        baseBranch: "main",
      });

      expect(result.content[0].text).toContain("Branch Comparison: feature vs main");
      expect(result.content[0].text).toContain("3 commits ahead");
      expect(result.content[0].text).toContain("5 commits behind");
    });

    it("should use current branch when branchName not specified", () => {
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("origin/main") as any)
        .mockReturnValueOnce(spawnResult("current-branch") as any)
        .mockReturnValueOnce(spawnResult("2\t4") as any)
        .mockReturnValueOnce(spawnResult("") as any);

      const result = handleGitBranch({ repoPath: "/repo", action: "compare" });

      expect(result.content[0].text).toContain("current-branch");
    });
  });

  describe("suggest_cleanup action", () => {
    it("should suggest branches to cleanup", () => {
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("main\nfeature1\nfeature2") as any) // merged branches
        .mockReturnValueOnce(
          spawnResult("recent-branch|2 days ago\nold-branch|3 months ago") as any
        ); // stale branches (sorted by date)

      const result = handleGitBranch({ repoPath: "/repo", action: "suggest_cleanup" });

      expect(result.content[0].text).toContain("Branch Cleanup Suggestions");
      expect(result.content[0].text).toContain("feature1");
      expect(result.content[0].text).toContain("feature2");
      expect(result.content[0].text).toContain("old-branch");
      expect(result.content[0].text).toContain("Cleanup Commands");
    });

    it("should filter out main and master from merged list", () => {
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("main\nmaster\nfeature") as any)
        .mockReturnValueOnce(spawnResult("") as any);

      const result = handleGitBranch({ repoPath: "/repo", action: "suggest_cleanup" });

      // main and master should be filtered out from the merged branches list
      // (but may appear in the cleanup commands section which is expected)
      const text = result.content[0].text;
      // Check the "Already Merged" section contains feature but not main/master as branch names
      const mergedSection = text.split("## Stale Branches")[0];
      expect(mergedSection).toContain("feature");
      // main/master should not appear as standalone lines in merged section (they are filtered)
      expect(mergedSection).not.toMatch(/^main$/m);
      expect(mergedSection).not.toMatch(/^master$/m);
    });

    it("should filter stale branches by time", () => {
      mockedSpawnSync
        .mockReturnValueOnce(spawnResult("") as any)
        .mockReturnValueOnce(
          spawnResult("fresh|2 days ago\nold|5 months ago\nstale|1 year ago") as any
        ); // sorted by date desc

      const result = handleGitBranch({ repoPath: "/repo", action: "suggest_cleanup" });

      expect(result.content[0].text).toContain("old");
      expect(result.content[0].text).toContain("stale");
      expect(result.content[0].text).not.toContain("fresh");
    });
  });

  it("should throw error for unknown action", () => {
    expect(() => handleGitBranch({ repoPath: "/repo", action: "unknown" as any })).toThrow(
      "Unknown action: unknown"
    );
  });

  it("should throw error for invalid repo", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => handleGitBranch({ repoPath: "/invalid", action: "list" })).toThrow(
      "Invalid git repository"
    );
  });
});

describe("handleGitStatus", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  it("should get repository status", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("## main...origin/main\n M file1.ts\nA  file2.ts") as any)
      .mockReturnValueOnce(spawnResult("file1.ts | 5 +++--") as any)
      .mockReturnValueOnce(spawnResult("file2.ts | 10 +++++") as any);

    const result = handleGitStatus({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("Git Status");
    expect(result.content[0].text).toContain("main...origin/main");
    expect(result.content[0].text).toContain("Unstaged Changes");
    expect(result.content[0].text).toContain("Staged Changes");
  });

  it("should handle short format", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult(" M file1.ts") as any)
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitStatus({ repoPath: "/repo", short: true });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["status", "-s"]),
      expect.any(Object)
    );
  });

  it("should handle long format (default)", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("## main") as any)
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    handleGitStatus({ repoPath: "/repo" });

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["status", "-sb"]),
      expect.any(Object)
    );
  });

  it("should show 'None' when no changes", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("## main") as any)
      .mockReturnValueOnce(spawnResult("") as any)
      .mockReturnValueOnce(spawnResult("") as any);

    const result = handleGitStatus({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("None");
  });

  it("should throw error for invalid repo", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => handleGitStatus({ repoPath: "/invalid" })).toThrow("Invalid git repository");
  });
});

describe("handleGitCommitAnalyze", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  it("should analyze commit with default HEAD", () => {
    mockedSpawnSync
      .mockReturnValueOnce(
        spawnResult(
          "Hash: abc123\nAuthor: Test Author <test@example.com>\nDate: 2024-01-15\nMessage: Test commit"
        ) as any
      ) // commit info (git show --format --no-patch)
      .mockReturnValueOnce(spawnResult("M\tfile1.ts\nA\tfile2.ts") as any) // changed files (git diff-tree)
      .mockReturnValueOnce(spawnResult("file1.ts | 5 +++--\nfile2.ts | 10 +++++") as any) // stats (git show --stat)
      .mockReturnValueOnce(spawnResult("full diff output") as any); // full diff (git show)

    const result = handleGitCommitAnalyze({ repoPath: "/repo" });

    expect(result.content[0].text).toContain("Commit Analysis: HEAD");
    expect(result.content[0].text).toContain("Test Author");
    expect(result.content[0].text).toContain("file1.ts");
    expect(result.content[0].text).toContain("full diff output");
  });

  it("should analyze specific commit hash", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("Hash: def456") as any)
      .mockReturnValueOnce(spawnResult("M\tfile.ts") as any)
      .mockReturnValueOnce(spawnResult("file.ts | 5 +++--") as any)
      .mockReturnValueOnce(spawnResult("diff") as any);

    const result = handleGitCommitAnalyze({ repoPath: "/repo", commitHash: "abc123" });

    expect(result.content[0].text).toContain("Commit Analysis: abc123");
  });

  it("should include all commit sections", () => {
    mockedSpawnSync
      .mockReturnValueOnce(spawnResult("commit info") as any)
      .mockReturnValueOnce(spawnResult("changed files") as any)
      .mockReturnValueOnce(spawnResult("statistics") as any)
      .mockReturnValueOnce(spawnResult("full diff") as any);

    const result = handleGitCommitAnalyze({ repoPath: "/repo", commitHash: "abc123" });

    expect(result.content[0].text).toContain("Commit Info");
    expect(result.content[0].text).toContain("Changed Files");
    expect(result.content[0].text).toContain("Statistics");
    expect(result.content[0].text).toContain("Full Diff");
  });

  it("should throw error for invalid repo", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => handleGitCommitAnalyze({ repoPath: "/invalid" })).toThrow(
      "Invalid git repository"
    );
  });
});
