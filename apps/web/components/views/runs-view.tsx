"use client";

import {
  ArrowRight,
  CheckCircle,
  ClockClockwise,
  PauseCircle,
  PlayCircle,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "../../app/data-provider";
import type { Run, RunEvent } from "../../lib/frontend-data";
import { cn, formatDate, formatRelative } from "../../lib/utils";
import { Magnetic } from "../motion/magnetic";
import { Reveal } from "../motion/reveal";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "../ui/dialog";
import { ProgressBar } from "../ui/inputs";
import { PageHeader, SectionHeading } from "../ui/page";
import { StatusBadge } from "../ui/status-badge";
import { Panel } from "../ui/surfaces";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";

export function RunsView() {
  const [state] = useData();
  const queued = state.runs.filter((run) => run.state === "queued");
  return (
    <div className="space-y-12">
      <Reveal>
        <PageHeader
          eyebrow="Execution"
          title="Runs"
          description="Inspect the single active execution lane, approval gates, and immutable history. One Run executes at a time."
        />
      </Reveal>

      {queued.length > 0 ? (
        <div className="container-page">
          <div className="flex items-start gap-4 rounded-2xl border border-purple/20 bg-purple-soft px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple/15 text-purple">
              <ClockClockwise size={18} weight="regular" />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-purple">
                {queued.length} run{queued.length > 1 ? "s" : ""} queued
              </p>
              <p className="mt-0.5 text-[12px] text-purple/80">
                Agent Base executes one Run at a time. Queued work advances
                automatically.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Reveal>
        <div className="container-page">
          <Panel padded={false}>
            <Table>
              <THead>
                <TR>
                  <TH>Run / Task</TH>
                  <TH>Status</TH>
                  <TH>Progress</TH>
                  <TH>Agent</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {state.runs.map((run) => {
                  const task = state.tasks.find((t) => t.id === run.taskId);
                  return (
                    <TR key={run.id}>
                      <TD primary>
                        <Link
                          href={`/runs/${run.id}`}
                          className="font-semibold text-text hover:text-accent-hover"
                        >
                          {task?.title ?? run.id}
                        </Link>
                        <span className="mt-1 block font-mono text-[11px] text-muted">
                          {run.id}
                        </span>
                      </TD>
                      <TD>
                        <StatusBadge
                          value={run.state}
                          pulse={run.state === "running"}
                        />
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <ProgressBar
                            value={run.progress}
                            className="max-w-[120px]"
                          />
                          <span className="text-[12px] font-semibold text-muted">
                            {run.progress}%
                          </span>
                        </div>
                      </TD>
                      <TD>v{run.agentVersion}</TD>
                      <TD>{formatRelative(run.updatedAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Panel>
        </div>
      </Reveal>
    </div>
  );
}

export function RunDetailView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const router = useRouter();
  const run = state.runs.find((item) => item.id === id);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!run) return <NotFound entity="Run" />;
  const task = state.tasks.find((item) => item.id === run.taskId);
  const project = state.projects.find((item) => item.id === task?.projectId);
  const agent = state.agents[0];

  const act = (fn: () => void) => {
    try {
      fn();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    }
  };

  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <Link
          href="/runs"
          className="container-page inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Runs
        </Link>
        <PageHeader
          eyebrow={run.id.slice(-10)}
          title={task?.title ?? "Research Run"}
          description={`General Research v${run.agentVersion} · Started ${formatDate(run.createdAt)}`}
          actions={
            <>
              <StatusBadge value={run.state} pulse={run.state === "running"} />
              {["succeeded", "failed", "cancelled"].includes(
                run.state,
              ) ? null : (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel run
                </Button>
              )}
            </>
          }
        />
      </Reveal>

      {error ? (
        <div className="container-page">
          <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger">
            <Warning size={18} weight="regular" />
            {error}
          </div>
        </div>
      ) : null}

      <Reveal>
        <div className="container-page grid grid-cols-12 gap-4 md:gap-5">
          <DetailTile
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
          <DetailTile
            label="Task"
            value={
              task ? (
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-accent-hover hover:underline"
                >
                  {task.title}
                </Link>
              ) : (
                "Unavailable"
              )
            }
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          />
          <DetailTile
            label="Agent"
            value={
              agent ? (
                <Link
                  href={`/agents/${agent.id}`}
                  className="text-accent-hover hover:underline"
                >
                  {agent.name} v{run.agentVersion}
                </Link>
              ) : (
                `Version ${run.agentVersion}`
              )
            }
            className="col-span-6 sm:col-span-3 lg:col-span-3"
          />
          <DetailTile
            label="Execution path"
            value="Direct Agent Run"
            className="col-span-6 sm:col-span-3 lg:col-span-3"
          />
          <DetailTile
            label="Selected inputs"
            value={`${task?.sourceIds.length ?? 0} Project Sources`}
            className="col-span-12 lg:col-span-12"
          />
        </div>
      </Reveal>

      {run.state === "awaiting_approval" ? (
        <Reveal>
          <div className="container-page">
            <PlanApprovalCard
              run={run}
              onApprove={() => act(() => source.approvePlan(run.id))}
              onCancel={() => setConfirmCancel(true)}
            />
          </div>
        </Reveal>
      ) : null}
      {["paused_quota", "paused_credentials"].includes(run.state) ? (
        <Reveal>
          <div className="container-page">
            <PausedCard
              run={run}
              onResume={() => act(() => source.resumeRun(run.id))}
            />
          </div>
        </Reveal>
      ) : null}
      {run.state === "running" ? (
        <Reveal>
          <div className="container-page">
            <LiveProgressCard
              run={run}
              onAdvance={() => act(() => source.advanceRun(run.id))}
            />
          </div>
        </Reveal>
      ) : null}
      {run.state === "succeeded" && run.reportId ? (
        <Reveal>
          <div className="container-page">
            <SuccessCard
              reportId={run.reportId}
              onOpen={() => router.push(`/reports/${run.reportId}`)}
            />
          </div>
        </Reveal>
      ) : null}
      {run.state === "failed" ? (
        <Reveal>
          <div className="container-page">
            <FailedCard
              reason={run.pauseReason ?? "Run failed during execution."}
            />
          </div>
        </Reveal>
      ) : null}

      <Reveal>
        <div id="run-events" className="container-page">
          <SectionHeading
            title="Run events"
            description="A sanitized, inspectable record of state, evidence, and tool activity."
          />
          <Timeline events={run.events.toReversed()} />
        </div>
      </Reveal>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent
          title="Cancel this run?"
          description="Cancellation is terminal and will not create a Report. Committed events remain in history."
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep running</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                act(() => source.cancelRun(run.id));
                setConfirmCancel(false);
              }}
            >
              Cancel run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanApprovalCard({
  run,
  onApprove,
  onCancel,
}: {
  run: Run;
  onApprove: () => void;
  onCancel: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
          <Sparkle size={22} weight="regular" />
        </span>
        <div className="flex-1">
          <p className="text-eyebrow">Owner action required</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-text">
            Review the Research Plan
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Evidence tools remain locked until you approve this plan.
          </p>
        </div>
      </div>
      <div className="mt-7 rounded-2xl border border-border bg-surface-soft/40 p-5">
        <p className="text-eyebrow">Objective</p>
        <p className="mt-2 text-[14px] leading-relaxed text-text">
          {run.plan.objective}
        </p>
      </div>
      <ol className="mt-5 space-y-3">
        {run.plan.steps.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-hover">
              {index + 1}
            </span>
            <span className="text-[14px] text-text">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-7 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel run
        </Button>
        <Magnetic strength={0.22}>
          <Button
            variant="primary"
            onClick={onApprove}
            icon={<CheckCircle size={14} weight="bold" />}
            trailing={<ArrowRight size={14} weight="bold" />}
          >
            Approve plan and begin research
          </Button>
        </Magnetic>
      </div>
    </Panel>
  );
}

function PausedCard({ run, onResume }: { run: Run; onResume: () => void }) {
  return (
    <Panel>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning-soft text-warning">
          <PauseCircle size={22} weight="regular" />
        </span>
        <div className="flex-1">
          <h2 className="text-[20px] font-semibold tracking-tight text-text">
            Run paused safely
          </h2>
          <p className="mt-1 text-[13.5px] text-warning">{run.pauseReason}</p>
          <p className="mt-2 text-[12px] text-muted">
            Resume continues from the latest committed checkpoint.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onResume}
          icon={<PlayCircle size={14} weight="bold" />}
        >
          Resume run
        </Button>
      </div>
    </Panel>
  );
}

function LiveProgressCard({
  run,
  onAdvance,
}: {
  run: Run;
  onAdvance: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className="mt-1 inline-block size-3 shrink-0 rounded-full bg-accent"
            style={{ animation: "pulse-ring 1.6s ease-out infinite" }}
            aria-hidden
          />
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-text">
              Research in progress
            </h2>
            <p className="mt-1 text-[12.5px] text-muted">
              Checkpointed after every committed step.
            </p>
          </div>
        </div>
        <span className="text-[28px] font-semibold leading-none tracking-tight text-text">
          {run.progress}%
        </span>
      </div>
      <ProgressBar value={run.progress} className="mt-6 h-2" />
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
        <Button variant="secondary" onClick={onAdvance}>
          Simulate next checkpoint
        </Button>
      </div>
    </Panel>
  );
}

function SuccessCard({
  reportId,
  onOpen,
}: {
  reportId: string;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-accent-soft bg-accent-soft/70 p-8 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
          <CheckCircle size={22} weight="regular" />
        </span>
        <div className="flex-1">
          <h2 className="text-[20px] font-semibold tracking-tight text-text">
            Report ready for review
          </h2>
          <p className="mt-1 text-[13.5px] text-accent-hover">
            The run completed and every required citation passed validation.
          </p>
        </div>
        <Magnetic strength={0.2}>
          <Button
            variant="primary"
            onClick={onOpen}
            trailing={<ArrowRight size={14} weight="bold" />}
          >
            Review report
          </Button>
        </Magnetic>
      </div>
    </div>
  );
}

function FailedCard({ reason }: { reason: string }) {
  return (
    <div className="rounded-[1.75rem] border border-danger/20 bg-danger-soft p-8 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-danger/15 text-danger">
          <Warning size={22} weight="regular" />
        </span>
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-text">
            Run failed
          </h2>
          <p className="mt-1 text-[13.5px] text-danger">{reason}</p>
        </div>
      </div>
    </div>
  );
}

function Timeline({ events }: { events: RunEvent[] }) {
  const reduced = useReducedMotion();
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {events.map((event, index) => (
        <motion.li
          key={event.id}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
            delay: index * 0.04,
          }}
          className="relative"
        >
          <span
            className={cn(
              "absolute -left-[31px] top-1 grid size-4 place-items-center rounded-full border-2 border-bg",
              event.kind === "evidence"
                ? "bg-accent"
                : event.kind === "warning"
                  ? "bg-warn"
                  : event.kind === "tool"
                    ? "bg-purple"
                    : "bg-text",
            )}
            aria-hidden
          />
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card),var(--shadow-inset-highlight)]">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-[13.5px] font-semibold text-text">
                {event.title}
              </strong>
              <span className="font-mono text-[11px] text-muted">
                {formatDate(event.at)}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {event.detail}
            </p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function DetailTile({
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
