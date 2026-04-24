import { createBaselineReport, writeBaselineReport } from "./baseline-lanes.ts"

type CliOptions = {
  format: "json"
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  let format: "json" = "json"

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--format") {
      const next = argv[index + 1]
      if (next !== "json") {
        throw new Error(`Unsupported --format value: ${String(next)}. Only json is supported.`)
      }
      format = next
      index += 1
      continue
    }
    if (token === "--help" || token === "-h") {
      process.stdout.write("Usage: node --experimental-strip-types tests/parity/run.ts [--format json]\n")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${token}`)
  }

  return { format }
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2))
  const report = await createBaselineReport({ cwd: process.cwd() })
  const writtenPath = await writeBaselineReport(report, process.cwd())

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify({ ...report, artifactPath: writtenPath }, null, 2)}\n`)
  }

  if (report.summary.verdict === "failing") {
    process.exitCode = 1
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
