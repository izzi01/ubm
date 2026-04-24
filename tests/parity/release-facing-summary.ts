import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join } from "node:path"
import type { BaselineReport } from "./baseline-lanes.ts"
import type { SecondarySurfaceInventory } from "./secondary-surface-inventory.ts"
import {
  PARITY_GAP_INVENTORY_PATH,
  type ParityGapInventory,
  loadParityGapInventory,
} from "./parity-gap-inventory.ts"
import {
  SECONDARY_RELEASE_REPORT_PATH,
  type SecondaryReleaseReport,
} from "./secondary-release-gate.ts"
import {
  BASELINE_REPORT_PATH,
  type SummaryVerdict,
} from "./baseline-lanes.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "./diagnostics.ts"

export const RELEASE_FACING_SUMMARY_VERSION = 1 as const
export const RELEASE_FACING_SUMMARY_PATH = "tests/parity/artifacts/release-facing-summary.json" as const
export const SECONDARY_SURFACE_INVENTORY_PATH = "tests/parity/artifacts/secondary-surface-inventory.json" as const

export type ReleaseFacingFormat = "json" | "text"
export type ReleaseFacingVerdict = "passed" | "failed"

export interface ReleaseFacingRequiredLaneStatus {
  name: string
  surfaceId: string
  status: string
  reportPath: string | null
  artifactPaths: string[]
  failedPhases: string[]
  failedSurfaces: string[]
  summary: string
}

export interface ReleaseFacingOptionalLaneStatus {
  name: string
  surfaceId: string
  status: string
  reportPath: string | null
  artifactPaths: string[]
  summary: string
}

export interface ReleaseFacingOutOfScopeSurface {
  id: string
  category: "optional-lane" | "optional-live"
  surfaceId: string
  title: string
  status: string
  blocking: false
  reportPath: string | null
  artifactPaths: string[]
  rationale: string
}

export interface ReleaseFacingResidualInventory {
  totalRows: number
  optionalNonblockingRows: number
  scopedExceptionRows: number
  scopedRebrandFindings: number
  scopedRebrandFindingIds: string[]
  scopedRebrandPaths: string[]
}

export interface ReleaseFacingSummary {
  version: typeof RELEASE_FACING_SUMMARY_VERSION
  generatedAt: string
  artifactPath: string
  releaseFacingVerdict: ReleaseFacingVerdict
  baselineVerdict: SummaryVerdict
  baselineExplanation: string
  whyPartialIsTruthful: string
  baselineReportPath: string
  secondaryReleaseReportPath: string
  parityGapInventoryPath: string
  secondarySurfaceInventoryPath: string
  requiredSecondaryVerdict: SecondaryReleaseReport["verdict"]
  requiredSecondarySummary: {
    requiredLanesPassed: boolean
    requiredLaneNames: string[]
    passedLaneNames: string[]
    failedRequiredLaneNames: string[]
    failedSurfaces: string[]
    failedPhases: string[]
    lanes: ReleaseFacingRequiredLaneStatus[]
  }
  optionalEvidence: {
    live: SecondaryReleaseReport["optionalLive"]
    plannedLanes: ReleaseFacingOptionalLaneStatus[]
  }
  residualInventory: ReleaseFacingResidualInventory
  scopedOutSurfaces: ReleaseFacingOutOfScopeSurface[]
  artifactPaths: {
    baselineReport: string
    secondaryReleaseReport: string
    parityGapInventory: string
    secondarySurfaceInventory: string
    releaseFacingSummary: string
    mcpParity: string | null
    workflowParity: string | null
    worktreeSessionManifest: string | null
  }
  milestoneSummaryInput: {
    authoritativeSource: string
    whatUmbProvesNow: string
    whatRemainsOptional: string
    whatRemainsOutOfScope: string
  }
}

type CliOptions = {
  baselineReportPath: string
  secondaryReleaseReportPath: string
  parityGapInventoryPath: string
  secondarySurfaceInventoryPath: string
  artifactPath: string
  format: ReleaseFacingFormat
}

function absolutePath(relativePath: string, cwd: string): string {
  return isAbsolute(relativePath) ? relativePath : join(cwd, relativePath)
}

