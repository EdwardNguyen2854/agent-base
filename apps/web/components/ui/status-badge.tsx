import type { ReactNode } from "react";

export type BadgeTone =
  | "running"
  | "awaiting_approval"
  | "paused"
  | "queued"
  | "pending"
  | "open"
  | "in_review"
  | "healthy"
  | "ready"
  | "published"
  | "accepted"
  | "succeeded"
  | "completed"
  | "processing"
  | "failed"
  | "invalid"
  | "missing"
  | "cancelled"
  | "archived"
  | "neutral";

function toneClass(tone: BadgeTone): string {
  if (
    [
      "running",
      "healthy",
      "ready",
      "published",
      "accepted",
      "succeeded",
      "completed",
    ].includes(tone)
  ) {
    return "bg-accent-soft text-accent-hover";
  }
  if (["awaiting_approval", "in_review", "processing"].includes(tone)) {
    return "bg-warning-soft text-warning";
  }
  if (["paused", "failed", "invalid"].includes(tone)) {
    return "bg-danger-soft text-danger";
  }
  if (["queued", "pending", "open"].includes(tone)) {
    return "bg-purple-soft text-purple";
  }
  return "bg-surface-soft text-muted";
}

export function StatusBadge({
  value,
  tone,
  children,
  pulse = false,
}: {
  value?: string;
  tone?: BadgeTone;
  children?: ReactNode;
  pulse?: boolean;
}) {
  const resolvedTone: BadgeTone =
    tone ??
    (value
      ? (value.replace(/_([a-z])/g, (_m, c: string) =>
          c.toUpperCase(),
        ) as BadgeTone)
      : "neutral");
  const text = children ?? value?.replace(/_/g, " ") ?? "";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${toneClass(resolvedTone)}`}
    >
      {pulse ? (
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-full bg-current"
          style={{ animation: "pulse-soft 1.6s ease-in-out infinite" }}
        />
      ) : null}
      {text}
    </span>
  );
}
