import { startRun } from "@agent-base/application/task-runs.js";
import { createTaskRunDatabase } from "@agent-base/infrastructure";
import { researchPlanGenerator, serializeRun } from "../../task-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  if (typeof body.agentVersionId !== "string") {
    return Response.json(
      { error: "A published Agent Version is required" },
      { status: 400 },
    );
  }
  const { id } = await params;
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    const run = await startRun(handle.repository, researchPlanGenerator, {
      taskId: id,
      agentVersionId: body.agentVersionId,
      modelIdentifier:
        typeof body.modelIdentifier === "string"
          ? body.modelIdentifier
          : (process.env.MINIMAX_MODEL ?? "MiniMax-M2.1"),
    });
    return Response.json(serializeRun(run), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start Run" },
      { status: 422 },
    );
  } finally {
    await handle.close();
  }
}
