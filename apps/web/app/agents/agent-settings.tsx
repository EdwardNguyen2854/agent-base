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
      <section>
        <h2>Agent</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }
  if (!state) {
    return (
      <section>
        <h2>Agent</h2>
        <p>Loading…</p>
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
    <section>
      <h2>{initialState.agent.name} Agent</h2>
      <p>
        Edit the draft and publish a new immutable version when the
        configuration is ready.
      </p>
      <DraftForm
        draft={draft}
        onChange={setDraft}
        disabled={pending !== undefined}
      />
      <p>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={pending !== undefined}
        >
          {pending === "save" ? "Saving…" : "Save draft"}
        </button>{" "}
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={pending !== undefined}
        >
          {pending === "publish" ? "Publishing…" : "Publish version"}
        </button>
      </p>
      {status ? <output>{status}</output> : null}
      {limitError ? (
        <p role="alert" className="unhealthy">
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
    <form onSubmit={(event) => event.preventDefault()}>
      <p>
        <label>
          Purpose
          <textarea
            value={draft.purpose}
            disabled={disabled}
            onChange={(event) => update("purpose", event.target.value)}
            rows={3}
          />
        </label>
      </p>
      <p>
        <label>
          Instructions
          <textarea
            value={draft.instructions}
            disabled={disabled}
            onChange={(event) => update("instructions", event.target.value)}
            rows={4}
          />
        </label>
      </p>
      <p>
        <label>
          Research method
          <textarea
            value={draft.researchMethod}
            disabled={disabled}
            onChange={(event) => update("researchMethod", event.target.value)}
            rows={4}
          />
        </label>
      </p>
      <p>
        <label>
          Report requirements
          <textarea
            value={draft.reportRequirements}
            disabled={disabled}
            onChange={(event) =>
              update("reportRequirements", event.target.value)
            }
            rows={4}
          />
        </label>
      </p>
      <fieldset disabled={disabled}>
        <legend>Evidence permissions</legend>
        <label>
          <input
            type="checkbox"
            checked={draft.evidencePermissions.webSearch}
            onChange={(event) =>
              onChange({
                ...draft,
                evidencePermissions: { webSearch: event.target.checked },
              })
            }
          />{" "}
          Allow public web research during Runs
        </label>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend>Effective Run limits</legend>
        <p>
          Platform maximums — model turns {PLATFORM_LIMITS.modelTurns}, Tavily
          searches {PLATFORM_LIMITS.tavilySearches}, page fetches{" "}
          {PLATFORM_LIMITS.pageFetches}, active minutes{" "}
          {PLATFORM_LIMITS.activeMinutes}.
        </p>
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
    <p>
      <label>
        {label}
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
        />
      </label>
    </p>
  );
}

function VersionHistory({ versions }: { versions: Version[] }) {
  if (versions.length === 0) {
    return (
      <section>
        <h3>Published versions</h3>
        <p>No versions have been published yet.</p>
      </section>
    );
  }
  return (
    <section>
      <h3>Published versions</h3>
      <ol>
        {versions.map((version) => (
          <li key={version.number}>
            <strong>v{version.number}</strong>
            <p>Purpose: {version.purpose}</p>
            <p>
              Limits: {version.limits.modelTurns} model turns ·{" "}
              {version.limits.tavilySearches} searches ·{" "}
              {version.limits.pageFetches} page fetches ·{" "}
              {version.limits.activeMinutes} min
            </p>
            <p>
              Published <time dateTime={version.publishedAt}>earlier</time>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
