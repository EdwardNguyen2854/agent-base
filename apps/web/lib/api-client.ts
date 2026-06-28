export type CredentialStatusFromApi = {
  provider: string;
  configured: boolean;
  hint: string;
  status: string;
  validatedAt: string | null;
};

export async function fetchCredentialStatuses(): Promise<
  CredentialStatusFromApi[] | undefined
> {
  try {
    const response = await fetch("/api/credentials");
    if (!response.ok) return undefined;
    const data = (await response.json()) as {
      credentials?: CredentialStatusFromApi[];
    };
    return data.credentials;
  } catch {
    return undefined;
  }
}

export type ApiResult =
  | { ok: true }
  | { ok: false; error: string; reachable: boolean };

export async function replaceCredentialViaApi(
  provider: string,
  secret: string,
): Promise<ApiResult> {
  try {
    const response = await fetch("/api/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, secret }),
    });
    if (response.ok) return { ok: true };
    const data = (await response.json()) as { error?: string };
    return {
      ok: false,
      error: data.error ?? "An unexpected error occurred",
      reachable: true,
    };
  } catch {
    return { ok: false, error: "Could not connect to the server", reachable: false };
  }
}
