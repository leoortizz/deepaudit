import { describe, expect, it } from "vitest";
import { revalidationSchema, violationSchema } from "../schemas.js";

describe("severity levels", () => {
  const baseViolation = {
    ruleSlug: "other-data-loss",
    title: "Data loss on concurrent writes",
    description: "Race condition causes data loss",
    lineNumbers: [42],
    recommendation: "Add locking",
    confidence: "high" as const,
  };

  it("accepts CRITICAL severity", () => {
    expect(() => violationSchema.parse({ ...baseViolation, severity: "CRITICAL" })).not.toThrow();
  });

  it("accepts HIGH severity", () => {
    expect(() => violationSchema.parse({ ...baseViolation, severity: "HIGH" })).not.toThrow();
  });

  it("accepts MEDIUM severity", () => {
    expect(() => violationSchema.parse({ ...baseViolation, severity: "MEDIUM" })).not.toThrow();
  });

  it("accepts NIT severity", () => {
    expect(() => violationSchema.parse({ ...baseViolation, severity: "NIT" })).not.toThrow();
  });

  it("rejects empty severity", () => {
    expect(() => violationSchema.parse({ ...baseViolation, severity: "" })).toThrow();
  });
});

describe("revalidation adjustedSeverity", () => {
  const baseRevalidation = {
    verdict: "true-positive" as const,
    reasoning: "Confirmed exploitable",
    revalidatedAt: "2026-04-01T00:00:00Z",
    runId: "run1",
    model: "claude-opus-4-6",
  };

  it("accepts adjustedSeverity HIGH", () => {
    expect(() =>
      revalidationSchema.parse({ ...baseRevalidation, adjustedSeverity: "HIGH" }),
    ).not.toThrow();
  });

  it("accepts adjustedSeverity MEDIUM", () => {
    expect(() =>
      revalidationSchema.parse({ ...baseRevalidation, adjustedSeverity: "MEDIUM" }),
    ).not.toThrow();
  });

  it("accepts no adjustedSeverity", () => {
    expect(() => revalidationSchema.parse(baseRevalidation)).not.toThrow();
  });

  it("accepts adjustedSeverity NIT", () => {
    expect(() =>
      revalidationSchema.parse({ ...baseRevalidation, adjustedSeverity: "NIT" }),
    ).not.toThrow();
  });
});

describe("violation with triage and revalidation", () => {
  it("accepts a MEDIUM violation with full triage and revalidation", () => {
    const violation = {
      severity: "MEDIUM",
      ruleSlug: "other-race-condition",
      title: "Race condition in cache invalidation",
      description: "Concurrent requests can see stale data",
      lineNumbers: [100, 105],
      recommendation: "Use atomic operations",
      confidence: "medium",
      triage: {
        priority: "P1",
        exploitability: "moderate",
        impact: "high",
        reasoning: "Could cause data inconsistency in production",
        triagedAt: "2026-04-01T12:00:00Z",
        model: "claude-sonnet-4-6",
      },
      revalidation: {
        verdict: "true-positive",
        reasoning: "Confirmed: no locking around cache update",
        revalidatedAt: "2026-04-01T13:00:00Z",
        runId: "run2",
        model: "claude-opus-4-6",
      },
    };
    expect(() => violationSchema.parse(violation)).not.toThrow();
  });

  it("accepts a HIGH violation with adjusted severity from revalidation", () => {
    const violation = {
      severity: "HIGH",
      ruleSlug: "other-data-corruption",
      title: "Silent data corruption on large payloads",
      description: "Buffer overflow truncates data without error",
      lineNumbers: [200],
      recommendation: "Add size validation",
      confidence: "high",
      revalidation: {
        verdict: "true-positive",
        reasoning: "Confirmed: payloads over 1MB are silently truncated",
        adjustedSeverity: "HIGH",
        revalidatedAt: "2026-04-01T14:00:00Z",
        runId: "run3",
        model: "claude-opus-4-6",
      },
    };
    expect(() => violationSchema.parse(violation)).not.toThrow();
  });
});
