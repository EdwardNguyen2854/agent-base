import { randomUUID } from "node:crypto";
import type { Project, ProjectSource, SourceChunk } from "@agent-base/domain/project.js";
import { describe, expect, it } from "vitest";
import {
  type ProjectRepository,
  createProject,
  loadProject,
  listProjects,
  addSource,
  removeSource,
  updateSourceState,
  searchSources,
  type WorkspaceId,
} from "../src/project-management.js";

const WORKSPACE_ID: WorkspaceId = "00000000-0000-4000-8000-000000000010";

function createInMemoryRepository(): {
  repository: ProjectRepository;
  projects: Map<string, Project>;
  sources: Map<string, ProjectSource>;
  chunks: Map<string, SourceChunk>;
} {
  const projects = new Map<string, Project>();
  const sources = new Map<string, ProjectSource>();
  const chunks = new Map<string, SourceChunk>();
  return {
    projects,
    sources,
    chunks,
    repository: {
      createProject: async (project) => {
        projects.set(project.id, project);
        return project;
      },
      loadProject: async (id) => projects.get(id) ?? undefined,
      listProjects: async (workspaceId) =>
        [...projects.values()].filter((p) => p.workspaceId === workspaceId),
      addSource: async (source) => {
        sources.set(source.id, source);
        return source;
      },
      removeSource: async (sourceId) => {
        sources.delete(sourceId);
        for (const [id, chunk] of chunks) {
          if (chunk.sourceId === sourceId) chunks.delete(id);
        }
      },
      loadProjectSources: async (projectId) =>
        [...sources.values()].filter((s) => s.projectId === projectId),
      updateSourceState: async (sourceId, state, error) => {
        const source = sources.get(sourceId);
        if (source) {
          const updated = { ...source, state, ...(error ? { error } : {}) };
          sources.set(sourceId, updated);
        }
      },
      storeChunks: async (newChunks) => {
        for (const chunk of newChunks) {
          chunks.set(chunk.id, chunk);
        }
      },
      deleteChunksBySource: async (sourceId) => {
        for (const [id, chunk] of chunks) {
          if (chunk.sourceId === sourceId) chunks.delete(id);
        }
      },
      deleteChunksByProject: async (projectId) => {
        for (const [id, chunk] of chunks) {
          if (chunk.projectId === projectId) chunks.delete(id);
        }
      },
      searchProjectChunks: async (_projectId, _query) => [],
      loadSource: async (sourceId) => sources.get(sourceId),
      listReadySourceIds: async (projectId) =>
        [...sources.values()]
          .filter((s) => s.projectId === projectId && s.state === "ready")
          .map((s) => s.id),
    },
  };
}

describe("createProject", () => {
  it("creates a project with the given name and description", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Market Analysis",
      description: "Q3 market research",
    });
    expect(project.name).toBe("Market Analysis");
    expect(project.description).toBe("Q3 market research");
    expect(project.workspaceId).toBe(WORKSPACE_ID);
    expect(project.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(project.createdAt.getTime()).toBeGreaterThan(0);
  });

  it("fails for empty name", async () => {
    const { repository } = createInMemoryRepository();
    await expect(
      createProject(repository, {
        workspaceId: WORKSPACE_ID,
        name: "  ",
        description: "",
      }),
    ).rejects.toThrow(/name/i);
  });

  it("trims whitespace from name", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "  My Project  ",
      description: "",
    });
    expect(project.name).toBe("My Project");
  });
});

describe("listProjects", () => {
  it("returns all projects for a workspace", async () => {
    const { repository } = createInMemoryRepository();
    await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Project A",
      description: "",
    });
    await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Project B",
      description: "",
    });
    const projects = await listProjects(repository, WORKSPACE_ID);
    expect(projects).toHaveLength(2);
  });

  it("returns empty array when no projects exist", async () => {
    const { repository } = createInMemoryRepository();
    const projects = await listProjects(repository, WORKSPACE_ID);
    expect(projects).toHaveLength(0);
  });
});

describe("loadProject", () => {
  it("returns the project when it exists", async () => {
    const { repository } = createInMemoryRepository();
    const created = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const loaded = await loadProject(repository, created.id);
    expect(loaded).toBeDefined();
    expect(loaded?.name).toBe("Test");
  });

  it("throws when the project does not exist", async () => {
    const { repository } = createInMemoryRepository();
    await expect(
      loadProject(repository, "nonexistent"),
    ).rejects.toThrow(/not found/i);
  });
});

