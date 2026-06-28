export type SourceState = "pending" | "processing" | "ready" | "failed";
export type RunState =
  | "queued"
  | "planning"
  | "awaiting_approval"
  | "running"
  | "paused_credentials"
  | "paused_quota"
  | "succeeded"
  | "failed"
  | "cancelled";

export type Credential = {
  provider: "MiniMax" | "Tavily";
  configured: boolean;
  hint: string;
  validatedAt?: string;
  status: "healthy" | "missing" | "invalid";
};
export type Limits = {
  modelTurns: number;
  tavilySearches: number;
  pageFetches: number;
  activeMinutes: number;
};
export type AgentVersion = {
  id: string;
  number: number;
  publishedAt: string;
  purpose: string;
  instructions: string;
  researchMethod: string;
  reportRequirements: string;
  permissions: { projectSources: boolean; webSearch: boolean };
  limits: Limits;
};
export type Agent = {
  id: string;
  name: string;
  description: string;
  draft: Omit<AgentVersion, "id" | "number" | "publishedAt">;
  versions: AgentVersion[];
  updatedAt: string;
};
export type ProjectSource = {
  id: string;
  name: string;
  kind: "PDF" | "DOCX" | "Markdown" | "Text";
  size: number;
  state: SourceState;
  uploadedAt: string;
  error?: string;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  sources: ProjectSource[];
};
export type Task = {
  id: string;
  projectId: string;
  title: string;
  goal: string;
  language: string;
  sourceIds: string[];
  webResearch: boolean;
  state: "open" | "in_review" | "completed" | "archived";
  runIds: string[];
  acceptedReportId?: string;
  createdAt: string;
};
export type ResearchPlan = {
  objective: string;
  steps: string[];
  approvedAt?: string;
};
export type RunEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: "state" | "tool" | "evidence" | "warning";
};
export type Run = {
  id: string;
  taskId: string;
  agentVersion: number;
  state: RunState;
  createdAt: string;
  updatedAt: string;
  plan: ResearchPlan;
  events: RunEvent[];
  progress: number;
  reportId?: string;
  revisionFeedback?: string;
  pauseReason?: string;
};
export type SourceExcerpt = {
  id: string;
  sourceName: string;
  locator: string;
  text: string;
  url?: string;
};
export type ReportBlock = {
  id: string;
  type: "factual" | "synthesis" | "recommendation" | "limitation";
  text: string;
  citationIds: string[];
};
export type Report = {
  id: string;
  taskId: string;
  runId: string;
  title: string;
  createdAt: string;
  blocks: ReportBlock[];
  excerpts: SourceExcerpt[];
  acceptedAt?: string;
};
export type Activity = {
  id: string;
  at: string;
  text: string;
  tone: "info" | "success" | "warning";
};
export type FrontendState = {
  schemaVersion: 1;
  workspace: { name: string; setupComplete: boolean };
  credentials: Credential[];
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  runs: Run[];
  reports: Report[];
  activity: Activity[];
  system: {
    version: string;
    storageUsed: number;
    storageLimit: number;
    health: "healthy" | "degraded";
  };
};

export type NewTask = Pick<
  Task,
  "projectId" | "title" | "goal" | "language" | "sourceIds" | "webResearch"
>;
export interface FrontendDataSource {
  getState(): FrontendState;
  subscribe(listener: () => void): () => void;
  completeSetup(credentials: Record<string, string>): void;
  replaceCredential(provider: Credential["provider"], secret: string): void;
  saveAgentDraft(agentId: string, draft: Agent["draft"]): void;
  publishAgent(agentId: string): AgentVersion;
  createProject(name: string, description: string): Project;
  addSource(
    projectId: string,
    file: { name: string; size: number; type: string },
  ): ProjectSource;
  removeSource(projectId: string, sourceId: string): void;
  createTask(input: NewTask): Task;
  createRun(taskId: string, feedback?: string, agentVersion?: number): Run;
  approvePlan(runId: string): void;
  cancelRun(runId: string): void;
  resumeRun(runId: string): void;
  advanceRun(runId: string): void;
  reviseReport(reportId: string, feedback: string): Run;
  acceptReport(reportId: string): void;
  exportBackup(): string;
  restoreBackup(value: string): void;
  reset(): void;
}

