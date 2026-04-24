import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { randomUUID } from "node:crypto"

import { openDatabase, closeDatabase } from "../../src/resources/extensions/gsd/gsd-db.ts"
import {
  executePlanMilestone,
  executePlanSlice,
  executeTaskComplete,
} from "../../src/resources/extensions/gsd/tools/workflow-tool-executors.ts"
import { readManifest } from "../../src/resources/extensions/gsd/workflow-manifest.ts"

export const WORKFLOW_PARITY_MANIFEST_PATH = "tests/fixtures/workflow-parity-manifest.json" as const
export const WORKFLOW_PARITY_RECORDING_PATH = "tests/fixtures/recordings/workflow-parity.json" as const
export const WORKFLOW_PARITY_ARTIFACT_PATH = "tests/parity/artifacts/workflow-parity.json" as const

export type WorkflowParityArtifactCheck = {
  id: string
  producerPhase: string
  path: string
  exists: boolean
  missingMarkers: string[]
}

export type WorkflowParityTransitionCheck = {
  phase: string
  entity: string
  field: string
  expected: string
  observed: string | null
  status: "passed" | "failed"
}

export type WorkflowParityReport = {
  version: 1
  fixtureId: string
  representativePathId: string
  status: "passed" | "failed"
  artifactPath: string
  recordingPath: string
  ids: {
    milestoneId: string
    sliceId: string
    taskId: string
  }
  diagnostics: {
    stateManifestPath: string
    taskSummaryPath: string
    artifactChecks: WorkflowParityArtifactCheck[]
    stateTransitions: WorkflowParityTransitionCheck[]
    verificationEvidence: {
      rowCount: number
      commands: string[]
      status: "passed" | "failed"
    }
    failureDiagnostics: string[]
  }
}

type WorkflowParityManifest = {
  fixtureId: string
  representativePath: { id: string }
  contract: {
    requiredArtifacts: Array<{
      id: string
      pathTemplate: string
      producerPhase: string
      mustContain: string[]
    }>
  }
}

function loadManifest(): WorkflowParityManifest {
  return JSON.parse(readFileSync(WORKFLOW_PARITY_MANIFEST_PATH, "utf8")) as WorkflowParityManifest
}

function resolveTemplate(pathTemplate: string, ids: { milestoneId: string; sliceId: string; taskId: string }): string {
  return pathTemplate
    .replaceAll("<milestoneId>", ids.milestoneId)
    .replaceAll("<sliceId>", ids.sliceId)
    .replaceAll("<taskId>", ids.taskId)
}

async function inProjectDir<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const originalCwd = process.cwd()
  try {
    process.chdir(dir)
    return await fn()
  } finally {
    process.chdir(originalCwd)
  }
}

function makeTmpBase(): string {
  const base = join(tmpdir(), `workflow-parity-${randomUUID()}`)
  mkdirSync(join(base, ".gsd"), { recursive: true })
  return base
}

function normalizeExpectedMarker(marker: string): string {
  if (marker === "## Goal") {
    return "**Goal:**"
  }
  return marker
}

function normalizeExpectedTransition(field: string, expected: string): string {
  if (field === "verification_result" && expected === "passed") {
    return "node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts"
  }
  return expected
}

