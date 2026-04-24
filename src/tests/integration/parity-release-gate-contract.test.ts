import { test } from "vitest"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const releaseGatePath = join(repoRoot, "tests", "parity", "release-gate.ts")
const baselineReportPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")
const repoArtifactPath = "tests/fixtures/recordings/repo-mode-parity-web-task.json"
const installedArtifactPath = "tests/fixtures/recordings/installed-mode-parity-web-task.json"

async function importReleaseGateModule() {
  return await import("../../../tests/parity/release-gate.ts")
}

function runReleaseGate(args: string[]): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--experimental-strip-types", releaseGatePath, ...args],
      {
        cwd: repoRoot,
        env: process.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    return { stdout, stderr: "", status: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      status: error.status ?? 1,
    }
  }
}

function createSyntheticBaselineReport(): any {
  return JSON.parse(readFileSync(baselineReportPath, "utf8"))
}

test("release gate report marks repo/dev plus installed coding-loop lanes as the strict requirement while live stays optional", async () => {
  const releaseGate = await importReleaseGateModule()
  const baselineReport = createSyntheticBaselineReport()

  const report = releaseGate.createReleaseGateReport(baselineReport)

  assert.equal(report.version, 2)
  assert.equal(report.verdict, "passed")
  assert.equal(report.requiredLanesPassed, true)
  assert.deepEqual(report.requiredLaneNames, ["repo-mode-coding-loop", "pack-install"])
  assert.deepEqual(report.failedRequiredLanes, [])
  assert.deepEqual(report.failedPhases, [])
  assert.equal(report.optionalLive.status, "skipped")
  assert.equal(report.optionalLive.required, false)
  assert.equal(report.optionalLive.includeLiveRequested, false)
  assert.equal(report.optionalLive.enabled, false)
  assert.equal(report.optionalLive.configured, false)
  assert.equal(report.optionalLive.skipReason, "not-enabled")
  assert.match(String(report.optionalLive.reason), /GSD_LIVE_TESTS/)
  assert.equal(report.baselineReportPath, "tests/parity/artifacts/baseline-report.json")
  assert.equal(report.artifactPaths.repoMode, repoArtifactPath)
  assert.equal(report.artifactPaths.installedMode, installedArtifactPath)
  assert.equal(report.repoInstalledComparison.comparableWithoutRerun, true)
  assert.deepEqual(report.repoInstalledComparison.divergencePhases, [])
  assert.ok(Array.isArray(report.actionableDiagnostics))
  assert.ok(report.actionableDiagnostics.some((lane: any) => lane.name === "repo-mode-coding-loop"))
})

