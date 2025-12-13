/**
 * Token Encryption/Decryption
 *
 * Provides secure AES-256-GCM encryption for storing OAuth tokens.
 * Re-exports from Jira encryption module for shared use.
 */

export {
    encryptToken,
    decryptToken,
    generateEncryptionKey,
    validateEncryptionKey,
    testEncryption
} from './jira/encryption';
