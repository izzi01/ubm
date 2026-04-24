import { readFile } from "node:fs/promises"
import { test, expect } from "vitest"

import {
  RELEASE_FACING_SUMMARY_PATH,
  createReleaseFacingSummary,
  loadSecondarySurfaceInventory,
  renderReleaseFacingSummary,
  resolveReleaseFacingSummary,
} from "../../../tests/parity/release-facing-summary.ts"
import { loadBaselineReport, loadSecondaryReleaseReport } from "../../../tests/parity/diagnostics.ts"
import { loadParityGapInventory } from "../../../tests/parity/parity-gap-inventory.ts"

const secondaryGuidePath = "tests/parity/human-uat-secondary.md"
const primaryGuidePath = "tests/parity/human-uat.md"
const roadmapPath = ".gsd/milestones/M116/M116-ROADMAP.md"

function loadInputs() {
  return {
    baseline: structuredClone(loadBaselineReport()),
    secondary: structuredClone(loadSecondaryReleaseReport()),
    gapInventory: structuredClone(loadParityGapInventory()),
    surfaceInventory: structuredClone(loadSecondarySurfaceInventory()),
  }
}

test("release-facing summary unifies baseline partial, passing required secondary lanes, optional evidence, scoped residual drift, and milestone-summary inputs", () => {
  const { baseline, secondary, gapInventory, surfaceInventory } = loadInputs()
  const summary = createReleaseFacingSummary(baseline, secondary, gapInventory, surfaceInventory)
  const rendered = renderReleaseFacingSummary(summary)

  expect(summary.version).toBe(1)
  expect(summary.artifactPath).toBe(RELEASE_FACING_SUMMARY_PATH)
  expect(summary.releaseFacingVerdict).toBe("passed")
  expect(summary.baselineVerdict).toBe("partial")
  expect(summary.requiredSecondaryVerdict).toBe("passed")
  expect(summary.baselineExplanation).toMatch(/optional and currently skipped/i)
  expect(summary.whyPartialIsTruthful).toMatch(/required secondary surfaces pass/i)

  expect(summary.baselineReportPath).toBe(baseline.artifactPath)
  expect(summary.secondaryReleaseReportPath).toBe(secondary.artifactPath)
  expect(summary.parityGapInventoryPath).toBe(gapInventory.artifactPath)
  expect(summary.secondarySurfaceInventoryPath).toBe("tests/parity/artifacts/secondary-surface-inventory.json")

  expect(summary.requiredSecondarySummary.requiredLanesPassed).toBe(true)
  expect(summary.requiredSecondarySummary.requiredLaneNames).toEqual([
    "web-mode",
    "mcp",
    "workflow-bmad",
    "worktree-session-recovery",
    "rebrand-drift",
  ])
  expect(summary.requiredSecondarySummary.passedLaneNames).toEqual([
    "web-mode",
    "mcp",
    "workflow-bmad",
    "worktree-session-recovery",
    "rebrand-drift",
  ])
  expect(summary.requiredSecondarySummary.failedRequiredLaneNames).toEqual([])
  expect(summary.requiredSecondarySummary.failedSurfaces).toEqual([])
  expect(summary.requiredSecondarySummary.failedPhases).toEqual([])

  expect(summary.optionalEvidence.live.status).toBe("skipped")
  expect(summary.optionalEvidence.live.required).toBe(false)
  expect(summary.optionalEvidence.live.skipReason).toBe("not-enabled")
  expect(summary.optionalEvidence.plannedLanes.map((lane) => lane.name)).toEqual([
    "repo-recording:web-mode",
    "installed-recording:web-mode",
    "integration:mcp-session",
    "repo-recording:workflow-bmad",
    "installed-recording:worktree-session-recovery",
  ])

  expect(summary.residualInventory).toEqual({
    totalRows: 6,
    optionalNonblockingRows: 1,
    scopedExceptionRows: 4,
    scopedRebrandFindings: 5,
    scopedRebrandFindingIds: [
      "drift-package-docker-image",
      "drift-web-subprocess-comment",
      "drift-live-regression-install-comment",
      "drift-docker-template-test",
      "drift-packaged-web-test-fixtures",
    ],
    scopedRebrandPaths: [
      "package.json",
      "src/web/ts-subprocess-flags.ts",
      "tests/live-regression/run.ts",
      "src/tests/docker-template.test.ts",
      "src/tests/integration/web-subprocess-module-resolution.test.ts",
    ],
  })

  expect(summary.scopedOutSurfaces.map((surface) => surface.id)).toEqual([
    "repo-recording:web-mode",
    "installed-recording:web-mode",
    "integration:mcp-session",
    "repo-recording:workflow-bmad",
    "installed-recording:worktree-session-recovery",
    "live-runner",
  ])
  expect(summary.scopedOutSurfaces.every((surface) => surface.blocking === false)).toBe(true)

  expect(summary.artifactPaths).toEqual({
    baselineReport: "tests/parity/artifacts/baseline-report.json",
    secondaryReleaseReport: "tests/parity/artifacts/secondary-release-report.json",
    parityGapInventory: "tests/parity/artifacts/parity-gap-inventory.json",
    secondarySurfaceInventory: "tests/parity/artifacts/secondary-surface-inventory.json",
    releaseFacingSummary: "tests/parity/artifacts/release-facing-summary.json",
    mcpParity: "tests/parity/artifacts/mcp-parity.json",
    workflowParity: "tests/parity/artifacts/workflow-parity.json",
    worktreeSessionManifest: "tests/fixtures/worktree-session-parity-manifest.json",
  })

  expect(summary.milestoneSummaryInput.authoritativeSource).toBe("tests/parity/artifacts/release-facing-summary.json")
  expect(summary.milestoneSummaryInput.whatUmbProvesNow).toMatch(/repo-mode and installed-mode coding loop/i)
  expect(summary.milestoneSummaryInput.whatUmbProvesNow).toMatch(/web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift/i)
  expect(summary.milestoneSummaryInput.whatRemainsOptional).toMatch(/live-runner/)
  expect(summary.milestoneSummaryInput.whatRemainsOutOfScope).toMatch(/Residual scoped rebrand drift remains explicit at 5 tracked findings/i)

  expect(rendered).toMatch(/Release-facing parity summary: verdict=passed/)
  expect(rendered).toMatch(/baselineVerdict: partial/)
  expect(rendered).toMatch(/requiredSecondaryVerdict: passed/)
  expect(rendered).toMatch(/requiredLaneNames: web-mode, mcp, workflow-bmad, worktree-session-recovery, rebrand-drift/)
  expect(rendered).toMatch(/optionalLive: status=skipped required=no configured=no enabled=no/)
  expect(rendered).toMatch(/residualInventory: total=6 optional=1 scoped=4 scopedRebrand=5/)
  expect(rendered).toMatch(/scopedRebrandFindingIds: drift-package-docker-image, drift-web-subprocess-comment, drift-live-regression-install-comment, drift-docker-template-test, drift-packaged-web-test-fixtures/)
})

