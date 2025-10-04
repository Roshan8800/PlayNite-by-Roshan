import { securityManager } from '../core/SecurityManager';

/**
 * Encryption Algorithm Types
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES-256-GCM',
  AES_128_GCM = 'AES-128-GCM',
  CHACHA20_POLY1305 = 'ChaCha20-Poly1305'
}

/**
 * Data Classification Levels
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

/**
 * Key Management Interface
 */
interface EncryptionKey {
  id: string;
  algorithm: EncryptionAlgorithm;
  keyData: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  rotationCount: number;
}

/**
 * Encrypted Data Interface
 */
interface EncryptedData {
  data: string;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  iv: string;
  tag: string;
  encryptedAt: Date;
  classification: DataClassification;
}

/**
 * Data Protection Configuration
 */
interface DataProtectionConfig {
  defaultAlgorithm: EncryptionAlgorithm;
  keyRotationDays: number;
  autoRotateKeys: boolean;
  backupKeys: boolean;
  complianceMode: boolean;
}

/**
 * Data Protection Manager
 * Handles encryption, decryption, and data security for PlayNite
 */
export class DataProtectionManager {
  private config: DataProtectionConfig;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private masterKey: string = '';
  private keyRotationTimer?: NodeJS.Timeout;

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeMasterKey();
  }

  /**
   * Initialize the data protection manager
   */
  async initialize(): Promise<void> {
    try {
      // Generate or load master key
      await this.initializeMasterKey();

      // Load existing keys
      await this.loadEncryptionKeys();

      // Start key rotation scheduler if enabled
      if (this.config.autoRotateKeys) {
        this.startKeyRotationScheduler();
      }

      console.log('DataProtectionManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DataProtectionManager:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(
    data: string,
    classification: DataClassification = DataClassification.INTERNAL,
    algorithm?: EncryptionAlgorithm
  ): Promise<EncryptedData> {
    const alg = algorithm || this.config.defaultAlgorithm;
    const key = this.getActiveKey(alg);

    if (!key) {
      throw new Error(`No active encryption key available for algorithm: ${alg}`);
    }

    try {
      // Generate IV and perform encryption
      const iv = this.generateIV();
      const encrypted = await this.performEncryption(data, key.keyData, iv, alg);

      const encryptedData: EncryptedData = {
        data: encrypted.encryptedText,
        keyId: key.id,
        algorithm: alg,
        iv: encrypted.iv,
        tag: encrypted.tag,
        encryptedAt: new Date(),
        classification
      };

      // Log encryption event
      await this.logDataProtectionEvent('DATA_ENCRYPTION', {
        keyId: key.id,
        algorithm: alg,
        classification,
        dataSize: data.length
      });

      return encryptedData;
    } catch (error) {
      await this.logDataProtectionEvent('DATA_ENCRYPTION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        algorithm: alg,
        classification
      });

      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    const key = this.encryptionKeys.get(encryptedData.keyId);

    if (!key) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }

    if (!key.isActive && key.expiresAt && key.expiresAt < new Date()) {
      throw new Error(`Encryption key expired: ${encryptedData.keyId}`);
    }

    try {
      const decrypted = await this.performDecryption(
        encryptedData.data,
        key.keyData,
        encryptedData.iv,
        encryptedData.tag,
        encryptedData.algorithm
      );

      // Log decryption event
      await this.logDataProtectionEvent('DATA_DECRYPTION', {
        keyId: key.id,
        algorithm: encryptedData.algorithm,
        classification: encryptedData.classification
      });

      return decrypted;
    } catch (error) {
      await this.logDataProtectionEvent('DATA_DECRYPTION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId: encryptedData.keyId,
        algorithm: encryptedData.algorithm
      });

      throw error;
    }
  }

  /**
   * Encrypt session data
   */
  async encryptSessionData(sessionData: any): Promise<string> {
    const sessionString = JSON.stringify(sessionData);
    const encrypted = await this.encryptData(
      sessionString,
      DataClassification.INTERNAL,
      EncryptionAlgorithm.AES_256_GCM
    );

    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt session data
   */
  async decryptSessionData(encryptedSessionData: string): Promise<any> {
    const encryptedData = JSON.parse(Buffer.from(encryptedSessionData, 'base64').toString());
    const decryptedString = await this.decryptData(encryptedData);
    return JSON.parse(decryptedString);
  }

  /**
   * Mask sensitive data for display/logging
   */
  maskSensitiveData(data: string, classification: DataClassification): string {
    switch (classification) {
      case DataClassification.PUBLIC:
        return data;
      case DataClassification.INTERNAL:
        return data.length > 4 ? `${data.substring(0, 2)}***${data.substring(data.length - 2)}` : '***';
      case DataClassification.CONFIDENTIAL:
        return data.length > 8 ? `${data.substring(0, 3)}****${data.substring(data.length - 3)}` : '****';
      case DataClassification.RESTRICTED:
        return '***REDACTED***';
      default:
        return '***MASKED***';
    }
  }

  /**
   * Generate data hash for integrity checking
   */
  async generateDataHash(data: string, algorithm: string = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    if (algorithm === 'SHA-256') {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(data: string, expectedHash: string, algorithm: string = 'SHA-256'): Promise<boolean> {
    const actualHash = await this.generateDataHash(data, algorithm);
    return actualHash === expectedHash;
  }

  /**
   * Rotate encryption keys
   */
  async rotateEncryptionKeys(): Promise<void> {
    try {
      const activeKeys = Array.from(this.encryptionKeys.values()).filter(k => k.isActive);

      for (const key of activeKeys) {
        // Generate new key
        const newKey = await this.generateEncryptionKey(key.algorithm);

        // Mark old key as inactive
        key.isActive = false;
        key.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days grace period

        // Store new key
        this.encryptionKeys.set(newKey.id, newKey);

        // Backup old key if enabled
        if (this.config.backupKeys) {
          await this.backupEncryptionKey(key);
        }

        await this.logDataProtectionEvent('KEY_ROTATION', {
          oldKeyId: key.id,
          newKeyId: newKey.id,
          algorithm: key.algorithm
        });
      }

      console.log('Encryption keys rotated successfully');
    } catch (error) {
      await this.logDataProtectionEvent('KEY_ROTATION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Get encryption key status
   */
  getKeyStatus(): Record<string, any> {
    const keys = Array.from(this.encryptionKeys.values());

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      expiredKeys: keys.filter(k => k.expiresAt && k.expiresAt < new Date()).length,
      keysByAlgorithm: keys.reduce((acc, key) => {
        acc[key.algorithm] = (acc[key.algorithm] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const expiredKeys = Array.from(this.encryptionKeys.values())
      .filter(k => k.expiresAt && k.expiresAt < new Date() && !k.isActive);

    for (const key of expiredKeys) {
      this.encryptionKeys.delete(key.id);
    }

    if (expiredKeys.length > 0) {
      await this.logDataProtectionEvent('KEYS_CLEANED', {
        cleanedCount: expiredKeys.length
      });
    }

    return expiredKeys.length;
  }

  /**
   * Private helper methods
   */
  private async initializeMasterKey(): Promise<void> {
    // In production, this would load from secure key management service
    // For now, generate a master key
    const masterKeyData = new Uint8Array(32);
    crypto.getRandomValues(masterKeyData);
    this.masterKey = Array.from(masterKeyData, b => b.toString(16).padStart(2, '0')).join('');
  }

  private async loadEncryptionKeys(): Promise<void> {
    // In production, load keys from secure storage
    // For now, generate initial keys
    const algorithms = [EncryptionAlgorithm.AES_256_GCM, EncryptionAlgorithm.AES_128_GCM];

    for (const algorithm of algorithms) {
      const key = await this.generateEncryptionKey(algorithm);
      this.encryptionKeys.set(key.id, key);
    }
  }

  private async generateEncryptionKey(algorithm: EncryptionAlgorithm): Promise<EncryptionKey> {
    const keyData = await this.deriveKeyFromMaster(algorithm);

    return {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      algorithm,
      keyData,
      createdAt: new Date(),
      isActive: true,
      rotationCount: 0
    };
  }

  private async deriveKeyFromMaster(algorithm: EncryptionAlgorithm): Promise<string> {
    // Derive encryption key from master key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.masterKey),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: algorithm === EncryptionAlgorithm.AES_256_GCM ? 256 : 128 },
      false,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
    return Array.from(new Uint8Array(exportedKey), b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateIV(): string {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    return Array.from(iv, b => b.toString(16).padStart(2, '0')).join('');
  }

  private async performEncryption(
    data: string,
    keyData: string,
    iv: string,
    algorithm: EncryptionAlgorithm
  ): Promise<{ encryptedText: string; iv: string; tag: string }> {
    // Convert hex key data back to bytes
    const keyBytes = new Uint8Array(keyData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    // Import key for encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      'AES-GCM',
      false,
      ['encrypt']
    );

    // Encrypt data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
      },
      cryptoKey,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const tag = encryptedArray.slice(-16); // Last 16 bytes are the auth tag
    const ciphertext = encryptedArray.slice(0, -16); // Rest is ciphertext

    return {
      encryptedText: Array.from(ciphertext, b => b.toString(16).padStart(2, '0')).join(''),
      iv,
      tag: Array.from(tag, b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  private async performDecryption(
    encryptedData: string,
    keyData: string,
    iv: string,
    tag: string,
    algorithm: EncryptionAlgorithm
  ): Promise<string> {
    // Convert hex data back to bytes
    const keyBytes = new Uint8Array(keyData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(encryptedData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const authTag = new Uint8Array(tag.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    // Combine ciphertext and auth tag
    const combinedData = new Uint8Array(ciphertext.length + authTag.length);
    combinedData.set(ciphertext);
    combinedData.set(authTag, ciphertext.length);

    // Import key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      'AES-GCM',
      false,
      ['decrypt']
    );

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
      },
      cryptoKey,
      combinedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  private getActiveKey(algorithm: EncryptionAlgorithm): EncryptionKey | undefined {
    return Array.from(this.encryptionKeys.values())
      .find(key => key.algorithm === algorithm && key.isActive);
  }

  private async backupEncryptionKey(key: EncryptionKey): Promise<void> {
    // In production, backup to secure storage
    console.log(`Backing up key: ${key.id}`);
  }

  private async logDataProtectionEvent(event: string, metadata: Record<string, any>): Promise<void> {
    // Log through security manager
    console.log('Data Protection Event:', { event, metadata });
  }

  private startKeyRotationScheduler(): void {
    const rotationInterval = this.config.keyRotationDays * 24 * 60 * 60 * 1000;

    this.keyRotationTimer = setInterval(async () => {
      try {
        await this.rotateEncryptionKeys();
      } catch (error) {
        console.error('Scheduled key rotation failed:', error);
      }
    }, rotationInterval);
  }

  private getDefaultConfig(): DataProtectionConfig {
    return {
      defaultAlgorithm: EncryptionAlgorithm.AES_256_GCM,
      keyRotationDays: 90,
      autoRotateKeys: true,
      backupKeys: true,
      complianceMode: true
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<DataProtectionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.autoRotateKeys && !this.keyRotationTimer) {
      this.startKeyRotationScheduler();
    } else if (!newConfig.autoRotateKeys && this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = undefined;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DataProtectionConfig {
    return { ...this.config };
  }
}