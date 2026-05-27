import type { Severity } from "@deepaudit/core";
import { describe, expect, it } from "vitest";
import { formatCount, formatDuration, severityColor } from "../formatters.js";

describe("severityColor", () => {
  it("returns red for CRITICAL", () => {
    expect(severityColor("CRITICAL")).toBe("\x1b[31m");
  });

  it("returns yellow for HIGH", () => {
    expect(severityColor("HIGH")).toBe("\x1b[33m");
  });

  it("returns cyan for MEDIUM", () => {
    expect(severityColor("MEDIUM")).toBe("\x1b[36m");
  });

  it("returns bright-black for NIT", () => {
    expect(severityColor("NIT")).toBe("\x1b[90m");
  });

  it("returns a color for every severity level", () => {
    const severities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "NIT"];
    for (const sev of severities) {
      expect(severityColor(sev)).toBeTruthy();
    }
  });
});

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(59000)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90_000)).toBe("1m 30s");
    expect(formatDuration(3_540_000)).toBe("59m 0s");
  });

  it("formats hours", () => {
    expect(formatDuration(3_661_000)).toBe("1h 1m");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("formatCount", () => {
  it("pluralizes correctly", () => {
    expect(formatCount(0, "file")).toBe("0 files");
    expect(formatCount(1, "file")).toBe("1 file");
    expect(formatCount(2, "file")).toBe("2 files");
  });
});
