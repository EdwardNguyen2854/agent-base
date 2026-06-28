"use client";

import { List, MagnifyingGlass, Plus, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { cn } from "../../lib/utils";
import { type AppArea, AREAS, areaForPath } from "./areas";

export function GlobalHeader({
  workspaceName,
  onOpenMobile,
}: {
  workspaceName: string;
  onOpenMobile: () => void;
}) {
  const path = usePathname();
  const area: AppArea = areaForPath(path);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          className="-ml-2 grid size-9 place-items-center rounded-xl text-text hover:bg-surface-soft md:hidden"
        >
          <List size={20} weight="bold" />
        </button>
        <Link href="/" className="-ml-2 flex items-center gap-2.5 group">
          <span className="font-display text-[18px] font-bold tracking-tight bg-[linear-gradient(90deg,var(--color-text)_0%,var(--color-accent)_35%,var(--color-brand-subtle)_50%,var(--color-accent)_65%,var(--color-text)_100%)] bg-[length:300%_100%] bg-clip-text text-transparent group-hover:animate-[color-wash_1.5s_linear_forwards]">
            Agent Base
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          {AREAS.map((item) => {
            const Icon = item.icon;
            const active = area === item.area;
            return (
              <Link
                key={item.area}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-accent-soft text-accent-hover"
                    : "text-muted hover:bg-surface-soft hover:text-text",
                )}
              >
                <Icon
                  size={15}
                  weight={active ? "fill" : "regular"}
                  aria-hidden
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("agent-base:open-search"))
            }
            className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-soft hover:text-text"
            aria-label="Search Agent Base"
          >
            <MagnifyingGlass size={18} weight="regular" />
          </button>
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-text px-3.5 text-[12px] font-semibold text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-text"
          >
            <Plus size={14} weight="bold" />
            <span className="hidden sm:inline">New project</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-[8px] bg-text text-bg"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <span className="font-bold tracking-tight">A</span>
    </span>
  );
}

export function MobileDrawer({
  open,
  onClose,
  workspaceName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-text/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-border bg-surface transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/"
            onClick={onClose}
            className="-ml-2 flex items-center gap-2.5 group"
          >
            <span className="font-display text-[18px] font-bold tracking-tight bg-[linear-gradient(90deg,var(--color-text)_0%,var(--color-accent)_35%,var(--color-brand-subtle)_50%,var(--color-accent)_65%,var(--color-text)_100%)] bg-[length:300%_100%] bg-clip-text text-transparent group-hover:animate-[color-wash_1.5s_linear_forwards]">
              Agent Base
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-soft"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <nav
          aria-label="Primary mobile"
          className="flex flex-col gap-1 p-4"
          onClick={onClose}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onClose();
          }}
        >
          {AREAS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.area}
                href={item.href}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold text-text hover:bg-surface-soft"
              >
                <Icon size={18} weight="regular" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-5 text-[12px] text-muted">
          <span className="font-semibold text-text">{workspaceName}</span>
          <p className="mt-0.5">Local-first · Single Owner</p>
        </div>
      </aside>
      {children}
    </div>
  );
}
