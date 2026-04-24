import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import {
  BASELINE_REPORT_PATH,
  type BaselineLaneResult,
  type BaselineReport,
  type LaneStatus,
  type RepoInstalledComparison,
  type RepoModeBrowserDiagnostic,
  type RepoModeCommandDiagnostic,
  type RepoModePhaseResult,
} from "./baseline-lanes.ts"

export interface ParityEvidenceSummary {
  type: "browser" | "command" | "summary"
  headline: string
  detailLines: string[]
}

export interface LaneDiagnosticSummary {
  name: string
  mode: string
  status: LaneStatus
  failedPhase: string | null
  artifactPath: string | null
  headline: string
  evidence: ParityEvidenceSummary | null
}

function normalizeMode(lane: BaselineLaneResult): string {
  if (lane.parityScope === "repo-mode") {
    return "repo-mode"
  }
  if (lane.parityScope === "installed-mode") {
    return "installed-mode"
  }
  if (lane.name === "repo-mode-coding-loop") {
    return "repo-mode"
  }
  if (lane.name === "pack-install") {
    return "installed-mode"
  }
  return lane.parityScope
}

function formatExitCode(exitCode: number | null | undefined): string {
  return exitCode == null ? "unknown" : String(exitCode)
}

function compactSnippet(snippet: string | undefined): string | null {
  if (typeof snippet !== "string") {
    return null
  }
  const normalized = snippet.trim().replace(/\s+/g, " ")
  return normalized.length > 0 ? normalized : null
}

function selectCommandSnippet(command: RepoModeCommandDiagnostic): string | null {
  return compactSnippet(command.stderrSnippet) ?? compactSnippet(command.stdoutSnippet)
}

export function summarizePhaseEvidence(phaseResult: RepoModePhaseResult): ParityEvidenceSummary {
  const browser = phaseResult.browser as RepoModeBrowserDiagnostic | undefined
  if (browser) {
    return {
      type: "browser",
      headline: `${browser.assertion} expected ${JSON.stringify(browser.expected)} but saw ${JSON.stringify(browser.actual)}`,
      detailLines: [
        `assertion: ${browser.assertion}`,
        `expected: ${browser.expected}`,
        `actual: ${browser.actual}`,
        ...(phaseResult.command
          ? [
              `command: ${phaseResult.command.command}`,
              `exitCode: ${formatExitCode(phaseResult.command.exitCode)}`,
              ...(selectCommandSnippet(phaseResult.command)
                ? [`snippet: ${selectCommandSnippet(phaseResult.command)}`]
                : []),
            ]
          : []),
      ],
    }
  }

  const command = phaseResult.command as RepoModeCommandDiagnostic | undefined
  if (command) {
    return {
      type: "command",
      headline: `${command.command} exited with code ${formatExitCode(command.exitCode)}`,
      detailLines: [
        `command: ${command.command}`,
        `exitCode: ${formatExitCode(command.exitCode)}`,
        ...(selectCommandSnippet(command) ? [`snippet: ${selectCommandSnippet(command)}`] : []),
      ],
    }
  }

  return {
    type: "summary",
    headline: phaseResult.summary,
    detailLines: [`summary: ${phaseResult.summary}`],
  }
}

function selectHighestSignalPhase(lane: BaselineLaneResult): RepoModePhaseResult | null {
  const failed = lane.phaseResults.find((phase) => phase.status === "failed")
  if (failed) {
    return failed
  }
  const browser = lane.phaseResults.find((phase) => phase.browser)
  if (browser) {
    return browser
  }
  const command = lane.phaseResults.find((phase) => phase.command)
  if (command) {
    return command
  }
  return lane.phaseResults[0] ?? null
}

export function summarizeLaneDiagnostic(lane: BaselineLaneResult): LaneDiagnosticSummary {
  const selectedPhase = selectHighestSignalPhase(lane)
  const mode = normalizeMode(lane)
  const failedPhase = lane.failedPhase ?? selectedPhase?.phase ?? null
  const evidence = selectedPhase ? summarizePhaseEvidence(selectedPhase) : null
  const headline = lane.status === "passed"
    ? `${lane.name} passed${failedPhase ? ` with ${failedPhase} evidence available` : ""}`
    : lane.status === "failed"
      ? `${lane.name} failed${failedPhase ? ` during ${failedPhase}` : ""}`
      : lane.status === "timed_out"
        ? `${lane.name} timed out${failedPhase ? ` during ${failedPhase}` : ""}`
        : `${lane.name} skipped`

  return {
    name: lane.name,
    mode,
    status: lane.status,
    failedPhase,
    artifactPath: lane.artifactPath,
    headline,
    evidence,
  }
}

