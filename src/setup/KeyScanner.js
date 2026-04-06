const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ignore = require('ignore');

class KeyScanner {
  constructor(configManager) {
    this.configManager = configManager;
    this.providers = {
      openai: {
        pattern: /^(sk-proj-[A-Za-z0-9]{48,}|sk-[A-Za-z0-9]{48,})$/,
        envVars: ['OPENAI_API_KEY', 'OPENAI_KEY'],
        configPaths: ['~/.config/openai/api_key', '~/.openai/api_key']
      },
      anthropic: {
        pattern: /^sk-ant-api03-[A-Za-z0-9_-]{95,}$/,
        envVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
        configPaths: ['~/.config/anthropic/api_key', '~/.anthropic/api_key']
      },
      elevenlabs: {
        pattern: /^[a-f0-9]{32}$/,
        envVars: ['ELEVENLABS_API_KEY', 'ELEVEN_API_KEY', 'XI_API_KEY'],
        configPaths: ['~/.config/elevenlabs/api_key']
      },
      cartesia: {
        pattern: /^[A-Za-z0-9_-]{32,}$/,
        envVars: ['CARTESIA_API_KEY'],
        configPaths: []
      },
      replicate: {
        pattern: /^r8_[A-Za-z0-9]{40}$/,
        envVars: ['REPLICATE_API_TOKEN'],
        configPaths: []
      },
      stability: {
        pattern: /^sk-[A-Za-z0-9]{48}$/,
        envVars: ['STABILITY_API_KEY'],
        configPaths: []
      }
    };
  }

  matchProvider(key) {
    for (const [providerName, provider] of Object.entries(this.providers)) {
      if (provider.pattern.test(key)) {
        return providerName;
      }
    }
    return null;
  }

  async parseEnvFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const keys = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') continue;

        // Parse KEY=value format
        const match = line.match(/^([A-Z_]+)=(.+)$/);
        if (!match) continue;

        const [, varName, value] = match;
        const cleanValue = value.trim();

        if (!cleanValue) continue;

        // Check if this env var name matches a known provider
        for (const [providerName, provider] of Object.entries(this.providers)) {
          if (provider.envVars.includes(varName)) {
            // Validate against pattern
            if (provider.pattern.test(cleanValue)) {
              keys.push({
                provider: providerName,
                key: cleanValue,
                source: filePath,
                label: path.basename(path.dirname(filePath)),
                envVar: varName
              });
              break;
            }
          }
        }
      }

      return keys;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async scanPaths(paths, options = {}) {
    const maxDepth = options.maxDepth || 5;
    const allKeys = [];

    for (const scanPath of paths) {
      try {
        const keys = await this._scanDirectory(scanPath, maxDepth, 0);
        allKeys.push(...keys);
      } catch (error) {
        console.warn(`Couldn't scan ${scanPath}: ${error.message}`);
      }
    }

    // Deduplicate keys
    return this._deduplicateKeys(allKeys);
  }

  async _scanDirectory(dir, maxDepth, currentDepth) {
    if (currentDepth >= maxDepth) return [];

    const keys = [];

    // Load .gitignore if exists
    const gitignorePath = path.join(dir, '.gitignore');
    let ig = ignore();
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch (error) {
      // No .gitignore, continue
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      let relativePath = path.relative(dir, fullPath);

      // Add trailing slash for directories to match .gitignore patterns correctly
      if (entry.isDirectory()) {
        relativePath = relativePath + '/';
      }

      // Check .gitignore
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip common ignored directories
        if (['.git', 'node_modules', '.venv', 'venv', 'target', 'build', 'dist'].includes(entry.name)) {
          continue;
        }

        const subKeys = await this._scanDirectory(fullPath, maxDepth, currentDepth + 1);
        keys.push(...subKeys);
      } else if (entry.isFile()) {
        // Check if it's an .env file
        if (entry.name === '.env' || entry.name.startsWith('.env.')) {
          const fileKeys = await this.parseEnvFile(fullPath);
          keys.push(...fileKeys);
        }
      }
    }

    return keys;
  }

  _deduplicateKeys(keys) {
    const seen = new Map();
    const deduplicated = [];

    for (const key of keys) {
      const id = key.key;
      if (!seen.has(id)) {
        seen.set(id, key);
        deduplicated.push(key);
      } else {
        // Track all sources
        const existing = seen.get(id);
        if (!existing.allSources) {
          existing.allSources = [existing.source];
        }
        existing.allSources.push(key.source);
      }
    }

    return deduplicated;
  }

  redactKey(key) {
    if (key.length <= 13) {
      return key; // Too short to redact
    }
    const first = key.substring(0, 10);
    const last = key.substring(key.length - 3);
    return `${first}...${last}`;
  }

  scanEnvironment() {
    const keys = [];

    for (const [providerName, provider] of Object.entries(this.providers)) {
      for (const envVar of provider.envVars) {
        const value = process.env[envVar];
        if (value && provider.pattern.test(value)) {
          keys.push({
            provider: providerName,
            key: value,
            source: 'environment',
            label: 'shell-env',
            envVar
          });
        }
      }
    }

    return keys;
  }
}

module.exports = KeyScanner;
