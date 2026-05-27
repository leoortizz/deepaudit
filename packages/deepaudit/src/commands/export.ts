import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FileRecord, Severity, Violation } from "@deepaudit/core";
import { dataDir, getDataRoot, loadAllFileRecords } from "@deepaudit/core";
import { BOLD, DIM, GREEN, RESET, YELLOW } from "../formatters.js";
import { resolveAgentType } from "../resolve-agent-type.js";

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  NIT: 3,
};

interface OwnerSummary {
  assignee?: string;
  assigneeSource?: "oncall" | "manager" | "top-contributor" | "last-committer";
  teams: { name: string; slug: string }[];
  oncall: { name: string; email: string; slack_user_id?: string; github_username?: string }[];
  managers: { email: string; slack_user_id?: string }[];
  contributors: { name: string; email: string; github_username?: string; score: number }[];
  recentCommitters: { name: string; email: string; date: string }[];
}

interface ExportedViolation {
  title: string;
  description: string;
  severity: Severity;
  labels: string[];
  /** Best-guess owner email, suitable for downstream issue-tracker assignment. */
  assignee?: string;
  metadata: {
    projectId: string;
    filePath: string;
    lineNumbers: number[];
    severity: Severity;
    ruleSlug: string;
    confidence: string;
    discoveredAt: string;
    runId: string;
    revalidation?: {
      verdict: string;
      reasoning: string;
    };
    githubUrl?: string;
    owners: OwnerSummary;
  };
}

function summarizeOwners(record: FileRecord): OwnerSummary {
  const teams = (record.gitInfo?.ownership?.escalationTeams ?? []).map((t) => ({
    name: t.name,
    slug: t.slug,
  }));
  const oncall = (record.gitInfo?.ownership?.escalationTeams ?? [])
    .map((t) => t.current_oncall)
    .filter((o) => o?.email)
    .map((o) => ({
      name: o.name,
      email: o.email,
      slack_user_id: o.slack_user_id,
      github_username: o.github_username,
    }));
  const managers = (record.gitInfo?.ownership?.escalationTeams ?? [])
    .map((t) => t.manager)
    .filter((m) => m?.email)
    .map((m) => ({ email: m.email, slack_user_id: m.slack_user_id }));
  const contributors = (record.gitInfo?.ownership?.contributors ?? []).slice(0, 5).map((c) => ({
    name: c.name,
    email: c.email,
    github_username: c.github_username,
    score: c.score,
  }));
  const recentCommitters = (record.gitInfo?.recentCommitters ?? []).slice(0, 5);

  let assignee: string | undefined;
  let assigneeSource: OwnerSummary["assigneeSource"];
  if (oncall[0]?.email) {
    assignee = oncall[0].email;
    assigneeSource = "oncall";
  } else if (managers[0]?.email) {
    assignee = managers[0].email;
    assigneeSource = "manager";
  } else if (contributors[0]?.email) {
    assignee = contributors[0].email;
    assigneeSource = "top-contributor";
  } else if (recentCommitters[0]?.email) {
    assignee = recentCommitters[0].email;
    assigneeSource = "last-committer";
  }

  return { assignee, assigneeSource, teams, oncall, managers, contributors, recentCommitters };
}

function projectRepoUrl(projectId: string): string | undefined {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(dataDir(projectId), "project.json"), "utf-8"));
    return p.githubUrl;
  } catch {
    return undefined;
  }
}

function makeGithubLink(
  repoUrl: string | undefined,
  filePath: string,
  lines: number[],
): string | undefined {
  if (!repoUrl) return undefined;
  const base = repoUrl.replace(/\/+$/, "").replace(/\/blob\/[^/]+$/, "");
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  const anchor = firstLine === lastLine ? `#L${firstLine}` : `#L${firstLine}-L${lastLine}`;
  const branch = repoUrl.match(/\/blob\/([^/]+)/)?.[1] ?? "main";
  return `${base}/blob/${branch}/${filePath}${anchor}`;
}

