import { createTask, listTasks } from "@agent-base/application/task-runs.js";
import { createTaskRunDatabase } from "@agent-base/infrastructure";
import { serializeTask } from "./task-service";

export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.AGENT_BASE_WORKSPACE_ID;

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !WORKSPACE_ID) return Response.json({ tasks: [] });
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    const tasks = await listTasks(handle.repository, WORKSPACE_ID);
    return Response.json({ tasks: tasks.map(serializeTask) });
  } finally {
    await handle.close();
  }
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !WORKSPACE_ID) {
    return Response.json(
      { error: "Agent Base has not been initialized yet" },
      { status: 503 },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  if (
    typeof body.projectId !== "string" ||
    typeof body.goal !== "string" ||
    typeof body.reportLanguage !== "string" ||
    typeof body.webResearch !== "boolean" ||
    !Array.isArray(body.selectedSourceIds) ||
    !body.selectedSourceIds.every((id) => typeof id === "string")
  ) {
    return Response.json({ error: "Task fields are invalid" }, { status: 400 });
  }
  const handle = createTaskRunDatabase(databaseUrl);
  try {
    const task = await createTask(handle.repository, {
      workspaceId: WORKSPACE_ID,
      projectId: body.projectId,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      goal: body.goal,
      reportLanguage: body.reportLanguage,
      selectedSourceIds: body.selectedSourceIds as string[],
      webResearch: body.webResearch,
    });
    return Response.json(serializeTask(task), { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create Task",
      },
      { status: 422 },
    );
  } finally {
    await handle.close();
  }
}
