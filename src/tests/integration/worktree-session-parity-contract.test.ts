import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()

function readText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

type Manifest = {
  version: number
  surfaceId: string
  goal: string
  requiredContracts: {
    worktreeSession: Array<{ id: string; kind: string; path: string; symbol: string; status: string }>
    operatorHelp: Array<{ id: string; kind: string; path: string; match: string; status: string }>
  }
}

function loadManifest(): Manifest {
  return JSON.parse(readText("tests/fixtures/worktree-session-parity-manifest.json")) as Manifest
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

test("worktree/session parity manifest stays scoped to the release-readable secondary surface contract", () => {
  const manifest = loadManifest()

  assert.equal(manifest.version, 1)
  assert.equal(manifest.surfaceId, "worktree-session-recovery")
  assert.match(manifest.goal, /branchless worktree\/session\/recovery parity/i)
  assert.equal(manifest.requiredContracts.worktreeSession.length, 6)
  assert.equal(manifest.requiredContracts.operatorHelp.length, 3)

  assert.deepEqual(
    manifest.requiredContracts.worktreeSession.map((entry) => entry.id),
    [
      "branchless-worktree-create",
      "branchless-worktree-merge",
      "stale-worktree-cwd-escape",
      "stale-runtime-unit-cleanup",
      "headless-resume-resolution",
      "recovery-remediation-guidance",
    ],
  )
})

test("worktree/session parity contract pins the current branchless lifecycle and resume/recovery exports", () => {
  const manifest = loadManifest()

  for (const entry of manifest.requiredContracts.worktreeSession) {
    const source = readText(entry.path)
    assert.match(
      source,
      new RegExp(`export function ${entry.symbol}\\s*\\(`),
      `${entry.path} must export ${entry.symbol} for the parity contract`,
    )
    assert.equal(entry.status, "covered")
  }
})

test("worktree/session parity contract keeps operator help branded as umb while lifecycle wording stays visible", () => {
  const manifest = loadManifest()

  for (const entry of manifest.requiredContracts.operatorHelp) {
    const source = readText(entry.path)
    assert.match(source, new RegExp(escapeRegExp(entry.match)))
    assert.equal(entry.status, "covered")
  }

  const helpTextSource = readText("src/help-text.ts")
  assert.doesNotMatch(helpTextSource, /Usage: gsd sessions/)
  assert.doesNotMatch(helpTextSource, /Usage: gsd worktree <command> \[args\]/)
  assert.match(helpTextSource, /umb -w\s+Auto-name a new worktree, or resume the only active one/)
  assert.match(helpTextSource, /umb worktree merge auth-refactor\s+Merge and clean up/)
})
