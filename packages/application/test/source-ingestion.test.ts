import { randomUUID } from "node:crypto";
import type {
  ProjectSource,
  SourceChunk,
  SourceId,
  SourceState,
} from "@agent-base/domain/project.js";
import { describe, expect, it } from "vitest";
import type {
  Project,
  ProjectId,
  ProjectRepository,
  WorkspaceId,
} from "../src/project-management.js";
import {
  ingestSource,
  removeSource,
  type SourceBlobStore,
  type SourceChunkExtractor,
} from "../src/source-ingestion.js";

const WORKSPACE_ID: WorkspaceId = "00000000-0000-4000-8000-000000000010";
const PROJECT_ID: ProjectId = "00000000-0000-4000-8000-000000000020";

interface Harness {
  repository: ProjectRepository;
  blobs: Map<SourceId, Buffer>;
  blobStore: SourceBlobStore;
  extractor: SourceChunkExtractor;
  sources: Map<SourceId, ProjectSource>;
  chunks: Map<string, SourceChunk>;
}

function createHarness(overrides?: {
  extract?: SourceChunkExtractor["extract"];
  deleteBlob?: SourceBlobStore["delete"];
}): Harness {
  const sources = new Map<SourceId, ProjectSource>();
  const chunks = new Map<string, SourceChunk>();
  const blobs = new Map<SourceId, Buffer>();
  const projects = new Map<ProjectId, Project>();
  const blobStore: SourceBlobStore = {
    store: async (id, bytes) => {
      blobs.set(id, bytes);
    },
    load: async (id) => {
      const buf = blobs.get(id);
      if (!buf) throw new Error(`blob ${id} not found`);
      return buf;
    },
    delete:
      overrides?.deleteBlob ??
      (async (id) => {
        blobs.delete(id);
      }),
  };
  const extractor: SourceChunkExtractor = {
    extract: overrides?.extract ?? (async () => []),
  };
  const repository: ProjectRepository = {
    createProject: async (project: Project) => {
      projects.set(project.id, project);
      return project;
    },
    loadProject: async (id: ProjectId) => projects.get(id),
    listProjects: async () => [...projects.values()],
    addSource: async (source: ProjectSource) => {
      sources.set(source.id, source);
      return source;
    },
    removeSource: async (id: SourceId) => {
      sources.delete(id);
      for (const [cid, chunk] of chunks) {
        if (chunk.sourceId === id) chunks.delete(cid);
      }
    },
    loadProjectSources: async () => [...sources.values()],
    loadSource: async (id: SourceId) => sources.get(id),
    updateSourceState: async (
      id: SourceId,
      state: SourceState,
      error?: string,
    ) => {
      const current = sources.get(id);
      if (!current) throw new Error(`source ${id} not found`);
      sources.set(id, { ...current, state, ...(error ? { error } : {}) });
    },
    storeChunks: async (newChunks: readonly SourceChunk[]) => {
      for (const chunk of newChunks) chunks.set(chunk.id, chunk);
    },
    deleteChunksBySource: async (id: SourceId) => {
      for (const [cid, chunk] of chunks) {
        if (chunk.sourceId === id) chunks.delete(cid);
      }
    },
    deleteChunksByProject: async () => undefined,
    searchProjectChunks: async () => [],
    listReadySourceIds: async () =>
      [...sources.values()].filter((s) => s.state === "ready").map((s) => s.id),
    listProcessingSourcesOlderThan: async (cutoff) =>
      [...sources.values()]
        .filter((s) => s.state === "processing" && s.uploadedAt < cutoff)
        .map((s) => ({ id: s.id, uploadedAt: s.uploadedAt })),
  };
  return { repository, blobs, blobStore, extractor, sources, chunks };
}

async function seedProject(
  harness: Harness,
  state: SourceState = "pending",
): Promise<{ project: Project; source: ProjectSource }> {
  const project: Project = {
    id: PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Test",
    description: "",
    createdAt: new Date(),
  };
  await harness.repository.createProject(project);
  const source: ProjectSource = {
    id: randomUUID(),
    projectId: project.id,
    name: "doc.txt",
    kind: "txt",
    size: 5,
    state,
    uploadedAt: new Date(),
  };
  await harness.repository.addSource(source);
  harness.blobs.set(source.id, Buffer.from("hello"));
  return { project, source };
}

