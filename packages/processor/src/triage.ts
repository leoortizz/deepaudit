import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { FileRecord, Severity, TriagePriority, Violation } from "@deepaudit/core";
import {
  completeRun,
  createRunMeta,
  dataDir,
  defaultConcurrency,
  loadAllFileRecords,
  readProjectConfig,
  writeFileRecord,
  writeRunMeta,
} from "@deepaudit/core";

const TRIAGE_BATCH_SIZE = 30;

interface TriageVerdict {
  title: string;
  priority: TriagePriority;
  reasoning: string;
}

interface TriageProgress {
  type: "batch_started" | "batch_complete" | "all_complete";
  message: string;
}

export async function triage(params: {
  projectId: string;
  severity?: Severity;
  force?: boolean;
  limit?: number;
  concurrency?: number;
  model?: string;
  onProgress?: (progress: TriageProgress) => void;
}): Promise<{ triaged: number; p0: number; p1: number; p2: number; skip: number }> {
  const { projectId, severity = "MEDIUM", force = false, model = "claude-sonnet-4-6" } = params;

  const emit = (progress: TriageProgress) => {
    try {
      params.onProgress?.(progress);
    } catch {}
  };

  const project = readProjectConfig(projectId);

  let projectRules = "";
  try {
    projectRules = fs.readFileSync(path.join(dataDir(projectId), "RULES.md"), "utf-8");
  } catch {}

  const startLoad = Date.now();
  emit({ type: "batch_started", message: `Loading file records for ${projectId}...` });
  const records = loadAllFileRecords(projectId);
  emit({
    type: "batch_complete",
    message: `Loaded ${records.length} records in ${((Date.now() - startLoad) / 1000).toFixed(1)}s`,
  });

  emit({ type: "batch_started", message: `Filtering ${severity} violations...` });
  const toTriage: { record: FileRecord; violation: Violation }[] = [];
  let totalViolations = 0;
  let alreadyTriaged = 0;

  for (const record of records) {
    for (const violation of record.violations) {
      if (violation.severity !== severity) continue;
      totalViolations++;
      if (!force && violation.triage) {
        alreadyTriaged++;
        continue;
      }
      toTriage.push({ record, violation });
    }
  }

  if (params.limit && toTriage.length > params.limit) {
    toTriage.splice(params.limit);
  }

  emit({
    type: "batch_complete",
    message: `${totalViolations} ${severity} violations total, ${alreadyTriaged} already triaged, ${toTriage.length} to process`,
  });

  if (toTriage.length === 0) {
    emit({ type: "all_complete", message: "No violations to triage" });
    return { triaged: 0, p0: 0, p1: 0, p2: 0, skip: 0 };
  }

  const meta = createRunMeta({
    projectId,
    rootPath: project.rootPath,
    type: "revalidate",
    processorConfig: { agentType: "triage", model, modelConfig: {} },
  });
  writeRunMeta(meta);

  let totalTriaged = 0;
  let p0 = 0,
    p1 = 0,
    p2 = 0,
    skip = 0;
  let batchesCompleted = 0;
  let batchesInFlight = 0;
  const concurrency = params.concurrency ?? defaultConcurrency();

  const batches: (typeof toTriage)[] = [];
  for (let i = 0; i < toTriage.length; i += TRIAGE_BATCH_SIZE) {
    batches.push(toTriage.slice(i, i + TRIAGE_BATCH_SIZE));
  }

  async function triageBatch(batch: typeof toTriage, batchIdx: number) {
    batchesInFlight++;
    emit({
      type: "batch_started",
      message: `Triaging batch ${batchIdx + 1}/${batches.length} (${batch.length} violations, ${batchesInFlight} in flight)`,
    });

    const violationsList = batch
      .map((item, idx) => {
        return `### ${idx + 1}. ${item.violation.title}
- **File:** \`${item.record.filePath}\`
- **Severity:** ${item.violation.severity}
- **Slug:** ${item.violation.ruleSlug}
- **Lines:** ${item.violation.lineNumbers.join(", ")}
- **Confidence:** ${item.violation.confidence}
- **Description:** ${item.violation.description}`;
      })
      .join("\n\n");

    const prompt = `You are a triage expert. Given a list of rule-conformance violations, classify each by priority for remediation.

${projectRules ? `## Project Context (summary only)\n\n${projectRules.slice(0, 2000)}\n` : ""}

## Violations to Triage

${violationsList}

## Classification Criteria

**P0 — Fix immediately:** Breaks a load-bearing rule in a way likely to cause incidents (data loss, broken builds, leaked secrets). Wide blast radius. Should block the change.

**P1 — Fix soon:** Clear violation of a stated rule with material impact, but contained — limited to one module, or only bites under specific conditions.

**P2 — Fix eventually:** Low blast radius. Defensive or stylistic violations, soft preferences clearly stated in the rules, gradual cleanup.

**skip — Not actionable:** False positive, already addressed elsewhere in the file, test-only code, or too vague to act on.

## Output

\`\`\`json
[
  {
    "title": "exact title",
    "priority": "P0" | "P1" | "P2" | "skip",
    "reasoning": "1-2 sentences"
  }
]
\`\`\``;

    try {
      let resultText = "";

      for await (const message of query({
        prompt,
        options: {
          allowedTools: [],
          permissionMode: "dontAsk",
          maxTurns: 1,
          model,
        },
      })) {
        const msg = message as Record<string, any>;
        if (msg.type === "result" && msg.subtype === "success") {
          resultText = msg.result;
        }
      }

      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : resultText.trim();
      let verdicts: TriageVerdict[] = [];
      try {
        verdicts = JSON.parse(jsonStr);
      } catch {}

      for (const verdict of verdicts) {
        const item = batch.find((b) => b.violation.title === verdict.title);
        if (!item) continue;

        item.violation.triage = {
          priority: verdict.priority,
          reasoning: verdict.reasoning,
          triagedAt: new Date().toISOString(),
          model,
        };
        totalTriaged++;
        if (verdict.priority === "P0") p0++;
        else if (verdict.priority === "P1") p1++;
        else if (verdict.priority === "P2") p2++;
        else skip++;
      }

      const dirtyRecords = new Set(batch.map((b) => b.record));
      for (const record of dirtyRecords) {
        writeFileRecord(record);
      }

      batchesInFlight--;
      batchesCompleted++;
      emit({
        type: "batch_complete",
        message: `Batch ${batchIdx + 1}/${batches.length}: ${verdicts.length} triaged (P0:${verdicts.filter((v) => v.priority === "P0").length} P1:${verdicts.filter((v) => v.priority === "P1").length} P2:${verdicts.filter((v) => v.priority === "P2").length} skip:${verdicts.filter((v) => v.priority === "skip").length}) (${batchesInFlight} in flight, ${batchesCompleted}/${batches.length} done)`,
      });
    } catch (err) {
      batchesInFlight--;
      batchesCompleted++;
      emit({
        type: "batch_complete",
        message: `Batch ${batchIdx + 1}/${batches.length} failed: ${err instanceof Error ? err.message : String(err)} (${batchesInFlight} in flight, ${batchesCompleted}/${batches.length} done)`,
      });
    }
  }

  if (concurrency <= 1) {
    for (let i = 0; i < batches.length; i++) {
      await triageBatch(batches[i], i);
    }
  } else {
    let nextIdx = 0;
    async function worker() {
      while (nextIdx < batches.length) {
        const idx = nextIdx++;
        await triageBatch(batches[idx], idx);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, batches.length) }, () => worker()),
    );
  }

  completeRun(projectId, meta.runId, "done", {
    violationsRevalidated: totalTriaged,
  });

  emit({
    type: "all_complete",
    message: `Triage complete: ${totalTriaged} violations — P0:${p0} P1:${p1} P2:${p2} skip:${skip}`,
  });

  return { triaged: totalTriaged, p0, p1, p2, skip };
}
