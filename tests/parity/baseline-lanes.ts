import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { spawn } from "node:child_process"
import {
  DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH,
  INSTALLED_MODE_LANE_NAME,
  deriveInstalledModeLaneCoverage,
  loadInstalledModeProofArtifact,
  resolveInstalledModeArtifactPath,
} from "../../src/tests/integration/helpers/installed-mode-parity.ts"
import {
  SECONDARY_PARITY_MANIFEST_PATH,
  createSecondaryParityManifest,
  validateSecondaryParityManifest,
  type SecondaryParityLaneDefinition,
  type SecondaryParityManifest,
  type SecondaryParitySurfaceContract,
} from "./secondary-lanes.ts"
import {
  MCP_PARITY_ARTIFACT_PATH,
  MCP_PARITY_RECORDING_PATH,
  MCP_PARITY_REPORT_PATH,
  createMcpParityReport,
  writeMcpParityArtifacts,
  type McpParityReport,
} from "./mcp-parity.ts"
import {
  WORKFLOW_PARITY_ARTIFACT_PATH,
  WORKFLOW_PARITY_RECORDING_PATH,
  WORKFLOW_PARITY_REPORT_PATH,
  createWorkflowParityReport,
  writeWorkflowParityArtifacts,
  type WorkflowParityReport,
} from "./workflow-parity.ts"
import {
  createSecondarySurfaceInventory,
  validateSecondarySurfaceInventory,
  type RebrandDriftFinding,
  type SecondarySurfaceInventory,
} from "./secondary-surface-inventory.ts"

export const BASELINE_REPORT_VERSION = 4 as const
export const BASELINE_REPORT_PATH = "tests/parity/artifacts/baseline-report.json" as const
export const PARITY_MANIFEST_PATH = "tests/fixtures/parity-web-task-manifest.json" as const
export const DEFAULT_REPO_MODE_PARITY_ARTIFACT_PATH = "tests/fixtures/recordings/repo-mode-parity-web-task.json" as const
export const REPO_MODE_LANE_NAME = "repo-mode-coding-loop" as const

export const PROOF_CLASSES = [
  "smoke",
  "repo-infra",
  "installed-binary",
  "live-spot-check",
  "uncovered-coding-loop",
] as const

export const LANE_STATUSES = ["passed", "failed", "skipped", "timed_out"] as const
export const PARITY_SCOPES = ["repo-mode", "installed-mode", "live-only", "partial"] as const
export const SUMMARY_VERDICTS = ["failing", "partial", "covered"] as const
export const MANIFEST_PROOF_STATUSES = ["covered", "uncovered"] as const
export const MANIFEST_COVERAGE_STATUSES = ["covered", "partial", "not-covered"] as const
export const REPO_MODE_PHASES = ["inspect", "edit", "test", "dev-server", "browser"] as const

export type ProofClass = (typeof PROOF_CLASSES)[number]
export type LaneStatus = (typeof LANE_STATUSES)[number]
export type ParityScope = (typeof PARITY_SCOPES)[number]
export type SummaryVerdict = (typeof SUMMARY_VERDICTS)[number]
export type ManifestProofStatus = (typeof MANIFEST_PROOF_STATUSES)[number]
export type ManifestCoverageStatus = (typeof MANIFEST_COVERAGE_STATUSES)[number]
export type RepoModePhaseName = (typeof REPO_MODE_PHASES)[number]

export interface BaselineLaneDefinition {
  name: string
  target: string
  runner: "node-script" | "node-test" | "recorded-artifact"
  proofClass: ProofClass
  parityScope: ParityScope
  provesCodingLoop: boolean
  timeoutMs: number
  skip: "never" | "requires-live-env" | "requires-smoke-binary"
  description: string
}

export interface RepoModeCommandDiagnostic {
  command: string
  exitCode: number | null
  stdoutSnippet?: string
  stderrSnippet?: string
}

export interface RepoModeBrowserDiagnostic {
  assertion: string
  expected: string
  actual: string
}

export interface RepoModePhaseResult {
  phase: RepoModePhaseName
  status: "passed" | "failed"
  summary: string
  command?: RepoModeCommandDiagnostic
  browser?: RepoModeBrowserDiagnostic
}

export interface BaselineLaneResult {
  name: string
  target: string
  runner: BaselineLaneDefinition["runner"]
  proofClass: ProofClass
  parityScope: ParityScope
  provesCodingLoop: boolean
  status: LaneStatus
  skipReason: string | null
  exitCode: number | null
  durationMs: number
  command: string[]
  artifactPath: string | null
  failedPhase: RepoModePhaseName | null
  phaseResults: RepoModePhaseResult[]
}

export interface ParityManifestCapability {
  name: string
  description: string
  observableCompletionCriteria: string[]
  proof: ManifestProofStatus
  currentGap: string
  laneCoverage: Record<string, ManifestCoverageStatus>
}

export interface ParityManifest {
  version: number
  fixtureId: string
  title: string
  capabilities: ParityManifestCapability[]
}

export interface UncoveredCapabilityReportRow {
  capabilityName: string
  proof: ManifestProofStatus
  uncovered: boolean
  currentGap: string
  observableCompletionCriteria: string[]
  coveringLaneNames: string[]
  partialLaneNames: string[]
  uncoveredLaneNames: string[]
}

export interface BaselineSummary {
  verdict: SummaryVerdict
  totalLanes: number
  passed: number
  failed: number
  skipped: number
  timedOut: number
  provesCodingLoop: boolean
  uncoveredLaneNames: string[]
  proofClassCounts: Record<ProofClass, number>
  uncoveredCapabilityNames: string[]
}

export interface RepoInstalledPhaseComparison {
  phase: RepoModePhaseName
  repoStatus: "passed" | "failed" | "missing"
  installedStatus: "passed" | "failed" | "missing"
  matches: boolean
}