export function collectActionableLaneDiagnostics(report: BaselineReport): LaneDiagnosticSummary[] {
  return report.lanes
    .filter((lane) => lane.status !== "passed" || lane.phaseResults.length > 0)
    .map((lane) => summarizeLaneDiagnostic(lane))
}

function renderRepoInstalledComparison(comparison: RepoInstalledComparison): string[] {
  const lines = [
    "repo-installed comparison:",
    `  comparableWithoutRerun: ${comparison.comparableWithoutRerun ? "yes" : "no"}`,
    `  repoArtifactPath: ${comparison.repoArtifactPath ?? "none"}`,
    `  installedArtifactPath: ${comparison.installedArtifactPath ?? "none"}`,
    `  divergencePhases: ${comparison.divergencePhases.length > 0 ? comparison.divergencePhases.join(", ") : "none"}`,
  ]

  for (const phase of comparison.phaseComparisons) {
    if (!phase.matches) {
      lines.push(`  - ${phase.phase}: repo=${phase.repoStatus}, installed=${phase.installedStatus}`)
    }
  }

  return lines
}

export function renderParityDiagnostics(report: BaselineReport): string {
  const lines: string[] = []
  lines.push(`Parity diagnostics: verdict=${report.summary.verdict}`)
  lines.push(
    `lanes: total=${report.summary.totalLanes}, passed=${report.summary.passed}, failed=${report.summary.failed}, skipped=${report.summary.skipped}, timedOut=${report.summary.timedOut}`,
  )
  lines.push(`provesCodingLoop: ${report.summary.provesCodingLoop ? "yes" : "no"}`)
  if (report.summary.uncoveredLaneNames.length > 0) {
    lines.push(`uncoveredLanes: ${report.summary.uncoveredLaneNames.join(", ")}`)
  }
  if (report.summary.uncoveredCapabilityNames.length > 0) {
    lines.push(`uncoveredCapabilities: ${report.summary.uncoveredCapabilityNames.join(", ")}`)
  }

  lines.push("")
  lines.push("actionable lanes:")
  for (const lane of collectActionableLaneDiagnostics(report)) {
    lines.push(`- ${lane.name} [mode=${lane.mode}] status=${lane.status}${lane.failedPhase ? ` failedPhase=${lane.failedPhase}` : ""}`)
    if (lane.artifactPath) {
      lines.push(`  artifactPath: ${lane.artifactPath}`)
    }
    lines.push(`  summary: ${lane.headline}`)
    if (lane.evidence) {
      lines.push(`  evidence: ${lane.evidence.headline}`)
      for (const detail of lane.evidence.detailLines) {
        lines.push(`    ${detail}`)
      }
    }
  }

  lines.push("")
  lines.push(...renderRepoInstalledComparison(report.repoInstalledComparison))
  return `${lines.join("\n")}\n`
}

export function loadBaselineReport(reportPath: string = BASELINE_REPORT_PATH, cwd: string = process.cwd()): BaselineReport {
  const absolutePath = isAbsolute(reportPath) ? reportPath : join(cwd, reportPath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Baseline parity report not found at ${reportPath}`)
  }

  let raw: string
  try {
    raw = readFileSync(absolutePath, "utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read baseline parity report at ${reportPath}: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse baseline parity report at ${reportPath}: ${message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid baseline parity report at ${reportPath}: expected a JSON object at the root`)
  }

  return parsed as BaselineReport
}

type CliOptions = {
  reportPath: string
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  let reportPath = BASELINE_REPORT_PATH

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
    if (token === "--help" || token === "-h") {
      process.stdout.write("Usage: node --experimental-strip-types tests/parity/diagnostics.ts [--report tests/parity/artifacts/baseline-report.json]\n")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  return { reportPath }
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2))
  const report = loadBaselineReport(options.reportPath, process.cwd())
  process.stdout.write(renderParityDiagnostics(report))
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
