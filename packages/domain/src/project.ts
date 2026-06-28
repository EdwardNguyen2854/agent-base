export type ProjectId = string;
export type SourceId = string;
export type ChunkId = string;

export type SourceKind = "pdf" | "docx" | "markdown" | "txt";

export type SourceState = "pending" | "processing" | "ready" | "failed";

export type SourceLocator =
  | { type: "page"; value: string }
  | { type: "heading"; value: string }
  | { type: "paragraph"; value: string };

export type Project = Readonly<{
  id: ProjectId;
  workspaceId: string;
  name: string;
  description: string;
  createdAt: Date;
}>;

export type ProjectSource = Readonly<{
  id: SourceId;
  projectId: ProjectId;
  name: string;
  kind: SourceKind;
  size: number;
  state: SourceState;
  uploadedAt: Date;
  error?: string;
}>;

export type SourceChunk = Readonly<{
  id: ChunkId;
  sourceId: SourceId;
  projectId: ProjectId;
  content: string;
  locator: SourceLocator;
  tokenCount: number;
  embedding?: Float32Array;
}>;

export const MAX_PROJECT_SOURCES = 100;
export const MAX_SOURCE_FILE_SIZE = 25 * 1024 * 1024;

export const SOURCE_MIME_TYPES: Record<SourceKind, readonly string[]> = {
  txt: ["text/plain"],
  markdown: ["text/markdown", "text/x-markdown"],
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export type SourceFileValidationResult =
  | { ok: true; kind: SourceKind }
  | { ok: false; error: string };

export function validateSourceFile(
  name: string,
  size: number,
  declaredMimeType?: string,
): SourceFileValidationResult {
  if (size <= 0) return { ok: false, error: "File is empty" };
  if (size > MAX_SOURCE_FILE_SIZE)
    return { ok: false, error: "Files must be 25 MB or smaller" };
  const extension = name.split(".").pop()?.toLowerCase();
  if (!extension)
    return { ok: false, error: "File must have a recognized extension" };
  const SUPPORTED: Record<string, SourceKind> = {
    txt: "txt",
    md: "markdown",
    pdf: "pdf",
    docx: "docx",
  };
  const kind = SUPPORTED[extension];
  if (!kind)
    return {
      ok: false,
      error: "Unsupported file type. Use TXT, Markdown, PDF, or DOCX.",
    };
  if (declaredMimeType) {
    const allowed = SOURCE_MIME_TYPES[kind];
    if (!allowed.includes(declaredMimeType)) {
      return {
        ok: false,
        error: `Declared file type "${declaredMimeType}" does not match the file extension`,
      };
    }
  }
  return { ok: true, kind };
}

export class SourceLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceLimitError";
  }
}

export function validateSourceLimits(currentCount: number): void {
  if (currentCount < 0)
    throw new SourceLimitError("Source count must be positive");
  if (currentCount >= MAX_PROJECT_SOURCES)
    throw new SourceLimitError(
      `A Project can contain at most ${MAX_PROJECT_SOURCES} active Sources`,
    );
}

export const SOURCE_STATE_TRANSITIONS: Record<SourceState, SourceState[]> = {
  pending: ["processing", "failed"],
  processing: ["ready", "failed"],
  ready: [],
  failed: [],
};

export function canTransitionSourceState(
  from: SourceState,
  to: SourceState,
): boolean {
  return SOURCE_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
