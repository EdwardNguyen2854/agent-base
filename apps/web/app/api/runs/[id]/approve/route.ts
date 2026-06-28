import { approveRunPlan } from "@agent-base/application/task-runs.js";
import { createTaskRunDatabase } from "@agent-base/infrastructure";
import { serializeRun } from "../../../tasks/task-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  const ownerId = process.env.AGENT_BASE_OWNER_ID;
  if (!databaseUrl || !ownerId)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id } = await params;
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    return Response.json(
      serializeRun(await approveRunPlan(handle.repository, id, ownerId)),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve Research Plan",
      },
      { status: 409 },
    );
  } finally {
    await handle.close();
  }
}
