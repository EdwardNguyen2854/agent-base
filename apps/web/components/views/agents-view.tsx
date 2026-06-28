"use client";

import {
  ArrowRight,
  ArrowUpRight,
  ClockClockwise,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useData } from "../../app/data-provider";
import { formatDate } from "../../lib/utils";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { PageHeader } from "../ui/page";
import { StatusBadge } from "../ui/status-badge";

export function AgentsView() {
  const [state] = useData();
  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeader
        eyebrow="Harness"
        title="Agents"
        description="Configure reusable research behaviour. Each publication is an immutable snapshot — every Run retains the exact version it started with."
        actions={
          <Button
            variant="secondary"
            icon={<Lightning size={14} weight="regular" />}
          >
            New draft
          </Button>
        }
      />

      <Reveal>
        <Stagger className="container-page grid grid-cols-12 gap-5 md:gap-6" gap={0.06}>
          {state.agents.map((agent, index) => {
            const latest = agent.versions.at(-1);
            const layout =
              index % 3 === 0
                ? "col-span-12 lg:col-span-6"
                : index % 3 === 1
                  ? "col-span-12 lg:col-span-3"
                  : "col-span-12 lg:col-span-3";
            return (
              <StaggerItem key={agent.id} className={layout}>
                <Link
                  href={`/agents/${agent.id}`}
                  className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-surface p-7 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-text/15 hover:shadow-[var(--shadow-card-hover)] md:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
                      <Lightning size={22} weight="regular" />
                    </span>
                    <ArrowUpRight
                      size={18}
                      weight="bold"
                      className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                      aria-hidden
                    />
                  </div>
                  <h3 className="mt-7 text-[19px] font-semibold tracking-tight text-text">
                    {agent.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                    {agent.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
                    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <StatusBadge value="published" />
                      <span>v{latest?.number}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <ClockClockwise size={12} weight="regular" />
                      {formatDate(agent.updatedAt)}
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <section className="rounded-[1.75rem] border border-border bg-accent-soft/60 p-7 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-eyebrow">Immutable publication</p>
              <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
                Every Run pins the version it started with.
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                Each publication snapshots the Agent Draft. Existing Runs always
                retain the exact version they started with, so audits stay
                consistent across model changes.
              </p>
            </div>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-hover hover:text-accent"
            >
              Read more <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </section>
        </div>
      </Reveal>
    </div>
  );
}
