# M105: Global install and final polish

## Vision
Configure npm global install, test the umb binary works from a clean PATH, verify TUI launches, config dir is created, and all commands work end-to-end. The final deliverable: `npm install -g umb-cli` gives you a working `umb` command. Depends on M104 (extension must be ported first).

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | medium | — | ✅ | npm install -g . succeeds, umb --version prints version, umb --help shows usage |
| S02 | S02 | medium | — | ✅ |  umb launches TUI, /skill list works, .umb/ config dir created on first run |
