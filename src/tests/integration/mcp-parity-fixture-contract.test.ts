import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

type Manifest = {
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

function loadManifest(): Manifest {
  return JSON.parse(readFileSync('tests/fixtures/mcp-parity-manifest.json', 'utf8')) as Manifest
}

async function createFixtureClient(manifest: Manifest) {
  const stderrLines: string[] = []
  const transport = new StdioClientTransport({
    command: manifest.server.command,
    args: manifest.server.args,
    env: process.env as Record<string, string>,
    cwd: process.cwd(),
    stderr: 'pipe',
  })

  transport.stderr?.on('data', (chunk) => {
    stderrLines.push(chunk.toString('utf8'))
  })

  const client = new Client({
    name: 'mcp-parity-contract-test',
    version: '0.0.0-test',
  })

  await client.connect(transport, { timeout: 30_000 })

  return {
    client,
    stderrLines,
    close: async () => {
      await client.close().catch(() => {})
    },
  }
}

function findText(result: { content?: Array<{ type?: string, text?: string }> }): string {
  const textBlock = result.content?.find((item) => item.type === 'text')
  assert.ok(textBlock?.text, 'expected MCP result to include a text payload')
  return textBlock.text
}

test('MCP parity fixture manifest stays aligned with the deterministic fixture contract', () => {
  const manifest = loadManifest()

  assert.equal(manifest.version, 1)
  assert.equal(manifest.fixtureId, 'mcp-parity-fixture')
  assert.equal(manifest.server.transport, 'stdio')
  assert.equal(manifest.server.command, 'node')
  assert.deepEqual(manifest.contract.discovery.expectedTools, [
    'fixture_status',
    'sum_numbers',
    'fixture_failure',
  ])
  assert.deepEqual(manifest.contract.schemaInspection.required, ['left', 'right'])
  assert.equal(manifest.contract.schemaInspection.additionalProperties, false)
  assert.equal(manifest.observability.failureTool, 'fixture_failure')
})

test('MCP parity fixture supports discovery, schema inspection, successful invocation, and intentional failure diagnostics', async () => {
  const manifest = loadManifest()
  const { client, stderrLines, close } = await createFixtureClient(manifest)

  try {
    const tools = await client.listTools(undefined, { timeout: 30_000 })
    const toolNames = (tools.tools ?? []).map((tool) => tool.name)
    assert.deepEqual(toolNames, manifest.contract.discovery.expectedTools)

    const schemaTool = (tools.tools ?? []).find((tool) => tool.name === manifest.contract.schemaInspection.tool)
    assert.ok(schemaTool, 'expected schema inspection tool to be listed')
    assert.equal(schemaTool.description?.length ? true : false, true)
    assert.equal((schemaTool.inputSchema as { additionalProperties?: boolean }).additionalProperties, manifest.contract.schemaInspection.additionalProperties)
    assert.deepEqual(
      ((schemaTool.inputSchema as { required?: string[] }).required ?? []).slice().sort(),
      manifest.contract.schemaInspection.required.slice().sort(),
    )

    const successResult = await client.callTool(
      {
        name: manifest.contract.successInvocation.tool,
        arguments: manifest.contract.successInvocation.args,
      },
      undefined,
      { timeout: 30_000 },
    )
    assert.equal(successResult.isError, undefined)
    const successPayload = JSON.parse(findText(successResult)) as {
      ok: boolean
      total: number
      traceId: string
      inputs: { left: number, right: number }
    }
    assert.equal(successPayload.ok, manifest.contract.successInvocation.expected.ok)
    assert.equal(successPayload.total, manifest.contract.successInvocation.expected.total)
    assert.equal(successPayload.traceId, manifest.contract.successInvocation.expected.traceId)
    assert.deepEqual(successPayload.inputs, { left: 2, right: 3 })

    const failureResult = await client.callTool(
      {
        name: manifest.contract.failureInvocation.tool,
        arguments: manifest.contract.failureInvocation.args,
      },
      undefined,
      { timeout: 30_000 },
    )
    assert.equal(failureResult.isError, true)
    const failurePayload = JSON.parse(findText(failureResult)) as {
      ok: boolean
      code: string
      reason: string
      phase: string
      attribution: string
    }
    assert.equal(failurePayload.ok, manifest.contract.failureInvocation.expected.ok)
    assert.equal(failurePayload.code, manifest.contract.failureInvocation.expected.code)
    assert.equal(failurePayload.phase, manifest.contract.failureInvocation.expected.phase)
    assert.equal(failurePayload.attribution, manifest.contract.failureInvocation.expected.attribution)
    assert.equal(failurePayload.reason, 'diagnostic probe')

    const statusResult = await client.callTool(
      {
        name: manifest.observability.statusTool,
        arguments: { includeDiagnostics: true },
      },
      undefined,
      { timeout: 30_000 },
    )
    assert.equal(statusResult.isError, undefined)
    const statusPayload = JSON.parse(findText(statusResult)) as {
      ok: boolean
      diagnostics: { discovery: string, schema: string, failureMode: string } | null
    }
    assert.equal(statusPayload.ok, true)
    assert.deepEqual(statusPayload.diagnostics, {
      discovery: 'available',
      schema: 'stable',
      failureMode: 'fixture_failure',
    })

    assert.match(stderrLines.join(''), /\[fixture\] mcp-parity-fixture ready v0\.1\.0/)
  } finally {
    await close()
  }
})
