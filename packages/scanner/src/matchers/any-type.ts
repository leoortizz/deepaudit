import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

export const anyTypeMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "any-type",
  description:
    "Explicit `: any` annotations or `as any` casts in TypeScript — often a signal the type was hard to express, but easy to leave behind once the code stabilizes.",
  filePatterns: ["**/*.{ts,tsx}"],
  examples: [
    `function f(x: any) {}`,
    `const data: any = JSON.parse(s);`,
    `(payload as any).foo`,
    `let m: any[] = [];`,
    `: Record<string, any>`,
  ],
  match(content, _filePath) {
    return regexMatcher(
      "any-type",
      [
        // `: any` annotation including in `Record<string, any>` and union/generic positions
        { regex: /[:,<|&]\s*any\b/, label: "any in type position" },
        { regex: /\bas\s+any\b/, label: "as any cast" },
      ],
      content,
    );
  },
};
