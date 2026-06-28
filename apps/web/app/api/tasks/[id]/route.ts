import {
  listRunsForTask,
  loadTask,
} from "@agent-base/application/task-runs.js";
import { createTaskRunDatabase } from "@agent-base/infrastructure";
import { serializeRun, serializeTask } from "../task-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id } = await params;
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    const task = await loadTask(handle.repository, id);
    const runs = await listRunsForTask(handle.repository, id);
    return Response.json({
      task: serializeTask(task),
      runs: runs.map(serializeRun),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Task not found" },
      { status: 404 },
    );
  } finally {
    await handle.close();
  }
}
