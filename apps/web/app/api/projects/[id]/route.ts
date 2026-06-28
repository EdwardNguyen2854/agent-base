import { loadProjectWithSources } from "@agent-base/application/project-management.js";
import { createProjectDatabase } from "@agent-base/infrastructure";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id } = await params;
  const handle = await createProjectDatabase(databaseUrl);
  try {
    const { project, sources } = await loadProjectWithSources(
      handle.repository,
      id,
    );
    return Response.json({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        size: s.size,
        state: s.state,
        uploadedAt: s.uploadedAt.toISOString(),
        ...(s.error ? { error: s.error } : {}),
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Project not found",
      },
      { status: 404 },
    );
  } finally {
    await handle.close();
  }
}