function buildDescription(
  violation: Violation,
  record: FileRecord,
  projectId: string,
  owners: OwnerSummary,
  githubUrl?: string,
): string {
  const head = githubUrl
    ? `**File:** [\`${record.filePath}\`](${githubUrl}) (lines ${violation.lineNumbers.join(", ")})`
    : `**File:** \`${record.filePath}\` (lines ${violation.lineNumbers.join(", ")})`;

  const parts: string[] = [
    head,
    `**Project:** ${projectId}`,
    `**Severity:** ${violation.severity}  •  **Confidence:** ${violation.confidence}  •  **Slug:** \`${violation.ruleSlug}\``,
  ];

  if (owners.assignee || owners.teams.length > 0 || owners.oncall.length > 0) {
    parts.push("", "## Owners");
    if (owners.assignee) {
      parts.push(
        "",
        `**Suggested assignee:** \`${owners.assignee}\` _(via ${owners.assigneeSource})_`,
      );
    }
    if (owners.teams.length > 0) {
      parts.push(
        "",
        "**Teams:**",
        ...owners.teams.slice(0, 3).map((t) => `- ${t.name} (\`${t.slug}\`)`),
      );
    }
    if (owners.oncall.length > 0) {
      parts.push(
        "",
        "**Current on-call:**",
        ...owners.oncall.slice(0, 3).map((o) => {
          const gh = o.github_username
            ? ` • [@${o.github_username}](https://github.com/${o.github_username})`
            : "";
          return `- ${o.name} <${o.email}>${gh}`;
        }),
      );
    }
    if (owners.managers.length > 0) {
      parts.push("", "**Managers:**", ...owners.managers.slice(0, 3).map((m) => `- <${m.email}>`));
    }
  }

  parts.push(
    "",
    "## Violation",
    "",
    violation.description,
    "",
    "## Recommendation",
    "",
    violation.recommendation,
  );

  if (violation.revalidation) {
    parts.push(
      "",
      "## Revalidation",
      "",
      `**Verdict:** ${violation.revalidation.verdict}`,
      "",
      violation.revalidation.reasoning,
    );
  }

  if (owners.contributors.length > 0) {
    parts.push(
      "",
      "## Top contributors",
      "",
      ...owners.contributors.map((c) => `- ${c.name} <${c.email}> (score: ${c.score.toFixed(2)})`),
    );
  }
  if (owners.recentCommitters.length > 0) {
    parts.push(
      "",
      "## Recent committers (`git log`)",
      "",
      ...owners.recentCommitters.map((c) => `- ${c.name} <${c.email}> (${c.date.slice(0, 10)})`),
    );
  }

  return parts.join("\n");
}

function inDay(iso: string, dayStart: number, dayEnd: number): boolean {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t >= dayStart && t < dayEnd;
}

function startOfTodayLocal(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function listProjectIds(): string[] {
  const dataDirPath = path.resolve(getDataRoot());
  if (!fs.existsSync(dataDirPath)) return [];
  return fs
    .readdirSync(dataDirPath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((p) => fs.existsSync(path.join(dataDirPath, p, "project.json")));
}

/** Stable, filesystem-safe filename for a violation in md-dir mode. */
function violationFilename(f: ExportedViolation): string {
  const hash = crypto
    .createHash("sha1")
    .update(
      `${f.metadata.projectId}\0${f.metadata.filePath}\0${f.metadata.lineNumbers.join(",")}\0${f.metadata.ruleSlug}`,
    )
    .digest("hex")
    .slice(0, 10);
  const safeSlug = f.metadata.ruleSlug.replace(/[^a-zA-Z0-9-]/g, "-");
  const safeProject = f.metadata.projectId.replace(/[^a-zA-Z0-9-]/g, "-");
  return `${safeProject}-${safeSlug}-${hash}.md`;
}

function writeJson(violations: ExportedViolation[], out: string | undefined) {
  const json = JSON.stringify(violations, null, 2);
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, json + "\n");
    console.log(
      `\n${GREEN}Exported ${violations.length} violation(s)${RESET} → ${BOLD}${out}${RESET}`,
    );
  } else {
    process.stdout.write(json + "\n");
  }
}

