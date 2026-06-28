"use client";

import { ListChecks, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useData } from "../../app/data-provider";
import { formatDate, formatSize } from "../../lib/utils";
import { Reveal } from "../motion/reveal";
import { Button } from "../ui/button";
import { SelectField, TextAreaField, TextField } from "../ui/field";
import { Checkbox, Toggle } from "../ui/inputs";
import { PageHeader } from "../ui/page";
import { EmptyState } from "../ui/states";
import { StatusBadge } from "../ui/status-badge";
import { Panel } from "../ui/surfaces";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";

export function TasksView() {
  const [state] = useData();
  return (
    <div className="space-y-12">
      <Reveal>
        <PageHeader
          eyebrow="Workspace"
          title="Tasks"
          description="Research goals and their immutable Run attempts. Each Run pins the exact Agent version it started with."
          actions={
            <Button
              variant="primary"
              icon={<Plus size={14} weight="bold" />}
              asChild
            >
              <Link href="/tasks/new">Create task</Link>
            </Button>
          }
        />
      </Reveal>

      <Reveal>
        <div className="container-page">
          {state.tasks.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={22} weight="regular" />}
              title="No tasks yet"
              description="Create the first research Task grounded in a Project's Sources."
              action={
                <Button variant="primary" asChild>
                  <Link href="/tasks/new">Create task</Link>
                </Button>
              }
            />
          ) : (
            <Panel padded={false}>
              <Table>
                <THead>
                  <TR>
                    <TH>Task</TH>
                    <TH>Project</TH>
                    <TH>Runs</TH>
                    <TH>Status</TH>
                    <TH>Created</TH>
                  </TR>
                </THead>
                <TBody>
                  {state.tasks.map((task) => (
                    <TR key={task.id}>
                      <TD primary>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-semibold text-text hover:text-accent-hover"
                        >
                          {task.title}
                        </Link>
                        <span className="mt-1 block max-w-md truncate text-[12px] text-muted">
                          {task.goal}
                        </span>
                      </TD>
                      <TD>
                        {
                          state.projects.find((p) => p.id === task.projectId)
                            ?.name
                        }
                      </TD>
                      <TD>{task.runIds.length}</TD>
                      <TD>
                        <StatusBadge value={task.state} />
                      </TD>
                      <TD>{formatDate(task.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Panel>
          )}
        </div>
      </Reveal>
    </div>
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
    .filter(Boolean) as ReturnType<typeof useData>[0]["runs"];

  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <Link
          href="/tasks"
          className="container-page inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Tasks
        </Link>
        <PageHeader
          eyebrow={project?.name}
          title={task.title}
          description={task.goal}
          actions={
            task.state !== "completed" ? (
              <Button
                variant="primary"
                icon={<Plus size={14} weight="bold" />}
                onClick={() =>
                  router.push(`/runs/${source.createRun(task.id).id}`)
                }
              >
                New Run attempt
              </Button>
            ) : null
          }
        />
      </Reveal>

      <Reveal>
        <div className="container-page grid grid-cols-12 gap-4 md:gap-5">
          <DetailMetric
            label="Project"
            value={
              project ? (
                <Link
                  href={`/projects/${project.id}`}
                  className="text-accent-hover hover:underline"
                >
                  {project.name}
                </Link>
              ) : (
                "Unavailable"
              )
            }
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          />
          <DetailMetric
            label="Language"
            value={task.language}
            className="col-span-6 sm:col-span-3 lg:col-span-2"
          />
          <DetailMetric
            label="Web evidence"
            value={task.webResearch ? "Allowed" : "Disabled"}
            className="col-span-6 sm:col-span-3 lg:col-span-3"
          />
          <DetailMetric
            label="Outcome"
            value={<StatusBadge value={task.state} />}
            className="col-span-12 sm:col-span-6 lg:col-span-4"
          />
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <h2 className="mb-5 text-[19px] font-semibold tracking-tight text-text">
            Run attempts
          </h2>
          <Panel padded={false}>
            <Table>
              <THead>
                <TR>
                  <TH>Run</TH>
                  <TH>Agent</TH>
                  <TH>Status</TH>
                  <TH>Progress</TH>
                  <TH>Started</TH>
                </TR>
              </THead>
              <TBody>
                {runs.map((run) => (
                  <TR key={run.id}>
                    <TD primary>
                      <Link
                        href={`/runs/${run.id}`}
                        className="text-accent-hover hover:underline"
                      >
                        {run.id.slice(-10)}
                      </Link>
                    </TD>
                    <TD>General Research v{run.agentVersion}</TD>
                    <TD>
                      <StatusBadge value={run.state} />
                    </TD>
                    <TD>{run.progress}%</TD>
                    <TD>{formatDate(run.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Panel>
        </div>
      </Reveal>
    </div>
  );
}

export function NewTaskView() {
  const [state, source] = useData();
  const router = useRouter();
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("");
  const [webResearch, setWebResearch] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const latestAgentVersion = state.agents[0]?.versions.at(-1)?.number;
  const [agentVersion, setAgentVersion] = useState(
    latestAgentVersion?.toString() ?? "",
  );
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
    const run = source.createRun(task.id, undefined, Number(agentVersion));
    router.push(`/runs/${run.id}`);
  };

  return (
    <div className="space-y-12">
      <Reveal>
        <Link
          href="/tasks"
          className="container-page inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Tasks
        </Link>
        <PageHeader
          eyebrow="New task"
          title="Define the research goal"
          description="Choose the project, attach Project Sources, and pick a Report language."
        />
      </Reveal>

      <Reveal>
        <form className="container-page" onSubmit={submit}>
          <Panel className="mx-auto max-w-3xl">
            <TextField
              label="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Audit supply-chain risk in our category"
              required
            />
            <div className="mt-5" />
            <TextAreaField
              label="Research goal"
              rows={4}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="What should this Run answer?"
              required
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Project"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setSelected([]);
                }}
              >
                {state.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Report language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                required
              >
                <option value="">Select a Report language</option>
                <option value="English">English</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
              </SelectField>
            </div>

            <div className="mt-5">
              <SelectField
                label="Agent Version"
                value={agentVersion}
                onChange={(event) => setAgentVersion(event.target.value)}
                required
              >
                {state.agents.flatMap((agent) =>
                  agent.versions.map((version) => (
                    <option key={version.id} value={version.number}>
                      {agent.name} v{version.number}
                    </option>
                  )),
                )}
              </SelectField>
            </div>

            <div className="mt-7">
              <p className="text-eyebrow mb-2">Project Sources</p>
              <div>
                {project?.sources
                  .filter((item) => item.state === "ready")
                  .map((item) => (
                    <Checkbox
                      key={item.id}
                      label={item.name}
                      description={`${item.kind} · ${formatSize(item.size)}`}
                      checked={selected.includes(item.id)}
                      onChange={(checked) =>
                        setSelected(
                          checked
                            ? [...selected, item.id]
                            : selected.filter((id) => id !== item.id),
                        )
                      }
                    />
                  ))}
                {!project?.sources.some((item) => item.state === "ready") ? (
                  <p className="rounded-xl border border-border bg-surface-soft/40 px-4 py-3 text-[12.5px] text-muted">
                    This Project has no ready Sources. You can still use web
                    research.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-7">
              <Toggle
                label="Allow public web research"
                description="Use Tavily discovery and eligible public web pages."
                checked={webResearch}
                onChange={setWebResearch}
              />
            </div>

            <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
              <Button variant="ghost" asChild>
                <Link href="/tasks">Cancel</Link>
              </Button>
              <Button variant="primary" type="submit">
                Create task & plan Run
              </Button>
            </div>
          </Panel>
        </form>
      </Reveal>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] ${className ?? ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <div className="mt-2 text-[14px] font-semibold text-text">{value}</div>
    </div>
  );
}

function NotFound({ entity }: { entity: string }) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-display text-[clamp(34px,5vw,48px)]">
        {entity} not found
      </h1>
      <p className="mt-3 text-[14px] text-muted">
        The requested {entity.toLowerCase()} does not exist in this demo.
      </p>
      <div className="mt-6">
        <Button variant="primary" asChild>
          <Link href="/">Return to overview</Link>
        </Button>
      </div>
    </div>
  );
}
