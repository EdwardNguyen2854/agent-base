import { AgentsView } from "../route-view";
import { AgentSettings } from "./agent-settings";

export default function AgentsPage() {
  return (
    <>
      <AgentsView />
      <details className="api-compatibility">
        <summary>Backend Agent settings</summary>
        <AgentSettings />
      </details>
    </>
  );
}
