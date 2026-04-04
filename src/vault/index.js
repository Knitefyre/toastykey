/**
 * ToastyKey Vault - Secure Key Storage
 * Uses AES-256-GCM encryption for API key storage
 */

const crypto = require('crypto');

class KeyVault {
  constructor(database, machineId) {
    this.db = database;
    this.machineId = machineId;
    // Derive master key from machine ID using scrypt
    this.masterKey = crypto.scryptSync(machineId, 'toastykey-salt', 32);
  }

  /**
   * Encrypt and store an API key
   * @param {string} provider - Provider name (e.g., 'openai', 'anthropic')
   * @param {string} label - Human-readable label for the key
   * @param {string} apiKey - The plain API key to encrypt and store
   * @returns {Promise<{success: boolean, id?: number, error?: string}>}
   */
  async addKey(provider, label, apiKey) {
    try {
      // Validate inputs
      if (!provider || !label || !apiKey) {
        return {
          success: false,
          error: 'Provider, label, and apiKey are required'
        };
      }

      // Generate a random 16-byte IV for AES-256-GCM
      const iv = crypto.randomBytes(16);

      // Create cipher with AES-256-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

      // Encrypt the API key
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get the authentication tag for integrity verification
      const authTag = cipher.getAuthTag();

      // Store encrypted data in database
      const id = await this.db.addApiKey({
        provider,
        label,
        encrypted_key: encrypted,
        iv: iv.toString('hex'),
        auth_tag: authTag.toString('hex')
      });

      return {
        success: true,
        id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve and decrypt an API key
   * @param {string} provider - Provider name
   * @param {string} label - Key label
   * @returns {Promise<string|null>} - Decrypted API key or null if not found
   */
  async getKey(provider, label) {
    try {
      // Retrieve encrypted key from database
      const keyData = await this.db.getApiKey(provider, label);

      if (!keyData) {
        return null;
      }

      // Decrypt the key
      const decrypted = this._decrypt(keyData);

      // Update last_used timestamp
      await this.db.updateKeyLastUsed(keyData.id);

      return decrypted;
    } catch (error) {
      // Log error but don't expose details
      console.error('Error retrieving key:', error.message);
      return null;
    }
  }

  /**
   * List all stored keys (metadata only, no decrypted values)
   * @returns {Promise<Array>} - Array of key metadata
   */
  async listKeys() {
    try {
      return await this.db.listApiKeys();
    } catch (error) {
      console.error('Error listing keys:', error.message);
      return [];
    }
  }

  /**
   * Delete a key by ID
   * @param {number} id - Key ID
   * @returns {Promise<boolean>} - True if deleted, false otherwise
   */
  async deleteKey(id) {
    try {
      await this.db.deleteApiKey(id);
      return true;
    } catch (error) {
      console.error('Error deleting key:', error.message);
      return false;
    }
  }

  /**
   * Rotate a key by replacing it with a new value
   * @param {string} provider - Provider name
   * @param {string} label - Key label
   * @param {string} newApiKey - New API key value
   * @returns {Promise<{success: boolean, id?: number, error?: string}>}
   */
  async rotateKey(provider, label, newApiKey) {
    try {
      // Get the old key to find its ID
      const oldKeyData = await this.db.getApiKey(provider, label);

      if (oldKeyData) {
        // Delete the old key
        await this.deleteKey(oldKeyData.id);
      }

      // Add the new key with the same provider/label
      return await this.addKey(provider, label, newApiKey);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve and decrypt a key by ID
   * @param {number} id - Key ID
   * @returns {Promise<string|null>} - Decrypted API key or null if not found
   */
  async getKeyById(id) {
    try {
      // Get key data from database by ID
      const keyData = await this.db.db.get(
        'SELECT * FROM api_keys WHERE id = ?',
        [id]
      );

      if (!keyData) {
        return null;
      }

      // Decrypt the key
      const decrypted = this._decrypt(keyData);

      // Update last_used timestamp
      await this.db.updateKeyLastUsed(id);

      return decrypted;
    } catch (error) {
      console.error('Error retrieving key by ID:', error.message);
      return null;
    }
  }

  /**
   * Internal method to decrypt key data
   * @private
   * @param {Object} keyData - Key data from database
   * @returns {string} - Decrypted API key
   */
  _decrypt(keyData) {
    // Convert hex strings back to buffers
    const iv = Buffer.from(keyData.iv, 'hex');
    const authTag = Buffer.from(keyData.auth_tag, 'hex');
    const encrypted = keyData.encrypted_key;

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);

    // Set the authentication tag for integrity verification
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = KeyVault;
