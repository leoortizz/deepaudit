/**
 * Public SDK surface for `deepsec` configuration files and plugin authors.
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
  DeepsecConfig,
  // Plugin contract
  DeepsecPlugin,
  ExecutorLaunchRequest,
  ExecutorProvider,
  ExecutorStatus,
  FileRecord,
  FileStatus,
  // Domain types
  Finding,
  FindingNotification,
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
