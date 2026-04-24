import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()
const manifestPath = join(repoRoot, "tests", "fixtures", "workflow-parity-manifest.json")

type WorkflowParityManifest = {
  version: number
  fixtureId: string
  title: string
  surfaceId: string
  generatedFrom: string
  representativePath: {
    id: string
    summary: string
    whyThisPathMatters: string
    bmadRelevance: string
    inputs: string[]
  }
  contract: {
    phases: Array<{
      id: string
      tool: string
      expectedStatus: string
      artifacts: string[]
      stateTransitions: Array<{
        entity: string
        field: string
        from: string
        to: string
      }>
    }>
    requiredArtifacts: Array<{
      id: string
      pathTemplate: string
      kind: string
      producerPhase: string
      mustContain: string[]
    }>
    requiredStateAssertions: Array<{
      phase: string
      query: string
    }>
    failureDiagnostics: Array<{
      id: string
      summary: string
      operatorSurface: string
    }>
  }
  observability: {
    artifactContract: string
    stateSurfaces: string[]
    diagnosticExpectation: string
  }
  notes: string[]
}

function loadManifest(): WorkflowParityManifest {
  return JSON.parse(readFileSync(manifestPath, "utf8")) as WorkflowParityManifest
}

test("workflow parity manifest selects a scoped representative planning-to-execution path", () => {
  const manifest = loadManifest()

  assert.equal(manifest.version, 1)
  assert.equal(manifest.fixtureId, "workflow-parity-fixture")
  assert.equal(manifest.surfaceId, "workflow-bmad")
  assert.match(manifest.title, /workflow\/BMAD planning-to-execution parity fixture/i)
  assert.equal(manifest.representativePath.id, "gsd-planning-to-execution")
  assert.match(manifest.representativePath.summary, /planning-to-execution loop/i)
  assert.match(manifest.representativePath.whyThisPathMatters, /structure work/i)
  assert.match(manifest.representativePath.bmadRelevance, /structured planning and implementation-phase progression/i)
  assert.deepEqual(manifest.representativePath.inputs, [
    "Milestone planning payload",
    "Slice planning payload",
    "Task completion payload with verification evidence",
  ])
})

test("workflow parity manifest locks the expected phase sequence, tools, and persisted transitions", () => {
  const manifest = loadManifest()
  const phaseIds = manifest.contract.phases.map((phase) => phase.id)

  assert.deepEqual(phaseIds, ["plan-milestone", "plan-slice", "complete-task"])
  assert.deepEqual(
    manifest.contract.phases.map((phase) => phase.tool),
    ["gsd_plan_milestone", "gsd_plan_slice", "gsd_complete_task"],
  )

  const milestonePhase = manifest.contract.phases[0]
  assert.ok(milestonePhase)
  assert.deepEqual(milestonePhase.stateTransitions, [
    {
      entity: "milestone",
      field: "status",
      from: "missing",
      to: "active",
    },
    {
      entity: "slice",
      field: "status",
      from: "missing",
      to: "pending",
    },
  ])

  const slicePhase = manifest.contract.phases[1]
  assert.ok(slicePhase)
  assert.deepEqual(slicePhase.stateTransitions, [
    {
      entity: "task",
      field: "status",
      from: "missing",
      to: "pending",
    },
  ])

  const completeTaskPhase = manifest.contract.phases[2]
  assert.ok(completeTaskPhase)
  assert.deepEqual(completeTaskPhase.stateTransitions, [
    {
      entity: "task",
      field: "status",
      from: "pending",
      to: "complete",
    },
    {
      entity: "task",
      field: "verification_result",
      from: "missing",
      to: "passed",
    },
  ])
})