test("release gate fails only when a required lane fails and preserves failed phase, artifact path, and comparison evidence", async () => {
  const releaseGate = await importReleaseGateModule()
  const baselineReport = createSyntheticBaselineReport()
  const repoLane = baselineReport.lanes.find((lane: { name: string }) => lane.name === "repo-mode-coding-loop")
  assert.ok(repoLane)

  repoLane.status = "failed"
  repoLane.failedPhase = "browser"
  repoLane.skipReason = "repo-mode-coding-loop failed during browser"
  repoLane.artifactPath = ".tmp-release-gate/repo-mode-parity-web-task.failed.json"
  repoLane.phaseResults = repoLane.phaseResults.map((phase: any) =>
    phase.phase === "browser"
      ? {
          ...phase,
          status: "failed",
          summary: "Browser assertion observed stale in-progress copy in repo mode.",
          browser: {
            assertion: "#status-message text",
            expected: "Build status: Complete",
            actual: "Build status: In progress",
          },
        }
      : phase,
  )
  baselineReport.repoInstalledComparison.repoArtifactPath = repoLane.artifactPath
  baselineReport.repoInstalledComparison.divergencePhases = ["browser"]
  baselineReport.repoInstalledComparison.phaseComparisons = baselineReport.repoInstalledComparison.phaseComparisons.map((phase: any) =>
    phase.phase === "browser"
      ? { ...phase, repoStatus: "failed", installedStatus: "passed", matches: false }
      : phase,
  )

  const report = releaseGate.createReleaseGateReport(baselineReport)
  const rendered = releaseGate.renderReleaseGateReport(report)

  assert.equal(report.verdict, "failed")
  assert.equal(report.requiredLanesPassed, false)
  assert.equal(report.failedRequiredLanes.length, 1)
  assert.deepEqual(report.failedPhases, ["browser"])
  assert.deepEqual(report.failedRequiredLanes[0], {
    name: "repo-mode-coding-loop",
    mode: "repo-mode",
    status: "failed",
    failedPhase: "browser",
    artifactPath: ".tmp-release-gate/repo-mode-parity-web-task.failed.json",
    skipReason: "repo-mode-coding-loop failed during browser",
  })
  assert.equal(report.artifactPaths.repoMode, ".tmp-release-gate/repo-mode-parity-web-task.failed.json")
  assert.deepEqual(report.repoInstalledComparison.divergencePhases, ["browser"])
  assert.match(rendered, /Parity release gate: verdict=failed/)
  assert.match(rendered, /requiredLanesPassed: no/)
  assert.match(rendered, /requiredLaneNames: repo-mode-coding-loop, pack-install/)
  assert.match(rendered, /optionalLive: status=skipped required=no includeLiveRequested=no enabled=no configured=no/)
  assert.match(rendered, /optionalLiveSkipReason: not-enabled/)
  assert.match(rendered, /failedPhases: browser/)
  assert.match(rendered, /baselineReportPath: tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(rendered, /repoArtifactPath: \.tmp-release-gate\/repo-mode-parity-web-task\.failed\.json/)
  assert.match(rendered, /installedArtifactPath: tests\/fixtures\/recordings\/installed-mode-parity-web-task\.json/)
  assert.match(rendered, /diagnosticsCommand: node --experimental-strip-types tests\/parity\/diagnostics\.ts --report tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(rendered, /repoInstalledComparison: comparableWithoutRerun=yes divergencePhases=browser/)
  assert.match(rendered, /failedRequiredLanes:/)
  assert.match(rendered, /repo-mode-coding-loop \[mode=repo-mode\] status=failed failedPhase=browser/)
  assert.match(rendered, /artifactPath: \.tmp-release-gate\/repo-mode-parity-web-task\.failed\.json/)
  assert.match(rendered, /reason: repo-mode-coding-loop failed during browser/)
})

test("release gate cli can consume the canonical report without rerunning and exits non-zero when required lanes are red", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "umb-release-gate-contract-"))
  const reportPath = join(tempDir, "baseline-report.synthetic.json")

  try {
    const report = createSyntheticBaselineReport()
    const repoLane = report.lanes.find((lane: { name: string }) => lane.name === "repo-mode-coding-loop")
    repoLane.status = "failed"
    repoLane.failedPhase = "test"
    repoLane.skipReason = "repo-mode-coding-loop failed during test"
    repoLane.artifactPath = "tests/fixtures/recordings/repo-mode-parity-web-task.failed-test.json"
    report.repoInstalledComparison.repoArtifactPath = repoLane.artifactPath
    report.repoInstalledComparison.divergencePhases = ["test"]
    report.repoInstalledComparison.phaseComparisons = report.repoInstalledComparison.phaseComparisons.map((phase: any) =>
      phase.phase === "test"
        ? { ...phase, repoStatus: "failed", installedStatus: "passed", matches: false }
        : phase,
    )

    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
    const result = runReleaseGate(["--report", reportPath, "--format", "json"])

    assert.equal(result.status, 1)
    const gateReport = JSON.parse(result.stdout)
    assert.equal(gateReport.verdict, "failed")
    assert.equal(gateReport.requiredLanesPassed, false)
    assert.deepEqual(gateReport.failedPhases, ["test"])
    assert.equal(gateReport.failedRequiredLanes[0].name, "repo-mode-coding-loop")
    assert.equal(gateReport.failedRequiredLanes[0].failedPhase, "test")
    assert.equal(gateReport.artifactPaths.baselineReport, "tests/parity/artifacts/baseline-report.json")
    assert.equal(gateReport.artifactPaths.repoMode, "tests/fixtures/recordings/repo-mode-parity-web-task.failed-test.json")
    assert.equal(gateReport.artifactPaths.installedMode, installedArtifactPath)
    assert.equal(gateReport.optionalLive.status, "skipped")
    assert.equal(gateReport.optionalLive.skipReason, "not-enabled")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("release gate cli reruns the canonical baseline report, emits a stable text contract, and stays green when required lanes pass even if optional lanes remain red", { timeout: 60000 }, () => {
  const result = runReleaseGate([])

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Parity release gate: verdict=passed/)
  assert.match(result.stdout, /requiredLaneNames: repo-mode-coding-loop, pack-install/)
  assert.match(result.stdout, /optionalLive: status=(passed|failed|skipped|timed_out) required=no includeLiveRequested=no enabled=(yes|no) configured=(yes|no)/)
  assert.match(result.stdout, /optionalLiveSkipReason: not-enabled/)
  assert.match(result.stdout, /baselineReportPath: tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(result.stdout, /repoArtifactPath: tests\/fixtures\/recordings\/repo-mode-parity-web-task\.json/)
  assert.match(result.stdout, /installedArtifactPath: tests\/fixtures\/recordings\/installed-mode-parity-web-task\.json/)
  assert.match(result.stdout, /diagnosticsCommand: node --experimental-strip-types tests\/parity\/diagnostics\.ts --report tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(result.stdout, /baselineSummary: verdict=partial passed=7\/8 failed=0 skipped=1 timedOut=0/)
  assert.match(result.stdout, /actionableDiagnostics:/)
})
