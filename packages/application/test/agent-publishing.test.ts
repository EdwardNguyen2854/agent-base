import { randomUUID } from "node:crypto";
import {
  AgentDraftInvalidError,
  generalResearchAgentLimits,
} from "@agent-base/domain/agent.js";
import { describe, expect, it } from "vitest";
import {
  type Agent,
  type AgentDraft,
  AgentNotFoundError,
  type AgentRepository,
  type AgentState,
  type AgentVersion,
  generalResearchAgentDraftFields,
  loadAgent,
  type OwnerId,
  publishAgentVersion,
  seedGeneralResearchAgent,
  updateAgentDraft,
  type WorkspaceId,
} from "../src/agent-publishing.js";

const WORKSPACE_ID: WorkspaceId = "00000000-0000-4000-8000-000000000010";
const OWNER_ID: OwnerId = "00000000-0000-4000-8000-000000000001";

function createDraftFixture(overrides: Partial<AgentDraft> = {}): AgentDraft {
  const base = generalResearchAgentDraftFields();
  const agent: Agent = {
    id: "00000000-0000-4000-8000-000000000020",
    workspaceId: WORKSPACE_ID,
    name: "General research",
  };
  return {
    id: "00000000-0000-4000-8000-000000000021",
    agentId: agent.id,
    ...base,
    ...overrides,
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  };
}

function createRepositoryWithDraft(
  draft: AgentDraft,
  existingVersions: AgentVersion[] = [],
) {
  const stored: { state: AgentState | undefined } = {
    state: {
      agent: {
        id: draft.agentId,
        workspaceId: WORKSPACE_ID,
        name: "General research",
      },
      draft,
      versions: existingVersions,
    },
  };
  const repository: AgentRepository = {
    loadAgent: async () =>
      stored.state
        ? {
            agent: stored.state.agent,
            draft: stored.state.draft,
            versions: [...stored.state.versions],
          }
        : undefined,
    saveDraft: async (next) => {
      if (!stored.state) throw new Error("seed not called");
      stored.state = { ...stored.state, draft: next };
    },
    appendVersion: async (version) => {
      if (!stored.state) throw new Error("seed not called");
      const highest = stored.state.versions.reduce(
        (max, candidate) => Math.max(max, candidate.number),
        0,
      );
      if (version.number <= highest) {
        throw new Error(`Agent Version ${version.number} already exists`);
      }
      stored.state = {
        ...stored.state,
        versions: [...stored.state.versions, version],
      };
      return version;
    },
  };
  return { repository, stored };
}

describe("publishAgentVersion", () => {
  it("publishes the first Agent Version from the seeded draft", async () => {
    const draft = createDraftFixture();
    const { repository, stored } = createRepositoryWithDraft(draft);

    const published = await publishAgentVersion(repository, OWNER_ID);

    expect(published.number).toBe(1);
    expect(published.agentId).toBe(draft.agentId);
    expect(published.publishedBy).toBe(OWNER_ID);
    expect(published.purpose).toBe(draft.purpose);
    expect(published.instructions).toBe(draft.instructions);
    expect(published.researchMethod).toBe(draft.researchMethod);
    expect(published.reportRequirements).toBe(draft.reportRequirements);
    expect(published.evidencePermissions).toEqual(draft.evidencePermissions);
    expect(published.limits).toEqual(draft.limits);
    expect(stored.state?.versions).toHaveLength(1);
  });

  it("numbers subsequent versions sequentially and leaves the draft editable", async () => {
    const draft = createDraftFixture();
    const previousVersion: AgentVersion = {
      id: randomUUID(),
      agentId: draft.agentId,
      number: 1,
      purpose: draft.purpose,
      instructions: draft.instructions,
      researchMethod: draft.researchMethod,
      reportRequirements: draft.reportRequirements,
      evidencePermissions: draft.evidencePermissions,
      limits: draft.limits,
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      publishedBy: OWNER_ID,
    };
    const { repository, stored } = createRepositoryWithDraft(draft, [
      previousVersion,
    ]);
    const updatedDraft: AgentDraft = {
      ...draft,
      purpose: "Refined research goal",
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    };
    await repository.saveDraft(updatedDraft);

    const published = await publishAgentVersion(repository, OWNER_ID);

    expect(published.number).toBe(2);
    expect(published.purpose).toBe("Refined research goal");
    expect(stored.state?.versions[0]).toEqual(previousVersion);
    expect(stored.state?.versions[0]?.purpose).toBe(draft.purpose);
    expect(stored.state?.draft).toEqual(updatedDraft);
  });

  it("rejects publication when draft limits exceed platform maximums", async () => {
    const draft = createDraftFixture({
      limits: {
        ...generalResearchAgentLimits(),
        modelTurns: 25,
      },
    });
    const { repository, stored } = createRepositoryWithDraft(draft);

    await expect(
      publishAgentVersion(repository, OWNER_ID),
    ).rejects.toBeInstanceOf(AgentDraftInvalidError);

    expect(stored.state?.versions).toHaveLength(0);
  });

  it("treats an unpublished Agent as a missing pre-condition", async () => {
    const repository: AgentRepository = {
      loadAgent: async () => undefined,
      saveDraft: async () => {},
      appendVersion: async () => {
        throw new Error("should not reach repository");
      },
    };

    await expect(publishAgentVersion(repository, OWNER_ID)).rejects.toThrow(
      /no agent/i,
    );
  });
});