test("workflow parity manifest requires deterministic artifacts and explicit diagnostic surfaces", () => {
  const manifest = loadManifest()

  const artifactById = new Map(manifest.contract.requiredArtifacts.map((artifact) => [artifact.id, artifact]))
  assert.deepEqual(Array.from(artifactById.keys()), ["roadmap", "slice-plan", "task-plan", "task-summary"])

  assert.deepEqual(artifactById.get("roadmap"), {
    id: "roadmap",
    pathTemplate: ".gsd/milestones/<milestoneId>/<milestoneId>-ROADMAP.md",
    kind: "roadmap",
    producerPhase: "plan-milestone",
    mustContain: ["# <milestoneId>:", "## Vision", "## Slice Overview"],
  })
  assert.deepEqual(artifactById.get("slice-plan"), {
    id: "slice-plan",
    pathTemplate: ".gsd/milestones/<milestoneId>/slices/<sliceId>/<sliceId>-PLAN.md",
    kind: "slice-plan",
    producerPhase: "plan-slice",
    mustContain: ["# <sliceId>:", "## Goal", "## Tasks"],
  })
  assert.deepEqual(artifactById.get("task-plan"), {
    id: "task-plan",
    pathTemplate: ".gsd/milestones/<milestoneId>/slices/<sliceId>/tasks/<taskId>-PLAN.md",
    kind: "task-plan",
    producerPhase: "plan-slice",
    mustContain: ["estimated_steps:", "skills_used:", "# <taskId>:"],
  })
  assert.deepEqual(artifactById.get("task-summary"), {
    id: "task-summary",
    pathTemplate: ".gsd/milestones/<milestoneId>/slices/<sliceId>/tasks/<taskId>-SUMMARY.md",
    kind: "task-summary",
    producerPhase: "complete-task",
    mustContain: ["verification_result:", "## Verification", "## Verification Evidence"],
  })

  assert.deepEqual(
    manifest.contract.requiredStateAssertions.map((entry) => entry.phase),
    ["plan-milestone", "plan-slice", "complete-task"],
  )
  assert.match(manifest.contract.requiredStateAssertions[2]?.query ?? "", /verification evidence/i)

  assert.deepEqual(
    manifest.contract.failureDiagnostics.map((entry) => entry.id),
    ["missing-artifact", "invalid-transition", "verification-evidence-missing"],
  )
  assert.match(manifest.contract.failureDiagnostics[0]?.operatorSurface ?? "", /artifact path plus producing phase/i)
  assert.match(manifest.contract.failureDiagnostics[1]?.operatorSurface ?? "", /entity, field, expected value, observed value/i)
  assert.match(manifest.contract.failureDiagnostics[2]?.operatorSurface ?? "", /taskId/i)
})

test("workflow parity manifest stays aligned with tracked workflow parity reservations and repo fixtures", async () => {
  const manifest = loadManifest()
  assert.ok(existsSync(manifestPath), "workflow parity manifest should exist at the tracked fixture path")

  const secondaryParity = await import("../../../tests/parity/secondary-lanes.ts")
  const secondaryManifest = secondaryParity.createSecondaryParityManifest()
  const workflowSurface = secondaryManifest.surfaces.find((surface: { id: string }) => surface.id === "workflow-bmad")
  assert.ok(workflowSurface, "workflow-bmad surface should be present in the secondary parity manifest")

  const plannedWorkflowFixture = workflowSurface?.deterministicFixtures.find((fixture: { id: string }) => fixture.id === "workflow-representative-fixture")
  assert.ok(plannedWorkflowFixture, "workflow representative fixture reservation should exist")
  assert.equal(plannedWorkflowFixture?.path, "tests/fixtures/workflow-parity-manifest.json")
  assert.equal(plannedWorkflowFixture?.status, "planned")
  assert.equal(plannedWorkflowFixture?.laneName, "repo-recording:workflow-bmad")

  assert.ok(existsSync(join(repoRoot, "src/resources/extensions/gsd/tests/plan-milestone.test.ts")))
  assert.ok(existsSync(join(repoRoot, "src/resources/extensions/gsd/tests/plan-slice.test.ts")))
  assert.ok(existsSync(join(repoRoot, "src/resources/extensions/gsd/tests/complete-task.test.ts")))

  assert.match(manifest.observability.artifactContract, /artifact paths and persisted state assertions agree/i)
  assert.deepEqual(manifest.observability.stateSurfaces, [
    "milestone.status",
    "slice.status",
    "task.status",
    "task.verification_result",
    "verification_evidence rows",
  ])
  assert.match(manifest.observability.diagnosticExpectation, /missing artifact, invalid transition, or absent verification evidence/i)
})
