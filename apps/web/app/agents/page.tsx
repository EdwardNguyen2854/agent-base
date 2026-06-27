import { AgentSettings } from "./agent-settings";

export default function AgentsPage() {
  return (
    <main>
      <p className="eyebrow">Agent Base</p>
      <h1>Agent settings</h1>
      <p className="lede">
        Edit the Agent Draft and publish a new immutable Agent Version when the
        configuration is ready.
      </p>
      <AgentSettings />
    </main>
  );
}
