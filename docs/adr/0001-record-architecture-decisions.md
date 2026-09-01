# 0001. Record architecture decisions

- **Status:** accepted
- **Date:** 2026-09-01

## Context

This is a portfolio project meant to demonstrate engineering judgement, not just output.
Reviewers will want to know _why_ choices were made, and a future me will want the same.

## Decision

Keep lightweight Architecture Decision Records in `docs/adr/`, one Markdown file per
decision, numbered sequentially, following the template in `0000-template.md`. Format
adapted from Michael Nygard's ADR pattern.

## Consequences

- Every non-trivial technical choice has a durable rationale linked from its PR.
- Small ongoing cost: a few minutes per decision.
- Superseded ADRs stay in the tree with a pointer to the replacement rather than being
  deleted, so the history of thinking is preserved.
