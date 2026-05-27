import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

/**
 * Direct `process.env.X` access scattered through the codebase is a
 * common conformance issue — most projects standardize on a config
 * module so missing/typo'd vars fail loudly at startup, not at runtime.
 */
export const processEnvDirectMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "process-env-direct",
  description:
    "Direct `process.env.X` access — projects with a config layer should route through it for typo-safety and startup-time validation.",
  filePatterns: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  examples: [
    `const url = process.env.DATABASE_URL;`,
    `if (process.env.NODE_ENV === "production") {}`,
    `process.env["API_KEY"]`,
    `const port = Number(process.env.PORT);`,
  ],
  match(content, _filePath) {
    return regexMatcher(
      "process-env-direct",
      [
        { regex: /process\.env\.[A-Z_][A-Z0-9_]*/, label: "process.env property" },
        { regex: /process\.env\[["'][A-Z_][A-Z0-9_]*["']\]/, label: "process.env bracket access" },
      ],
      content,
    );
  },
};