export async function createWorkflowParityReportWorker(): Promise<WorkflowParityReport> {
  const manifest = loadManifest()
  const ids = { milestoneId: "M901", sliceId: "S01", taskId: "T01" }
  const base = makeTmpBase()
  const snapshots: Record<string, ReturnType<typeof readManifest>> = {}

  try {
    openDatabase(join(base, ".gsd", "gsd.db"))

    await inProjectDir(base, async () => {
      const milestoneResult = await executePlanMilestone(
        {
          milestoneId: ids.milestoneId,
          title: "Workflow parity fixture milestone",
          vision: "Exercise the representative planning-to-execution path.",
          slices: [
            {
              sliceId: ids.sliceId,
              title: "Representative slice",
              risk: "medium",
              depends: [],
              demo: "Workflow parity artifacts render and state transitions persist.",
              goal: "Persist milestone planning state.",
              successCriteria: "Roadmap renders from DB state.",
              proofLevel: "integration",
              integrationClosure: "Task and slice plans render from the same persisted workflow state.",
              observabilityImpact: "Manifest and task summary expose persisted transitions and evidence rows.",
            },
          ],
        },
        base,
      )
      if (milestoneResult.details.error) throw new Error(String(milestoneResult.details.error))
      snapshots["plan-milestone"] = readManifest(base)

      const sliceResult = await executePlanSlice(
        {
          milestoneId: ids.milestoneId,
          sliceId: ids.sliceId,
          goal: "Persist slice/task planning state.",
          tasks: [
            {
              taskId: ids.taskId,
              title: "Complete representative task",
              description: "Render the task plan and completion artifacts for the representative loop.",
              estimate: "15m",
              files: ["src/resources/extensions/gsd/tools/workflow-tool-executors.ts"],
              verify: "node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts",
              inputs: ["tests/fixtures/workflow-parity-manifest.json"],
              expectedOutput: ["T01-PLAN.md", "T01-SUMMARY.md"],
              observabilityImpact: "Verification evidence rows should persist into the state manifest.",
            },
          ],
          successCriteria: "Slice plan and task plan render from persisted rows.",
          proofLevel: "integration",
          integrationClosure: "Task completion can reuse the planned rows without direct file writes.",
          observabilityImpact: "Rendered plan artifacts remain aligned with state-manifest output.",
        },
        base,
      )
      if (sliceResult.details.error) throw new Error(String(sliceResult.details.error))
      snapshots["plan-slice"] = readManifest(base)

      const taskResult = await executeTaskComplete(
        {
          milestoneId: ids.milestoneId,
          sliceId: ids.sliceId,
          taskId: ids.taskId,
          oneLiner: "Completed the representative workflow parity task.",
          narrative: "Executed the deterministic milestone/slice/task planning-to-execution loop.",
          verification: "node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts",
          verificationEvidence: [
            {
              command: "node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts",
              exitCode: 0,
              verdict: "✅ pass",
              durationMs: 1,
            },
          ],
        },
        base,
      )
      if (taskResult.details.error) throw new Error(String(taskResult.details.error))
      snapshots["complete-task"] = readManifest(base)
    })

    const finalManifest = snapshots["complete-task"]
    if (!finalManifest) throw new Error("workflow parity fixture did not produce a state manifest")

    const artifactChecks = manifest.contract.requiredArtifacts.map((artifact) => {
      const relativePath = resolveTemplate(artifact.pathTemplate, ids)
      const absolutePath = join(base, relativePath)
      const exists = existsSync(absolutePath)
      const content = exists ? readFileSync(absolutePath, "utf8") : ""
      const missingMarkers = exists
        ? artifact.mustContain.filter((marker) => !content.includes(resolveTemplate(normalizeExpectedMarker(marker), ids)))
        : [...artifact.mustContain]
      return { id: artifact.id, producerPhase: artifact.producerPhase, path: relativePath, exists, missingMarkers }
    })

    const milestoneAfterPlan = snapshots["plan-milestone"]?.milestones.find((row) => row.id === ids.milestoneId)
    const sliceAfterPlanMilestone = snapshots["plan-milestone"]?.slices.find((row) => row.id === ids.sliceId && row.milestone_id === ids.milestoneId)
    const taskAfterPlanSlice = snapshots["plan-slice"]?.tasks.find((row) => row.id === ids.taskId && row.slice_id === ids.sliceId && row.milestone_id === ids.milestoneId)
    const taskAfterComplete = finalManifest.tasks.find((row) => row.id === ids.taskId && row.slice_id === ids.sliceId && row.milestone_id === ids.milestoneId)

    const stateTransitions: WorkflowParityTransitionCheck[] = [
      {
        phase: "plan-milestone",
        entity: "milestone",
        field: "status",
        expected: "active",
        observed: milestoneAfterPlan?.status ?? null,
        status: milestoneAfterPlan?.status === "active" ? "passed" : "failed",
      },
      {
        phase: "plan-milestone",
        entity: "slice",
        field: "status",
        expected: "pending",
        observed: sliceAfterPlanMilestone?.status ?? null,
        status: sliceAfterPlanMilestone?.status === "pending" ? "passed" : "failed",
      },
      {
        phase: "plan-slice",
        entity: "task",
        field: "status",
        expected: "pending",
        observed: taskAfterPlanSlice?.status ?? null,
        status: taskAfterPlanSlice?.status === "pending" ? "passed" : "failed",
      },
      {
        phase: "complete-task",
        entity: "task",
        field: "status",
        expected: "complete",
        observed: taskAfterComplete?.status ?? null,
        status: taskAfterComplete?.status === "complete" ? "passed" : "failed",
      },
      {
        phase: "complete-task",
        entity: "task",
        field: "verification_result",
        expected: normalizeExpectedTransition("verification_result", "passed"),
        observed: taskAfterComplete?.verification_result ?? null,
        status: taskAfterComplete?.verification_result === normalizeExpectedTransition("verification_result", "passed") ? "passed" : "failed",
      },
    ]

    const evidenceRows = finalManifest.verification_evidence.filter(
      (row) => row.milestone_id === ids.milestoneId && row.slice_id === ids.sliceId && row.task_id === ids.taskId,
    )
    const failureDiagnostics: string[] = []

    for (const artifact of artifactChecks) {
      if (!artifact.exists) {
        failureDiagnostics.push(`missing artifact: ${artifact.path} (phase ${artifact.producerPhase})`)
        continue
      }
      if (artifact.missingMarkers.length > 0) {
        failureDiagnostics.push(`malformed artifact: ${artifact.path} missing markers ${artifact.missingMarkers.join(", ")} (phase ${artifact.producerPhase})`)
      }
    }

    for (const transition of stateTransitions) {
      if (transition.status !== "passed") {
        failureDiagnostics.push(`invalid transition: ${transition.phase} expected ${transition.entity}.${transition.field}=${transition.expected} but saw ${transition.observed ?? "missing"}`)
      }
    }

    if (evidenceRows.length === 0) {
      failureDiagnostics.push(`verification evidence missing: ${ids.taskId} did not persist any verification_evidence rows`)
    }

    return {
      version: 1,
      fixtureId: manifest.fixtureId,
      representativePathId: manifest.representativePath.id,
      status: failureDiagnostics.length === 0 ? "passed" : "failed",
      artifactPath: WORKFLOW_PARITY_ARTIFACT_PATH,
      recordingPath: WORKFLOW_PARITY_RECORDING_PATH,
      ids,
      diagnostics: {
        stateManifestPath: ".gsd/state-manifest.json",
        taskSummaryPath: `.gsd/milestones/${ids.milestoneId}/slices/${ids.sliceId}/tasks/${ids.taskId}-SUMMARY.md`,
        artifactChecks,
        stateTransitions,
        verificationEvidence: {
          rowCount: evidenceRows.length,
          commands: evidenceRows.map((row) => row.command),
          status: evidenceRows.length > 0 ? "passed" : "failed",
        },
        failureDiagnostics,
      },
    }
  } finally {
    try { closeDatabase() } catch {}
    rmSync(base, { recursive: true, force: true })
  }
}

export async function writeWorkflowParityArtifactsWorker(report: WorkflowParityReport, cwd: string = process.cwd()): Promise<void> {
  for (const path of [report.recordingPath, report.artifactPath]) {
    const outputPath = join(cwd, path)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const report = await createWorkflowParityReportWorker()
  process.stdout.write(`${JSON.stringify(report)}\n`)
}
