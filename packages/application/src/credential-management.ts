import { randomUUID } from "node:crypto";
import {
  PROVIDERS,
  type Credential,
  type CredentialStatus,
  type CredentialStatusView,
  createCredentialHint,
  type Provider,
} from "@agent-base/domain/credential.js";

export type { Credential, CredentialStatus, CredentialStatusView, Provider };
export { PROVIDERS };

export interface CredentialRepository {
  loadAll(): Promise<Credential[]>;
  load(provider: Provider): Promise<Credential | undefined>;
  save(credential: Credential): Promise<void>;
}

export interface CredentialEncryptionPort {
  encrypt(plaintext: string): Promise<{ encrypted: string; nonce: string }>;
  decrypt(encrypted: string, nonce: string): Promise<string>;
}

export interface ProviderValidationPort {
  validate(
    provider: Provider,
    secret: string,
  ): Promise<{ ok: true; status: CredentialStatus } | { ok: false; error: string }>;
}

export class CredentialValidationError extends Error {
  constructor(
    readonly provider: Provider,
    message: string,
  ) {
    super(message);
    this.name = "CredentialValidationError";
  }
}

export async function validateAndSaveCredential(
  repository: CredentialRepository,
  encryption: CredentialEncryptionPort,
  validator: ProviderValidationPort,
  provider: Provider,
  secret: string,
): Promise<
  | { ok: true; view: CredentialStatusView }
  | { ok: false; error: string; status: CredentialStatus }
> {
  const trimmed = secret.trim();
  if (trimmed.length < 6) {
    return {
      ok: false,
      error: "Credential must be at least 6 characters",
      status: "invalid",
    };
  }

  const existing = await repository.load(provider);
  const validation = await validator.validate(provider, trimmed);
  if (!validation.ok) {
    const preserved = existing?.status === "healthy";
    return {
      ok: false,
      error: preserved
        ? `${validation.error} The previous valid credential has been preserved.`
        : validation.error,
      status: existing?.status ?? "missing",
    };
  }

  if (validation.status !== "healthy") {
    if (existing && existing.status === "healthy") {
      return {
        ok: false,
        error: `Invalid ${provider} credential. The previous valid credential has been preserved.`,
        status: "healthy",
      };
    }
    return {
      ok: false,
      error: `Invalid ${provider} credential.`,
      status: validation.status,
    };
  }

  const hint = createCredentialHint(trimmed);
  const { encrypted, nonce } = await encryption.encrypt(trimmed);
  const now = new Date();
  const credential: Credential = {
    id: existing?.id ?? randomUUID(),
    provider,
    encryptedSecret: encrypted,
    nonce,
    hint,
    status: "healthy",
    validatedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await repository.save(credential);
  return {
    ok: true,
    view: toStatusView(credential),
  };
}

export async function loadCredentialStatuses(
  repository: CredentialRepository,
): Promise<CredentialStatusView[]> {
  const credentials = await repository.loadAll();
  return PROVIDERS.map((provider) => {
    const credential = credentials.find((c) => c.provider === provider);
    if (!credential) {
      return {
        provider,
        configured: false,
        hint: "",
        status: "missing" as CredentialStatus,
        validatedAt: null,
      };
    }
    return toStatusView(credential);
  });
}

function toStatusView(credential: Credential): CredentialStatusView {
  return {
    provider: credential.provider,
    configured: credential.status === "healthy",
    hint: credential.hint,
    status: credential.status,
    validatedAt: credential.validatedAt?.toISOString() ?? null,
  };
}
