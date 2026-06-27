"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <AlertTriangle />
      <h2>Agent Base couldn’t load this view</h2>
      <p>
        Your browser data is unchanged. Retry the view or reset demo data from
        System settings.
      </p>
      <button className="button primary" type="button" onClick={reset}>
        <RefreshCw /> Retry
      </button>
    </div>
  );
}
