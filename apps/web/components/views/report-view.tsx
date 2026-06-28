"use client";

import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  CheckCircle,
  Download,
  ShieldCheck,
  X,
} from "@phosphor-icons/react/dist/ssr";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "../../app/data-provider";
import {
  type Report,
  renderReportMarkdown,
  type SourceExcerpt,
} from "../../lib/frontend-data";
import { cn, formatDate } from "../../lib/utils";
import { Reveal } from "../motion/reveal";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter } from "../ui/dialog";
import { BackLink, PageHeader } from "../ui/page";
import { Panel } from "../ui/surfaces";

export function ReportView() {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const router = useRouter();
  const report = state.reports.find((item) => item.id === id);
  const [excerpt, setExcerpt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [revision, setRevision] = useState(false);

  if (!report) return <NotFound entity="Report" />;
  const task = state.tasks.find((item) => item.id === report.taskId);

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([renderReportMarkdown(report)], { type: "text/markdown" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <Reveal>
        <BackLink
          href={`/tasks/${report.taskId}`}
          label={task?.title ?? "Back to task"}
        />
        <PageHeader
          eyebrow="Report"
          title={report.title}
          description={`Created ${formatDate(report.createdAt)} · ${report.blocks.length} blocks · ${report.excerpts.length} retained excerpts`}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={download}
                icon={<Download size={14} weight="bold" />}
              >
                Export Markdown
              </Button>
              {report.acceptedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent-hover">
                  <CheckCircle size={12} weight="bold" /> Accepted
                </span>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => source.acceptReport(report.id)}
                  icon={<CheckCircle size={14} weight="bold" />}
                >
                  Accept report
                </Button>
              )}
            </>
          }
        />
      </Reveal>

      <div className="container-page grid grid-cols-12 gap-6 lg:gap-10">
        <Reveal className="col-span-12 lg:col-span-8">
          <article className="rounded-[1.75rem] border border-border bg-surface p-8 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] md:p-12">
            <header className="border-b border-border pb-8">
              <p className="text-eyebrow">Prepared by General Research</p>
              <h2 className="mt-2 text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-text">
                {report.title}
              </h2>
            </header>
            <div className="mt-8 space-y-8">
              {report.blocks.map((block) => (
                <section key={block.id}>
                  <BlockLabel type={block.type} />
                  <p className="mt-3 font-serif text-[17px] leading-[1.85] text-text">
                    {block.text}{" "}
                    {block.citationIds.map((citationId, index) => {
                      const idx = report.excerpts.findIndex(
                        (ex) => ex.id === citationId,
                      );
                      if (idx === -1) return null;
                      return (
                        <button
                          key={citationId}
                          type="button"
                          onClick={() => setExcerpt(citationId)}
                          aria-label={`Open citation ${index + 1}`}
                          className="mx-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-soft px-1.5 align-super text-[10px] font-bold text-accent-hover hover:bg-accent hover:text-bg"
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </p>
                </section>
              ))}
            </div>
            <hr className="my-10 border-border" />
            <h3 className="text-[18px] font-semibold tracking-tight text-text">
              Source appendix
            </h3>
            <ul className="mt-4 space-y-2">
              {report.excerpts.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setExcerpt(item.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-accent-soft"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-hover">
                      {index + 1}
                    </span>
                    <span className="flex-1">
                      <strong className="block text-[13.5px] font-semibold text-text">
                        {item.sourceName}
                      </strong>
                      <span className="mt-0.5 block text-[11.5px] text-muted">
                        {item.locator}
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      View
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        <Reveal className="col-span-12 lg:col-span-4" delay={0.05}>
          <div className="sticky top-24 space-y-5">
            <Panel>
              <p className="text-eyebrow">Review outcome</p>
              {report.acceptedAt ? (
                <div className="mt-3 rounded-2xl border border-accent bg-accent-soft p-5 text-center text-accent-hover">
                  <span className="mx-auto grid size-10 place-items-center rounded-full bg-accent text-bg">
                    <CheckCircle size={20} weight="bold" />
                  </span>
                  <p className="mt-3 text-[14px] font-semibold">
                    Accepted outcome
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider opacity-70">
                    {formatDate(report.acceptedAt)}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    Accept this report as the Task outcome, or request a new Run
                    with specific feedback.
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setRevision(true)}
                    icon={<ArrowCounterClockwise size={14} weight="regular" />}
                    className="mt-4"
                  >
                    Request a new run with feedback
                  </Button>
                </>
              )}
              <hr className="my-6 border-border" />
              <p className="text-eyebrow">Evidence coverage</p>
              <div className="mt-3 flex items-center gap-4">
                <CircularProgress value={100} />
                <span>
                  <strong className="block text-[22px] font-semibold tracking-tight text-text">
                    100%
                  </strong>
                  <span className="text-[12px] text-muted">
                    Required blocks cited
                  </span>
                </span>
              </div>
            </Panel>
            <div className="rounded-[1.5rem] border border-border bg-surface-soft/40 p-5 text-[12.5px] leading-relaxed text-muted">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-hover">
                <ShieldCheck size={14} weight="regular" />
                Evidence stays attached
              </span>
              <p className="mt-2">
                Every retained excerpt remains available even if the original
                Source is deleted.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <ExcerptDrawer
        excerptId={excerpt}
        report={report}
        onClose={() => setExcerpt(null)}
      />
      <RevisionDialog
        open={revision}
        onClose={() => setRevision(false)}
        feedback={feedback}
        setFeedback={setFeedback}
        onSubmit={() => {
          const run = source.reviseReport(report.id, feedback);
          router.push(`/runs/${run.id}`);
        }}
      />
    </div>
  );
}

function BlockLabel({ type }: { type: Report["blocks"][number]["type"] }) {
  const map: Record<typeof type, { label: string; tone: string }> = {
    factual: { label: "Factual", tone: "bg-accent-soft text-accent-hover" },
    synthesis: { label: "Synthesis", tone: "bg-purple-soft text-purple" },
    recommendation: {
      label: "Recommendation",
      tone: "bg-purple-soft text-purple",
    },
    limitation: { label: "Limitation", tone: "bg-warning-soft text-warning" },
  };
  const { label, tone } = map[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function CircularProgress({ value }: { value: number }) {
  const radius = 26;
  const stroke = 4;
  const c = 2 * Math.PI * radius;
  const offset = c - (value / 100) * c;
  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${value}% evidence coverage`}
    >
      <title>{`${value}% evidence coverage`}</title>
      <circle
        cx="32"
        cy="32"
        r={radius}
        stroke="var(--color-rule)"
        strokeWidth={stroke}
        fill="none"
      />
      <motion.circle
        cx="32"
        cy="32"
        r={radius}
        stroke="var(--color-accent)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={useReducedMotion() ? false : { strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

function ExcerptDrawer({
  excerptId,
  report,
  onClose,
}: {
  excerptId: string | null;
  report: Report;
  onClose: () => void;
}) {
  const open = excerptId !== null;
  const item: SourceExcerpt | undefined = excerptId
    ? report.excerpts.find((ex) => ex.id === excerptId)
    : undefined;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-text/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-label="Retained source excerpt"
          className="fixed inset-y-0 right-0 z-[201] w-[min(460px,92vw)] overflow-y-auto rounded-l-[1.75rem] border-l border-border bg-surface p-8 shadow-[-24px_0_60px_rgba(20,20,19,0.16)] focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {item?.sourceName ?? "Source excerpt"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-5 top-5 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-soft hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </DialogPrimitive.Close>
          {item ? (
            <>
              <p className="text-eyebrow">Retained source excerpt</p>
              <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
                {item.sourceName}
              </h3>
              <p className="mt-1 text-[12px] font-mono text-accent-hover">
                {item.locator}
              </p>
              <blockquote className="mt-7 rounded-2xl border-l-4 border-accent bg-accent-soft/60 p-5 font-serif text-[16px] leading-[1.7] text-text">
                {item.text}
              </blockquote>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-hover hover:text-accent"
                >
                  Open original <ArrowSquareOut size={14} weight="bold" />
                </a>
              ) : null}
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-surface-soft/40 p-4 text-[12px] leading-relaxed text-muted">
                <ShieldCheck
                  size={16}
                  weight="regular"
                  className="mt-0.5 shrink-0 text-accent-hover"
                />
                <p>
                  This exact excerpt is preserved with the Run and remains
                  available if the original Project Source is deleted.
                </p>
              </div>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RevisionDialog({
  open,
  onClose,
  feedback,
  setFeedback,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  feedback: string;
  setFeedback: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Request a new run"
        description="Your feedback becomes an explicit input to a new immutable Run attempt."
      >
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-text">
            Revision feedback
          </span>
          <textarea
            rows={5}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="What should the next run change?"
            className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-text hover:border-text/20 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit}>
            Start revision run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
