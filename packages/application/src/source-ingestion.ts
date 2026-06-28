import { randomUUID } from "node:crypto";
import type {
  ProjectId,
  SourceChunk,
  SourceId,
  SourceKind,
  SourceLocator,
} from "@agent-base/domain/project.js";
import type { ProjectRepository } from "./project-management.js";

export interface ChunkResult {
  content: string;
  locator: SourceLocator;
  tokenCount: number;
}

export interface ExtractionLimits {
  maxOutputBytes?: number;
  maxDecompressedBytes?: number;
  maxTokensPerChunk?: number;
  overlapTokens?: number;
  parseTimeoutMs?: number;
}

export interface SourceBlobStore {
  store(sourceId: SourceId, bytes: Buffer): Promise<void>;
  load(sourceId: SourceId): Promise<Buffer>;
  delete(sourceId: SourceId): Promise<void>;
}

export interface SourceChunkExtractor {
  extract(
    buffer: Buffer,
    kind: SourceKind,
    limits: ExtractionLimits,
  ): Promise<ChunkResult[]>;
}

export interface IngestionDependencies {
  repository: ProjectRepository;
  blobStore: SourceBlobStore;
  extractor: SourceChunkExtractor;
}

export type IngestionResult = Readonly<{ chunkCount: number }>;

export class SourceIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceIngestionError";
  }
}

export class SourceBlobMissingError extends SourceIngestionError {
  constructor(sourceId: SourceId) {
    super(`Stored Source blob for ${sourceId} is missing`);
    this.name = "SourceBlobMissingError";
  }
}

export async function ingestSource(
  dependencies: IngestionDependencies,
  sourceId: SourceId,
  options: { limits?: ExtractionLimits } = {},
): Promise<IngestionResult> {
  const source = await dependencies.repository.loadSource(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);
  if (source.state !== "pending" && source.state !== "processing") {
    throw new SourceIngestionError(
      `Source ${sourceId} cannot be ingested from state ${source.state}`,
    );
  }

  if (source.state !== "processing") {
    await dependencies.repository.updateSourceState(sourceId, "processing");
  }

  try {
    const buffer = await dependencies.blobStore.load(sourceId).catch(() => {
      throw new SourceBlobMissingError(sourceId);
    });
    const limits = options.limits ?? {};
    const chunks = await withOptionalTimeout(
      dependencies.extractor.extract(buffer, source.kind, limits),
      limits.parseTimeoutMs,
      `Source ${sourceId} parsing exceeded ${limits.parseTimeoutMs}ms`,
    );
    const persisted = chunks.map((chunk) => ({
      id: randomUUID(),
      sourceId,
      projectId: source.projectId,
      content: chunk.content,
      locator: chunk.locator,
      tokenCount: chunk.tokenCount,
    }));
    if (persisted.length > 0) {
      await dependencies.repository.storeChunks(persisted);
    }
    await dependencies.repository.updateSourceState(sourceId, "ready");
    return { chunkCount: persisted.length };
  } catch (error) {
    const ingestionError =
      error instanceof Error
        ? error
        : new SourceIngestionError("Source ingestion failed");
    const message = ingestionError.message;
    const transient = isTransientIngestionError(ingestionError);
    try {
      await dependencies.repository.updateSourceState(
        sourceId,
        transient ? "pending" : "failed",
        message,
      );
    } catch {
      /* preserve the original ingestion failure */
    }
    throw ingestionError;
  }
}

function isTransientIngestionError(error: Error): boolean {
  if (error instanceof SourceBlobMissingError) return true;
  return /parsing exceeded/i.test(error.message);
}

async function withOptionalTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  message: string,
): Promise<T> {
  if (!timeoutMs) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new SourceIngestionError(message)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function removeSource(
  dependencies: Pick<IngestionDependencies, "repository" | "blobStore">,
  projectId: ProjectId,
  sourceId: SourceId,
): Promise<void> {
  const source = await dependencies.repository.loadSource(sourceId);
  if (!source || source.projectId !== projectId) {
    throw new Error(`Source ${sourceId} not found in Project ${projectId}`);
  }
  await dependencies.repository.deleteChunksBySource(sourceId);
  await dependencies.repository.removeSource(sourceId);
  await dependencies.blobStore.delete(sourceId);
}

export type SourceChunkRow = SourceChunk;
