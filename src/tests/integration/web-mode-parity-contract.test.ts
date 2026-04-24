import { test, expect } from "vitest"
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

test("baseline parity runner emits a covered web-mode secondary parity row backed by the secondary parity report", { timeout: 60000 }, () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  expect(result.status).toBe(0)
  const report = JSON.parse(result.stdout)
  const webSurface = report.secondaryParity.surfaces.find((surface: { id: string }) => surface.id === "web-mode")

  expect(webSurface).toBeTruthy()
  expect(webSurface.inventoryStatus).toBe("partial")
  expect(webSurface.releaseReadableStatus).toBe("covered")
  expect(webSurface.requiredLaneNames).toEqual(["secondary-parity-report", "integration:web-mode"])
  expect(webSurface.existingRequiredLaneNames).toEqual(["secondary-parity-report", "integration:web-mode"])
  expect(webSurface.missingRequiredLaneNames).toEqual([])
  expect(webSurface.presentFixturePaths).toContain("src/tests/integration/web-mode-cli.test.ts")
  expect(webSurface.plannedFixturePaths).toContain("tests/parity/artifacts/secondary-parity-report.json#web-mode")
  expect(webSurface.coverageGapIds).toEqual(["web-parity-artifact-missing", "web-installed-mode-proof-missing"])
  expect(webSurface.reportPath).toBe("tests/parity/artifacts/secondary-parity-report.json#rows.web-mode")
})

test("baseline parity summary retires web-mode from missing release-readable coverage once promoted", { timeout: 60000 }, () => {
  const result = runParity({
    ...process.env,
    GSD_LIVE_TESTS: "0",
  })

  expect(result.status).toBe(0)
  const report = JSON.parse(result.stdout)
  const webSurface = report.secondaryParity.uncoveredSurfaces.find((surface: { id: string }) => surface.id === "web-mode")

  expect(webSurface).toBeUndefined()
  expect(report.secondaryParity.summary.surfacesMissingReleaseReadableCoverage).not.toContain("web-mode")
  expect(report.secondaryParity.summary.coveredSurfaces).toBeGreaterThanOrEqual(1)
})
