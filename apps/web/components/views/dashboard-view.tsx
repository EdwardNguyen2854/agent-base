"use client";

import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Folder,
  Key,
  Lightning,
  Plus,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useData } from "../../app/data-provider";
import type { Activity, Run, RunState } from "../../lib/frontend-data";
import { cn, formatDate, formatRelative } from "../../lib/utils";
import { Magnetic } from "../motion/magnetic";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { ProgressBar } from "../ui/inputs";
import { PageHeader, SectionHeading } from "../ui/page";
import { StatusBadge } from "../ui/status-badge";
import { Card, Panel } from "../ui/surfaces";

const ACTIVE_STATES: RunState[] = [
  "running",
  "awaiting_approval",
  "paused_quota",
  "paused_credentials",
];

export function DashboardView() {
  const [state] = useData();
  const active = state.runs.filter((run) => ACTIVE_STATES.includes(run.state));
  const activeProjects = state.projects.filter((project) =>
    state.tasks.some(
      (task) => task.projectId === project.id && task.state !== "archived",
    ),
  ).length;
  const pendingReviews =
    state.tasks.filter((task) => task.state === "in_review").length +
    state.runs.filter((run) => run.state === "awaiting_approval").length;
  const failedRuns = state.runs.filter((run) => run.state === "failed").length;
  const healthyConnections = state.credentials.filter(
    (credential) => credential.status === "healthy",
  ).length;

  return (
    <div className="space-y-16 md:space-y-24">
      <PageHeader
        eyebrow={formatDate(
          state.system.version === "0.1.0-demo"
            ? new Date().toISOString()
            : state.system.version,
        )}
        title="Good morning, Owner. 3 things need you."
        description="2 runs are mid-flight. 1 plan needs your approval before it can search the web. Your credentials are healthy."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/runs">All activity</Link>
            </Button>
            <Magnetic strength={0.18}>
              <Button
                variant="primary"
                icon={<Plus size={14} weight="bold" />}
                asChild
              >
                <Link href="/projects/new">Start a research project</Link>
              </Button>
            </Magnetic>
          </>
        }
      />

      <Reveal>
        <HeroSplit active={active} state={state} />
      </Reveal>

      <Reveal>
        <section className="container-page">
          <SectionHeading
            title="What needs your attention"
            description="Live counts across projects, runs, and providers."
          />
          <Stagger className="grid grid-cols-12 gap-4 md:gap-5" gap={0.05}>
            <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
              <MetricTile
                href="/projects"
                label="Active projects"
                value={activeProjects}
                caption="Where current research is organized."
                icon={<Folder size={18} weight="regular" />}
              />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-2">
              <MetricTile
                href="/runs"
                label="Awaiting review"
                value={pendingReviews}
                caption="Plans and reports."
                icon={<Sparkle size={18} weight="regular" />}
                tone="warn"
              />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-2">
              <MetricTile
                href="/runs"
                label="Failed runs"
                value={failedRuns}
                caption="Need investigation."
                icon={<Warning size={18} weight="regular" />}
                tone="danger"
              />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-2">
              <MetricTile
                href="/agents"
                label="Agents"
                value={state.agents.length}
                caption="Reusable analysts."
                icon={<Lightning size={18} weight="regular" />}
              />
            </StaggerItem>
            <StaggerItem className="col-span-12 sm:col-span-9 lg:col-span-3">
              <MetricTile
                href="/connectors"
                label="Connector health"
                value={`${healthyConnections}/${state.credentials.length}`}
                caption="Provider connections healthy."
                icon={<Key size={18} weight="regular" />}
                tone={
                  healthyConnections === state.credentials.length
                    ? "ok"
                    : "warn"
                }
              />
            </StaggerItem>
          </Stagger>
        </section>
      </Reveal>

      <Reveal>
        <section className="container-page grid grid-cols-12 gap-6 md:gap-8">
          <div className="col-span-12 lg:col-span-7">
            <SectionHeading
              title="Recent projects"
              description="Reusable workspaces."
              action={
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-hover hover:text-accent"
                >
                  View all <ArrowRight size={14} weight="bold" />
                </Link>
              }
            />
            <Stagger className="space-y-3" gap={0.06}>
              {state.projects.slice(0, 3).map((project) => (
                <StaggerItem key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-text/15 hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
                      <Folder size={20} weight="regular" />
                    </span>
                    <span className="flex-1">
                      <strong className="block text-[14.5px] font-semibold tracking-tight text-text">
                        {project.name}
                      </strong>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                        {project.description || "No description yet."}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <span>{project.sources.length} sources</span>
                        <span aria-hidden>·</span>
                        <span>
                          {
                            state.tasks.filter(
                              (task) => task.projectId === project.id,
                            ).length
                          }{" "}
                          tasks
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight
                      size={18}
                      weight="bold"
                      className="mt-1 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              title="Activity"
              description="Latest from Agent Base."
            />
            <Panel padded={false}>
              <ul className="divide-y divide-rule">
                {state.activity.slice(0, 6).map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <SystemStrip
          storageUsed={state.system.storageUsed}
          storageLimit={state.system.storageLimit}
          projectCount={state.projects.length}
          taskCount={state.tasks.length}
        />
      </Reveal>
    </div>
  );
}

function HeroSplit({
  active,
  state,
}: {
  active: Run[];
  state: ReturnType<typeof useData>[0];
}) {
  const featured = active[0];
  return (
    <section className="container-page grid grid-cols-12 gap-6 md:gap-10">
      <div className="col-span-12 lg:col-span-7">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-8 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(900px 320px at 90% -20%, rgba(79,122,74,0.16), transparent 60%), radial-gradient(700px 320px at -10% 110%, rgba(20,20,19,0.06), transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="text-eyebrow mb-4 flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-accent" />
              Active work
            </p>
            <h2 className="text-display text-[clamp(28px,3.4vw,40px)]">
              {active.length} runs are mid-flight
            </h2>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-muted">
              Agent Base executes one Run at a time. Queued work advances
              automatically. Approved plans unlock web research.
            </p>

            {featured ? (
              <Card className="mt-7" as="div">
                <div className="flex items-center justify-between">
                  <StatusBadge
                    value={featured.state}
                    pulse={featured.state === "running"}
                  />
                  <span className="text-[11px] font-mono text-muted">
                    {featured.id.slice(-8)}
                  </span>
                </div>
                <h3 className="mt-5 text-[19px] font-semibold tracking-tight text-text">
                  {state.tasks.find((t) => t.id === featured.taskId)?.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted">
                  Agent v{featured.agentVersion} · Updated{" "}
                  {formatRelative(featured.updatedAt)}
                </p>
                <ProgressBar value={featured.progress} className="mt-5" />
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[12px]">
                  <span className="font-semibold text-text">
                    {featured.progress}% complete
                  </span>
                  <Link
                    href={`/runs/${featured.id}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-hover hover:text-accent"
                  >
                    Open run <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              </Card>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
              <Link
                href="/runs"
                className="inline-flex items-center gap-1 font-semibold text-text hover:text-accent-hover"
              >
                View all runs <ArrowRight size={14} weight="bold" />
              </Link>
              <span aria-hidden className="text-muted/40">
                ·
              </span>
              <Link
                href="/agents"
                className="inline-flex items-center gap-1 font-semibold text-text hover:text-accent-hover"
              >
                Configure agents <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <Card as="article">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-hover">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-accent"
                style={{ animation: "pulse-soft 1.6s ease-in-out infinite" }}
              />
              Live activity
            </span>
            <span className="text-[11px] text-muted">Last 24h</span>
          </div>
          <ul className="mt-6 space-y-4">
            {state.activity.slice(0, 4).map((activity) => (
              <li key={activity.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                    activity.tone === "success"
                      ? "bg-accent"
                      : activity.tone === "warning"
                        ? "bg-warn"
                        : "bg-purple",
                  )}
                  aria-hidden
                />
                <div className="flex-1">
                  <p className="text-[13px] leading-snug text-text">
                    {activity.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatRelative(activity.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-border pt-4">
            <Link
              href="/runs"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text hover:text-accent-hover"
            >
              See all activity <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

function MetricTile({
  href,
  label,
  value,
  caption,
  icon,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: string | number;
  caption: string;
  icon: React.ReactNode;
  tone?: "neutral" | "warn" | "danger" | "ok";
}) {
  const toneClass = {
    neutral: "bg-accent-soft text-accent-hover",
    ok: "bg-accent-soft text-accent-hover",
    warn: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-text/15 hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start justify-between">
        <span
          className={cn("grid size-9 place-items-center rounded-xl", toneClass)}
        >
          {icon}
        </span>
        <ArrowUpRight
          size={16}
          weight="bold"
          className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden
        />
      </div>
      <div className="mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </p>
        <p className="mt-1.5 text-[36px] font-semibold leading-none tracking-tight text-text">
          {value}
        </p>
        <p className="mt-2 text-[12px] leading-snug text-muted">{caption}</p>
      </div>
    </Link>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 inline-block size-2 shrink-0 rounded-full",
          activity.tone === "success"
            ? "bg-accent"
            : activity.tone === "warning"
              ? "bg-warn"
              : "bg-purple",
        )}
      />
      <div className="flex-1">
        <p className="text-[13px] leading-snug text-text">{activity.text}</p>
        <p className="mt-1 text-[11px] text-muted">{formatDate(activity.at)}</p>
      </div>
    </li>
  );
}

function SystemStrip({
  storageUsed,
  storageLimit,
  projectCount,
  taskCount,
}: {
  storageUsed: number;
  storageLimit: number;
  projectCount: number;
  taskCount: number;
}) {
  const pct = Math.min(100, Math.round((storageUsed / storageLimit) * 100));
  return (
    <section className="container-page grid grid-cols-12 gap-4 md:gap-5">
      <Panel className="col-span-12 lg:col-span-8 flex flex-col gap-5 md:flex-row md:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
          <CheckCircle size={22} weight="regular" />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-text">
            All systems operational
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Web, worker, database, and storage are healthy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted">
          <span>
            <strong className="text-text">{projectCount}</strong> projects
          </span>
          <span>
            <strong className="text-text">{taskCount}</strong> tasks
          </span>
          <span>
            <strong className="text-text">{storageUsed} GB</strong> of{" "}
            {storageLimit} GB
          </span>
          <Link
            href="/settings/system"
            className="inline-flex items-center gap-1 font-semibold text-accent-hover hover:text-accent"
          >
            System status <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      </Panel>
      <Panel className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        <p className="text-eyebrow">Storage</p>
        <p className="text-[20px] font-semibold tracking-tight text-text">
          {pct}% used
        </p>
        <ProgressBar value={pct} />
        <p className="text-[12px] text-muted">
          {storageUsed} GB of {storageLimit} GB local storage.
        </p>
      </Panel>
    </section>
  );
}