describe("ingestSource", () => {
  it("moves a pending source to processing then ready with stored chunks", async () => {
    const harness = createHarness({
      extract: async () => [
        {
          content: "hello world",
          locator: { type: "paragraph", value: "1" },
          tokenCount: 2,
        },
      ],
    });
    const { source } = await seedProject(harness);

    const result = await ingestSource(
      {
        repository: harness.repository,
        blobStore: harness.blobStore,
        extractor: harness.extractor,
      },
      source.id,
    );

    expect(result.chunkCount).toBe(1);
    expect(harness.sources.get(source.id)?.state).toBe("ready");
    expect([...harness.chunks.values()][0]?.content).toBe("hello world");
    expect(harness.blobs.has(source.id)).toBe(true);
  });

  it("allows a processing source to be retried after a worker restart", async () => {
    const harness = createHarness({
      extract: async () => [
        {
          content: "retried",
          locator: { type: "paragraph", value: "1" },
          tokenCount: 1,
        },
      ],
    });
    const { source } = await seedProject(harness, "processing");
    const result = await ingestSource(
      {
        repository: harness.repository,
        blobStore: harness.blobStore,
        extractor: harness.extractor,
      },
      source.id,
    );
    expect(result.chunkCount).toBe(1);
    expect(harness.sources.get(source.id)?.state).toBe("ready");
  });

  it("rejects ingestion when the source is not in pending state", async () => {
    const harness = createHarness();
    const { source } = await seedProject(harness, "ready");
    await expect(
      ingestSource(
        {
          repository: harness.repository,
          blobStore: harness.blobStore,
          extractor: harness.extractor,
        },
        source.id,
      ),
    ).rejects.toThrow(/cannot be ingested from state/i);
    expect(harness.sources.get(source.id)?.state).toBe("ready");
  });

  it("moves a failing extraction to failed with the error message", async () => {
    const harness = createHarness({
      extract: async () => {
        throw new Error("PDF could not be parsed");
      },
    });
    const { source } = await seedProject(harness);
    await expect(
      ingestSource(
        {
          repository: harness.repository,
          blobStore: harness.blobStore,
          extractor: harness.extractor,
        },
        source.id,
      ),
    ).rejects.toThrow(/PDF could not be parsed/);
    const stored = harness.sources.get(source.id);
    expect(stored?.state).toBe("failed");
    expect(stored?.error).toMatch(/PDF could not be parsed/);
  });

  it("resets the source to pending when the blob is missing so retries can recover", async () => {
    const harness = createHarness();
    const { source } = await seedProject(harness);
    harness.blobs.delete(source.id);
    await expect(
      ingestSource(
        {
          repository: harness.repository,
          blobStore: harness.blobStore,
          extractor: harness.extractor,
        },
        source.id,
      ),
    ).rejects.toThrow();
    const stored = harness.sources.get(source.id);
    expect(stored?.state).toBe("pending");
    expect(stored?.error).toMatch(/blob/i);
  });

  it("moves the source to failed when parsing exceeds the timeout", async () => {
    const harness = createHarness({
      extract: async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 50);
        }),
    });
    const { source } = await seedProject(harness);
    await expect(
      ingestSource(
        {
          repository: harness.repository,
          blobStore: harness.blobStore,
          extractor: harness.extractor,
        },
        source.id,
        { limits: { parseTimeoutMs: 1 } },
      ),
    ).rejects.toThrow(/parsing exceeded/i);
    const stored = harness.sources.get(source.id);
    expect(stored?.state).toBe("pending");
    expect(stored?.error).toMatch(/parsing exceeded/i);
  });
});

describe("removeSource", () => {
  it("removes the source row, its chunks, and its stored blob", async () => {
    const harness = createHarness();
    const { source } = await seedProject(harness);
    harness.chunks.set("chunk-1", {
      id: "chunk-1",
      sourceId: source.id,
      projectId: PROJECT_ID,
      content: "hello",
      locator: { type: "paragraph", value: "1" },
      tokenCount: 1,
    });
    expect(harness.blobs.has(source.id)).toBe(true);
    await removeSource(
      { repository: harness.repository, blobStore: harness.blobStore },
      PROJECT_ID,
      source.id,
    );
    expect(harness.sources.has(source.id)).toBe(false);
    expect(harness.chunks.has("chunk-1")).toBe(false);
    expect(harness.blobs.has(source.id)).toBe(false);
  });

  it("keeps database rows when stored bytes cannot be removed", async () => {
    const harness = createHarness({
      deleteBlob: async () => {
        throw new Error("disk unavailable");
      },
    });
    const { source } = await seedProject(harness);
    harness.chunks.set("chunk-1", {
      id: "chunk-1",
      sourceId: source.id,
      projectId: PROJECT_ID,
      content: "hello",
      locator: { type: "paragraph", value: "1" },
      tokenCount: 1,
    });
    await expect(
      removeSource(
        { repository: harness.repository, blobStore: harness.blobStore },
        PROJECT_ID,
        source.id,
      ),
    ).rejects.toThrow(/disk unavailable/);
    expect(harness.sources.has(source.id)).toBe(false);
    expect(harness.chunks.has("chunk-1")).toBe(false);
    expect(harness.blobs.has(source.id)).toBe(true);
  });
});
