# Contributing

## Workflow

- **One branch per roadmap phase**, named as in the README table (`feat/…`, `chore/…`, `fix/…`).
- Small, focused commits. Each commit should build and pass `pnpm validate`.
- Open a PR into `main`. CI must be green. Squash-merge with a Conventional Commit title.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` on `commit-msg`.

```
<type>(<optional scope>): <summary>

<optional body>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.

Examples:

```
feat(queue): add enter/leave queue server actions
fix(match-engine): stop pairing players across regions
chore(deps): bump next to 16.3.4
```

## Local checks

Hooks (via Husky):

| Hook         | Runs                              |
| ------------ | --------------------------------- |
| `pre-commit` | `lint-staged` (eslint + prettier) |
| `commit-msg` | `commitlint`                      |
| `pre-push`   | `typecheck` + unit tests          |

Full sweep before pushing anything non-trivial:

```bash
pnpm validate
pnpm test:e2e
```

## Code conventions

- TypeScript strict. No `any` without a `// eslint-disable` and a reason.
- Server-only code under `src/server/`; never import it into a Client Component.
- Reach for Server Components and Server Actions first; add `"use client"` only when needed.
- Access env through `@/env`, never `process.env` directly.
- Domain logic (matching, scoring, ratings) is framework-free and unit-tested in isolation.

## Architecture Decision Records

Non-trivial technical choices get an ADR in `docs/adr/`. Copy `0000-template.md`, bump the
number, set status, and link it from the PR.
