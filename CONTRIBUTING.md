# Contributing to MCP Git Enhanced

Thank you for your interest in contributing! 🦞

## Development Setup

```bash
git clone https://github.com/davidweb3-ctrl/mcp-git-enhanced.git
cd mcp-git-enhanced
npm install
npm run build
```

## Testing

Test the server locally:

```bash
# Start the server
node dist/index.js

# In another terminal, test with echo
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Adding New Tools

1. Define the tool schema in `src/index.ts`
2. Implement the handler function
3. Register in `ListToolsRequestSchema` handler
4. Add to `CallToolRequestSchema` switch statement
5. Update README with documentation
6. Add tests if applicable

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- TypeScript strict mode enabled
- Follow existing code patterns
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose

## Reporting Issues

Please include:
- Node.js version
- Git version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.