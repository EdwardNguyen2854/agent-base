"use client";

import type { IconProps } from "@phosphor-icons/react";
import {
  Folder,
  House,
  Kanban,
  PlayCircle,
  Plug,
  Robot,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type AppArea =
  | "dashboard"
  | "harness"
  | "workspaces"
  | "projects"
  | "workflows"
  | "connectors"
  | "runs"
  | "settings";

export const AREAS: Array<{
  area: Exclude<AppArea, "settings">;
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
}> = [
  { area: "dashboard", href: "/", label: "Home", icon: House },
  { area: "harness", href: "/agents", label: "Agents", icon: Robot },
  {
    area: "workspaces",
    href: "/workspaces",
    label: "Workspaces",
    icon: Kanban,
  },
  { area: "projects", href: "/projects", label: "Projects", icon: Folder },
  { area: "workflows", href: "/workflows", label: "Workflows", icon: Sparkle },
  { area: "connectors", href: "/connectors", label: "Connectors", icon: Plug },
  { area: "runs", href: "/runs", label: "Runs", icon: PlayCircle },
];

export function areaLabel(area: AppArea): string {
  if (area === "settings") return "Settings";
  return AREAS.find((item) => item.area === area)?.label ?? "Home";
}

export function areaForPath(path: string): AppArea {
  if (path.startsWith("/agents")) return "harness";
  if (path.startsWith("/workspaces")) return "workspaces";
  if (path.startsWith("/projects") || path.startsWith("/tasks"))
    return "projects";
  if (path.startsWith("/workflows")) return "workflows";
  if (path.startsWith("/connectors")) return "connectors";
  if (path.startsWith("/runs") || path.startsWith("/reports")) return "runs";
  if (path.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function AreaLink({
  href,
  label,
  icon: Icon,
  active,
  trailing,
}: {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  active?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors",
        active
          ? "bg-accent-soft text-accent-hover"
          : "text-muted hover:bg-surface-soft hover:text-text",
      )}
    >
      <Icon
        size={18}
        weight={active ? "fill" : "regular"}
        className="shrink-0"
        aria-hidden
      />
      <span className="flex-1">{label}</span>
      {trailing}
    </Link>
  );
}
