import Link from "next/link";
import { HealthPanel } from "./health-panel";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Agent Base</p>
      <h1>Your local research workspace is running.</h1>
      <p className="lede">
        This installation is restricted to this computer. Runtime health is
        shown below.
      </p>
      <HealthPanel />
      <p>
        <Link href="/agents">Open Agent settings</Link>
      </p>
    </main>
  );
}
