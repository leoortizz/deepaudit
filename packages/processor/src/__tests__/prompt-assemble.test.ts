import { describe, expect, it } from "vitest";
import { assemblePrompt, CORE_PROMPT, TECH_HIGHLIGHTS } from "../prompt/index.js";

describe("assemblePrompt", () => {
  it("returns just the core prompt when no tech is detected and no batch slugs", () => {
    const { prompt, meta } = assemblePrompt({ detectedTags: [], batchSlugs: [] });
    expect(prompt).toBe(CORE_PROMPT);
    expect(meta.includedTags).toEqual([]);
    expect(meta.droppedToFallback).toBe(false);
  });

  it("ignores unknown tech tags", () => {
    const { prompt, meta } = assemblePrompt({
      detectedTags: ["bogus-framework", "another-fake"],
      batchSlugs: [],
    });
    expect(prompt).toBe(CORE_PROMPT);
    expect(meta.includedTags).toEqual([]);
  });

  it("appends projectInfo and promptAppend at the end, in that order", () => {
    const { prompt } = assemblePrompt({
      detectedTags: [],
      batchSlugs: [],
      projectInfo: "## Project conventions\n\nAuth helper is `requireUser()`.",
      promptAppend: "Custom: also flag any logger that swallows errors.",
    });
    expect(prompt).toContain("## Project conventions");
    expect(prompt).toContain("Custom: also flag any logger");
    // promptAppend follows projectInfo
    expect(prompt.indexOf("Custom: also flag")).toBeGreaterThan(
      prompt.indexOf("## Project conventions"),
    );
    // No bespoke wrapper heading — we use a horizontal rule so user
    // headers don't collide with one of ours.
    expect(prompt).not.toContain("## Project context");
  });

  it("highlights table is intentionally empty post-fork", () => {
    // The deepsec security highlights were removed during the audit pivot;
    // repopulate with conformance-focused highlights as the project
    // matures. Update this test when that happens.
    expect(TECH_HIGHLIGHTS).toEqual([]);
  });
});
