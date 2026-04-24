import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const requirementsPath = join(repoRoot, ".gsd", "REQUIREMENTS.md")
const m113SummaryPath = join(repoRoot, ".gsd", "milestones", "M113", "M113-SUMMARY.md")
const m113ValidationPath = join(repoRoot, ".gsd", "milestones", "M113", "M113-VALIDATION.md")

async function importParityModule() {
  return await import("../../../tests/parity/baseline-lanes.ts")
}

function sectionForRequirement(requirements: string, id: string): string {
  const marker = `### ${id} —`
  const start = requirements.indexOf(marker)
  assert.notEqual(start, -1, `missing requirement section for ${id}`)

  const next = requirements.indexOf("\n### ", start + marker.length)
  return requirements.slice(start, next === -1 ? undefined : next)
}

test("M113 summary and validation both record R023 and R026 as validated outcomes", () => {
  const summary = readFileSync(m113SummaryPath, "utf8")
  const validation = readFileSync(m113ValidationPath, "utf8")

  assert.match(summary, /R023\s*\|\s*active → validated/i)
  assert.match(summary, /R026\s*\|\s*active → validated/i)
  assert.match(validation, /R023 — Planning artifacts git-tracked \| Validated/i)
  assert.match(validation, /R026 — Test cleanup \+ git-self-heal \| Validated/i)
  assert.match(validation, /Bookkeeping note: R023 and R026 should be updated from 'active' to 'validated' in REQUIREMENTS\.md\./i)
})

test("requirements bookkeeping now matches the reconciled M113 evidence", () => {
  const requirements = readFileSync(requirementsPath, "utf8")

  const r023 = sectionForRequirement(requirements, "R023")
  const r026 = sectionForRequirement(requirements, "R026")

  assert.match(r023, /Status: validated/i)
  assert.doesNotMatch(r023, /Status: active/i)
  assert.match(r023, /Validation: .*355 milestone files tracked/i)

  assert.match(r026, /Status: validated/i)
  assert.doesNotMatch(r026, /Status: active/i)
  assert.match(r026, /Validation: .*auto-recovery.*crash-recovery-only/i)
  assert.match(r026, /Notes: REQUIREMENTS\.md had drifted behind the completed milestone summary; this update reconciles the contract with delivered evidence\./i)
})

test("baseline reconciliation metadata labels M113 cleanup as closed foundation rather than an open parity gap", async () => {
  const parity = await importParityModule()

  assert.deepEqual(parity.M113_RECONCILED_REQUIREMENT_IDS, ["R023", "R026"])
  assert.equal(parity.M113_RECONCILIATION.requirementStatusById.R023, "validated")
  assert.equal(parity.M113_RECONCILIATION.requirementStatusById.R026, "validated")
  assert.match(parity.M113_RECONCILIATION.summaryLabel, /closed foundation/i)
  assert.match(parity.M113_RECONCILIATION.reportAnnotation, /M113 cleanup/i)
  assert.match(parity.M113_RECONCILIATION.reportAnnotation, /not an open parity gap/i)

  const summary = parity.summarizeBaselineResults([
    {
      name: "fixtures-runner",
      target: "tests/fixtures/run.ts",
      runner: "node-script",
      proofClass: "uncovered-coding-loop",
      parityScope: "partial",
      provesCodingLoop: false,
      status: "passed",
      skipReason: null,
      exitCode: 0,
      durationMs: 1,
      command: ["--experimental-strip-types", "tests/fixtures/run.ts"],
    },
  ])

  assert.equal(summary.verdict, "partial")
  assert.deepEqual(summary.uncoveredLaneNames, ["fixtures-runner"])
  assert.ok(!summary.uncoveredLaneNames.includes("R023"))
  assert.ok(!summary.uncoveredLaneNames.includes("R026"))

  const report = await parity.createBaselineReport({
    cwd: repoRoot,
    env: {
      ...process.env,
      GSD_LIVE_TESTS: "0",
    },
  })

  assert.deepEqual(report.reconciledFoundations, [parity.M113_RECONCILIATION])
  assert.equal(report.reconciledFoundations[0]?.milestoneId, "M113")
  assert.match(report.reconciledFoundations[0]?.summaryLabel ?? "", /closed foundation/i)
  assert.match(report.reconciledFoundations[0]?.reportAnnotation ?? "", /not an open parity gap/i)
  assert.ok(!report.summary.uncoveredLaneNames.includes("R023"))
  assert.ok(!report.summary.uncoveredLaneNames.includes("R026"))
})
