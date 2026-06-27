"use client";

import { useEffect, useState } from "react";

type Health = {
  status: "healthy" | "unhealthy";
  services: Record<string, { status: "healthy" | "unhealthy" }>;
};

export function HealthPanel() {
  const [health, setHealth] = useState<Health>();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const response = await fetch("/api/health", { cache: "no-store" });
      const result = (await response.json()) as Health;
      if (active) setHealth(result);
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section aria-live="polite">
      <h2>Runtime health</h2>
      {health ? (
        <ul>
          {Object.entries(health.services).map(([name, service]) => (
            <li key={name}>
              <span className={service.status} /> {name}: {service.status}
            </li>
          ))}
        </ul>
      ) : (
        <p>Checking…</p>
      )}
    </section>
  );
}
