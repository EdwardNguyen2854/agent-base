"use client";

import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../../app/data-provider";
import type { Agent } from "../../lib/frontend-data";
import { cn, formatDate } from "../../lib/utils";
import { Magnetic } from "../motion/magnetic";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "../ui/dialog";
import { TextAreaField } from "../ui/field";
import { Toggle } from "../ui/inputs";
import { BackLink, PageHeader } from "../ui/page";
import { Toast } from "../ui/states";
import { Divider, Panel } from "../ui/surfaces";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";

type Tab = "overview" | "instructions" | "permissions" | "versions";

export function AgentDetailView({ section = "overview" }: { section?: Tab }) {
  const { id } = useParams<{ id: string }>();
  const [state, source] = useData();
  const agent = state.agents.find((item) => item.id === id);

  if (!agent) return <NotFound entity="Agent" />;
  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <BackLink href="/agents" label="Agents" />
        <PageHeader
          eyebrow={`v${agent.versions.at(-1)?.number}`}
          title={agent.name}
          description={agent.description}
          actions={
            <>
              <Button variant="secondary" asChild>
                <Link href="/agents">All agents</Link>
              </Button>
              <Magnetic strength={0.18}>
                <Button
                  variant="primary"
                  icon={<Sparkle size={14} weight="bold" />}
                >
                  Publish version
                </Button>
              </Magnetic>
            </>
          }
        />
      </Reveal>

      <TabBar id={agent.id} section={section} />

      {section === "overview" ? (
        <OverviewTab agent={agent} runs={state.runs.length} />
      ) : null}
      {section === "instructions" ? (
        <InstructionsTab agent={agent} onSave={source.saveAgentDraft} />
      ) : null}
      {section === "permissions" ? <PermissionsTab agent={agent} /> : null}
      {section === "versions" ? <VersionsTab agent={agent} /> : null}
    </div>
  );
}

function TabBar({ id, section }: { id: string; section: Tab }) {
  const tabs: Array<{ key: Tab; label: string; href: string }> = [
    { key: "overview", label: "Overview", href: `/agents/${id}` },
    {
      key: "instructions",
      label: "Instructions",
      href: `/agents/${id}/instructions`,
    },
    {
      key: "permissions",
      label: "Permissions",
      href: `/agents/${id}/permissions`,
    },
    { key: "versions", label: "Versions", href: `/agents/${id}/versions` },
  ];
  return (
    <Reveal delay={0.05}>
      <nav
        aria-label="Agent sections"
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
    </Reveal>
  );
}

