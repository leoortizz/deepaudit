import type { AgentPlugin, InvestigateParams, RevalidateParams } from "../agents/types.js";

/**
 * Test fixture: deterministic AgentPlugin that records calls and returns
 * canned data. Lets `process()` / `revalidate()` run end-to-end without
 * any AI provider.
 *
 * Customise per-batch behaviour by passing `investigateImpl` /
 * `revalidateImpl` callbacks; the defaults emit one HIGH violation per
 * candidate-bearing file and a `true-positive` verdict per violation.
 */
interface StubAgentOptions {
  type?: string;
  investigateImpl?: (
    params: InvestigateParams,
  ) => ReturnType<NonNullable<AgentPlugin["investigate"]>>;
  revalidateImpl?: (params: RevalidateParams) => ReturnType<NonNullable<AgentPlugin["revalidate"]>>;
}

interface StubAgentCallLog {
  investigateCalls: InvestigateParams[];
  revalidateCalls: RevalidateParams[];
}

export class StubAgent implements AgentPlugin {
  readonly type: string;
  readonly calls: StubAgentCallLog = { investigateCalls: [], revalidateCalls: [] };
  private readonly investigateImpl?: StubAgentOptions["investigateImpl"];
  private readonly revalidateImpl?: StubAgentOptions["revalidateImpl"];

  constructor(opts: StubAgentOptions = {}) {
    this.type = opts.type ?? "stub";
    this.investigateImpl = opts.investigateImpl;
    this.revalidateImpl = opts.revalidateImpl;
  }

  async *investigate(params: InvestigateParams) {
    this.calls.investigateCalls.push(params);
    if (this.investigateImpl) {
      return yield* this.investigateImpl(params);
    }
    return {
      results: params.batch.map((rec) => ({
        filePath: rec.filePath,
        violations: rec.candidates.length
          ? [
              {
                severity: "HIGH" as const,
                ruleSlug: rec.candidates[0].ruleSlug,
                title: `stub violation for ${rec.filePath}`,
                description: "stub investigation result",
                lineNumbers: rec.candidates[0].lineNumbers ?? [1],
                recommendation: "stub: fix it",
                confidence: "medium" as const,
              },
            ]
          : [],
      })),
      meta: {
        durationMs: 1,
        durationApiMs: 1,
        numTurns: 1,
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
      },
    };
  }

  async *revalidate(params: RevalidateParams) {
    this.calls.revalidateCalls.push(params);
    if (this.revalidateImpl) {
      return yield* this.revalidateImpl(params);
    }
    return {
      verdicts: params.batch.flatMap((rec) =>
        rec.violations.map((f) => ({
          filePath: rec.filePath,
          title: f.title,
          verdict: "true-positive" as const,
          reasoning: "stub: confirmed",
        })),
      ),
      meta: {
        durationMs: 1,
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
      },
    };
  }
}
