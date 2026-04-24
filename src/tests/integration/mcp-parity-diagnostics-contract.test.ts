import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { type BaselineReport } from "../../../tests/parity/baseline-lanes.ts"
import { renderParityDiagnostics } from "../../../tests/parity/diagnostics.ts"

const baselineReportPath = "tests/parity/artifacts/baseline-report.json"
const mcpArtifactPath = "tests/parity/artifacts/mcp-parity.json"

function loadBaselineReport(): BaselineReport {
  return JSON.parse(readFileSync(baselineReportPath, "utf8")) as BaselineReport
}

test("renderParityDiagnostics includes MCP artifact paths and successful call reporting", () => {
  const report = loadBaselineReport()

  const rendered = renderParityDiagnostics(report)

  assert.match(rendered, /mcp parity:/)
  assert.match(rendered, /surface: mcp/)
  assert.match(rendered, /reportPath: tests\/parity\/artifacts\/mcp-parity\.json#mcpParity/)
  assert.match(rendered, /artifactPath: tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /recordingPath: tests\/fixtures\/recordings\/mcp-parity\.json/)
  assert.match(rendered, /configuredServer: status=passed name=mcp-parity-fixture transport=stdio readyLineSeen=yes/)
  assert.match(rendered, /toolDiscovery: status=passed expected=fixture_status, sum_numbers, fixture_failure actual=fixture_status, sum_numbers, fixture_failure/)
  assert.match(rendered, /schemaInspection: status=passed tool=sum_numbers required=left, right actualRequired=left, right additionalProperties=false/)
  assert.match(rendered, /successInvocation: status=passed tool=sum_numbers isError=no phase=tool-call artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /success: successful call reported by sum_numbers via tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /failureInvocation: status=passed tool=fixture_failure isError=yes phase=tool-call attribution=fixture_failure code=FIXTURE_FAILURE artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /failureAttribution: invocation failure preserved for fixture_failure during tool-call/)
})

test("renderParityDiagnostics names missing configured server and schema mismatch attribution clearly", () => {
  const report = loadBaselineReport()

  report.mcpParity = {
    ...report.mcpParity,
    parityStatus: "failed",
    diagnostics: {
      ...report.mcpParity.diagnostics,
      configuredServer: {
        ...report.mcpParity.diagnostics.configuredServer,
        status: "failed",
        readyLineSeen: false,
      },
      schemaInspection: {
        ...report.mcpParity.diagnostics.schemaInspection,
        status: "failed",
        actualRequired: ["left"],
        additionalProperties: true,
      },
    },
  }

  const rendered = renderParityDiagnostics(report)

  assert.match(rendered, /configuredServer: status=failed name=mcp-parity-fixture transport=stdio readyLineSeen=no/)
  assert.match(rendered, /failureAttribution: configured server missing or misconfigured/)
  assert.match(rendered, /schemaInspection: status=failed tool=sum_numbers required=left, right actualRequired=left additionalProperties=true/)
  assert.match(rendered, /failureAttribution: schema mismatch on sum_numbers/)
})

test("renderParityDiagnostics keeps invocation failure attribution actionable when MCP reporting drifts", () => {
  const report = loadBaselineReport()

  report.mcpParity = {
    ...report.mcpParity,
    parityStatus: "failed",
    diagnostics: {
      ...report.mcpParity.diagnostics,
      successInvocation: {
        ...report.mcpParity.diagnostics.successInvocation,
        status: "failed",
        isError: true,
      },
      failureInvocation: {
        ...report.mcpParity.diagnostics.failureInvocation,
        status: "failed",
        isError: false,
        payload: {
          ...report.mcpParity.diagnostics.failureInvocation.payload,
          phase: "schema-inspection",
          attribution: "sum_numbers",
          code: "SCHEMA_MISMATCH",
        },
      },
    },
  }

  const rendered = renderParityDiagnostics(report)

  assert.match(rendered, /successInvocation: status=failed tool=sum_numbers isError=yes phase=tool-call artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /failureAttribution: successful call reporting failed for sum_numbers/)
  assert.match(rendered, /failureInvocation: status=failed tool=fixture_failure isError=no phase=schema-inspection attribution=sum_numbers code=SCHEMA_MISMATCH artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  assert.match(rendered, /failureAttribution: invocation failure reporting drifted for sum_numbers/)
})

test("tracked MCP parity artifact stays aligned with the baseline report MCP section", () => {
  const report = loadBaselineReport()
  const artifact = JSON.parse(readFileSync(mcpArtifactPath, "utf8"))

  assert.equal(artifact.artifactPath, report.mcpParity.parityArtifactPath)
  assert.equal(artifact.recordingPath, report.mcpParity.recordingPath)
  assert.equal(artifact.status, report.mcpParity.parityStatus)
  assert.deepEqual(artifact.diagnostics, report.mcpParity.diagnostics)
})
