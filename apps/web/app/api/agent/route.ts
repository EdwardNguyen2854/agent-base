import { createAgentDatabase } from "@agent-base/infrastructure";
import {
  agentNotConfiguredResponse,
  readAgent,
  readAgentEnvironment,
  writeAgentDraft,
} from "./agent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = readAgentEnvironment();
  if (!env) return Response.json(agentNotConfiguredResponse(), { status: 503 });
  const handle = await createAgentDatabase(
    env.databaseUrl,
    env.workspaceId,
    env.ownerId,
  );
  try {
    const result = await readAgent(handle.repository);
    return Response.json(result.ok ? result.body : { error: result.error }, {
      status: result.status,
    });
  } finally {
    await handle.close();
  }
}

export async function PUT(request: Request) {
  const env = readAgentEnvironment();
  if (!env) return Response.json(agentNotConfiguredResponse(), { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  const handle = await createAgentDatabase(
    env.databaseUrl,
    env.workspaceId,
    env.ownerId,
  );
  try {
    const result = await writeAgentDraft(handle.repository, body);
    if (result.ok) {
      return Response.json(result.body, { status: result.status });
    }
    return Response.json(
      result.limitErrors
        ? { error: result.error, limitErrors: result.limitErrors }
        : { error: result.error },
      { status: result.status },
    );
  } finally {
    await handle.close();
  }
}
