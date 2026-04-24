import { test, expect } from "vitest"
import { existsSync } from "node:fs"

import {
  PARITY_GAP_CLASSES,
  PARITY_GAP_INVENTORY_PATH,
  PARITY_GAP_KINDS,
  createParityGapInventory,
  loadParityGapInventory,
  renderParityGapInventory,
  type ParityGapInventoryRow,
} from "../../../tests/parity/parity-gap-inventory.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "../../../tests/parity/diagnostics.ts"

const TRACKED_PATH_PREFIXES = ["src/", "tests/", "package.json"]
const EXPECTED_ROWS = {
  blocking: ["baseline-lane:fixtures-runner"],
  optional: ["baseline-lane:live-runner"],
  scoped: [
    "secondary-surface:web-mode",
    "secondary-surface:mcp",
    "secondary-surface:workflow-bmad",
    "secondary-surface:worktree-session-recovery",
  ],
} as const
const EXPECTED_DOWNSTREAM_SLICES = ["S02", "S03", "S04", "S05"] as const

function expectTrackedRepoPath(path: string, label: string) {
  expect(path, `${label} should be a repo-relative tracked path`).not.toMatch(/^\//)
  expect(path, `${label} should not escape the repo`).not.toContain("..")
  expect(path, `${label} should not point at local-only planning artifacts`).not.toMatch(/^\.gsd\//)
  expect(
    TRACKED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)),
    `${label} should point at a tracked source or artifact path, received ${path}`,
  ).toBe(true)
  expect(existsSync(path), `${label} should exist in the repo: ${path}`).toBe(true)
}

function rowById(rows: ParityGapInventoryRow[], id: string): ParityGapInventoryRow {
  const row = rows.find((entry) => entry.id === id)
  expect(row, `expected inventory row ${id} to exist`).toBeTruthy()
  return row!
}

