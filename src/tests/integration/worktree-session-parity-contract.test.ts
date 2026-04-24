import { test, expect } from "vitest"
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

  expect(manifest.version).toBe(1)
  expect(manifest.surfaceId).toBe("worktree-session-recovery")
  expect(manifest.goal).toMatch(/branchless worktree\/session\/recovery parity/i)
  expect(manifest.requiredContracts.worktreeSession).toHaveLength(6)
  expect(manifest.requiredContracts.operatorHelp).toHaveLength(3)

  expect(manifest.requiredContracts.worktreeSession.map((entry) => entry.id)).toEqual([
    "branchless-worktree-create",
    "branchless-worktree-merge",
    "stale-worktree-cwd-escape",
    "stale-runtime-unit-cleanup",
    "headless-resume-resolution",
    "recovery-remediation-guidance",
  ])
})

test("worktree/session parity contract pins the current branchless lifecycle and resume/recovery exports", () => {
  const manifest = loadManifest()

  for (const entry of manifest.requiredContracts.worktreeSession) {
    const source = readText(entry.path)
    expect(source).toMatch(new RegExp(`export function ${entry.symbol}\\s*\\(`))
    expect(entry.status).toBe("covered")
  }
})

test("worktree/session parity contract keeps operator help branded as umb while lifecycle wording stays visible", () => {
  const manifest = loadManifest()

  for (const entry of manifest.requiredContracts.operatorHelp) {
    const source = readText(entry.path)
    expect(source).toMatch(new RegExp(escapeRegExp(entry.match)))
    expect(entry.status).toBe("covered")
  }

  const helpTextSource = readText("src/help-text.ts")
  expect(helpTextSource).not.toMatch(/Usage: gsd sessions/)
  expect(helpTextSource).not.toMatch(/Usage: gsd worktree <command> \[args\]/)
  expect(helpTextSource).toMatch(/umb -w\s+Auto-name a new worktree, or resume the only active one/)
  expect(helpTextSource).toMatch(/umb worktree merge auth-refactor\s+Merge and clean up/)
})
