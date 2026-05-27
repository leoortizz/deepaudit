/**
 * Per-tech audit highlights. Each entry is a terse bullet list naming the
 * high-signal patterns worth checking on a project that uses this tech —
 * things a competent reviewer would notice that aren't reducible to a
 * single regex.
 *
 * Hard rule: 3–6 bullet lines, ~80–200 tokens. CI snapshot tests assert
 * size; reviewers should push back on tutorial-style additions.
 *
 * Intentionally empty at fork-time — the deepsec security highlights were
 * removed during the audit pivot. Repopulate this with conformance-focused
 * highlights as audit experience accrues. Until then, project-specific
 * RULES.md provides all framework guidance.
 */

export interface TechHighlight {
  /** Tag from `detectTech()` this highlight applies to. */
  tag: string;
  /** Human-readable name used in the prompt header. */
  title: string;
  /**
   * Languages this highlight is relevant to. Used by the assembler to
   * scope a batch's highlights to the files actually in the batch — a
   * batch of Python files in a polyglot Next.js+Django repo doesn't
   * need Next.js highlights, even though the project as a whole has
   * them. Use the canonical language names from
   * `LANGUAGE_EXTENSIONS` in `@deepaudit/scanner`: `typescript`,
   * `javascript`, `python`, `php`, `ruby`, `go`, `rust`, `java`,
   * `kotlin`, `csharp`, `lua`, `terraform`. Multiple languages allowed
   * (e.g. JS frameworks tag both `typescript` and `javascript`).
   */
  languages: string[];
  /** Bullet list — short lines, no prose. */
  bullets: string[];
}

export const TECH_HIGHLIGHTS: TechHighlight[] = [];

const HIGHLIGHTS_BY_TAG = new Map<string, TechHighlight>(TECH_HIGHLIGHTS.map((h) => [h.tag, h]));

export function highlightForTag(tag: string): TechHighlight | undefined {
  return HIGHLIGHTS_BY_TAG.get(tag);
}
