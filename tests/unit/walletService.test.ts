import { encryptPrivateKey, decryptPrivateKey, generateWallet } from '../../src/services/walletService';

describe('walletService', () => {
  describe('encryptPrivateKey / decryptPrivateKey', () => {
    it('round-trips a private key through encrypt → decrypt', () => {
      const privateKey = '0x' + 'a'.repeat(64);
      const encrypted = encryptPrivateKey(privateKey);
      expect(decryptPrivateKey(encrypted)).toBe(privateKey);
    });

    it('produces different ciphertext for the same input (random IV)', () => {
      const privateKey = '0x' + 'b'.repeat(64);
      const first = encryptPrivateKey(privateKey);
      const second = encryptPrivateKey(privateKey);
      expect(first).not.toBe(second);
    });

    it('stores ciphertext as <hex-iv>:<hex-ciphertext>', () => {
      const encrypted = encryptPrivateKey('0x' + 'c'.repeat(64));
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[0-9a-f]{32}$/); // 16-byte IV = 32 hex chars
      expect(parts[1]).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateWallet', () => {
    it('returns a valid Ethereum address and encrypted key', () => {
      const wallet = generateWallet();
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(wallet.privateKeyEncrypted).toContain(':');
    });

    it('generates a unique address each time', () => {
      const a = generateWallet();
      const b = generateWallet();
      expect(a.address).not.toBe(b.address);
    });

    it('encrypted private key can be decrypted to a valid 32-byte hex key', () => {
      const { privateKeyEncrypted } = generateWallet();
      const decrypted = decryptPrivateKey(privateKeyEncrypted);
      // ethers private keys are 0x + 64 hex chars
      expect(decrypted).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });
  });
});
