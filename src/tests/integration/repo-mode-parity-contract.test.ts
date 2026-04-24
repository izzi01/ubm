import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const repoRoot = process.cwd()
const resolveTs = join(repoRoot, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const artifactPath = join(repoRoot, "tests", "fixtures", "recordings", "repo-mode-parity-web-task.json")

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

test("repo-mode parity lane target exists and is wired into the tracked manifest", async () => {
  const parity = await importParityModule()
  const manifest = parity.loadParityManifest(parity.PARITY_MANIFEST_PATH, repoRoot)

  assert.ok(existsSync(artifactPath), "repo-mode parity recording should exist")
  assert.ok(parity.BASELINE_LANES.some((lane: { name: string; target: string }) => lane.name === parity.REPO_MODE_LANE_NAME && lane.target === "tests/fixtures/recordings/repo-mode-parity-web-task.json"))

  for (const capability of manifest.capabilities) {
    assert.equal(capability.laneCoverage[parity.REPO_MODE_LANE_NAME], "covered")
  }
})

test("repo-mode parity artifact loads with explicit phase diagnostics for inspect/edit/test/dev-server/browser", async () => {
  const parity = await importParityModule()
  const artifact = parity.loadRepoModeProofArtifact("tests/fixtures/recordings/repo-mode-parity-web-task.json", repoRoot)

  assert.equal(artifact.status, "passed")
  assert.equal(artifact.fixtureId, "parity-web-task")
  assert.equal(artifact.laneName, parity.REPO_MODE_LANE_NAME)
  assert.deepEqual(
    artifact.phaseResults.map((phase: { phase: string }) => phase.phase),
    ["inspect", "edit", "test", "dev-server", "browser"],
  )
  for (const phase of artifact.phaseResults) {
    assert.equal(phase.status, "passed")
    assert.ok(phase.summary.length > 0)
  }
  const browserPhase = artifact.phaseResults.find((phase: { phase: string }) => phase.phase === "browser")
  assert.ok(browserPhase?.browser)
  assert.equal(browserPhase?.browser.expected, "Build status: Complete")
  assert.equal(browserPhase?.browser.actual, "Build status: Complete")
})

test("parity runner emits repo-mode lane diagnostics and artifact path in json output", () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
  const report = JSON.parse(result.stdout)
  const repoLane = report.lanes.find((lane: { name: string }) => lane.name === "repo-mode-coding-loop")

  assert.ok(repoLane, "repo-mode lane should be present in report")
  assert.equal(repoLane.status, "passed")
  assert.equal(repoLane.failedPhase, null)
  assert.equal(repoLane.artifactPath, "tests/fixtures/recordings/repo-mode-parity-web-task.json")
  assert.deepEqual(
    repoLane.phaseResults.map((phase: { phase: string }) => phase.phase),
    ["inspect", "edit", "test", "dev-server", "browser"],
  )
  assert.equal(report.summary.provesCodingLoop, true)
})

test("failing repo-mode artifact still preserves failedPhase and artifactPath in the json report", () => {
  const tempDir = mkdtempSync(join(repoRoot, ".tmp-repo-mode-parity-contract-"))
  const failingArtifact = join(tempDir, "repo-mode-parity-web-task.failed.json")
  const relativeArtifactPath = failingArtifact.replace(`${repoRoot}/`, "")

  try {
    const payload = JSON.parse(readFileSync(artifactPath, "utf8"))
    payload.status = "failed"
    payload.phaseResults = payload.phaseResults.map((phase: any) =>
      phase.phase === "browser"
        ? {
            ...phase,
            status: "failed",
            summary: "Browser assertion failed for completed copy.",
            browser: {
              assertion: "#status-message text",
              expected: "Build status: Complete",
              actual: "Build status: In progress",
            },
            command: {
              command: "browser_assert text_visible #status-message",
              exitCode: 1,
              stderrSnippet: "Expected completed status copy",
            },
          }
        : { ...phase, status: "passed" },
    )
    payload.artifactPath = relativeArtifactPath
    writeFileSync(failingArtifact, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

    const result = runParity({
      ...process.env,
      GSD_LIVE_TESTS: "0",
      GSD_REPO_MODE_PARITY_ARTIFACT: relativeArtifactPath,
    })

    assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
    const report = JSON.parse(result.stdout)
    const repoLane = report.lanes.find((lane: { name: string }) => lane.name === "repo-mode-coding-loop")
    assert.ok(repoLane)
    assert.equal(repoLane.status, "failed")
    assert.equal(repoLane.failedPhase, "browser")
    assert.equal(repoLane.artifactPath, relativeArtifactPath)
    assert.match(repoLane.skipReason, /failed during browser/i)
    assert.equal(repoLane.phaseResults.find((phase: { phase: string }) => phase.phase === "browser")?.browser.actual, "Build status: In progress")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("missing repo-mode artifact fails fast with the missing lane target named explicitly", async () => {
  const parity = await importParityModule()
  assert.throws(
    () => parity.validateBaselineLaneDefinitions(parity.getBaselineLanes({ GSD_REPO_MODE_PARITY_ARTIFACT: "tests/fixtures/recordings/missing-repo-mode.json" }), { cwd: repoRoot, requireTargets: true }),
    /Missing lane target for repo-mode-coding-loop: tests\/fixtures\/recordings\/missing-repo-mode\.json/i,
  )
})
