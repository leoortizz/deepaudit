---
name: deepaudit
description: Use deepaudit (an AI-powered code auditor that checks a repo against its own conventions plus a default rule pack) — running audits, configuring projects, writing matchers, and authoring plugins. Activates when the user asks how to audit, configure, or extend deepaudit in a project that has deepaudit installed.
---

# deepaudit

`deepaudit` is an AI-powered code auditor that reviews a repo against its
own conventions (project `RULES.md`) plus a default rule pack. This
skill activates when deepaudit ships inside `node_modules/` — typically
because the user ran `npx deepaudit …`. In the more common dedicated-git
setup the user works inside a clone of `leoortizz/deepaudit` and the
same docs sit at `docs/` from the repo root — read those instead when
this skill fires from outside a node_modules.

When the user asks how to use, configure, or extend deepaudit, read the
relevant doc before answering — the docs are the source of truth, not
your training data.

## Where the docs are

`node_modules/deepaudit/dist/docs/` (or `<deepaudit-clone>/docs/`):

- `getting-started.md` — first-audit walkthrough
- `configuration.md` — full `deepaudit.config.ts` reference
- `plugins.md` — plugin slots (matchers, notifiers, ownership, people, executor)
- `writing-matchers.md` — how to grow the matcher set with a coding agent
- `models.md` — model selection, defaults, refusals, future models
- `vercel-setup.md` — getting AI Gateway and Vercel Sandbox keys / tokens
- `architecture.md` — pipeline internals
- `data-layout.md` — `data/` schemas (FileRecord, RunMeta, …)
- `faq.md` — cost, model choice, sandbox mode, FP rate

## Worked example

`node_modules/deepaudit/dist/samples/webapp/` (or `<deepaudit-clone>/samples/webapp/`)
is a complete reference setup — `deepaudit.config.ts` with an inline
plugin, two custom matchers under `matchers/`, a `RULES.md` with project
conventions, and a per-project `config.json`. When the user asks
"what should my config look like?", read this directory.

## How to answer common questions

- **"How do I run an audit?"** → `getting-started.md`.
- **"What goes in `deepaudit.config.ts`?"** → `configuration.md` + `samples/webapp/deepaudit.config.ts`.
- **"How do I add a matcher?"** → `writing-matchers.md` + `samples/webapp/matchers/*.ts`.
- **"How do I write a plugin?"** → `plugins.md` + `samples/webapp/deepaudit.config.ts` (inline plugin pattern).
- **"What does deepaudit actually do?"** → `architecture.md`.
- **"What's in `data/<id>/files/foo.json`?"** → `data-layout.md`.
- **"Which model / agent should I use?"** → `models.md`.
- **"How do I get an AI Gateway / Sandbox token?"** → `vercel-setup.md`.

Read the doc before paraphrasing. The CLI flag set, defaults, and
plugin-contract field names change — quote the doc, don't recall.
