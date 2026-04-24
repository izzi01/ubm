import {
  type BaselineLaneResult,
  type BaselineReport,
  type LaneStatus,
  type RepoInstalledComparison,
  type RepoModePhaseName,
  REPO_MODE_LANE_NAME,
  createBaselineReport,
  writeBaselineReport,
} from "./baseline-lanes.ts"
import { collectActionableLaneDiagnostics, loadBaselineReport } from "./diagnostics.ts"
import { INSTALLED_MODE_LANE_NAME } from "../../src/tests/integration/helpers/installed-mode-parity.ts"

export const RELEASE_GATE_REPORT_VERSION = 1 as const
export const RELEASE_GATE_REQUIRED_LANES = [REPO_MODE_LANE_NAME, INSTALLED_MODE_LANE_NAME] as const

export type ReleaseGateVerdict = "passed" | "failed"
export type ReleaseGateFormat = "json" | "text"
export type OptionalLiveStatus = Extract<LaneStatus, "passed" | "failed" | "skipped" | "timed_out">

export interface ReleaseGateFailedLane {
  name: string
  mode: string
  status: LaneStatus
  failedPhase: RepoModePhaseName | null
  artifactPath: string | null
  skipReason: string | null
}

export interface ReleaseGateReport {
  version: typeof RELEASE_GATE_REPORT_VERSION
  generatedAt: string
  cwd: string
  verdict: ReleaseGateVerdict
  baselineReportPath: string
  diagnosticsCommand: string[]
  requiredLaneNames: readonly string[]
  requiredLanesPassed: boolean
  failedRequiredLanes: ReleaseGateFailedLane[]
  failedPhases: RepoModePhaseName[]
  optionalLive: {
    laneName: "live-runner"
    status: OptionalLiveStatus
    configured: boolean
    required: false
    reason: string | null
  }
  artifactPaths: {
    baselineReport: string
    repoMode: string | null
    installedMode: string | null
  }
  baselineSummary: BaselineReport["summary"]
  repoInstalledComparison: RepoInstalledComparison
  actionableDiagnostics: ReturnType<typeof collectActionableLaneDiagnostics>
}

type ReleaseGateCliOptions =
  | {
      mode: "rerun"
      format: ReleaseGateFormat
    }
  | {
      mode: "report"
      reportPath: string
      format: ReleaseGateFormat
    }

function normalizeMode(lane: BaselineLaneResult): string {
  if (lane.name === REPO_MODE_LANE_NAME || lane.parityScope === "repo-mode") {
    return "repo-mode"
  }
  if (lane.name === INSTALLED_MODE_LANE_NAME || lane.parityScope === "installed-mode") {
    return "installed-mode"
  }
  return lane.parityScope
}

function toFailedLane(lane: BaselineLaneResult): ReleaseGateFailedLane {
  return {
    name: lane.name,
    mode: normalizeMode(lane),
    status: lane.status,
    failedPhase: lane.failedPhase,
    artifactPath: lane.artifactPath,
    skipReason: lane.skipReason,
  }
}

export function createReleaseGateReport(baselineReport: BaselineReport): ReleaseGateReport {
  const laneByName = new Map(baselineReport.lanes.map((lane) => [lane.name, lane]))
  const requiredLanes = RELEASE_GATE_REQUIRED_LANES
    .map((laneName) => laneByName.get(laneName))
    .filter((lane): lane is BaselineLaneResult => Boolean(lane))

  const failedRequiredLanes = requiredLanes.filter((lane) => lane.status !== "passed").map(toFailedLane)
  const failedPhases = [...new Set(failedRequiredLanes.flatMap((lane) => (lane.failedPhase ? [lane.failedPhase] : [])))]
  const liveLane = laneByName.get("live-runner")
  const optionalLiveStatus: OptionalLiveStatus = liveLane?.status ?? "skipped"

  return {
    version: RELEASE_GATE_REPORT_VERSION,
    generatedAt: baselineReport.generatedAt,
    cwd: baselineReport.cwd,
    verdict: failedRequiredLanes.length === 0 ? "passed" : "failed",
    baselineReportPath: baselineReport.artifactPath,
    diagnosticsCommand: [
      "node",
      "--experimental-strip-types",
      "tests/parity/diagnostics.ts",
      "--report",
      baselineReport.artifactPath,
    ],
    requiredLaneNames: [...RELEASE_GATE_REQUIRED_LANES],
    requiredLanesPassed: failedRequiredLanes.length === 0,
    failedRequiredLanes,
    failedPhases,
    optionalLive: {
      laneName: "live-runner",
      status: optionalLiveStatus,
      configured: liveLane?.status === "passed" || liveLane?.status === "failed" || liveLane?.status === "timed_out",
      required: false,
      reason: liveLane?.skipReason ?? null,
    },
    artifactPaths: {
      baselineReport: baselineReport.artifactPath,
      repoMode: baselineReport.repoInstalledComparison.repoArtifactPath,
      installedMode: baselineReport.repoInstalledComparison.installedArtifactPath,
    },
    baselineSummary: baselineReport.summary,
    repoInstalledComparison: baselineReport.repoInstalledComparison,
    actionableDiagnostics: collectActionableLaneDiagnostics(baselineReport),
  }
}

