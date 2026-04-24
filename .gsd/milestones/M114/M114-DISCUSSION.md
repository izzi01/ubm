# M114 Discussion Log

## Exchange — 2026-04-23T01:32:39.905Z

### Parity

Which parity target should M114 own?

- **Core loop + packaged (Recommended)** — Prove umb can do real software work in a repo, both from source and from the installed umb binary.
- **Core loop only** — Prove the software-making loop works in the repo, but skip installed-binary parity for now.
- **Broad gsd2 parity** — Treat M114 as a wide product audit covering many gsd2 surfaces, not just the core coding loop.

**Selected:** Core loop + packaged (Recommended)

---
## Exchange — 2026-04-23T01:40:06.332Z

### Proof Mode

What should be the main proof architecture for M114?

- **Deterministic + live spot-check (Recommended)** — Use a stable fixture repo for the core parity proof, plus one smaller live-model acceptance check.
- **Fully deterministic only** — Avoid live-model dependence entirely and prove only tool/runtime parity with fixtures.
- **Live-model primary** — Make the main proof a real model-backed coding task, accepting more flake and setup cost.

**Selected:** Deterministic + live spot-check (Recommended)

### Fixture

What kind of coding task should the parity fixture prove?

- **Small web task (Recommended)** — Use a tiny app where umb must edit code, run tests/dev server, and verify behavior, including browser checks if needed.
- **CLI/library task** — Use a smaller code-only fixture without browser or dev-server flows.
- **Dual fixtures** — Use one code-only fixture and one web fixture for broader coverage.

**Selected:** Small web task (Recommended)

---
## Exchange — 2026-04-23T01:47:37.173Z

### Errors

We can go deep on failure modes, or I can apply sensible defaults for M114. Which do you want?

- **Use defaults (Recommended)** — Apply practical defaults for smoke/UAT failures, skip rules, and parity diagnostics without a long failure-mode design pass.
- **Go deep** — Explicitly design failure modes, retry/timeout behavior, and what evidence each lane must preserve on failure.

**Selected:** Use defaults (Recommended)

---
## Exchange — 2026-04-23T01:49:33.459Z

### Quality

What quality bar should block M114 completion?

- **Strict parity gate (Recommended)** — M114 is done only when repo mode and installed umb mode both pass the core-loop parity suite, with live checks optional but clean.
- **Medium gate** — Require the deterministic parity suite only; packaged parity and UAT can be partial.
- **Broad but softer** — Cover more surfaces, but allow known gaps and partial passes if documented.

**Selected:** Strict parity gate (Recommended)

---
## Exchange — 2026-04-23T01:52:13.938Z

### Depth Check

Did I capture the depth right?

- **Yes, you got it (Recommended)** — The milestone framing, parity target, and quality bar match what I want.
- **Not quite — let me clarify** — Something important about the goal, proof, or boundaries is still off.

**Selected:** Yes, you got it (Recommended)

---
