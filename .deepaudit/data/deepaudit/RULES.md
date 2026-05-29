# deepaudit

## What this codebase is

deepaudit is a developer CLI — a TypeScript pnpm monorepo shipping the
`deepaudit` binary plus the `deepaudit/config` sub-export. A developer runs
`deepaudit scan` / `process` from a `.deepaudit/` workspace inside their own
repo to audit it for **rule conformance** using regex matchers + an AI agent
(Claude Agent SDK or Codex SDK). Optional fan-out to Vercel Sandbox microVMs
for scaling. No HTTP server, no network listeners, no DB. It reads the
developer's own files and writes JSON under `.deepaudit/data/<id>/`.

## Conventions worth enforcing

- **Plugin boundary.** Internals route through `getRegistry()` from
  `deepaudit/config`, never by calling organization-specific code directly.
  Plugin contracts live in `packages/core/src/plugin.ts`.
- **Matchers.** New built-in matchers go in `packages/scanner/src/matchers/`
  and register in `matchers/index.ts`. They must be broadly useful and
  language/framework-agnostic. Organization- or framework-specific matchers
  belong in a separate plugin package, not in this tree.
- **Generic prompt.** The AI prompt template under
  `packages/processor/src/prompt/` is intentionally domain-neutral. Don't add
  organization- or domain-specific context there; use `data/<id>/RULES.md` or
  `config.json:promptAppend`.
- **Published surface stays self-contained.** The generated `deepaudit/config`
  `.d.ts` must not re-export `@deepaudit/*` workspace-internal types —
  consumers install only `deepaudit`. (`e2e/bundle.test.ts` enforces this.)
- **Backward-compatible records.** Fields added to persisted types
  (`FileRecord`, `RunMeta`, `Violation`, …) are optional, with a documented
  default for records written before the field existed. Don't make a newly
  added field required.

## Patterns to flag

- Reaching around the registry / plugin contract to wire something directly.
- A new matcher that bakes one org's or one framework's convention into the
  default set instead of shipping it as a plugin.
- Domain-specific wording added to the core prompt template.
- A required new field on a persisted type with no migration / default.
- `console.log` in committed library code (route through the CLI formatters).

## Known false-positives — do NOT flag

- `packages/scanner/src/matchers/*.ts` — matcher source contains regex
  literals shaped like the patterns they detect. Those are detection patterns,
  not violations.
- `packages/processor/src/prompt/*.ts` — the prompt strings contain reviewer
  vocabulary by design. Not code.
- `fixtures/sample-app/` — synthetic conformance issues for e2e tests; every
  matched pattern there is intentional.
- `samples/webapp/` — illustrative starter for new users; may contain
  deliberately non-conformant patterns to demo matcher behavior.
- `e2e/` and any `**/__tests__/**` — fixtures, stubs, and literal strings are
  test data unless the test logic itself is wrong.
