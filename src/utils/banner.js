const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m'
};

function printBanner(config) {
  const banner = `
${colors.bright}${colors.green}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ${colors.cyan}TOASTY${colors.reset}${colors.bright}                                                  ║
║   ${colors.green}KEY${colors.reset}${colors.bright}                                                     ║
║                                                            ║
║   ${colors.gray}Track. Control. Understand.${colors.reset}${colors.bright}                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}

${colors.yellow}v0.1.0${colors.reset} — The API cost layer for AI-native builders

${colors.cyan}Services:${colors.reset}
  🔥 Proxy Server:    http://localhost:${config.proxy.port}
  📊 Dashboard:       http://localhost:3000 ${colors.gray}(Session 2)${colors.reset}
  🔌 MCP Server:      stdio connection

${colors.cyan}Status:${colors.reset}
  ✓ Database initialized
  ✓ Key vault ready
  ✓ Pricing engine loaded (${colors.green}OpenAI, Anthropic${colors.reset})

${colors.gray}────────────────────────────────────────────────────────────${colors.reset}
`;

  console.log(banner);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ${colors.reset}  ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset}  ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset}  ${message}`);
}

function logError(message) {
  console.log(`${colors.bright}\x1b[31m✗${colors.reset}  ${message}`);
}

module.exports = {
  printBanner,
  logInfo,
  logSuccess,
  logWarning,
  logError
};
