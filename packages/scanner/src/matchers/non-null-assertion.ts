import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

/**
 * TS non-null assertion (`!`) is a signal: the author believed an
 * invariant the type system can't verify. The agent should check that
 * the invariant is documented or, better, refactored away.
 */
export const nonNullAssertionMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "non-null-assertion",
  description:
    "TypeScript non-null assertion operator (`!`) — the author is overriding the type system; agent confirms the invariant is real and documented.",
  filePatterns: ["**/*.{ts,tsx}"],
  examples: [`const x = arr.find(p)!;`, `user!.email`, `el!.focus();`, `(window as any).foo!`],
  match(content, _filePath) {
    return regexMatcher(
      "non-null-assertion",
      [
        // `<word|)|]>!` followed by `.`, `[`, `(`, `;`, `,`, `)`, `}`, whitespace,
        // or end-of-line. Excludes `!=` / `!==` via the negative lookahead.
        { regex: /[\w)\]]!(?![=])(?=[.[(;,\s)}]|$)/, label: "non-null assertion" },
      ],
      content,
    );
  },
};