describe("addSource", () => {
  it("adds a TXT source to a project in pending state", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });
    expect(source.name).toBe("notes.txt");
    expect(source.kind).toBe("txt");
    expect(source.state).toBe("pending");
    expect(source.projectId).toBe(project.id);
  });

  it("adds a Markdown source with correct kind", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "doc.md",
      size: 2048,
    });
    expect(source.kind).toBe("markdown");
    expect(source.state).toBe("pending");
  });

  it("rejects unsupported file types", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    await expect(
      addSource(repository, project.id, {
        name: "image.png",
        size: 1024,
      }),
    ).rejects.toThrow(/unsupported/i);
  });

  it("rejects files exceeding 25 MB", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    await expect(
      addSource(repository, project.id, {
        name: "large.md",
        size: 26 * 1024 * 1024,
      }),
    ).rejects.toThrow(/25 MB/i);
  });

  it("rejects when project has reached the source limit", async () => {
    const { repository, sources } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    for (let i = 0; i < 100; i++) {
      sources.set(`source-${i}`, {
        id: `source-${i}`,
        projectId: project.id,
        name: `file-${i}.txt`,
        kind: "txt",
        size: 100,
        state: "ready",
        uploadedAt: new Date(),
      });
    }
    await expect(
      addSource(repository, project.id, {
        name: "extra.txt",
        size: 100,
      }),
    ).rejects.toThrow(/at most 100/i);
  });

  it("rejects files for a non-existent project", async () => {
    const { repository } = createInMemoryRepository();
    await expect(
      addSource(repository, "nonexistent", {
        name: "notes.txt",
        size: 1024,
      }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("removeSource", () => {
  it("removes a source and its chunks", async () => {
    const { repository, sources, chunks } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });
    chunks.set("chunk-1", {
      id: "chunk-1",
      sourceId: source.id,
      projectId: project.id,
      content: "test",
      locator: { type: "paragraph", value: "1" },
      tokenCount: 1,
    });
    expect(sources.has(source.id)).toBe(true);
    expect(chunks.has("chunk-1")).toBe(true);

    await removeSource(repository, project.id, source.id);

    expect(sources.has(source.id)).toBe(false);
    expect(chunks.has("chunk-1")).toBe(false);
  });
});

describe("updateSourceState", () => {
  it("updates source state from pending to processing", async () => {
    const { repository, sources } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });
    expect(source.state).toBe("pending");

    await updateSourceState(repository, source.id, "processing");
    expect(sources.get(source.id)?.state).toBe("processing");
  });

  it("updates source state from processing to ready", async () => {
    const { repository, sources } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });

    await updateSourceState(repository, source.id, "processing");
    await updateSourceState(repository, source.id, "ready");
    expect(sources.get(source.id)?.state).toBe("ready");
  });

  it("updates source state to failed with an error", async () => {
    const { repository, sources } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });

    await updateSourceState(repository, source.id, "failed", "Processing error");
    expect(sources.get(source.id)?.state).toBe("failed");
    expect(sources.get(source.id)?.error).toBe("Processing error");
  });

  it("rejects invalid transition from pending to ready", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });

    await expect(
      updateSourceState(repository, source.id, "ready"),
    ).rejects.toThrow("Cannot transition source from pending to ready");
  });

  it("rejects transition from ready to processing", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });

    await updateSourceState(repository, source.id, "processing");
    await updateSourceState(repository, source.id, "ready");
    await expect(
      updateSourceState(repository, source.id, "processing"),
    ).rejects.toThrow("Cannot transition source from ready to processing");
  });
});

describe("searchSources", () => {
  it("returns an empty array when no chunks match", async () => {
    const { repository } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const results = await searchSources(repository, project.id, "nonexistent");
    expect(results).toEqual([]);
  });
});

describe("storeChunks integration", () => {
  it("stores chunks and retrieves them via search", async () => {
    const { repository, chunks } = createInMemoryRepository();
    const project = await createProject(repository, {
      workspaceId: WORKSPACE_ID,
      name: "Test",
      description: "",
    });
    const source = await addSource(repository, project.id, {
      name: "notes.txt",
      size: 1024,
    });
    await updateSourceState(repository, source.id, "processing");
    await updateSourceState(repository, source.id, "ready");

    const testChunks: SourceChunk[] = [
      {
        id: "chunk-1",
        sourceId: source.id,
        projectId: project.id,
        content: "Machine learning is transforming research",
        locator: { type: "paragraph", value: "1" },
        tokenCount: 6,
      },
      {
        id: "chunk-2",
        sourceId: source.id,
        projectId: project.id,
        content: "Statistical analysis provides evidence",
        locator: { type: "paragraph", value: "2" },
        tokenCount: 5,
      },
    ];
    await repository.storeChunks(testChunks);
    expect(chunks.size).toBe(2);
  });
});
