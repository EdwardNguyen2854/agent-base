"use client";

import {
  ArrowRight,
  CheckCircle,
  Database,
  Gear,
  HardDrive,
  Key,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ChangeEvent, useEffect, useState } from "react";
import { useData } from "../../app/data-provider";
import { cn, formatDate } from "../../lib/utils";
import {
  fetchCredentialStatuses,
  replaceCredentialViaApi,
} from "../../lib/api-client";
import type { Credential } from "../../lib/frontend-data";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "../ui/dialog";
import { TextField } from "../ui/field";
import { PageHeader } from "../ui/page";
import { Toast } from "../ui/states";
import { StatusBadge } from "../ui/status-badge";
import { Panel } from "../ui/surfaces";

export function CredentialsView() {
  const [state, source] = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [apiCredentials, setApiCredentials] = useState<
    Credential[] | undefined
  >(undefined);

  useEffect(() => {
    fetchCredentialStatuses().then((apiStatuses) => {
      if (!apiStatuses) return;
      const mapped: Credential[] = apiStatuses.map((s) => ({
        provider: s.provider as Credential["provider"],
        configured: s.configured,
        hint: s.hint,
        validatedAt: s.validatedAt ?? undefined,
        status: s.status as Credential["status"],
      }));
      setApiCredentials(mapped);
    });
  }, []);

  const displayCredentials = apiCredentials ?? state.credentials;

  return (
    <div className="space-y-10">
      <Reveal>
        <PageHeader
          eyebrow="Settings"
          title="Credentials"
          description="Provider secrets are validated, stored securely, and never returned after entry."
        />
        <SettingsNav />
      </Reveal>

      <Reveal>
        <div className="container-page">
          <Panel>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-eyebrow">Model and search providers</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Agent Base v0.1 uses fixed MiniMax and Tavily providers.
                </p>
              </div>
            </div>
            <Stagger className="mt-2" gap={0.04}>
              {displayCredentials.map((credential) => (
                <StaggerItem key={credential.provider}>
                  <div className="flex items-center gap-4 border-b border-border py-5 last:border-b-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
                      <Key size={18} weight="regular" />
                    </span>
                    <div className="flex-1">
                      <strong className="block text-[14px] font-semibold text-text">
                        {credential.provider}
                      </strong>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {credential.configured
                          ? credential.hint
                          : "Not configured"}{" "}
                        ·{" "}
                        {credential.validatedAt
                          ? `Validated ${formatDate(credential.validatedAt)}`
                          : "Validation required"}
                      </span>
                    </div>
                    <StatusBadge value={credential.status} />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditing(credential.provider);
                        setSecret("");
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <div className="flex items-start gap-3 rounded-2xl border border-accent-soft bg-accent-soft/60 px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-hover">
              <ShieldCheck size={18} weight="regular" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-text">
                Secrets stay secret
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Entered values are cleared from the form immediately. The demo
                stores metadata only, never the credential itself.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent
          title={`Replace ${editing ?? ""} credential`}
          description="Validation uses a stub in development. Production validates against the provider."
        >
          <TextField
            label={`${editing ?? "Provider"} API key`}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Paste a new key"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="primary"
              disabled={secret.length < 6}
              onClick={async () => {
                if (!editing) return;
                const apiResult = await replaceCredentialViaApi(
                  editing,
                  secret,
                );
                if (apiResult.ok) {
                  const updated = await fetchCredentialStatuses();
                  if (updated) {
                    setApiCredentials(
                      updated.map((s) => ({
                        provider: s.provider as Credential["provider"],
                        configured: s.configured,
                        hint: s.hint,
                        validatedAt: s.validatedAt ?? undefined,
                        status: s.status as Credential["status"],
                      })),
                    );
                  }
                  setSecret("");
                  setEditing(null);
                  setMessage(`${editing} credential validated and replaced.`);
                } else if (apiResult.reachable) {
                  setMessage(apiResult.error);
                } else {
                  source.replaceCredential(
                    editing as "MiniMax" | "Tavily",
                    secret,
                  );
                  setSecret("");
                  setEditing(null);
                  setMessage(`${editing} credential validated and replaced.`);
                }
              }}
            >
              Validate & replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {message ? (
        <Toast message={message} onDismiss={() => setMessage(null)} />
      ) : null}
    </div>
  );
}

export function SystemView() {
  const [state, source] = useData();
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const backup = () => {
    const url = URL.createObjectURL(
      new Blob([source.exportBackup()], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agent-base-demo-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup snapshot exported.");
  };

  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      source.restoreBackup(await file.text());
      setToast("Backup restored successfully.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Restore failed.");
    }
  };

  return (
    <div className="space-y-10">
      <Reveal>
        <PageHeader
          eyebrow="Settings"
          title="System"
          description="Inspect health, manage local data, and simulate installed operations."
        />
        <SettingsNav />
      </Reveal>

      <Reveal>
        <div className="container-page">
          <Stagger className="grid grid-cols-12 gap-4 md:gap-5" gap={0.05}>
            <StaggerItem className="col-span-12 sm:col-span-6 lg:col-span-4">
              <SystemMetric
                icon={<CheckCircle size={18} weight="regular" />}
                label="Health"
                value="Healthy"
                caption="Web, worker, database"
                tone="ok"
              />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-4">
              <SystemMetric
                icon={<HardDrive size={18} weight="regular" />}
                label="Storage"
                value={`${state.system.storageUsed} GB`}
                caption={`of ${state.system.storageLimit} GB used`}
              />
            </StaggerItem>
            <StaggerItem className="col-span-6 sm:col-span-3 lg:col-span-4">
              <SystemMetric
                icon={<Database size={18} weight="regular" />}
                label="Version"
                value={state.system.version}
                caption="Installed version"
              />
            </StaggerItem>
          </Stagger>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <Panel>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-eyebrow">Operations</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Backup, restore, and verify the local installation.
                </p>
              </div>
            </div>
            <OperationRow
              title="Backup workspace"
              body="Export the complete demo state as a portable JSON snapshot."
              action={
                <Button
                  variant="secondary"
                  onClick={backup}
                  icon={<ArrowRight size={14} weight="bold" />}
                >
                  Create backup
                </Button>
              }
            />
            <OperationRow
              title="Restore workspace"
              body="Validate and restore a previously exported demo snapshot."
              action={
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[13px] font-semibold text-text hover:bg-surface-soft">
                  Restore backup
                  <input
                    className="sr-only"
                    type="file"
                    accept="application/json"
                    onChange={restore}
                  />
                </label>
              }
            />
            <OperationRow
              title="Database migrations"
              body="Schema is current. No pending migrations."
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    setToast("Migration check completed. Schema is current.")
                  }
                >
                  Check now
                </Button>
              }
            />
            <OperationRow
              title="Software update"
              body="Agent Base 0.1.0-demo is the latest available version."
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    setToast("Update check completed. You're current.")
                  }
                >
                  Check for updates
                </Button>
              }
            />
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <div className="container-page">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-danger/20 bg-danger-soft p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-danger">
                Reset demo data
              </p>
              <p className="mt-1 text-[12.5px] text-danger/80">
                Restore the deterministic populated workspace. This affects only
                this browser.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset demo
            </Button>
          </div>
        </div>
      </Reveal>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent
          title="Reset demo data?"
          description="This will replace all projects, tasks, runs, and reports with the deterministic seeded state."
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                source.reset();
                setToast("Demo data reset.");
                setConfirmReset(false);
              }}
            >
              Reset demo data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast ? (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function SettingsNav() {
  const path = usePathname();
  const tabs = [
    { href: "/settings/credentials", label: "Credentials", icon: Key },
    { href: "/settings/system", label: "System", icon: Gear },
  ];
  return (
    <div className="container-page">
      <nav
        aria-label="Settings"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-[var(--shadow-card),var(--shadow-inset-highlight)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = path === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[12.5px] font-semibold transition-colors",
                active
                  ? "bg-accent-soft text-accent-hover"
                  : "text-muted hover:bg-surface-soft hover:text-text",
              )}
            >
              <Icon size={14} weight="regular" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SystemMetric({
  icon,
  label,
  value,
  caption,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  tone?: "neutral" | "ok";
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-card),var(--shadow-inset-highlight)]">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          tone === "ok"
            ? "bg-accent-soft text-accent-hover"
            : "bg-surface-soft text-muted",
        )}
      >
        {icon}
      </span>
      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[24px] font-semibold tracking-tight text-text">
        {value}
      </p>
      <p className="mt-1 text-[12px] text-muted">{caption}</p>
    </div>
  );
}

function OperationRow({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[14px] font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
