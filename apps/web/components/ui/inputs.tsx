import { Check, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function SearchInput({
  className,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-surface px-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15",
        className,
      )}
    >
      <MagnifyingGlass
        size={16}
        weight="regular"
        className="text-muted"
        aria-hidden
      />
      <input
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] text-text outline-none placeholder:text-muted/70"
      />
    </label>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 border-b border-border py-5 last:border-b-0">
      <span className="flex-1">
        <strong className="block text-[13px] font-semibold text-text">
          {label}
        </strong>
        {description ? (
          <span className="mt-1 block text-[12px] leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="block h-6 w-10 rounded-full bg-text/15 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 block size-5 rounded-full bg-bg shadow-[0_1px_2px_rgba(20,20,19,0.2)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-checked:translate-x-4"
        />
      </span>
    </label>
  );
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b border-border py-4 last:border-b-0">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="grid size-[18px] place-items-center rounded-md border border-border bg-surface transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30"
        >
          <Check
            size={12}
            weight="bold"
            className="text-bg opacity-0 transition-opacity peer-checked:opacity-100"
          />
        </span>
      </span>
      <span className="flex-1">
        <strong className="block text-[13px] font-semibold text-text">
          {label}
        </strong>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-soft",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
