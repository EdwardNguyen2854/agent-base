"use client";

import { CaretRight, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../../app/data-provider";
import type { SearchResult } from "../../app/navigation";
import { cn } from "../../lib/utils";

export function CommandPalette() {
  const [state] = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("agent-base:open-search", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agent-base:open-search", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    const list: SearchResult[] = [];
    for (const agent of state.agents) {
      if (
        `${agent.name} ${agent.description}`
          .toLocaleLowerCase()
          .includes(needle)
      )
        list.push({
          href: `/agents/${agent.id}`,
          kind: "Agent",
          title: agent.name,
          description: agent.description,
        });
    }
    for (const project of state.projects) {
      if (
        `${project.name} ${project.description}`
          .toLocaleLowerCase()
          .includes(needle)
      )
        list.push({
          href: `/projects/${project.id}`,
          kind: "Project",
          title: project.name,
          description: project.description || "Project workspace",
        });
    }
    for (const task of state.tasks) {
      if (`${task.title} ${task.goal}`.toLocaleLowerCase().includes(needle))
        list.push({
          href: `/tasks/${task.id}`,
          kind: "Task",
          title: task.title,
          description: task.goal,
        });
    }
    for (const run of state.runs) {
      const task = state.tasks.find((item) => item.id === run.taskId);
      if (`${run.id} ${task?.title ?? ""}`.toLocaleLowerCase().includes(needle))
        list.push({
          href: `/runs/${run.id}`,
          kind: "Run",
          title: task?.title ?? run.id,
          description: `${run.id.slice(-8)} · ${run.state.replaceAll("_", " ")}`,
        });
    }
    return list.slice(0, 10);
  }, [query, state]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-text/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-label="Search Agent Base"
          className="fixed left-1/2 top-[min(15vh,140px)] z-[201] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(20,20,19,0.24)] focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Search Agent Base
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search projects, tasks, agents, and runs.
          </DialogPrimitive.Description>
          <label className="flex h-14 items-center gap-3 border-b border-border px-4">
            <MagnifyingGlass
              size={18}
              weight="regular"
              className="text-muted"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              aria-label="Search projects, tasks, agents, and runs"
              placeholder="Search projects, tasks, agents, runs…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted/70"
            />
            <DialogPrimitive.Close
              className="rounded-md p-1 text-muted hover:bg-surface-soft hover:text-text"
              aria-label="Close"
            >
              <X size={16} weight="bold" />
            </DialogPrimitive.Close>
          </label>
          <Results
            loading={false}
            results={results}
            query={query}
            onSelect={(href) => {
              close();
              router.push(href);
            }}
          />
          <div className="flex items-center justify-between border-t border-border bg-surface-soft/40 px-4 py-2 text-[11px] text-muted">
            <span>
              <kbd className="rounded border border-border bg-surface px-1.5">
                Esc
              </kbd>{" "}
              to close
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1.5">
                ↑↓
              </kbd>{" "}
              to navigate
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Results({
  results,
  query,
  onSelect,
  loading,
}: {
  results: SearchResult[];
  query: string;
  onSelect: (href: string) => void;
  loading?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    setActiveIndex(0);
  }, []);

  if (!query.trim()) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-muted">
        Type to search the workspace.
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-muted">
        No matching Agent Base objects.
      </div>
    );
  }
  return (
    <div className="max-h-[420px] overflow-y-auto p-2">
      {results.map((result, index) => (
        <button
          key={`${result.kind}-${result.href}`}
          type="button"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (event.key === "Enter") {
              const target = results[activeIndex];
              if (target) onSelect(target.href);
            }
          }}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(result.href)}
          className={cn(
            "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
            index === activeIndex ? "bg-accent-soft" : "hover:bg-surface-soft/60",
          )}
        >
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-hover">
            {result.kind}
          </span>
          <span className="flex-1">
            <strong className="block text-[13.5px] font-semibold text-text">
              {result.title}
            </strong>
            <span className="mt-0.5 block truncate text-[12px] text-muted">
              {result.description}
            </span>
          </span>
          <CaretRight
            size={14}
            weight="bold"
            className="mt-1 text-muted"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
