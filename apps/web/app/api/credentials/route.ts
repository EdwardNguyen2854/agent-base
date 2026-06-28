import {
  listCredentials,
  readCredentialEnvironment,
  replaceCredential,
} from "./credential-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = readCredentialEnvironment();
  if (!env) {
    return Response.json(
      { error: "Credentials API is not configured" },
      { status: 503 },
    );
  }
  const result = await listCredentials(env);
  return Response.json(
    result.ok ? result.body : { error: result.error },
    { status: result.status },
  );
}

export async function PUT(request: Request) {
  const env = readCredentialEnvironment();
  if (!env) {
    return Response.json(
      { error: "Credentials API is not configured" },
      { status: 503 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  const { provider, secret } = (body ?? {}) as Record<string, unknown>;
  const result = await replaceCredential(env, provider, secret);
  if (result.ok) {
    return Response.json(result.body, { status: result.status });
  }
  return Response.json({ error: result.error }, { status: result.status });
}
