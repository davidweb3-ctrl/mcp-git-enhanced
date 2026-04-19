# 🚀 MCP Git Enhanced - 发布检查清单

## 发布状态

| 步骤 | 状态 | 说明 |
|------|------|------|
| 代码准备 | ✅ 完成 | 已推送到 GitHub |
| npm 发布 | ⏳ 待手动执行 | 需要 npm 登录 |
| MCP Registry 发布 | ⏳ 待手动执行 | 需要 mcp-publisher 登录 |
| 推广 | ⏳ 待手动执行 | Twitter/X 发布 |

---

## 1. npm 发布 (需要手动执行)

### 前提条件
- 需要 npm 账号 (https://www.npmjs.com/)
- 需要双因素认证 (2FA) 的 OTP

### 执行步骤

```bash
# 1. 进入项目目录
cd /home/openclaw/.openclaw/workspace/mcp-git-enhanced

# 2. 登录 npm
npm login
# 或使用网页登录
npm login --auth-type=web

# 3. 构建项目
npm run build

# 4. 运行测试
npm test

# 5. 发布 (公开访问)
npm publish --access public

# 6. 验证发布
npm view @bountyclaw/mcp-git-enhanced
```

### 预期输出
```
+ @bountyclaw/mcp-git-enhanced@1.0.0
```

---

## 2. MCP Registry 发布

### 前提条件
- npm 包已发布
- GitHub 账号已登录

### 执行步骤

```bash
# 1. 进入项目目录
cd /home/openclaw/.openclaw/workspace/mcp-git-enhanced

# 2. 登录 MCP Registry (使用 GitHub 认证)
mcp-publisher login github

# 3. 按照提示完成设备授权流程
# - 访问 https://github.com/login/device
# - 输入终端显示的代码
# - 授权应用

# 4. 发布到 MCP Registry
mcp-publisher publish

# 5. 验证发布
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.davidweb3-ctrl/mcp-git-enhanced"
```

### 预期输出
```
Publishing to https://registry.modelcontextprotocol.io...
✓ Successfully published
✓ Server io.github.davidweb3-ctrl/mcp-git-enhanced version 1.0.0
```

---

## 3. 推广

### Twitter/X 发布内容模板

```
🚀 刚刚发布了 MCP Git Enhanced - 一个增强型 Git MCP 服务器！

✨ 功能亮点：
• 代码差异分析 (git_diff)
• 提交历史分析 (git_log)
• 分支管理 (git_branch)
• 仓库状态 (git_status)
• 提交详情分析 (git_commit_analyze)

📦 npm: npm install -g @bountyclaw/mcp-git-enhanced
🔧 MCP Registry: io.github.davidweb3-ctrl/mcp-git-enhanced
📖 GitHub: https://github.com/davidweb3-ctrl/mcp-git-enhanced

#MCP #Git #DeveloperTools #AI
```

### 开发者社区分享

- [ ] Reddit r/programming
- [ ] Hacker News (Show HN)
- [ ] Dev.to 文章
- [ ] GitHub Discussions

---

## 项目信息

| 属性 | 值 |
|------|-----|
| 包名 | @bountyclaw/mcp-git-enhanced |
| 版本 | 1.0.0 |
| MCP Registry 名称 | io.github.davidweb3-ctrl/mcp-git-enhanced |
| GitHub 仓库 | https://github.com/davidweb3-ctrl/mcp-git-enhanced |
| 测试覆盖率 | 98% |
| 测试数量 | 43 个 |

---

## 故障排除

### npm 发布失败

| 错误 | 解决方案 |
|------|----------|
| ENEEDAUTH | 运行 `npm login` 登录 |
| E403 | 检查包名是否已被占用 |
| EOTP | 输入双因素认证 OTP |

### MCP Registry 发布失败

| 错误 | 解决方案 |
|------|----------|
| "Registry validation failed for package" | 确保 package.json 包含 `mcpName` 字段 |
| "Invalid or expired Registry JWT token" | 重新运行 `mcp-publisher login github` |
| "You do not have permission to publish this server" | 确保 mcpName 格式为 `io.github.your-username/...` |

---

## 后续维护

### 版本更新流程

1. 更新代码
2. 修改版本号：`npm version patch|minor|major`
3. 提交并推送：`git push && git push --tags`
4. 发布到 npm：`npm publish --access public`
5. 更新 MCP Registry：`mcp-publisher publish`

### 监控指标

- npm 下载量: https://www.npmjs.com/package/@bountyclaw/mcp-git-enhanced
- MCP Registry 状态: https://registry.modelcontextprotocol.io
- GitHub Stars: https://github.com/davidweb3-ctrl/mcp-git-enhanced
