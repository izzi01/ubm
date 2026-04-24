import { test, expect } from "vitest"

import {
  createReleaseFacingSummary,
  loadSecondarySurfaceInventory,
} from "../../../tests/parity/release-facing-summary.ts"
import { createParityGapInventory } from "../../../tests/parity/parity-gap-inventory.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "../../../tests/parity/diagnostics.ts"

function buildInputs() {
  const baseline = structuredClone(loadBaselineReport())
  const secondary = structuredClone(loadSecondaryReleaseReport())
  const gapInventory = createParityGapInventory(baseline, secondary)
  const surfaceInventory = structuredClone(loadSecondarySurfaceInventory())
  return { baseline, secondary, gapInventory, surfaceInventory }
}

test("release-facing summary tells one deterministic story across baseline, secondary release, parity-gap inventory, and milestone-summary inputs", () => {
  const { baseline, secondary, gapInventory, surfaceInventory } = buildInputs()
  const summary = createReleaseFacingSummary(baseline, secondary, gapInventory, surfaceInventory)

  expect(summary.releaseFacingVerdict).toBe("passed")
  expect(summary.baselineVerdict).toBe("partial")
  expect(summary.requiredSecondaryVerdict).toBe("passed")

  expect(summary.baselineExplanation).toMatch(/live spot check is intentionally optional/i)
  expect(summary.whyPartialIsTruthful).toMatch(/only the non-blocking live\/provider lane stays outside the deterministic must-pass set/i)

  expect(summary.requiredSecondarySummary.requiredLaneNames).toEqual(secondary.requiredLaneNames)
  expect(summary.requiredSecondarySummary.passedLaneNames).toEqual(secondary.requiredLanes.map((lane) => lane.name))
  expect(summary.requiredSecondarySummary.failedRequiredLaneNames).toEqual([])
  expect(summary.optionalEvidence.live.status).toBe(secondary.optionalLive.status)
  expect(summary.optionalEvidence.plannedLanes.map((lane) => lane.name)).toEqual(
    secondary.optionalLanes.filter((lane) => lane.name !== "live-runner").map((lane) => lane.name),
  )

  expect(summary.residualInventory.totalRows).toBe(gapInventory.summary.totalRows)
  expect(summary.residualInventory.optionalNonblockingRows).toBe(gapInventory.summary.optionalNonblocking)
  expect(summary.residualInventory.scopedExceptionRows).toBe(gapInventory.summary.scopedExceptionCandidates)
  expect(summary.residualInventory.scopedRebrandFindings).toBe(surfaceInventory.summary.totalDriftFindings)
  expect(summary.residualInventory.scopedRebrandFindingIds).toEqual(surfaceInventory.rebrandDrift.map((finding) => finding.id))

  expect(summary.milestoneSummaryInput.authoritativeSource).toBe(summary.artifactPath)
  expect(summary.milestoneSummaryInput.whatUmbProvesNow).toContain("web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift")
  expect(summary.milestoneSummaryInput.whatRemainsOptional).toContain("repo-recording:web-mode")
  expect(summary.milestoneSummaryInput.whatRemainsOptional).toContain("live-runner")
  expect(summary.milestoneSummaryInput.whatRemainsOutOfScope).toContain("5 tracked findings")
})

test("release-facing summary keeps contradictory field drift observable instead of silently coercing mismatches", () => {
  const { baseline, secondary, gapInventory, surfaceInventory } = buildInputs()

  gapInventory.secondaryReleaseReportPath = "tests/parity/artifacts/secondary-release-report.drifted.json"
  expect(() => createReleaseFacingSummary(baseline, secondary, gapInventory, surfaceInventory)).toThrow(
    /secondaryReleaseReportPath mismatch: parity gap inventory points to tests\/parity\/artifacts\/secondary-release-report\.drifted\.json/,
  )

  const driftedInputs = buildInputs()
  driftedInputs.baseline.lanes = driftedInputs.baseline.lanes.filter((lane) => lane.name !== "live-runner")
  expect(() => createReleaseFacingSummary(driftedInputs.baseline, driftedInputs.secondary, driftedInputs.gapInventory, driftedInputs.surfaceInventory)).toThrow(
    /Baseline parity report is missing lane live-runner/,
  )
})
