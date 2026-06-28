import { describe, expect, it } from "vitest";
import {
  type Credential,
  type CredentialEncryptionPort,
  type CredentialRepository,
  type CredentialStatus,
  type Provider,
  type ProviderValidationPort,
  validateAndSaveCredential,
  loadCredentialStatuses,
} from "../src/credential-management.js";

class InMemoryCredentialRepository implements CredentialRepository {
  private readonly store = new Map<Provider, Credential>();

  async loadAll(): Promise<Credential[]> {
    return [...this.store.values()];
  }

  async load(provider: Provider): Promise<Credential | undefined> {
    return this.store.get(provider);
  }

  async save(credential: Credential): Promise<void> {
    this.store.set(credential.provider, credential);
  }
}

class FakeEncryption implements CredentialEncryptionPort {
  async encrypt(plaintext: string) {
    return { encrypted: btoa(plaintext), nonce: "0000" };
  }

  async decrypt(encrypted: string, _nonce: string) {
    return atob(encrypted);
  }
}

function stubValidator(status: CredentialStatus = "healthy") {
  const validator: ProviderValidationPort = {
    validate: async (_provider, _secret) => {
      if (status === "healthy") return { ok: true, status: "healthy" };
      return {
        ok: false,
        error: `Validation failed with status ${status}`,
      };
    },
  };
  return validator;
}

describe("validateAndSaveCredential", () => {
  it("encrypts, stores, and returns a status view for a valid credential", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    const result = await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "MiniMax",
      "sk-minimax-key-7H2K",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.configured).toBe(true);
    expect(result.view.hint).toBe("•••• 7H2K");
    expect(result.view.status).toBe("healthy");

    const stored = await repo.load("MiniMax");
    expect(stored).toBeDefined();
    expect(stored?.encryptedSecret).not.toContain("sk-minimax-key-7H2K");
  });

  it("rejects a credential shorter than 6 characters", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    const result = await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "Tavily",
      "abc",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("6 characters");
    expect(result.status).toBe("invalid");
  });

  it("preserves a previously valid credential when validation fails", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();

    await validateAndSaveCredential(
      repo,
      encryption,
      stubValidator("healthy"),
      "MiniMax",
      "valid-key-ABCD",
    );

    const result2 = await validateAndSaveCredential(
      repo,
      encryption,
      stubValidator("invalid"),
      "MiniMax",
      "invalid-key",
    );

    expect(result2.ok).toBe(false);
    if (result2.ok) return;
    expect(result2.error).toContain("preserved");

    const stored = await repo.load("MiniMax");
    expect(stored?.status).toBe("healthy");
  });

  it("does not preserve when no previously valid credential exists", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("invalid");

    const result = await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "Tavily",
      "invalid-key",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toContain("preserved");
    expect(result.status).toBe("missing");
  });

  it("trims whitespace from the secret before validation", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    const result = await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "MiniMax",
      "  sk-key-with-spaces  ",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.hint).toBe("•••• ACES");
  });

  it("replaces an existing valid credential when the new one is also valid", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "Tavily",
      "first-key-XXXX",
    );

    const result2 = await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "Tavily",
      "second-key-YYYY",
    );

    expect(result2.ok).toBe(true);

    const stored = await repo.load("Tavily");
    expect(stored?.encryptedSecret).toBe(btoa("second-key-YYYY"));
  });
});

describe("loadCredentialStatuses", () => {
  it("returns one entry per provider with correct configuration status", async () => {
    const repo = new InMemoryCredentialRepository();
    const statuses = await loadCredentialStatuses(repo);

    expect(statuses).toHaveLength(2);
    expect(statuses.find((s) => s.provider === "MiniMax")?.configured).toBe(
      false,
    );
    expect(statuses.find((s) => s.provider === "Tavily")?.configured).toBe(
      false,
    );
  });

  it("includes configured status for stored credentials", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "MiniMax",
      "valid-key-7H2K",
    );

    const statuses = await loadCredentialStatuses(repo);
    const miniMax = statuses.find((s) => s.provider === "MiniMax");
    expect(miniMax?.configured).toBe(true);
    expect(miniMax?.status).toBe("healthy");
    expect(miniMax?.hint).toBe("•••• 7H2K");
  });

  it("never returns the plaintext secret in status views", async () => {
    const repo = new InMemoryCredentialRepository();
    const encryption = new FakeEncryption();
    const validator = stubValidator("healthy");

    await validateAndSaveCredential(
      repo,
      encryption,
      validator,
      "MiniMax",
      "super-secret-key",
    );

    const statuses = await loadCredentialStatuses(repo);
    const view = JSON.stringify(statuses);
    expect(view).not.toContain("super-secret-key");
    expect(view).toContain("••••");
  });
});
