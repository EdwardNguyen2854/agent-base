"use client";

import {
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Home,
  Menu,
  PlayCircle,
  Search,
  Settings,
  SquareCheckBig,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useData } from "./data-provider";

const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: SquareCheckBig },
  { href: "/runs", label: "Runs", icon: PlayCircle },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [state] = useData();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  if (path === "/setup") return <>{children}</>;
  const title =
    path === "/"
      ? "Overview"
      : path
          .split("/")
          .filter(Boolean)
          .map((part) => part.replaceAll("-", " "))
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" / ");
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>Agent Base</span>
          <button
            className="icon-button mobile-only"
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                onClick={() => setOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings/credentials"
            className={
              path.startsWith("/settings") ? "nav-link active" : "nav-link"
            }
          >
            <Settings />
            <span>Settings</span>
          </Link>
          <a href="https://github.com" className="nav-link">
            <CircleHelp />
            <span>Help & docs</span>
          </a>
          <div className="demo-chip">
            <span className="status-dot" />
            Demo data
          </div>
        </div>
      </aside>
      {open ? (
        <button
          className="scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            Northstar Research <span>/</span> <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <button className="search-button" type="button">
              <Search /> <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((current) => !current)}
            >
              <Bell />
              <span className="notification-dot" />
            </button>
            {notificationsOpen ? (
              <div className="notifications-popover">
                <div>
                  <strong>Notifications</strong>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <X />
                  </button>
                </div>
                {state.activity.slice(0, 3).map((activity) => (
                  <div className="notification-item" key={activity.id}>
                    <span className={`notification-marker ${activity.tone}`} />
                    <p>{activity.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <button className="owner-menu" type="button">
              <span>OR</span>
              <span className="owner-label">Owner</span>
              <ChevronDown />
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const text = value.replaceAll("_", " ");
  return <span className={`badge badge-${value}`}>{text}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
