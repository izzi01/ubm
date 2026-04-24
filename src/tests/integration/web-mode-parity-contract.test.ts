import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { join } from "node:path"

const repoRoot = process.cwd()
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")

function runParity(env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, ["--experimental-strip-types", runnerPath, "--format", "json"], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout, stderr: "", status: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      status: error.status ?? 1,
    }
  }
}

test("baseline parity runner emits a truthful web-mode secondary parity row", () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
  const report = JSON.parse(result.stdout)

  assert.ok(report.secondaryParity, "expected secondaryParity payload in baseline report")
  const webSurface = report.secondaryParity.surfaces.find((surface: { id: string }) => surface.id === "web-mode")

  assert.ok(webSurface, "expected web-mode secondary parity surface")
  assert.equal(webSurface.inventoryStatus, "partial")
  assert.equal(webSurface.releaseReadableStatus, "partial")
  assert.deepEqual(webSurface.requiredLaneNames, ["secondary-parity-report", "integration:web-mode"])
  assert.deepEqual(webSurface.existingRequiredLaneNames, ["integration:web-mode"])
  assert.deepEqual(webSurface.missingRequiredLaneNames, ["secondary-parity-report"])
  assert.ok(
    webSurface.presentFixturePaths.includes("src/tests/integration/web-mode-cli.test.ts"),
    "expected current deterministic web-mode integration coverage to stay attached",
  )
  assert.ok(
    webSurface.plannedFixturePaths.includes("tests/parity/artifacts/secondary-parity-report.json#web-mode"),
    "expected reserved release-readable report path to stay explicit",
  )
  assert.deepEqual(webSurface.coverageGapIds, ["web-parity-artifact-missing", "web-installed-mode-proof-missing"])
  assert.equal(
    webSurface.reportPath,
    "tests/parity/artifacts/baseline-report.json#secondaryParity.surfaces.web-mode",
  )
})

test("baseline parity report keeps web-mode gaps actionable for downstream release reporting", () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)
  const report = JSON.parse(result.stdout)
  const webSurface = report.secondaryParity.uncoveredSurfaces.find((surface: { id: string }) => surface.id === "web-mode")

  assert.ok(webSurface, "expected web-mode to remain listed among uncovered secondary surfaces until its release-readable lane exists")
  assert.match(webSurface.uncoveredAreas[0]?.summary ?? "", /secondary-surface parity artifact/i)
  assert.match(webSurface.uncoveredAreas[0]?.downstreamNeed ?? "", /machine-readable lane\/report entry/i)
  assert.ok(
    report.secondaryParity.summary.surfacesMissingReleaseReadableCoverage.includes("web-mode"),
    "expected summary to call out missing release-readable web-mode coverage",
  )
})
