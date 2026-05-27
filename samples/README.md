# Samples

Copy-paste starting points showing how deepaudit looks in practice.

## What's here

- [`webapp/`](webapp/) — a fictional Acme inventory webapp. Shows a
  `deepaudit.config.ts` that registers two custom matchers via an in-tree
  plugin, an `RULES.md` for the AI's project context, and a per-project
  `config.json`.

Each sample is self-contained: copy the directory next to your real
project, point `root` at your codebase, and run `pnpm deepaudit scan` from
inside.
