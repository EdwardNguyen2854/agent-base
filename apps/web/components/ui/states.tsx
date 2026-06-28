import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block rounded-md bg-surface-soft",
        "bg-[linear-gradient(90deg,var(--color-surface-soft)_20%,var(--color-bg)_50%,var(--color-surface-soft)_80%)] bg-[length:200%_100%] bg-no-repeat",
        "[animation:shimmer_1.6s_linear_infinite]",
        className,
      )}
      aria-hidden
    />
  );
}

export const SkeletonBlock = forwardRef<
  HTMLDivElement,
  { className?: string; children?: ReactNode }
>(({ className, children }, ref) => (
  <div ref={ref} className={cn("space-y-3", className)}>
    {children}
  </div>
));
SkeletonBlock.displayName = "SkeletonBlock";

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
    <div className="grid place-items-center rounded-[var(--radius-tile)] border border-dashed border-border bg-surface-soft/40 px-6 py-16 text-center">
      {icon ? (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl border border-border bg-surface text-muted">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[18px] font-semibold tracking-tight text-text">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Toast({
  message,
  onDismiss,
  variant = "success",
}: {
  message: string;
  onDismiss?: () => void;
  variant?: "success" | "info" | "warn" | "danger";
}) {
  const variantClass: Record<typeof variant, string> = {
    success: "border-accent-soft bg-surface text-accent-hover",
    info: "border-purple/20 bg-surface text-purple",
    warn: "border-warning/20 bg-surface text-warning",
    danger: "border-danger/20 bg-surface text-danger",
  };
  return (
    <output
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_36px_rgba(20,20,19,0.18)]",
        variantClass[variant],
      )}
    >
      <span className="text-[13px] font-semibold">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-md p-1 text-current/70 transition-colors hover:bg-current/10"
        >
          ×
        </button>
      ) : null}
    </output>
  );
}
