import type { MatcherPlugin } from "../types.js";
import { regexMatcher } from "./utils.js";

export const consoleLogMatcher: MatcherPlugin = {
  noiseTier: "normal" as const,
  slug: "console-log",
  description:
    "Calls to console.log/info/warn/error/debug in committed source code — usually a debugging leftover or a sign the project's logger isn't being used.",
  filePatterns: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  examples: [
    `console.log("debug");`,
    `console.error(err);`,
    `console.warn("deprecated");`,
    `console.debug({state});`,
    `console.info("starting");`,
  ],
  match(content, _filePath) {
    return regexMatcher(
      "console-log",
      [{ regex: /\bconsole\.(log|info|warn|error|debug)\s*\(/, label: "console call" }],
      content,
    );
  },
};