export interface RepoInstalledComparison {
  repoLaneName: typeof REPO_MODE_LANE_NAME
  installedLaneName: typeof INSTALLED_MODE_LANE_NAME
  repoArtifactPath: string | null
  installedArtifactPath: string | null
  comparableWithoutRerun: boolean
  divergencePhases: RepoModePhaseName[]
  phaseComparisons: RepoInstalledPhaseComparison[]
}

export interface SecondaryParitySurfaceReportRow {
  id: string
  title: string
  inventoryStatus: SecondaryParitySurfaceContract["inventoryStatus"]
  releaseReadableStatus: "partial" | "covered" | "uncovered"
  requiredLaneNames: string[]
  optionalLaneNames: string[]
  existingRequiredLaneNames: string[]
  missingRequiredLaneNames: string[]
  presentFixturePaths: string[]
  plannedFixturePaths: string[]
  coverageGapIds: string[]
  uncoveredAreas: SecondaryParitySurfaceContract["coverageGaps"]
  reportPath: string
}

export interface SecondaryParitySummary {
  totalSurfaces: number
  partialSurfaces: number
  coveredSurfaces: number
  uncoveredSurfaces: number
  totalDriftFindings: number
  surfacesMissingReleaseReadableCoverage: string[]
}

export interface SecondaryParityReport {
  inventoryPath: string
  manifestPath: string
  inventoryVersion: SecondarySurfaceInventory["version"]
  manifestVersion: SecondaryParityManifest["version"]
  summary: SecondaryParitySummary
  surfaces: SecondaryParitySurfaceReportRow[]
  uncoveredSurfaces: SecondaryParitySurfaceReportRow[]
  driftFindings: RebrandDriftFinding[]
  inventory: SecondarySurfaceInventory
  manifest: SecondaryParityManifest
}

export interface McpParitySurfaceReportRow {
  id: "mcp"
  title: string
  inventoryStatus: SecondaryParitySurfaceContract["inventoryStatus"]
  releaseReadableStatus: "partial" | "covered" | "uncovered"
  requiredLaneNames: string[]
  optionalLaneNames: string[]
  existingRequiredLaneNames: string[]
  missingRequiredLaneNames: string[]
  presentFixturePaths: string[]
  plannedFixturePaths: string[]
  coverageGapIds: string[]
  uncoveredAreas: SecondaryParitySurfaceContract["coverageGaps"]
  reportPath: string
  parityArtifactPath: string
  recordingPath: string
  parityStatus: McpParityReport["status"]
  diagnostics: McpParityReport["diagnostics"]
}

export interface WorkflowParityReportRow {
  id: "workflow-bmad"
  title: string
  inventoryStatus: SecondaryParitySurfaceContract["inventoryStatus"]
  releaseReadableStatus: "partial" | "covered" | "uncovered"
  requiredLaneNames: string[]
  optionalLaneNames: string[]
  existingRequiredLaneNames: string[]
  missingRequiredLaneNames: string[]
  presentFixturePaths: string[]
  plannedFixturePaths: string[]
  coverageGapIds: string[]
  uncoveredAreas: SecondaryParitySurfaceContract["coverageGaps"]
  reportPath: string
  parityArtifactPath: string
  recordingPath: string
  parityStatus: WorkflowParityReport["status"]
  diagnostics: WorkflowParityReport["diagnostics"]
}

export interface BaselineReport {
  version: typeof BASELINE_REPORT_VERSION
  generatedAt: string
  cwd: string
  artifactPath: string
  summary: BaselineSummary
  lanes: BaselineLaneResult[]
  parityManifest: ParityManifest
  uncoveredCapabilities: UncoveredCapabilityReportRow[]
  repoInstalledComparison: RepoInstalledComparison
  secondaryParity: SecondaryParityReport
  mcpParity: McpParitySurfaceReportRow
  workflowParity: WorkflowParityReportRow
  reconciledFoundations: readonly typeof M113_RECONCILIATION[]
}

export interface RepoModeProofArtifact {
  version: number
  fixtureId: string
  laneName: typeof REPO_MODE_LANE_NAME
  artifactPath: string
  status: "passed" | "failed"
  phaseResults: RepoModePhaseResult[]
}

export const M113_RECONCILED_REQUIREMENT_IDS = ["R023", "R026"] as const

export const M113_RECONCILIATION = {
  milestoneId: "M113",
  requirementStatusById: {
    R023: "validated",
    R026: "validated",
  },
  summaryLabel: "closed foundation",
  reportAnnotation:
    "M113 cleanup requirements R023 and R026 are already validated closed foundation work, not an open parity gap for M114.",
} as const

const REPO_MODE_CAPABILITY_PHASE: Record<string, RepoModePhaseName> = {
  "inspect-repository-context": "inspect",
  "edit-application-code": "edit",
  "run-targeted-tests": "test",
  "manage-dev-server-lifecycle": "dev-server",
  "verify-browser-behavior": "browser",
}

