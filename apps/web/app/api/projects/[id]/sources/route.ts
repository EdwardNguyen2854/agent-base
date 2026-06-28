import {
  addSource,
  loadProjectSources,
} from "@agent-base/application/project-management.js";
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
    const sources = await loadProjectSources(handle.repository, id);
    return Response.json({
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
  } catch {
    return Response.json({ error: "Project not found" }, { status: 404 });
  } finally {
    await handle.close();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id } = await params;
  let body: { name?: string; size?: number };
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
    const source = await addSource(handle.repository, id, {
      name: body.name ?? "",
      size: body.size ?? 0,
    });
    return Response.json(
      {
        id: source.id,
        name: source.name,
        kind: source.kind,
        size: source.size,
        state: source.state,
        uploadedAt: source.uploadedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to add source",
      },
      { status: 400 },
    );
  } finally {
    await handle.close();
  }
}
