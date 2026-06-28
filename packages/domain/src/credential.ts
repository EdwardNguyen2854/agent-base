export type Provider = "MiniMax" | "Tavily";

export const PROVIDERS: readonly Provider[] = ["MiniMax", "Tavily"];

export type CredentialStatus = "healthy" | "invalid" | "missing";

export type Credential = Readonly<{
  id: string;
  provider: Provider;
  encryptedSecret: string;
  nonce: string;
  hint: string;
  status: CredentialStatus;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CredentialStatusView = Readonly<{
  provider: Provider;
  configured: boolean;
  hint: string;
  status: CredentialStatus;
  validatedAt: string | null;
}>;

export function createCredentialHint(secret: string): string {
  const suffix = secret.length >= 4 ? secret.slice(-4).toUpperCase() : secret;
  return `•••• ${suffix}`;
}