const now = "2026-06-27T09:00:00.000Z";
const draft: Agent["draft"] = {
  purpose:
    "Produce clear, evidence-backed research for consequential decisions.",
  instructions:
    "Prioritize primary sources, distinguish facts from inference, and expose uncertainty.",
  researchMethod:
    "Frame the question, inspect project material, discover public evidence, triangulate, then synthesize.",
  reportRequirements:
    "Lead with an executive summary. Link every factual claim to retained evidence.",
  permissions: { projectSources: true, webSearch: true },
  limits: {
    modelTurns: 20,
    tavilySearches: 10,
    pageFetches: 30,
    activeMinutes: 15,
  },
};

export function seedState(): FrontendState {
  const excerpts: SourceExcerpt[] = [
    {
      id: "ex-1",
      sourceName: "Market landscape.md",
      locator: "Section 2",
      text: "Teams report that evidence traceability is the primary barrier to adopting autonomous research tools.",
    },
    {
      id: "ex-2",
      sourceName: "Product strategy.pdf",
      locator: "Page 8",
      text: "Local-first deployment reduces data-governance review time for regulated teams.",
    },
    {
      id: "ex-3",
      sourceName: "NIST AI RMF",
      locator: "Govern 1.2",
      text: "Accountability structures should be transparent to affected parties.",
      url: "https://www.nist.gov/itl/ai-risk-management-framework",
    },
  ];
  return {
    schemaVersion: 1,
    workspace: { name: "Northstar Research", setupComplete: true },
    credentials: [
      {
        provider: "MiniMax",
        configured: true,
        hint: "•••• 7H2K",
        validatedAt: now,
        status: "healthy",
      },
      {
        provider: "Tavily",
        configured: true,
        hint: "•••• R9QF",
        validatedAt: now,
        status: "healthy",
      },
    ],
    agents: [
      {
        id: "agent-1",
        name: "General Research",
        description: "A rigorous general-purpose research analyst",
        draft: structuredClone(draft),
        versions: [
          {
            id: "av-3",
            number: 3,
            publishedAt: now,
            ...structuredClone(draft),
          },
        ],
        updatedAt: now,
      },
    ],
    projects: [
      {
        id: "project-1",
        name: "Agent market analysis",
        description: "Evidence for the v0.1 product strategy",
        createdAt: now,
        sources: [
          {
            id: "source-1",
            name: "Market landscape.md",
            kind: "Markdown",
            size: 184320,
            state: "ready",
            uploadedAt: now,
          },
          {
            id: "source-2",
            name: "Product strategy.pdf",
            kind: "PDF",
            size: 2146304,
            state: "ready",
            uploadedAt: now,
          },
          {
            id: "source-3",
            name: "Interview notes.docx",
            kind: "DOCX",
            size: 864256,
            state: "processing",
            uploadedAt: now,
          },
        ],
      },
      {
        id: "project-2",
        name: "Governance brief",
        description: "Research on trustworthy AI operations",
        createdAt: "2026-06-25T11:20:00.000Z",
        sources: [],
      },
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Evaluate local-first research opportunity",
        goal: "Assess the strongest market opportunity for a local-first agent research product.",
        language: "English",
        sourceIds: ["source-1", "source-2"],
        webResearch: true,
        state: "in_review",
        runIds: ["run-1"],
        createdAt: now,
      },
      {
        id: "task-2",
        projectId: "project-2",
        title: "AI governance controls",
        goal: "Identify pragmatic governance controls.",
        language: "English",
        sourceIds: [],
        webResearch: true,
        state: "open",
        runIds: ["run-2"],
        createdAt: now,
      },
      {
        id: "task-3",
        projectId: "project-1",
        title: "Source quality audit",
        goal: "Audit source coverage and identify gaps.",
        language: "English",
        sourceIds: ["source-1"],
        webResearch: false,
        state: "open",
        runIds: ["run-3"],
        createdAt: now,
      },
    ],
    runs: [
      {
        id: "run-1",
        taskId: "task-1",
        agentVersion: 3,
        state: "succeeded",
        createdAt: now,
        updatedAt: now,
        progress: 100,
        reportId: "report-1",
        plan: {
          objective:
            "Evaluate the opportunity using internal strategy and external governance evidence.",
          steps: [
            "Review selected project sources",
            "Validate the market thesis with public evidence",
            "Compare opportunity and adoption risks",
            "Draft an evidence-linked recommendation",
          ],
          approvedAt: now,
        },
        events: [
          {
            id: "ev-1",
            at: now,
            title: "Run started",
            detail: "Agent Version 3 snapshot created.",
            kind: "state",
          },
          {
            id: "ev-2",
            at: now,
            title: "Sources searched",
            detail: "Retained 3 relevant excerpts from 2 sources.",
            kind: "evidence",
          },
          {
            id: "ev-3",
            at: now,
            title: "Report submitted",
            detail: "All factual blocks passed citation validation.",
            kind: "state",
          },
        ],
      },
      {
        id: "run-2",
        taskId: "task-2",
        agentVersion: 3,
        state: "awaiting_approval",
        createdAt: now,
        updatedAt: now,
        progress: 12,
        plan: {
          objective:
            "Identify a minimum viable set of accountable governance controls.",
          steps: [
            "Review recognized governance frameworks",
            "Map controls to the local deployment model",
            "Prioritize high-leverage safeguards",
          ],
        },
        events: [
          {
            id: "ev-4",
            at: now,
            title: "Research Plan ready",
            detail: "Owner approval is required before evidence tools unlock.",
            kind: "state",
          },
        ],
      },
      {
        id: "run-3",
        taskId: "task-3",
        agentVersion: 3,
        state: "paused_quota",
        createdAt: now,
        updatedAt: now,
        progress: 46,
        pauseReason: "MiniMax quota is temporarily exhausted.",
        plan: {
          objective: "Audit the supplied evidence corpus.",
          steps: [
            "Inventory sources",
            "Assess freshness and authority",
            "List material gaps",
          ],
          approvedAt: now,
        },
        events: [
          {
            id: "ev-5",
            at: now,
            title: "Run paused",
            detail: "Provider quota was exhausted at checkpoint 4.",
            kind: "warning",
          },
        ],
      },
    ],
    reports: [
      {
        id: "report-1",
        taskId: "task-1",
        runId: "run-1",
        title: "The local-first research opportunity",
        createdAt: now,
        excerpts,
        blocks: [
          {
            id: "b-1",
            type: "synthesis",
            text: "The strongest opportunity is a trustworthy research workspace for teams that need both useful automation and inspectable evidence.",
            citationIds: ["ex-1", "ex-2"],
          },
          {
            id: "b-2",
            type: "factual",
            text: "Traceability remains a primary adoption barrier, while local deployment can shorten governance review.",
            citationIds: ["ex-1", "ex-2"],
          },
          {
            id: "b-3",
            type: "recommendation",
            text: "Lead with evidence inspection and approval gates, not generalized autonomy.",
            citationIds: ["ex-3"],
          },
          {
            id: "b-4",
            type: "limitation",
            text: "The current evidence set is directional and should be validated with additional customer interviews.",
            citationIds: [],
          },
        ],
      },
    ],
    activity: [
      {
        id: "act-1",
        at: now,
        text: "Report “The local-first research opportunity” is ready for review",
        tone: "success",
      },
      {
        id: "act-2",
        at: now,
        text: "Research Plan for “AI governance controls” needs approval",
        tone: "warning",
      },
      {
        id: "act-3",
        at: now,
        text: "Interview notes.docx is being indexed",
        tone: "info",
      },
    ],
    system: {
      version: "0.1.0-demo",
      storageUsed: 1.8,
      storageLimit: 20,
      health: "healthy",
    },
  };
}

