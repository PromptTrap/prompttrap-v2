# Contributing to PromptTrap

Thank you for considering contributing to PromptTrap! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something useful together.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/wardspan/prompttrap/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing [Issues](https://github.com/wardspan/prompttrap/issues) and [Discussions](https://github.com/wardspan/prompttrap/discussions)
2. Create a new discussion or issue with:
   - Clear use case
   - Why this feature would be valuable
   - Proposed implementation (if you have ideas)

### Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Run tests**: `npm test`
5. **Run type check**: `npm run typecheck`
6. **Build**: `npm run build`
7. **Commit** with a clear message describing the change
8. **Push** to your fork and submit a pull request

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for custom DLP patterns
fix: resolve path matching issue on Windows
docs: update README with Docker instructions
test: add tests for policy engine
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/prompttrap
cd prompttrap

# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Build and test
npm run build
npm test

# Run the demo
npm run demo

# Start the dashboard
npm run dashboard
```

## Project Structure

```
prompttrap/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # Server setup
│   ├── config.ts             # Configuration loader
│   ├── tools/                # MCP tool implementations
│   ├── policy/               # Policy engine and DLP scanner
│   ├── logging/              # Logging and audit store
│   └── dashboard/            # Web dashboard
├── test/                     # Test files
├── scripts/                  # Utility scripts
└── docs/                     # Additional documentation
```

## Adding a New Tool

1. Create the tool in `src/tools/YOUR-tool.ts`:
```typescript
import { z } from 'zod';

export const YourToolArgsSchema = z.object({
  param: z.string().describe('Description'),
});

export async function yourTool(args: z.infer<typeof YourToolArgsSchema>): Promise<string> {
  // Implementation
  return 'result';
}
```

2. Register in `src/tools/index.ts`:
```typescript
// Import
import { YourToolArgsSchema, yourTool } from './your-tool.js';

// Add to switch case
case 'your_tool':
  result = await executeTool('your_tool', args, YourToolArgsSchema, yourTool);
  break;

// Add to getToolsList
tools.push({
  name: 'your_tool',
  description: 'Description of what it does',
  inputSchema: { /* JSON schema */ },
});
```

3. Add tests in `test/your-tool.test.ts`

4. Update README and example config

## Adding a DLP Pattern

1. Add pattern to `src/policy/patterns.ts`:
```typescript
{
  name: 'pattern_name',
  regex: /pattern/g,
  severity: 'high',
  validator: (match) => /* optional validation */,
}
```

2. Add tests in `test/dlp-scanner.test.ts`

3. Update `prompttrap.example.yaml` with the new pattern option

## Testing

- Write tests for all new functionality
- Aim for high test coverage
- Test both success and failure cases
- Include edge cases

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- dlp-scanner.test.ts
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to functions
- Update CLAUDE.md for architectural changes
- Include code examples where helpful

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run `npm run prepublishOnly` to build and test
4. Create git tag: `git tag v0.x.0`
5. Push tag: `git push origin v0.x.0`
6. GitHub Actions will publish to npm

## Questions?

- Open a [Discussion](https://github.com/wardspan/prompttrap/discussions)
- Check existing [Issues](https://github.com/wardspan/prompttrap/issues)
- Email: ward@altgreen.com

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