describe("updateAgentDraft", () => {
  it("persists guided field changes and returns the updated draft", async () => {
    const draft = createDraftFixture();
    const { repository } = createRepositoryWithDraft(draft);

    const updated = await updateAgentDraft(repository, {
      purpose: "Refined goal",
      instructions: "Updated instructions",
      evidencePermissions: { webSearch: false },
    });

    expect(updated.purpose).toBe("Refined goal");
    expect(updated.instructions).toBe("Updated instructions");
    expect(updated.evidencePermissions).toEqual({ webSearch: false });
    expect(updated.researchMethod).toBe(draft.researchMethod);
    expect(updated.reportRequirements).toBe(draft.reportRequirements);
    expect(updated.limits).toEqual(draft.limits);

    const reloaded = await repository.loadAgent();
    expect(reloaded?.draft).toEqual(updated);
  });

  it("rejects updates whose limits exceed platform maximums", async () => {
    const draft = createDraftFixture();
    const { repository } = createRepositoryWithDraft(draft);

    await expect(
      updateAgentDraft(repository, {
        limits: { ...draft.limits, pageFetches: 99 },
      }),
    ).rejects.toBeInstanceOf(AgentDraftInvalidError);

    const reloaded = await repository.loadAgent();
    expect(reloaded?.draft).toEqual(draft);
  });

  it("rejects updates that blank out a guided field", async () => {
    const draft = createDraftFixture();
    const { repository } = createRepositoryWithDraft(draft);

    await expect(
      updateAgentDraft(repository, { purpose: "   " }),
    ).rejects.toBeInstanceOf(AgentDraftInvalidError);

    const reloaded = await repository.loadAgent();
    expect(reloaded?.draft.purpose).toBe(draft.purpose);
  });
});

describe("seedGeneralResearchAgent", () => {
  function createSeedableRepository() {
    const stored: { state: AgentState | undefined } = { state: undefined };
    const repository: AgentRepository = {
      loadAgent: async () => stored.state,
      saveDraft: async (next) => {
        stored.state = stored.state
          ? { ...stored.state, draft: next }
          : {
              agent: {
                id: next.agentId,
                workspaceId: WORKSPACE_ID,
                name: "General research",
              },
              draft: next,
              versions: [],
            };
      },
      appendVersion: async (version) => {
        if (!stored.state) throw new Error("missing state");
        stored.state = {
          ...stored.state,
          versions: [...stored.state.versions, version],
        };
        return version;
      },
    };
    return { repository, stored };
  }

  it("creates one Agent, one draft, and Agent Version 1 on first call", async () => {
    const { repository, stored } = createSeedableRepository();

    const seeded = await seedGeneralResearchAgent(
      repository,
      WORKSPACE_ID,
      OWNER_ID,
    );

    expect(seeded.agent.id).toBe(seeded.draft.agentId);
    expect(seeded.agent.workspaceId).toBe(WORKSPACE_ID);
    expect(seeded.versions).toHaveLength(1);
    expect(seeded.versions[0]?.number).toBe(1);
    expect(seeded.versions[0]?.publishedBy).toBe(OWNER_ID);
    expect(seeded.draft.purpose).toMatch(/research/i);
    expect(stored.state?.versions).toHaveLength(1);
  });

  it("is idempotent and does not publish another version when already seeded", async () => {
    const draft = createDraftFixture();
    const { repository, stored } = createRepositoryWithDraft(draft, [
      {
        id: randomUUID(),
        agentId: draft.agentId,
        number: 1,
        ...generalResearchAgentDraftFields(),
        publishedAt: new Date("2026-01-01T00:00:00Z"),
        publishedBy: OWNER_ID,
      },
    ]);

    const seeded = await seedGeneralResearchAgent(
      repository,
      WORKSPACE_ID,
      OWNER_ID,
    );

    expect(seeded.versions).toHaveLength(1);
    expect(stored.state?.versions).toHaveLength(1);
    expect(seeded.draft).toEqual(draft);
  });

  it("recovers a partial seed by publishing Agent Version 1 when only the draft was saved", async () => {
    const draft = createDraftFixture();
    const { repository, stored } = createRepositoryWithDraft(draft, []);

    const seeded = await seedGeneralResearchAgent(
      repository,
      WORKSPACE_ID,
      OWNER_ID,
    );

    expect(seeded.versions).toHaveLength(1);
    expect(seeded.versions[0]?.number).toBe(1);
    expect(stored.state?.versions).toHaveLength(1);
    expect(stored.state?.draft).toEqual(draft);
  });
});

describe("loadAgent", () => {
  it("throws when the Agent has not been seeded", async () => {
    const repository: AgentRepository = {
      loadAgent: async () => undefined,
      saveDraft: async () => {},
      appendVersion: async () => {
        throw new Error("should not reach repository");
      },
    };

    await expect(loadAgent(repository)).rejects.toBeInstanceOf(
      AgentNotFoundError,
    );
  });
});
