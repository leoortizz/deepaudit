# deepaudit

This directory holds the [deepaudit](https://www.npmjs.com/package/deepaudit)
config for the parent repo. Checked into git so teammates inherit
project context (conventions, project rules, custom matchers) AND the
per-file investigation cache — committing `data/*/files/` is what
lets CI re-investigate only the files in the PR diff instead of
starting from scratch every run.

Currently configured project: `deepaudit` (target: `..`).

## Setup

1. `pnpm install` — installs deepaudit.
2. Add your AI Gateway token to `.env.local`. See
   `node_modules/deepaudit/dist/docs/vercel-setup.md` after install.
3. Open the parent repo in your coding agent (Claude Code, Cursor, …)
   and have it follow `data/deepaudit/SETUP.md` to fill in
   `data/deepaudit/RULES.md`.

## Daily commands

```bash
pnpm deepaudit scan
pnpm deepaudit process     --concurrency 5
pnpm deepaudit revalidate  --concurrency 5                  # cuts FP rate
pnpm deepaudit export      --format md-dir --out ./violations
```

`--project-id` is auto-resolved while there's only one project in
`deepaudit.config.ts`. Once you've added a second project, pass
`--project-id deepaudit` (or whichever id you want) explicitly.

`scan` is free (regex only). `process` is the AI stage (≈$0.30/file
on Opus by default). Run state goes to `data/deepaudit/`.

## Adding another project

To scan another codebase from this same `.deepaudit/`:

```bash
pnpm deepaudit init-project ../some-other-package   # path relative to .deepaudit/
```

Appends an entry to `deepaudit.config.ts` and writes
`data/<id>/{RULES.md,SETUP.md,project.json}`. Open the new SETUP.md
in your agent to fill in RULES.md.

## Layout

```
deepaudit.config.ts        Project list (one entry per scanned repo)
data/deepaudit/
  RULES.md                Repo context — checked in, hand-curated
  SETUP.md               Agent setup prompt — checked in, deletable
  files/                 One JSON per scanned source file — checked in
                         (the investigation cache; CI reads this)
  project.json           Absolute root path (gitignored — flips per machine)
  runs/                  Run metadata (gitignored — pure churn)
  reports/               Generated markdown reports (gitignored)
AGENTS.md                Pointer for coding agents
.env.local               Tokens (gitignored)
```

## Docs

After `pnpm install`:

- Skill: `node_modules/deepaudit/SKILL.md`
- Full docs: `node_modules/deepaudit/dist/docs/{getting-started,configuration,models,writing-matchers,plugins,architecture,data-layout,vercel-setup,faq}.md`

Or browse on
[GitHub](https://github.com/leoortizz/deepaudit/tree/main/docs).
