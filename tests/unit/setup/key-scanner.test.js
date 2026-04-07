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
    test('recognizes valid OpenAI API key with sk-proj- prefix', () => {
      const key = 'sk-proj-' + 'a'.repeat(48);
      const result = scanner.matchProvider(key);

      expect(result).toBe('openai');
    });

    test('recognizes valid Anthropic API key', () => {
      const key = 'sk-ant-api03-' + 'a'.repeat(95);
      const result = scanner.matchProvider(key);

      expect(result).toBe('anthropic');
    });

    test('recognizes valid ElevenLabs API key (32 hex chars)', () => {
      const key = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
      const result = scanner.matchProvider(key);

      expect(result).toBe('elevenlabs');
    });

    test('recognizes valid Cartesia API key (alphanumeric, underscore, hyphen)', () => {
      const key = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6_-x';
      const result = scanner.matchProvider(key);

      expect(result).toBe('cartesia');
    });

    test('recognizes valid Replicate API key (r8_ prefix + 40 chars)', () => {
      const key = 'r8_' + 'a'.repeat(40);
      const result = scanner.matchProvider(key);

      expect(result).toBe('replicate');
    });

    test('recognizes valid Stability AI API key (sk- prefix + 48 chars)', () => {
      const key = 'sk-' + 'a'.repeat(48);
      const result = scanner.matchProvider(key);

      expect(result).toBe('stability');
    });

    test('does not confuse Stability with OpenAI (reordering check)', () => {
      // Stability key should NOT match OpenAI pattern
      const stabilityKey = 'sk-' + 'a'.repeat(48);
      const result = scanner.matchProvider(stabilityKey);

      expect(result).toBe('stability');
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

  describe('redactKey', () => {
    test('redacts long keys (>13 chars) with first 10 and last 3', () => {
      const key = 'sk-proj-abcdefghijklmnopqrst';
      const redacted = scanner.redactKey(key);

      expect(redacted).toBe('sk-proj-ab...rst');
      expect(redacted).toContain('...');
    });

    test('does not redact short keys (<=13 chars)', () => {
      const key = 'short-key-123';
      const redacted = scanner.redactKey(key);

      expect(redacted).toBe(key);
      expect(redacted).not.toContain('...');
    });

    test('does not redact key exactly 13 characters', () => {
      const key = 'exactly13char';
      const redacted = scanner.redactKey(key);

      expect(redacted).toBe(key);
    });

    test('redacts a long OpenAI key correctly', () => {
      const key = 'sk-proj-' + 'a'.repeat(48);
      const redacted = scanner.redactKey(key);

      expect(redacted.length).toBe(16); // 10 + '...' + 3
      expect(redacted).toMatch(/^sk-proj-aa\.\.\.aaa$/);
    });
  });

  describe('scanEnvironment', () => {
    test('finds valid API keys in process.env', () => {
      const originalEnv = process.env;
      process.env = {
        OPENAI_API_KEY: 'sk-proj-' + 'a'.repeat(48),
        ANTHROPIC_API_KEY: 'sk-ant-api03-' + 'b'.repeat(95)
      };

      const keys = scanner.scanEnvironment();

      expect(keys.length).toBe(2);
      expect(keys.some(k => k.provider === 'openai')).toBe(true);
      expect(keys.some(k => k.provider === 'anthropic')).toBe(true);
      expect(keys.every(k => k.source === 'environment')).toBe(true);
      expect(keys.every(k => k.label === 'shell-env')).toBe(true);

      process.env = originalEnv;
    });

    test('returns empty array if no valid keys in process.env', () => {
      const originalEnv = process.env;
      process.env = {
        RANDOM_VAR: 'random-value'
      };

      const keys = scanner.scanEnvironment();

      expect(keys.length).toBe(0);

      process.env = originalEnv;
    });

    test('ignores invalid keys that do not match patterns', () => {
      const originalEnv = process.env;
      process.env = {
        OPENAI_API_KEY: 'invalid-key',
        ANTHROPIC_API_KEY: 'sk-ant-api03-' + 'b'.repeat(95)
      };

      const keys = scanner.scanEnvironment();

      expect(keys.length).toBe(1);
      expect(keys[0].provider).toBe('anthropic');

      process.env = originalEnv;
    });

    test('scans all provider environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ELEVENLABS_API_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        REPLICATE_API_TOKEN: 'r8_' + 'x'.repeat(40),
        STABILITY_API_KEY: 'sk-' + 'y'.repeat(48),
        CARTESIA_API_KEY: 'cart' + 'e'.repeat(32)
      };

      const keys = scanner.scanEnvironment();

      expect(keys.length).toBe(4);
      expect(keys.find(k => k.provider === 'elevenlabs')).toBeDefined();
      expect(keys.find(k => k.provider === 'replicate')).toBeDefined();
      expect(keys.find(k => k.provider === 'stability')).toBeDefined();
      expect(keys.find(k => k.provider === 'cartesia')).toBeDefined();

      process.env = originalEnv;
    });
  });
});
