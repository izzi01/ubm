import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join } from "node:path"
import type { BaselineLaneResult, BaselineReport } from "./baseline-lanes.ts"
import { BASELINE_REPORT_PATH } from "./baseline-lanes.ts"
import type { SecondaryReleaseReport } from "./secondary-release-gate.ts"
import { SECONDARY_RELEASE_REPORT_PATH } from "./secondary-release-gate.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "./diagnostics.ts"

export const PARITY_GAP_INVENTORY_VERSION = 1 as const
export const PARITY_GAP_INVENTORY_PATH = "tests/parity/artifacts/parity-gap-inventory.json" as const

export const PARITY_GAP_CLASSES = ["blocking", "optional-nonblocking", "scoped-exception-candidate"] as const
export const PARITY_GAP_KINDS = ["baseline-lane", "secondary-surface"] as const

export type ParityGapClass = (typeof PARITY_GAP_CLASSES)[number]
export type ParityGapKind = (typeof PARITY_GAP_KINDS)[number]

export interface ParityGapEvidencePath {
  path: string
  reason: string
}

export interface DownstreamClosureExpectation {
  sliceId: "S02" | "S03" | "S04" | "S05"
  expectation: string
}

export interface ParityGapInventoryRow {
  id: string
  kind: ParityGapKind
  subjectId: string
  laneName: string | null
  surfaceId: string | null
  title: string
  class: ParityGapClass
  blocking: boolean
  currentReportStatus: {
    baselineReport: string
    secondaryReleaseReport: string
  }
  failedPhase: string | null
  artifactPath: string | null
  reportPath: string
  rationale: string
  remediationSummary: string
  closureExpectation: string
  evidencePaths: ParityGapEvidencePath[]
}

export interface ParityGapInventory {
  version: typeof PARITY_GAP_INVENTORY_VERSION
  generatedAt: string
  artifactPath: string
  baselineReportPath: string
  secondaryReleaseReportPath: string
  disagreementModel: {
    baselineVerdict: BaselineReport["summary"]["verdict"]
    secondaryReleaseVerdict: SecondaryReleaseReport["verdict"]
    explanation: string
    blockingRows: string[]
    optionalRows: string[]
    scopedExceptionCandidateRows: string[]
  }
  downstreamClosurePlan: DownstreamClosureExpectation[]
  summary: {
    totalRows: number
    blocking: number
    optionalNonblocking: number
    scopedExceptionCandidates: number
  }
  rows: ParityGapInventoryRow[]
}

function evidence(path: string, reason: string): ParityGapEvidencePath {
  return { path, reason }
}

function fromBaselineLane(laneName: string, report: BaselineReport): BaselineLaneResult {
  const lane = report.lanes.find((entry) => entry.name === laneName)
  if (!lane) {
    throw new Error(`Baseline report is missing lane ${laneName}`)
  }
  return lane
}

function createFixturesRunnerRow(report: BaselineReport): ParityGapInventoryRow {
  const lane = fromBaselineLane("fixtures-runner", report)
  return {
    id: "baseline-lane:fixtures-runner",
    kind: "baseline-lane",
    subjectId: lane.name,
    laneName: lane.name,
    surfaceId: null,
    title: "Deterministic fixture replay lane remains the blocking baseline gap",
    class: "blocking",
    blocking: true,
    currentReportStatus: {
      baselineReport: lane.status,
      secondaryReleaseReport: "not-applicable",
    },
    failedPhase: lane.failedPhase,
    artifactPath: lane.artifactPath,
    reportPath: `${report.artifactPath}#lanes.${lane.name}`,
    rationale:
      "The canonical baseline report is red because this deterministic fixture lane exits non-zero. That is not contradicted by the green secondary release gate because the secondary gate does not consume the baseline fixture-replay lane as a required surface.",
    remediationSummary:
      "Restore truthful fixture-replay pass/fail evidence for tests/fixtures/run.ts, or replace this lane with a more precise deterministic baseline lane that still explains the same planning-to-execution path.",
    closureExpectation:
      "Closure requires the baseline report to stop failing on the representative deterministic lane rather than merely documenting the failure.",
    evidencePaths: [
      evidence(report.artifactPath, "Canonical baseline report showing fixtures-runner failed."),
      evidence("tests/fixtures/run.ts", "Failing deterministic fixture-replay lane implementation."),
      evidence("tests/fixtures/parity-web-task-manifest.json", "Tracked representative planning-to-execution manifest the baseline report already uses."),
    ],
  }
}

