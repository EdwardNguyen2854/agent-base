import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      <SearchX />
      <h1>Page not found</h1>
      <p>The requested Agent Base view does not exist.</p>
      <Link className="button primary" href="/">
        Return to Overview
      </Link>
    </div>
  );
}
