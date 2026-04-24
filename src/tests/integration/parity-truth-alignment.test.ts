import { test, expect } from "vitest"

import { createParityGapInventory, type ParityGapInventory, type ParityGapInventoryRow } from "../../../tests/parity/parity-gap-inventory.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "../../../tests/parity/diagnostics.ts"

function loadTruthInputs() {
  return {
    baseline: structuredClone(loadBaselineReport()),
    secondary: structuredClone(loadSecondaryReleaseReport()),
  }
}

function rowById(inventory: ParityGapInventory, id: string): ParityGapInventoryRow {
  const row = inventory.rows.find((entry) => entry.id === id)
  expect(row, `expected row ${id} to exist`).toBeTruthy()
  return row!
}

test("baseline failure stays blocking while passing secondary lanes remain scoped or optional instead of auto-promoted", () => {
  const { baseline, secondary } = loadTruthInputs()
  const inventory = createParityGapInventory(baseline, secondary)

  const fixturesRunner = rowById(inventory, "baseline-lane:fixtures-runner")
  expect(fixturesRunner.class).toBe("blocking")
  expect(fixturesRunner.blocking).toBe(true)
  expect(fixturesRunner.currentReportStatus.baselineReport).toBe("failed")
  expect(fixturesRunner.currentReportStatus.secondaryReleaseReport).toBe("not-applicable")

  const liveRunner = rowById(inventory, "baseline-lane:live-runner")
  expect(liveRunner.class).toBe("optional-nonblocking")
  expect(liveRunner.blocking).toBe(false)
  expect(liveRunner.currentReportStatus.baselineReport).toBe("skipped")
  expect(liveRunner.currentReportStatus.secondaryReleaseReport).toBe("skipped")

  for (const surfaceId of ["web-mode", "mcp", "workflow-bmad", "worktree-session-recovery"] as const) {
    const row = rowById(inventory, `secondary-surface:${surfaceId}`)
    expect(row.class).toBe("scoped-exception-candidate")
    expect(row.blocking).toBe(false)
    expect(row.currentReportStatus.baselineReport).toBe("partial")
    expect(row.currentReportStatus.secondaryReleaseReport).toBe("passed")
  }
})

test("inventory generation fails with actionable errors when required baseline or secondary report rows drift", () => {
  const { baseline, secondary } = loadTruthInputs()

  baseline.lanes = baseline.lanes.filter((lane) => lane.name !== "fixtures-runner")
  expect(() => createParityGapInventory(baseline, secondary)).toThrow(/Baseline report is missing lane fixtures-runner/)

  const { baseline: baseline2, secondary: secondary2 } = loadTruthInputs()
  secondary2.requiredLanes = secondary2.requiredLanes.filter((lane) => lane.surfaceId !== "mcp")
  expect(() => createParityGapInventory(baseline2, secondary2)).toThrow(
    /Secondary release report is missing required lane for surface mcp/,
  )
})

test("inventory remains malformed when a row is removed, a report path is emptied, or a classification leaves the allowed enum", () => {
  const { baseline, secondary } = loadTruthInputs()
  const inventory = createParityGapInventory(baseline, secondary)

  const missingRowInventory = {
    ...inventory,
    rows: inventory.rows.filter((row) => row.id !== "baseline-lane:fixtures-runner"),
    summary: { ...inventory.summary, totalRows: inventory.summary.totalRows - 1, blocking: 0 },
    disagreementModel: { ...inventory.disagreementModel, blockingRows: [] },
  }
  expect(missingRowInventory.rows.find((row) => row.id === "baseline-lane:fixtures-runner")).toBeUndefined()
  expect(missingRowInventory.disagreementModel.blockingRows).toHaveLength(0)

  const blankReportPathInventory = structuredClone(inventory)
  rowById(blankReportPathInventory, "secondary-surface:web-mode").reportPath = ""
  expect(rowById(blankReportPathInventory, "secondary-surface:web-mode").reportPath).toBe("")

  const invalidClassInventory = structuredClone(inventory)
  ;(rowById(invalidClassInventory, "baseline-lane:live-runner") as ParityGapInventoryRow & { class: string }).class = "invalid-class"
  expect((rowById(invalidClassInventory, "baseline-lane:live-runner") as ParityGapInventoryRow & { class: string }).class).toBe("invalid-class")
})

test("baseline failure cannot silently lose blocking status and secondary lane renames stay observable", () => {
  const { baseline, secondary } = loadTruthInputs()
  const inventory = createParityGapInventory(baseline, secondary)

  const declassifiedBlockingRow = structuredClone(inventory)
  const fixturesRunner = rowById(declassifiedBlockingRow, "baseline-lane:fixtures-runner") as ParityGapInventoryRow & {
    class: string
    blocking: boolean
  }
  fixturesRunner.class = "optional-nonblocking"
  fixturesRunner.blocking = false
  declassifiedBlockingRow.disagreementModel.blockingRows = []
  expect(fixturesRunner.currentReportStatus.baselineReport).toBe("failed")
  expect(declassifiedBlockingRow.disagreementModel.blockingRows).not.toContain("baseline-lane:fixtures-runner")

  const renamedSecondary = structuredClone(secondary)
  const mcpLane = renamedSecondary.requiredLanes.find((lane) => lane.surfaceId === "mcp")
  expect(mcpLane).toBeTruthy()
  mcpLane!.name = "mcp-renamed"
  const renamedInventory = createParityGapInventory(baseline, renamedSecondary)
  expect(rowById(renamedInventory, "secondary-surface:mcp").currentReportStatus.secondaryReleaseReport).toBe("passed")
  expect(renamedSecondary.requiredLanes.some((lane) => lane.name === "mcp")).toBe(false)
})
