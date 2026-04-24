import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createSecondarySurfaceInventory } from "../../../tests/parity/secondary-surface-inventory.ts"

const repoRoot = process.cwd()

function readText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

type RebrandManifest = {
  rebrandDrift: Array<{ id: string; path: string; match: string; line: number; status: string }>
}

function loadManifest(): RebrandManifest {
  return JSON.parse(readText("tests/fixtures/worktree-session-parity-manifest.json")) as RebrandManifest
}

function lineNumberFor(source: string, needle: string): number {
  const lines = source.split(/\n/)
  const index = lines.findIndex((line) => line.includes(needle))
  return index === -1 ? -1 : index + 1
}

test("rebrand drift contract keeps the remaining worktree/session operator drift explicit and scoped", () => {
  const manifest = loadManifest()

  assert.deepEqual(
    manifest.rebrandDrift.map((entry) => entry.id),
    [
      "drift-cli-warning-prefix",
      "drift-cli-noninteractive-guidance",
      "drift-cli-web-guidance",
      "drift-worktree-usage-merge",
      "drift-worktree-usage-remove",
    ],
  )

  for (const entry of manifest.rebrandDrift) {
    assert.equal(entry.status, "expected-drift")
  }
})

test("rebrand drift contract matches the tracked secondary-surface inventory findings", () => {
  const manifest = loadManifest()
  const inventory = createSecondarySurfaceInventory()
  const inventoryFindings = inventory.rebrandDrift.filter((finding) =>
    manifest.rebrandDrift.some((entry) => entry.id === finding.id),
  )

  assert.equal(inventoryFindings.length, manifest.rebrandDrift.length)
  assert.deepEqual(
    inventoryFindings.map((finding) => finding.id),
    manifest.rebrandDrift.map((entry) => entry.id),
  )

  for (const entry of manifest.rebrandDrift) {
    const inventoryFinding = inventoryFindings.find((finding) => finding.id === entry.id)
    assert.ok(inventoryFinding, `missing inventory finding for ${entry.id}`)
    assert.equal(inventoryFinding.path, entry.path)
    assert.equal(inventoryFinding.match, entry.match)
    assert.equal(inventoryFinding.line, entry.line)
  }
})

test("rebrand drift contract proves the remaining operator-visible strings still exist at the expected lines", () => {
  const manifest = loadManifest()

  for (const entry of manifest.rebrandDrift) {
    const source = readText(entry.path)
    assert.match(source, new RegExp(entry.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.equal(lineNumberFor(source, entry.match), entry.line, `${entry.id} line drifted unexpectedly`)
  }

  const helpTextSource = readText("src/help-text.ts")
  assert.match(helpTextSource, /Usage: umb sessions/)
  assert.match(helpTextSource, /Usage: umb worktree <command> \[args\]/)
})