export function getBaselineLanes(env: NodeJS.ProcessEnv = process.env): readonly BaselineLaneDefinition[] {
  const repoModeArtifactPath = env.GSD_REPO_MODE_PARITY_ARTIFACT?.trim() || DEFAULT_REPO_MODE_PARITY_ARTIFACT_PATH
  const installedModeArtifactPath = resolveInstalledModeArtifactPath(env)

  return [
    {
      name: "smoke-runner",
      target: "tests/smoke/run.ts",
      runner: "node-script",
      proofClass: "smoke",
      parityScope: "partial",
      provesCodingLoop: false,
      timeoutMs: 30_000,
      skip: "never",
      description: "Basic CLI startup and help/version smoke checks.",
    },
    {
      name: "fixtures-runner",
      target: "tests/fixtures/run.ts",
      runner: "node-script",
      proofClass: "uncovered-coding-loop",
      parityScope: "partial",
      provesCodingLoop: false,
      timeoutMs: 30_000,
      skip: "never",
      description: "Deterministic fixture replay coverage without proving the real coding loop.",
    },
    {
      name: "live-runner",
      target: "tests/live/run.ts",
      runner: "node-script",
      proofClass: "live-spot-check",
      parityScope: "live-only",
      provesCodingLoop: false,
      timeoutMs: 60_000,
      skip: "requires-live-env",
      description: "Live provider spot-checks gated behind explicit live-test opt-in.",
    },
    {
      name: "live-regression-runner",
      target: "tests/live-regression/run.ts",
      runner: "node-script",
      proofClass: "installed-binary",
      parityScope: "installed-mode",
      provesCodingLoop: false,
      timeoutMs: 60_000,
      skip: "requires-smoke-binary",
      description: "Installed-binary regression lane that validates packaged/runtime behavior.",
    },
    {
      name: "e2e-smoke",
      target: "src/tests/integration/e2e-smoke.test.ts",
      runner: "node-test",
      proofClass: "repo-infra",
      parityScope: "repo-mode",
      provesCodingLoop: false,
      timeoutMs: 60_000,
      skip: "never",
      description: "Repo-mode packaged CLI smoke coverage.",
    },
    {
      name: "e2e-headless",
      target: "src/tests/integration/e2e-headless.test.ts",
      runner: "node-test",
      proofClass: "repo-infra",
      parityScope: "repo-mode",
      provesCodingLoop: false,
      timeoutMs: 60_000,
      skip: "never",
      description: "Repo-mode headless execution and output contract coverage.",
    },
    {
      name: REPO_MODE_LANE_NAME,
      target: repoModeArtifactPath,
      runner: "recorded-artifact",
      proofClass: "repo-infra",
      parityScope: "repo-mode",
      provesCodingLoop: true,
      timeoutMs: 1_000,
      skip: "never",
      description: "Deterministic recorded repo/dev coding-loop proof with phase-local diagnostics and artifact-path coverage.",
    },
    {
      name: INSTALLED_MODE_LANE_NAME,
      target: installedModeArtifactPath,
      runner: "recorded-artifact",
      proofClass: "installed-binary",
      parityScope: "installed-mode",
      provesCodingLoop: true,
      timeoutMs: 1_000,
      skip: "never",
      description: "Deterministic recorded installed packaged coding-loop proof with phase-local diagnostics and artifact-path coverage.",
    },
  ] as const
}

export const BASELINE_LANES: readonly BaselineLaneDefinition[] = getBaselineLanes()

export function validateBaselineLaneDefinitions(
  lanes: readonly BaselineLaneDefinition[],
  options: { cwd?: string; requireTargets?: boolean } = {},
): void {
  const cwd = options.cwd ?? process.cwd()
  const seen = new Set<string>()

  for (const lane of lanes) {
    if (!lane.name || typeof lane.name !== "string") {
      throw new Error(`Invalid lane metadata: every lane must have a non-empty name`)
    }
    if (seen.has(lane.name)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: duplicate lane name`)
    }
    seen.add(lane.name)

    if (!PROOF_CLASSES.includes(lane.proofClass)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported proofClass ${String(lane.proofClass)}`)
    }
    if (!PARITY_SCOPES.includes(lane.parityScope)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported parityScope ${String(lane.parityScope)}`)
    }
    if (!lane.target || lane.target.startsWith("/") || lane.target.includes("..")) {
      throw new Error(`Invalid lane metadata for ${lane.name}: target must stay inside the repo (${lane.target})`)
    }
    if (lane.timeoutMs <= 0 || !Number.isFinite(lane.timeoutMs)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: timeoutMs must be a positive finite number`)
    }
    if (!["node-script", "node-test", "recorded-artifact"].includes(lane.runner)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported runner ${String(lane.runner)}`)
    }
    if (!["never", "requires-live-env", "requires-smoke-binary"].includes(lane.skip)) {
      throw new Error(`Invalid lane metadata for ${lane.name}: unsupported skip policy ${String(lane.skip)}`)
    }

    if (options.requireTargets) {
      const absoluteTarget = join(cwd, lane.target)
      if (!existsSync(absoluteTarget)) {
        throw new Error(`Missing lane target for ${lane.name}: ${lane.target}`)
      }
    }
  }
}

export function resolveLaneCommand(lane: BaselineLaneDefinition): string[] {
  if (lane.runner === "node-script") {
    return ["--experimental-strip-types", lane.target]
  }
  if (lane.runner === "recorded-artifact") {
    return ["artifact", lane.target]
  }

  return [
    "--import",
    "./src/resources/extensions/gsd/tests/resolve-ts.mjs",
    "--experimental-strip-types",
    "--test",
    lane.target,
  ]
}

export function getLaneSkipReason(
  lane: BaselineLaneDefinition,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string | null {
  if (lane.skip === "requires-live-env") {
    if (env.GSD_LIVE_TESTS !== "1") {
      return "live lane skipped because GSD_LIVE_TESTS is not enabled"
    }
    if (![env.OPENAI_API_KEY, env.ANTHROPIC_API_KEY].some((value) => typeof value === "string" && value.trim().length > 0)) {
      return "live lane skipped because GSD_LIVE_TESTS is enabled but no live provider API key is configured"
    }
  }

  if (lane.skip === "requires-smoke-binary") {
    if (env.GSD_SMOKE_BINARY && env.GSD_SMOKE_BINARY.trim().length > 0) {
      return null
    }
    if (existsSync(join(cwd, "dist", "loader.js"))) {
      return null
    }
    return "installed-binary lane skipped because dist/loader.js and GSD_SMOKE_BINARY are unavailable"
  }

  return null
}

function summarizeRecordedFailure(name: string, failedPhase: RepoModePhaseName | null): string {
  if (failedPhase) {
    return `${name} failed during ${failedPhase}`
  }
  return `${name} reported a failing parity artifact`
}

function validateRepoModePhaseResult(value: unknown, pointer: string): RepoModePhaseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer} must be an object`)
  }

  const entry = value as Record<string, unknown>
  if (typeof entry.phase !== "string" || !REPO_MODE_PHASES.includes(entry.phase as RepoModePhaseName)) {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer}.phase must be one of ${REPO_MODE_PHASES.join(", ")}`)
  }
  if (entry.status !== "passed" && entry.status !== "failed") {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer}.status must be passed or failed`)
  }
  if (typeof entry.summary !== "string" || entry.summary.trim().length === 0) {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer}.summary must be a non-empty string`)
  }

  const command = entry.command
  if (command != null && (typeof command !== "object" || Array.isArray(command))) {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer}.command must be an object when present`)
  }
  const browser = entry.browser
  if (browser != null && (typeof browser !== "object" || Array.isArray(browser))) {
    throw new Error(`Invalid repo-mode parity artifact: ${pointer}.browser must be an object when present`)
  }

  const parsedCommand = command
    ? (() => {
        const candidate = command as Record<string, unknown>
        if (typeof candidate.command !== "string" || candidate.command.trim().length === 0) {
          throw new Error(`Invalid repo-mode parity artifact: ${pointer}.command.command must be a non-empty string`)
        }
        if (candidate.exitCode != null && (!Number.isInteger(candidate.exitCode) || typeof candidate.exitCode !== "number")) {
          throw new Error(`Invalid repo-mode parity artifact: ${pointer}.command.exitCode must be an integer or null`)
        }
        return {
          command: candidate.command,
          exitCode: (candidate.exitCode as number | null | undefined) ?? null,
          ...(typeof candidate.stdoutSnippet === "string" ? { stdoutSnippet: candidate.stdoutSnippet } : {}),
          ...(typeof candidate.stderrSnippet === "string" ? { stderrSnippet: candidate.stderrSnippet } : {}),
        } satisfies RepoModeCommandDiagnostic
      })()
    : undefined

  const parsedBrowser = browser
    ? (() => {
        const candidate = browser as Record<string, unknown>
        if (typeof candidate.assertion !== "string" || candidate.assertion.trim().length === 0) {
          throw new Error(`Invalid repo-mode parity artifact: ${pointer}.browser.assertion must be a non-empty string`)
        }
        if (typeof candidate.expected !== "string") {
          throw new Error(`Invalid repo-mode parity artifact: ${pointer}.browser.expected must be a string`)
        }
        if (typeof candidate.actual !== "string") {
          throw new Error(`Invalid repo-mode parity artifact: ${pointer}.browser.actual must be a string`)
        }
        return {
          assertion: candidate.assertion,
          expected: candidate.expected,
          actual: candidate.actual,
        } satisfies RepoModeBrowserDiagnostic
      })()
    : undefined

  return {
    phase: entry.phase as RepoModePhaseName,
    status: entry.status,
    summary: entry.summary,
    ...(parsedCommand ? { command: parsedCommand } : {}),
    ...(parsedBrowser ? { browser: parsedBrowser } : {}),
  }
}