function writeMdDir(violations: ExportedViolation[], out: string) {
  const root = path.resolve(out);
  fs.mkdirSync(root, { recursive: true });

  // The set of files this export is authoritative for. Anything else in
  // the severity subdirs is left over from a prior run — most often a
  // violation that has since been revalidated as fixed/false-positive/
  // accepted-risk and is now filtered out of the export. Without this
  // sweep, those orphans linger forever and make the export directory
  // misleading (the user thinks they still have unresolved violations on a
  // file we've already patched).
  const wantedFiles = new Set<string>();
  for (const f of violations) {
    wantedFiles.add(path.join(root, f.metadata.severity, violationFilename(f)));
  }

  // Only sweep severity subdirs we recognize — keeps an accidental
  // `--out ~/Documents` from nuking unrelated files. Severity values are
  // a closed enum (see `Severity` in @deepaudit/core), so this list IS the
  // namespace md-dir mode owns.
  const ourSeverityDirs = Object.keys(SEVERITY_ORDER) as Severity[];
  let droppedStale = 0;
  for (const sev of ourSeverityDirs) {
    const dir = path.join(root, sev);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const full = path.join(dir, entry.name);
      if (!wantedFiles.has(full)) {
        fs.unlinkSync(full);
        droppedStale++;
      }
    }
    // Drop now-empty severity dirs so a 0-violation export leaves a clean
    // root rather than a forest of empty directories.
    try {
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    } catch {}
  }

  for (const f of violations) {
    const dir = path.join(root, f.metadata.severity);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, violationFilename(f));
    const body = `# ${f.title}\n\n${f.description}\n`;
    fs.writeFileSync(file, body);
  }

  const staleNote = droppedStale > 0 ? ` (removed ${droppedStale} stale file(s))` : "";
  console.log(
    `\n${GREEN}Exported ${violations.length} violation(s)${RESET} → ${BOLD}${root}/${RESET}${staleNote}`,
  );
}

