const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const KeyScanner = require('../../../src/setup/KeyScanner');
const ConfigManager = require('../../../src/setup/ConfigManager');

describe('KeyScanner', () => {
  let scanner;
  let configManager;
  let tempDir;

  beforeEach(async () => {
    configManager = new ConfigManager(':memory:');
    scanner = new KeyScanner(configManager);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toastykey-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('pattern matching', () => {
    test('recognizes valid OpenAI API key', () => {
      const key = 'sk-proj-' + 'a'.repeat(48);
      const result = scanner.matchProvider(key);

      expect(result).toBe('openai');
    });

    test('recognizes valid Anthropic API key', () => {
      const key = 'sk-ant-api03-' + 'a'.repeat(95);
      const result = scanner.matchProvider(key);

      expect(result).toBe('anthropic');
    });

    test('returns null for invalid key', () => {
      const key = 'invalid-key-123';
      const result = scanner.matchProvider(key);

      expect(result).toBeNull();
    });
  });

  describe('parseEnvFile', () => {
    test('parses valid .env file with API keys', async () => {
      const envPath = path.join(tempDir, '.env');
      const envContent = `
# Comment line
OPENAI_API_KEY=sk-proj-${'a'.repeat(48)}
ANTHROPIC_API_KEY=sk-ant-api03-${'b'.repeat(95)}
OTHER_VAR=something
`.trim();

      await fs.writeFile(envPath, envContent, 'utf-8');

      const keys = await scanner.parseEnvFile(envPath);

      expect(keys.length).toBe(2);
      expect(keys[0].provider).toBe('openai');
      expect(keys[0].key).toContain('sk-proj-');
      expect(keys[0].source).toBe(envPath);
      expect(keys[1].provider).toBe('anthropic');
    });

    test('skips invalid lines in .env file', async () => {
      const envPath = path.join(tempDir, '.env');
      const envContent = `
OPENAI_API_KEY=sk-proj-${'a'.repeat(48)}
INVALID LINE WITHOUT EQUALS
EMPTY_VALUE=
`.trim();

      await fs.writeFile(envPath, envContent, 'utf-8');

      const keys = await scanner.parseEnvFile(envPath);

      expect(keys.length).toBe(1);
      expect(keys[0].provider).toBe('openai');
    });
  });

  describe('scanPaths', () => {
    test('scans directory for .env files', async () => {
      // Create test structure
      await fs.mkdir(path.join(tempDir, 'project1'));
      await fs.mkdir(path.join(tempDir, 'project2'));

      await fs.writeFile(
        path.join(tempDir, 'project1', '.env'),
        `OPENAI_API_KEY=sk-proj-${'a'.repeat(48)}`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(tempDir, 'project2', '.env.local'),
        `ANTHROPIC_API_KEY=sk-ant-api03-${'b'.repeat(95)}`,
        'utf-8'
      );

      const keys = await scanner.scanPaths([tempDir]);

      expect(keys.length).toBe(2);
      expect(keys.find(k => k.provider === 'openai')).toBeDefined();
      expect(keys.find(k => k.provider === 'anthropic')).toBeDefined();
    });

    test('respects .gitignore files', async () => {
      await fs.mkdir(path.join(tempDir, 'ignored'));

      await fs.writeFile(
        path.join(tempDir, '.gitignore'),
        'ignored/\n',
        'utf-8'
      );

      await fs.writeFile(
        path.join(tempDir, 'ignored', '.env'),
        `OPENAI_API_KEY=sk-proj-${'a'.repeat(48)}`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(tempDir, '.env'),
        `ANTHROPIC_API_KEY=sk-ant-api03-${'b'.repeat(95)}`,
        'utf-8'
      );

      const keys = await scanner.scanPaths([tempDir]);

      expect(keys.length).toBe(1);
      expect(keys[0].provider).toBe('anthropic');
    });
  });
});
