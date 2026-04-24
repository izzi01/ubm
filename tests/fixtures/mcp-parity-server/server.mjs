import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const VERSION = '0.1.0'
const SERVER_NAME = 'mcp-parity-fixture'

const tools = [
  {
    name: 'fixture_status',
    description: 'Returns deterministic status and observability fields for MCP parity tests.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        includeDiagnostics: {
          type: 'boolean',
          description: 'When true, includes deterministic diagnostic metadata in the response.',
        },
      },
    },
    async execute(args = {}) {
      const includeDiagnostics = args.includeDiagnostics === true
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              server: SERVER_NAME,
              version: VERSION,
              fixture: 'controlled',
              diagnostics: includeDiagnostics
                ? {
                    discovery: 'available',
                    schema: 'stable',
                    failureMode: 'fixture_failure',
                  }
                : null,
            }),
          },
        ],
      }
    },
  },
  {
    name: 'sum_numbers',
    description: 'Adds two numbers and reports a deterministic invocation trace.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['left', 'right'],
      properties: {
        left: {
          type: 'number',
          description: 'Left operand.',
        },
        right: {
          type: 'number',
          description: 'Right operand.',
        },
      },
    },
    async execute(args = {}) {
      const left = Number(args.left)
      const right = Number(args.right)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              operation: 'sum_numbers',
              inputs: { left, right },
              total: left + right,
              traceId: 'fixture-sum-001',
            }),
          },
        ],
      }
    },
  },
  {
    name: 'fixture_failure',
    description: 'Returns a deterministic error payload so failure diagnostics can be asserted truthfully.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        reason: {
          type: 'string',
          description: 'Optional label describing why the failure path was triggered.',
        },
      },
    },
    async execute(args = {}) {
      const reason = typeof args.reason === 'string' && args.reason.trim()
        ? args.reason.trim()
        : 'intentional fixture failure'
      const message = JSON.stringify({
        ok: false,
        code: 'FIXTURE_FAILURE',
        reason,
        phase: 'tool-call',
        attribution: 'fixture_failure',
      })
      return {
        isError: true,
        content: [{ type: 'text', text: message }],
      }
    },
  },
]

const toolMap = new Map(tools.map((tool) => [tool.name, tool]))

const server = new Server(
  { name: SERVER_NAME, version: VERSION },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolMap.get(request.params.name)
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'UNKNOWN_TOOL', tool: request.params.name }) }],
    }
  }

  try {
    return await tool.execute(request.params.arguments ?? {})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'UNEXPECTED_ERROR', message }) }],
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write(`[fixture] ${SERVER_NAME} ready v${VERSION}\n`)