export function loadRepoModeProofArtifact(targetPath: string, cwd: string = process.cwd()): RepoModeProofArtifact {
  const absolutePath = join(cwd, targetPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Repo-mode parity artifact not found at ${targetPath}`)
  }

  let raw: string
  try {
    raw = readFileSync(absolutePath, "utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read repo-mode parity artifact at ${targetPath}: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse repo-mode parity artifact at ${targetPath}: ${message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: expected a JSON object at the root`)
  }

  const candidate = parsed as Record<string, unknown>
  if (!Number.isInteger(candidate.version) || Number(candidate.version) <= 0) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: version must be a positive integer`)
  }
  if (candidate.fixtureId !== "parity-web-task") {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: fixtureId must be parity-web-task`)
  }
  if (candidate.laneName !== REPO_MODE_LANE_NAME) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: laneName must be ${REPO_MODE_LANE_NAME}`)
  }
  if (typeof candidate.artifactPath !== "string" || candidate.artifactPath.trim().length === 0) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: artifactPath must be a non-empty string`)
  }
  if (candidate.status !== "passed" && candidate.status !== "failed") {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: status must be passed or failed`)
  }
  if (!Array.isArray(candidate.phaseResults)) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: phaseResults must be an array`)
  }

  const phaseResults = candidate.phaseResults.map((entry, index) =>
    validateRepoModePhaseResult(entry, `phaseResults[${index}]`),
  )

  const seen = new Set<RepoModePhaseName>()
  for (const phase of REPO_MODE_PHASES) {
    const found = phaseResults.find((entry) => entry.phase === phase)
    if (!found) {
      throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: missing phase result for ${phase}`)
    }
    if (seen.has(found.phase)) {
      throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: duplicate phase result for ${phase}`)
    }
    seen.add(found.phase)
  }

  const failedPhase = phaseResults.find((entry) => entry.status === "failed")?.phase ?? null
  if (candidate.status === "passed" && failedPhase) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: status cannot be passed when phase ${failedPhase} failed`)
  }
  if (candidate.status === "failed" && !failedPhase) {
    throw new Error(`Invalid repo-mode parity artifact at ${targetPath}: status failed requires at least one failed phase result`)
  }

  return {
    version: candidate.version as number,
    fixtureId: candidate.fixtureId,
    laneName: candidate.laneName,
    artifactPath: candidate.artifactPath,
    status: candidate.status,
    phaseResults,
  }
}

function executeRecordedArtifactLane(
  lane: BaselineLaneDefinition,
  options: { cwd?: string } = {},
): BaselineLaneResult {
  const cwd = options.cwd ?? process.cwd()
  const startedAt = Date.now()

  try {
    const artifact = lane.name === INSTALLED_MODE_LANE_NAME
      ? loadInstalledModeProofArtifact(lane.target, cwd)
      : loadRepoModeProofArtifact(lane.target, cwd)
    const failedPhase = artifact.phaseResults.find((entry) => entry.status === "failed")?.phase ?? null
    return {
      name: lane.name,
      target: lane.target,
      runner: lane.runner,
      proofClass: lane.proofClass,
      parityScope: lane.parityScope,
      provesCodingLoop: lane.provesCodingLoop,
      status: artifact.status,
      skipReason: artifact.status === "failed" ? summarizeRecordedFailure(lane.name, failedPhase) : null,
      exitCode: artifact.status === "failed" ? 1 : 0,
      durationMs: Date.now() - startedAt,
      command: resolveLaneCommand(lane),
      artifactPath: artifact.artifactPath,
      failedPhase,
      phaseResults: artifact.phaseResults,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      name: lane.name,
      target: lane.target,
      runner: lane.runner,
      proofClass: lane.proofClass,
      parityScope: lane.parityScope,
      provesCodingLoop: lane.provesCodingLoop,
      status: "failed",
      skipReason: `${lane.name} contract error: ${message}`,
      exitCode: 1,
      durationMs: Date.now() - startedAt,
      command: resolveLaneCommand(lane),
      artifactPath: null,
      failedPhase: null,
      phaseResults: [],
    }
  }
}

export async function executeBaselineLane(
  lane: BaselineLaneDefinition,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<BaselineLaneResult> {
  const cwd = options.cwd ?? process.cwd()
  const env = { ...process.env, ...(options.env ?? {}) }
  const command = resolveLaneCommand(lane)
  const skipReason = getLaneSkipReason(lane, env, cwd)

  if (skipReason) {
    return {
      name: lane.name,
      target: lane.target,
      runner: lane.runner,
      proofClass: lane.proofClass,
      parityScope: lane.parityScope,
      provesCodingLoop: lane.provesCodingLoop,
      status: "skipped",
      skipReason,
      exitCode: null,
      durationMs: 0,
      command,
      artifactPath: null,
      failedPhase: null,
      phaseResults: [],
    }
  }

  if (lane.runner === "recorded-artifact") {
    return executeRecordedArtifactLane(lane, { cwd })
  }

  const startedAt = Date.now()

  return await new Promise<BaselineLaneResult>((resolve) => {
    const child = spawn(process.execPath, command, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let settled = false
    let timedOut = false

    const finish = (status: LaneStatus, exitCode: number | null, reason: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        name: lane.name,
        target: lane.target,
        runner: lane.runner,
        proofClass: lane.proofClass,
        parityScope: lane.parityScope,
        provesCodingLoop: lane.provesCodingLoop,
        status,
        skipReason: reason,
        exitCode,
        durationMs: Date.now() - startedAt,
        command,
        artifactPath: null,
        failedPhase: null,
        phaseResults: [],
      })
    }

    child.stdout.resume()
    child.stderr.resume()

    child.on("error", (error) => {
      finish("failed", null, `${lane.name} spawn failed: ${error.message}`)
    })

    child.on("close", (code) => {
      if (timedOut) {
        finish("timed_out", code, `${lane.name} exceeded timeout of ${lane.timeoutMs}ms`)
        return
      }
      if (code === 0) {
        finish("passed", 0, null)
        return
      }
      finish("failed", code ?? 1, `${lane.name} exited with code ${String(code ?? 1)}`)
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), 250).unref()
    }, lane.timeoutMs)
  })
}

export function loadParityManifest(manifestPath: string = PARITY_MANIFEST_PATH, cwd: string = process.cwd()): ParityManifest {
  const absolutePath = join(cwd, manifestPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Parity manifest not found at ${manifestPath}`)
  }

  let raw: string
  try {
    raw = readFileSync(absolutePath, "utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read parity manifest at ${manifestPath}: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse parity manifest at ${manifestPath}: ${message}`)
  }

  return validateParityManifest(parsed, { manifestPath, lanes: BASELINE_LANES })
}

