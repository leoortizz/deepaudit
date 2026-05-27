/**
 * Public SDK surface for `deepaudit` configuration files and plugin authors.
 *
 * Users write:
 *   import { defineConfig } from "deepaudit/config";
 *
 * Plugin authors writing matchers can also import `regexMatcher` and the
 * matcher-related types from here.
 */

export type {
  AgentPluginRef,
  AnalysisEntry,
  CandidateMatch,
  Confidence,
  // Config
  DeepauditConfig,
  // Plugin contract
  DeepauditPlugin,
  ExecutorLaunchRequest,
  ExecutorProvider,
  ExecutorStatus,
  FileRecord,
  FileStatus,
  MatcherPlugin,
  NoiseTier,
  NotifierPlugin,
  NotifyParams,
  OwnershipApprover,
  OwnershipContributor,
  OwnershipData,
  OwnershipEscalationTeam,
  OwnershipProvider,
  PeopleProvider,
  Person,
  ProjectConfig,
  ProjectDeclaration,
  RefusalReport,
  Revalidation,
  RevalidationVerdict,
  RunMeta,
  Severity,
  Triage,
  TriagePriority,
  // Domain types
  Violation,
  ViolationNotification,
} from "@deepaudit/core";
export {
  defineConfig,
  findProject,
  getConfig,
  getConfigPath,
  getRegistry,
  PluginRegistry,
  setLoadedConfig,
} from "@deepaudit/core";

export { createDefaultRegistry, MatcherRegistry, regexMatcher } from "@deepaudit/scanner";
