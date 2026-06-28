import {
  createProject,
  listProjects,
} from "@agent-base/application/project-management.js";
import { createProjectDatabase } from "@agent-base/infrastructure";

export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.AGENT_BASE_WORKSPACE_ID;

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !WORKSPACE_ID) return Response.json({ projects: [] });
  const handle = await createProjectDatabase(databaseUrl);
  try {
    const projects = await listProjects(handle.repository, WORKSPACE_ID);
    return Response.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } finally {
    await handle.close();
  }
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !WORKSPACE_ID)
    return Response.json(
      { error: "Agent Base has not been initialized yet" },
      { status: 503 },
    );
  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  const handle = await createProjectDatabase(databaseUrl);
  try {
    const project = await createProject(handle.repository, {
      workspaceId: WORKSPACE_ID,
      name: body.name ?? "",
      description: body.description ?? "",
    });
    return Response.json(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 400 },
    );
  } finally {
    await handle.close();
  }
}
