import type { SourceBlobStore } from "@agent-base/application/source-ingestion.js";
import { removeSource } from "@agent-base/application/source-ingestion.js";
import { createProjectDatabase } from "@agent-base/infrastructure";
import { FilesystemSourceBlobStore } from "@agent-base/infrastructure/source-blob-store.js";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const databaseUrl = process.env.DATABASE_URL;
  const dataDirectory =
    process.env.AGENT_BASE_SOURCES_DIRECTORY ?? process.env.AGENT_BASE_HOME;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  if (!dataDirectory)
    return Response.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  const { id, sourceId } = await params;
  const handle = await createProjectDatabase(databaseUrl);
  const blobStore: SourceBlobStore = new FilesystemSourceBlobStore(
    dataDirectory,
  );
  try {
    await removeSource(
      { repository: handle.repository, blobStore },
      id,
      sourceId,
    );
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
