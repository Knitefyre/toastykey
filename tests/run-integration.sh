#!/bin/bash

echo "======================================"
echo "ToastyKey Session 1 Integration Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Run Jest tests
echo "Running Jest tests..."
npm test

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed${NC}"
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

echo ""
echo "======================================"
echo "Manual Integration Checklist"
echo "======================================"
echo ""
echo "To complete Session 1 verification:"
echo ""
echo "1. Start the server:"
echo "   npm start"
echo ""
echo "2. Add an API key (OpenAI or Anthropic):"
echo "   node tests/manual-openai-test.js setup"
echo "   OR"
echo "   node tests/manual-anthropic-test.js setup"
echo ""
echo "3. Test the proxy:"
echo "   node tests/manual-openai-test.js test"
echo "   OR"
echo "   node tests/manual-anthropic-test.js test"
echo ""
echo "4. Test MCP mode:"
echo "   npm run mcp"
echo "   (Should show MCP server running message)"
echo ""
echo "5. Check the database:"
echo "   sqlite3 toastykey.db 'SELECT COUNT(*) FROM api_calls;'"
echo ""
echo -e "${GREEN}If all above steps work, Session 1 is complete! ✓${NC}"
