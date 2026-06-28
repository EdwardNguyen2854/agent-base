"use client";

import {
  ArrowRight,
  BookOpen,
  Cube,
  Lightning,
  Plug,
  Sparkle,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { PageHeader, SectionHeading } from "../ui/page";
import { StatusBadge } from "../ui/status-badge";
import { Panel } from "../ui/surfaces";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { formatDate } from "../../lib/utils";
import { useData } from "../../app/data-provider";

export function WorkspacesView() {
  const [state] = useData();
  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <PageHeader
          eyebrow="Workspaces"
          title="Knowledge and isolation"
          description="The single-owner boundary for everything in this Agent Base installation."
        />
      </Reveal>

      <Reveal>
        <div className="container-page grid grid-cols-12 gap-5">
          <Panel className="col-span-12 flex flex-col gap-5 md:flex-row md:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
              <Cube size={26} weight="regular" />
            </span>
            <div className="flex-1">
              <p className="text-eyebrow">Current workspace</p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-text">
                {state.workspace.name}
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Single-owner knowledge boundary for this local Agent Base
                installation.
              </p>
            </div>
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <Stagger className="grid grid-cols-12 gap-4 md:gap-5" gap={0.05}>
            <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
              <Stat label="Linked projects" value={state.projects.length} />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
              <Stat label="Linked agents" value={state.agents.length} />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-3">
              <Stat label="Library documents" value={0} muted />
            </StaggerItem>
            <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-3">
              <Stat label="Linked workflows" value={0} muted />
            </StaggerItem>
          </Stagger>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <SectionHeading
            title="Knowledge library"
            description="Reusable standards, guidance, and templates belong here rather than in temporary task uploads."
          />
          <div className="grid grid-cols-12 gap-4 md:gap-5">
            {[
              "Documents",
              "Standards",
              "Guidelines",
              "Templates",
              "Knowledge base",
            ].map((label) => (
              <div
                key={label}
                className="col-span-12 sm:col-span-6 lg:col-span-[20%]"
              >
                <Panel>
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-hover">
                    <BookOpen size={18} weight="regular" />
                  </span>
                  <strong className="mt-4 block text-[14px] font-semibold text-text">
                    {label}
                  </strong>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Backend planned
                  </span>
                </Panel>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function WorkflowsView() {
  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <PageHeader
          eyebrow="Workflows"
          title="Repeatable execution paths"
          description="Define workflows that call Agents and stop for human checkpoints. The Workflow stays distinct from the Agent."
        />
      </Reveal>

      <Reveal>
        <div className="container-page">
          <Panel className="flex flex-col items-start gap-3 py-12 text-center md:items-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
              <Sparkle size={26} weight="regular" />
            </span>
            <h2 className="text-[22px] font-semibold tracking-tight text-text">
              Executable Workflows are planned
            </h2>
            <p className="max-w-xl text-[13.5px] leading-relaxed text-muted">
              The v0.1 frontend reserves this product area, but workflow
              definitions, builders, validators, and execution require the
              future backend.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              asChild
              icon={<ArrowRight size={14} weight="bold" />}
            >
              <Link href="/agents">Configure agents instead</Link>
            </Button>
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <SectionHeading
            title="Planned workflow model"
            description="A workflow guides work; an agent makes flexible decisions inside selected steps."
          />
          <div className="grid grid-cols-12 gap-4 md:gap-5">
            {[
              {
                title: "Steps & inputs",
                body: "Define the repeatable path.",
                icon: <Wrench size={18} weight="regular" />,
              },
              {
                title: "Assigned Agents",
                body: "Delegate flexible decisions.",
                icon: <Lightning size={18} weight="regular" />,
              },
              {
                title: "Human checkpoints",
                body: "Require explicit review.",
                icon: <ArrowRight size={18} weight="bold" />,
              },
            ].map((item) => (
              <div key={item.title} className="col-span-12 md:col-span-4">
                <Panel>
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-hover">
                    {item.icon}
                  </span>
                  <strong className="mt-4 block text-[14.5px] font-semibold text-text">
                    {item.title}
                  </strong>
                  <span className="mt-1 block text-[12.5px] text-muted">
                    {item.body}
                  </span>
                </Panel>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function ConnectorsView() {
  const [state] = useData();
  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <PageHeader
          eyebrow="Connectors"
          title="Provider and tool access"
          description="Controlled access to providers, tools, and external systems. Credentials live in System settings."
          actions={
            <Button variant="secondary" asChild>
              <Link href="/settings/credentials">Manage credentials</Link>
            </Button>
          }
        />
      </Reveal>

      <Reveal>
        <section id="health" className="container-page">
          <SectionHeading
            title="Provider health"
            description="Existing v0.1 service connections and their credential status."
          />
          <Panel padded={false}>
            <Table>
              <THead>
                <TR>
                  <TH>Connection</TH>
                  <TH>Purpose</TH>
                  <TH>Status</TH>
                  <TH>Validated</TH>
                </TR>
              </THead>
              <TBody>
                {state.credentials.map((credential) => (
                  <TR key={credential.provider}>
                    <TD primary>
                      <span className="inline-flex items-center gap-2.5">
                        <Plug
                          size={16}
                          weight="regular"
                          className="text-accent-hover"
                        />
                        {credential.provider}
                      </span>
                    </TD>
                    <TD>
                      {credential.provider === "MiniMax"
                        ? "Model provider"
                        : "Public web discovery"}
                    </TD>
                    <TD>
                      <StatusBadge value={credential.status} />
                    </TD>
                    <TD>
                      {credential.validatedAt
                        ? `Validated ${formatDate(credential.validatedAt)}`
                        : "Not configured"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Panel>
        </section>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <SectionHeading
            title="Future connector types"
            description="These surfaces are visible for information architecture only and are not operational."
          />
          <div className="grid grid-cols-12 gap-4 md:gap-5">
            {[
              {
                title: "MCP Servers",
                body: "Backend planned",
                icon: <Wrench size={18} weight="regular" />,
              },
              {
                title: "CLI Tools",
                body: "Backend planned",
                icon: <ArrowRight size={18} weight="bold" />,
              },
              {
                title: "APIs & local apps",
                body: "Backend planned",
                icon: <Plug size={18} weight="regular" />,
              },
            ].map((item) => (
              <div key={item.title} className="col-span-12 md:col-span-4">
                <Panel>
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-hover">
                    {item.icon}
                  </span>
                  <strong className="mt-4 block text-[14.5px] font-semibold text-text">
                    {item.title}
                  </strong>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {item.body}
                  </span>
                </Panel>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] ${muted ? "opacity-70" : ""}`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-text">
        {value}
      </p>
    </div>
  );
}
