const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');

class ProjectWatcher {
  constructor(db, configManager, wsServer = null) {
    this.db = db;
    this.configManager = configManager;
    this.wsServer = wsServer;
    this.watcher = null;
    this.debounceTimers = new Map();

    this.manifests = {
      'package.json': {
        type: 'node',
        parser: async (content) => JSON.parse(content).name
      },
      'pyproject.toml': {
        type: 'python',
        parser: async (content) => {
          // Simple TOML parsing for project name
          const match = content.match(/\[project\][\s\S]*?name\s*=\s*"([^"]+)"/);
          return match ? match[1] : null;
        }
      },
      'go.mod': {
        type: 'go',
        parser: async (content) => {
          const match = content.match(/^module\s+(.+)$/m);
          return match ? match[1] : null;
        }
      },
      'Cargo.toml': {
        type: 'rust',
        parser: async (content) => {
          const match = content.match(/\[package\][\s\S]*?name\s*=\s*"([^"]+)"/);
          return match ? match[1] : null;
        }
      },
      'composer.json': {
        type: 'php',
        parser: async (content) => JSON.parse(content).name
      },
      'Gemfile': {
        type: 'ruby',
        parser: async () => null // Use directory name
      }
    };
  }

  async identifyProject(manifestPath) {
    const fileName = path.basename(manifestPath);
    const dir = path.dirname(manifestPath);
    const manifest = this.manifests[fileName];

    if (!manifest) {
      throw new Error(`Unknown manifest file: ${fileName}`);
    }

    let projectName = null;

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      projectName = await manifest.parser(content);
    } catch (error) {
      console.warn(`Couldn't parse ${manifestPath}: ${error.message}`);
    }

    // Fallback to directory name
    if (!projectName) {
      projectName = path.basename(dir);
    }

    // Normalize name (replace @ and / with -, trim leading/trailing dashes)
    projectName = projectName.replace(/[@\/]/g, '-').replace(/^-+|-+$/g, '');

    return {
      name: projectName,
      path: dir,
      type: manifest.type,
      manifest_file: fileName
    };
  }

  async start(watchDirs) {
    if (this.watcher) {
      console.warn('[ProjectWatcher] Already watching');
      return;
    }

    if (!watchDirs || watchDirs.length === 0) {
      console.log('[ProjectWatcher] No directories to watch');
      return;
    }

    try {
      this.watcher = chokidar.watch(watchDirs, {
        ignored: /(^|[\/\\])\.|node_modules|\.venv|venv|target|build|dist/,
        persistent: true,
        depth: 3,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      this.watcher.on('add', (filePath) => this._handleFileAdded(filePath));
      this.watcher.on('error', (error) => {
        console.error('[ProjectWatcher] Error:', error.message);
      });

      console.log(`[ProjectWatcher] Watching ${watchDirs.length} directories`);
    } catch (error) {
      console.error('[ProjectWatcher] Failed to start:', error.message);
      this.watcher = null;
    }
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[ProjectWatcher] Stopped');
    }
  }

  async _handleFileAdded(filePath) {
    const fileName = path.basename(filePath);

    if (!this.manifests[fileName]) {
      return; // Not a manifest file
    }

    const dir = path.dirname(filePath);

    // Debounce: wait 500ms for file writes to complete
    if (this.debounceTimers.has(dir)) {
      clearTimeout(this.debounceTimers.get(dir));
    }

    this.debounceTimers.set(dir, setTimeout(async () => {
      try {
        const project = await this.identifyProject(filePath);

        // Check if project already exists
        const existing = await this.db.getProject(project.path);

        if (!existing) {
          await this.db.createProject({
            name: project.name,
            path: project.path,
            type: project.type,
            manifest_file: project.manifest_file,
            auto_detected: 1,
            detected_at: new Date().toISOString()
          });

          console.log(`[ProjectWatcher] New project detected: ${project.name} (${project.type})`);

          // Emit WebSocket event
          if (this.wsServer) {
            this.wsServer.emit('project_detected', project);
          }
        }
      } catch (error) {
        console.warn(`[ProjectWatcher] Couldn't process ${filePath}: ${error.message}`);
      }

      this.debounceTimers.delete(dir);
    }, 500));
  }
}

module.exports = ProjectWatcher;
