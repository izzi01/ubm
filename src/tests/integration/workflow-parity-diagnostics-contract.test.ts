import test from "node:test"
import assert from "node:assert/strict"

import { renderParityDiagnostics } from "../../../tests/parity/diagnostics.ts"
import type { BaselineReport } from "../../../tests/parity/baseline-lanes.ts"

function makeReport(): BaselineReport {
  return {
    version: 4,
    generatedAt: "2025-01-01T00:00:00.000Z",
    cwd: "/tmp/umb",
    artifactPath: "tests/parity/artifacts/baseline-report.json",
    summary: {
      verdict: "failing",
      totalLanes: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      timedOut: 0,
      provesCodingLoop: false,
      uncoveredLaneNames: ["repo-mode-coding-loop"],
      proofClassCounts: {
        smoke: 0,
        "repo-infra": 1,
        "installed-binary": 0,
        "live-spot-check": 0,
        "uncovered-coding-loop": 0,
      },
      uncoveredCapabilityNames: [],
    },
    lanes: [
      {
        name: "repo-mode-coding-loop",
        target: "tests/fixtures/recordings/repo-mode-parity-web-task.json",
        runner: "recorded-artifact",
        proofClass: "repo-infra",
        parityScope: "repo-mode",
        provesCodingLoop: true,
        status: "failed",
        skipReason: "repo-mode-coding-loop failed during test",
        exitCode: 1,
        durationMs: 1,
        command: ["artifact", "tests/fixtures/recordings/repo-mode-parity-web-task.json"],
        artifactPath: "tests/fixtures/recordings/repo-mode-parity-web-task.json",
        failedPhase: "test",
        phaseResults: [
          {
            phase: "test",
            status: "failed",
            summary: "test failed",
            command: { command: "npm test", exitCode: 1, stderrSnippet: "boom" },
          },
        ],
      },
    ],
    parityManifest: {
      version: 1,
      fixtureId: "fixture",
      title: "title",
      capabilities: [],
    },
    uncoveredCapabilities: [],
    repoInstalledComparison: {
      repoLaneName: "repo-mode-coding-loop",
      installedLaneName: "pack-install",
      repoArtifactPath: null,
      installedArtifactPath: null,
      comparableWithoutRerun: false,
      divergencePhases: [],
      phaseComparisons: [],
    },
    secondaryParity: {
      inventoryPath: "tests/parity/artifacts/secondary-surface-inventory.json",
      manifestPath: "tests/parity/secondary-lanes.ts",
      inventoryVersion: 1,
      manifestVersion: 1,
      summary: {
        totalSurfaces: 0,
        partialSurfaces: 0,
        coveredSurfaces: 0,
        uncoveredSurfaces: 0,
        totalDriftFindings: 0,
        surfacesMissingReleaseReadableCoverage: [],
      },
      surfaces: [],
      uncoveredSurfaces: [],
      driftFindings: [],
      inventory: { version: 1, generatedAt: "2025-01-01T00:00:00.000Z", surfaces: [], rebrandDrift: [] },
      manifest: { version: 1, generatedAt: "2025-01-01T00:00:00.000Z", surfaces: [], lanes: [] },
    },
    mcpParity: {
      id: "mcp",
      title: "MCP parity",
      inventoryStatus: "partial",
      releaseReadableStatus: "partial",
      requiredLaneNames: [],
      optionalLaneNames: [],
      existingRequiredLaneNames: [],
      missingRequiredLaneNames: [],
      presentFixturePaths: [],
      plannedFixturePaths: [],
      coverageGapIds: [],
      uncoveredAreas: [],
      reportPath: "tests/parity/artifacts/mcp-parity.json#mcpParity",
      parityArtifactPath: "tests/parity/artifacts/mcp-parity.json",
      recordingPath: "tests/fixtures/recordings/mcp-parity.json",
      parityStatus: "passed",
      diagnostics: {
        configuredServer: { status: "passed", name: "mcp", transport: "stdio", readyLineSeen: true },
        discoveredTools: { status: "passed", expected: [], actual: [] },
        schemaInspection: { status: "passed", tool: "tool", required: [], actualRequired: [], additionalProperties: false },
        successInvocation: { status: "passed", tool: "tool", isError: false },
        failureInvocation: { status: "passed", tool: "tool", isError: true, payload: { phase: "tool-call", attribution: "tool", code: "ERR" } },
      },
    },
    workflowParity: {
      id: "workflow-bmad",
      title: "Workflow parity",
      inventoryStatus: "partial",
      releaseReadableStatus: "partial",
      requiredLaneNames: [],
      optionalLaneNames: [],
      existingRequiredLaneNames: [],
      missingRequiredLaneNames: [],
      presentFixturePaths: [],
      plannedFixturePaths: [],
      coverageGapIds: [],
      uncoveredAreas: [],
      reportPath: "tests/parity/artifacts/workflow-parity.json#workflowParity",
      parityArtifactPath: "tests/parity/artifacts/workflow-parity.json",
      recordingPath: "tests/fixtures/recordings/workflow-parity.json",
      parityStatus: "failed",
      diagnostics: {
        stateManifestPath: ".gsd/state-manifest.json",
        taskSummaryPath: ".gsd/milestones/M901/slices/S01/tasks/T01-SUMMARY.md",
        artifactChecks: [
          {
            id: "slice-plan",
            producerPhase: "plan-slice",
            path: ".gsd/milestones/M901/slices/S01/S01-PLAN.md",
            exists: false,
            missingMarkers: ["**Goal:**"],
          },
        ],
        stateTransitions: [
          {
            phase: "complete-task",
            entity: "task",
            field: "verification_result",
            expected: "node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts",
            observed: "missing",
            status: "failed",
          },
        ],
        verificationEvidence: {
          rowCount: 0,
          commands: [],
          status: "failed",
        },
        failureDiagnostics: [
          "missing artifact: .gsd/milestones/M901/slices/S01/S01-PLAN.md (phase plan-slice)",
          "invalid transition: complete-task expected task.verification_result=node --test src/resources/extensions/gsd/tests/workflow-tool-executors.test.ts but saw missing",
          "verification evidence missing: T01 did not persist any verification_evidence rows",
        ],
      },
    },
    reconciledFoundations: [
      {
        milestoneId: "M113",
        requirementStatusById: { R023: "validated", R026: "validated" },
        summaryLabel: "closed foundation",
        reportAnnotation: "annotation",
      },
    ],
  }
}

test("workflow diagnostics renderer names missing artifacts, invalid transitions, and missing verification evidence", () => {
  const rendered = renderParityDiagnostics(makeReport())

  assert.match(rendered, /workflow parity:/)
  assert.match(rendered, /artifactCheck: id=slice-plan phase=plan-slice exists=no path=\.gsd\/milestones\/M901\/slices\/S01\/S01-PLAN\.md missingMarkers=\*\*Goal:\*\*/)
  assert.match(rendered, /stateTransition: phase=complete-task task\.verification_result expected=node --test src\/resources\/extensions\/gsd\/tests\/workflow-tool-executors\.test\.ts observed=missing status=failed/)
  assert.match(rendered, /failure: missing artifact: \.gsd\/milestones\/M901\/slices\/S01\/S01-PLAN\.md \(phase plan-slice\)/)
  assert.match(rendered, /failure: invalid transition: complete-task expected task\.verification_result=node --test src\/resources\/extensions\/gsd\/tests\/workflow-tool-executors\.test\.ts but saw missing/)
  assert.match(rendered, /failure: verification evidence missing: T01 did not persist any verification_evidence rows/)
})
