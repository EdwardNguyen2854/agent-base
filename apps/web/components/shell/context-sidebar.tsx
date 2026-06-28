"use client";

import type { IconProps } from "@phosphor-icons/react";
import {
  ArrowRight,
  BookOpen,
  ClipboardText,
  ClockClockwise,
  Folder,
  Gear,
  House,
  Key,
  ListChecks,
  Moon,
  PlayCircle,
  Plug,
  Robot,
  ShieldCheck,
  SignOut,
  Sun,
  TestTube,
  User,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useEffect, useRef, useState } from "react";
import type { FrontendState } from "../../lib/frontend-data";
import { cn } from "../../lib/utils";
import { type AppArea, areaForPath, areaLabel } from "./areas";

type SideItem = {
  label: string;
  icon: ComponentType<IconProps>;
  href?: string;
  exact?: boolean;
  anchor?: boolean;
  future?: boolean;
};

function build(area: AppArea, path: string, state: FrontendState): SideItem[] {
  const segments = path.split("/").filter(Boolean);
  const detailId = segments[1];

  if (area === "dashboard")
    return [
      { label: "Home", icon: House, href: "/", exact: true },
      { label: "My tasks", icon: ListChecks, href: "/tasks" },
      { label: "Recent projects", icon: Folder, href: "/projects" },
      { label: "Recent runs", icon: ClockClockwise, href: "/runs" },
      { label: "Alerts & approvals", icon: ShieldCheck, future: true },
    ];

  if (area === "harness") {
    const agent = state.agents.find((item) => item.id === detailId);
    return [
      { label: "All agents", icon: Robot, href: "/agents", exact: true },
      ...(agent
        ? ([
            {
              label: agent.name,
              icon: House,
              href: `/agents/${agent.id}`,
              exact: true,
            },
            {
              label: "Instructions",
              icon: BookOpen,
              href: `/agents/${agent.id}/instructions`,
            },
            {
              label: "Permissions",
              icon: ShieldCheck,
              href: `/agents/${agent.id}/permissions`,
            },
            {
              label: "Versions",
              icon: ClockClockwise,
              href: `/agents/${agent.id}/versions`,
            },
          ] satisfies SideItem[])
        : []),
      { label: "Tools", icon: Wrench, future: true },
      { label: "Memory", icon: Folder, future: true },
      { label: "Test console", icon: TestTube, future: true },
    ];
  }

  if (area === "workspaces")
    return [
      { label: "All workspaces", icon: Folder, href: "/workspaces" },
      { label: "Library", icon: BookOpen, future: true },
      { label: "Settings", icon: Wrench, future: true },
    ];

  if (area === "projects") {
    const project =
      segments[0] === "projects"
        ? state.projects.find((item) => item.id === detailId)
        : undefined;
    return [
      {
        label: "All projects",
        icon: Folder,
        href: "/projects",
        exact: true,
      },
      { label: "Tasks", icon: ListChecks, href: "/tasks" },
      ...(project
        ? ([
            {
              label: project.name,
              icon: House,
              href: `/projects/${project.id}`,
              exact: true,
            },
            {
              label: "Source library",
              icon: BookOpen,
              href: `/projects/${project.id}/sources`,
            },
            {
              label: "Project tasks",
              icon: ListChecks,
              href: `/projects/${project.id}/tasks`,
            },
          ] satisfies SideItem[])
        : []),
      { label: "Artifacts", icon: ClipboardText, future: true },
    ];
  }

  if (area === "workflows")
    return [
      { label: "All workflows", icon: ArrowRight, href: "/workflows" },
      { label: "Builder", icon: Wrench, future: true },
      { label: "Steps", icon: ListChecks, future: true },
      { label: "Runs", icon: PlayCircle, future: true },
    ];

  if (area === "connectors")
    return [
      { label: "All connectors", icon: Plug, href: "/connectors" },
      { label: "MCP", icon: Wrench, future: true },
      { label: "CLI", icon: ClipboardText, future: true },
      {
        label: "Health",
        icon: ShieldCheck,
        href: "/connectors#health",
        anchor: true,
      },
    ];

  if (area === "settings")
    return [
      { label: "Credentials", icon: Key, href: "/settings/credentials" },
      { label: "System", icon: Wrench, href: "/settings/system" },
    ];

  const run = state.runs.find((item) => item.id === detailId);
  return [
    { label: "All runs", icon: PlayCircle, href: "/runs", exact: true },
    ...(run
      ? ([
          {
            label: "Run overview",
            icon: House,
            href: `/runs/${run.id}`,
            exact: true,
          },
          {
            label: "Logs",
            icon: ClipboardText,
            href: `/runs/${run.id}#run-events`,
            anchor: true,
          },
        ] satisfies SideItem[])
      : []),
    { label: "Replay", icon: ClockClockwise, future: true },
  ];
}

