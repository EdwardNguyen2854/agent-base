import Link from "next/link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="font-serif text-[clamp(72px,12vw,128px)] font-semibold leading-none tracking-tight text-text">
          404
        </p>
        <span aria-hidden className="mt-4 h-px w-24 bg-rule" />
        <h1 className="mt-6 text-display text-[clamp(24px,3vw,36px)]">
          This view isn’t in your workspace.
        </h1>
        <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
          The page you requested does not exist. From here you can return to the
          overview or open a recent project.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" asChild>
            <Link href="/">Return to overview</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/projects">Open projects</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
