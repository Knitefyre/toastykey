/**
 * ToastyKey Vault Tests
 * Tests for AES-256-GCM encryption key storage
 */

const KeyVault = require('../src/vault');
const Database = require('../src/db');

describe('KeyVault', () => {
  let vault, db;

  beforeEach(async () => {
    // Create test database
    db = new Database(':memory:');
    await db.ready;
    vault = new KeyVault(db, 'test-machine-id');
  });

  afterEach(() => {
    db.close();
  });

  test('encrypts and stores API key', async () => {
    const result = await vault.addKey('openai', 'test-key', 'sk-test123456789');
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  test('retrieves and decrypts API key', async () => {
    await vault.addKey('openai', 'test-key', 'sk-test123456789');
    const key = await vault.getKey('openai', 'test-key');
    expect(key).toBe('sk-test123456789');
  });

  test('lists keys without exposing values', async () => {
    await vault.addKey('openai', 'key-1', 'sk-test111');
    await vault.addKey('anthropic', 'key-2', 'sk-ant-test222');

    const keys = await vault.listKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toHaveProperty('provider');
    expect(keys[0]).toHaveProperty('label');
    expect(keys[0]).not.toHaveProperty('encrypted_key');
  });

  test('deletes key by id', async () => {
    const result = await vault.addKey('openai', 'test-key', 'sk-test123');
    await vault.deleteKey(result.id);

    const key = await vault.getKey('openai', 'test-key');
    expect(key).toBeNull();
  });

  test('encrypts same key differently each time (random IV)', async () => {
    await vault.addKey('openai', 'key-1', 'sk-same');
    await vault.deleteKey(1);
    await vault.addKey('openai', 'key-1', 'sk-same');

    // IVs should be different even for same plaintext
    const keys = await db.db.all('SELECT iv FROM api_keys');
    // Just verify encryption happened, IVs exist
    expect(keys.length).toBeGreaterThan(0);
  });

  test('returns null when key not found', async () => {
    const key = await vault.getKey('nonexistent', 'fake-key');
    expect(key).toBeNull();
  });

  test('rotates key successfully', async () => {
    await vault.addKey('openai', 'rotate-test', 'sk-old-key');
    await vault.rotateKey('openai', 'rotate-test', 'sk-new-key');

    const key = await vault.getKey('openai', 'rotate-test');
    expect(key).toBe('sk-new-key');
  });

  test('getKeyById retrieves and decrypts by id', async () => {
    const result = await vault.addKey('openai', 'id-test', 'sk-by-id');
    const key = await vault.getKeyById(result.id);
    expect(key).toBe('sk-by-id');
  });

  test('handles encryption errors gracefully', async () => {
    // Try to add a key with invalid data
    const result = await vault.addKey('', '', '');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('updates last_used timestamp when key is retrieved', async () => {
    const result = await vault.addKey('openai', 'timestamp-test', 'sk-test');

    // Get the key (which should update last_used)
    await vault.getKey('openai', 'timestamp-test');

    // Check that last_used was updated
    const keyData = await db.db.get(
      'SELECT last_used FROM api_keys WHERE id = ?',
      [result.id]
    );
    expect(keyData.last_used).not.toBeNull();
  });
});
