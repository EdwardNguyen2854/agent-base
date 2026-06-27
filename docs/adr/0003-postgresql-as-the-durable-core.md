# Use PostgreSQL as the durable core

PostgreSQL with pgvector will own application state, Run events, job coordination, lexical retrieval, and vector retrieval, with `pg-boss` providing the queue. This avoids operating Redis and a separate vector database in the local release while preserving transactional checkpoints; file bytes remain behind a Blob Store boundary with a local filesystem implementation so object storage can replace it later.
