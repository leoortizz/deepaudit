# deepaudit

`deepaudit` is an agent-powered code auditor that you can run in your own infrastructure, optimized to perform on-demand review of all code in existing large-scale repos against the project's own conventions plus a configurable rule pack.

`deepaudit` is designed to surface conformance issues that have been lurking in applications for a long time — places where the code drifted from the team's stated rules, or accumulated patterns the team agreed to avoid. It is configured to use the best models at maximum thinking levels, meaning audits can cost thousands or even tens-of-thousands of dollars for large codebases. Teams who care about consistency at scale have found the cost worth it for how cleanly they were able to align long-lived code with current conventions.

This project began as a fork of [deepsec](https://github.com/vercel-labs/deepsec), an AI-powered security scanner. The pipeline (file-grained, idempotent, parallelized across Vercel Sandbox microVMs) is unchanged; the rule set, prompts, and severity taxonomy were rebuilt for conformance auditing.

For large codebases, work fans out across worker machines in parallel.
If a run is interrupted or errors out partway through, just re-run the same
command — deepaudit picks up where it left off, skipping files it already
analyzed and only investigating the rest.

## Get started

Navigate to the root of the repository that you want to audit, then:

```bash
npx deepaudit init       # creates .deepaudit/ with this repo as the first project
cd .deepaudit
pnpm install             # installs deepaudit from npm

# Proceed as instructed by `init` output
```

Now have your coding agent bootstrap your installation. Open the agent of choice
and prompt:

> Read `.deepaudit/node_modules/deepaudit/SKILL.md` to understand the
> tool. Then read `.deepaudit/data/<id>/SETUP.md` and follow it: open
> this repo, skim any existing CLAUDE.md / AGENTS.md / .cursor/rules,
> plus the README and CONTRIBUTING.md, then populate each section of
> `.deepaudit/data/<id>/RULES.md` with the project's actual
> conventions.
>
> Keep it SHORT — target 50–100 lines total. Each entry should be an
> imperative ("do X", "don't Y", "prefer X"). Skip descriptive prose
> (repo layout, dev commands) — that isn't a rule. Cover only what's
> project-specific; the default pack handles the basics. RULES.md is
> injected into every audit batch; verbose context dilutes signal.

Then audit from inside `.deepaudit/`:

```bash
pnpm deepaudit scan
pnpm deepaudit process
pnpm deepaudit revalidate # optional, cuts FP rate
pnpm deepaudit export --format md-dir --out ./violations
```

If you'd like deepaudit to look at more conformance dimensions, give your
coding agent [the writing matchers](docs/writing-matchers.md) doc and ask
it to grow the matcher set for patterns specific to your codebase.

## Docs

- [docs/getting-started.md](docs/getting-started.md) — first-audit walkthrough
- [docs/reviewing-changes.md](docs/reviewing-changes.md) — `process --diff` for PR review and CI gating
- [docs/supported-tech.md](docs/supported-tech.md) — languages and frameworks deepaudit recognizes out of the box
- [docs/writing-matchers.md](docs/writing-matchers.md) — **prompt your coding agent to grow your matcher set**
- [docs/configuration.md](docs/configuration.md) — `deepaudit.config.ts` reference
- [docs/plugins.md](docs/plugins.md) — plugin authoring
- [docs/models.md](docs/models.md) — model selection, defaults, refusals, future models
- [docs/vercel-setup.md](docs/vercel-setup.md) — AI Gateway + Vercel Sandbox keys / tokens
- [docs/architecture.md](docs/architecture.md) — pipeline internals
- [docs/data-layout.md](docs/data-layout.md) — `data/` schemas (FileRecord, RunMeta, …)
- [docs/faq.md](docs/faq.md) — cost, model choice, sandbox mode, FP rate
- [samples/](samples/) — copy-paste starting points (currently: `webapp/`)
- [CONTRIBUTING.md](CONTRIBUTING.md) — repo layout, dev workflow

## AI provider

When running locally, `deepaudit` falls back to your existing `claude` /
`codex` subscription if you've logged in on this machine. Subscriptions
(Claude Pro/Max, ChatGPT Plus) are useful for evaluating deepaudit but
generally don't have enough headroom for full repo audits.

For real audits, use Vercel AI Gateway. One key covers both Claude and
Codex, and the gateway's default quotas are sized for highly concurrent
research.

```
AI_GATEWAY_API_KEY=vck_...
```

See [docs/vercel-setup.md](docs/vercel-setup.md) for getting a key and
for the Vercel Sandbox setup. To bypass the gateway, set
`ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` (or the OpenAI pair)
explicitly. Explicit values always win over the `AI_GATEWAY_API_KEY`
expansion.

If a `process` or `revalidate` run halts because the upstream credential
ran out of quota or credits, deepaudit stops gracefully and tells you
where to top up. Re-run the same command afterward and it picks up
where it left off.

## Distributed execution (optional)

Large monorepos can fan work across [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) microVMs:

```bash
pnpm deepaudit sandbox process --project-id my-app --sandboxes 10 --concurrency 4
```

Needs a Vercel account. The local working tree is tarballed and
uploaded; `.git` is excluded. Both OIDC tokens (local) and access
tokens (CI) are supported — see
[docs/vercel-setup.md](docs/vercel-setup.md).

## Security model of deepaudit itself

Treat `deepaudit` like a coding agent with full shell access on the
environment that it is running on. It is designed to run on trusted
inputs (your source code) but you may still be concerned about prompt
injection due to external dependencies or vendored code.

Running on a sandbox (see above) does limit the potential exposure
substantially:

- The API keys for the coding agents are injected outside of the sandbox and hence cannot be exfiltrated.
- For the worker sandboxes, network egress from the sandbox is limited to coding agent hosts (egress is allowed during the bootstrap process, but this does not run the coding agent).

## Workflow reference

| Command          | What it does                                             |
|------------------|----------------------------------------------------------|
| `scan`           | Find candidate sites with regex matchers (fast, no AI)   |
| `process`        | AI audit; emits violations + recommendation              |
| `process --diff` | PR-mode: scan + audit only files changed in a diff       |
| `triage`         | Lightweight priority classification (cheaper model)      |
| `revalidate`     | Re-check existing violations; checks git history for fixes |
| `enrich`         | Add git committer info + (with a plugin) ownership data  |
| `report`         | Markdown + JSON summary for one project                  |
| `export`         | Per-violation JSON or directory of markdown files        |
| `metrics`        | Cross-project counts: severities, rules, TPs             |
| `status`         | Snapshot of the project mirror                           |
| `sandbox <cmd>`  | Run any of the above on Vercel Sandbox microVMs          |

## License

Apache 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