function readJsonFile<T>(relativePath: string, cwd: string, label: string): T {
  const resolved = absolutePath(relativePath, cwd)
  if (!existsSync(resolved)) {
    throw new Error(`${label} not found at ${relativePath}`)
  }

  let raw: string
  try {
    raw = readFileSync(resolved, "utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read ${label.toLowerCase()} at ${relativePath}: ${message}`)
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse ${label.toLowerCase()} at ${relativePath}: ${message}`)
  }
}

function assertRepoRelativePath(path: string, label: string): void {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error(`${label} is missing`)
  }
  if (path.startsWith("/")) {
    throw new Error(`${label} must be repo-relative, received absolute path ${path}`)
  }
  if (path.includes("..")) {
    throw new Error(`${label} must not escape the repo, received ${path}`)
  }
  if (path.startsWith(".gsd/")) {
    throw new Error(`${label} must not point at gitignored planning/runtime state: ${path}`)
  }
}

function expectSecondaryShape(report: SecondaryReleaseReport): void {
  if (!Array.isArray(report.requiredLanes) || report.requiredLanes.length === 0) {
    throw new Error(`Secondary parity release report is missing requiredLanes at ${report.artifactPath}`)
  }
  if (!report.optionalLive || typeof report.optionalLive !== "object") {
    throw new Error(`Secondary parity release report is missing optionalLive at ${report.artifactPath}`)
  }
}

function expectBaselineLiveLane(report: BaselineReport) {
  const lane = report.lanes.find((entry) => entry.name === "live-runner")
  if (!lane) {
    throw new Error(`Baseline parity report is missing lane live-runner at ${report.artifactPath}`)
  }
  return lane
}

function summarizePartialReason(baseline: BaselineReport, secondary: SecondaryReleaseReport): {
  baselineExplanation: string
  whyPartialIsTruthful: string
} {
  const liveLane = expectBaselineLiveLane(baseline)
  const requiredPassed = secondary.requiredLanes.filter((lane) => lane.status === "passed").map((lane) => lane.name)

  if (baseline.summary.verdict === "partial") {
    if (liveLane.status !== "skipped") {
      throw new Error(
        `Baseline partial explanation drifted: expected live-runner skipped when baseline verdict=partial, received ${liveLane.status}`,
      )
    }
    if (secondary.optionalLive.status !== liveLane.status) {
      throw new Error(
        `optionalLive.status mismatch: baseline live-runner=${liveLane.status}, secondary optionalLive=${secondary.optionalLive.status}`,
      )
    }

    return {
      baselineExplanation:
        "The canonical baseline remains partial because the provider-driven live spot check is intentionally optional and currently skipped in the default deterministic path.",
      whyPartialIsTruthful:
        `Repo-mode and installed-mode coding-loop proof remains covered, all required secondary surfaces pass (${requiredPassed.join(", ")}), and only the non-blocking live/provider lane stays outside the deterministic must-pass set.`,
    }
  }

  return {
    baselineExplanation: `The canonical baseline verdict is ${baseline.summary.verdict}.`,
    whyPartialIsTruthful: "The baseline is no longer relying on optional live semantics to explain a partial verdict.",
  }
}

function buildPlannedLaneStatus(report: SecondaryReleaseReport): ReleaseFacingOptionalLaneStatus[] {
  return report.optionalLanes
    .filter((lane) => lane.name !== "live-runner")
    .map((lane) => ({
      name: lane.name,
      surfaceId: lane.surfaceId,
      status: lane.status,
      reportPath: lane.reportPath,
      artifactPaths: lane.artifactPaths,
      summary: lane.summary,
    }))
}

function buildScopedOutSurfaces(report: SecondaryReleaseReport): ReleaseFacingOutOfScopeSurface[] {
  const optional = buildPlannedLaneStatus(report).map((lane) => ({
    id: lane.name,
    category: "optional-lane" as const,
    surfaceId: lane.surfaceId,
    title: lane.name,
    status: lane.status,
    blocking: false as const,
    reportPath: lane.reportPath,
    artifactPaths: lane.artifactPaths,
    rationale: lane.summary,
  }))

  optional.push({
    id: report.optionalLive.laneName,
    category: "optional-live",
    surfaceId: "provider-live",
    title: "provider-driven live spot check",
    status: report.optionalLive.status,
    blocking: false,
    reportPath: null,
    artifactPaths: [],
    rationale: report.optionalLive.reason ?? "Live/provider evidence remains explicit and non-blocking.",
  })

  return optional
}

function buildResidualInventory(
  gapInventory: ParityGapInventory,
  surfaceInventory: SecondarySurfaceInventory,
): ReleaseFacingResidualInventory {
  const scopedRows = gapInventory.rows.filter((row) => row.class === "scoped-exception-candidate")
  const optionalRows = gapInventory.rows.filter((row) => row.class === "optional-nonblocking")
  const driftIds = surfaceInventory.rebrandDrift.map((finding) => finding.id)

  if (surfaceInventory.rebrandDrift.length === 0 && surfaceInventory.summary.totalDriftFindings !== 0) {
    throw new Error("Residual inventory malformed: secondary surface inventory reports drift findings in summary but provides no rows")
  }

  return {
    totalRows: gapInventory.summary.totalRows,
    optionalNonblockingRows: optionalRows.length,
    scopedExceptionRows: scopedRows.length,
    scopedRebrandFindings: surfaceInventory.rebrandDrift.length,
    scopedRebrandFindingIds: driftIds,
    scopedRebrandPaths: [...new Set(surfaceInventory.rebrandDrift.map((finding) => finding.path))],
  }
}

function buildMilestoneSummaryInput(summary: {
  baselineExplanation: string
  whyPartialIsTruthful: string
  residualInventory: ReleaseFacingResidualInventory
  scopedOutSurfaces: ReleaseFacingOutOfScopeSurface[]
  requiredSecondarySummary: ReleaseFacingSummary["requiredSecondarySummary"]
  artifactPath: string
}): ReleaseFacingSummary["milestoneSummaryInput"] {
  const optionalNames = summary.scopedOutSurfaces.map((entry) => entry.id)
  return {
    authoritativeSource: summary.artifactPath,
    whatUmbProvesNow: `umb proves the deterministic repo-mode and installed-mode coding loop plus the required secondary surfaces ${summary.requiredSecondarySummary.passedLaneNames.join(", ")} now.`,
    whatRemainsOptional: optionalNames.length > 0
      ? `Optional/non-blocking evidence remains visible for ${optionalNames.join(", ")}.`
      : "No optional/non-blocking evidence remains visible.",
    whatRemainsOutOfScope: `Residual scoped rebrand drift remains explicit at ${summary.residualInventory.scopedRebrandFindings} tracked findings, and the canonical baseline explanation remains: ${summary.baselineExplanation}`,
  }
}

export function createReleaseFacingSummary(
  baselineReport: BaselineReport,
  secondaryReleaseReport: SecondaryReleaseReport,
  parityGapInventory: ParityGapInventory,
  secondarySurfaceInventory: SecondarySurfaceInventory,
  options: { artifactPath?: string } = {},
): ReleaseFacingSummary {
  expectSecondaryShape(secondaryReleaseReport)

  if (secondaryReleaseReport.baselineReportPath !== baselineReport.artifactPath) {
    throw new Error(
      `baselineReportPath mismatch: secondary release report points to ${secondaryReleaseReport.baselineReportPath}, expected ${baselineReport.artifactPath}`,
    )
  }

  if (parityGapInventory.baselineReportPath !== baselineReport.artifactPath) {
    throw new Error(
      `baselineReportPath mismatch: parity gap inventory points to ${parityGapInventory.baselineReportPath}, expected ${baselineReport.artifactPath}`,
    )
  }

  if (parityGapInventory.secondaryReleaseReportPath !== secondaryReleaseReport.artifactPath) {
    throw new Error(
      `secondaryReleaseReportPath mismatch: parity gap inventory points to ${parityGapInventory.secondaryReleaseReportPath}, expected ${secondaryReleaseReport.artifactPath}`,
    )
  }

  const { baselineExplanation, whyPartialIsTruthful } = summarizePartialReason(baselineReport, secondaryReleaseReport)
  const scopedOutSurfaces = buildScopedOutSurfaces(secondaryReleaseReport)
  const residualInventory = buildResidualInventory(parityGapInventory, secondarySurfaceInventory)
  const lanes = secondaryReleaseReport.requiredLanes.map((lane) => ({
    name: lane.name,
    surfaceId: lane.surfaceId,
    status: lane.status,
    reportPath: lane.reportPath,
    artifactPaths: lane.artifactPaths,
    failedPhases: lane.failedPhases,
    failedSurfaces: lane.failedSurfaces,
    summary: lane.summary,
  }))

  const summary: ReleaseFacingSummary = {
    version: RELEASE_FACING_SUMMARY_VERSION,
    generatedAt: new Date().toISOString(),
    artifactPath: options.artifactPath ?? RELEASE_FACING_SUMMARY_PATH,
    releaseFacingVerdict: secondaryReleaseReport.verdict === "passed" ? "passed" : "failed",
    baselineVerdict: baselineReport.summary.verdict,
    baselineExplanation,
    whyPartialIsTruthful,
    baselineReportPath: baselineReport.artifactPath,
    secondaryReleaseReportPath: secondaryReleaseReport.artifactPath,
    parityGapInventoryPath: parityGapInventory.artifactPath,
    secondarySurfaceInventoryPath: SECONDARY_SURFACE_INVENTORY_PATH,
    requiredSecondaryVerdict: secondaryReleaseReport.verdict,
    requiredSecondarySummary: {
      requiredLanesPassed: secondaryReleaseReport.requiredLanesPassed,
      requiredLaneNames: [...secondaryReleaseReport.requiredLaneNames],
      passedLaneNames: lanes.filter((lane) => lane.status === "passed").map((lane) => lane.name),
      failedRequiredLaneNames: lanes.filter((lane) => lane.status !== "passed").map((lane) => lane.name),
      failedSurfaces: [...secondaryReleaseReport.failedSurfaces],
      failedPhases: [...secondaryReleaseReport.failedPhases],
      lanes,
    },
    optionalEvidence: {
      live: secondaryReleaseReport.optionalLive,
      plannedLanes: buildPlannedLaneStatus(secondaryReleaseReport),
    },
    residualInventory,
    scopedOutSurfaces,
    artifactPaths: {
      baselineReport: baselineReport.artifactPath,
      secondaryReleaseReport: secondaryReleaseReport.artifactPath,
      parityGapInventory: parityGapInventory.artifactPath,
      secondarySurfaceInventory: SECONDARY_SURFACE_INVENTORY_PATH,
      releaseFacingSummary: options.artifactPath ?? RELEASE_FACING_SUMMARY_PATH,
      mcpParity: secondaryReleaseReport.artifactPaths.mcpParity,
      workflowParity: secondaryReleaseReport.artifactPaths.workflowParity,
      worktreeSessionManifest: secondaryReleaseReport.artifactPaths.worktreeSessionManifest,
    },
    milestoneSummaryInput: {
      authoritativeSource: "",
      whatUmbProvesNow: "",
      whatRemainsOptional: "",
      whatRemainsOutOfScope: "",
    },
  }

  summary.milestoneSummaryInput = buildMilestoneSummaryInput({
    baselineExplanation: summary.baselineExplanation,
    whyPartialIsTruthful: summary.whyPartialIsTruthful,
    residualInventory: summary.residualInventory,
    scopedOutSurfaces: summary.scopedOutSurfaces,
    requiredSecondarySummary: summary.requiredSecondarySummary,
    artifactPath: summary.artifactPath,
  })

  const trackedPaths = [
    summary.baselineReportPath,
    summary.secondaryReleaseReportPath,
    summary.parityGapInventoryPath,
    summary.secondarySurfaceInventoryPath,
    summary.artifactPaths.releaseFacingSummary,
    ...summary.residualInventory.scopedRebrandPaths,
    ...summary.requiredSecondarySummary.lanes.flatMap((lane) => lane.artifactPaths),
    ...summary.optionalEvidence.plannedLanes.flatMap((lane) => lane.artifactPaths),
  ].filter((path): path is string => typeof path === "string" && path.length > 0)

  for (const path of trackedPaths) {
    assertRepoRelativePath(path, `release-facing-summary path`)
  }

  return summary
}

export function renderReleaseFacingSummary(summary: ReleaseFacingSummary): string {
  const lines: string[] = []
  lines.push(`Release-facing parity summary: verdict=${summary.releaseFacingVerdict}`)
  lines.push(`baselineVerdict: ${summary.baselineVerdict}`)
  lines.push(`requiredSecondaryVerdict: ${summary.requiredSecondaryVerdict}`)
  lines.push(`baselineExplanation: ${summary.baselineExplanation}`)
  lines.push(`whyPartialIsTruthful: ${summary.whyPartialIsTruthful}`)
  lines.push(`baselineReportPath: ${summary.baselineReportPath}`)
  lines.push(`secondaryReleaseReportPath: ${summary.secondaryReleaseReportPath}`)
  lines.push(`parityGapInventoryPath: ${summary.parityGapInventoryPath}`)
  lines.push(`secondarySurfaceInventoryPath: ${summary.secondarySurfaceInventoryPath}`)
  lines.push(`requiredLanesPassed: ${summary.requiredSecondarySummary.requiredLanesPassed ? "yes" : "no"}`)
  lines.push(`requiredLaneNames: ${summary.requiredSecondarySummary.requiredLaneNames.join(", ")}`)
  lines.push(`failedSurfaces: ${summary.requiredSecondarySummary.failedSurfaces.length > 0 ? summary.requiredSecondarySummary.failedSurfaces.join(", ") : "none"}`)
  lines.push(`failedPhases: ${summary.requiredSecondarySummary.failedPhases.length > 0 ? summary.requiredSecondarySummary.failedPhases.join(", ") : "none"}`)
  lines.push(`optionalLive: status=${summary.optionalEvidence.live.status} required=no configured=${summary.optionalEvidence.live.configured ? "yes" : "no"} enabled=${summary.optionalEvidence.live.enabled ? "yes" : "no"}`)
  lines.push(`residualInventory: total=${summary.residualInventory.totalRows} optional=${summary.residualInventory.optionalNonblockingRows} scoped=${summary.residualInventory.scopedExceptionRows} scopedRebrand=${summary.residualInventory.scopedRebrandFindings}`)
  lines.push(`scopedRebrandFindingIds: ${summary.residualInventory.scopedRebrandFindingIds.join(", ")}`)
  lines.push("requiredLanes:")
  for (const lane of summary.requiredSecondarySummary.lanes) {
    lines.push(`- ${lane.name} [surface=${lane.surfaceId}] status=${lane.status}`)
    if (lane.reportPath) {
      lines.push(`  reportPath: ${lane.reportPath}`)
    }
    if (lane.artifactPaths.length > 0) {
      lines.push(`  artifactPaths: ${lane.artifactPaths.join(", ")}`)
    }
  }
  lines.push("scopedOutSurfaces:")
  for (const lane of summary.scopedOutSurfaces) {
    lines.push(`- ${lane.id} [surface=${lane.surfaceId}] status=${lane.status} category=${lane.category}`)
    if (lane.reportPath) {
      lines.push(`  reportPath: ${lane.reportPath}`)
    }
    if (lane.artifactPaths.length > 0) {
      lines.push(`  artifactPaths: ${lane.artifactPaths.join(", ")}`)
    }
  }
  lines.push("milestoneSummaryInput:")
  lines.push(`- source: ${summary.milestoneSummaryInput.authoritativeSource}`)
  lines.push(`- provesNow: ${summary.milestoneSummaryInput.whatUmbProvesNow}`)
  lines.push(`- optional: ${summary.milestoneSummaryInput.whatRemainsOptional}`)
  lines.push(`- outOfScope: ${summary.milestoneSummaryInput.whatRemainsOutOfScope}`)
  return `${lines.join("\n")}\n`
}

export async function writeReleaseFacingSummary(
  summary: ReleaseFacingSummary,
  cwd: string = process.cwd(),
): Promise<string> {
  const outputPath = absolutePath(summary.artifactPath, cwd)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8")
  return outputPath
}

export function loadSecondarySurfaceInventory(
  reportPath: string = SECONDARY_SURFACE_INVENTORY_PATH,
  cwd: string = process.cwd(),
): SecondarySurfaceInventory {
  return readJsonFile<SecondarySurfaceInventory>(reportPath, cwd, "Secondary surface inventory")
}

export async function resolveReleaseFacingSummary(options: {
  cwd?: string
  baselineReportPath?: string
  secondaryReleaseReportPath?: string
  parityGapInventoryPath?: string
  secondarySurfaceInventoryPath?: string
  artifactPath?: string
} = {}): Promise<ReleaseFacingSummary> {
  const cwd = options.cwd ?? process.cwd()
  const baseline = loadBaselineReport(options.baselineReportPath ?? BASELINE_REPORT_PATH, cwd)
  const secondary = loadSecondaryReleaseReport(options.secondaryReleaseReportPath ?? SECONDARY_RELEASE_REPORT_PATH, cwd)
  const gapInventory = loadParityGapInventory(options.parityGapInventoryPath ?? PARITY_GAP_INVENTORY_PATH, cwd)
  const surfaceInventory = loadSecondarySurfaceInventory(options.secondarySurfaceInventoryPath ?? SECONDARY_SURFACE_INVENTORY_PATH, cwd)
  const summary = createReleaseFacingSummary(baseline, secondary, gapInventory, surfaceInventory, {
    artifactPath: options.artifactPath,
  })
  await writeReleaseFacingSummary(summary, cwd)
  return summary
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  let baselineReportPath = BASELINE_REPORT_PATH
  let secondaryReleaseReportPath = SECONDARY_RELEASE_REPORT_PATH
  let parityGapInventoryPath = PARITY_GAP_INVENTORY_PATH
  let secondarySurfaceInventoryPath = SECONDARY_SURFACE_INVENTORY_PATH
  let artifactPath = RELEASE_FACING_SUMMARY_PATH
  let format: ReleaseFacingFormat = "text"

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]
    if (token === "--baseline-report") {
      if (!next) throw new Error("Missing value for --baseline-report")
      baselineReportPath = next
      index += 1
      continue
    }
    if (token === "--secondary-report") {
      if (!next) throw new Error("Missing value for --secondary-report")
      secondaryReleaseReportPath = next
      index += 1
      continue
    }
    if (token === "--parity-gap") {
      if (!next) throw new Error("Missing value for --parity-gap")
      parityGapInventoryPath = next
      index += 1
      continue
    }
    if (token === "--secondary-surface-inventory") {
      if (!next) throw new Error("Missing value for --secondary-surface-inventory")
      secondarySurfaceInventoryPath = next
      index += 1
      continue
    }
    if (token === "--artifact") {
      if (!next) throw new Error("Missing value for --artifact")
      artifactPath = next
      index += 1
      continue
    }
    if (token === "--format") {
      if (next !== "json" && next !== "text") {
        throw new Error(`Unsupported --format value: ${String(next)}. Expected json or text.`)
      }
      format = next
      index += 1
      continue
    }
    if (token === "--help" || token === "-h") {
      process.stdout.write(
        "Usage: node --experimental-strip-types tests/parity/release-facing-summary.ts [--baseline-report tests/parity/artifacts/baseline-report.json] [--secondary-report tests/parity/artifacts/secondary-release-report.json] [--parity-gap tests/parity/artifacts/parity-gap-inventory.json] [--secondary-surface-inventory tests/parity/artifacts/secondary-surface-inventory.json] [--artifact tests/parity/artifacts/release-facing-summary.json] [--format text|json]\n",
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  return {
    baselineReportPath,
    secondaryReleaseReportPath,
    parityGapInventoryPath,
    secondarySurfaceInventoryPath,
    artifactPath,
    format,
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2))
  const summary = await resolveReleaseFacingSummary({
    cwd: process.cwd(),
    baselineReportPath: options.baselineReportPath,
    secondaryReleaseReportPath: options.secondaryReleaseReportPath,
    parityGapInventoryPath: options.parityGapInventoryPath,
    secondarySurfaceInventoryPath: options.secondarySurfaceInventoryPath,
    artifactPath: options.artifactPath,
  })

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
  } else {
    process.stdout.write(renderReleaseFacingSummary(summary))
  }

  if (summary.releaseFacingVerdict !== "passed") {
    process.exitCode = 1
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
