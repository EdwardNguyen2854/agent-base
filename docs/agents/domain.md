# Domain Docs

This repository uses a single-context domain documentation layout.

## Before exploring

- Read the root `CONTEXT.md` for canonical domain terminology.
- Read relevant decisions under `docs/adr/` before working in an affected area.
- If either is absent, proceed without requiring it to be created first.

## Use the glossary vocabulary

Use terms exactly as defined in `CONTEXT.md` in issues, plans, tests, and implementation. Avoid synonyms that the glossary explicitly rejects.

If a required concept is missing, reconsider whether the concept belongs in the domain or record the gap for domain-modeling work.

## Respect architectural decisions

Surface any conflict with an existing ADR explicitly rather than silently overriding it.
