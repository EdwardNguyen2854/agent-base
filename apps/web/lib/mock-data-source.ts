import {
  type Agent,
  type Credential,
  type FrontendDataSource,
  type FrontendState,
  type NewTask,
  type Project,
  type ProjectSource,
  type Report,
  type Run,
  type RunEvent,
  seedState,
  type Task,
  validateUpload,
} from "./frontend-data";

export const STORAGE_KEY = "agent-base:frontend:v1";

const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const timestamp = () => new Date().toISOString();

export function migrateStoredState(value: string | null): FrontendState {
  if (!value) return seedState();
  try {
    const parsed = JSON.parse(value) as Partial<FrontendState> & {
      schemaVersion?: number;
    };
    if (parsed.schemaVersion !== 1 || !parsed.projects || !parsed.runs)
      return seedState();
    return parsed as FrontendState;
  } catch {
    return seedState();
  }
}

export class MockFrontendDataSource implements FrontendDataSource {
  private state: FrontendState;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly storage?: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    >,
  ) {
    this.state = migrateStoredState(storage?.getItem(STORAGE_KEY) ?? null);
    this.reconcile();
  }

  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private commit(next: FrontendState) {
    this.state = next;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    for (const listener of this.listeners) listener();
  }

  private update(mutator: (draft: FrontendState) => void) {
    const next = structuredClone(this.state);
    mutator(next);
    this.commit(next);
  }

  private reconcile() {
    const next = structuredClone(this.state);
    for (const project of next.projects) {
      for (const source of project.sources) {
        if (
          source.state === "pending" &&
          Date.now() - Date.parse(source.uploadedAt) > 800
        )
          source.state = "processing";
        if (
          source.state === "processing" &&
          Date.now() - Date.parse(source.uploadedAt) > 2500
        )
          source.state = "ready";
      }
    }
    this.state = next;
  }

  completeSetup(credentials: Record<string, string>) {
    this.update((state) => {
      state.workspace.setupComplete = true;
      for (const credential of state.credentials) {
        const secret = credentials[credential.provider];
        if (secret)
          Object.assign(credential, {
            configured: true,
            status: "healthy",
            hint: `•••• ${secret.slice(-4).toUpperCase()}`,
            validatedAt: timestamp(),
          });
      }
    });
  }

  replaceCredential(provider: Credential["provider"], secret: string) {
    if (secret.trim().length < 6)
      throw new Error("Enter a valid credential with at least 6 characters.");
    this.update((state) => {
      const credential = state.credentials.find(
        (item) => item.provider === provider,
      );
      if (credential)
        Object.assign(credential, {
          configured: true,
          status: "healthy",
          hint: `•••• ${secret.slice(-4).toUpperCase()}`,
          validatedAt: timestamp(),
        });
      for (const run of state.runs.filter(
        (item) => item.state === "paused_credentials",
      ))
        run.pauseReason = "Credential replaced. Resume when ready.";
    });
  }

  saveAgentDraft(agentId: string, draft: Agent["draft"]) {
    this.update((state) => {
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) throw new Error("Agent not found.");
      agent.draft = draft;
      agent.updatedAt = timestamp();
    });
  }

  publishAgent(agentId: string) {
    let published!: Agent["versions"][number];
    this.update((state) => {
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) throw new Error("Agent not found.");
      published = {
        id: id("av"),
        number: (agent.versions.at(-1)?.number ?? 0) + 1,
        publishedAt: timestamp(),
        ...structuredClone(agent.draft),
      };
      agent.versions.push(published);
      state.activity.unshift({
        id: id("act"),
        at: timestamp(),
        text: `${agent.name} version ${published.number} published`,
        tone: "success",
      });
    });
    return published;
  }

  createProject(name: string, description: string) {
    if (!name.trim()) throw new Error("Project name is required.");
    let project!: Project;
    this.update((state) => {
      project = {
        id: id("project"),
        name: name.trim(),
        description: description.trim(),
        createdAt: timestamp(),
        sources: [],
      };
      state.projects.unshift(project);
      state.activity.unshift({
        id: id("act"),
        at: timestamp(),
        text: `Project “${project.name}” created`,
        tone: "success",
      });
    });
    return project;
  }

  addSource(
    projectId: string,
    file: { name: string; size: number; type: string },
  ) {
    const validation = validateUpload(file);
    if (validation.error || !validation.kind)
      throw new Error(validation.error ?? "Invalid file.");
    const kind = validation.kind;
    let source!: ProjectSource;
    this.update((state) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) throw new Error("Project not found.");
      if (project.sources.length >= 100)
        throw new Error("A Project can contain at most 100 active Sources.");
      source = {
        id: id("source"),
        name: file.name,
        size: file.size,
        kind,
        state: "pending",
        uploadedAt: timestamp(),
      };
      project.sources.push(source);
    });
    return source;
  }

  removeSource(projectId: string, sourceId: string) {
    this.update((state) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return;
      project.sources = project.sources.filter(
        (source) => source.id !== sourceId,
      );
    });
  }

  createTask(input: NewTask) {
    if (!input.title.trim() || !input.goal.trim())
      throw new Error("Title and research goal are required.");
    let task!: Task;
    this.update((state) => {
      task = {
        id: id("task"),
        ...input,
        title: input.title.trim(),
        goal: input.goal.trim(),
        state: "open",
        runIds: [],
        createdAt: timestamp(),
      };
      state.tasks.unshift(task);
    });
    return task;
  }

  createRun(taskId: string, feedback?: string) {
    let run!: Run;
    this.update((state) => {
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Task not found.");
      const active = state.runs.some((item) =>
        ["planning", "running"].includes(item.state),
      );
      run = {
        id: id("run"),
        taskId,
        agentVersion: state.agents[0]?.versions.at(-1)?.number ?? 1,
        state: active ? "queued" : "awaiting_approval",
        createdAt: timestamp(),
        updatedAt: timestamp(),
        progress: active ? 0 : 12,
        revisionFeedback: feedback,
        plan: {
          objective: task.goal,
          steps: [
            "Review the selected Project Sources",
            ...(task.webResearch ? ["Find and validate public evidence"] : []),
            "Triangulate the strongest findings",
            "Draft an evidence-linked Report",
          ],
        },
        events: [
          {
            id: id("ev"),
            at: timestamp(),
            title: active ? "Run queued" : "Research Plan ready",
            detail: active
              ? "Waiting for the active Run to finish."
              : "Review and approve the plan to unlock evidence tools.",
            kind: "state",
          },
        ],
      };
      state.runs.unshift(run);
      task.runIds.push(run.id);
    });
    return run;
  }

  approvePlan(runId: string) {
    this.update((state) => {
      const run = state.runs.find((item) => item.id === runId);
      if (!run || run.state !== "awaiting_approval")
        throw new Error("This plan is no longer awaiting approval.");
      if (
        state.runs.some(
          (item) =>
            item.id !== runId && ["planning", "running"].includes(item.state),
        )
      )
        throw new Error("Another Run is active. This Run will remain queued.");
      run.state = "running";
      run.progress = 25;
      run.plan.approvedAt = timestamp();
      run.updatedAt = timestamp();
      run.events.push(
        this.event(
          "Plan approved",
          "Evidence tools are now available.",
          "state",
        ),
      );
    });
  }

  cancelRun(runId: string) {
    this.update((state) => {
      const run = state.runs.find((item) => item.id === runId);
      if (!run || ["succeeded", "failed", "cancelled"].includes(run.state))
        throw new Error("This Run is already terminal.");
      run.state = "cancelled";
      run.updatedAt = timestamp();
      run.events.push(
        this.event("Run cancelled", "No Report was created.", "warning"),
      );
      this.releaseQueue(state);
    });
  }

  resumeRun(runId: string) {
    this.update((state) => {
      const run = state.runs.find((item) => item.id === runId);
      if (!run || !["paused_credentials", "paused_quota"].includes(run.state))
        throw new Error("This Run cannot be resumed.");
      if (
        state.runs.some((item) => item.id !== runId && item.state === "running")
      )
        throw new Error("Another Run is active.");
      run.state = "running";
      run.pauseReason = undefined;
      run.events.push(
        this.event(
          "Run resumed",
          "Resumed from the latest committed checkpoint.",
          "state",
        ),
      );
    });
  }

  advanceRun(runId: string) {
    this.update((state) => {
      const run = state.runs.find((item) => item.id === runId);
      if (!run || run.state !== "running")
        throw new Error("Only a running Run can advance.");
      run.progress = Math.min(100, run.progress + 25);
      run.updatedAt = timestamp();
      run.events.push(
        this.event(
          run.progress >= 100
            ? "Report submitted"
            : "Research checkpoint committed",
          run.progress >= 100
            ? "Citation validation passed."
            : `${run.progress}% of the Run is complete.`,
          run.progress >= 100 ? "state" : "tool",
        ),
      );
      if (run.progress >= 100) {
        run.state = "succeeded";
        const task = state.tasks.find((item) => item.id === run.taskId);
        if (!task) throw new Error("Task not found.");
        task.state = "in_review";
        const report: Report = {
          id: id("report"),
          taskId: task.id,
          runId: run.id,
          title: task.title,
          createdAt: timestamp(),
          excerpts: [],
          blocks: [
            {
              id: id("block"),
              type: "recommendation",
              text: "The evidence supports a focused, measured next step with explicit review gates.",
              citationIds: [],
            },
          ],
        };
        state.reports.unshift(report);
        run.reportId = report.id;
        this.releaseQueue(state);
      }
    });
  }

  reviseReport(reportId: string, feedback: string) {
    if (!feedback.trim()) throw new Error("Revision feedback is required.");
    const report = this.state.reports.find((item) => item.id === reportId);
    if (!report) throw new Error("Report not found.");
    return this.createRun(report.taskId, feedback.trim());
  }

  acceptReport(reportId: string) {
    this.update((state) => {
      const report = state.reports.find((item) => item.id === reportId);
      if (!report) throw new Error("Report not found.");
      const task = state.tasks.find((item) => item.id === report.taskId);
      if (!task) throw new Error("Task not found.");
      if (task.acceptedReportId)
        throw new Error("This Task already has an accepted outcome.");
      report.acceptedAt = timestamp();
      task.acceptedReportId = report.id;
      task.state = "completed";
      state.activity.unshift({
        id: id("act"),
        at: timestamp(),
        text: `Report “${report.title}” accepted`,
        tone: "success",
      });
    });
  }

  exportBackup() {
    return JSON.stringify(
      { exportedAt: timestamp(), application: "Agent Base", state: this.state },
      null,
      2,
    );
  }
  restoreBackup(value: string) {
    const parsed = JSON.parse(value) as { state?: FrontendState };
    if (!parsed.state || parsed.state.schemaVersion !== 1)
      throw new Error("This is not a valid Agent Base backup.");
    this.commit(parsed.state);
  }
  reset() {
    this.storage?.removeItem(STORAGE_KEY);
    this.commit(seedState());
  }

  private event(
    title: string,
    detail: string,
    kind: RunEvent["kind"],
  ): RunEvent {
    return { id: id("ev"), at: timestamp(), title, detail, kind };
  }
  private releaseQueue(state: FrontendState) {
    const next = [...state.runs]
      .reverse()
      .find((item) => item.state === "queued");
    if (next) {
      next.state = "awaiting_approval";
      next.progress = 12;
      next.events.push(
        this.event(
          "Research Plan ready",
          "The queue advanced after the active Run ended.",
          "state",
        ),
      );
    }
  }
}
