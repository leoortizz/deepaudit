# Agent setup

This is a deepaudit scanning workspace. Each registered project has its
own setup prompt at `data/<id>/SETUP.md` — open the relevant one when
asked to set a project up.

## Common tasks

- **Set up a project for scanning**: read `data/<id>/SETUP.md` and
  follow it (read `node_modules/deepaudit/SKILL.md`, then fill
  `data/<id>/INFO.md` from the target codebase).
- **Add a new project**: run `deepaudit init-project <root>` — it
  scaffolds `data/<id>/` and prints/writes the setup prompt for the
  new project.
- **Write a custom matcher** (only after a real true-positive shows you
  a pattern worth keeping): read
  `node_modules/deepaudit/dist/docs/writing-matchers.md`.

## Reference

The deepaudit skill is at `node_modules/deepaudit/SKILL.md` (after
`pnpm install`). The full docs ship at
`node_modules/deepaudit/dist/docs/`.
