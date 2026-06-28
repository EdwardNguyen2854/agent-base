"use client";

import { useCallback, useEffect, useState } from "react";

type Limits = {
  modelTurns: number;
  tavilySearches: number;
  pageFetches: number;
  activeMinutes: number;
};

type Draft = {
  purpose: string;
  instructions: string;
  researchMethod: string;
  reportRequirements: string;
  evidencePermissions: { webSearch: boolean };
  limits: Limits;
  updatedAt: string;
};

type Version = {
  number: number;
  purpose: string;
  instructions: string;
  researchMethod: string;
  reportRequirements: string;
  evidencePermissions: { webSearch: boolean };
  limits: Limits;
  publishedAt: string;
  publishedBy: string;
};

type AgentState = {
  agent: { id: string; workspaceId: string; name: string };
  draft: Draft;
  versions: Version[];
};

const PLATFORM_LIMITS: Limits = {
  modelTurns: 20,
  tavilySearches: 10,
  pageFetches: 30,
  activeMinutes: 15,
};

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-[13px] font-semibold transition-colors";

export function AgentSettings() {
  const [state, setState] = useState<AgentState | undefined>();
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/agent", { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as
      | AgentState
      | { error?: string };
    if (!response.ok || !("agent" in body)) {
      const message =
        "error" in body && body.error
          ? body.error
          : "Agent Base could not load the Agent.";
      setError(message);
      return;
    }
    setState(body);
    setError(undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <section className="container-page space-y-2">
        <h2 className="text-[18px] font-semibold tracking-tight text-text">
          Agent
        </h2>
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-semibold text-danger"
        >
          {error}
        </p>
      </section>
    );
  }
  if (!state) {
    return (
      <section className="container-page space-y-2">
        <h2 className="text-[18px] font-semibold tracking-tight text-text">
          Agent
        </h2>
        <p className="text-[13px] text-muted">Loading…</p>
      </section>
    );
  }
  return <AgentEditor initialState={state} onChange={refresh} />;
}

function AgentEditor({
  initialState,
  onChange,
}: {
  initialState: AgentState;
  onChange: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(initialState.draft);
  const [versions, setVersions] = useState<Version[]>(initialState.versions);
  const [status, setStatus] = useState<string | undefined>();
  const [limitError, setLimitError] = useState<string | undefined>();
  const [pending, setPending] = useState<"save" | "publish" | undefined>();

  const handleSave = async () => {
    setPending("save");
    setStatus(undefined);
    setLimitError(undefined);
    const response = await fetch("/api/agent", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purpose: draft.purpose,
        instructions: draft.instructions,
        researchMethod: draft.researchMethod,
        reportRequirements: draft.reportRequirements,
        evidencePermissions: draft.evidencePermissions,
        limits: draft.limits,
      }),
    });
    setPending(undefined);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (response.status === 422) {
        setLimitError(body.error ?? "Draft limits exceed platform maximums");
      } else {
        setStatus(body.error ?? "Could not save the draft");
      }
      return;
    }
    setStatus("Draft saved.");
    await onChange();
  };

  const handlePublish = async () => {
    setPending("publish");
    setStatus(undefined);
    setLimitError(undefined);
    const response = await fetch("/api/agent/versions", { method: "POST" });
    setPending(undefined);
    const body = (await response.json().catch(() => ({}))) as
      | { version: Version }
      | { error?: string };
    if (!response.ok) {
      if (response.status === 422) {
        const message = "error" in body ? body.error : undefined;
        setLimitError(message ?? "Draft limits exceed platform maximums");
      } else {
        const message = "error" in body ? body.error : undefined;
        setStatus(message ?? "Could not publish the version");
      }
      return;
    }
    if ("version" in body) {
      setVersions((current) => [...current, body.version]);
    }
    setStatus("Version published.");
    await onChange();
  };

  return (
    <section className="container-page space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-text">
          {initialState.agent.name} Agent
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Edit the draft and publish a new immutable version when the
          configuration is ready.
        </p>
      </div>
      <DraftForm
        draft={draft}
        onChange={setDraft}
        disabled={pending !== undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={pending !== undefined}
          className={`${buttonClass} bg-surface text-text border border-border hover:bg-surface-soft disabled:opacity-50`}
        >
          {pending === "save" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={pending !== undefined}
          className={`${buttonClass} bg-text text-bg hover:bg-text disabled:opacity-50`}
        >
          {pending === "publish" ? "Publishing…" : "Publish version"}
        </button>
      </div>
      {status ? (
        <p className="rounded-xl border border-accent-soft bg-accent-soft/60 px-4 py-2 text-[12.5px] font-semibold text-accent-hover">
          {status}
        </p>
      ) : null}
      {limitError ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-2 text-[12.5px] font-semibold text-danger"
        >
          {limitError}
        </p>
      ) : null}
      <VersionHistory versions={versions} />
    </section>
  );
}

