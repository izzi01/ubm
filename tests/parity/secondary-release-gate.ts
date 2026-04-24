import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
  BASELINE_REPORT_PATH,
  type BaselineReport,
  type LaneStatus,
  createBaselineReport,
  writeBaselineReport,
} from "./baseline-lanes.ts"
import { loadBaselineReport } from "./diagnostics.ts"
import { createSecondaryParityManifest } from "./secondary-lanes.ts"
import { createSecondarySurfaceInventory } from "./secondary-surface-inventory.ts"
import { getLiveSpotCheckSkipReason } from "../live/run.ts"

export const SECONDARY_RELEASE_REPORT_VERSION = 1 as const
export const SECONDARY_RELEASE_REPORT_PATH = "tests/parity/artifacts/secondary-release-report.json" as const
export const WORKTREE_SESSION_MANIFEST_PATH = "tests/fixtures/worktree-session-parity-manifest.json" as const
export const REQUIRED_SECONDARY_LANE_NAMES = [
  "web-mode",
  "mcp",
  "workflow-bmad",
  "worktree-session-recovery",
  "rebrand-drift",
] as const

export type SecondaryReleaseVerdict = "passed" | "failed"
export type SecondaryReleaseFormat = "json" | "text"
export type RequiredSecondaryLaneName = (typeof REQUIRED_SECONDARY_LANE_NAMES)[number]
export type RequiredSecondaryLaneStatus = "passed" | "failed"
export type OptionalSecondaryLaneStatus = "passed" | "failed" | "skipped" | "planned"

type WorktreeSessionManifest = {
  version: number
  surfaceId: string
  goal: string
  requiredContracts: {
    worktreeSession: Array<{ id: string; kind: string; path: string; symbol: string; status: string }>
    operatorHelp: Array<{ id: string; kind: string; path: string; match: string; status: string }>
  }
  rebrandDrift: Array<{ id: string; path: string; match: string; line: number; status: string }>
}

export interface SecondaryReleaseRequiredLane {
  name: RequiredSecondaryLaneName
  title: string
  surfaceId: string
  required: true
  blocking: true
  status: RequiredSecondaryLaneStatus
  reportPath: string | null
  artifactPaths: string[]
  failedPhases: string[]
  failedSurfaces: string[]
  summary: string
  diagnostics: string[]
}

export interface SecondaryReleaseOptionalLane {
  name: string
  title: string
  surfaceId: string
  required: false
  blocking: false
  status: OptionalSecondaryLaneStatus
  reportPath: string | null
  artifactPaths: string[]
  summary: string
  diagnostics: string[]
}

export interface SecondaryReleaseReport {
  version: typeof SECONDARY_RELEASE_REPORT_VERSION
  generatedAt: string
  cwd: string
  artifactPath: string
  verdict: SecondaryReleaseVerdict
  baselineReportPath: string
  requiredLaneNames: readonly RequiredSecondaryLaneName[]
  requiredLanesPassed: boolean
  failedRequiredLanes: SecondaryReleaseRequiredLane[]
  failedSurfaces: string[]
  failedPhases: string[]
  diagnosticsCommand: string[]
  artifactPaths: {
    baselineReport: string
    secondaryReleaseReport: string
    secondarySurfaceInventory: string
    mcpParity: string | null
    workflowParity: string | null
    worktreeSessionManifest: string
  }
  baselineSummary: BaselineReport["summary"]
  secondaryParitySummary: BaselineReport["secondaryParity"]["summary"]
  requiredLanes: SecondaryReleaseRequiredLane[]
  optionalLanes: SecondaryReleaseOptionalLane[]
  optionalLive: {
    laneName: "live-runner"
    status: Extract<LaneStatus, "passed" | "failed" | "skipped" | "timed_out">
    configured: boolean
    enabled: boolean
    required: false
    includeLiveRequested: boolean
    skipReason: "not-enabled" | "no-provider-configured" | null
    reason: string | null
  }
}

type SecondaryReleaseCliOptions = {
  reportPath?: string
  format: SecondaryReleaseFormat
  includeLive: boolean
}

