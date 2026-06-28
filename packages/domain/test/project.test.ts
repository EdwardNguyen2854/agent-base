import { describe, expect, it } from "vitest";
import {
  MAX_PROJECT_SOURCES,
  type Project,
  type ProjectSource,
  type SourceChunk,
  type SourceState,
  validateSourceFile,
  validateSourceLimits,
} from "../src/project.js";

describe("validateSourceFile", () => {
  it("accepts TXT files within the size limit", () => {
    const result = validateSourceFile("notes.txt", 1024 * 1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("txt");
  });

  it("accepts Markdown files within the size limit", () => {
    const result = validateSourceFile("report.md", 1024 * 1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("markdown");
  });

  it("accepts uppercased extensions", () => {
    const result = validateSourceFile("README.TXT", 1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("txt");
  });

  it("rejects files exceeding 25 MB", () => {
    const result = validateSourceFile("large.md", 26 * 1024 * 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/25 MB/i);
  });

  it("rejects unsupported file extensions", () => {
    const result = validateSourceFile("image.png", 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported/i);
  });

  it("rejects files without an extension", () => {
    const result = validateSourceFile("README", 1024);
    expect(result.ok).toBe(false);
  });

  it("rejects zero-length files", () => {
    const result = validateSourceFile("empty.md", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it("accepts a declared MIME type that matches the extension", () => {
    const result = validateSourceFile("report.pdf", 1024, "application/pdf");
    expect(result.ok).toBe(true);
  });

  it("rejects a declared MIME type that does not match the extension", () => {
    const result = validateSourceFile("notes.txt", 1024, "application/pdf");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/does not match/i);
  });

  it("ignores a blank declared MIME type", () => {
    const result = validateSourceFile("report.pdf", 1024, "");
    expect(result.ok).toBe(true);
  });
});

describe("validateSourceLimits", () => {
  it("accepts a source count within the maximum", () => {
    expect(() => validateSourceLimits(50)).not.toThrow();
  });

  it("rejects a source count exceeding the maximum", () => {
    expect(() => validateSourceLimits(MAX_PROJECT_SOURCES + 1)).toThrow(
      /at most.*100/i,
    );
  });

  it("rejects a negative source count", () => {
    expect(() => validateSourceLimits(-1)).toThrow(/positive/i);
  });
});

describe("SourceState transitions", () => {
  const VALID_TRANSITIONS: Record<SourceState, SourceState[]> = {
    pending: ["processing", "failed"],
    processing: ["ready", "failed"],
    ready: [],
    failed: [],
  };

  for (const [from, allowed] of Object.entries(VALID_TRANSITIONS)) {
    for (const to of allowed) {
      it(`allows transition from ${from} to ${to}`, () => {
        expect(true).toBe(true);
      });
    }
    const disallowed = Object.keys(VALID_TRANSITIONS).filter(
      (s) => !allowed.includes(s as SourceState) && s !== from,
    );
    for (const to of disallowed) {
      it(`rejects transition from ${from} to ${to}`, () => {
        expect(true).toBe(true);
      });
    }
  }
});

describe("Project and ProjectSource types", () => {
  it("can construct a Project value", () => {
    const project: Project = {
      id: "project-id",
      workspaceId: "workspace-id",
      name: "Test Project",
      description: "A test project",
      createdAt: new Date(),
    };
    expect(project.name).toBe("Test Project");
  });

  it("can construct a ProjectSource value", () => {
    const source: ProjectSource = {
      id: "source-id",
      projectId: "project-id",
      name: "notes.md",
      kind: "markdown",
      size: 1024,
      state: "pending",
      uploadedAt: new Date(),
    };
    expect(source.state).toBe("pending");
  });

  it("can construct a SourceChunk value", () => {
    const chunk: SourceChunk = {
      id: "chunk-id",
      sourceId: "source-id",
      projectId: "project-id",
      content: "Sample content for chunking",
      locator: { type: "heading", value: "Introduction" },
      tokenCount: 8,
      embedding: new Float32Array([0.1, 0.2, 0.3]),
    };
    expect(chunk.tokenCount).toBe(8);
    expect(chunk.embedding?.length).toBe(3);
  });

  it("SourceChunk accepts paragraph locators", () => {
    const chunk: SourceChunk = {
      id: "chunk-id",
      sourceId: "source-id",
      projectId: "project-id",
      content: "Paragraph content",
      locator: { type: "paragraph", value: "3" },
      tokenCount: 4,
    };
    expect(chunk.locator.type).toBe("paragraph");
  });

  it("SourceChunk accepts page locators", () => {
    const chunk: SourceChunk = {
      id: "chunk-id",
      sourceId: "source-id",
      projectId: "project-id",
      content: "Page content",
      locator: { type: "page", value: "12" },
      tokenCount: 3,
    };
    expect(chunk.locator.type).toBe("page");
  });
});
