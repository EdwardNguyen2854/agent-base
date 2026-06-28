import { describe, expect, it } from "vitest";
import { Aes256GcmEncryption } from "../src/index.js";

const MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Aes256GcmEncryption", () => {
  it("encrypts and decrypts a secret", async () => {
    const encryption = new Aes256GcmEncryption(MASTER_KEY);
    const original = "sk-minimax-key-7H2K";

    const { encrypted, nonce } = await encryption.encrypt(original);
    expect(encrypted).toBeTruthy();
    expect(nonce).toBeTruthy();
    expect(encrypted).not.toContain(original);

    const decrypted = await encryption.decrypt(encrypted, nonce);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each time for the same plaintext", async () => {
    const encryption = new Aes256GcmEncryption(MASTER_KEY);

    const a = await encryption.encrypt("same-value");
    const b = await encryption.encrypt("same-value");

    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("rejects tampered ciphertext", async () => {
    const encryption = new Aes256GcmEncryption(MASTER_KEY);

    const { encrypted, nonce } = await encryption.encrypt("secret-value");
    const tampered = encrypted.slice(0, -4) + "dead";

    await expect(encryption.decrypt(tampered, nonce)).rejects.toThrow();
  });

  it("rejects decryption with a different key", async () => {
    const encryptionA = new Aes256GcmEncryption(MASTER_KEY);
    const encryptionB = new Aes256GcmEncryption(
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    );

    const { encrypted, nonce } = await encryptionA.encrypt("cross-key-test");
    await expect(encryptionB.decrypt(encrypted, nonce)).rejects.toThrow();
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => new Aes256GcmEncryption("tooshort")).toThrow(
      /32 bytes|64 hex/i,
    );
  });
});
