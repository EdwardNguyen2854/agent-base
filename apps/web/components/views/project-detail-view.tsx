"use client";

import {
  ArrowUpRight,
  ClockClockwise,
  Files,
  ListChecks,
  PlayCircle,
  Trash,
  Upload,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { useData } from "../../app/data-provider";
import {
  type Project,
  type ProjectSource,
  validateUpload,
} from "../../lib/frontend-data";
import { cn, formatDate, formatSize } from "../../lib/utils";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "../ui/dialog";
import { PageHeader } from "../ui/page";
import { EmptyState } from "../ui/states";
import { StatusBadge } from "../ui/status-badge";
import { Panel } from "../ui/surfaces";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";

type Tab = "overview" | "sources" | "tasks";

export function ProjectDetailView({ section = "overview" }: { section?: Tab }) {
  const { id } = useParams<{ id: string }>();
  const [state] = useData();
  const project = state.projects.find((item) => item.id === id);
  if (!project) return <NotFound entity="Project" />;
  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <Link
          href="/projects"
          className="container-page inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Projects
        </Link>
        <PageHeader
          eyebrow={`Project · ${project.sources.length} sources`}
          title={project.name}
          description={project.description || "No description yet."}
          actions={
            <Button
              variant="primary"
              icon={<PlayCircle size={14} weight="bold" />}
              asChild
            >
              <Link href={`/tasks/new?project=${project.id}`}>New task</Link>
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <TabBar id={project.id} section={section} />
      </Reveal>

      {section === "overview" ? (
        <OverviewTab
          project={project}
          taskCount={
            state.tasks.filter((task) => task.projectId === project.id).length
          }
        />
      ) : null}
      {section === "sources" ? <SourcesTab project={project} /> : null}
      {section === "tasks" ? <ProjectTasksTab project={project} /> : null}
    </div>
  );
}

function TabBar({ id, section }: { id: string; section: Tab }) {
  const tabs: Array<{ key: Tab; label: string; href: string }> = [
    { key: "overview", label: "Overview", href: `/projects/${id}` },
    { key: "sources", label: "Sources", href: `/projects/${id}/sources` },
    { key: "tasks", label: "Tasks", href: `/projects/${id}/tasks` },
  ];
  return (
    <nav
      aria-label="Project sections"
      className="container-page flex items-center gap-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = section === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-11 items-center px-4 text-[13px] font-semibold transition-colors",
              active ? "text-accent-hover" : "text-muted hover:text-text",
            )}
          >
            {tab.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-[-1px] h-0.5 rounded-full bg-accent"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function OverviewTab({
  project,
  taskCount,
}: {
  project: Project;
  taskCount: number;
}) {
  const processing = project.sources.filter(
    (s) => s.state === "processing",
  ).length;
  const totalRuns = project.sources.length + taskCount;
  return (
    <div className="container-page space-y-10">
      <Reveal>
        <Stagger className="grid grid-cols-12 gap-4 md:gap-5" gap={0.05}>
          <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Metric
              icon={<Files size={18} weight="regular" />}
              label="Project sources"
              value={project.sources.length}
            />
          </StaggerItem>
          <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
            <Metric
              icon={<ListChecks size={18} weight="regular" />}
              label="Research tasks"
              value={taskCount}
            />
          </StaggerItem>
          <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
            <Metric
              icon={<ClockClockwise size={18} weight="regular" />}
              label="Processing"
              value={processing}
              tone={processing > 0 ? "warn" : "ok"}
            />
          </StaggerItem>
          <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Metric
              icon={<PlayCircle size={18} weight="regular" />}
              label="Run attempts"
              value={totalRuns}
            />
          </StaggerItem>
        </Stagger>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-12 gap-6">
          <Panel className="col-span-12 lg:col-span-7">
            <p className="text-eyebrow">Activity</p>
            <h3 className="mt-2 text-[19px] font-semibold tracking-tight text-text">
              Recent sources
            </h3>
            <div className="mt-5 divide-y divide-rule">
              {project.sources.slice(0, 6).map((source) => (
                <SourceRow key={source.id} source={source} />
              ))}
              {project.sources.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted">
                  No sources uploaded yet.
                </p>
              ) : null}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <Link
                href={`/projects/${project.id}/sources`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-hover hover:text-accent"
              >
                Open sources <ArrowUpRight size={14} weight="bold" />
              </Link>
            </div>
          </Panel>
          <Panel className="col-span-12 lg:col-span-5">
            <p className="text-eyebrow">Latest</p>
            <h3 className="mt-2 text-[19px] font-semibold tracking-tight text-text">
              Tasks in this project
            </h3>
            <p className="mt-2 text-[12.5px] text-muted">
              Each task is a durable research goal with immutable Run attempts.
            </p>
            <div className="mt-5 divide-y divide-rule">
              {/* Tasks rendered elsewhere via ProjectTasksTab or routed here */}
              <p className="py-6 text-center text-[13px] text-muted">
                See the tasks tab to manage tasks.
              </p>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <Link
                href={`/projects/${project.id}/tasks`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-hover hover:text-accent"
              >
                Open tasks <ArrowUpRight size={14} weight="bold" />
              </Link>
            </div>
          </Panel>
        </div>
      </Reveal>
    </div>
  );
}

function SourcesTab({ project }: { project: Project }) {
  const [, source] = useData();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(event.target.files ?? [])) {
      const validation = validateUpload({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (validation.error) {
        setError(validation.error);
        continue;
      }
      try {
        source.addSource(project.id, file);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Upload failed.");
      }
    }
    event.target.value = "";
  };

  return (
    <div className="container-page space-y-6">
      <Reveal>
        <label
          htmlFor="source-upload"
          className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.5rem] border-2 border-dashed border-border bg-accent-soft/30 px-6 py-10 text-center transition-colors hover:border-accent"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
            <Upload size={22} weight="regular" />
          </span>
          <span className="text-[15px] font-semibold text-text">
            Drop files here or choose files
          </span>
          <span className="text-[12.5px] text-muted">
            Text-based PDF, DOCX, Markdown, or TXT · 25 MB maximum
          </span>
          <input
            id="source-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.md,.txt"
            onChange={onFiles}
            className="sr-only"
          />
        </label>
      </Reveal>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger"
        >
          <Warning size={18} weight="regular" />
          {error}
        </div>
      ) : null}

      <Reveal>
        <Panel padded={false}>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Type</TH>
                <TH>Size</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {project.sources.map((item) => (
                <TR key={item.id}>
                  <TD primary>
                    <span className="inline-flex items-center gap-2.5">
                      <Files
                        size={16}
                        weight="regular"
                        className="text-accent-hover"
                      />
                      {item.name}
                    </span>
                  </TD>
                  <TD>{item.kind}</TD>
                  <TD>{formatSize(item.size)}</TD>
                  <TD>
                    <StatusBadge value={item.state} />
                  </TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(item.id)}
                      aria-label={`Delete ${item.name}`}
                      icon={<Trash size={14} weight="regular" />}
                    />
                  </TD>
                </TR>
              ))}
              {project.sources.length === 0 ? (
                <TR>
                  <TD className="py-10 text-center">
                    <EmptyState
                      icon={<Files size={20} weight="regular" />}
                      title="No sources yet"
                      description="Drop files above to attach Project Sources."
                    />
                  </TD>
                  <TD>{""}</TD>
                  <TD>{""}</TD>
                  <TD>{""}</TD>
                  <TD>{""}</TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </Panel>
      </Reveal>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent
          title="Delete source?"
          description="Original bytes and reusable chunks will be removed. Historical Run excerpts remain available."
        >
          <div className="rounded-xl border border-warning/20 bg-warning-soft p-4 text-[13px] leading-relaxed text-warning">
            <strong className="block">This action is local to the demo.</strong>
            Committed evidence already in a Report is preserved.
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep source</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  source.removeSource(project.id, confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              Delete source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectTasksTab({ project }: { project: Project }) {
  const [state] = useData();
  const tasks = state.tasks.filter((task) => task.projectId === project.id);
  if (tasks.length === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<ListChecks size={22} weight="regular" />}
          title="No tasks yet"
          description="Create a research Task grounded in this Project’s Sources."
          action={
            <Button variant="primary" asChild>
              <Link href={`/tasks/new?project=${project.id}`}>Create task</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div className="container-page">
      <Reveal>
        <Panel padded={false}>
          <Table>
            <THead>
              <TR>
                <TH>Task</TH>
                <TH>Runs</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {tasks.map((task) => (
                <TR key={task.id}>
                  <TD primary>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-semibold text-text hover:text-accent-hover"
                    >
                      {task.title}
                    </Link>
                    <span className="mt-1 block text-[12px] text-muted">
                      {task.goal}
                    </span>
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
      </Reveal>
    </div>
  );
}

function SourceRow({ source }: { source: ProjectSource }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="inline-flex items-center gap-3">
        <Files
          size={16}
          weight="regular"
          className="text-accent-hover"
          aria-hidden
        />
        <span>
          <strong className="block text-[13.5px] font-semibold text-text">
            {source.name}
          </strong>
          <span className="mt-0.5 block text-[11px] text-muted">
            {source.kind} · {formatSize(source.size)}
          </span>
        </span>
      </span>
      <StatusBadge value={source.state} />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass = {
    neutral: "text-accent-hover",
    ok: "text-accent-hover",
    warn: "text-warning",
  }[tone];
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)]">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl bg-accent-soft",
          toneClass,
        )}
      >
        {icon}
      </span>
      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-text">
        {value}
      </p>
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
