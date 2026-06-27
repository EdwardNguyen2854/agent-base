# Ship v0.1.0 as a native Windows distribution without Docker

Agent Base v0.1.0 will treat Windows as the primary Owner platform and macOS as the supported development platform. The Windows distribution will install and manage its required application processes and private PostgreSQL/pgvector runtime without requiring Docker, Node.js, pnpm, PostgreSQL, or pgvector to be installed separately. Docker packaging and native macOS or Linux end-user distributions are deferred, preserving Docker as a possible future delivery option rather than a v0.1.0 prerequisite.