function createLiveRunnerRow(report: BaselineReport, secondary: SecondaryReleaseReport): ParityGapInventoryRow {
  const lane = fromBaselineLane("live-runner", report)
  return {
    id: "baseline-lane:live-runner",
    kind: "baseline-lane",
    subjectId: lane.name,
    laneName: lane.name,
    surfaceId: null,
    title: "Provider-driven live lane stays explicit but non-blocking",
    class: "optional-nonblocking",
    blocking: false,
    currentReportStatus: {
      baselineReport: lane.status,
      secondaryReleaseReport: secondary.optionalLive.status,
    },
    failedPhase: lane.failedPhase,
    artifactPath: lane.artifactPath,
    reportPath: `${secondary.artifactPath}#optionalLive`,
    rationale:
      "The live lane is intentionally opt-in and the secondary release gate records it as optional. A skipped live spot-check therefore preserves observability without blocking release-readable closure for deterministic surfaces.",
    remediationSummary:
      "Keep the skip reason truthful, or run the lane only when live-provider configuration is intentionally enabled. Do not promote this lane to a release blocker unless downstream policy changes.",
    closureExpectation:
      "Closure means the optional policy and skip reason stay explicit; a passing live run is useful evidence but is not required for the canonical release gate to pass.",
    evidencePaths: [
      evidence(report.artifactPath, "Canonical baseline report showing the live lane is skipped."),
      evidence(secondary.artifactPath, "Secondary release gate records live-runner as non-blocking optional evidence."),
      evidence("tests/live/run.ts", "Opt-in live parity lane implementation."),
    ],
  }
}

function createSurfaceRow(
  surfaceId: "web-mode" | "mcp" | "workflow-bmad" | "worktree-session-recovery",
  report: BaselineReport,
  secondary: SecondaryReleaseReport,
): ParityGapInventoryRow {
  const surface = report.secondaryParity.surfaces.find((entry) => entry.id === surfaceId)
  if (!surface) {
    throw new Error(`Baseline report is missing secondary surface ${surfaceId}`)
  }

  const requiredLane = secondary.requiredLanes.find((entry) => entry.surfaceId === surfaceId)
  if (!requiredLane) {
    throw new Error(`Secondary release report is missing required lane for surface ${surfaceId}`)
  }

  const gapSummary = surface.uncoveredAreas.map((entry) => entry.summary).join(" ")
  const downstreamNeed = surface.uncoveredAreas.map((entry) => entry.downstreamNeed).join(" ")
  const presentEvidence = [
    ...surface.presentFixturePaths.map((path) => evidence(path, `Tracked existing evidence for ${surfaceId}.`)),
    evidence(report.artifactPath, `Canonical baseline report row for ${surfaceId}.`),
    evidence(secondary.artifactPath, `Secondary release gate row for ${surfaceId}.`),
  ]

  return {
    id: `secondary-surface:${surface.id}`,
    kind: "secondary-surface",
    subjectId: surface.id,
    laneName: null,
    surfaceId: surface.id,
    title: `${surface.title} remains partially closed and needs an explicit closure decision`,
    class: "scoped-exception-candidate",
    blocking: false,
    currentReportStatus: {
      baselineReport: surface.releaseReadableStatus,
      secondaryReleaseReport: requiredLane.status,
    },
    failedPhase: requiredLane.failedPhases[0] ?? null,
    artifactPath: requiredLane.artifactPaths[0] ?? surface.presentFixturePaths[0] ?? null,
    reportPath: requiredLane.reportPath ?? surface.reportPath,
    rationale:
      `Baseline parity still records ${surfaceId} as partial because release-readable scope gaps remain, while the secondary release gate passes because the currently required secondary lane for this surface is already satisfied. That is a scoped-closure question, not a present release blocker.`,
    remediationSummary: gapSummary,
    closureExpectation: downstreamNeed,
    evidencePaths: presentEvidence,
  }
}