function OverviewTab({ agent, runs }: { agent: Agent; runs: number }) {
  const latest = agent.versions.at(-1);
  return (
    <div className="container-page space-y-10">
      <Reveal>
        <Stagger className="grid grid-cols-12 gap-4 md:gap-5" gap={0.05}>
          <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DetailCard
              label="Published version"
              value={`v${latest?.number}`}
            />
          </StaggerItem>
          <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
            <DetailCard
              label="Project Sources"
              value={
                agent.draft.permissions.projectSources ? "Allowed" : "Disabled"
              }
              tone={agent.draft.permissions.projectSources ? "ok" : "neutral"}
            />
          </StaggerItem>
          <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
            <DetailCard
              label="Web evidence"
              value={agent.draft.permissions.webSearch ? "Allowed" : "Disabled"}
              tone={agent.draft.permissions.webSearch ? "ok" : "neutral"}
            />
          </StaggerItem>
          <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DetailCard label="Runs" value={runs} />
          </StaggerItem>
        </Stagger>
      </Reveal>

      <Reveal>
        <Panel>
          <p className="text-eyebrow">Configuration object</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
            Purpose
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            {agent.draft.purpose}
          </p>
          <Divider />
          <h3 className="text-[15px] font-semibold text-text">
            Research method
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {agent.draft.researchMethod}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <span className="text-[12px] text-muted">
              Edit instructions to refine how this Agent reasons.
            </span>
            <Button variant="secondary" asChild>
              <Link href={`/agents/${agent.id}/instructions`}>
                Edit instructions
              </Link>
            </Button>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

function InstructionsTab({
  agent,
  onSave,
}: {
  agent: Agent;
  onSave: (id: string, draft: Agent["draft"]) => void;
}) {
  const [draft, setDraft] = useState<Agent["draft"]>(() =>
    structuredClone(agent.draft),
  );
  const [toast, setToast] = useState<string | null>(null);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(agent.draft),
    [draft, agent.draft],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div className="container-page">
      <Reveal>
        <Panel>
          <p className="text-eyebrow">Draft</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
            Refine this Agent
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Changes here stay in the draft until you publish a new immutable
            version. Existing Runs always keep the version they started with.
          </p>

          <div className="mt-7 space-y-6">
            <TextAreaField
              label="Purpose"
              rows={3}
              value={draft.purpose}
              onChange={(event) =>
                setDraft({ ...draft, purpose: event.target.value })
              }
            />
            <TextAreaField
              label="Operating instructions"
              rows={5}
              value={draft.instructions}
              onChange={(event) =>
                setDraft({ ...draft, instructions: event.target.value })
              }
            />
            <TextAreaField
              label="Research method"
              rows={4}
              value={draft.researchMethod}
              onChange={(event) =>
                setDraft({ ...draft, researchMethod: event.target.value })
              }
            />
            <TextAreaField
              label="Report outline and requirements"
              rows={4}
              value={draft.reportRequirements}
              onChange={(event) =>
                setDraft({ ...draft, reportRequirements: event.target.value })
              }
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {dirty ? (
              <p className="inline-flex items-center gap-2 text-[12px] font-semibold text-warning">
                <span className="size-1.5 rounded-full bg-warn" />
                Unsaved changes
              </p>
            ) : (
              <p className="text-[12px] text-muted">Draft is up to date.</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={!dirty}
                onClick={() => {
                  setDraft(structuredClone(agent.draft));
                  setToast("Draft reset.");
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                disabled={!dirty}
                onClick={() => {
                  onSave(agent.id, draft);
                  setToast("Draft saved.");
                }}
              >
                Save draft
              </Button>
            </div>
          </div>
        </Panel>
      </Reveal>
      {toast ? (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function PermissionsTab({ agent }: { agent: Agent }) {
  const [draft, setDraft] = useState<Agent["draft"]>(() =>
    structuredClone(agent.draft),
  );
  return (
    <div className="container-page">
      <Reveal>
        <Panel>
          <p className="text-eyebrow">Permissions</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
            Evidence and limits
          </h2>

          <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            Evidence permissions
          </h3>
          <div className="mt-3">
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
          </div>

          <Divider />

          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            Run limits
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Limits may reduce, but never exceed, the platform maximums.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(draft.limits).map(([key, value]) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold text-text">
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (c) => c.toUpperCase())}
                </span>
                <input
                  type="number"
                  min={1}
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
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text hover:border-text/20 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ))}
          </div>

          <div className="mt-7 flex justify-end border-t border-border pt-5">
            <Button variant="primary">Save permissions</Button>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

function VersionsTab({ agent }: { agent: Agent }) {
  const [inspect, setInspect] = useState<number | null>(null);
  const version = inspect
    ? agent.versions.find((item) => item.number === inspect)
    : null;

  return (
    <div className="container-page">
      <Reveal>
        <Panel>
          <p className="text-eyebrow">History</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
            Published versions
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Each version is an immutable snapshot. Click a row to inspect its
            full configuration.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <Table>
              <THead>
                <TR>
                  <TH>Version</TH>
                  <TH>Published</TH>
                  <TH>Purpose</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {agent.versions.toReversed().map((item) => (
                  <TR key={item.id}>
                    <TD primary>v{item.number}</TD>
                    <TD>{formatDate(item.publishedAt)}</TD>
                    <TD className="max-w-[420px]">
                      <span className="line-clamp-2">{item.purpose}</span>
                    </TD>
                    <TD>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspect(item.number)}
                      >
                        Inspect
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Panel>
      </Reveal>

      <Dialog
        open={version !== null}
        onOpenChange={(open) => {
          if (!open) setInspect(null);
        }}
      >
        {version ? (
          <DialogContent
            title={`Version ${version.number}`}
            description="An immutable snapshot of this Agent at publication time."
          >
            <div className="space-y-5">
              <div>
                <p className="text-eyebrow">Purpose</p>
                <p className="mt-1 text-[14px] leading-relaxed text-text">
                  {version.purpose}
                </p>
              </div>
              <div>
                <p className="text-eyebrow">Research method</p>
                <p className="mt-1 text-[14px] leading-relaxed text-text">
                  {version.researchMethod}
                </p>
              </div>
              <div>
                <p className="text-eyebrow">Report requirements</p>
                <p className="mt-1 text-[14px] leading-relaxed text-text">
                  {version.reportRequirements}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-soft/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Limits
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-y-1 text-[12.5px] text-muted md:grid-cols-4">
                  <li>
                    <strong className="text-text">
                      {version.limits.modelTurns}
                    </strong>{" "}
                    turns
                  </li>
                  <li>
                    <strong className="text-text">
                      {version.limits.tavilySearches}
                    </strong>{" "}
                    searches
                  </li>
                  <li>
                    <strong className="text-text">
                      {version.limits.pageFetches}
                    </strong>{" "}
                    fetches
                  </li>
                  <li>
                    <strong className="text-text">
                      {version.limits.activeMinutes}
                    </strong>{" "}
                    min
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function DetailCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "ok";
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-[24px] font-semibold tracking-tight",
          tone === "ok" ? "text-accent-hover" : "text-text",
        )}
      >
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
