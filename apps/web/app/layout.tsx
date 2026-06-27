import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DataProvider } from "./data-provider";
import "./styles.css";
import { WorkspaceShell } from "./workspace-shell";

export const metadata: Metadata = {
  title: "Agent Base",
  description: "Local-first, evidence-backed agent research",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DataProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </DataProvider>
      </body>
    </html>
  );
}
