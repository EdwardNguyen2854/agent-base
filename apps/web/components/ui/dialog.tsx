"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  title,
  description,
  size = "md",
  className,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const widths: Record<"sm" | "md" | "lg", string> = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
  };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-text/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[201] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border border-border bg-surface p-7 shadow-[0_24px_80px_rgba(20,20,19,0.24)] focus:outline-none",
          widths[size],
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-[20px] font-semibold tracking-tight text-text">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            className="-m-1 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-soft hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
      {children}
    </div>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-text/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-[201] w-[min(460px,92vw)] overflow-y-auto rounded-l-[1.5rem] border-l border-border bg-surface p-8 shadow-[-24px_0_60px_rgba(20,20,19,0.16)] focus:outline-none",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title ?? "Drawer"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-5 top-5 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-soft hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
