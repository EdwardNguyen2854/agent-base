## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues, and external pull requests are also a triage surface. See `docs/agents/issue-tracker.md`.

### Working on issues

Before starting work on an issue, ask the user whether they want a dedicated Git worktree or the current worktree.

Always work on a branch when implementing, fixing, or otherwise modifying code for an issue. Do not commit directly to `main`. Create a branch (typically named after the issue or scope of work), do the work there, and merge via the normal review flow.

### Parallel AI sessions

For parallel AI coding work:

1 AI session = 1 branch = 1 worktree folder

Do not let multiple agents edit same working directory.

Use Git worktree when running many sessions on same repo:

git worktree add ../project-issue-123 issue-123

Before work:

git branch --show-current
git status

Never work on main. Commit on the session branch, then merge via normal review flow.

After merge:

git worktree remove ../project-issue-123

### Triage labels

Use the canonical `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain documentation layout. See `docs/agents/domain.md`.
