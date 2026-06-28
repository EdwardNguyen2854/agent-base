import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-tile)] border border-border bg-surface shadow-[var(--shadow-card),var(--shadow-inset-highlight)]",
        className,
      )}
    >
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-soft/50 text-[10px] uppercase tracking-[0.08em] text-muted">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-11 border-b border-border px-5 font-semibold tracking-[0.08em]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors last:border-b-0 hover:bg-accent-soft/50",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  primary,
}: {
  children: ReactNode;
  className?: string;
  primary?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-5 py-3.5 align-middle text-[13px] text-muted",
        primary && "font-semibold text-text",
        className,
      )}
    >
      {children}
    </td>
  );
}
