import {
  addSource,
  loadProjectSources,
} from "@agent-base/application/project-management.js";
import type { SourceBlobStore } from "@agent-base/application/source-ingestion.js";
import { createProjectDatabase } from "@agent-base/infrastructure";
import { FilesystemSourceBlobStore } from "@agent-base/infrastructure/source-blob-store.js";
import { PgBossSourceIngestionQueue } from "@agent-base/infrastructure/source-ingestion-queue.js";

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
  const dataDirectory =
    process.env.AGENT_BASE_SOURCES_DIRECTORY ?? process.env.AGENT_BASE_HOME;
  if (!databaseUrl)
    return Response.json({ error: "Not configured" }, { status: 503 });
  if (!dataDirectory)
    return Response.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  const { id } = await params;
  let file: File | undefined;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return Response.json(
      { error: "Request body must be multipart/form-data" },
      { status: 400 },
    );
  }
  if (!file) {
    return Response.json({ error: "File is required" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const magicError = validateUploadBytes(file.name, bytes);
  if (magicError) {
    return Response.json({ error: magicError }, { status: 400 });
  }
  const handle = await createProjectDatabase(databaseUrl);
  const blobStore: SourceBlobStore = new FilesystemSourceBlobStore(
    dataDirectory,
  );
  const queue = new PgBossSourceIngestionQueue(databaseUrl);
  try {
    const source = await addSource(handle.repository, id, {
      name: file.name,
      size: file.size,
      declaredMimeType: file.type,
    });
    try {
      await blobStore.store(source.id, bytes);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to store Source bytes";
      await handle.repository.updateSourceState(source.id, "failed", message);
      throw error;
    }
    try {
      await queue.enqueue(source.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enqueue Source";
      await handle.repository.updateSourceState(source.id, "failed", message);
      throw error;
    }
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
    await queue.close();
    await handle.close();
  }
}

export function validateUploadBytes(
  name: string,
  bytes: Buffer,
): string | undefined {
  const extension = name.split(".").pop()?.toLowerCase();
  if (
    extension === "pdf" &&
    !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
  ) {
    return "PDF upload does not match the PDF file signature.";
  }
  if (extension === "docx" && !bytes.subarray(0, 2).equals(Buffer.from("PK"))) {
    return "DOCX upload does not match the DOCX archive signature.";
  }
  if (extension === "docx" && !looksLikeDocxPackage(bytes)) {
    return "DOCX upload is missing required DOCX package parts.";
  }
  if ((extension === "txt" || extension === "md") && !isUtf8Text(bytes)) {
    return "Text upload must be valid UTF-8 text.";
  }
  return undefined;
}

function looksLikeDocxPackage(bytes: Buffer): boolean {
  return (
    bytes.includes(Buffer.from("word/document.xml")) &&
    bytes.includes(Buffer.from("[Content_Types].xml")) &&
    findZipEndOfCentralDirectory(bytes) >= 0
  );
}

function findZipEndOfCentralDirectory(bytes: Buffer): number {
  const minOffset = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function isUtf8Text(bytes: Buffer): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}