export function validateUpload(file: {
  name: string;
  size: number;
  type: string;
}): { kind?: ProjectSource["kind"]; error?: string } {
  if (file.size > 25 * 1024 * 1024)
    return { error: "Files must be 25 MB or smaller." };
  const extension = file.name.split(".").pop()?.toLowerCase();
  const kinds = {
    pdf: "PDF",
    docx: "DOCX",
    md: "Markdown",
    txt: "Text",
  } as const;
  const kind = extension ? kinds[extension as keyof typeof kinds] : undefined;
  if (!kind)
    return {
      error: "Unsupported file. Use text-based PDF, DOCX, Markdown, or TXT.",
    };
  const allowedMimeTypes: Record<ProjectSource["kind"], string[]> = {
    PDF: ["application/pdf"],
    DOCX: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    Markdown: ["text/markdown", "text/x-markdown"],
    Text: ["text/plain"],
  };
  if (file.type && !allowedMimeTypes[kind].includes(file.type)) {
    return { error: "Declared file type does not match the extension." };
  }
  return { kind };
}

export function renderReportMarkdown(report: Report): string {
  const blocks = report.blocks
    .map(
      (block) =>
        `${block.text}${block.citationIds.map((id) => ` [^${id}]`).join("")}`,
    )
    .join("\n\n");
  const appendix = report.excerpts
    .map(
      (excerpt) =>
        `[^${excerpt.id}]: **${excerpt.sourceName}**, ${excerpt.locator}. ${excerpt.text}${excerpt.url ? ` ${excerpt.url}` : ""}`,
    )
    .join("\n\n");
  return `# ${report.title}\n\n${blocks}\n\n## Source appendix\n\n${appendix}\n`;
}
