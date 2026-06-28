import {
  type CredentialStatusView,
  type Provider,
  validateAndSaveCredential,
  loadCredentialStatuses,
} from "@agent-base/application/credential-management.js";
import {
  Aes256GcmEncryption,
  createCredentialDatabase,
} from "@agent-base/infrastructure";

export type CredentialEnvironment = Readonly<{
  databaseUrl: string;
  encryptionKey: string;
}>;

export class StubProviderValidator {
  async validate(
    _provider: Provider,
    _secret: string,
  ): Promise<{ ok: true; status: "healthy" } | { ok: false; error: string }> {
    return { ok: true as const, status: "healthy" as const };
  }
}

export function readCredentialEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): CredentialEnvironment | undefined {
  const databaseUrl = env.DATABASE_URL;
  const encryptionKey = env.CREDENTIAL_ENCRYPTION_KEY;
  if (!databaseUrl || !encryptionKey) return undefined;
  return { databaseUrl, encryptionKey };
}

export type CredentialOperationResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; error: string };

export async function listCredentials(
  env: CredentialEnvironment,
): Promise<CredentialOperationResult> {
  const handle = createCredentialDatabase(env.databaseUrl);
  try {
    const views = await loadCredentialStatuses(handle.repository);
    return { ok: true, status: 200, body: { credentials: views } };
  } finally {
    await handle.close();
  }
}

export async function replaceCredential(
  env: CredentialEnvironment,
  provider: unknown,
  secret: unknown,
): Promise<CredentialOperationResult> {
  if (typeof provider !== "string" || typeof secret !== "string") {
    return {
      ok: false,
      status: 400,
      error: "Request body must include 'provider' and 'secret' strings",
    };
  }
  if (provider !== "MiniMax" && provider !== "Tavily") {
    return {
      ok: false,
      status: 400,
      error: "provider must be 'MiniMax' or 'Tavily'",
    };
  }
  const handle = createCredentialDatabase(env.databaseUrl);
  try {
    const encryption = new Aes256GcmEncryption(env.encryptionKey);
    const validator = new StubProviderValidator();
    const result = await validateAndSaveCredential(
      handle.repository,
      encryption,
      validator,
      provider,
      secret,
    );
    if (result.ok) {
      return { ok: true, status: 200, body: { credential: result.view } };
    }
    const statusCode = result.status === "healthy" ? 422 : 400;
    return { ok: false, status: statusCode, error: result.error };
  } finally {
    await handle.close();
  }
}
