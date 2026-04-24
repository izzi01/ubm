import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export const WORKFLOW_PARITY_MANIFEST_PATH = "tests/fixtures/workflow-parity-manifest.json" as const
export const WORKFLOW_PARITY_RECORDING_PATH = "tests/fixtures/recordings/workflow-parity.json" as const
export const WORKFLOW_PARITY_ARTIFACT_PATH = "tests/parity/artifacts/workflow-parity.json" as const
export const WORKFLOW_PARITY_REPORT_PATH = `${WORKFLOW_PARITY_ARTIFACT_PATH}#workflowParity` as const

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

export async function createWorkflowParityReport(cwd: string = process.cwd()): Promise<WorkflowParityReport> {
  const resolveTs = join(cwd, "src", "resources", "extensions", "gsd", "tests", "resolve-ts.mjs")
  const workerPath = join(cwd, "tests", "parity", "workflow-parity-worker.ts")
  const stdout = execFileSync(process.execPath, [
    "--import",
    resolveTs,
    "--experimental-strip-types",
    workerPath,
  ], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  })

  return JSON.parse(stdout) as WorkflowParityReport
}

export async function writeWorkflowParityArtifacts(report: WorkflowParityReport, cwd: string = process.cwd()): Promise<void> {
  for (const path of [report.recordingPath, report.artifactPath]) {
    const outputPath = join(cwd, path)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  }
}