test("parity gap inventory keeps the baseline-red versus secondary-green disagreement model explicit", () => {
  const baseline = loadBaselineReport()
  const secondary = loadSecondaryReleaseReport()

  const inventory = createParityGapInventory(baseline, secondary)
  const rendered = renderParityGapInventory(inventory)

  expect(inventory.version).toBe(1)
  expect(inventory.artifactPath).toBe(PARITY_GAP_INVENTORY_PATH)
  expect(inventory.baselineReportPath).toBe(baseline.artifactPath)
  expect(inventory.secondaryReleaseReportPath).toBe(secondary.artifactPath)
  expect(inventory.disagreementModel.baselineVerdict).toBe("partial")
  expect(inventory.disagreementModel.secondaryReleaseVerdict).toBe("passed")
  expect(inventory.disagreementModel.explanation).toMatch(/not contradictory/i)
  expect(inventory.disagreementModel.blockingRows).toEqual(EXPECTED_ROWS.blocking)
  expect(inventory.disagreementModel.optionalRows).toEqual(EXPECTED_ROWS.optional)
  expect(inventory.disagreementModel.scopedExceptionCandidateRows).toEqual(EXPECTED_ROWS.scoped)

  expect(inventory.summary).toEqual({
    totalRows: 6,
    blocking: 1,
    optionalNonblocking: 1,
    scopedExceptionCandidates: 4,
  })
  expect(inventory.downstreamClosurePlan.map((entry) => entry.sliceId)).toEqual(EXPECTED_DOWNSTREAM_SLICES)

  const fixturesRunner = rowById(inventory.rows, "baseline-lane:fixtures-runner")
  expect(fixturesRunner.kind).toBe("baseline-lane")
  expect(fixturesRunner.laneName).toBe("fixtures-runner")
  expect(fixturesRunner.surfaceId).toBeNull()
  expect(fixturesRunner.class).toBe("blocking")
  expect(fixturesRunner.blocking).toBe(true)
  expect(fixturesRunner.currentReportStatus).toEqual({
    baselineReport: "passed",
    secondaryReleaseReport: "not-applicable",
  })
  expect(fixturesRunner.failedPhase).toBeNull()
  expect(fixturesRunner.artifactPath).toBeNull()
  expect(fixturesRunner.reportPath).toBe("tests/parity/artifacts/baseline-report.json#lanes.fixtures-runner")
  expect(fixturesRunner.remediationSummary).toMatch(/tests\/fixtures\/run\.ts/)
  expect(fixturesRunner.closureExpectation).toMatch(/baseline report to stop failing/i)

  const liveRunner = rowById(inventory.rows, "baseline-lane:live-runner")
  expect(liveRunner.kind).toBe("baseline-lane")
  expect(liveRunner.class).toBe("optional-nonblocking")
  expect(liveRunner.blocking).toBe(false)
  expect(liveRunner.currentReportStatus).toEqual({
    baselineReport: "skipped",
    secondaryReleaseReport: "skipped",
  })
  expect(liveRunner.reportPath).toBe("tests/parity/artifacts/secondary-release-report.json#optionalLive")
  expect(liveRunner.rationale).toMatch(/opt-?in/i)
  expect(liveRunner.closureExpectation).toMatch(/not required for the canonical release gate to pass/i)

  for (const surfaceId of ["web-mode", "worktree-session-recovery"] as const) {
    const row = rowById(inventory.rows, `secondary-surface:${surfaceId}`)
    expect(row.kind).toBe("secondary-surface")
    expect(row.laneName).toBeNull()
    expect(row.surfaceId).toBe(surfaceId)
    expect(row.class).toBe("scoped-exception-candidate")
    expect(row.blocking).toBe(false)
    expect(row.currentReportStatus.baselineReport).toBe("covered")
    expect(row.currentReportStatus.secondaryReleaseReport).toBe("passed")
    expect(row.reportPath).toMatch(/^tests\/parity\/artifacts\/.+#/)
    expect(row.artifactPath, `${surfaceId} should preserve an actionable artifact path`).toMatch(/^tests\//)
    expect(row.remediationSummary, `${surfaceId} should preserve a remediation summary`).not.toHaveLength(0)
    expect(row.closureExpectation, `${surfaceId} should preserve a downstream closure expectation`).toMatch(/Publish|Define|Resolve|Decide|Add/)
    expect(row.evidencePaths.length, `${surfaceId} should preserve report plus tracked evidence paths`).toBeGreaterThanOrEqual(3)
  }

  for (const surfaceId of ["mcp", "workflow-bmad"] as const) {
    const row = rowById(inventory.rows, `secondary-surface:${surfaceId}`)
    expect(row.kind).toBe("secondary-surface")
    expect(row.laneName).toBeNull()
    expect(row.surfaceId).toBe(surfaceId)
    expect(row.class).toBe("scoped-exception-candidate")
    expect(row.blocking).toBe(false)
    expect(row.currentReportStatus.baselineReport).toBe("partial")
    expect(row.currentReportStatus.secondaryReleaseReport).toBe("passed")
    expect(row.reportPath).toMatch(/^tests\/parity\/artifacts\/.+#/)
    expect(row.artifactPath, `${surfaceId} should preserve an actionable artifact path`).toMatch(/^tests\//)
    expect(row.remediationSummary, `${surfaceId} should preserve a remediation summary`).not.toHaveLength(0)
    expect(row.closureExpectation, `${surfaceId} should preserve a downstream closure expectation`).toMatch(/Publish|Define|Resolve|Decide|Add/)
    expect(row.evidencePaths.length, `${surfaceId} should preserve report plus tracked evidence paths`).toBeGreaterThanOrEqual(3)
  }

  expect(rendered).toMatch(/Parity gap inventory: baseline=partial secondary=passed/)
  expect(rendered).toMatch(/rows: total=6 blocking=1 optional=1 scopedExceptionCandidates=4/)
  expect(rendered).toMatch(/baseline-lane:fixtures-runner class=blocking baseline=passed secondary=not-applicable/)
  expect(rendered).toMatch(/baseline-lane:live-runner class=optional-nonblocking baseline=skipped secondary=skipped/)
  expect(rendered).toMatch(/secondary-surface:mcp class=scoped-exception-candidate baseline=partial secondary=passed/)
})

test("every inventory row preserves tracked paths, diagnostics linkage, and downstream closure buckets", () => {
  const inventory = loadParityGapInventory()

  expect(inventory.rows.map((row) => row.id)).toEqual([
    ...EXPECTED_ROWS.blocking,
    ...EXPECTED_ROWS.optional,
    ...EXPECTED_ROWS.scoped,
  ])
  expect(inventory.rows).toHaveLength(inventory.summary.totalRows)

  for (const row of inventory.rows) {
    expect(PARITY_GAP_KINDS).toContain(row.kind)
    expect(PARITY_GAP_CLASSES).toContain(row.class)
    expect(typeof row.title).toBe("string")
    expect(row.title.length).toBeGreaterThan(0)
    expect(typeof row.rationale).toBe("string")
    expect(row.rationale.length).toBeGreaterThan(0)
    expect(typeof row.remediationSummary).toBe("string")
    expect(row.remediationSummary.length).toBeGreaterThan(0)
    expect(typeof row.closureExpectation).toBe("string")
    expect(row.closureExpectation.length).toBeGreaterThan(0)
    expect(typeof row.reportPath).toBe("string")
    expect(row.reportPath).toContain("#")

    const [reportFile] = row.reportPath.split("#")
    expectTrackedRepoPath(reportFile, `${row.id} reportPath`)

    if (row.artifactPath) {
      expectTrackedRepoPath(row.artifactPath, `${row.id} artifactPath`)
    }

    expect(row.evidencePaths.length, `${row.id} should preserve evidence paths`).toBeGreaterThan(0)
    for (const evidence of row.evidencePaths) {
      expectTrackedRepoPath(evidence.path, `${row.id} evidence path`)
      expect(evidence.reason, `${row.id} evidence reason should be non-empty`).not.toHaveLength(0)
    }

    if (row.kind === "baseline-lane") {
      expect(row.laneName, `${row.id} should preserve a lane name`).toMatch(/runner|coding-loop|pack-install/)
      expect(row.surfaceId).toBeNull()
    } else {
      expect(row.surfaceId, `${row.id} should preserve a surface id`).toMatch(/web-mode|mcp|workflow-bmad|worktree-session-recovery/)
      expect(row.laneName).toBeNull()
    }
  }

  const closureMap = new Map(inventory.downstreamClosurePlan.map((entry) => [entry.sliceId, entry.expectation]))
  for (const sliceId of EXPECTED_DOWNSTREAM_SLICES) {
    expect(closureMap.has(sliceId), `missing downstream closure bucket ${sliceId}`).toBe(true)
    expect(closureMap.get(sliceId)).toBeTruthy()
  }
})

test("tracked parity gap artifact matches the source-derived inventory exactly except for generation timestamp", () => {
  const baseline = loadBaselineReport()
  const secondary = loadSecondaryReleaseReport()

  const expected = createParityGapInventory(baseline, secondary)
  const artifact = loadParityGapInventory()

  expect(artifact.generatedAt).toMatch(/T.*Z$/)
  expect({ ...artifact, generatedAt: "<normalized>" }).toEqual({
    ...expected,
    generatedAt: "<normalized>",
  })
})
