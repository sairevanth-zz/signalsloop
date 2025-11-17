/**
 * Token Encryption/Decryption for Jira OAuth
 *
 * Provides secure AES-256-GCM encryption for storing OAuth tokens.
 * SECURITY CRITICAL: Never store access/refresh tokens in plain text.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Gets the encryption key from environment variables.
 * Must be exactly 32 bytes (256 bits) for AES-256.
 *
 * @throws Error if ENCRYPTION_KEY is not set or is invalid length
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Convert to buffer and ensure it's exactly 32 bytes
  const keyBuffer = Buffer.from(key, 'utf-8');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH} characters). ` +
      `Current length: ${keyBuffer.length} bytes. ` +
      `Generate a new key with: openssl rand -hex 32`
    );
  }

  return keyBuffer;
}

/**
 * Encrypts a token using AES-256-GCM.
 *
 * Returns format: {iv}:{authTag}:{encryptedData}
 * All parts are hex-encoded for safe database storage.
 *
 * @param token - The plain text token to encrypt
 * @returns Encrypted token string in format "iv:authTag:encrypted"
 *
 * @example
 * const encrypted = encryptToken('my-secret-access-token');
 * // Returns: "3a4b5c....:1f2e3d....:9a8b7c...."
 */
export function encryptToken(token: string): string {
  if (!token) {
    throw new Error('Token cannot be empty');
  }

  const key = getEncryptionKey();

  // Generate random IV (initialization vector)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the token
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag for GCM mode
  const authTag = cipher.getAuthTag();

  // Return combined string: iv:authTag:encrypted
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}

/**
 * Decrypts a token encrypted with encryptToken().
 *
 * @param encryptedData - Encrypted token in format "iv:authTag:encrypted"
 * @returns Decrypted plain text token
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 *
 * @example
 * const decrypted = decryptToken('3a4b5c....:1f2e3d....:9a8b7c....');
 * // Returns: "my-secret-access-token"
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }

  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted data format. Expected "iv:authTag:encrypted"'
    );
  }

  const [ivHex, authTagHex, encrypted] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length} bytes`);
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: ${authTag.length} bytes`);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag for GCM mode
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Don't expose internal error details for security
    throw new Error(
      'Failed to decrypt token. Data may be corrupted or encryption key may have changed.'
    );
  }
}

/**
 * Generates a random encryption key suitable for AES-256-GCM.
 *
 * Use this to generate the ENCRYPTION_KEY environment variable.
 * Store the result securely in your .env file.
 *
 * @returns 32-byte random string (hex encoded for readability)
 *
 * @example
 * const key = generateEncryptionKey();
 * console.log(`ENCRYPTION_KEY=${key}`);
 * // ENCRYPTION_KEY=a1b2c3d4e5f6... (64 hex characters = 32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex').slice(0, KEY_LENGTH);
}

/**
 * Validates that the encryption key is properly configured.
 *
 * @returns true if key is valid, throws error otherwise
 * @throws Error if key is invalid
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Tests encryption/decryption roundtrip to ensure it's working correctly.
 *
 * @returns true if test passes, throws error otherwise
 * @throws Error if encryption/decryption fails
 */
export function testEncryption(): boolean {
  const testToken = 'test-token-' + Date.now();
  const encrypted = encryptToken(testToken);
  const decrypted = decryptToken(encrypted);

  if (decrypted !== testToken) {
    throw new Error('Encryption test failed: decrypted value does not match original');
  }

  return true;
}
