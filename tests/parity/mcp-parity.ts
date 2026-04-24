import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { readFileSync } from "node:fs"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

export const MCP_PARITY_MANIFEST_PATH = "tests/fixtures/mcp-parity-manifest.json" as const
export const MCP_PARITY_RECORDING_PATH = "tests/fixtures/recordings/mcp-parity.json" as const
export const MCP_PARITY_ARTIFACT_PATH = "tests/parity/artifacts/mcp-parity.json" as const
export const MCP_PARITY_REPORT_PATH = `${MCP_PARITY_ARTIFACT_PATH}#mcpParity` as const

export interface McpParityManifest {
  version: number
  fixtureId: string
  server: {
    name: string
    transport: string
    command: string
    args: string[]
    readyStderr: string
  }
  contract: {
    discovery: {
      expectedServerName: string
      expectedTools: string[]
    }
    schemaInspection: {
      tool: string
      required: string[]
      additionalProperties: boolean
    }
    successInvocation: {
      tool: string
      args: Record<string, unknown>
      expected: {
        ok: boolean
        total: number
        traceId: string
      }
    }
    failureInvocation: {
      tool: string
      args: Record<string, unknown>
      expected: {
        ok: boolean
        code: string
        phase: string
        attribution: string
      }
    }
  }
  observability: {
    stderrReadyLine: string
    statusTool: string
    failureTool: string
  }
}

export interface McpParityToolResult {
  tool: string
  status: "passed" | "failed"
  isError: boolean
  payload: Record<string, unknown>
}

export interface McpParityReport {
  version: 1
  fixtureId: string
  serverName: string
  status: "passed" | "failed"
  artifactPath: string
  recordingPath: string
  diagnostics: {
    configuredServer: {
      name: string
      transport: string
      status: "passed" | "failed"
      readyLineSeen: boolean
    }
    discoveredTools: {
      expected: string[]
      actual: string[]
      status: "passed" | "failed"
    }
    schemaInspection: {
      tool: string
      required: string[]
      actualRequired: string[]
      additionalProperties: boolean | null
      status: "passed" | "failed"
    }
    successInvocation: McpParityToolResult
    failureInvocation: McpParityToolResult
  }
}

function loadManifest(): McpParityManifest {
  return JSON.parse(readFileSync(MCP_PARITY_MANIFEST_PATH, "utf8")) as McpParityManifest
}

function findText(result: { content?: Array<{ type?: string; text?: string }> }): string {
  const block = result.content?.find((item) => item.type === "text")
  if (!block?.text) {
    throw new Error("Expected MCP result to include a text payload")
  }
  return block.text
}

function normalizePayload(result: { isError?: boolean; content?: Array<{ type?: string; text?: string }> }): McpParityToolResult {
  const payload = JSON.parse(findText(result)) as Record<string, unknown>
  return {
    tool: String(payload.attribution ?? payload.operation ?? payload.server ?? "unknown"),
    status: "passed",
    isError: result.isError === true,
    payload,
  }
}

