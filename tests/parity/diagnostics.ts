import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import {
  BASELINE_REPORT_PATH,
  type BaselineLaneResult,
  type BaselineReport,
  type LaneStatus,
  type McpParitySurfaceReportRow,
  type RepoInstalledComparison,
  type RepoModeBrowserDiagnostic,
  type RepoModeCommandDiagnostic,
  type RepoModePhaseResult,
} from "./baseline-lanes.ts"
import type { WorkflowParityReport } from "./workflow-parity.ts"

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

function renderMcpParityDiagnostics(mcpParity: McpParitySurfaceReportRow | undefined): string[] {
  if (!mcpParity) {
    return []
  }

  const lines = [
    "mcp parity:",
    `  surface: ${mcpParity.id}`,
    `  title: ${mcpParity.title}`,
    `  releaseReadableStatus: ${mcpParity.releaseReadableStatus}`,
    `  parityStatus: ${mcpParity.parityStatus}`,
    `  reportPath: ${mcpParity.reportPath}`,
    `  artifactPath: ${mcpParity.parityArtifactPath}`,
    `  recordingPath: ${mcpParity.recordingPath}`,
  ]

  const configured = mcpParity.diagnostics.configuredServer
  lines.push(
    `  configuredServer: status=${configured.status} name=${configured.name} transport=${configured.transport} readyLineSeen=${configured.readyLineSeen ? "yes" : "no"}`,
  )
  if (configured.status !== "passed") {
    lines.push("    failureAttribution: configured server missing or misconfigured")
  } else if (!configured.readyLineSeen) {
    lines.push("    failureAttribution: configured server started without the expected readiness signal")
  }

  const discovered = mcpParity.diagnostics.discoveredTools
  lines.push(
    `  toolDiscovery: status=${discovered.status} expected=${discovered.expected.join(", ")} actual=${discovered.actual.join(", ")}`,
  )

  const schema = mcpParity.diagnostics.schemaInspection
  lines.push(
    `  schemaInspection: status=${schema.status} tool=${schema.tool} required=${schema.required.join(", ")} actualRequired=${schema.actualRequired.join(", ")} additionalProperties=${schema.additionalProperties === null ? "null" : String(schema.additionalProperties)}`,
  )
  if (schema.status !== "passed") {
    lines.push(`    failureAttribution: schema mismatch on ${schema.tool}`)
  }

  const success = mcpParity.diagnostics.successInvocation
  lines.push(
    `  successInvocation: status=${success.status} tool=${success.tool} isError=${success.isError ? "yes" : "no"} phase=tool-call artifact=${mcpParity.parityArtifactPath}`,
  )
  if (success.status === "passed") {
    lines.push(`    success: successful call reported by ${success.tool} via ${mcpParity.parityArtifactPath}`)
  } else {
    lines.push(`    failureAttribution: successful call reporting failed for ${success.tool}`)
  }

  const failure = mcpParity.diagnostics.failureInvocation
  const failurePhase = typeof failure.payload.phase === "string" ? failure.payload.phase : "unknown"
  const failureAttribution = typeof failure.payload.attribution === "string" ? failure.payload.attribution : failure.tool
  const failureCode = typeof failure.payload.code === "string" ? failure.payload.code : "unknown"
  lines.push(
    `  failureInvocation: status=${failure.status} tool=${failure.tool} isError=${failure.isError ? "yes" : "no"} phase=${failurePhase} attribution=${failureAttribution} code=${failureCode} artifact=${mcpParity.parityArtifactPath}`,
  )
  if (failure.status === "passed") {
    lines.push(`    failureAttribution: invocation failure preserved for ${failureAttribution} during ${failurePhase}`)
  } else {
    lines.push(`    failureAttribution: invocation failure reporting drifted for ${failureAttribution}`)
  }

  return lines
}

function renderWorkflowParityDiagnostics(workflowParity: {
  id: string
  title: string
  releaseReadableStatus: "partial" | "covered" | "uncovered"
  parityStatus: WorkflowParityReport["status"]
  reportPath: string
  parityArtifactPath: string
  recordingPath: string
  diagnostics: WorkflowParityReport["diagnostics"]
} | undefined): string[] {
  if (!workflowParity) {
    return []
  }

  const lines = [
    "workflow parity:",
    `  surface: ${workflowParity.id}`,
    `  title: ${workflowParity.title}`,
    `  releaseReadableStatus: ${workflowParity.releaseReadableStatus}`,
    `  parityStatus: ${workflowParity.parityStatus}`,
    `  reportPath: ${workflowParity.reportPath}`,
    `  artifactPath: ${workflowParity.parityArtifactPath}`,
    `  recordingPath: ${workflowParity.recordingPath}`,
    `  stateManifestPath: ${workflowParity.diagnostics.stateManifestPath}`,
    `  taskSummaryPath: ${workflowParity.diagnostics.taskSummaryPath}`,
    `  verificationEvidence: status=${workflowParity.diagnostics.verificationEvidence.status} rows=${workflowParity.diagnostics.verificationEvidence.rowCount}`,
  ]

  for (const artifact of workflowParity.diagnostics.artifactChecks) {
    lines.push(
      `  artifactCheck: id=${artifact.id} phase=${artifact.producerPhase} exists=${artifact.exists ? "yes" : "no"} path=${artifact.path}${artifact.missingMarkers.length > 0 ? ` missingMarkers=${artifact.missingMarkers.join(", ")}` : ""}`,
    )
  }

  for (const transition of workflowParity.diagnostics.stateTransitions) {
    lines.push(
      `  stateTransition: phase=${transition.phase} ${transition.entity}.${transition.field} expected=${transition.expected} observed=${transition.observed ?? "missing"} status=${transition.status}`,
    )
  }

  for (const failure of workflowParity.diagnostics.failureDiagnostics) {
    lines.push(`  failure: ${failure}`)
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

  const mcpLines = renderMcpParityDiagnostics(report.mcpParity)
  if (mcpLines.length > 0) {
    lines.push("")
    lines.push(...mcpLines)
  }

  const workflowLines = renderWorkflowParityDiagnostics(report.workflowParity)
  if (workflowLines.length > 0) {
    lines.push("")
    lines.push(...workflowLines)
  }

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
