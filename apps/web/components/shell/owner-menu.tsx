"use client";

import {
  CaretDown,
  Gear,
  Key,
  Question,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export function OwnerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface pl-1.5 pr-2 text-[12px] font-semibold text-text transition-colors hover:border-text/20",
          open && "border-text/25",
        )}
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-lg bg-accent-soft text-[10px] font-bold tracking-wider text-accent-hover"
        >
          OW
        </span>
        <span className="hidden sm:inline">Owner</span>
        <CaretDown size={12} weight="bold" className="text-muted" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[230px] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[0_18px_50px_rgba(20,20,19,0.18)]"
        >
          <Link
            href="/settings/credentials"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-text hover:bg-accent-soft hover:text-accent-hover"
          >
            <Key size={16} weight="regular" />
            Credentials
          </Link>
          <Link
            href="/settings/system"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-text hover:bg-accent-soft hover:text-accent-hover"
          >
            <Gear size={16} weight="regular" />
            System
          </Link>
          <hr className="my-1 border-border" />
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-text hover:bg-accent-soft hover:text-accent-hover"
          >
            <Question size={16} weight="regular" />
            Help & docs
          </a>
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
  );
}
