import { MatcherRegistry } from "../matcher-registry.js";
import { anyTypeMatcher } from "./any-type.js";
import { consoleLogMatcher } from "./console-log.js";
import { defaultExportMatcher } from "./default-export.js";
import { nonNullAssertionMatcher } from "./non-null-assertion.js";
import { processEnvDirectMatcher } from "./process-env-direct.js";
import { todoNoLinkMatcher } from "./todo-no-link.js";

/**
 * Default conformance-matcher registry.
 *
 * This is a deliberately small starter set covering broad, language-
 * agnostic code-hygiene patterns. The previous deepsec security matchers
 * (~200 of them) were removed during the audit pivot — that surface area
 * is now expressed through the project's own RULES.md and per-project
 * conformance matchers contributed via plugins.
 *
 * Add new matchers here only when the pattern is broadly useful across
 * projects. Project-specific conventions belong in a plugin (see
 * `docs/plugins.md`) or directly in RULES.md as prose rules.
 */
export function createDefaultRegistry(): MatcherRegistry {
  const registry = new MatcherRegistry();
  registry.register(consoleLogMatcher);
  registry.register(todoNoLinkMatcher);
  registry.register(nonNullAssertionMatcher);
  registry.register(anyTypeMatcher);
  registry.register(processEnvDirectMatcher);
  registry.register(defaultExportMatcher);
  return registry;
}
