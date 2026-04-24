import { test, expect } from "vitest"
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

  expect(rendered).toMatch(/mcp parity:/)
  expect(rendered).toMatch(/surface: mcp/)
  expect(rendered).toMatch(/reportPath: tests\/parity\/artifacts\/mcp-parity\.json#mcpParity/)
  expect(rendered).toMatch(/artifactPath: tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/recordingPath: tests\/fixtures\/recordings\/mcp-parity\.json/)
  expect(rendered).toMatch(/configuredServer: status=passed name=mcp-parity-fixture transport=stdio readyLineSeen=yes/)
  expect(rendered).toMatch(/toolDiscovery: status=passed expected=fixture_status, sum_numbers, fixture_failure actual=fixture_status, sum_numbers, fixture_failure/)
  expect(rendered).toMatch(/schemaInspection: status=passed tool=sum_numbers required=left, right actualRequired=left, right additionalProperties=false/)
  expect(rendered).toMatch(/successInvocation: status=passed tool=sum_numbers isError=no phase=tool-call artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/success: successful call reported by sum_numbers via tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/failureInvocation: status=passed tool=fixture_failure isError=yes phase=tool-call attribution=fixture_failure code=FIXTURE_FAILURE artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/failureAttribution: invocation failure preserved for fixture_failure during tool-call/)
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

  expect(rendered).toMatch(/configuredServer: status=failed name=mcp-parity-fixture transport=stdio readyLineSeen=no/)
  expect(rendered).toMatch(/failureAttribution: configured server missing or misconfigured/)
  expect(rendered).toMatch(/schemaInspection: status=failed tool=sum_numbers required=left, right actualRequired=left additionalProperties=true/)
  expect(rendered).toMatch(/failureAttribution: schema mismatch on sum_numbers/)
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

  expect(rendered).toMatch(/successInvocation: status=failed tool=sum_numbers isError=yes phase=tool-call artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/failureAttribution: successful call reporting failed for sum_numbers/)
  expect(rendered).toMatch(/failureInvocation: status=failed tool=fixture_failure isError=no phase=schema-inspection attribution=sum_numbers code=SCHEMA_MISMATCH artifact=tests\/parity\/artifacts\/mcp-parity\.json/)
  expect(rendered).toMatch(/failureAttribution: invocation failure reporting drifted for sum_numbers/)
})

test("tracked MCP parity artifact stays aligned with the baseline report MCP section", () => {
  const report = loadBaselineReport()
  const artifact = JSON.parse(readFileSync(mcpArtifactPath, "utf8"))

  expect(artifact.artifactPath).toBe(report.mcpParity.parityArtifactPath)
  expect(artifact.recordingPath).toBe(report.mcpParity.recordingPath)
  expect(artifact.status).toBe(report.mcpParity.parityStatus)
  expect(artifact.diagnostics).toEqual(report.mcpParity.diagnostics)
})
