import { test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const baselineArtifactPath = join(repoRoot, "tests", "parity", "artifacts", "baseline-report.json")
const secondaryArtifactPath = join(repoRoot, "tests", "parity", "artifacts", "secondary-release-report.json")
const gapArtifactPath = join(repoRoot, "tests", "parity", "artifacts", "parity-gap-inventory.json")

async function importGapModule() {
  return await import("../../../tests/parity/parity-gap-inventory.ts")
}

test("parity gap inventory explains why the baseline report is red while the secondary release report stays green", async () => {
  const gap = await importGapModule()
  const baseline = JSON.parse(readFileSync(baselineArtifactPath, "utf8"))
  const secondary = JSON.parse(readFileSync(secondaryArtifactPath, "utf8"))

  const inventory = gap.createParityGapInventory(baseline, secondary)
  const rendered = gap.renderParityGapInventory(inventory)

  expect(inventory.version).toBe(1)
  expect(inventory.disagreementModel.baselineVerdict).toBe("failing")
  expect(inventory.disagreementModel.secondaryReleaseVerdict).toBe("passed")
  expect(inventory.disagreementModel.explanation).toMatch(/not contradictory/i)
  expect(inventory.disagreementModel.blockingRows).toEqual(["baseline-lane:fixtures-runner"])
  expect(inventory.disagreementModel.optionalRows).toEqual(["baseline-lane:live-runner"])
  expect(inventory.disagreementModel.scopedExceptionCandidateRows).toEqual([
    "secondary-surface:web-mode",
    "secondary-surface:mcp",
    "secondary-surface:workflow-bmad",
    "secondary-surface:worktree-session-recovery",
  ])

  expect(inventory.summary.totalRows).toBe(6)
  expect(inventory.summary.blocking).toBe(1)
  expect(inventory.summary.optionalNonblocking).toBe(1)
  expect(inventory.summary.scopedExceptionCandidates).toBe(4)
  expect(inventory.downstreamClosurePlan).toHaveLength(4)
  expect(inventory.downstreamClosurePlan.map((entry: any) => entry.sliceId)).toEqual(["S02", "S03", "S04", "S05"])

  const fixturesRunner = inventory.rows.find((row: any) => row.id === "baseline-lane:fixtures-runner")
  expect(fixturesRunner).toBeTruthy()
  expect(fixturesRunner.class).toBe("blocking")
  expect(fixturesRunner.currentReportStatus.baselineReport).toBe("failed")
  expect(fixturesRunner.currentReportStatus.secondaryReleaseReport).toBe("not-applicable")
  expect(fixturesRunner.failedPhase).toBe(null)
  expect(fixturesRunner.artifactPath).toBe(null)
  expect(fixturesRunner.remediationSummary).toMatch(/tests\/fixtures\/run\.ts/)

  const liveRunner = inventory.rows.find((row: any) => row.id === "baseline-lane:live-runner")
  expect(liveRunner).toBeTruthy()
  expect(liveRunner.class).toBe("optional-nonblocking")
  expect(liveRunner.currentReportStatus.baselineReport).toBe("skipped")
  expect(liveRunner.currentReportStatus.secondaryReleaseReport).toBe("skipped")
  expect(liveRunner.rationale).toMatch(/opt-in/i)

  for (const surfaceId of ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"]) {
    const row = inventory.rows.find((entry: any) => entry.id === `secondary-surface:${surfaceId}`)
    expect(row, `missing row for ${surfaceId}`).toBeTruthy()
    expect(row.class).toBe("scoped-exception-candidate")
    expect(row.currentReportStatus.baselineReport).toBe("partial")
    expect(row.currentReportStatus.secondaryReleaseReport).toBe("passed")
    expect(Array.isArray(row.evidencePaths)).toBe(true)
    expect(row.evidencePaths.length).toBeGreaterThanOrEqual(3)
    expect(row.closureExpectation).toMatch(/Publish|Define|Resolve|Decide/)
  }

  expect(rendered).toMatch(/Parity gap inventory: baseline=failing secondary=passed/)
  expect(rendered).toMatch(/baseline-lane:fixtures-runner class=blocking baseline=failed secondary=not-applicable/)
  expect(rendered).toMatch(/baseline-lane:live-runner class=optional-nonblocking baseline=skipped secondary=skipped/)
  expect(rendered).toMatch(/secondary-surface:web-mode class=scoped-exception-candidate baseline=partial secondary=passed/)
})

test("tracked parity gap artifact matches the source-derived inventory", async () => {
  const gap = await importGapModule()
  const baseline = JSON.parse(readFileSync(baselineArtifactPath, "utf8"))
  const secondary = JSON.parse(readFileSync(secondaryArtifactPath, "utf8"))

  const expected = gap.createParityGapInventory(baseline, secondary)
  const artifact = JSON.parse(readFileSync(gapArtifactPath, "utf8"))

  expect(artifact.disagreementModel).toEqual(expected.disagreementModel)
  expect(artifact.summary).toEqual(expected.summary)
  expect(artifact.downstreamClosurePlan).toEqual(expected.downstreamClosurePlan)
  expect(artifact.rows).toEqual(expected.rows)
})
