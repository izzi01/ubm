import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const diagnosticsPath = join(repoRoot, "tests", "parity", "diagnostics.ts")
const guidePath = join(repoRoot, "tests", "parity", "human-uat-secondary.md")
const releaseReportPath = join(repoRoot, "tests", "parity", "artifacts", "secondary-release-report.json")
const secondaryDiagnosticsCommand = "node --experimental-strip-types tests/parity/diagnostics.ts --surface secondary --report tests/parity/artifacts/secondary-release-report.json"
const secondaryGateCommand = "node --experimental-strip-types tests/parity/secondary-release-gate.ts --report tests/parity/artifacts/baseline-report.json --format text"

async function importDiagnosticsModule() {
  return await import("../../../tests/parity/diagnostics.ts")
}

function loadSecondaryReleaseReport(): any {
  return JSON.parse(readFileSync(releaseReportPath, "utf8"))
}

function readGuide(): string {
  return readFileSync(guidePath, "utf8")
}

function runSecondaryDiagnostics(reportPath: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--experimental-strip-types", diagnosticsPath, "--surface", "secondary", "--report", reportPath],
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

test("secondary diagnostics renderer keeps required, optional, and live secondary lanes human-auditable in the passing artifact", async () => {
  const diagnostics = await importDiagnosticsModule()
  const report = loadSecondaryReleaseReport()

  const rendered = diagnostics.renderSecondaryParityDiagnostics(report)

  assert.match(rendered, /Secondary parity diagnostics: verdict=passed/)
  assert.match(rendered, /requiredLanesPassed: yes/)
  assert.match(rendered, /requiredLaneNames: web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift/)
  assert.match(rendered, /baselineReportPath: tests\/parity\/artifacts\/baseline-report\.json/)
  assert.match(rendered, /secondaryReleaseReportPath: tests\/parity\/artifacts\/secondary-release-report\.json/)
  assert.match(rendered, /secondarySurfaceInventoryPath: tests\/parity\/artifacts\/secondary-surface-inventory\.json/)
  assert.match(rendered, /worktreeSessionManifestPath: tests\/fixtures\/worktree-session-parity-manifest\.json/)
  assert.match(rendered, /failedSurfaces: none/)
  assert.match(rendered, /failedPhases: none/)
  assert.match(rendered, /optionalLive: status=skipped required=no includeLiveRequested=no enabled=no configured=no/)
  assert.match(rendered, /optionalLiveSkipReason: not-enabled/)
  assert.match(rendered, /required secondary lanes:/)
  assert.match(rendered, /optional secondary lanes:/)
  assert.match(rendered, /failed required lanes: none/)
  assert.match(rendered, /- web-mode \[surface=web-mode\] status=passed blocking=yes/)
  assert.match(rendered, /- mcp \[surface=mcp\] status=passed blocking=yes/)
  assert.match(rendered, /- workflow-bmad \[surface=workflow-bmad\] status=passed blocking=yes/)
  assert.match(rendered, /- worktree-session-recovery \[surface=worktree-session-recovery\] status=passed blocking=yes/)
  assert.match(rendered, /- rebrand-drift \[surface=rebrand-drift\] status=passed blocking=yes/)
  assert.match(rendered, /- repo-recording:web-mode \[surface=web-mode\] status=planned blocking=no/)
  assert.match(rendered, /- integration:mcp-session \[surface=mcp\] status=planned blocking=no/)
  assert.match(rendered, /- live-runner \[surface=provider-live\] status=skipped blocking=no/)
})

test("secondary diagnostics renderer preserves actionable failed surface, phase, and artifact attribution when a required lane is red", async () => {
  const diagnostics = await importDiagnosticsModule()
  const report = loadSecondaryReleaseReport()

  report.verdict = "failed"
  report.requiredLanesPassed = false
  report.failedSurfaces = ["workflow-bmad"]
  report.failedPhases = ["workflow-verification"]
  report.requiredLanes = report.requiredLanes.map((lane: any) =>
    lane.name === "workflow-bmad"
      ? {
          ...lane,
          status: "failed",
          failedPhases: ["workflow-verification"],
          failedSurfaces: ["workflow-bmad"],
          artifactPaths: [
            "tests/parity/artifacts/workflow-parity.failed.json",
            "tests/fixtures/recordings/workflow-parity.failed.json",
          ],
          summary: "Representative workflow parity is red, so the integrated secondary gate must fail.",
          diagnostics: [
            "releaseReadableStatus: covered",
            "parityStatus: failed",
            "verificationEvidenceStatus: failed",
          ],
        }
      : lane,
  )
  report.failedRequiredLanes = report.requiredLanes.filter((lane: any) => lane.status === "failed")

  const rendered = diagnostics.renderSecondaryParityDiagnostics(report)

  assert.match(rendered, /Secondary parity diagnostics: verdict=failed/)
  assert.match(rendered, /requiredLanesPassed: no/)
  assert.match(rendered, /failedSurfaces: workflow-bmad/)
  assert.match(rendered, /failedPhases: workflow-verification/)
  assert.match(rendered, /- workflow-bmad \[surface=workflow-bmad\] status=failed blocking=yes/)
  assert.match(rendered, /artifactPaths: tests\/parity\/artifacts\/workflow-parity\.failed\.json, tests\/fixtures\/recordings\/workflow-parity\.failed\.json/)
  assert.match(rendered, /detail: verificationEvidenceStatus: failed/)
  assert.match(rendered, /failed required lanes:/)
  assert.match(rendered, /- workflow-bmad \[surface=workflow-bmad\] status=failed/)
})

test("secondary diagnostics cli reads the tracked secondary artifact and exits non-zero when required lanes are red", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "umb-secondary-parity-diagnostics-"))
  const reportPath = join(tempDir, "secondary-release-report.synthetic.json")

  try {
    const report = loadSecondaryReleaseReport()
    report.verdict = "failed"
    report.requiredLanesPassed = false
    report.failedSurfaces = ["mcp"]
    report.failedPhases = ["mcp-parity"]
    report.requiredLanes = report.requiredLanes.map((lane: any) =>
      lane.name === "mcp"
        ? {
            ...lane,
            status: "failed",
            failedPhases: ["mcp-parity"],
            failedSurfaces: ["mcp"],
            artifactPaths: [
              ".tmp-secondary-release/mcp-parity.failed.json",
              ".tmp-secondary-release/mcp-parity.failed.recording.json",
            ],
          }
        : lane,
    )
    report.failedRequiredLanes = report.requiredLanes.filter((lane: any) => lane.status === "failed")

    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
    const result = runSecondaryDiagnostics(reportPath)

    assert.equal(result.status, 1)
    assert.match(result.stdout, /Secondary parity diagnostics: verdict=failed/)
    assert.match(result.stdout, /failedSurfaces: mcp/)
    assert.match(result.stdout, /failedPhases: mcp-parity/)
    assert.match(result.stdout, /- mcp \[surface=mcp\] status=failed blocking=yes/)
    assert.match(result.stdout, /artifactPaths: \.tmp-secondary-release\/mcp-parity\.failed\.json, \.tmp-secondary-release\/mcp-parity\.failed\.recording\.json/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("secondary diagnostics cli fails with a precise error when the secondary release artifact path is missing", () => {
  const missingPath = "tests/parity/artifacts/secondary-release-report.missing.json"
  const result = runSecondaryDiagnostics(missingPath)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Secondary parity release report not found at tests\/parity\/artifacts\/secondary-release-report\.missing\.json/)
})

test("human-readable secondary parity UAT guide stays anchored to tracked artifacts, commands, and truthful pass\/partial\/fail interpretation", () => {
  const guide = readGuide()

  assert.match(guide, /^# Human-readable secondary-surface parity UAT/m)

  for (const trackedPath of [
    "tests/parity/artifacts/baseline-report.json",
    "tests/parity/artifacts/secondary-release-report.json",
    "tests/parity/artifacts/secondary-surface-inventory.json",
    "tests/parity/artifacts/mcp-parity.json",
    "tests/parity/artifacts/workflow-parity.json",
    "tests/fixtures/worktree-session-parity-manifest.json",
    "tests/parity/secondary-release-gate.ts",
    "tests/parity/diagnostics.ts",
    "tests/parity/human-uat-secondary.md",
  ]) {
    assert.match(guide, new RegExp(trackedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(guide, new RegExp(secondaryGateCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(guide, new RegExp(secondaryDiagnosticsCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(guide, /requiredLaneNames/)
  assert.match(guide, /requiredLanesPassed/)
  assert.match(guide, /failedRequiredLanes/)
  assert.match(guide, /failedSurfaces/)
  assert.match(guide, /failedPhases/)
  assert.match(guide, /artifactPaths/)
  assert.match(guide, /baselineSummary/)
  assert.match(guide, /secondaryParitySummary/)
  assert.match(guide, /requiredLanes/)
  assert.match(guide, /optionalLanes/)
  assert.match(guide, /optionalLive/)
  assert.match(guide, /web-mode/)
  assert.match(guide, /mcp/)
  assert.match(guide, /workflow-bmad/)
  assert.match(guide, /worktree-session-recovery/)
  assert.match(guide, /rebrand-drift/)
  assert.match(guide, /repo-recording:web-mode/)
  assert.match(guide, /integration:mcp-session/)
  assert.match(guide, /installed-recording:worktree-session-recovery/)
  assert.match(guide, /pass interpretation/i)
  assert.match(guide, /partial interpretation/i)
  assert.match(guide, /fail interpretation/i)
  assert.match(guide, /Which required secondary surface failed\?/) 
  assert.match(guide, /Which phase failed\?/) 
  assert.match(guide, /Which tracked artifact recorded that failure\?/) 
  assert.match(guide, /Is the failure in a blocking required lane or a non-blocking optional lane\?/) 

  assert.doesNotMatch(guide, /TODO|TBD|placeholder|coming soon|fill this in later/i)
  assert.doesNotMatch(guide, /<insert|<todo|lorem ipsum/i)
})
