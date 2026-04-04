# Contributing to ToastyKey

## Development Setup

```bash
git clone <repository>
cd toastykey
npm install
npm test
```

## Project Structure

```
toastykey/
├── src/
│   ├── db/           # SQLite database layer
│   ├── proxy/        # HTTP proxy server
│   ├── mcp/          # MCP server for Claude Code
│   ├── vault/        # Encrypted key storage
│   ├── tracker/      # Cost calculation engine
│   ├── triggers/     # Anomaly detection (Session 3)
│   ├── utils/        # Shared utilities
│   ├── config.js     # Configuration
│   └── index.js      # Main entry point
├── pricing/          # Provider pricing data (JSON)
├── tests/            # Test suite
└── docs/             # Documentation
```

## Adding a New Provider

1. Create pricing file: `pricing/provider-name.json`
2. Add proxy handler: `src/proxy/handlers/provider-name.js`
3. Register route in `src/proxy/index.js`
4. Add tests
5. Update documentation

## Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing patterns in the codebase
- Write tests for new features

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- pricing.test.js

# Integration tests
./tests/run-integration.sh
```

## Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `test: add tests`
- `chore: maintenance tasks`

Always end with:
```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Pull Request Process

1. Create a feature branch
2. Make your changes with tests
3. Run the full test suite
4. Update documentation
5. Submit PR with clear description

## Questions?

Open an issue or reach out to the maintainers.
