import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createSecondaryParityManifest } from "../../../tests/parity/secondary-lanes.ts"
import { createSecondarySurfaceInventory } from "../../../tests/parity/secondary-surface-inventory.ts"

const repoRoot = process.cwd()
const resolveTs = join(repoRoot, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
const runnerPath = join(repoRoot, "tests", "parity", "run.ts")
const baselineArtifactPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")

function runNode(args: string[], env: NodeJS.ProcessEnv = process.env, cwd: string = repoRoot): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd,
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

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

test("baseline report wiring emits a canonical secondary parity payload without reruns", () => {
  const tempHome = mkdtempSync(join(tmpdir(), "umb-secondary-parity-home-"))
  try {
    const result = runNode([
      "--import",
      resolveTs,
      "--experimental-strip-types",
      runnerPath,
      "--format",
      "json",
    ], {
      ...process.env,
      HOME: tempHome,
      GSD_LIVE_TESTS: "0",
    })

    assert.equal(result.status, 0, `runner stderr:\n${result.stderr}`)

    const report = JSON.parse(result.stdout)
    assert.ok(report.secondaryParity, "baseline report should expose a secondaryParity payload")
    assert.equal(report.secondaryParity.inventoryPath, "tests/parity/artifacts/secondary-surface-inventory.json")
    assert.equal(report.secondaryParity.manifestPath, "tests/fixtures/secondary-parity-manifest.json")
    assert.equal(report.secondaryParity.inventoryVersion, 1)
    assert.equal(report.secondaryParity.manifestVersion, 1)
    assert.equal(report.secondaryParity.summary.totalSurfaces, 4)
    assert.equal(report.secondaryParity.summary.partialSurfaces, 4)
    assert.equal(report.secondaryParity.summary.coveredSurfaces, 0)
    assert.equal(report.secondaryParity.summary.uncoveredSurfaces, 0)
    assert.equal(report.secondaryParity.summary.totalDriftFindings, 12)
    assert.deepEqual(report.secondaryParity.summary.surfacesMissingReleaseReadableCoverage, [
      "web-mode",
      "mcp",
      "workflow-bmad",
      "worktree-session-recovery",
    ])

    assert.deepEqual(
      report.secondaryParity.surfaces.map((surface: { id: string }) => surface.id),
      ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"],
    )
    assert.deepEqual(
      report.secondaryParity.uncoveredSurfaces.map((surface: { id: string }) => surface.id),
      ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"],
    )

    for (const surface of report.secondaryParity.surfaces) {
      assert.equal(surface.inventoryStatus, "partial")
      assert.equal(surface.releaseReadableStatus, "partial")
      assert.ok(surface.requiredLaneNames.length >= 2)
      assert.ok(surface.existingRequiredLaneNames.length >= 1)
      assert.ok(surface.missingRequiredLaneNames.length >= 1)
      assert.ok(surface.presentFixturePaths.includes("tests/parity/artifacts/secondary-surface-inventory.json"))
      assert.ok(surface.plannedFixturePaths.length >= 1)
      assert.ok(surface.coverageGapIds.length >= 1)
      assert.match(surface.reportPath, /tests\/parity\/artifacts\/baseline-report\.json#secondaryParity\.surfaces\./)
    }

    assert.equal(report.secondaryParity.driftFindings.length, 12)
    assert.equal(report.secondaryParity.inventory.summary.totalDriftFindings, report.secondaryParity.driftFindings.length)
    assert.equal(report.secondaryParity.manifest.summary.totalSurfaces, report.secondaryParity.summary.totalSurfaces)

    const artifact = JSON.parse(readFileSync(baselineArtifactPath, "utf8"))
    assert.deepEqual(artifact.secondaryParity, report.secondaryParity)
  } finally {
    rmSync(tempHome, { recursive: true, force: true })
  }
})

test("secondary parity payload stays derived from the tracked inventory and manifest contracts", async () => {
  const parity = await importParityModule()
  const report = await parity.createBaselineReport({ cwd: repoRoot, env: { ...process.env, GSD_LIVE_TESTS: "0" } })

  const byId = new Map(report.secondaryParity.surfaces.map((surface: any) => [surface.id, surface]))

  for (const manifestSurface of report.secondaryParity.manifest.surfaces) {
    const row = byId.get(manifestSurface.id)
    assert.ok(row, `missing secondary parity row for ${manifestSurface.id}`)
    assert.deepEqual(row.requiredLaneNames, manifestSurface.requiredLaneNames)
    assert.deepEqual(row.optionalLaneNames, manifestSurface.optionalLaneNames)
    assert.deepEqual(row.coverageGapIds, manifestSurface.coverageGaps.map((gap: any) => gap.id))
    assert.deepEqual(row.uncoveredAreas, manifestSurface.coverageGaps)

    const existingRequired = report.secondaryParity.manifest.lanes
      .filter((lane: any) => lane.surfaceId === manifestSurface.id && lane.requirement === "required" && lane.implementationStatus === "existing-proof")
      .map((lane: any) => lane.name)
    const missingRequired = report.secondaryParity.manifest.lanes
      .filter((lane: any) => lane.surfaceId === manifestSurface.id && lane.requirement === "required" && lane.implementationStatus === "planned-proof")
      .map((lane: any) => lane.name)

    assert.deepEqual(row.existingRequiredLaneNames, existingRequired)
    assert.deepEqual(row.missingRequiredLaneNames, missingRequired)
  }

  assert.deepEqual(report.secondaryParity.inventory, createSecondarySurfaceInventory())
  assert.deepEqual(report.secondaryParity.manifest, createSecondaryParityManifest())
})
