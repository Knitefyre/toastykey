const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(os.homedir(), '.toastykey', 'config.json');
    this.defaults = {
      version: '1.0.0',
      first_run_complete: false,
      first_run_timestamp: null,
      scan: {
        paths: [],
        last_scan_timestamp: null,
        ignored_keys: [],
        auto_scan_on_start: true,
        scan_history: []
      },
      watch: {
        enabled: false,
        directories: [],
        max_depth: 3,
        exclude_patterns: ['node_modules', '.venv', 'venv', 'target', 'build', 'dist', '.git']
      },
      preferences: {
        currency: 'USD',
        auto_open_browser: true,
        port: 4000,
        skip_banner: false
      }
    };
  }

  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const fileConfig = JSON.parse(content);
      return this._merge(this.defaults, fileConfig);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return defaults
        return JSON.parse(JSON.stringify(this.defaults));
      }
      throw error;
    }
  }

  _merge(defaults, ...sources) {
    const result = JSON.parse(JSON.stringify(defaults));

    for (const source of sources) {
      if (!source) continue;
      this._deepMerge(result, source);
    }

    return result;
  }

  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  async save(config) {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

module.exports = ConfigManager;