export async function createMcpParityReport(): Promise<McpParityReport> {
  const manifest = loadManifest()
  const stderrLines: string[] = []
  const transport = new StdioClientTransport({
    command: manifest.server.command,
    args: manifest.server.args,
    env: process.env as Record<string, string>,
    cwd: process.cwd(),
    stderr: "pipe",
  })
  transport.stderr?.on("data", (chunk) => {
    stderrLines.push(chunk.toString("utf8"))
  })

  const client = new Client({ name: "mcp-parity-runner", version: "0.0.0-test" })
  await client.connect(transport, { timeout: 30_000 })

  try {
    const toolsResult = await client.listTools(undefined, { timeout: 30_000 })
    const actualTools = (toolsResult.tools ?? []).map((tool) => tool.name)
    const schemaTool = (toolsResult.tools ?? []).find((tool) => tool.name === manifest.contract.schemaInspection.tool)
    const actualRequired = ((schemaTool?.inputSchema as { required?: string[] } | undefined)?.required ?? []).slice().sort()
    const schemaAdditionalProperties = (schemaTool?.inputSchema as { additionalProperties?: boolean } | undefined)?.additionalProperties ?? null

    const success = await client.callTool(
      { name: manifest.contract.successInvocation.tool, arguments: manifest.contract.successInvocation.args },
      undefined,
      { timeout: 30_000 },
    )
    const failure = await client.callTool(
      { name: manifest.contract.failureInvocation.tool, arguments: manifest.contract.failureInvocation.args },
      undefined,
      { timeout: 30_000 },
    )

    const successPayload = JSON.parse(findText(success)) as Record<string, unknown>
    const failurePayload = JSON.parse(findText(failure)) as Record<string, unknown>

    const report: McpParityReport = {
      version: 1,
      fixtureId: manifest.fixtureId,
      serverName: manifest.server.name,
      status: "passed",
      artifactPath: MCP_PARITY_ARTIFACT_PATH,
      recordingPath: MCP_PARITY_RECORDING_PATH,
      diagnostics: {
        configuredServer: {
          name: manifest.server.name,
          transport: manifest.server.transport,
          status: manifest.server.transport === "stdio" ? "passed" : "failed",
          readyLineSeen: stderrLines.join("").includes(manifest.observability.stderrReadyLine),
        },
        discoveredTools: {
          expected: manifest.contract.discovery.expectedTools,
          actual: actualTools,
          status: JSON.stringify(actualTools) === JSON.stringify(manifest.contract.discovery.expectedTools) ? "passed" : "failed",
        },
        schemaInspection: {
          tool: manifest.contract.schemaInspection.tool,
          required: manifest.contract.schemaInspection.required.slice().sort(),
          actualRequired,
          additionalProperties: schemaAdditionalProperties,
          status:
            JSON.stringify(actualRequired) === JSON.stringify(manifest.contract.schemaInspection.required.slice().sort()) &&
            schemaAdditionalProperties === manifest.contract.schemaInspection.additionalProperties
              ? "passed"
              : "failed",
        },
        successInvocation: {
          tool: manifest.contract.successInvocation.tool,
          status:
            success.isError !== true &&
            successPayload.ok === manifest.contract.successInvocation.expected.ok &&
            successPayload.total === manifest.contract.successInvocation.expected.total &&
            successPayload.traceId === manifest.contract.successInvocation.expected.traceId
              ? "passed"
              : "failed",
          isError: success.isError === true,
          payload: successPayload,
        },
        failureInvocation: {
          tool: manifest.contract.failureInvocation.tool,
          status:
            failure.isError === true &&
            failurePayload.ok === manifest.contract.failureInvocation.expected.ok &&
            failurePayload.code === manifest.contract.failureInvocation.expected.code &&
            failurePayload.phase === manifest.contract.failureInvocation.expected.phase &&
            failurePayload.attribution === manifest.contract.failureInvocation.expected.attribution
              ? "passed"
              : "failed",
          isError: failure.isError === true,
          payload: failurePayload,
        },
      },
    }

    const statuses = [
      report.diagnostics.configuredServer.status,
      report.diagnostics.discoveredTools.status,
      report.diagnostics.schemaInspection.status,
      report.diagnostics.successInvocation.status,
      report.diagnostics.failureInvocation.status,
    ]
    if (statuses.some((status) => status !== "passed") || !report.diagnostics.configuredServer.readyLineSeen) {
      report.status = "failed"
    }

    return report
  } finally {
    await client.close().catch(() => {})
  }
}

export async function writeMcpParityArtifacts(report: McpParityReport, cwd: string = process.cwd()): Promise<void> {
  for (const path of [report.recordingPath, report.artifactPath]) {
    const outputPath = join(cwd, path)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  }
}
