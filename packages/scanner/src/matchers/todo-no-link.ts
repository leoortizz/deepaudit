import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

/**
 * Flags TODO/FIXME/XXX/HACK comments without a URL or issue reference on
 * the same line. The agent's job is to confirm the comment is current
 * and the work is actually unscheduled — many TODOs survive long past
 * the situation they describe.
 */
export const todoNoLinkMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "todo-no-link",
  description:
    "TODO/FIXME/XXX/HACK comments without a linked issue or URL — easy to lose track of.",
  filePatterns: ["**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,rb,java,kt,cs,php,swift}"],
  examples: [
    `// TODO: fix this later`,
    `// FIXME handle the empty case`,
    `# XXX revisit when we have rate limits`,
    `// HACK around the broken API`,
  ],
  match(content, _filePath) {
    return regexMatcher(
      "todo-no-link",
      [
        {
          // (?!.*(?:https?://|#\d+|[A-Z]{2,}-\d+)) — fails when an issue
          // link, hash-number ref, or PROJECT-123-style ID appears on
          // the same line. Matches TODO/FIXME/XXX/HACK as a tag with
          // common punctuation.
          regex: /\b(TODO|FIXME|XXX|HACK)\b(?![^\n]*?(?:https?:\/\/|#\d+|[A-Z]{2,}-\d+))/,
          label: "unlinked work marker",
        },
      ],
      content,
    );
  },
};