function readText(relativePath: string, cwd: string): string {
  return readFileSync(join(cwd, relativePath), "utf8")
}

function readJson<T>(relativePath: string, cwd: string): T {
  return JSON.parse(readText(relativePath, cwd)) as T
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function lineNumberFor(source: string, needle: string): number {
  const lines = source.split(/\n/)
  const index = lines.findIndex((line) => line.includes(needle))
  return index === -1 ? -1 : index + 1
}

function createPassedLane(input: Omit<SecondaryReleaseRequiredLane, "required" | "blocking" | "status">): SecondaryReleaseRequiredLane {
  return {
    ...input,
    required: true,
    blocking: true,
    status: "passed",
  }
}

function createFailedLane(
  input: Omit<SecondaryReleaseRequiredLane, "required" | "blocking" | "status">,
): SecondaryReleaseRequiredLane {
  return {
    ...input,
    required: true,
    blocking: true,
    status: "failed",
  }
}

function buildWebModeLane(baselineReport: BaselineReport): SecondaryReleaseRequiredLane {
  const surface = baselineReport.secondaryParity.surfaces.find((entry) => entry.id === "web-mode")
  if (!surface) {
    return createFailedLane({
      name: "web-mode",
      title: "Web-mode secondary surface",
      surfaceId: "web-mode",
      reportPath: null,
      artifactPaths: [baselineReport.artifactPath],
      failedPhases: [],
      failedSurfaces: ["web-mode"],
      summary: "Web-mode secondary surface row is missing from the canonical baseline artifact.",
      diagnostics: [
        `baselineReportPath: ${baselineReport.artifactPath}`,
        "expected secondaryParity.surfaces.web-mode to exist",
      ],
    })
  }

  const missingRequired = surface.missingRequiredLaneNames
  const status = missingRequired.length === 0 ? "passed" : "failed"
  const diagnostics = [
    `inventoryStatus: ${surface.inventoryStatus}`,
    `releaseReadableStatus: ${surface.releaseReadableStatus}`,
    `requiredLaneNames: ${surface.requiredLaneNames.join(", ")}`,
    `missingRequiredLaneNames: ${missingRequired.length > 0 ? missingRequired.join(", ") : "none"}`,
    `optionalLaneNames: ${surface.optionalLaneNames.length > 0 ? surface.optionalLaneNames.join(", ") : "none"}`,
    `coverageGapIds: ${surface.coverageGapIds.join(", ")}`,
  ]

  return status === "passed"
    ? createPassedLane({
        name: "web-mode",
        title: surface.title,
        surfaceId: surface.id,
        reportPath: surface.reportPath,
        artifactPaths: [baselineReport.artifactPath, baselineReport.secondaryParity.inventoryPath],
        failedPhases: [],
        failedSurfaces: [],
        summary: "Web-mode required coverage is present in the canonical secondary-surface report; remaining web-mode gaps stay explicit and non-blocking.",
        diagnostics,
      })
    : createFailedLane({
        name: "web-mode",
        title: surface.title,
        surfaceId: surface.id,
        reportPath: surface.reportPath,
        artifactPaths: [baselineReport.artifactPath, baselineReport.secondaryParity.inventoryPath],
        failedPhases: [],
        failedSurfaces: [surface.id],
        summary: "Web-mode secondary surface is missing at least one required release-readable lane.",
        diagnostics,
      })
}

function buildMcpLane(baselineReport: BaselineReport): SecondaryReleaseRequiredLane {
  const parity = baselineReport.mcpParity
  const failedPhases = parity.parityStatus === "passed" ? [] : ["mcp-parity"]
  const diagnostics = [
    `releaseReadableStatus: ${parity.releaseReadableStatus}`,
    `parityStatus: ${parity.parityStatus}`,
    `requiredLaneNames: ${parity.requiredLaneNames.join(", ")}`,
    `optionalLaneNames: ${parity.optionalLaneNames.length > 0 ? parity.optionalLaneNames.join(", ") : "none"}`,
    `configuredServer: ${parity.diagnostics.configuredServer.status}`,
    `toolDiscovery: ${parity.diagnostics.discoveredTools.status}`,
    `schemaInspection: ${parity.diagnostics.schemaInspection.status}`,
    `successInvocation: ${parity.diagnostics.successInvocation.status}`,
    `failureInvocation: ${parity.diagnostics.failureInvocation.status}`,
  ]

  return parity.parityStatus === "passed"
    ? createPassedLane({
        name: "mcp",
        title: parity.title,
        surfaceId: parity.id,
        reportPath: parity.reportPath,
        artifactPaths: [parity.parityArtifactPath, parity.recordingPath],
        failedPhases,
        failedSurfaces: [],
        summary: "MCP parity artifact passes and remains release-readable in the integrated secondary gate.",
        diagnostics,
      })
    : createFailedLane({
        name: "mcp",
        title: parity.title,
        surfaceId: parity.id,
        reportPath: parity.reportPath,
        artifactPaths: [parity.parityArtifactPath, parity.recordingPath],
        failedPhases,
        failedSurfaces: [parity.id],
        summary: "MCP parity artifact is red, so the integrated secondary gate must fail.",
        diagnostics,
      })
}

function buildWorkflowLane(baselineReport: BaselineReport): SecondaryReleaseRequiredLane {
  const parity = baselineReport.workflowParity
  const transitionFailures = parity.diagnostics.stateTransitions.filter((entry) => entry.status !== "passed")
  const artifactFailures = parity.diagnostics.artifactChecks.filter((entry) => !entry.exists)
  const failedPhaseCandidates = [
    ...transitionFailures.map((entry) => entry.phase),
    ...artifactFailures.map((entry) => entry.producerPhase),
    ...(parity.diagnostics.verificationEvidence.status === "passed" ? [] : ["workflow-verification"]),
  ]
  const failedPhases = parity.parityStatus === "passed"
    ? []
    : [...new Set(failedPhaseCandidates)]

  const diagnostics = [
    `releaseReadableStatus: ${parity.releaseReadableStatus}`,
    `parityStatus: ${parity.parityStatus}`,
    `requiredLaneNames: ${parity.requiredLaneNames.join(", ")}`,
    `optionalLaneNames: ${parity.optionalLaneNames.length > 0 ? parity.optionalLaneNames.join(", ") : "none"}`,
    `artifactChecksMissing: ${artifactFailures.length}`,
    `stateTransitionFailures: ${transitionFailures.length}`,
    `verificationEvidenceStatus: ${parity.diagnostics.verificationEvidence.status}`,
  ]

  return parity.parityStatus === "passed"
    ? createPassedLane({
        name: "workflow-bmad",
        title: parity.title,
        surfaceId: parity.id,
        reportPath: parity.reportPath,
        artifactPaths: [parity.parityArtifactPath, parity.recordingPath],
        failedPhases: [],
        failedSurfaces: [],
        summary: "Representative workflow parity stays green in the integrated secondary gate.",
        diagnostics,
      })
    : createFailedLane({
        name: "workflow-bmad",
        title: parity.title,
        surfaceId: parity.id,
        reportPath: parity.reportPath,
        artifactPaths: [parity.parityArtifactPath, parity.recordingPath],
        failedPhases,
        failedSurfaces: [parity.id],
        summary: "Representative workflow parity is red, so the integrated secondary gate must fail.",
        diagnostics,
      })
}

function evaluateWorktreeSessionLane(cwd: string, baselineReportPath: string): SecondaryReleaseRequiredLane {
  const manifest = readJson<WorktreeSessionManifest>(WORKTREE_SESSION_MANIFEST_PATH, cwd)
  const helpTextSource = readText("src/help-text.ts", cwd)
  const diagnostics: string[] = [
    `manifestVersion: ${manifest.version}`,
    `surfaceId: ${manifest.surfaceId}`,
    `goal: ${manifest.goal}`,
    `worktreeContractCount: ${manifest.requiredContracts.worktreeSession.length}`,
    `operatorHelpCount: ${manifest.requiredContracts.operatorHelp.length}`,
  ]
  const failures: string[] = []

  if (manifest.surfaceId !== "worktree-session-recovery") {
    failures.push(`surfaceId expected worktree-session-recovery but saw ${manifest.surfaceId}`)
  }

  for (const entry of manifest.requiredContracts.worktreeSession) {
    const source = readText(entry.path, cwd)
    const exportPattern = new RegExp(`export function ${escapeRegExp(entry.symbol)}\\s*\\(`)
    if (!exportPattern.test(source)) {
      failures.push(`${entry.id}: missing export function ${entry.symbol} in ${entry.path}`)
    }
    if (entry.status !== "covered") {
      failures.push(`${entry.id}: expected covered status, saw ${entry.status}`)
    }
  }

  for (const entry of manifest.requiredContracts.operatorHelp) {
    const source = readText(entry.path, cwd)
    if (!new RegExp(escapeRegExp(entry.match)).test(source)) {
      failures.push(`${entry.id}: missing operator help text in ${entry.path}`)
    }
    if (entry.status !== "covered") {
      failures.push(`${entry.id}: expected covered status, saw ${entry.status}`)
    }
  }

  if (/Usage: gsd sessions/.test(helpTextSource)) {
    failures.push("src/help-text.ts still exposes 'Usage: gsd sessions'")
  }
  if (/Usage: gsd worktree <command> \[args\]/.test(helpTextSource)) {
    failures.push("src/help-text.ts still exposes old-brand worktree usage guidance")
  }
  if (!/umb -w\s+Auto-name a new worktree, or resume the only active one/.test(helpTextSource)) {
    failures.push("src/help-text.ts is missing the expected umb -w worktree guidance")
  }
  if (!/umb worktree merge auth-refactor\s+Merge and clean up/.test(helpTextSource)) {
    failures.push("src/help-text.ts is missing the expected umb worktree merge example")
  }

  diagnostics.push(...(failures.length > 0 ? failures.map((entry) => `failure: ${entry}`) : ["all tracked worktree/session contracts matched"] ))

  return failures.length === 0
    ? createPassedLane({
        name: "worktree-session-recovery",
        title: "Worktree, session, and recovery parity surface",
        surfaceId: "worktree-session-recovery",
        reportPath: `${baselineReportPath}#secondaryParity.surfaces.worktree-session-recovery`,
        artifactPaths: [WORKTREE_SESSION_MANIFEST_PATH, baselineReportPath],
        failedPhases: [],
        failedSurfaces: [],
        summary: "Worktree/session/recovery parity remains locked by the tracked manifest and operator help contract.",
        diagnostics,
      })
    : createFailedLane({
        name: "worktree-session-recovery",
        title: "Worktree, session, and recovery parity surface",
        surfaceId: "worktree-session-recovery",
        reportPath: `${baselineReportPath}#secondaryParity.surfaces.worktree-session-recovery`,
        artifactPaths: [WORKTREE_SESSION_MANIFEST_PATH, baselineReportPath],
        failedPhases: ["contract"],
        failedSurfaces: ["worktree-session-recovery"],
        summary: "Worktree/session/recovery parity drifted from the tracked manifest contract.",
        diagnostics,
      })
}

function evaluateRebrandLane(cwd: string, baselineReportPath: string): SecondaryReleaseRequiredLane {
  const manifest = readJson<WorktreeSessionManifest>(WORKTREE_SESSION_MANIFEST_PATH, cwd)
  const inventory = createSecondarySurfaceInventory()
  const helpTextSource = readText("src/help-text.ts", cwd)
  const manifestIds = manifest.rebrandDrift.map((entry) => entry.id)
  const inventoryFindings = inventory.rebrandDrift.filter((finding) => manifestIds.includes(finding.id))
  const diagnostics: string[] = [
    `trackedExpectedDriftCount: ${manifest.rebrandDrift.length}`,
    `inventoryMatchedDriftCount: ${inventoryFindings.length}`,
    `trackedExpectedDriftIds: ${manifestIds.join(", ")}`,
  ]
  const failures: string[] = []

  if (inventoryFindings.length !== manifest.rebrandDrift.length) {
    failures.push("secondary-surface inventory no longer matches the tracked rebrand drift manifest")
  }

  for (const entry of manifest.rebrandDrift) {
    const inventoryFinding = inventoryFindings.find((finding) => finding.id === entry.id)
    if (!inventoryFinding) {
      failures.push(`${entry.id}: missing inventory finding`)
      continue
    }
    if (inventoryFinding.path !== entry.path) {
      failures.push(`${entry.id}: inventory path ${inventoryFinding.path} != manifest path ${entry.path}`)
    }
    if (inventoryFinding.match !== entry.match) {
      failures.push(`${entry.id}: inventory match drifted from manifest`)
    }
    if (inventoryFinding.line !== entry.line) {
      failures.push(`${entry.id}: inventory line ${inventoryFinding.line} != manifest line ${entry.line}`)
    }
    if (entry.status !== "expected-drift") {
      failures.push(`${entry.id}: expected expected-drift status, saw ${entry.status}`)
    }

    const source = readText(entry.path, cwd)
    if (!new RegExp(escapeRegExp(entry.match)).test(source)) {
      failures.push(`${entry.id}: source no longer contains tracked drift text in ${entry.path}`)
    }
    const actualLine = lineNumberFor(source, entry.match)
    if (actualLine !== entry.line) {
      failures.push(`${entry.id}: source line ${actualLine} != manifest line ${entry.line}`)
    }
  }

  if (!/Usage: umb sessions/.test(helpTextSource)) {
    failures.push("src/help-text.ts is missing 'Usage: umb sessions'")
  }
  if (!/Usage: umb worktree <command> \[args\]/.test(helpTextSource)) {
    failures.push("src/help-text.ts is missing umb worktree usage guidance")
  }

  diagnostics.push(...(failures.length > 0 ? failures.map((entry) => `failure: ${entry}`) : ["all tracked expected-drift findings stayed explicit and line-stable"] ))

  return failures.length === 0
    ? createPassedLane({
        name: "rebrand-drift",
        title: "Scoped rebrand drift contract",
        surfaceId: "rebrand-drift",
        reportPath: `${baselineReportPath}#secondaryParity.driftFindings`,
        artifactPaths: [WORKTREE_SESSION_MANIFEST_PATH, baselineReportPath],
        failedPhases: [],
        failedSurfaces: [],
        summary: "Remaining old-brand secondary-surface strings are still explicit, scoped, and non-blocking in the integrated gate.",
        diagnostics,
      })
    : createFailedLane({
        name: "rebrand-drift",
        title: "Scoped rebrand drift contract",
        surfaceId: "rebrand-drift",
        reportPath: `${baselineReportPath}#secondaryParity.driftFindings`,
        artifactPaths: [WORKTREE_SESSION_MANIFEST_PATH, baselineReportPath],
        failedPhases: ["rebrand-drift"],
        failedSurfaces: ["rebrand-drift"],
        summary: "Scoped rebrand drift is no longer explicit or line-stable, so the integrated gate must fail until the manifest is updated or the drift is removed intentionally.",
        diagnostics,
      })
}

function buildOptionalLanes(
  baselineReport: BaselineReport,
  requiredLanes: SecondaryReleaseRequiredLane[],
): SecondaryReleaseOptionalLane[] {
  const manifest = createSecondaryParityManifest()
  const requiredBySurface = new Map(requiredLanes.map((lane) => [lane.surfaceId, lane]))

  const optionalLanes = manifest.lanes
    .filter((lane) => lane.requirement === "optional")
    .map((lane) => {
      const surface = manifest.surfaces.find((entry) => entry.id === lane.surfaceId)
      const fixturePaths = (surface?.deterministicFixtures ?? [])
        .filter((fixture) => fixture.laneName === lane.name)
        .map((fixture) => fixture.path)
      const requiredLane = requiredBySurface.get(lane.surfaceId)

      return {
        name: lane.name,
        title: lane.title,
        surfaceId: lane.surfaceId,
        required: false,
        blocking: false,
        status: lane.implementationStatus === "planned-proof" ? "planned" : "passed",
        reportPath: requiredLane?.reportPath ?? null,
        artifactPaths: fixturePaths,
        summary: lane.implementationStatus === "planned-proof"
          ? `Optional parity lane remains planned-proof and is explicitly non-blocking for ${lane.surfaceId}.`
          : `Optional parity lane is available for ${lane.surfaceId}.`,
        diagnostics: [
          `proofClass: ${lane.proofClass}`,
          `releaseReadable: ${lane.releaseReadable ? "yes" : "no"}`,
          `implementationStatus: ${lane.implementationStatus}`,
          `fixturePaths: ${fixturePaths.length > 0 ? fixturePaths.join(", ") : "none"}`,
        ],
      } satisfies SecondaryReleaseOptionalLane
    })

  const liveLane = baselineReport.lanes.find((lane) => lane.name === "live-runner")
  optionalLanes.push({
    name: "live-runner",
    title: "Provider-driven live spot check",
    surfaceId: "provider-live",
    required: false,
    blocking: false,
    status: liveLane?.status ?? "skipped",
    reportPath: null,
    artifactPaths: [],
    summary: "Live/provider-driven validation stays explicit and non-blocking in the secondary release gate.",
    diagnostics: [
      `laneStatus: ${liveLane?.status ?? "skipped"}`,
      `skipReason: ${liveLane?.skipReason ?? "none"}`,
      `command: ${liveLane?.command?.join(" ") ?? "none"}`,
    ],
  })

  return optionalLanes
}

export function createSecondaryReleaseGateReport(
  baselineReport: BaselineReport,
  options: { cwd?: string; includeLive?: boolean; env?: NodeJS.ProcessEnv; artifactPath?: string } = {},
): SecondaryReleaseReport {
  const cwd = options.cwd ?? process.cwd()
  const artifactPath = options.artifactPath ?? SECONDARY_RELEASE_REPORT_PATH
  const baselineReportPath = baselineReport.artifactPath
  const env = { ...process.env, ...(options.env ?? {}) }

  const requiredLanes = [
    buildWebModeLane(baselineReport),
    buildMcpLane(baselineReport),
    buildWorkflowLane(baselineReport),
    evaluateWorktreeSessionLane(cwd, baselineReportPath),
    evaluateRebrandLane(cwd, baselineReportPath),
  ]

  const failedRequiredLanes = requiredLanes.filter((lane) => lane.status !== "passed")
  const optionalLanes = buildOptionalLanes(baselineReport, requiredLanes)
  const liveLane = baselineReport.lanes.find((lane) => lane.name === "live-runner")
  const liveGate = getLiveSpotCheckSkipReason(env)
  const includeLiveRequested = options.includeLive === true
  const liveConfigured = liveLane
    ? liveLane.status === "passed" || liveLane.status === "failed" || liveLane.status === "timed_out"
      ? true
      : liveGate.configured
    : liveGate.configured
  const effectiveLiveReason = liveLane?.status === "skipped"
    ? (liveGate.reason ?? liveLane?.skipReason ?? null)
    : liveLane?.skipReason ?? liveGate.reason ?? null
  const effectiveLiveSkipReason = liveLane?.status === "skipped"
    ? (liveGate.skipReason ?? null)
    : null

  return {
    version: SECONDARY_RELEASE_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    cwd,
    artifactPath,
    verdict: failedRequiredLanes.length === 0 ? "passed" : "failed",
    baselineReportPath,
    requiredLaneNames: [...REQUIRED_SECONDARY_LANE_NAMES],
    requiredLanesPassed: failedRequiredLanes.length === 0,
    failedRequiredLanes,
    failedSurfaces: [...new Set(failedRequiredLanes.flatMap((lane) => lane.failedSurfaces))],
    failedPhases: [...new Set(failedRequiredLanes.flatMap((lane) => lane.failedPhases))],
    diagnosticsCommand: [
      "node",
      "--experimental-strip-types",
      "tests/parity/secondary-release-gate.ts",
      "--report",
      baselineReportPath,
      "--format",
      "text",
    ],
    artifactPaths: {
      baselineReport: baselineReport.artifactPath,
      secondaryReleaseReport: artifactPath,
      secondarySurfaceInventory: baselineReport.secondaryParity.inventoryPath,
      mcpParity: baselineReport.mcpParity?.parityArtifactPath ?? null,
      workflowParity: baselineReport.workflowParity?.parityArtifactPath ?? null,
      worktreeSessionManifest: WORKTREE_SESSION_MANIFEST_PATH,
    },
    baselineSummary: baselineReport.summary,
    secondaryParitySummary: baselineReport.secondaryParity.summary,
    requiredLanes,
    optionalLanes,
    optionalLive: {
      laneName: "live-runner",
      status: liveLane?.status ?? "skipped",
      configured: liveConfigured,
      enabled: liveGate.enabled,
      required: false,
      includeLiveRequested,
      skipReason: effectiveLiveSkipReason,
      reason: effectiveLiveReason,
    },
  }
}

export function renderSecondaryReleaseGateReport(report: SecondaryReleaseReport): string {
  const lines: string[] = []
  lines.push(`Secondary parity release gate: verdict=${report.verdict}`)
  lines.push(`requiredLanesPassed: ${report.requiredLanesPassed ? "yes" : "no"}`)
  lines.push(`requiredLaneNames: ${report.requiredLaneNames.join(", ")}`)
  lines.push(`baselineReportPath: ${report.baselineReportPath}`)
  lines.push(`secondaryReleaseReportPath: ${report.artifactPaths.secondaryReleaseReport}`)
  lines.push(`secondarySurfaceInventoryPath: ${report.artifactPaths.secondarySurfaceInventory}`)
  lines.push(`worktreeSessionManifestPath: ${report.artifactPaths.worktreeSessionManifest}`)
  lines.push(`mcpParityArtifactPath: ${report.artifactPaths.mcpParity ?? "none"}`)
  lines.push(`workflowParityArtifactPath: ${report.artifactPaths.workflowParity ?? "none"}`)
  lines.push(`failedSurfaces: ${report.failedSurfaces.length > 0 ? report.failedSurfaces.join(", ") : "none"}`)
  lines.push(`failedPhases: ${report.failedPhases.length > 0 ? report.failedPhases.join(", ") : "none"}`)
  lines.push(`diagnosticsCommand: ${report.diagnosticsCommand.join(" ")}`)
  lines.push(
    `baselineSummary: verdict=${report.baselineSummary.verdict} passed=${report.baselineSummary.passed}/${report.baselineSummary.totalLanes} failed=${report.baselineSummary.failed} skipped=${report.baselineSummary.skipped} timedOut=${report.baselineSummary.timedOut}`,
  )
  lines.push(
    `secondaryParitySummary: total=${report.secondaryParitySummary.totalSurfaces} partial=${report.secondaryParitySummary.partialSurfaces} covered=${report.secondaryParitySummary.coveredSurfaces} uncovered=${report.secondaryParitySummary.uncoveredSurfaces} drift=${report.secondaryParitySummary.totalDriftFindings}`,
  )
  lines.push(
    `optionalLive: status=${report.optionalLive.status} required=no includeLiveRequested=${report.optionalLive.includeLiveRequested ? "yes" : "no"} enabled=${report.optionalLive.enabled ? "yes" : "no"} configured=${report.optionalLive.configured ? "yes" : "no"}`,
  )
  if (report.optionalLive.skipReason) {
    lines.push(`optionalLiveSkipReason: ${report.optionalLive.skipReason}`)
  }
  if (report.optionalLive.reason) {
    lines.push(`optionalLiveReason: ${report.optionalLive.reason}`)
  }

  lines.push("requiredLanes:")
  for (const lane of report.requiredLanes) {
    lines.push(`- ${lane.name} [surface=${lane.surfaceId}] status=${lane.status}`)
    lines.push(`  summary: ${lane.summary}`)
    if (lane.reportPath) {
      lines.push(`  reportPath: ${lane.reportPath}`)
    }
    if (lane.artifactPaths.length > 0) {
      lines.push(`  artifactPaths: ${lane.artifactPaths.join(", ")}`)
    }
    if (lane.failedPhases.length > 0) {
      lines.push(`  failedPhases: ${lane.failedPhases.join(", ")}`)
    }
    for (const detail of lane.diagnostics) {
      lines.push(`  detail: ${detail}`)
    }
  }

  lines.push("optionalLanes:")
  for (const lane of report.optionalLanes) {
    lines.push(`- ${lane.name} [surface=${lane.surfaceId}] status=${lane.status} blocking=no`)
    lines.push(`  summary: ${lane.summary}`)
    if (lane.reportPath) {
      lines.push(`  reportPath: ${lane.reportPath}`)
    }
    if (lane.artifactPaths.length > 0) {
      lines.push(`  artifactPaths: ${lane.artifactPaths.join(", ")}`)
    }
    for (const detail of lane.diagnostics) {
      lines.push(`  detail: ${detail}`)
    }
  }

  if (report.failedRequiredLanes.length > 0) {
    lines.push("failedRequiredLanes:")
    for (const lane of report.failedRequiredLanes) {
      lines.push(`- ${lane.name} [surface=${lane.surfaceId}] status=${lane.status}`)
      lines.push(`  summary: ${lane.summary}`)
      if (lane.failedPhases.length > 0) {
        lines.push(`  failedPhases: ${lane.failedPhases.join(", ")}`)
      }
    }
  } else {
    lines.push("failedRequiredLanes: none")
  }

  return `${lines.join("\n")}\n`
}

export async function writeSecondaryReleaseGateReport(
  report: SecondaryReleaseReport,
  cwd: string = process.cwd(),
): Promise<string> {
  const outputPath = join(cwd, report.artifactPath)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  return outputPath
}

export async function resolveSecondaryReleaseGateReport(options: {
  cwd?: string
  env?: NodeJS.ProcessEnv
  reportPath?: string
  includeLive?: boolean
  artifactPath?: string
} = {}): Promise<SecondaryReleaseReport> {
  const cwd = options.cwd ?? process.cwd()
  const env = { ...process.env, ...(options.env ?? {}) }
  const baselineEnv = options.includeLive ? { ...env, GSD_LIVE_TESTS: "1" } : env

  const baselineReport = options.reportPath
    ? loadBaselineReport(options.reportPath, cwd)
    : await createBaselineReport({ cwd, env: baselineEnv })

  if (!options.reportPath) {
    await writeBaselineReport(baselineReport, cwd)
  }

  const report = createSecondaryReleaseGateReport(baselineReport, {
    cwd,
    includeLive: options.includeLive,
    env: baselineEnv,
    artifactPath: options.artifactPath,
  })
  await writeSecondaryReleaseGateReport(report, cwd)
  return report
}

export function parseSecondaryReleaseGateCliArgs(argv: readonly string[]): SecondaryReleaseCliOptions {
  let reportPath: string | undefined
  let format: SecondaryReleaseFormat = "text"
  let includeLive = false

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--report") {
      const next = argv[index + 1]
      if (!next) {
        throw new Error("Missing value for --report")
      }
      reportPath = next
      index += 1
      continue
    }
    if (token === "--format") {
      const next = argv[index + 1]
      if (next !== "json" && next !== "text") {
        throw new Error(`Unsupported --format value: ${String(next)}. Expected json or text.`)
      }
      format = next
      index += 1
      continue
    }
    if (token === "--include-live") {
      includeLive = true
      continue
    }
    if (token === "--help" || token === "-h") {
      process.stdout.write(
        "Usage: node --experimental-strip-types tests/parity/secondary-release-gate.ts [--report tests/parity/artifacts/baseline-report.json] [--format text|json] [--include-live]\n",
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  return { reportPath, format, includeLive }
}

async function main(): Promise<void> {
  const options = parseSecondaryReleaseGateCliArgs(process.argv.slice(2))
  const report = await resolveSecondaryReleaseGateReport({
    cwd: process.cwd(),
    env: process.env,
    reportPath: options.reportPath,
    includeLive: options.includeLive,
  })

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    process.stdout.write(renderSecondaryReleaseGateReport(report))
  }

  if (report.verdict !== "passed") {
    process.exitCode = 1
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
