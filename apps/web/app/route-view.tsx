"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  HardDrive,
  KeyRound,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";
import {
  type Agent,
  type Run,
  renderReportMarkdown,
} from "../lib/frontend-data";
import { useData } from "./data-provider";
import { EmptyState, PageHeader, StatusBadge } from "./workspace-shell";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
const formatSize = (value: number) =>
  value > 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(value / 1024)} KB`;

export function DashboardView() {
  const [state] = useData();
  const active = state.runs.filter((run) =>
    [
      "running",
      "awaiting_approval",
      "paused_quota",
      "paused_credentials",
    ].includes(run.state),
  );
  return (
    <>
      <PageHeader
        eyebrow="Friday, June 27"
        title={`Good morning, Owner`}
        description="Here’s what needs your attention across the workspace."
        actions={
          <Link className="button primary" href="/projects">
            <Plus />
            New Project
          </Link>
        }
      />
      <div className="notice">
        <Sparkles />
        <div>
          <strong>You’re exploring a fully interactive demo.</strong>
          <span>
            Changes are stored only in this browser and can be reset in System
            settings.
          </span>
        </div>
        <Link href="/settings/system">Manage demo</Link>
      </div>
      <section>
        <div className="section-heading">
          <div>
            <h2>Active work</h2>
            <p>Runs that are progressing or waiting for you</p>
          </div>
          <Link href="/runs">
            View all <ArrowRight />
          </Link>
        </div>
        <div className="cards-grid">
          {active.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      </section>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <div>
              <h2>Recent Projects</h2>
              <p>Your reusable research workspaces</p>
            </div>
            <Link href="/projects">View all</Link>
          </div>
          <div className="panel list-panel">
            {state.projects.slice(0, 3).map((project) => (
              <Link
                className="list-row"
                key={project.id}
                href={`/projects/${project.id}`}
              >
                <span className="row-icon">
                  <FolderKanban />
                </span>
                <span className="row-main">
                  <strong>{project.name}</strong>
                  <small>
                    {project.sources.length} Sources ·{" "}
                    {
                      state.tasks.filter(
                        (task) => task.projectId === project.id,
                      ).length
                    }{" "}
                    Tasks
                  </small>
                </span>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading">
            <div>
              <h2>Workspace activity</h2>
              <p>Latest updates from Agent Base</p>
            </div>
          </div>
          <div className="panel activity-list">
            {state.activity.map((activity) => (
              <div className="activity-item" key={activity.id}>
                <span className={`activity-dot ${activity.tone}`} />
                <div>
                  <p>{activity.text}</p>
                  <small>{formatDate(activity.at)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="system-strip">
        <div>
          <span className="health-orb">
            <Check />
          </span>
          <div>
            <strong>All systems operational</strong>
            <small>Web, worker, database, and storage are healthy</small>
          </div>
        </div>
        <div className="system-stats">
          <span>
            <strong>{state.projects.length}</strong> Projects
          </span>
          <span>
            <strong>{state.tasks.length}</strong> Tasks
          </span>
          <span>
            <strong>{state.system.storageUsed} GB</strong> Storage
          </span>
          <Link href="/settings/system">
            System status <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}

function RunCard({ run }: { run: Run }) {
  const [state] = useData();
  const task = state.tasks.find((item) => item.id === run.taskId);
  return (
    <Link href={`/runs/${run.id}`} className="panel run-card">
      <div className="card-top">
        <StatusBadge value={run.state} />
        <MoreHorizontal />
      </div>
      <h3>{task?.title}</h3>
      <p>
        {run.state === "awaiting_approval"
          ? "Research Plan is ready for your review."
          : (run.pauseReason ?? run.events.at(-1)?.detail)}
      </p>
      <div className="progress">
        <span style={{ width: `${run.progress}%` }} />
      </div>
      <div className="card-meta">
        <span>
          <Clock3 />
          Updated {formatDate(run.updatedAt)}
        </span>
        <strong>{run.progress}%</strong>
      </div>
    </Link>
  );
}

export function AgentsView() {
  const [state] = useData();
  return (
    <>
      <PageHeader
        title="Agents"
        description="Configure reusable research behavior and publish immutable versions."
      />
      <div className="cards-grid">
        {state.agents.map((agent) => (
          <Link
            className="panel entity-card"
            href={`/agents/${agent.id}`}
            key={agent.id}
          >
            <div className="entity-icon">
              <Bot />
            </div>
            <div className="card-top">
              <StatusBadge value="published" />
              <MoreHorizontal />
            </div>
            <h2>{agent.name}</h2>
            <p>{agent.description}</p>
            <dl>
              <div>
                <dt>Published</dt>
                <dd>Version {agent.versions.at(-1)?.number}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(agent.updatedAt)}</dd>
              </div>
            </dl>
            <span className="text-link">
              Open Agent <ArrowRight />
            </span>
          </Link>
        ))}
      </div>
      <div className="panel info-panel">
        <ShieldCheck />
        <div>
          <h3>Immutable publication</h3>
          <p>
            Each publication snapshots the Agent Draft. Existing Runs always
            retain the exact version they started with.
          </p>
        </div>
      </div>
    </>
  );
}

export function AgentDetailView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const agent = state.agents.find((item) => item.id === id);
  const [draft, setDraft] = useState<Agent["draft"] | null>(
    agent ? structuredClone(agent.draft) : null,
  );
  const [tab, setTab] = useState("Draft");
  const [toast, setToast] = useState("");
  const [inspect, setInspect] = useState<number>();
  const dirty = Boolean(
    agent && draft && JSON.stringify(draft) !== JSON.stringify(agent.draft),
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!agent || !draft) return <NotFound entity="Agent" />;
  const save = () => {
    source.saveAgentDraft(agent.id, draft);
    setToast("Draft saved.");
  };
  const publish = () => {
    if (dirty) source.saveAgentDraft(agent.id, draft);
    const version = source.publishAgent(agent.id);
    setToast(`Version ${version.number} published.`);
  };
  return (
    <>
      <Link className="back-link" href="/agents">
        <ArrowLeft />
        Agents
      </Link>
      <PageHeader
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <button
              className="button secondary"
              type="button"
              disabled={!dirty}
              onClick={save}
            >
              Save draft
            </button>
            <button className="button primary" type="button" onClick={publish}>
              <Sparkles />
              Publish version
            </button>
          </>
        }
      />
      {toast ? (
        <div className="toast">
          <CheckCircle2 />
          {toast}
          <button type="button" onClick={() => setToast("")}>
            <X />
          </button>
        </div>
      ) : null}
      <div className="tabs" role="tablist">
        {["Draft", "Permissions & limits", "Version history"].map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Draft" ? (
        <div className="panel form-panel">
          <Field
            label="Purpose"
            value={draft.purpose}
            onChange={(purpose) => setDraft({ ...draft, purpose })}
            multiline
          />
          <Field
            label="Operating instructions"
            value={draft.instructions}
            onChange={(instructions) => setDraft({ ...draft, instructions })}
            multiline
          />
          <Field
            label="Research method"
            value={draft.researchMethod}
            onChange={(researchMethod) =>
              setDraft({ ...draft, researchMethod })
            }
            multiline
          />
          <Field
            label="Report outline and requirements"
            value={draft.reportRequirements}
            onChange={(reportRequirements) =>
              setDraft({ ...draft, reportRequirements })
            }
            multiline
          />
          {dirty ? (
            <p className="dirty-note">
              <span />
              Unsaved changes
            </p>
          ) : null}
        </div>
      ) : null}
      {tab === "Permissions & limits" ? (
        <div className="panel form-panel">
          <h2>Evidence permissions</h2>
          <Toggle
            label="Use Project Sources"
            description="Search selected Sources attached to the Task."
            checked={draft.permissions.projectSources}
            onChange={(projectSources) =>
              setDraft({
                ...draft,
                permissions: { ...draft.permissions, projectSources },
              })
            }
          />
          <Toggle
            label="Use public web evidence"
            description="Discover sources with Tavily and retrieve eligible public pages."
            checked={draft.permissions.webSearch}
            onChange={(webSearch) =>
              setDraft({
                ...draft,
                permissions: { ...draft.permissions, webSearch },
              })
            }
          />
          <h2>Run limits</h2>
          <div className="field-grid">
            {Object.entries(draft.limits).map(([key, value]) => (
              <label className="field" key={key}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      limits: {
                        ...draft.limits,
                        [key]: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <p className="hint">
            Limits may reduce, but never exceed, the platform maximums.
          </p>
        </div>
      ) : null}
      {tab === "Version history" ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Published</th>
                <th>Purpose</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {agent.versions.toReversed().map((version) => (
                <tr key={version.id}>
                  <td>
                    <strong>v{version.number}</strong>
                  </td>
                  <td>{formatDate(version.publishedAt)}</td>
                  <td>{version.purpose}</td>
                  <td>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setInspect(version.number)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {inspect ? (
        <div className="drawer-backdrop">
          <aside className="drawer">
            <button
              className="icon-button drawer-close"
              type="button"
              onClick={() => setInspect(undefined)}
            >
              <X />
            </button>
            <p className="eyebrow">Immutable snapshot</p>
            <h2>Version {inspect}</h2>
            <p>
              {agent.versions.find((item) => item.number === inspect)?.purpose}
            </p>
            <hr />
            <h3>Research method</h3>
            <p>
              {
                agent.versions.find((item) => item.number === inspect)
                  ?.researchMethod
              }
            </p>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function ProjectsView() {
  const [state, source] = useData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const projects = state.projects.filter((project) =>
    `${project.name} ${project.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const project = source.createProject(name, description);
    router.push(`/projects/${project.id}`);
  };
  return (
    <>
      <PageHeader
        title="Projects"
        description="Organize reusable Sources and research Tasks."
        actions={
          <button
            className="button primary"
            type="button"
            onClick={() => setDialog(true)}
          >
            <Plus />
            New Project
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Search />
          <input
            aria-label="Search Projects"
            placeholder="Search Projects…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span>{projects.length} Projects</span>
      </div>
      {projects.length ? (
        <div className="cards-grid">
          {projects.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              className="panel entity-card"
              key={project.id}
            >
              <div className="entity-icon">
                <FolderKanban />
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || "No description"}</p>
              <dl>
                <div>
                  <dt>Sources</dt>
                  <dd>{project.sources.length}</dd>
                </div>
                <div>
                  <dt>Tasks</dt>
                  <dd>
                    {
                      state.tasks.filter(
                        (task) => task.projectId === project.id,
                      ).length
                    }
                  </dd>
                </div>
              </dl>
              <span className="text-link">
                Open Project <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban />}
          title="No matching Projects"
          description="Adjust your search or create a new Project."
        />
      )}
      {dialog ? (
        <Modal title="Create Project" onClose={() => setDialog(false)}>
          <form onSubmit={submit}>
            <Field label="Project name" value={name} onChange={setName} />
            <Field
              label="Description"
              value={description}
              onChange={setDescription}
              multiline
            />
            <div className="dialog-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setDialog(false)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit">
                Create Project
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const project = state.projects.find((item) => item.id === id);
  const [tab, setTab] = useState("Sources");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string>();
  if (!project) return <NotFound entity="Project" />;
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(event.target.files ?? [])) {
      try {
        source.addSource(project.id, file);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Upload failed.");
      }
    }
    event.target.value = "";
  };
  const tasks = state.tasks.filter((task) => task.projectId === project.id);
  return (
    <>
      <Link className="back-link" href="/projects">
        <ArrowLeft />
        Projects
      </Link>
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <Link
            className="button primary"
            href={`/tasks/new?project=${project.id}`}
          >
            <Plus />
            New Task
          </Link>
        }
      />
      <div className="tabs" role="tablist">
        {["Overview", "Sources", "Tasks"].map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
            <span>
              {item === "Sources"
                ? project.sources.length
                : item === "Tasks"
                  ? tasks.length
                  : ""}
            </span>
          </button>
        ))}
      </div>
      {tab === "Overview" ? (
        <div className="metric-grid">
          <div className="panel metric">
            <FileText />
            <strong>{project.sources.length}</strong>
            <span>Project Sources</span>
          </div>
          <div className="panel metric">
            <CheckCircle2 />
            <strong>{tasks.length}</strong>
            <span>Research Tasks</span>
          </div>
          <div className="panel metric">
            <Clock3 />
            <strong>
              {
                project.sources.filter((item) => item.state === "processing")
                  .length
              }
            </strong>
            <span>Processing</span>
          </div>
        </div>
      ) : null}
      {tab === "Sources" ? (
        <>
          <label className="dropzone">
            <Upload />
            <strong>Drop files here or choose files</strong>
            <span>Text-based PDF, DOCX, Markdown, or TXT · 25 MB maximum</span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.md,.txt"
              onChange={onFiles}
            />
          </label>
          {error ? (
            <p className="error-banner" role="alert">
              <XCircle />
              {error}
            </p>
          ) : null}
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {project.sources.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="file-name">
                        <FileText />
                        {item.name}
                      </span>
                    </td>
                    <td>{item.kind}</td>
                    <td>{formatSize(item.size)}</td>
                    <td>
                      <StatusBadge value={item.state} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => setConfirm(item.id)}
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {tab === "Tasks" ? (
        tasks.length ? (
          <TaskTable tasks={tasks} />
        ) : (
          <EmptyState
            title="No Tasks yet"
            description="Create a research Task grounded in this Project’s Sources."
            action={
              <Link
                className="button primary"
                href={`/tasks/new?project=${project.id}`}
              >
                Create Task
              </Link>
            }
          />
        )
      ) : null}
      {confirm ? (
        <Modal title="Delete Source?" onClose={() => setConfirm(undefined)}>
          <div className="warning-box">
            <AlertTriangle />
            <p>
              Original bytes and reusable chunks will be removed. Historical Run
              excerpts remain available.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setConfirm(undefined)}
            >
              Keep Source
            </button>
            <button
              className="button danger"
              type="button"
              onClick={() => {
                source.removeSource(project.id, confirm);
                setConfirm(undefined);
              }}
            >
              Delete Source
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function TasksView() {
  const [state] = useData();
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Research goals and their immutable Run attempts."
        actions={
          <Link className="button primary" href="/tasks/new">
            <Plus />
            New Task
          </Link>
        }
      />
      <TaskTable tasks={state.tasks} />
    </>
  );
}
function TaskTable({
  tasks,
}: {
  tasks: ReturnType<typeof useData>[0]["tasks"];
}) {
  const [state] = useData();
  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Runs</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <Link className="table-link" href={`/tasks/${task.id}`}>
                  {task.title}
                </Link>
                <small>{task.goal}</small>
              </td>
              <td>
                {
                  state.projects.find(
                    (project) => project.id === task.projectId,
                  )?.name
                }
              </td>
              <td>{task.runIds.length}</td>
              <td>
                <StatusBadge value={task.state} />
              </td>
              <td>{formatDate(task.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NewTaskView() {
  const [state, source] = useData();
  const router = useRouter();
  const params = useParams();
  void params;
  const [projectId, setProjectId] = useState(
    typeof window === "undefined"
      ? (state.projects[0]?.id ?? "")
      : (new URLSearchParams(window.location.search).get("project") ??
          state.projects[0]?.id ??
          ""),
  );
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("English");
  const [webResearch, setWebResearch] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const project = state.projects.find((item) => item.id === projectId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const task = source.createTask({
      projectId,
      title,
      goal,
      language,
      sourceIds: selected,
      webResearch,
    });
    const run = source.createRun(task.id);
    router.push(`/runs/${run.id}`);
  };
  return (
    <>
      <Link className="back-link" href="/tasks">
        <ArrowLeft />
        Tasks
      </Link>
      <PageHeader
        title="Create research Task"
        description="Define the outcome, evidence scope, and Report language."
      />
      <form className="panel form-panel constrained" onSubmit={submit}>
        <Field label="Task title" value={title} onChange={setTitle} />
        <Field
          label="Research goal"
          value={goal}
          onChange={setGoal}
          multiline
        />
        <label className="field">
          <span>Project</span>
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setSelected([]);
            }}
          >
            {state.projects.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Report language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option>English</option>
            <option>Vietnamese</option>
            <option>French</option>
            <option>Spanish</option>
          </select>
        </label>
        <fieldset>
          <legend>Selected Project Sources</legend>
          {project?.sources
            .filter((item) => item.state === "ready")
            .map((item) => (
              <label className="check-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    )
                  }
                />
                <FileText />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.kind} · {formatSize(item.size)}
                  </small>
                </span>
              </label>
            ))}
          {!project?.sources.some((item) => item.state === "ready") ? (
            <p className="hint">
              This Project has no ready Sources. You can still use web research.
            </p>
          ) : null}
        </fieldset>
        <Toggle
          label="Allow public web research"
          description="Use Tavily discovery and eligible public web pages."
          checked={webResearch}
          onChange={setWebResearch}
        />
        <div className="dialog-actions">
          <Link className="button secondary" href="/tasks">
            Cancel
          </Link>
          <button className="button primary" type="submit">
            Create Task & Plan Run
          </button>
        </div>
      </form>
    </>
  );
}

export function TaskDetailView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const router = useRouter();
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return <NotFound entity="Task" />;
  const project = state.projects.find((item) => item.id === task.projectId);
  const runs = task.runIds
    .map((runId) => state.runs.find((run) => run.id === runId))
    .filter(Boolean) as Run[];
  return (
    <>
      <Link className="back-link" href="/tasks">
        <ArrowLeft />
        Tasks
      </Link>
      <PageHeader
        title={task.title}
        description={task.goal}
        actions={
          task.state !== "completed" ? (
            <button
              className="button primary"
              type="button"
              onClick={() =>
                router.push(`/runs/${source.createRun(task.id).id}`)
              }
            >
              <Plus />
              New Run attempt
            </button>
          ) : undefined
        }
      />
      <div className="metric-grid">
        <div className="panel detail-card">
          <span>Project</span>
          <Link href={`/projects/${project?.id}`}>{project?.name}</Link>
        </div>
        <div className="panel detail-card">
          <span>Language</span>
          <strong>{task.language}</strong>
        </div>
        <div className="panel detail-card">
          <span>Web evidence</span>
          <strong>{task.webResearch ? "Allowed" : "Disabled"}</strong>
        </div>
        <div className="panel detail-card">
          <span>Outcome</span>
          <StatusBadge value={task.state} />
        </div>
      </div>
      <section>
        <div className="section-heading">
          <div>
            <h2>Run attempts</h2>
            <p>Each attempt preserves its Agent, inputs, limits, and events.</p>
          </div>
        </div>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link className="table-link" href={`/runs/${run.id}`}>
                      {run.id.slice(-10)}
                    </Link>
                  </td>
                  <td>General Research v{run.agentVersion}</td>
                  <td>
                    <StatusBadge value={run.state} />
                  </td>
                  <td>{run.progress}%</td>
                  <td>{formatDate(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function RunsView() {
  const [state] = useData();
  const queue = state.runs.filter((run) => run.state === "queued");
  return (
    <>
      <PageHeader
        title="Runs"
        description="Inspect the single active execution lane, approval gates, and immutable history."
      />
      {queue.length ? (
        <div className="notice">
          <Clock3 />
          <div>
            <strong>
              {queue.length} Run{queue.length > 1 ? "s" : ""} queued
            </strong>
            <span>
              Agent Base executes one Run at a time. Queued work advances
              automatically.
            </span>
          </div>
        </div>
      ) : null}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Run / Task</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Agent</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {state.runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link className="table-link" href={`/runs/${run.id}`}>
                    {state.tasks.find((task) => task.id === run.taskId)?.title}
                  </Link>
                  <small>{run.id}</small>
                </td>
                <td>
                  <StatusBadge value={run.state} />
                </td>
                <td>
                  <div className="table-progress">
                    <span style={{ width: `${run.progress}%` }} />
                  </div>
                </td>
                <td>v{run.agentVersion}</td>
                <td>{formatDate(run.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function RunDetailView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const router = useRouter();
  const run = state.runs.find((item) => item.id === id);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!run) return <NotFound entity="Run" />;
  const task = state.tasks.find((item) => item.id === run.taskId);
  const act = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    }
  };
  return (
    <>
      <Link className="back-link" href="/runs">
        <ArrowLeft />
        Runs
      </Link>
      <PageHeader
        eyebrow={run.id}
        title={task?.title ?? "Research Run"}
        description={`General Research v${run.agentVersion} · Started ${formatDate(run.createdAt)}`}
        actions={
          <>
            <StatusBadge value={run.state} />
            {!["succeeded", "failed", "cancelled"].includes(run.state) ? (
              <button
                className="button secondary"
                type="button"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel Run
              </button>
            ) : null}
          </>
        }
      />
      {error ? (
        <p className="error-banner">
          <AlertTriangle />
          {error}
        </p>
      ) : null}
      {run.state === "awaiting_approval" ? (
        <section className="panel plan-panel">
          <div className="plan-header">
            <span className="row-icon">
              <Sparkles />
            </span>
            <div>
              <p className="eyebrow">Owner action required</p>
              <h2>Review the Research Plan</h2>
              <p>Evidence tools remain locked until you approve this plan.</p>
            </div>
          </div>
          <div className="objective">
            <span>Objective</span>
            <p>{run.plan.objective}</p>
          </div>
          <ol className="plan-steps">
            {run.plan.steps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <div className="plan-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel this Run
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => act(() => source.approvePlan(run.id))}
            >
              <Check />
              Approve & continue
            </button>
          </div>
        </section>
      ) : null}
      {["paused_quota", "paused_credentials"].includes(run.state) ? (
        <div className="pause-card">
          <CirclePause />
          <div>
            <h2>Run paused safely</h2>
            <p>{run.pauseReason}</p>
            <span>Resume continues from the latest committed checkpoint.</span>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => act(() => source.resumeRun(run.id))}
          >
            <RefreshCw />
            Resume Run
          </button>
        </div>
      ) : null}
      {run.state === "running" ? (
        <div className="panel live-progress">
          <div>
            <span className="pulse" />
            <div>
              <strong>Research in progress</strong>
              <small>Checkpointed after every committed step</small>
            </div>
          </div>
          <strong>{run.progress}%</strong>
          <div className="progress">
            <span style={{ width: `${run.progress}%` }} />
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => act(() => source.advanceRun(run.id))}
          >
            Simulate next checkpoint
          </button>
        </div>
      ) : null}
      {run.state === "succeeded" && run.reportId ? (
        <div className="success-card">
          <CheckCircle2 />
          <div>
            <h2>Report ready for review</h2>
            <p>
              The Run completed and every required citation passed validation.
            </p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => router.push(`/reports/${run.reportId}`)}
          >
            Review Report <ArrowRight />
          </button>
        </div>
      ) : null}
      <section>
        <div className="section-heading">
          <div>
            <h2>Run Events</h2>
            <p>
              A sanitized, inspectable record of state, evidence, and tool
              activity
            </p>
          </div>
        </div>
        <div className="timeline">
          {run.events.toReversed().map((event) => (
            <div className={`timeline-event ${event.kind}`} key={event.id}>
              <span />
              <div className="panel">
                <div>
                  <strong>{event.title}</strong>
                  <time>{formatDate(event.at)}</time>
                </div>
                <p>{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {confirmCancel ? (
        <Modal title="Cancel this Run?" onClose={() => setConfirmCancel(false)}>
          <p>
            Cancellation is terminal and will not create a Report. Committed
            events remain in history.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setConfirmCancel(false)}
            >
              Keep running
            </button>
            <button
              className="button danger"
              type="button"
              onClick={() => {
                act(() => source.cancelRun(run.id));
                setConfirmCancel(false);
              }}
            >
              Cancel Run
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function ReportView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const report = state.reports.find((item) => item.id === id);
  const [excerpt, setExcerpt] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const [revision, setRevision] = useState(false);
  const router = useRouter();
  if (!report) return <NotFound entity="Report" />;
  const task = state.tasks.find((item) => item.id === report.taskId);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([renderReportMarkdown(report)], { type: "text/markdown" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Link className="back-link" href={`/tasks/${report.taskId}`}>
        <ArrowLeft />
        {task?.title}
      </Link>
      <PageHeader
        eyebrow="Report"
        title={report.title}
        description={`Created ${formatDate(report.createdAt)} · ${report.blocks.length} blocks · ${report.excerpts.length} retained excerpts`}
        actions={
          <>
            <button
              className="button secondary"
              type="button"
              onClick={download}
            >
              <Download />
              Export Markdown
            </button>
            {!report.acceptedAt ? (
              <button
                className="button primary"
                type="button"
                onClick={() => source.acceptReport(report.id)}
              >
                <Check />
                Accept Report
              </button>
            ) : (
              <StatusBadge value="accepted" />
            )}
          </>
        }
      />
      <div className="report-layout">
        <article className="panel report">
          <div className="report-title">
            <p>Prepared by General Research</p>
            <h1>{report.title}</h1>
          </div>
          {report.blocks.map((block) => (
            <section className="report-block" key={block.id}>
              <span className={`block-type ${block.type}`}>{block.type}</span>
              <p>
                {block.text}{" "}
                {block.citationIds.map((citationId, index) => (
                  <button
                    className="citation"
                    type="button"
                    key={citationId}
                    onClick={() => setExcerpt(citationId)}
                  >
                    [{index + 1}]
                  </button>
                ))}
              </p>
            </section>
          ))}
          <hr />
          <h2>Source appendix</h2>
          {report.excerpts.map((item, index) => (
            <button
              className="appendix-item"
              type="button"
              key={item.id}
              onClick={() => setExcerpt(item.id)}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{item.sourceName}</strong>
                <small>{item.locator}</small>
              </div>
              <ChevronRight />
            </button>
          ))}
        </article>
        <aside className="review-panel panel">
          <h2>Review outcome</h2>
          {report.acceptedAt ? (
            <div className="accepted-box">
              <CheckCircle2 />
              <strong>Accepted outcome</strong>
              <span>{formatDate(report.acceptedAt)}</span>
            </div>
          ) : (
            <>
              <p>
                Accept this Report as the Task outcome, or request a new Run
                with specific feedback.
              </p>
              <button
                className="button secondary full"
                type="button"
                onClick={() => setRevision(true)}
              >
                <RotateCcw />
                Request revision
              </button>
            </>
          )}
          <hr />
          <h3>Evidence coverage</h3>
          <div className="coverage">
            <strong>100%</strong>
            <span>Required blocks cited</span>
          </div>
        </aside>
      </div>
      {excerpt ? (
        <div className="drawer-backdrop">
          <aside className="drawer excerpt-drawer">
            <button
              className="icon-button drawer-close"
              type="button"
              onClick={() => setExcerpt(undefined)}
            >
              <X />
            </button>
            <p className="eyebrow">Retained source excerpt</p>
            {(() => {
              const item = report.excerpts.find((ex) => ex.id === excerpt);
              return item ? (
                <>
                  <h2>{item.sourceName}</h2>
                  <p className="locator">{item.locator}</p>
                  <blockquote>{item.text}</blockquote>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open original <ExternalLink />
                    </a>
                  ) : null}
                  <div className="info-panel">
                    <ShieldCheck />
                    <p>
                      This exact excerpt is preserved with the Run and remains
                      available if the original Project Source is deleted.
                    </p>
                  </div>
                </>
              ) : null;
            })()}
          </aside>
        </div>
      ) : null}
      {revision ? (
        <Modal title="Request a revision" onClose={() => setRevision(false)}>
          <p>
            Your feedback becomes an explicit input to a new immutable Run
            attempt.
          </p>
          <Field
            label="Revision feedback"
            value={feedback}
            onChange={setFeedback}
            multiline
          />
          <div className="dialog-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setRevision(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                const run = source.reviseReport(report.id, feedback);
                router.push(`/runs/${run.id}`);
              }}
            >
              Start revision Run
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function CredentialsView() {
  const [state, source] = useData();
  const [editing, setEditing] = useState<string>();
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <PageHeader
        title="Credentials"
        description="Provider secrets are validated, stored securely, and never returned after entry."
      />
      <SettingsNav active="Credentials" />
      <div className="settings-content">
        <div className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Model and search providers</h2>
              <p>Agent Base v0.1 uses fixed MiniMax and Tavily providers.</p>
            </div>
          </div>
          {state.credentials.map((credential) => (
            <div className="credential-row" key={credential.provider}>
              <span className="row-icon">
                <KeyRound />
              </span>
              <div>
                <strong>{credential.provider}</strong>
                <span>
                  {credential.configured ? credential.hint : "Not configured"} ·{" "}
                  {credential.validatedAt
                    ? `Validated ${formatDate(credential.validatedAt)}`
                    : "Validation required"}
                </span>
              </div>
              <StatusBadge value={credential.status} />
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setEditing(credential.provider);
                  setSecret("");
                }}
              >
                Replace
              </button>
            </div>
          ))}
        </div>
        <div className="panel info-panel">
          <ShieldCheck />
          <div>
            <h3>Secrets stay secret</h3>
            <p>
              Entered values are cleared from the form immediately. The demo
              stores metadata only, never the credential itself.
            </p>
          </div>
        </div>
      </div>
      {message ? (
        <div className="toast">
          <CheckCircle2 />
          {message}
        </div>
      ) : null}
      {editing ? (
        <Modal
          title={`Replace ${editing} Credential`}
          onClose={() => setEditing(undefined)}
        >
          <p>We’ll simulate provider validation before storing metadata.</p>
          <Field
            label={`${editing} API key`}
            value={secret}
            onChange={setSecret}
            secret
          />
          <div className="dialog-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                source.replaceCredential(
                  editing as "MiniMax" | "Tavily",
                  secret,
                );
                setSecret("");
                setEditing(undefined);
                setMessage(`${editing} Credential validated and replaced.`);
              }}
            >
              Validate & replace
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function SystemView() {
  const [state, source] = useData();
  const [toast, setToast] = useState("");
  const backup = () => {
    const url = URL.createObjectURL(
      new Blob([source.exportBackup()], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agent-base-demo-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup snapshot exported.");
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      source.restoreBackup(await file.text());
      setToast("Backup restored successfully.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Restore failed.");
    }
  };
  return (
    <>
      <PageHeader
        title="System"
        description="Inspect health, manage local data, and simulate installed operations."
      />
      <SettingsNav active="System" />
      <div className="settings-content">
        <div className="metric-grid">
          <div className="panel metric">
            <CheckCircle2 />
            <strong>Healthy</strong>
            <span>Web, worker, database</span>
          </div>
          <div className="panel metric">
            <HardDrive />
            <strong>{state.system.storageUsed} GB</strong>
            <span>of {state.system.storageLimit} GB used</span>
          </div>
          <div className="panel metric">
            <ServerCog />
            <strong>{state.system.version}</strong>
            <span>Installed version</span>
          </div>
        </div>
        <div className="panel settings-panel">
          <div className="operation-row">
            <div>
              <h3>Backup workspace</h3>
              <p>Export the complete demo state as a portable JSON snapshot.</p>
            </div>
            <button className="button secondary" type="button" onClick={backup}>
              <Download />
              Create backup
            </button>
          </div>
          <div className="operation-row">
            <div>
              <h3>Restore workspace</h3>
              <p>Validate and restore a previously exported demo snapshot.</p>
            </div>
            <label className="button secondary">
              <Upload />
              Restore backup
              <input
                className="sr-only"
                type="file"
                accept="application/json"
                onChange={restore}
              />
            </label>
          </div>
          <div className="operation-row">
            <div>
              <h3>Database migrations</h3>
              <p>Schema is current. No pending migrations.</p>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setToast("Migration check completed. Schema is current.")
              }
            >
              <RefreshCw />
              Check now
            </button>
          </div>
          <div className="operation-row">
            <div>
              <h3>Software update</h3>
              <p>Agent Base 0.1.0-demo is the latest available version.</p>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setToast("Update check completed. You’re current.")
              }
            >
              Check for updates
            </button>
          </div>
        </div>
        <div className="danger-zone panel">
          <div>
            <h3>Reset demo data</h3>
            <p>
              Restore the deterministic populated workspace. This affects only
              this browser.
            </p>
          </div>
          <button
            className="button danger"
            type="button"
            onClick={() => {
              source.reset();
              setToast("Demo data reset.");
            }}
          >
            Reset demo
          </button>
        </div>
      </div>
      {toast ? (
        <div className="toast">
          <CheckCircle2 />
          {toast}
          <button type="button" onClick={() => setToast("")}>
            <X />
          </button>
        </div>
      ) : null}
    </>
  );
}

export function SetupView() {
  const [, source] = useData();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [minimax, setMinimax] = useState("");
  const [tavily, setTavily] = useState("");
  const [validating, setValidating] = useState(false);
  const next = () => {
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      source.completeSetup({ MiniMax: minimax, Tavily: tavily });
      setStep(3);
    }, 700);
  };
  return (
    <div className="setup-page">
      <div className="setup-brand">
        <span className="brand-mark">A</span>Agent Base{" "}
        <span className="demo-chip">Interactive demo</span>
      </div>
      <div className="setup-card panel">
        <div className="stepper">
          <span className={step >= 1 ? "done" : ""}>1</span>
          <i />
          <span className={step >= 2 ? "done" : ""}>2</span>
          <i />
          <span className={step >= 3 ? "done" : ""}>3</span>
        </div>
        {step === 1 ? (
          <>
            <span className="setup-icon">
              <Sparkles />
            </span>
            <p className="eyebrow">Welcome to Agent Base</p>
            <h1>Research you can inspect and trust.</h1>
            <p>
              Configure a local-first workspace with a guided Agent,
              evidence-linked Reports, and explicit human approval gates.
            </p>
            <ul className="feature-list">
              <li>
                <Check />
                Uploaded and public evidence
              </li>
              <li>
                <Check />
                Immutable Run history
              </li>
              <li>
                <Check />
                Citation-level inspection
              </li>
            </ul>
            <button
              className="button primary large"
              type="button"
              onClick={() => setStep(2)}
            >
              Set up providers <ArrowRight />
            </button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <p className="eyebrow">Provider setup</p>
            <h1>Connect research services</h1>
            <p>
              In this demo, validation is simulated and only masked metadata is
              retained.
            </p>
            <Field
              label="MiniMax Token Plan key"
              value={minimax}
              onChange={setMinimax}
              secret
            />
            <Field
              label="Tavily API key"
              value={tavily}
              onChange={setTavily}
              secret
            />
            <div className="dialog-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="button primary"
                type="button"
                disabled={minimax.length < 6 || tavily.length < 6 || validating}
                onClick={next}
              >
                {validating ? (
                  <>
                    <RefreshCw className="spin" />
                    Validating…
                  </>
                ) : (
                  <>
                    Validate & continue <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <span className="setup-icon success">
              <Check />
            </span>
            <p className="eyebrow">Setup complete</p>
            <h1>Your research workspace is ready.</h1>
            <p>
              A general research Agent and sample workspace have been prepared.
              You can replace demo data at any time.
            </p>
            <button
              className="button primary large"
              type="button"
              onClick={() => router.push("/")}
            >
              Open Agent Base <ArrowRight />
            </button>
          </>
        ) : null}
      </div>
      <p className="setup-footer">Local-first · Single Owner · No telemetry</p>
    </div>
  );
}

function SettingsNav({ active }: { active: string }) {
  return (
    <div className="settings-nav">
      <Link
        className={active === "Credentials" ? "active" : ""}
        href="/settings/credentials"
      >
        <KeyRound />
        Credentials
      </Link>
      <Link
        className={active === "System" ? "active" : ""}
        href="/settings/system"
      >
        <ServerCog />
        System
      </Link>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  multiline,
  secret,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  secret?: boolean;
}) {
  const inputId = useId();
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {multiline ? (
        <textarea
          id={inputId}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={inputId}
          type={secret ? "password" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function NotFound({ entity }: { entity: string }) {
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title={`${entity} not found`}
      description={`The requested ${entity.toLowerCase()} does not exist in this demo workspace.`}
      action={
        <Link href="/" className="button primary">
          Return to Overview
        </Link>
      }
    />
  );
}
