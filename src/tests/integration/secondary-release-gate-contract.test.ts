import { test } from "vitest"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const releaseGatePath = join(repoRoot, "tests", "parity", "secondary-release-gate.ts")
const baselineReportPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")
const secondaryArtifactPath = "tests/parity/artifacts/secondary-release-report.json"
const mcpArtifactPath = "tests/parity/artifacts/mcp-parity.json"
const workflowArtifactPath = "tests/parity/artifacts/workflow-parity.json"
const worktreeManifestPath = "tests/fixtures/worktree-session-parity-manifest.json"

async function importReleaseGateModule() {
  return await import("../../../tests/parity/secondary-release-gate.ts")
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

test("secondary release gate composes required secondary surfaces while keeping optional live/provider evidence non-blocking", async () => {
  const gate = await importReleaseGateModule()
  const baselineReport = createSyntheticBaselineReport()

  const report = gate.createSecondaryReleaseGateReport(baselineReport)
  const rendered = gate.renderSecondaryReleaseGateReport(report)

  assert.equal(report.version, 1)
  assert.equal(report.verdict, "passed")
  assert.equal(report.requiredLanesPassed, true)
  assert.deepEqual(report.requiredLaneNames, [
    "web-mode",
    "mcp",
    "workflow-bmad",
    "worktree-session-recovery",
    "rebrand-drift",
  ])
  assert.deepEqual(report.failedRequiredLanes, [])
  assert.deepEqual(report.failedSurfaces, [])
  assert.deepEqual(report.failedPhases, [])
  assert.equal(report.artifactPaths.baselineReport, "tests/parity/artifacts/baseline-report.json")
  assert.equal(report.artifactPaths.secondaryReleaseReport, secondaryArtifactPath)
  assert.equal(report.artifactPaths.secondarySurfaceInventory, "tests/parity/artifacts/secondary-surface-inventory.json")
  assert.equal(report.artifactPaths.mcpParity, mcpArtifactPath)
  assert.equal(report.artifactPaths.workflowParity, workflowArtifactPath)
  assert.equal(report.artifactPaths.worktreeSessionManifest, worktreeManifestPath)
  assert.equal(report.optionalLive.status, "skipped")
  assert.equal(report.optionalLive.required, false)
  assert.equal(report.optionalLive.includeLiveRequested, false)
  assert.equal(report.optionalLive.enabled, false)
  assert.equal(report.optionalLive.configured, false)
  assert.equal(report.optionalLive.skipReason, "not-enabled")
  assert.match(String(report.optionalLive.reason), /GSD_LIVE_TESTS/)

  assert.equal(report.requiredLanes.find((lane: any) => lane.name === "web-mode")?.status, "passed")
  assert.equal(report.requiredLanes.find((lane: any) => lane.name === "mcp")?.status, "passed")
  assert.equal(report.requiredLanes.find((lane: any) => lane.name === "workflow-bmad")?.status, "passed")
  assert.equal(report.requiredLanes.find((lane: any) => lane.name === "worktree-session-recovery")?.status, "passed")
  assert.equal(report.requiredLanes.find((lane: any) => lane.name === "rebrand-drift")?.status, "passed")
  assert.ok(report.optionalLanes.some((lane: any) => lane.name === "repo-recording:web-mode" && lane.status === "planned"))
  assert.ok(report.optionalLanes.some((lane: any) => lane.name === "integration:mcp-session" && lane.status === "planned"))
  assert.ok(report.optionalLanes.some((lane: any) => lane.name === "live-runner" && lane.blocking === false))

  assert.match(rendered, /Secondary parity release gate: verdict=passed/)
  assert.match(rendered, /requiredLanesPassed: yes/)
  assert.match(rendered, /requiredLaneNames: web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift/)
  assert.match(rendered, /secondaryReleaseReportPath: tests\/parity\/artifacts\/secondary-release-report\.json/)
  assert.match(rendered, /worktreeSessionManifestPath: tests\/fixtures\/worktree-session-parity-manifest\.json/)
  assert.match(rendered, /mcpParityArtifactPath: tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /workflowParityArtifactPath: tests\/parity\/artifacts\/workflow-parity\.json/)
  assert.match(rendered, /failedSurfaces: none/)
  assert.match(rendered, /failedPhases: none/)
  assert.match(rendered, /optionalLive: status=skipped required=no includeLiveRequested=no enabled=no configured=no/)
  assert.match(rendered, /optionalLiveSkipReason: not-enabled/)
  assert.match(rendered, /requiredLanes:/)
  assert.match(rendered, /optionalLanes:/)
  assert.match(rendered, /failedRequiredLanes: none/)
})

test("secondary release gate fails when a required composed lane goes red and preserves failed surfaces, phases, and artifact paths", async () => {
  const gate = await importReleaseGateModule()
  const baselineReport = createSyntheticBaselineReport()
  baselineReport.mcpParity.parityStatus = "failed"
  baselineReport.mcpParity.diagnostics.successInvocation.status = "failed"
  baselineReport.mcpParity.diagnostics.failureInvocation.status = "failed"
  baselineReport.mcpParity.releaseReadableStatus = "partial"
  baselineReport.mcpParity.parityArtifactPath = ".tmp-secondary-release/mcp-parity.failed.json"
  baselineReport.mcpParity.recordingPath = ".tmp-secondary-release/mcp-parity.failed.recording.json"

  const report = gate.createSecondaryReleaseGateReport(baselineReport)
  const rendered = gate.renderSecondaryReleaseGateReport(report)

  assert.equal(report.verdict, "failed")
  assert.equal(report.requiredLanesPassed, false)
  assert.deepEqual(report.failedSurfaces, ["mcp"])
  assert.deepEqual(report.failedPhases, ["mcp-parity"])
  assert.equal(report.failedRequiredLanes.length, 1)
  assert.equal(report.failedRequiredLanes[0].name, "mcp")
  assert.equal(report.failedRequiredLanes[0].status, "failed")
  assert.equal(report.failedRequiredLanes[0].reportPath, "tests/parity/artifacts/mcp-parity.json#mcpParity")
  assert.deepEqual(report.failedRequiredLanes[0].artifactPaths, [
    ".tmp-secondary-release/mcp-parity.failed.json",
    ".tmp-secondary-release/mcp-parity.failed.recording.json",
  ])
  assert.deepEqual(report.failedRequiredLanes[0].failedPhases, ["mcp-parity"])
  assert.match(rendered, /Secondary parity release gate: verdict=failed/)
  assert.match(rendered, /failedSurfaces: mcp/)
  assert.match(rendered, /failedPhases: mcp-parity/)
  assert.match(rendered, /- mcp \[surface=mcp\] status=failed/)
  assert.match(rendered, /artifactPaths: \.tmp-secondary-release\/mcp-parity\.failed\.json, \.tmp-secondary-release\/mcp-parity\.failed\.recording\.json/)
})

test("secondary release gate cli can consume the canonical baseline artifact without rerunning and exits non-zero when a required lane is red", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "umb-secondary-release-gate-"))
  const reportPath = join(tempDir, "baseline-report.synthetic.json")

  try {
    const baselineReport = createSyntheticBaselineReport()
    baselineReport.workflowParity.parityStatus = "failed"
    baselineReport.workflowParity.diagnostics.verificationEvidence.status = "failed"
    baselineReport.workflowParity.parityArtifactPath = "tests/parity/artifacts/workflow-parity.failed.json"
    baselineReport.workflowParity.recordingPath = "tests/fixtures/recordings/workflow-parity.failed.json"

    writeFileSync(reportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8")
    const result = runReleaseGate(["--report", reportPath, "--format", "json"])

    assert.equal(result.status, 1)
    const gateReport = JSON.parse(result.stdout)
    assert.equal(gateReport.verdict, "failed")
    assert.equal(gateReport.requiredLanesPassed, false)
    assert.deepEqual(gateReport.failedSurfaces, ["workflow-bmad"])
    assert.deepEqual(gateReport.failedPhases, ["workflow-verification"])
    assert.equal(gateReport.failedRequiredLanes[0].name, "workflow-bmad")
    assert.equal(gateReport.failedRequiredLanes[0].artifactPaths[0], "tests/parity/artifacts/workflow-parity.failed.json")
    assert.equal(gateReport.optionalLive.status, "skipped")
    assert.equal(gateReport.optionalLive.skipReason, "not-enabled")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("secondary release gate cli writes the integrated artifact and emits a stable green text report when required lanes pass", () => {
  const result = runReleaseGate(["--report", "tests/parity/artifacts/baseline-report.json", "--format", "text"])

  assert.equal(result.status, 0, `stderr:\n${result.stderr}`)
  assert.match(result.stdout, /Secondary parity release gate: verdict=passed/)
  assert.match(result.stdout, /requiredLaneNames: web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift/)
  assert.match(result.stdout, /baselineReportPath: tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(result.stdout, /secondaryReleaseReportPath: tests\/parity\/artifacts\/secondary-release-report\.json/)
  assert.match(result.stdout, /diagnosticsCommand: node --experimental-strip-types tests\/parity\/secondary-release-gate\.ts --report tests\/parity\/artifacts\/baseline-report\.json --format text/)
  assert.match(result.stdout, /optionalLive: status=(passed|failed|skipped|timed_out) required=no includeLiveRequested=no enabled=(yes|no) configured=(yes|no)/)
  assert.match(result.stdout, /requiredLanes:/)
  assert.match(result.stdout, /optionalLanes:/)

  const artifact = JSON.parse(readFileSync(join(repoRoot, secondaryArtifactPath), "utf8"))
  assert.equal(artifact.verdict, "passed")
  assert.equal(artifact.artifactPaths.secondaryReleaseReport, secondaryArtifactPath)
  assert.deepEqual(artifact.requiredLaneNames, [
    "web-mode",
    "mcp",
    "workflow-bmad",
    "worktree-session-recovery",
    "rebrand-drift",
  ])
})