function isActive(item: SideItem, path: string) {
  if (!item.href || item.anchor) return false;
  const href = item.href.split("#")[0] ?? item.href;
  return item.exact
    ? path === href
    : path === href || path.startsWith(`${href}/`);
}

export function ContextSidebar({ state }: { state: FrontendState }) {
  const path = usePathname();
  const area = areaForPath(path);
  const items = build(area, path, state);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!userRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  return (
    <aside
      aria-label={`${areaLabel(area)} navigation`}
      className="hidden w-[240px] shrink-0 border-r border-border bg-surface md:block md:mr-8 lg:mr-10"
    >
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col py-5 pl-4 pr-5">
        <div className="pb-5">
          <p className="text-eyebrow mb-2">{areaLabel(area)}</p>
          <p className="text-[12px] text-muted">
            {area === "dashboard"
              ? "Today across the workspace"
              : area === "harness"
                ? "Configure reusable agents"
                : area === "projects"
                  ? "Sources and tasks"
                  : area === "runs"
                    ? "Inspect execution"
                    : area === "settings"
                      ? "Credentials and system"
                      : "Module navigation"}
          </p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const contents = (
              <>
                <Icon
                  size={16}
                  weight={isActive(item, path) ? "fill" : "regular"}
                  aria-hidden
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.future ? (
                  <span className="rounded-full bg-surface-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
                    Soon
                  </span>
                ) : null}
              </>
            );
            return item.href ? (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                aria-current={isActive(item, path) ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-xl px-3 text-[12.5px] font-semibold transition-colors",
                  isActive(item, path)
                    ? "bg-accent-soft text-accent-hover"
                    : "text-muted hover:bg-surface-soft hover:text-text",
                )}
              >
                {contents}
              </Link>
            ) : (
              <span
                key={item.label}
                aria-disabled
                className="flex h-9 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[12.5px] font-semibold text-muted/60"
              >
                {contents}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-soft hover:text-text"
            >
              <User size={18} weight="regular" />
            </button>
            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[200px] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[0_18px_50px_rgba(20,20,19,0.18)]"
              >
                <Link
                  href="/settings/credentials"
                  onClick={() => setUserMenuOpen(false)}
                  role="menuitem"
                  className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-text hover:bg-accent-soft hover:text-accent-hover"
                >
                  <Gear size={16} weight="regular" />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const next = !dark;
                    document.documentElement.classList.toggle("dark", next);
                    localStorage.setItem("theme", next ? "dark" : "light");
                    setDark(next);
                    setUserMenuOpen(false);
                  }}
                  className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-semibold text-text hover:bg-accent-soft hover:text-accent-hover"
                >
                  {dark ? (
                    <Sun size={16} weight="regular" />
                  ) : (
                    <Moon size={16} weight="regular" />
                  )}
                  Theme
                </button>
                <hr className="my-1 border-border" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-semibold text-muted hover:bg-surface-soft"
                >
                  <SignOut size={16} weight="regular" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
