const ProjectWatcher = require('../../../src/setup/ProjectWatcher');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ProjectWatcher', () => {
  let watcher;
  let mockDb;
  let mockConfigManager;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toastykey-test-'));

    mockDb = {
      getProject: jest.fn(),
      createProject: jest.fn()
    };

    mockConfigManager = {};

    watcher = new ProjectWatcher(mockDb, mockConfigManager);
  });

  afterEach(async () => {
    if (watcher.watcher) {
      await watcher.stop();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('identifyProject', () => {
    test('identifies Node.js project from package.json', async () => {
      const packagePath = path.join(tempDir, 'package.json');
      await fs.writeFile(packagePath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }), 'utf-8');

      const project = await watcher.identifyProject(packagePath);

      expect(project.name).toBe('test-project');
      expect(project.type).toBe('node');
      expect(project.manifest_file).toBe('package.json');
      expect(project.path).toBe(tempDir);
    });

    test('normalizes scoped package names', async () => {
      const packagePath = path.join(tempDir, 'package.json');
      await fs.writeFile(packagePath, JSON.stringify({
        name: '@scope/package',
        version: '1.0.0'
      }), 'utf-8');

      const project = await watcher.identifyProject(packagePath);

      expect(project.name).toBe('scope-package');
    });

    test('falls back to directory name if no name in manifest', async () => {
      const projectDir = path.join(tempDir, 'my-project');
      await fs.mkdir(projectDir);

      const gemfilePath = path.join(projectDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n', 'utf-8');

      const project = await watcher.identifyProject(gemfilePath);

      expect(project.name).toBe('my-project');
      expect(project.type).toBe('ruby');
    });
  });
});