test("release-facing summary milestone-facing wording stays quotable from tracked docs and roadmap instead of ad hoc prose", async () => {
  const expected = await resolveReleaseFacingSummary()
  const [secondaryGuide, primaryGuide, roadmap] = await Promise.all([
    readFile(secondaryGuidePath, "utf8"),
    readFile(primaryGuidePath, "utf8"),
    readFile(roadmapPath, "utf8"),
  ])

  expect(secondaryGuide).toContain(expected.artifactPath)
  expect(secondaryGuide).toContain("milestoneSummaryInput.authoritativeSource")
  expect(secondaryGuide).toContain("milestoneSummaryInput.whatUmbProvesNow")
  expect(secondaryGuide).toContain("milestoneSummaryInput.whatRemainsOptional")
  expect(secondaryGuide).toContain("milestoneSummaryInput.whatRemainsOutOfScope")
  expect(secondaryGuide).toContain("baselineExplanation")
  expect(secondaryGuide).toContain("whyPartialIsTruthful")
  expect(secondaryGuide).toContain(".gsd/milestones/M116/M116-ROADMAP.md")
  expect(secondaryGuide).toContain(".gsd/milestones/M116/slices/S02/S02-SUMMARY.md")
  expect(secondaryGuide).toContain(".gsd/milestones/M116/slices/S03/S03-SUMMARY.md")
  expect(secondaryGuide).toContain(".gsd/milestones/M116/slices/S04/S04-SUMMARY.md")

  expect(primaryGuide).toContain(expected.artifactPath)
  expect(primaryGuide).toContain("milestoneSummaryInput.authoritativeSource")
  expect(primaryGuide).toContain("milestoneSummaryInput.whatUmbProvesNow")
  expect(primaryGuide).toContain("milestoneSummaryInput.whatRemainsOptional")
  expect(primaryGuide).toContain("milestoneSummaryInput.whatRemainsOutOfScope")
  expect(primaryGuide).toContain("baselineExplanation")
  expect(primaryGuide).toContain("whyPartialIsTruthful")
  expect(primaryGuide).toContain("final milestone completion summary quoting the same unified fields")

  expect(roadmap).toContain(expected.artifactPath)
  expect(roadmap).toContain("milestoneSummaryInput.whatUmbProvesNow")
  expect(roadmap).toContain("whatRemainsOptional")
  expect(roadmap).toContain("whatRemainsOutOfScope")
  expect(roadmap).toContain("instead of ad hoc narrative reassembly")
})

test("release-facing summary rejects contradictory upstream fields with actionable path-bearing errors", () => {
  const { baseline, secondary, gapInventory, surfaceInventory } = loadInputs()

  secondary.baselineReportPath = "tests/parity/artifacts/baseline-report.other.json"
  expect(() => createReleaseFacingSummary(baseline, secondary, gapInventory, surfaceInventory)).toThrow(
    /baselineReportPath mismatch: secondary release report points to tests\/parity\/artifacts\/baseline-report\.other\.json/,
  )

  const inputs2 = loadInputs()
  inputs2.secondary.optionalLive = undefined as unknown as typeof inputs2.secondary.optionalLive
  expect(() => createReleaseFacingSummary(inputs2.baseline, inputs2.secondary, inputs2.gapInventory, inputs2.surfaceInventory)).toThrow(
    /missing optionalLive/,
  )

  const inputs3 = loadInputs()
  inputs3.surfaceInventory.summary.totalDriftFindings = 3
  inputs3.surfaceInventory.rebrandDrift = []
  expect(() => createReleaseFacingSummary(inputs3.baseline, inputs3.secondary, inputs3.gapInventory, inputs3.surfaceInventory)).toThrow(
    /Residual inventory malformed: secondary surface inventory reports drift findings in summary but provides no rows/,
  )
})

test("tracked release-facing summary artifact matches the source-derived summary except for generation timestamp", async () => {
  const expected = await resolveReleaseFacingSummary()
  const artifact = JSON.parse(await readFile(RELEASE_FACING_SUMMARY_PATH, "utf8"))

  expect(artifact.generatedAt).toMatch(/T.*Z$/)
  expect({ ...artifact, generatedAt: "<normalized>" }).toEqual({
    ...expected,
    generatedAt: "<normalized>",
  })
})