export async function exportCommand(opts: {
  projectId?: string;
  minSeverity?: string;
  onlySeverity?: string;
  discoveredToday?: boolean;
  since?: string;
  onlyTruePositive?: boolean;
  /** Deprecated: false-positive is now hidden by default. Kept as a no-op for back-compat. */
  excludeFalsePositive?: boolean;
  /**
   * Restore old behavior of including resolved verdicts (fixed,
   * false-positive, accepted-risk) in the output. Off by default.
   */
  includeResolved?: boolean;
  onlySlugs?: string;
  skipSlugs?: string;
  out?: string;
  format?: string;
  /** Drop violations without any ownership data (no assignee, no teams) */
  requireOwner?: boolean;
  /** Only include violations produced by this agent backend (e.g. `codex`) */
  onlyAgent?: string;
  /** Only include violations produced under this --reinvestigate wave marker */
  onlyMarker?: string;
}) {
  const projectIds = opts.projectId
    ? opts.projectId
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : listProjectIds();

  const format = opts.format ?? "json";
  if (format !== "json" && format !== "md-dir") {
    throw new Error(`--format must be "json" or "md-dir", got "${format}"`);
  }
  if (format === "md-dir" && !opts.out) {
    throw new Error(`--format md-dir requires --out <dir>`);
  }

  const minSeverity = opts.minSeverity as Severity | undefined;
  const onlySeverity = opts.onlySeverity as Severity | undefined;
  if (onlySeverity && !(onlySeverity in SEVERITY_ORDER)) {
    throw new Error(`--only-severity: not a valid severity: ${opts.onlySeverity}`);
  }

  let sinceMs: number | undefined;
  let untilMs = Number.POSITIVE_INFINITY;
  if (opts.discoveredToday) {
    sinceMs = startOfTodayLocal();
    untilMs = sinceMs + 24 * 60 * 60 * 1000;
  } else if (opts.since) {
    const t = Date.parse(opts.since);
    if (Number.isNaN(t)) throw new Error(`--since: not a valid ISO timestamp: ${opts.since}`);
    sinceMs = t;
  }

  const onlySlugs = opts.onlySlugs
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const skipSlugs = opts.skipSlugs
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const onlySlugSet = onlySlugs?.length ? new Set(onlySlugs) : undefined;
  const skipSlugSet = skipSlugs?.length ? new Set(skipSlugs) : undefined;

  console.log(`${BOLD}Exporting violations (${format})${RESET}`);
  console.log(`  Projects: ${projectIds.join(", ") || "(none)"}`);
  if (minSeverity) console.log(`  Min severity: ${minSeverity}`);
  if (onlySeverity) console.log(`  Only severity: ${onlySeverity}`);
  if (opts.discoveredToday) console.log(`  ${YELLOW}Filter: discovered today only${RESET}`);
  if (opts.since) console.log(`  Filter: discovered since ${opts.since}`);
  if (opts.onlyTruePositive) console.log(`  Filter: only revalidated true-positive`);
  if (opts.includeResolved) {
    console.log(`  Filter: including resolved verdicts (fixed/false-positive/accepted-risk)`);
  } else {
    console.log(`  Filter: hiding resolved verdicts (fixed/false-positive/accepted-risk)`);
  }
  if (opts.excludeFalsePositive) {
    console.log(
      `  ${YELLOW}Note: --exclude-false-positive is now the default; flag is a no-op.${RESET}`,
    );
  }
  if (onlySlugs) console.log(`  Only slugs: ${onlySlugs.join(", ")}`);
  if (skipSlugs) console.log(`  Skip slugs: ${skipSlugs.join(", ")}`);
  if (opts.requireOwner)
    console.log(`  ${YELLOW}Filter: only violations with ownership data${RESET}`);
  const onlyMarker = opts.onlyMarker !== undefined ? Number(opts.onlyMarker) : undefined;
  if (onlyMarker !== undefined && !Number.isFinite(onlyMarker)) {
    throw new Error(`--only-marker must be a number, got "${opts.onlyMarker}"`);
  }
  const onlyAgent = opts.onlyAgent ? resolveAgentType(opts.onlyAgent) : undefined;
  if (opts.onlyAgent) console.log(`  Only agent: ${opts.onlyAgent}`);
  if (onlyMarker !== undefined) console.log(`  Only marker: ${onlyMarker}`);

  const violations: ExportedViolation[] = [];
  let droppedNoOwner = 0;
  let withAssignee = 0;
  let withTeam = 0;

  for (const projectId of projectIds) {
    let records: FileRecord[];
    try {
      records = loadAllFileRecords(projectId);
    } catch (err) {
      console.error(
        `  ${DIM}[${projectId}] skipped: ${err instanceof Error ? err.message : err}${RESET}`,
      );
      continue;
    }
    const repoUrl = projectRepoUrl(projectId);
    let emitted = 0;

    for (const record of records) {
      const latest = record.analysisHistory?.[record.analysisHistory.length - 1];
      if (!latest) continue;

      if (sinceMs !== undefined && !inDay(latest.investigatedAt, sinceMs, untilMs)) continue;

      // Build a map: violation-index → analysisHistory entry that produced it.
      // Violations are appended in analysisHistory order, so the i-th violation
      // belongs to whichever entry's violationCount range covers i.
      const violationSource: Array<(typeof record.analysisHistory)[number] | undefined> = [];
      let cursor = 0;
      for (const h of record.analysisHistory ?? []) {
        const fc = h.violationCount ?? 0;
        for (let k = 0; k < fc; k++) violationSource[cursor++] = h;
      }

      let violationIndex = -1;
      for (const violation of record.violations ?? []) {
        violationIndex++;
        if (minSeverity && SEVERITY_ORDER[violation.severity] > SEVERITY_ORDER[minSeverity])
          continue;
        if (onlySeverity && violation.severity !== onlySeverity) continue;
        if (onlySlugSet && !onlySlugSet.has(violation.ruleSlug)) continue;
        if (skipSlugSet?.has(violation.ruleSlug)) continue;
        if (opts.onlyTruePositive && violation.revalidation?.verdict !== "true-positive") continue;
        // Default behavior: hide every "resolved" verdict. fixed = patched,
        // false-positive = not real, accepted-risk = real but consciously
        // accepted, duplicate = same issue as another violation in the file
        // (the primary carries the canonical signal). None of these are
        // work the export consumer should action. Pass --include-resolved
        // to surface them anyway (audit / history use cases). The legacy
        // --exclude-false-positive flag is now a no-op — preserved so
        // existing scripts don't break.
        if (
          !opts.includeResolved &&
          (violation.revalidation?.verdict === "fixed" ||
            violation.revalidation?.verdict === "false-positive" ||
            violation.revalidation?.verdict === "accepted-risk" ||
            violation.revalidation?.verdict === "duplicate")
        ) {
          continue;
        }

        const source = violationSource[violationIndex];
        if (onlyAgent && source?.agentType !== onlyAgent) continue;
        if (onlyMarker !== undefined && source?.reinvestigateMarker !== onlyMarker) continue;

        const githubUrl = makeGithubLink(repoUrl, record.filePath, violation.lineNumbers);
        const owners = summarizeOwners(record);

        const hasOwner = !!owners.assignee || owners.teams.length > 0 || owners.oncall.length > 0;
        if (opts.requireOwner && !hasOwner) {
          droppedNoOwner++;
          continue;
        }

        const labels = [
          "security",
          `project:${projectId}`,
          `severity:${violation.severity}`,
          `slug:${violation.ruleSlug}`,
          `confidence:${violation.confidence}`,
        ];
        if (violation.revalidation?.verdict)
          labels.push(`revalidation:${violation.revalidation.verdict}`);
        for (const t of owners.teams.slice(0, 3)) labels.push(`owning-team:${t.slug}`);
        if (!hasOwner) labels.push("missing-owner");

        if (owners.assignee) withAssignee++;
        if (owners.teams.length > 0) withTeam++;

        violations.push({
          title: `[${violation.severity}] ${violation.title}`,
          description: buildDescription(violation, record, projectId, owners, githubUrl),
          severity: violation.severity,
          labels,
          assignee: owners.assignee,
          metadata: {
            projectId,
            filePath: record.filePath,
            lineNumbers: violation.lineNumbers,
            severity: violation.severity,
            ruleSlug: violation.ruleSlug,
            confidence: violation.confidence,
            discoveredAt: latest.investigatedAt,
            runId: latest.runId,
            revalidation: violation.revalidation
              ? {
                  verdict: violation.revalidation.verdict,
                  reasoning: violation.revalidation.reasoning,
                }
              : undefined,
            githubUrl,
            owners,
          },
        });
        emitted++;
      }
    }
    console.log(`  [${projectId}] ${emitted} violation(s)`);
  }

  // Sort: severity ascending (CRITICAL first), then project, then file
  violations.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.metadata.severity];
    const sb = SEVERITY_ORDER[b.metadata.severity];
    if (sa !== sb) return sa - sb;
    if (a.metadata.projectId !== b.metadata.projectId)
      return a.metadata.projectId.localeCompare(b.metadata.projectId);
    return a.metadata.filePath.localeCompare(b.metadata.filePath);
  });

  if (format === "md-dir") {
    writeMdDir(violations, opts.out!);
  } else {
    writeJson(violations, opts.out);
  }

  if (violations.length > 0) {
    const pct = (n: number) => `${((n / violations.length) * 100).toFixed(0)}%`;
    console.log();
    console.log(`${BOLD}Ownership coverage:${RESET}`);
    console.log(`  with assignee:    ${withAssignee}/${violations.length} (${pct(withAssignee)})`);
    console.log(`  with owning team: ${withTeam}/${violations.length} (${pct(withTeam)})`);
    if (droppedNoOwner > 0) {
      console.log(`  ${YELLOW}dropped (--require-owner): ${droppedNoOwner}${RESET}`);
    }
  }
}
