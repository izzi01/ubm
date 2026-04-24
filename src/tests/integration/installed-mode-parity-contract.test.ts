import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import {
  DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH,
  INSTALLED_MODE_LANE_NAME,
  loadInstalledModeProofArtifact,
  resolveInstalledModeArtifactPath,
} from "./helpers/installed-mode-parity.ts"

const repoRoot = process.cwd()
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const artifactPath = join(repoRoot, DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH)

function runParity(env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--experimental-strip-types", runnerPath, "--format", "json"],
      {
        cwd: repoRoot,
        env,
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

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

test("installed-mode parity artifact exists and validates ordered inspect/edit/test/dev-server/browser diagnostics", () => {
  assert.ok(existsSync(artifactPath), "installed-mode parity recording should exist")
  const artifact = loadInstalledModeProofArtifact(DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH, repoRoot)

  assert.equal(artifact.status, "passed")
  assert.equal(artifact.fixtureId, "parity-web-task")
  assert.equal(artifact.laneName, INSTALLED_MODE_LANE_NAME)
  assert.deepEqual(
    artifact.phaseResults.map((phase) => phase.phase),
    ["inspect", "edit", "test", "dev-server", "browser"],
  )
  for (const phase of artifact.phaseResults) {
    assert.equal(phase.status, "passed")
    assert.ok(phase.summary.length > 0)
  }
  const browserPhase = artifact.phaseResults.find((phase) => phase.phase === "browser")
  assert.ok(browserPhase?.browser)
  assert.equal(browserPhase?.browser?.assertion, "#status-message text")
  assert.equal(browserPhase?.browser?.expected, "Build status: Complete")
  assert.equal(browserPhase?.browser?.actual, "Build status: Complete")
})

test("baseline runner emits installed-mode lane diagnostics with artifact path and explicit browser evidence", () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
  const report = JSON.parse(result.stdout)
  const installedLane = report.lanes.find((lane: { name: string }) => lane.name === INSTALLED_MODE_LANE_NAME)

  assert.ok(installedLane, "installed-mode lane should be present in report")
  assert.equal(installedLane.status, "passed")
  assert.equal(installedLane.failedPhase, null)
  assert.equal(installedLane.artifactPath, DEFAULT_INSTALLED_MODE_PARITY_ARTIFACT_PATH)
  assert.deepEqual(
    installedLane.phaseResults.map((phase: { phase: string }) => phase.phase),
    ["inspect", "edit", "test", "dev-server", "browser"],
  )
  assert.equal(installedLane.phaseResults.find((phase: { phase: string }) => phase.phase === "browser")?.browser.actual, "Build status: Complete")
})

test("failing installed-mode artifact preserves failedPhase and browser expected/actual diagnostics in the parity report", () => {
  const tempDir = mkdtempSync(join(repoRoot, ".tmp-installed-mode-parity-contract-"))
  const failingArtifact = join(tempDir, "installed-mode-parity-web-task.failed.json")
  const relativeArtifactPath = failingArtifact.replace(`${repoRoot}/`, "")

  try {
    const payload = JSON.parse(readFileSync(artifactPath, "utf8"))
    payload.status = "failed"
    payload.phaseResults = payload.phaseResults.map((phase: any) =>
      phase.phase === "browser"
        ? {
            ...phase,
            status: "failed",
            summary: "Browser assertion failed for completed copy in installed mode.",
            browser: {
              assertion: "#status-message text",
              expected: "Build status: Complete",
              actual: "Build status: In progress",
            },
            command: {
              command: "browser_assert text_visible #status-message",
              exitCode: 1,
              stderrSnippet: "Expected completed status copy from installed mode",
            },
          }
        : { ...phase, status: "passed" },
    )
    payload.artifactPath = relativeArtifactPath
    writeFileSync(failingArtifact, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

    const result = runParity({
      ...process.env,
      GSD_LIVE_TESTS: "0",
      GSD_INSTALLED_MODE_PARITY_ARTIFACT: relativeArtifactPath,
    })

    assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
    const report = JSON.parse(result.stdout)
    const installedLane = report.lanes.find((lane: { name: string }) => lane.name === INSTALLED_MODE_LANE_NAME)
    assert.ok(installedLane)
    assert.equal(resolveInstalledModeArtifactPath({ GSD_INSTALLED_MODE_PARITY_ARTIFACT: relativeArtifactPath } as NodeJS.ProcessEnv), relativeArtifactPath)
    assert.equal(installedLane.status, "failed")
    assert.equal(installedLane.failedPhase, "browser")
    assert.equal(installedLane.artifactPath, relativeArtifactPath)
    assert.match(installedLane.skipReason, /failed during browser/i)
    assert.equal(installedLane.phaseResults.find((phase: { phase: string }) => phase.phase === "browser")?.browser.actual, "Build status: In progress")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})


test("installed-mode artifact validation rejects missing phase, duplicate phase, wrong lane, and missing artifactPath", () => {
  const basePayload = JSON.parse(readFileSync(artifactPath, "utf8"))

  const missingPhase = {
    ...basePayload,
    phaseResults: basePayload.phaseResults.filter((phase: any) => phase.phase !== "browser"),
  }
  assert.throws(
    () => loadInstalledModeProofArtifactFromValue(missingPhase, "missing-phase.json"),
    /missing phase result for browser/i,
  )

  const duplicatePhase = {
    ...basePayload,
    phaseResults: [...basePayload.phaseResults, basePayload.phaseResults[0]],
  }
  assert.throws(
    () => loadInstalledModeProofArtifactFromValue(duplicatePhase, "duplicate-phase.json"),
    /duplicate phase result for inspect/i,
  )

  const wrongLane = {
    ...basePayload,
    laneName: "repo-mode-coding-loop",
  }
  assert.throws(
    () => loadInstalledModeProofArtifactFromValue(wrongLane, "wrong-lane.json"),
    /laneName must be pack-install/i,
  )

  const missingArtifactPath = {
    ...basePayload,
    artifactPath: "",
  }
  assert.throws(
    () => loadInstalledModeProofArtifactFromValue(missingArtifactPath, "missing-artifact-path.json"),
    /artifactPath must be a non-empty string/i,
  )
})

function loadInstalledModeProofArtifactFromValue(payload: unknown, fileName: string) {
  const tempDir = mkdtempSync(join(repoRoot, ".tmp-installed-mode-validate-"))
  const tempPath = join(tempDir, fileName)
  try {
    writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
    return loadInstalledModeProofArtifact(tempPath.replace(`${repoRoot}/`, ""), repoRoot)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}


test("manifest reconciliation marks pack-install as covered for all installed-mode coding-loop capabilities", async () => {
  const parity = await importParityModule()
  const report = await parity.createBaselineReport({
    cwd: repoRoot,
    env: {
      ...process.env,
      GSD_LIVE_TESTS: "0",
    },
  })

  const installedLane = report.lanes.find((lane: { name: string }) => lane.name === INSTALLED_MODE_LANE_NAME)
  assert.ok(installedLane)
  assert.equal(installedLane.provesCodingLoop, true)
  for (const capability of report.parityManifest.capabilities) {
    assert.equal(capability.laneCoverage[INSTALLED_MODE_LANE_NAME], "covered")
  }
})
