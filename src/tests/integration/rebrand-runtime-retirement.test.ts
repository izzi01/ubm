import { test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()

function readText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

test("CLI non-TTY guidance is umb-branded while preserving the same actionable alternatives", () => {
  const source = readText("src/cli.ts")

  expect(source).toMatch(/\[umb\] Error: Interactive mode requires a terminal \(TTY\)\./)
  expect(source).toMatch(/\[umb\] Non-interactive alternatives:/)
  expect(source).toMatch(/\[umb\]\s+umb auto\s+Auto-mode \(pipeable, no TUI\)/)
  expect(source).toMatch(/\[umb\]\s+umb --print "your message"\s+Single-shot prompt/)
  expect(source).toMatch(/\[umb\]\s+umb --mode rpc\s+JSON-RPC over stdin\/stdout/)
  expect(source).toMatch(/\[umb\]\s+umb --mode mcp\s+MCP server over stdin\/stdout/)
  expect(source).toMatch(/\[umb\]\s+umb --mode text "message"\s+Text output mode/)
  expect(source).toMatch(/\[umb\]\s+umb --web \[path\]\s+Browser-only web mode/)
  expect(source).toMatch(/\[umb\]\s+umb headless\s+Auto-mode without TUI/)

  expect(source).not.toMatch(/\[gsd\]\s+gsd auto\s+Auto-mode \(pipeable, no TUI\)/)
  expect(source).not.toMatch(/\[gsd\]\s+gsd --web \[path\]\s+Browser-only web mode/)
})

test("worktree CLI usage errors point to umb merge/remove commands", () => {
  const source = readText("src/worktree-cli.ts")

  expect(source).toMatch(/Usage: umb worktree merge <name>/)
  expect(source).toMatch(/Usage: umb worktree remove <name>/)
  expect(source).not.toMatch(/Usage: gsd worktree merge <name>/)
  expect(source).not.toMatch(/Usage: gsd worktree remove <name>/)
})

test("MCP and web-mode startup diagnostics identify umb while keeping the same path coverage", () => {
  const mcpSource = readText("src/mcp-server.ts")
  const webModeSource = readText("src/web-mode.ts")

  expect(mcpSource).toMatch(/\{ name: 'umb', version \}/)
  expect(mcpSource).toMatch(/\[umb\] MCP server started \(v\$\{version\}\)/)
  expect(mcpSource).not.toMatch(/\[gsd\] MCP server started/)

  expect(webModeSource).toMatch(/\[umb\] Starting web mode…/)
  expect(webModeSource).not.toMatch(/\[gsd\] Starting web mode…/)
})

test("remaining lower-severity rename debt stays out of scope for this task and explicit in the inventory", async () => {
  const { createSecondarySurfaceInventory } = await import("../../../tests/parity/secondary-surface-inventory.ts")
  const inventory = createSecondarySurfaceInventory()
  const driftIds = inventory.rebrandDrift.map((finding: { id: string }) => finding.id)

  expect(driftIds).toEqual([
    "drift-package-docker-image",
    "drift-web-subprocess-comment",
    "drift-live-regression-install-comment",
    "drift-docker-template-test",
    "drift-packaged-web-test-fixtures",
  ])

  const severities = inventory.rebrandDrift.map((finding: { severity: string }) => finding.severity)
  expect(severities.every((severity: string) => severity === "medium" || severity === "low")).toBe(true)
})
