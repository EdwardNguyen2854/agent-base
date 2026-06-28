"use client";

import {
  ArrowRight,
  Check,
  CircleNotch,
  Key,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useData } from "../../app/data-provider";
import { Reveal, Stagger, StaggerItem } from "../../components/motion/reveal";
import { BrandMark } from "../../components/shell/global-header";
import { Button } from "../../components/ui/button";
import { TextField } from "../../components/ui/field";
import { Card } from "../../components/ui/surfaces";

export function SetupView() {
  const [, source] = useData();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [minimax, setMinimax] = useState("");
  const [tavily, setTavily] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = (event: FormEvent) => {
    event.preventDefault();
    if (minimax.length < 6 || tavily.length < 6) {
      setError("Each key needs at least 6 characters.");
      return;
    }
    setError(null);
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      source.completeSetup({ MiniMax: minimax, Tavily: tavily });
      setStep(3);
    }, 700);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(900px 480px at 12% 18%, rgba(79,122,74,0.12), transparent 60%), radial-gradient(700px 520px at 88% 92%, rgba(20,20,19,0.06), transparent 60%)",
        }}
      />
      <header className="relative flex h-16 items-center px-6 md:px-10">
        <div className="flex items-center gap-2.5 font-semibold">
          <BrandMark />
          <span className="text-[15px] tracking-tight text-text">
            Agent Base
          </span>
          <span className="ml-2 hidden rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted sm:inline">
            Interactive demo
          </span>
        </div>
      </header>
      <main className="container-page relative grid grid-cols-12 gap-10 pb-20 pt-6 md:pt-10">
        <div className="col-span-12 lg:col-span-7">
          <Reveal>
            <Stepper step={step} />
          </Reveal>
          <Reveal delay={0.05}>
            <Card className="mt-8 p-8 md:p-12">
              {step === 1 ? <StepOne onNext={() => setStep(2)} /> : null}
              {step === 2 ? (
                <StepTwo
                  minimax={minimax}
                  tavily={tavily}
                  setMinimax={setMinimax}
                  setTavily={setTavily}
                  validating={validating}
                  error={error}
                  onBack={() => setStep(1)}
                  onSubmit={next}
                />
              ) : null}
              {step === 3 ? (
                <StepThree onOpen={() => router.push("/")} />
              ) : null}
            </Card>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Local-first · Single Owner · No telemetry
            </p>
          </Reveal>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Reveal delay={0.15}>
            <EvidencePanel step={step} />
          </Reveal>
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = [
    { n: 1, label: "Welcome" },
    { n: 2, label: "Connect" },
    { n: 3, label: "Launch" },
  ];
  return (
    <ol className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-3">
          <span
            className={`grid size-7 place-items-center rounded-full border ${
              step >= s.n
                ? "border-accent bg-accent text-bg"
                : "border-border bg-surface text-muted"
            } text-[11px] font-bold transition-colors`}
          >
            {step > s.n ? <Check size={12} weight="bold" /> : s.n}
          </span>
          <span
            className={step >= s.n ? "text-text" : ""}
            aria-current={step === s.n ? "step" : undefined}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className="ml-1 hidden h-px w-12 bg-rule sm:inline-block"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function StepOne({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-hover">
        <Sparkle size={22} weight="regular" />
      </span>
      <p className="text-eyebrow mt-6">Welcome to Agent Base</p>
      <h1 className="text-display mt-2 text-[clamp(34px,5vw,48px)]">
        Run research you can read end-to-end.
      </h1>
      <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted">
        Every claim traces to an excerpt. Every run is immutable. You approve
        every plan before it touches the web.
      </p>
      <Stagger className="mt-7 space-y-3" gap={0.05}>
        {[
          {
            icon: <ShieldCheck size={16} weight="regular" />,
            label: "Uploaded and public evidence",
          },
          {
            icon: <Key size={16} weight="regular" />,
            label: "Immutable Run history",
          },
          {
            icon: <Sparkle size={16} weight="regular" />,
            label: "Citation-level inspection",
          },
        ].map((item) => (
          <StaggerItem key={item.label}>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft/30 px-4 py-3 text-[13.5px] font-semibold text-text">
              <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent-hover">
                {item.icon}
              </span>
              {item.label}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          variant="primary"
          onClick={onNext}
          trailing={<ArrowRight size={16} weight="bold" />}
        >
          Set up providers
        </Button>
        <Button size="lg" variant="ghost" onClick={() => window.history.back()}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function StepTwo({
  minimax,
  tavily,
  setMinimax,
  setTavily,
  validating,
  error,
  onBack,
  onSubmit,
}: {
  minimax: string;
  tavily: string;
  setMinimax: (value: string) => void;
  setTavily: (value: string) => void;
  validating: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <p className="text-eyebrow">Provider setup</p>
      <h1 className="text-display mt-2 text-[clamp(28px,4vw,40px)]">
        Connect research services
      </h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
        In this demo, validation is simulated and only masked metadata is
        retained.
      </p>

      <div className="mt-8 space-y-5">
        <TextField
          label="MiniMax API key"
          type="password"
          autoComplete="off"
          value={minimax}
          onChange={(event) => setMinimax(event.target.value)}
          placeholder="sk-…"
          hint="Stored only as masked metadata."
        />
        <TextField
          label="Tavily API key"
          type="password"
          autoComplete="off"
          value={tavily}
          onChange={(event) => setTavily(event.target.value)}
          placeholder="tvly-…"
          hint="Used for public-web discovery."
        />
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[12.5px] font-semibold text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} type="button">
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={validating || minimax.length < 6 || tavily.length < 6}
          icon={
            validating ? (
              <CircleNotch size={14} weight="bold" className="animate-spin" />
            ) : undefined
          }
          trailing={
            !validating ? <ArrowRight size={14} weight="bold" /> : undefined
          }
        >
          {validating ? "Validating" : "Validate & continue"}
        </Button>
      </div>
    </form>
  );
}

function StepThree({ onOpen }: { onOpen: () => void }) {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-hover">
        <Check size={24} weight="bold" />
      </span>
      <p className="text-eyebrow mt-6">Setup complete</p>
      <h1 className="text-display mt-2 text-[clamp(34px,5vw,48px)]">
        Your research workspace is ready.
      </h1>
      <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted">
        A general research Agent and a sample workspace have been prepared.
        Replace demo data any time from System settings.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          variant="primary"
          onClick={onOpen}
          trailing={<ArrowRight size={16} weight="bold" />}
        >
          Open Agent Base
        </Button>
      </div>
    </div>
  );
}

function EvidencePanel({ step }: { step: number }) {
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-border bg-text p-8 text-bg shadow-[var(--shadow-card)] md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(600px 380px at 20% 90%, rgba(79,122,74,0.55), transparent 60%)",
        }}
      />
      <div className="relative flex h-full flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft">
          Why Agent Base
        </p>
        <h2 className="mt-3 text-[clamp(22px,2.6vw,30px)] font-semibold tracking-tight">
          Evidence you can follow.
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-bg/70">
          Every factual block is bound to a retained excerpt. Every Run is
          immutable. Every Plan waits for your approval.
        </p>
        <div className="mt-auto pt-10">
          <EvidenceDiagram step={step} />
        </div>
      </div>
    </div>
  );
}

function EvidenceDiagram({ step }: { step: number }) {
  return (
    <svg
      viewBox="0 0 320 220"
      className="h-auto w-full"
      role="img"
      aria-label="Evidence flow diagram"
    >
      <defs>
        <linearGradient id="node" x1="0" x2="1">
          <stop offset="0%" stopColor="#4f7a4a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4f7a4a" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1">
        <path d="M40 30 L40 100 L160 160 L280 100 L280 30" />
        <path d="M40 100 L160 30 L280 100" />
        <path d="M40 100 L160 160" />
      </g>
      {[
        { x: 40, y: 30, label: "Sources" },
        { x: 280, y: 30, label: "Agent" },
        { x: 160, y: 160, label: "Excerpts" },
        { x: 160, y: 30, label: "Task" },
        { x: 40, y: 100, label: "Plan" },
        { x: 280, y: 100, label: "Report" },
      ].map((n, i) => (
        <g key={n.label}>
          <circle
            cx={n.x}
            cy={n.y}
            r={step > i / 2 || step === 3 ? 12 : 8}
            fill="url(#node)"
            opacity={step > i / 2 || step === 3 ? 1 : 0.4}
          />
          <text
            x={n.x}
            y={n.y + 28}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="rgba(255,255,255,0.65)"
            letterSpacing="0.04em"
          >
            {n.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