export function renderReleaseGateReport(report: ReleaseGateReport): string {
  const lines: string[] = []
  lines.push(`Parity release gate: verdict=${report.verdict}`)
  lines.push(`requiredLanesPassed: ${report.requiredLanesPassed ? "yes" : "no"}`)
  lines.push(`requiredLaneNames: ${report.requiredLaneNames.join(", ")}`)
  lines.push(`optionalLive: status=${report.optionalLive.status} required=no configured=${report.optionalLive.configured ? "yes" : "no"}`)
  if (report.optionalLive.reason) {
    lines.push(`optionalLiveReason: ${report.optionalLive.reason}`)
  }
  lines.push(`baselineReportPath: ${report.baselineReportPath}`)
  lines.push(`repoArtifactPath: ${report.artifactPaths.repoMode ?? "none"}`)
  lines.push(`installedArtifactPath: ${report.artifactPaths.installedMode ?? "none"}`)
  lines.push(`failedPhases: ${report.failedPhases.length > 0 ? report.failedPhases.join(", ") : "none"}`)
  lines.push(`diagnosticsCommand: ${report.diagnosticsCommand.join(" ")}`)
  lines.push(
    `baselineSummary: verdict=${report.baselineSummary.verdict} passed=${report.baselineSummary.passed}/${report.baselineSummary.totalLanes} failed=${report.baselineSummary.failed} skipped=${report.baselineSummary.skipped} timedOut=${report.baselineSummary.timedOut}`,
  )
  lines.push(
    `repoInstalledComparison: comparableWithoutRerun=${report.repoInstalledComparison.comparableWithoutRerun ? "yes" : "no"} divergencePhases=${report.repoInstalledComparison.divergencePhases.length > 0 ? report.repoInstalledComparison.divergencePhases.join(", ") : "none"}`,
  )

  if (report.failedRequiredLanes.length > 0) {
    lines.push("failedRequiredLanes:")
    for (const lane of report.failedRequiredLanes) {
      lines.push(
        `- ${lane.name} [mode=${lane.mode}] status=${lane.status}${lane.failedPhase ? ` failedPhase=${lane.failedPhase}` : ""}`,
      )
      if (lane.artifactPath) {
        lines.push(`  artifactPath: ${lane.artifactPath}`)
      }
      if (lane.skipReason) {
        lines.push(`  reason: ${lane.skipReason}`)
      }
    }
  } else {
    lines.push("failedRequiredLanes: none")
  }

  lines.push("actionableDiagnostics:")
  for (const lane of report.actionableDiagnostics) {
    lines.push(`- ${lane.name} [mode=${lane.mode}] status=${lane.status}${lane.failedPhase ? ` failedPhase=${lane.failedPhase}` : ""}`)
    if (lane.artifactPath) {
      lines.push(`  artifactPath: ${lane.artifactPath}`)
    }
    lines.push(`  summary: ${lane.headline}`)
  }

  return `${lines.join("\n")}\n`
}

export async function resolveReleaseGateReport(options: {
  cwd?: string
  env?: NodeJS.ProcessEnv
  reportPath?: string
} = {}): Promise<ReleaseGateReport> {
  const cwd = options.cwd ?? process.cwd()
  if (options.reportPath) {
    return createReleaseGateReport(loadBaselineReport(options.reportPath, cwd))
  }

  const baselineReport = await createBaselineReport({ cwd, env: options.env })
  await writeBaselineReport(baselineReport, cwd)
  return createReleaseGateReport(baselineReport)
}

export function parseReleaseGateCliArgs(argv: readonly string[]): ReleaseGateCliOptions {
  let reportPath: string | null = null
  let format: ReleaseGateFormat = "text"

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
    if (token === "--help" || token === "-h") {
      process.stdout.write(
        "Usage: node --experimental-strip-types tests/parity/release-gate.ts [--report tests/parity/artifacts/baseline-report.json] [--format text|json]\n",
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  if (reportPath) {
    return { mode: "report", reportPath, format }
  }

  return { mode: "rerun", format }
}

async function main(): Promise<void> {
  const options = parseReleaseGateCliArgs(process.argv.slice(2))
  const report = await resolveReleaseGateReport(
    options.mode === "report"
      ? { cwd: process.cwd(), reportPath: options.reportPath, env: process.env }
      : { cwd: process.cwd(), env: process.env },
  )

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    process.stdout.write(renderReleaseGateReport(report))
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
