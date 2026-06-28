import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import type { ReactNode } from "react";
import { DataProvider } from "./data-provider";
import "./globals.css";
import { WorkspaceShell } from "./workspace-shell";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Agent Base",
  description: "Run research you can read end-to-end.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${lora.variable}`}
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.toggle("dark",localStorage.getItem("theme")==="dark"||(!localStorage.getItem("theme")&&matchMedia("(prefers-color-scheme:dark)").matches))`,
          }}
        />
        <DataProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </DataProvider>
      </body>
    </html>
  );
}