export function validateParityManifest(
  manifest: unknown,
  options: { manifestPath?: string; lanes?: readonly BaselineLaneDefinition[] } = {},
): ParityManifest {
  const manifestPath = options.manifestPath ?? PARITY_MANIFEST_PATH
  const lanes = options.lanes ?? BASELINE_LANES
  const laneNames = new Set(lanes.map((lane) => lane.name))

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`Invalid parity manifest at ${manifestPath}: expected a JSON object at the root`)
  }

  const candidate = manifest as Record<string, unknown>
  if (!Number.isInteger(candidate.version) || Number(candidate.version) <= 0) {
    throw new Error(`Invalid parity manifest at ${manifestPath}: version must be a positive integer`)
  }
  if (typeof candidate.fixtureId !== "string" || candidate.fixtureId.trim().length === 0) {
    throw new Error(`Invalid parity manifest at ${manifestPath}: fixtureId must be a non-empty string`)
  }
  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0) {
    throw new Error(`Invalid parity manifest at ${manifestPath}: title must be a non-empty string`)
  }
  if (!Array.isArray(candidate.capabilities) || candidate.capabilities.length === 0) {
    throw new Error(`Invalid parity manifest at ${manifestPath}: capabilities must be a non-empty array`)
  }

  const seen = new Set<string>()
  const capabilities = candidate.capabilities.map((entry, index) => {
    const pointer = `capabilities[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer} must be an object`)
    }

    const capability = entry as Record<string, unknown>
    const name = capability.name
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer}.name must be a non-empty string`)
    }
    if (seen.has(name)) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: duplicate capability name ${name}`)
    }
    seen.add(name)

    const description = capability.description
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer}.description must be a non-empty string`)
    }

    const observableCompletionCriteria = capability.observableCompletionCriteria
    if (
      !Array.isArray(observableCompletionCriteria) ||
      observableCompletionCriteria.length === 0 ||
      observableCompletionCriteria.some((criterion) => typeof criterion !== "string" || criterion.trim().length === 0)
    ) {
      throw new Error(
        `Invalid parity manifest at ${manifestPath}: ${pointer}.observableCompletionCriteria must be a non-empty string array`,
      )
    }

    const proof = capability.proof
    if (typeof proof !== "string" || !MANIFEST_PROOF_STATUSES.includes(proof as ManifestProofStatus)) {
      throw new Error(
        `Invalid parity manifest at ${manifestPath}: ${pointer}.proof must be one of ${MANIFEST_PROOF_STATUSES.join(", ")}`,
      )
    }

    const currentGap = capability.currentGap
    if (typeof currentGap !== "string" || currentGap.trim().length === 0) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer}.currentGap must be a non-empty string`)
    }

    const laneCoverage = capability.laneCoverage
    if (!laneCoverage || typeof laneCoverage !== "object" || Array.isArray(laneCoverage)) {
      throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer}.laneCoverage must be an object`)
    }

    const coverageRecord = laneCoverage as Record<string, unknown>
    for (const lane of lanes) {
      if (!(lane.name in coverageRecord)) {
        throw new Error(
          `Invalid parity manifest at ${manifestPath}: ${pointer}.laneCoverage is missing required mapping for ${lane.name}`,
        )
      }
    }

    for (const [laneName, status] of Object.entries(coverageRecord)) {
      if (!laneNames.has(laneName)) {
        throw new Error(`Invalid parity manifest at ${manifestPath}: ${pointer}.laneCoverage references unknown lane ${laneName}`)
      }
      if (typeof status !== "string" || !MANIFEST_COVERAGE_STATUSES.includes(status as ManifestCoverageStatus)) {
        throw new Error(
          `Invalid parity manifest at ${manifestPath}: ${pointer}.laneCoverage.${laneName} must be one of ${MANIFEST_COVERAGE_STATUSES.join(", ")}`,
        )
      }
    }

    return {
      name,
      description,
      observableCompletionCriteria: [...observableCompletionCriteria] as string[],
      proof: proof as ManifestProofStatus,
      currentGap,
      laneCoverage: { ...coverageRecord } as Record<string, ManifestCoverageStatus>,
    } satisfies ParityManifestCapability
  })

  return {
    version: candidate.version as number,
    fixtureId: candidate.fixtureId as string,
    title: candidate.title as string,
    capabilities,
  }
}

function deriveRepoLaneCoverage(
  laneResult: BaselineLaneResult | undefined,
  capabilityName: string,
): { coverage: ManifestCoverageStatus; currentGap?: string } {
  const mappedPhase = REPO_MODE_CAPABILITY_PHASE[capabilityName]
  if (!mappedPhase) {
    return { coverage: "not-covered" }
  }
  if (!laneResult) {
    return { coverage: "not-covered", currentGap: `Repo-mode proof lane ${REPO_MODE_LANE_NAME} is missing from the parity report.` }
  }
  if (!laneResult.artifactPath) {
    return { coverage: "not-covered", currentGap: `Repo-mode proof lane ${REPO_MODE_LANE_NAME} is missing an artifact path.` }
  }

  const phaseResult = laneResult.phaseResults.find((entry) => entry.phase === mappedPhase)
  if (!phaseResult) {
    return { coverage: "not-covered", currentGap: `Repo-mode proof lane ${REPO_MODE_LANE_NAME} is missing diagnostics for phase ${mappedPhase}.` }
  }
  if (phaseResult.status === "passed") {
    return { coverage: "covered" }
  }
  return {
    coverage: "partial",
    currentGap: `Repo-mode proof failed during ${mappedPhase}; inspect ${laneResult.artifactPath} for phase-local diagnostics.`,
  }
}

export function reconcileParityManifestWithLaneResults(
  manifest: ParityManifest,
  laneResults: readonly BaselineLaneResult[],
): ParityManifest {
  const repoModeLane = laneResults.find((lane) => lane.name === REPO_MODE_LANE_NAME)
  const installedModeLane = laneResults.find((lane) => lane.name === INSTALLED_MODE_LANE_NAME)

  const capabilities = manifest.capabilities.map((capability) => {
    const repoDerived = deriveRepoLaneCoverage(repoModeLane, capability.name)
    const installedDerived = deriveInstalledModeLaneCoverage(installedModeLane, capability.name)
    const laneCoverage = {
      ...capability.laneCoverage,
      [REPO_MODE_LANE_NAME]: repoDerived.coverage,
      [INSTALLED_MODE_LANE_NAME]: installedDerived.coverage,
    }

    const hasUncovered = Object.values(laneCoverage).includes("not-covered")
    const hasPartial = Object.values(laneCoverage).includes("partial")
    const proof: ManifestProofStatus = hasUncovered || hasPartial ? "uncovered" : "covered"

    const remainingGap = repoDerived.currentGap
      ?? installedDerived.currentGap
      ?? (() => {
          const remainingLaneNames = Object.entries(laneCoverage)
            .filter(([, status]) => status !== "covered")
            .map(([laneName]) => laneName)
          if (remainingLaneNames.length === 0) {
            return "Covered by all current parity lanes."
          }
          return `Repo-mode and installed-mode proofs cover this capability, but remaining parity gaps stay in ${remainingLaneNames.join(", ")}.`
        })()

    return {
      ...capability,
      proof,
      currentGap: remainingGap,
      laneCoverage,
    }
  })

  return {
    ...manifest,
    capabilities,
  }
}

export function buildUncoveredCapabilityRows(manifest: ParityManifest): UncoveredCapabilityReportRow[] {
  return manifest.capabilities.map((capability) => {
    const coveringLaneNames = Object.entries(capability.laneCoverage)
      .filter(([, coverage]) => coverage === "covered")
      .map(([laneName]) => laneName)
    const partialLaneNames = Object.entries(capability.laneCoverage)
      .filter(([, coverage]) => coverage === "partial")
      .map(([laneName]) => laneName)
    const uncoveredLaneNames = Object.entries(capability.laneCoverage)
      .filter(([, coverage]) => coverage === "not-covered")
      .map(([laneName]) => laneName)

    if (capability.proof === "covered" && (uncoveredLaneNames.length > 0 || partialLaneNames.length > 0)) {
      throw new Error(
        `Invalid parity manifest at ${PARITY_MANIFEST_PATH}: capability ${capability.name} is marked covered but still has uncovered lanes`,
      )
    }

    return {
      capabilityName: capability.name,
      proof: capability.proof,
      uncovered: capability.proof !== "covered",
      currentGap: capability.currentGap,
      observableCompletionCriteria: capability.observableCompletionCriteria,
      coveringLaneNames,
      partialLaneNames,
      uncoveredLaneNames,
    }
  })
}

export function summarizeBaselineResults(
  results: readonly BaselineLaneResult[],
  uncoveredCapabilities: readonly UncoveredCapabilityReportRow[] = [],
): BaselineSummary {
  const proofClassCounts = Object.fromEntries(PROOF_CLASSES.map((proofClass) => [proofClass, 0])) as Record<ProofClass, number>

  for (const result of results) {
    proofClassCounts[result.proofClass] += 1
  }

  const passed = results.filter((result) => result.status === "passed").length
  const failed = results.filter((result) => result.status === "failed").length
  const skipped = results.filter((result) => result.status === "skipped").length
  const timedOut = results.filter((result) => result.status === "timed_out").length
  const provesCodingLoop = results.some((result) => result.provesCodingLoop && result.status === "passed")
  const uncoveredLaneNames = results.filter((result) => result.status !== "passed").map((result) => result.name)
  const uncoveredCapabilityNames = uncoveredCapabilities.filter((capability) => capability.uncovered).map((capability) => capability.capabilityName)

  let verdict: SummaryVerdict = "covered"
  if (failed > 0 || timedOut > 0) {
    verdict = "failing"
  } else if (!provesCodingLoop || skipped > 0 || uncoveredLaneNames.length > 0 || uncoveredCapabilityNames.length > 0) {
    verdict = "partial"
  }

  return {
    verdict,
    totalLanes: results.length,
    passed,
    failed,
    skipped,
    timedOut,
    provesCodingLoop,
    uncoveredLaneNames,
    proofClassCounts,
    uncoveredCapabilityNames,
  }
}

export function buildRepoInstalledComparison(laneResults: readonly BaselineLaneResult[]): RepoInstalledComparison {
  const repoLane = laneResults.find((lane) => lane.name === REPO_MODE_LANE_NAME)
  const installedLane = laneResults.find((lane) => lane.name === INSTALLED_MODE_LANE_NAME)

  const phaseComparisons = REPO_MODE_PHASES.map((phase) => {
    const repoPhase = repoLane?.phaseResults.find((entry) => entry.phase === phase)
    const installedPhase = installedLane?.phaseResults.find((entry) => entry.phase === phase)
    const repoStatus = repoPhase?.status ?? "missing"
    const installedStatus = installedPhase?.status ?? "missing"
    return {
      phase,
      repoStatus,
      installedStatus,
      matches: repoStatus === installedStatus,
    } satisfies RepoInstalledPhaseComparison
  })

  return {
    repoLaneName: REPO_MODE_LANE_NAME,
    installedLaneName: INSTALLED_MODE_LANE_NAME,
    repoArtifactPath: repoLane?.artifactPath ?? null,
    installedArtifactPath: installedLane?.artifactPath ?? null,
    comparableWithoutRerun: Boolean(repoLane?.artifactPath && installedLane?.artifactPath),
    divergencePhases: phaseComparisons.filter((phase) => !phase.matches).map((phase) => phase.phase),
    phaseComparisons,
  }
}

async function buildMcpParitySurfaceReport(): Promise<McpParitySurfaceReportRow> {
  const manifest = createSecondaryParityManifest()
  const surface = manifest.surfaces.find((entry) => entry.id === "mcp")
  if (!surface) {
    throw new Error("Missing MCP surface contract in secondary parity manifest")
  }

  const laneDefinitions = manifest.lanes.filter((lane) => lane.surfaceId === surface.id)
  const existingRequiredLaneNames = laneDefinitions
    .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "existing-proof")
    .map((lane) => lane.name)
  const missingRequiredLaneNames = laneDefinitions
    .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "planned-proof")
    .map((lane) => lane.name)
  const presentFixturePaths = surface.deterministicFixtures
    .filter((fixture) => fixture.status === "present")
    .map((fixture) => fixture.path)
  const plannedFixturePaths = surface.deterministicFixtures
    .filter((fixture) => fixture.status === "planned")
    .map((fixture) => fixture.path)

  const parity = await createMcpParityReport()
  await writeMcpParityArtifacts(parity)

  return {
    id: "mcp",
    title: surface.title,
    inventoryStatus: surface.inventoryStatus,
    releaseReadableStatus: parity.status === "passed" ? "covered" : "partial",
    requiredLaneNames: [...surface.requiredLaneNames],
    optionalLaneNames: [...surface.optionalLaneNames],
    existingRequiredLaneNames,
    missingRequiredLaneNames,
    presentFixturePaths,
    plannedFixturePaths,
    coverageGapIds: surface.coverageGaps.map((gap) => gap.id),
    uncoveredAreas: surface.coverageGaps.map((gap) => ({ ...gap })),
    reportPath: MCP_PARITY_REPORT_PATH,
    parityArtifactPath: MCP_PARITY_ARTIFACT_PATH,
    recordingPath: MCP_PARITY_RECORDING_PATH,
    parityStatus: parity.status,
    diagnostics: parity.diagnostics,
  }
}

async function buildWorkflowParitySurfaceReport(): Promise<WorkflowParityReportRow> {
  const manifest = createSecondaryParityManifest()
  const surface = manifest.surfaces.find((entry) => entry.id === "workflow-bmad")
  if (!surface) {
    throw new Error("Missing workflow-bmad surface contract in secondary parity manifest")
  }

  const laneDefinitions = manifest.lanes.filter((lane) => lane.surfaceId === surface.id)
  const existingRequiredLaneNames = laneDefinitions
    .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "existing-proof")
    .map((lane) => lane.name)
  const missingRequiredLaneNames = laneDefinitions
    .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "planned-proof")
    .map((lane) => lane.name)
  const presentFixturePaths = surface.deterministicFixtures
    .filter((fixture) => fixture.status === "present")
    .map((fixture) => fixture.path)
  const plannedFixturePaths = surface.deterministicFixtures
    .filter((fixture) => fixture.status === "planned")
    .map((fixture) => fixture.path)

  const parity = await createWorkflowParityReport()
  await writeWorkflowParityArtifacts(parity)

  return {
    id: "workflow-bmad",
    title: surface.title,
    inventoryStatus: surface.inventoryStatus,
    releaseReadableStatus: parity.status === "passed" ? "covered" : "partial",
    requiredLaneNames: [...surface.requiredLaneNames],
    optionalLaneNames: [...surface.optionalLaneNames],
    existingRequiredLaneNames,
    missingRequiredLaneNames,
    presentFixturePaths,
    plannedFixturePaths,
    coverageGapIds: surface.coverageGaps.map((gap) => gap.id),
    uncoveredAreas: surface.coverageGaps.map((gap) => ({ ...gap })),
    reportPath: WORKFLOW_PARITY_REPORT_PATH,
    parityArtifactPath: WORKFLOW_PARITY_ARTIFACT_PATH,
    recordingPath: WORKFLOW_PARITY_RECORDING_PATH,
    parityStatus: parity.status,
    diagnostics: parity.diagnostics,
  }
}

function buildSecondaryParityReport(): SecondaryParityReport {
  const inventory = createSecondarySurfaceInventory()
  validateSecondarySurfaceInventory(inventory)

  const manifest = createSecondaryParityManifest()
  validateSecondaryParityManifest(manifest, { manifestPath: SECONDARY_PARITY_MANIFEST_PATH, cwd: process.cwd() })

  const surfaces = manifest.surfaces.map((surface) => {
    const laneDefinitions = manifest.lanes.filter((lane) => lane.surfaceId === surface.id)
    const existingRequiredLaneNames = laneDefinitions
      .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "existing-proof")
      .map((lane) => lane.name)
    const missingRequiredLaneNames = laneDefinitions
      .filter((lane) => lane.requirement === "required" && lane.implementationStatus === "planned-proof")
      .map((lane) => lane.name)
    const presentFixturePaths = surface.deterministicFixtures
      .filter((fixture) => fixture.status === "present")
      .map((fixture) => fixture.path)
    const plannedFixturePaths = surface.deterministicFixtures
      .filter((fixture) => fixture.status === "planned")
      .map((fixture) => fixture.path)

    return {
      id: surface.id,
      title: surface.title,
      inventoryStatus: surface.inventoryStatus,
      releaseReadableStatus: surface.inventoryStatus,
      requiredLaneNames: [...surface.requiredLaneNames],
      optionalLaneNames: [...surface.optionalLaneNames],
      existingRequiredLaneNames,
      missingRequiredLaneNames,
      presentFixturePaths,
      plannedFixturePaths,
      coverageGapIds: surface.coverageGaps.map((gap) => gap.id),
      uncoveredAreas: surface.coverageGaps.map((gap) => ({ ...gap })),
      reportPath: `${BASELINE_REPORT_PATH}#secondaryParity.surfaces.${surface.id}`,
    } satisfies SecondaryParitySurfaceReportRow
  })

  return {
    inventoryPath: "tests/parity/artifacts/secondary-surface-inventory.json",
    manifestPath: SECONDARY_PARITY_MANIFEST_PATH,
    inventoryVersion: inventory.version,
    manifestVersion: manifest.version,
    summary: {
      totalSurfaces: surfaces.length,
      partialSurfaces: surfaces.filter((surface) => surface.releaseReadableStatus === "partial").length,
      coveredSurfaces: surfaces.filter((surface) => surface.releaseReadableStatus === "covered").length,
      uncoveredSurfaces: surfaces.filter((surface) => surface.releaseReadableStatus === "uncovered").length,
      totalDriftFindings: inventory.rebrandDrift.length,
      surfacesMissingReleaseReadableCoverage: surfaces
        .filter((surface) => surface.releaseReadableStatus !== "covered")
        .map((surface) => surface.id),
    },
    surfaces,
    uncoveredSurfaces: surfaces.filter((surface) => surface.releaseReadableStatus !== "covered"),
    driftFindings: inventory.rebrandDrift.map((finding) => ({ ...finding })),
    inventory,
    manifest,
  }
}

