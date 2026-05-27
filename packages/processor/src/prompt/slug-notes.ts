/**
 * Per-slug one-line notes — pulled into the prompt only when the matched
 * slug appears in the current batch. Format: "what to check before
 * flagging." One sentence per slug.
 *
 * Intentionally empty at fork-time — the deepsec security slug notes were
 * removed during the audit pivot. Rule slugs are now defined by the
 * matchers (and the project's own rule sources), so notes should be
 * authored per-matcher rather than centrally curated here. Populate as
 * audit experience accrues if cross-matcher reviewer-instinct sentences
 * prove valuable.
 */

const SLUG_NOTES: Record<string, string> = {};

export function noteForSlug(slug: string): string | undefined {
  return SLUG_NOTES[slug];
}
