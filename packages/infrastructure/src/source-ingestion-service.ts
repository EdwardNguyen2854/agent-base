import { failStuckProcessingSources } from "@agent-base/application/project-management.js";
import { ingestSource } from "@agent-base/application/source-ingestion.js";
import type {
  SourceChunk,
  SourceId,
  SourceKind,
} from "@agent-base/domain/project.js";
import { createProjectDatabase } from "./index.js";
import { FilesystemSourceBlobStore } from "./source-blob-store.js";
import {
  chunkText,
  DEFAULT_MAX_DECOMPRESSED_BYTES,
  DEFAULT_MAX_OUTPUT_BYTES,
  extractChunksFromDocx,
  extractChunksFromPdf,
  extractTextFromMarkdown,
  extractTextFromTxt,
} from "./source-ingestion.js";

export interface SourceIngestionService {
  ingestSource(sourceId: SourceId): Promise<void>;
  runWatchdog(): Promise<readonly SourceId[]>;
  close(): Promise<void>;
}

export interface SourceIngestionOptions {
  maxOutputBytes?: number;
  maxDecompressedBytes?: number;
  parseTimeoutMs?: number;
  watchdogStaleAfterMs?: number;
}

const DEFAULT_PARSE_TIMEOUT_MS = 30_000;
const DEFAULT_WATCHDOG_STALE_AFTER_MS = 5 * 60_000;

export async function createSourceIngestionService(input: {
  databaseUrl: string;
  sourcesDirectory: string;
  options?: SourceIngestionOptions;
}): Promise<SourceIngestionService> {
  const handle = await createProjectDatabase(input.databaseUrl);
  const blobStore = new FilesystemSourceBlobStore(input.sourcesDirectory);
  const maxOutputBytes =
    input.options?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const maxDecompressedBytes =
    input.options?.maxDecompressedBytes ?? DEFAULT_MAX_DECOMPRESSED_BYTES;
  const parseTimeoutMs =
    input.options?.parseTimeoutMs ?? DEFAULT_PARSE_TIMEOUT_MS;
  const watchdogStaleAfterMs =
    input.options?.watchdogStaleAfterMs ?? DEFAULT_WATCHDOG_STALE_AFTER_MS;
  const extractor = {
    extract: async (buffer: Buffer, kind: SourceKind) => {
      const limits = { maxOutputBytes, maxDecompressedBytes };
      switch (kind) {
        case "pdf":
          return extractChunksFromPdf(buffer, limits);
        case "docx":
          return extractChunksFromDocx(buffer, limits);
        case "markdown":
          return chunkText(
            assertWithinOutputCap(
              extractTextFromMarkdown(buffer).content,
              maxOutputBytes,
              "Markdown",
            ),
          );
        case "txt":
          return chunkText(
            assertWithinOutputCap(
              extractTextFromTxt(buffer).content,
              maxOutputBytes,
              "TXT",
            ),
          );
      }
    },
  } satisfies {
    extract(
      buffer: Buffer,
      kind: SourceKind,
    ): Promise<
      Array<{
        content: string;
        locator: SourceChunk["locator"];
        tokenCount: number;
      }>
    >;
  };

  return {
    ingestSource: async (sourceId) => {
      await ingestSource(
        {
          repository: handle.repository,
          blobStore,
          extractor,
        },
        sourceId,
        { limits: { maxOutputBytes, maxDecompressedBytes, parseTimeoutMs } },
      );
    },
    runWatchdog: async (olderThanMs = watchdogStaleAfterMs, now = new Date()) =>
      failStuckProcessingSources(handle.repository, {
        olderThanMs,
        now,
      }),
    close: () => handle.close(),
  };
}

function assertWithinOutputCap(
  text: string,
  maxOutputBytes: number,
  label: string,
): string {
  if (Buffer.byteLength(text, "utf8") > maxOutputBytes) {
    throw new Error(`${label} extracted text exceeds ${maxOutputBytes} bytes`);
  }
  return text;
}
