import fs from "node:fs";
import path from "node:path";
import { dataDir, ensureProject } from "@deepaudit/core";
import { BOLD, CYAN, DIM, GREEN, RESET, YELLOW } from "../formatters.js";
import { requireExistingDir } from "../require-dir.js";
import { validateProjectId } from "../resolve-project-id.js";

export const PROJECTS_INSERT_MARKER = "// <deepaudit:projects-insert-above>";

const CONFIG_FILENAMES = [
  "deepaudit.config.ts",
  "deepaudit.config.mjs",
  "deepaudit.config.js",
  "deepaudit.config.cjs",
];

/** Walk up from `start` looking for a deepaudit config file. */
function findWorkspaceRoot(start: string): string | undefined {
  let dir = path.resolve(start);
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      if (fs.existsSync(path.join(dir, name))) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

interface RegisterResult {
  id: string;
  targetRel: string;
  targetAbs: string;
  configPath: string;
  setupMdPath: string;
  rulesMdPath: string;
}

/**
 * Register a project in an existing deepaudit workspace. Shared by `init`
 * (called once for the first project, after the workspace skeleton is in
 * place) and `init-project` (called against an existing workspace).
 *
 * Writes:
 *   - data/<id>/project.json (via ensureProject — also auto-detects githubUrl)
 *   - data/<id>/RULES.md (placeholder template)
 *   - data/<id>/SETUP.md (per-project agent setup prompt)
 *   - appends `{ id, root }` to projects[] in deepaudit.config.ts
 */
export function registerProject(opts: {
  workspaceDir: string;
  targetRoot: string;
  id?: string;
  force?: boolean;
}): RegisterResult {
  const workspaceDir = fs.realpathSync(path.resolve(opts.workspaceDir));
  const targetAbs = requireExistingDir(opts.targetRoot, "<target-root>");
  const id = validateProjectId(opts.id ?? path.basename(targetAbs));
  // Normalize to POSIX separators: `targetRel` gets written into
  // deepaudit.config.ts (committed to VCS) and SETUP.md, so a Windows
  // contributor adding a project would otherwise produce `..\foo\bar`
  // that's ugly cross-platform and noisy in diffs. Both Node path APIs
  // accept "/" on Windows.
  const targetRel = path.relative(workspaceDir, targetAbs).split(path.sep).join("/");

  const configPath = findConfigInWorkspace(workspaceDir);
  if (!configPath) {
    throw new Error(
      `Could not find deepaudit.config.ts in ${workspaceDir}.\n` +
        `  init-project must run inside a workspace created by \`deepaudit init\`.`,
    );
  }

  const projectDataDir = path.join(workspaceDir, dataDir(id));
  const dataExists = fs.existsSync(projectDataDir) && fs.readdirSync(projectDataDir).length > 0;
  const inConfig = configIncludesProjectId(configPath, id);
  if ((dataExists || inConfig) && !opts.force) {
    throw new Error(
      `Project "${id}" already exists in this workspace ` +
        `(${dataExists ? "data dir" : "config"} occupied).\n` +
        `  Pass --force to overwrite, or pick a different --id.`,
    );
  }

  // Run all writes from the workspace root so DEEPAUDIT_DATA_ROOT-relative
  // paths via `dataDir(id)` land correctly. Restore on exit.
  const originalCwd = process.cwd();
  try {
    process.chdir(workspaceDir);
    ensureProject(id, targetAbs);
    const projectDir = dataDir(id);
    fs.mkdirSync(projectDir, { recursive: true });
    const rulesMdPath = path.join(projectDir, "RULES.md");
    if (!fs.existsSync(rulesMdPath) || opts.force) {
      fs.writeFileSync(rulesMdPath, rulesMdTemplate(id));
    }
    const setupMdPath = path.join(projectDir, "SETUP.md");
    fs.writeFileSync(setupMdPath, setupMdTemplate(id, targetRel));

    insertProjectIntoConfig(configPath, id, targetRel);

    return {
      id,
      targetRel,
      targetAbs,
      configPath,
      setupMdPath: path.resolve(setupMdPath),
      rulesMdPath: path.resolve(rulesMdPath),
    };
  } finally {
    process.chdir(originalCwd);
  }
}

function findConfigInWorkspace(workspaceDir: string): string | undefined {
  for (const name of CONFIG_FILENAMES) {
    const p = path.join(workspaceDir, name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function configIncludesProjectId(configPath: string, id: string): boolean {
  const src = fs.readFileSync(configPath, "utf-8");
  const re = new RegExp(`id:\\s*["'\`]${escapeRegex(id)}["'\`]`);
  return re.test(src);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertProjectIntoConfig(configPath: string, id: string, root: string): void {
  const src = fs.readFileSync(configPath, "utf-8");
  if (!src.includes(PROJECTS_INSERT_MARKER)) {
    throw new Error(
      `Marker "${PROJECTS_INSERT_MARKER}" not found in ${configPath}.\n` +
        `  init-project relies on this marker to know where to add the new project.\n` +
        `  Either add it back inside the projects[] array, or add the project entry by hand:\n` +
        `    { id: "${id}", root: ${JSON.stringify(root)} },`,
    );
  }
  // Preserve the marker's leading indent on the inserted line so the
  // appended entry sits at the same indent level.
  const replacer = (match: string) => {
    const m = match.match(/^([\t ]*)(.*)$/m);
    const indent = m?.[1] ?? "    ";
    return `${indent}{ id: ${JSON.stringify(id)}, root: ${JSON.stringify(root)} },\n${match}`;
  };
  const re = new RegExp(`^[\\t ]*${escapeRegex(PROJECTS_INSERT_MARKER)}.*$`, "m");
  const updated = src.replace(re, replacer);
  fs.writeFileSync(configPath, updated);
}

function rulesMdTemplate(id: string): string {
  return `# Project rules for ${id}

> Replace each section with your project's actual rules. Target 50–100
> lines total. RULES.md is injected into every AI audit batch — verbose
> context dilutes signal. See \`SETUP.md\` for a coding-agent prompt that
> bootstraps this file from your existing convention files.

> **Precedence:** rules below override the deepaudit default pack on
> conflict. If your repo already has a \`CLAUDE.md\` / \`AGENTS.md\` /
> \`.cursor/rules/\` you trust, paste or summarize from there.

## Conventions worth enforcing

<3–7 rules unique to THIS codebase, stated as imperatives. Examples:
"Database access must go through the \`db/\` package, never raw drivers."
"All public exports are documented with a one-line JSDoc.">

## Patterns to flag

<3–5 anti-patterns specific to this project. Examples:
"Don't use \`console.log\` in committed code — use \`logger\`."
"Don't catch errors without a comment explaining why they're swallowed.">

## Known exceptions

<3–5 paths or files where the rules above do NOT apply — scripts,
fixtures, migration helpers, anything intentionally divergent>
`;
}

function setupMdTemplate(id: string, targetRel: string): string {
  return `# Agent setup for \`${id}\`

This is a deepaudit workspace. Project \`${id}\` was just registered
(target: \`${targetRel}\`). Setup is incomplete — \`data/${id}/RULES.md\`
still has placeholder sections.

## What to do

1. **Read the deepaudit skill.** After \`pnpm install\`, the file is at
   \`node_modules/deepaudit/SKILL.md\`. It maps every doc topic to a file
   under \`node_modules/deepaudit/dist/docs/\`. Read \`getting-started.md\`
   and \`configuration.md\` (skim the rest).

2. **Fill in \`data/${id}/RULES.md\`.** It's auto-injected into the AI
   prompt for every batch — keep it short and rule-shaped.

   **Length budget: 50–100 lines total.** Verbose context dilutes
   signal in the prompt window. The goal is "what would a reviewer
   miss if they didn't read this?", not exhaustive enumeration.

   **Per-section rubric**:
   - Each entry is an imperative: "do X," "don't Y," "prefer X."
     Descriptive prose (repo layout, dev commands) doesn't belong here.
   - Pick 3–5 representative rules per section. Don't enumerate every
     callsite or helper — pick the patterns worth enforcing.
   - Name primitives by their public name. No line numbers.
   - Project rules override the default pack on conflict.

   Source material (read in this order, stop when you have enough):
   - any existing \`CLAUDE.md\` / \`AGENTS.md\` / \`.cursor/rules/\` in \`${targetRel}\`
   - \`${targetRel}/README.md\` and \`CONTRIBUTING.md\`
   - \`${targetRel}/package.json\` (or \`go.mod\`, \`pyproject.toml\`, etc.)
   - 5–10 representative code files — enough to see the conventions in
     action, not a full code tour.

3. **(Optional) Add conformance matchers** for repo-specific patterns
   the built-in matchers won't catch. Don't add matchers speculatively
   — wait for a real violation, then write a matcher that would have
   flagged it.

## When you're done

The user will run:

\`\`\`bash
pnpm deepaudit scan    --project-id ${id}
pnpm deepaudit process --project-id ${id}
\`\`\`

You can delete this file once setup is complete.
`;
}

/* CLI entry point — commander enforces <target-root> presence via the
   command spec, so we don't re-validate it here. */
export function initProjectCommand(opts: {
  targetRoot?: string;
  id?: string;
  force?: boolean;
}): void {
  const workspaceDir = findWorkspaceRoot(process.cwd());
  if (!workspaceDir) {
    console.error(
      `No .deepaudit/ workspace found in or above ${process.cwd()}.\n` +
        `  Run \`deepaudit init\` from your repo root first, then cd into .deepaudit/\n` +
        `  before adding more projects.`,
    );
    process.exit(1);
  }
  if (!opts.targetRoot) {
    // Defensive: commander should have caught this. Keeps the type checker happy.
    process.exit(1);
  }

  let result: RegisterResult;
  try {
    result = registerProject({
      workspaceDir,
      targetRoot: opts.targetRoot,
      id: opts.id,
      force: opts.force,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log(
    `${GREEN}✓${RESET} Added project ${BOLD}${result.id}${RESET} → ${result.targetRel}\n`,
  );
  console.log(
    `  ${YELLOW}Paste this into your coding agent${RESET} ${DIM}(Claude Code, Cursor, Codex, OpenCode, Pi, etc.):${RESET}`,
  );
  console.log();
  printAgentPrompt(result.id, result.targetRel);
  console.log();
  console.log(`  Then run: ${DIM}pnpm deepaudit scan --project-id ${result.id}${RESET}`);
}

function printAgentPrompt(id: string, targetRel: string): void {
  const lines = [
    `Read node_modules/deepaudit/SKILL.md to understand the tool. Then`,
    `read data/${id}/SETUP.md and follow it: open ${targetRel}, skim`,
    `its README + AGENTS.md/CLAUDE.md + a handful of representative`,
    `code files, then replace each section of data/${id}/RULES.md.`,
    ``,
    `Keep it SHORT — target 50–100 lines total. Pick 3–5 examples per`,
    `section, not exhaustive enumeration. Name primitives (helpers,`,
    `middleware) but no line numbers. Skip patterns the built-in`,
    `matchers already cover; document only what's project-specific.`,
    `RULES.md is injected into every scan batch; verbose context`,
    `dilutes signal.`,
  ];
  for (const l of lines) console.log(`    ${CYAN}${l}${RESET}`);
}
