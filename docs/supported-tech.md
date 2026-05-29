# Supported tech

deepaudit fingerprints a codebase before it scans, so both the matcher set
and the AI prompt can adapt to the frameworks in play. This page documents
what detection emits and how that signal is used.

Detection itself is the mature part. The two things it *drives* —
tech-gated matchers and per-tech audit highlights — both ship minimal or
empty at fork-time and are meant to be extended by you (via plugins and
per-project `RULES.md`). Don't read the tag list below as "deepaudit knows
how to audit all of these out of the box"; it knows how to *recognize*
them.

## How detection works

`packages/scanner/src/detect-tech.ts` walks the project root **once** per
scan. Each detector looks for a sentinel file or a dependency shape and
returns normalized, lowercase tags:

- **Sentinel files** — e.g. `manage.py` → `python` + `django`,
  `go.mod` → `go`, `Gemfile` → `ruby`, `Cargo.toml` → `rust`,
  `wrangler.toml` → `workers`, `Dockerfile` → `docker`.
- **Lockfile / manifest contents** — `package.json` dependencies decide
  the JS framework tags (`next` → `nextjs`, `express` → `express`),
  `composer.json` decides PHP frameworks, `requirements.txt` /
  `pyproject.toml` decide Python frameworks, and so on.

Results persist to `data/<projectId>/tech.json` as a `DetectedTech`
record: the sorted `tags`, the `sentinels` that were observed (so matcher
gates can reuse them without re-walking the tree), `detectedAt`, and
`rootPath`. A single detector failing never kills detection — it just
contributes no tags.

## What detection drives

1. **Tech-gated conformance matchers.** A matcher can declare
   `requires: { tech: ["<tag>"] }` so it only runs when that tag is
   present. The built-in set currently ships **no** tech-gated matchers —
   the default registry
   (`packages/scanner/src/matchers/index.ts`) is a small, language-
   agnostic starter set (`console-log`, `todo-no-link`,
   `non-null-assertion`, `any-type`, `process-env-direct`,
   `default-export`) that runs everywhere. Framework-specific conformance
   matchers are something you add — see
   [writing-matchers.md](writing-matchers.md) and
   [plugins.md](plugins.md).
2. **Per-tech audit highlights.** When a tag is detected, deepaudit can
   inject a short "audit highlights" block into the AI prompt naming
   conventions worth checking for that framework. These live in
   `packages/processor/src/prompt/highlights.ts` and are **currently an
   empty array** — the block is still wired into the prompt, it just has
   nothing to contribute until repopulated with conformance-focused
   highlights. Until then, framework-specific guidance comes entirely from
   per-project `RULES.md`.

So: detection is the stable signal; the conformance content layered on top
of it is yours to define.

## Tags detection emits

The tags below are everything the detectors can currently produce,
grouped by ecosystem. Base-language tags (`node`, `python`, `php`, …) are
emitted whenever the ecosystem is present at all; the rest are added when a
specific framework or platform is found.

| Ecosystem | Tags |
|---|---|
| Node / JS / TS | `node`, `nextjs`, `react`, `express`, `fastify`, `nestjs`, `hono`, `koa`, `hapi`, `remix`, `sveltekit`, `nuxt`, `astro`, `solidstart`, `trpc`, `mcp`, `connectrpc`, `graphql`, `socketio`, `bullmq`, `drizzle`, `prisma` |
| JS runtimes | `bun`, `deno`, `workers` |
| PHP | `php`, `laravel`, `symfony`, `slim`, `yii`, `cakephp`, `codeigniter`, `wordpress`, `drupal`, `magento` |
| Python | `python`, `django`, `djangorestframework`, `flask`, `fastapi`, `starlette`, `aiohttp`, `tornado`, `sanic`, `bottle`, `falcon`, `celery`, `airflow` |
| Ruby | `ruby`, `rails`, `sinatra`, `grape`, `hanami`, `roda` |
| Go | `go`, `gin`, `echo`, `fiber`, `chi`, `gorilla`, `buffalo`, `grpc`, `connectrpc`, `cobra` |
| Rust | `rust`, `actix`, `axum`, `rocket`, `warp`, `tide`, `poem`, `tonic`, `lambda-rs` |
| JVM (Java / Kotlin) | `jvm`, `spring`, `ktor`, `micronaut`, `jaxrs` |
| .NET | `dotnet` |
| Elixir / Erlang | `elixir`, `phoenix`, `erlang`, `cowboy` |
| Other languages | `crystal`, `kemal`, `clojure`, `swift`, `ios`, `vapor`, `dart`, `flutter`, `shelf` |
| Salesforce | `apex`, `salesforce` |
| Mobile | `android` |
| Serverless | `aws-lambda`, `gcp-cloud-functions`, `azure-functions` |
| Cross-cutting infra | `docker`, `terraform`, `github-actions` |

Cross-cutting infra tags (`docker`, `terraform`, `github-actions`) are
informational — they're available to the prompt but don't gate any
matcher.

## Adding a new ecosystem

Detection and the two things it drives are independent, so you can do as
much or as little as you need:

1. **Detector branch (required to recognize the tech).** Add a branch in
   `packages/scanner/src/detect-tech.ts` that emits the tag from a
   sentinel file or a dependency/manifest match. If the sentinel is one
   callers should be able to reuse, add it to `COMMON_SENTINELS` too.
2. **Tech-gated matcher (optional).** Under
   `packages/scanner/src/matchers/<slug>.ts`, set
   `requires: { tech: ["<tag>"] }` so it only runs when the tag is
   present, and register it in
   `packages/scanner/src/matchers/index.ts`. Only do this for a
   conformance rule that's broadly useful; org-specific rules belong in a
   plugin or `RULES.md`.
3. **Audit highlight (optional).** Add an entry to
   `packages/processor/src/prompt/highlights.ts` (3–6 short bullet lines)
   describing conventions worth checking for the tech. Keep it terse — the
   model already knows the framework; you're pointing at the rules, not
   teaching the framework.

Tests:
- A `detect-tech.test.ts` case with a small fixture for the new tag.
- If you added a matcher, a unit test with input that should match and a
  clean input that shouldn't.
- The existing `prompt-assemble.test.ts` enforces a soft size cap on
  highlights — keep yours short.
