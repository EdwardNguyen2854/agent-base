"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { CommandPalette } from "../components/shell/command-palette";
import { ContextSidebar } from "../components/shell/context-sidebar";
import { GlobalHeader, MobileDrawer } from "../components/shell/global-header";
import { useData } from "./data-provider";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [state] = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = usePathname();

  if (path === "/setup") return <>{children}</>;

  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <GlobalHeader
        workspaceName={state.workspace.name}
        onOpenMobile={() => setMobileOpen(true)}
      />
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        workspaceName={state.workspace.name}
      />
      <div className="flex w-full">
        <ContextSidebar state={state} />
        <main
          id="main-content"
          className="min-w-0 flex-1 pb-24"
        >
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
