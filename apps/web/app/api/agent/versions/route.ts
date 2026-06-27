import { createAgentDatabase } from "@agent-base/infrastructure";
import {
  agentNotConfiguredResponse,
  publishAgent,
  readAgentEnvironment,
} from "../agent-service";

export const dynamic = "force-dynamic";

export async function POST() {
  const env = readAgentEnvironment();
  if (!env) return Response.json(agentNotConfiguredResponse(), { status: 503 });
  const handle = await createAgentDatabase(
    env.databaseUrl,
    env.workspaceId,
    env.ownerId,
  );
  try {
    const result = await publishAgent(handle.repository, env.ownerId);
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