export function createParityGapInventory(
  baselineReport: BaselineReport,
  secondaryReleaseReport: SecondaryReleaseReport,
  options: { artifactPath?: string } = {},
): ParityGapInventory {
  const rows = [
    createFixturesRunnerRow(baselineReport),
    createLiveRunnerRow(baselineReport, secondaryReleaseReport),
    createSurfaceRow("web-mode", baselineReport, secondaryReleaseReport),
    createSurfaceRow("mcp", baselineReport, secondaryReleaseReport),
    createSurfaceRow("workflow-bmad", baselineReport, secondaryReleaseReport),
    createSurfaceRow("worktree-session-recovery", baselineReport, secondaryReleaseReport),
  ] satisfies ParityGapInventoryRow[]

  return {
    version: PARITY_GAP_INVENTORY_VERSION,
    generatedAt: new Date().toISOString(),
    artifactPath: options.artifactPath ?? PARITY_GAP_INVENTORY_PATH,
    baselineReportPath: baselineReport.artifactPath,
    secondaryReleaseReportPath: secondaryReleaseReport.artifactPath,
    disagreementModel: {
      baselineVerdict: baselineReport.summary.verdict,
      secondaryReleaseVerdict: secondaryReleaseReport.verdict,
      explanation:
        "The reports are not contradictory. The baseline report measures baseline lanes and is currently red because fixtures-runner fails, while secondary-release-report measures a narrower secondary-surface contract set and explicitly treats live/provider proof plus several planned repo/install recordings as non-blocking or future closure work.",
      blockingRows: rows.filter((row) => row.class === "blocking").map((row) => row.id),
      optionalRows: rows.filter((row) => row.class === "optional-nonblocking").map((row) => row.id),
      scopedExceptionCandidateRows: rows.filter((row) => row.class === "scoped-exception-candidate").map((row) => row.id),
    },
    downstreamClosurePlan: [
      {
        sliceId: "S02",
        expectation:
          "Retire or truthfully replace the blocking fixtures-runner baseline gap so baseline and release reporting no longer disagree on the representative deterministic lane.",
      },
      {
        sliceId: "S03",
        expectation:
          "Codify whether optional live evidence remains permanently non-blocking or gains a stronger policy requirement, without silently changing release semantics.",
      },
      {
        sliceId: "S04",
        expectation:
          "Resolve web-mode and worktree/session partial surfaces into either stronger release-readable proof rows or documented scoped exceptions.",
      },
      {
        sliceId: "S05",
        expectation:
          "Resolve MCP and workflow/BMAD partial surfaces into final parity closure targets so the secondary matrix can move from partial to fully intentional coverage.",
      },
    ],
    summary: {
      totalRows: rows.length,
      blocking: rows.filter((row) => row.class === "blocking").length,
      optionalNonblocking: rows.filter((row) => row.class === "optional-nonblocking").length,
      scopedExceptionCandidates: rows.filter((row) => row.class === "scoped-exception-candidate").length,
    },
    rows,
  }
}

export async function writeParityGapInventory(inventory: ParityGapInventory, cwd: string = process.cwd()): Promise<string> {
  const outputPath = join(cwd, inventory.artifactPath)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8")
  return outputPath
}

function loadJson<T>(reportPath: string, cwd: string, label: string): T {
  const absolutePath = isAbsolute(reportPath) ? reportPath : join(cwd, reportPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`${label} not found at ${reportPath}`)
  }
  const raw = readFileSync(absolutePath, "utf8")
  return JSON.parse(raw) as T
}

export function loadParityGapInventory(reportPath: string = PARITY_GAP_INVENTORY_PATH, cwd: string = process.cwd()): ParityGapInventory {
  return loadJson<ParityGapInventory>(reportPath, cwd, "Parity gap inventory")
}

export function renderParityGapInventory(inventory: ParityGapInventory): string {
  const lines = [
    `Parity gap inventory: baseline=${inventory.disagreementModel.baselineVerdict} secondary=${inventory.disagreementModel.secondaryReleaseVerdict}`,
    `rows: total=${inventory.summary.totalRows} blocking=${inventory.summary.blocking} optional=${inventory.summary.optionalNonblocking} scopedExceptionCandidates=${inventory.summary.scopedExceptionCandidates}`,
    `explanation: ${inventory.disagreementModel.explanation}`,
    "rows:",
  ]

  for (const row of inventory.rows) {
    lines.push(`- ${row.id} class=${row.class} baseline=${row.currentReportStatus.baselineReport} secondary=${row.currentReportStatus.secondaryReleaseReport}`)
    lines.push(`  title: ${row.title}`)
    lines.push(`  reportPath: ${row.reportPath}`)
    lines.push(`  artifactPath: ${row.artifactPath ?? "none"}`)
    if (row.failedPhase) {
      lines.push(`  failedPhase: ${row.failedPhase}`)
    }
    lines.push(`  rationale: ${row.rationale}`)
    lines.push(`  remediation: ${row.remediationSummary}`)
    lines.push(`  closureExpectation: ${row.closureExpectation}`)
  }

  return `${lines.join("\n")}\n`
}

async function main(): Promise<void> {
  const baselineReport = loadBaselineReport(BASELINE_REPORT_PATH, process.cwd())
  const secondaryReleaseReport = loadSecondaryReleaseReport(SECONDARY_RELEASE_REPORT_PATH, process.cwd())
  const inventory = createParityGapInventory(baselineReport, secondaryReleaseReport)
  await writeParityGapInventory(inventory, process.cwd())
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
