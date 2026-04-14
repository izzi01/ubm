# M001: Extension Scaffold + GSD State Machine + Approval Gates

## Vision
Build the first working version of the Umbrella Blade coding terminal as a pi-mono extension. This milestone delivers: (1) a loadable pi-mono extension with two-file loader pattern, (2) GSD state machine with SQLite persistence, (3) approval gates inspired by OpenAgentsControl, (4) pattern control with ContextScout, (5) GSD tools registered as LLM-callable tools, (6) per-phase model configuration, and (7) integration tests proving it all works.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Extension Scaffold + DB Layer | low | — | ✅ | After this: extension loads in pi-mono, SQLite tables created, DB queries work |
| S02 | GSD State Machine + Approval Gates | high | — | ✅ | After this: state machine cycles through plan→execute→verify→complete, approval gates fire at configured boundaries |
| S03 | GSD Tools + Commands + Pattern Control | medium | — | ✅ | After this: /gsd plan creates milestones, /gsd auto executes, ContextScout loads patterns, /bmad commands delegate to BMAD agents |
| S04 | Dashboard UI + Integration Tests | medium | — | ✅ | After this: pi-tui dashboard shows milestone progress, all integration tests pass, full BMAD→GSD pipeline works end-to-end |
