import { cancelTaskRun } from "@agent-base/application/task-runs.js";
import { createTaskRunDatabase } from "@agent-base/infrastructure";
import { serializeRun } from "../../../tasks/task-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id } = await params;
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    return Response.json(
      serializeRun(await cancelTaskRun(handle.repository, id)),
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel Run",
      },
      { status: 409 },
    );
  } finally {
    await handle.close();
  }
}
