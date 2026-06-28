"use client";

import { ArrowClockwise, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "../components/ui/button";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="container-page py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-[1.75rem] border border-border bg-surface p-10 text-center shadow-[var(--shadow-card),var(--shadow-inset-highlight)]">
        <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <Warning size={26} weight="regular" />
        </span>
        <h1 className="mt-5 text-display text-[clamp(28px,4vw,40px)]">
          Agent Base couldn’t load this view.
        </h1>
        <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
          Your browser data is unchanged. Retry the view, or reset the demo data
          from System settings.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="primary"
            onClick={reset}
            icon={<ArrowClockwise size={14} weight="bold" />}
          >
            Retry
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/settings/system">Open System settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
