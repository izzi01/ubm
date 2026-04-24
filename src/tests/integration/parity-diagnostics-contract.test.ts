import { test } from "vitest"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const diagnosticsPath = join(repoRoot, "tests", "parity", "diagnostics.ts")
const baselineReportPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")
const repoArtifactPath = join(repoRoot, "tests", "fixtures", "recordings", "repo-mode-parity-web-task.json")
const installedArtifactPath = join(repoRoot, "tests", "fixtures", "recordings", "installed-mode-parity-web-task.json")

async function importDiagnosticsModule() {
  return await import("../../../tests/parity/diagnostics.ts")
}

function runDiagnostics(reportPath: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--experimental-strip-types", diagnosticsPath, "--report", reportPath],
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

function createSyntheticReport(): any {
  return JSON.parse(readFileSync(baselineReportPath, "utf8"))
}

test("diagnostics renderer turns the tracked baseline report into a mode-aware actionable summary", async () => {
  const diagnostics = await importDiagnosticsModule()
  const report = createSyntheticReport()
  const lane = report.lanes.find((entry: { name: string }) => entry.name === "repo-mode-coding-loop")
  assert.ok(lane)

  lane.status = "failed"
  lane.failedPhase = "browser"
  lane.artifactPath = ".tmp-repo-mode-parity-contract-synthetic/repo-mode-parity-web-task.failed.json"
  lane.phaseResults = lane.phaseResults.map((phase: any) =>
    phase.phase === "browser"
      ? {
          ...phase,
          status: "failed",
          summary: "Browser assertion observed stale in-progress copy in repo mode.",
          command: {
            command: "browser_assert text_visible #status-message",
            exitCode: 1,
            stdoutSnippet: "Expected completed status copy",
          },
          browser: {
            assertion: "#status-message text",
            expected: "Build status: Complete",
            actual: "Build status: In progress",
          },
        }
      : phase,
  )
  report.repoInstalledComparison.divergencePhases = ["browser"]
  report.repoInstalledComparison.repoArtifactPath = lane.artifactPath
  report.repoInstalledComparison.phaseComparisons = report.repoInstalledComparison.phaseComparisons.map((phase: any) =>
    phase.phase === "browser"
      ? { ...phase, repoStatus: "failed", installedStatus: "passed", matches: false }
      : phase,
  )

  const rendered = diagnostics.renderParityDiagnostics(report)

  assert.match(rendered, /Parity diagnostics: verdict=partial/)
  assert.match(rendered, /repo-mode-coding-loop \[mode=repo-mode\] status=failed failedPhase=browser/)
  assert.match(rendered, /artifactPath: \.tmp-repo-mode-parity-contract-synthetic\/repo-mode-parity-web-task\.failed\.json/)
  assert.match(rendered, /evidence: #status-message text expected "Build status: Complete" but saw "Build status: In progress"/)
  assert.match(rendered, /snippet: Expected completed status copy/)
  assert.match(rendered, /pack-install \[mode=installed-mode\] status=passed/)
  assert.match(rendered, /repo-installed comparison:/)
  assert.match(rendered, /divergencePhases: browser/)
  assert.match(rendered, /browser: repo=failed, installed=passed/)
})

test("diagnostics renderer promotes command evidence when a non-browser phase fails", async () => {
  const diagnostics = await importDiagnosticsModule()
  const report = createSyntheticReport()
  const lane = report.lanes.find((entry: { name: string }) => entry.name === "repo-mode-coding-loop")
  assert.ok(lane)

  lane.status = "failed"
  lane.failedPhase = "test"
  lane.artifactPath = "tests/fixtures/recordings/repo-mode-parity-web-task.failed-test.json"
  lane.phaseResults = lane.phaseResults.map((phase: any) =>
    phase.phase === "test"
      ? {
          ...phase,
          status: "failed",
          summary: "Targeted tests failed in repo mode.",
          command: {
            command: "npm test",
            exitCode: 1,
            stderrSnippet: "Expected Build status: Complete",
          },
        }
      : phase.phase === "browser"
        ? { ...phase, status: "passed", browser: undefined }
        : phase,
  )
  report.repoInstalledComparison.divergencePhases = ["test"]
  report.repoInstalledComparison.phaseComparisons = report.repoInstalledComparison.phaseComparisons.map((phase: any) =>
    phase.phase === "test"
      ? { ...phase, repoStatus: "failed", installedStatus: "passed", matches: false }
      : phase.phase === "browser"
        ? { ...phase, repoStatus: "passed", installedStatus: "passed", matches: true }
        : phase,
  )

  const rendered = diagnostics.renderParityDiagnostics(report)
  assert.match(rendered, /repo-mode-coding-loop \[mode=repo-mode\] status=failed failedPhase=test/)
  assert.match(rendered, /evidence: npm test exited with code 1/)
  assert.match(rendered, /snippet: Expected Build status: Complete/)
  assert.match(rendered, /divergencePhases: test/)
  assert.match(rendered, /test: repo=failed, installed=passed/)
})

test("diagnostics cli reads a synthetic passing report and preserves local artifact paths without extra harness state", () => {
  const tempDir = mkdtempSync(join(repoRoot, ".tmp-parity-diagnostics-contract-"))
  const reportPath = join(tempDir, "baseline-report.synthetic.json")
  const relativeReportPath = reportPath.replace(`${repoRoot}/`, "")

  try {
    const report = createSyntheticReport()
    report.summary.verdict = "covered"
    report.summary.failed = 0
    report.summary.skipped = 0
    report.summary.uncoveredLaneNames = []
    report.summary.uncoveredCapabilityNames = []
    report.lanes = report.lanes.map((lane: any) => {
      if (lane.name === "smoke-runner") {
        return { ...lane, status: "passed", skipReason: null, exitCode: 0 }
      }
      if (lane.name === "live-runner") {
        return { ...lane, status: "passed", skipReason: null, exitCode: 0 }
      }
      if (lane.name === "repo-mode-coding-loop") {
        return {
          ...lane,
          status: "passed",
          failedPhase: null,
          artifactPath: repoArtifactPath.replace(`${repoRoot}/`, ""),
          phaseResults: lane.phaseResults.map((phase: any) => ({
            ...phase,
            status: "passed",
            browser: phase.phase === "browser"
              ? {
                  assertion: "#status-message text",
                  expected: "Build status: Complete",
                  actual: "Build status: Complete",
                }
              : phase.browser,
          })),
        }
      }
      if (lane.name === "pack-install") {
        return {
          ...lane,
          status: "passed",
          failedPhase: null,
          artifactPath: installedArtifactPath.replace(`${repoRoot}/`, ""),
        }
      }
      return lane
    })
    report.repoInstalledComparison.repoArtifactPath = repoArtifactPath.replace(`${repoRoot}/`, "")
    report.repoInstalledComparison.installedArtifactPath = installedArtifactPath.replace(`${repoRoot}/`, "")
    report.repoInstalledComparison.divergencePhases = []
    report.repoInstalledComparison.phaseComparisons = report.repoInstalledComparison.phaseComparisons.map((phase: any) => ({
      ...phase,
      repoStatus: "passed",
      installedStatus: "passed",
      matches: true,
    }))

    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
    const result = runDiagnostics(relativeReportPath)

    assert.equal(result.status, 0, `diagnostics stderr:\n${result.stderr}`)
    assert.match(result.stdout, /Parity diagnostics: verdict=covered/)
    assert.match(result.stdout, /repo-mode-coding-loop \[mode=repo-mode\] status=passed/)
    assert.match(result.stdout, /artifactPath: tests\/fixtures\/recordings\/repo-mode-parity-web-task\.json/)
    assert.match(result.stdout, /pack-install \[mode=installed-mode\] status=passed/)
    assert.match(result.stdout, /artifactPath: tests\/fixtures\/recordings\/installed-mode-parity-web-task\.json/)
    assert.match(result.stdout, /divergencePhases: none/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("diagnostics cli fails with a precise error when the baseline report path is missing", () => {
  const missingPath = "tests/parity/artifacts/does-not-exist.json"
  const result = runDiagnostics(missingPath)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Baseline parity report not found at tests\/parity\/artifacts\/does-not-exist\.json/)
})
