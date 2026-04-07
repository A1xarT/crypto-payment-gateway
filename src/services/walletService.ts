import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { config } from '../config';

/**
 * Returns the 32-byte AES encryption key.
 *
 * Priority:
 *   1. ENCRYPTION_KEY env var — must be exactly 64 hex chars (32 bytes).
 *      Generate with: openssl rand -hex 32
 *   2. Fallback: SHA-256 of JWT_SECRET (backwards-compatible, NOT recommended for prod).
 */
function deriveEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error(
        'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
        'Generate one with: openssl rand -hex 32'
      );
    }
    return Buffer.from(raw, 'hex');
  }
  // Fallback — warns at startup, acceptable for dev, not production
  return createHash('sha256').update(config.jwt.secret).digest();
}

export interface GeneratedWallet {
  address: string;
  privateKeyEncrypted: string;
}

/**
 * Creates a fresh Ethereum wallet and returns the public address together
 * with the AES-256-CBC encrypted private key.
 *
 * Stored format: <hex-iv>:<hex-ciphertext>
 */
export function generateWallet(): GeneratedWallet {
  const wallet = ethers.Wallet.createRandom();
  const privateKeyEncrypted = encryptPrivateKey(wallet.privateKey);
  return { address: wallet.address, privateKeyEncrypted };
}

export function encryptPrivateKey(privateKey: string): string {
  const key = deriveEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPrivateKey(encryptedValue: string): string {
  const [ivHex, ciphertextHex] = encryptedValue.split(':');
  const key = deriveEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