export async function createBaselineReport(
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    artifactPath?: string
    manifestPath?: string
    lanes?: readonly BaselineLaneDefinition[]
  } = {},
): Promise<BaselineReport> {
  const cwd = options.cwd ?? process.cwd()
  const env = options.env ?? process.env
  const lanes = options.lanes ?? getBaselineLanes(env)
  validateBaselineLaneDefinitions(lanes, { cwd, requireTargets: true })
  const parityManifest = loadParityManifest(options.manifestPath ?? PARITY_MANIFEST_PATH, cwd)

  const laneResults: BaselineLaneResult[] = []
  for (const lane of lanes) {
    laneResults.push(await executeBaselineLane(lane, { cwd, env }))
  }

  const reconciledManifest = reconcileParityManifestWithLaneResults(parityManifest, laneResults)
  const uncoveredCapabilities = buildUncoveredCapabilityRows(reconciledManifest)
  const artifactPath = options.artifactPath ?? BASELINE_REPORT_PATH
  const secondaryParity = buildSecondaryParityReport()
  const mcpParity = await buildMcpParitySurfaceReport()
  const workflowParity = await buildWorkflowParitySurfaceReport()
  return {
    version: BASELINE_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    cwd,
    artifactPath,
    summary: summarizeBaselineResults(laneResults, uncoveredCapabilities),
    lanes: laneResults,
    parityManifest: reconciledManifest,
    uncoveredCapabilities,
    repoInstalledComparison: buildRepoInstalledComparison(laneResults),
    secondaryParity,
    mcpParity,
    workflowParity,
    reconciledFoundations: [M113_RECONCILIATION],
  }
}

export async function writeBaselineReport(report: BaselineReport, cwd: string = process.cwd()): Promise<string> {
  const outputPath = join(cwd, report.artifactPath)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  return outputPath
}