function DraftForm({
  draft,
  onChange,
  disabled,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  disabled: boolean;
}) {
  const update = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-text">Purpose</span>
        <textarea
          className={`${inputClass} resize-y leading-relaxed`}
          value={draft.purpose}
          disabled={disabled}
          onChange={(event) => update("purpose", event.target.value)}
          rows={3}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-text">
          Instructions
        </span>
        <textarea
          className={`${inputClass} resize-y leading-relaxed`}
          value={draft.instructions}
          disabled={disabled}
          onChange={(event) => update("instructions", event.target.value)}
          rows={4}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-text">
          Research method
        </span>
        <textarea
          className={`${inputClass} resize-y leading-relaxed`}
          value={draft.researchMethod}
          disabled={disabled}
          onChange={(event) => update("researchMethod", event.target.value)}
          rows={4}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-text">
          Report requirements
        </span>
        <textarea
          className={`${inputClass} resize-y leading-relaxed`}
          value={draft.reportRequirements}
          disabled={disabled}
          onChange={(event) => update("reportRequirements", event.target.value)}
          rows={4}
        />
      </label>
      <fieldset
        disabled={disabled}
        className="rounded-2xl border border-border p-4"
      >
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Evidence permissions
        </legend>
        <label className="flex items-center gap-2 text-[13px] text-text">
          <input
            type="checkbox"
            checked={draft.evidencePermissions.webSearch}
            onChange={(event) =>
              onChange({
                ...draft,
                evidencePermissions: { webSearch: event.target.checked },
              })
            }
            className="size-4 accent-[#4f7a4a]"
          />
          Allow public web research during Runs
        </label>
      </fieldset>
      <fieldset
        disabled={disabled}
        className="rounded-2xl border border-border p-4"
      >
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Effective Run limits
        </legend>
        <p className="text-[12px] text-muted">
          Platform maximums — model turns {PLATFORM_LIMITS.modelTurns}, Tavily
          searches {PLATFORM_LIMITS.tavilySearches}, page fetches{" "}
          {PLATFORM_LIMITS.pageFetches}, active minutes{" "}
          {PLATFORM_LIMITS.activeMinutes}.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <LimitField
            label="Model turns"
            field="modelTurns"
            value={draft.limits.modelTurns}
            onChange={(value) =>
              onChange({
                ...draft,
                limits: { ...draft.limits, modelTurns: value },
              })
            }
          />
          <LimitField
            label="Tavily searches"
            field="tavilySearches"
            value={draft.limits.tavilySearches}
            onChange={(value) =>
              onChange({
                ...draft,
                limits: { ...draft.limits, tavilySearches: value },
              })
            }
          />
          <LimitField
            label="Page fetches"
            field="pageFetches"
            value={draft.limits.pageFetches}
            onChange={(value) =>
              onChange({
                ...draft,
                limits: { ...draft.limits, pageFetches: value },
              })
            }
          />
          <LimitField
            label="Active minutes"
            field="activeMinutes"
            value={draft.limits.activeMinutes}
            onChange={(value) =>
              onChange({
                ...draft,
                limits: { ...draft.limits, activeMinutes: value },
              })
            }
          />
        </div>
      </fieldset>
    </form>
  );
}

function LimitField({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: keyof Limits;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[12px] font-semibold text-text">{label}</span>
      <input
        type="number"
        name={field}
        min={1}
        max={PLATFORM_LIMITS[field]}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className={inputClass}
      />
    </label>
  );
}

function VersionHistory({ versions }: { versions: Version[] }) {
  if (versions.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-[14px] font-semibold text-text">
          Published versions
        </h3>
        <p className="mt-1 text-[12.5px] text-muted">
          No versions have been published yet.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-[14px] font-semibold text-text">Published versions</h3>
      <ol className="mt-3 space-y-2">
        {versions.map((version) => (
          <li
            key={version.number}
            className="rounded-xl border border-border bg-surface-soft/40 p-3 text-[13px]"
          >
            <strong className="font-semibold text-text">
              v{version.number}
            </strong>
            <p className="mt-1 text-muted">Purpose: {version.purpose}</p>
            <p className="mt-1 text-muted">
              Limits: {version.limits.modelTurns} model turns ·{" "}
              {version.limits.tavilySearches} searches ·{" "}
              {version.limits.pageFetches} page fetches ·{" "}
              {version.limits.activeMinutes} min
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
