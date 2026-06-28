import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Panel({
  className,
  children,
  padded = true,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-tile)] border border-border bg-surface",
        "shadow-[var(--shadow-card),var(--shadow-inset-highlight)]",
        padded && "p-6 md:p-8",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Card({
  className,
  children,
  as: As = "div",
  interactive = false,
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "article" | "section" | "a";
  interactive?: boolean;
}) {
  return (
    <As
      className={cn(
        "relative block rounded-[var(--radius-card)] border border-border bg-surface p-7 md:p-8",
        "shadow-[var(--shadow-card),var(--shadow-inset-highlight)]",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:border-text/15",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <hr
      className={cn("border-0 border-t border-border my-6", className)}
      aria-hidden
    />
  );
}

export function Stack({
  gap = 4,
  className,
  children,
}: {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(`flex flex-col gap-${gap}`, className)}>{children}</div>
  );
}
