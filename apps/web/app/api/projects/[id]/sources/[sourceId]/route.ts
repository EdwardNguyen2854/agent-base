import { removeSource } from "@agent-base/application/project-management.js";
import { createProjectDatabase } from "@agent-base/infrastructure";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  const { id, sourceId } = await params;
  const handle = await createProjectDatabase(databaseUrl);
  try {
    await removeSource(handle.repository, id, sourceId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove source",
      },
      { status: 400 },
    );
  } finally {
    await handle.close();
  }
}
