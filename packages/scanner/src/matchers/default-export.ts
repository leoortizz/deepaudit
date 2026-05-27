import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

/**
 * `export default` is a common point of friction in codebases that
 * standardize on named exports (better refactoring, better IDE
 * autocomplete, more searchable). Many projects ban it in a style
 * guide but the rule is easy to forget. The agent confirms whether
 * the project actually has this convention before flagging.
 */
export const defaultExportMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "default-export",
  description:
    "`export default` statements — flag for projects that prefer named exports. Agent confirms the convention before reporting.",
  filePatterns: ["**/*.{ts,tsx,js,jsx,mjs}"],
  examples: [
    `export default function App() {}`,
    `export default class Foo {}`,
    `export default { foo };`,
    `export default someValue;`,
  ],
  match(content, _filePath) {
    return regexMatcher(
      "default-export",
      [{ regex: /^\s*export\s+default\b/, label: "default export" }],
      content,
    );
  },
};
