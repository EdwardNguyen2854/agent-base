import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="container-page pt-12 pb-10 md:pt-16 md:pb-12">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-eyebrow mb-3 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-accent"
              />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-display text-[clamp(26px,3vw,36px)]">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2.5 md:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-[19px] font-semibold tracking-tight text-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-text",
      )}
    >
      <span aria-hidden>←</span>
      {label}
    </a>
  );
}

export function Notice({
  icon,
  title,
  body,
  action,
  tone = "info",
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: "info" | "success" | "warn";
}) {
  const tones: Record<typeof tone, string> = {
    info: "border-purple/20 bg-purple-soft text-purple",
    success: "border-accent-soft bg-accent-soft text-accent-hover",
    warn: "border-warning/30 bg-warning-soft text-warning",
  };
  return (
    <div
      className={cn(
        "container-page mt-6 flex items-center gap-4 rounded-2xl border px-5 py-4",
        tones[tone],
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <div className="flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        {body ? <p className="mt-0.5 text-[12px] opacity-80">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
