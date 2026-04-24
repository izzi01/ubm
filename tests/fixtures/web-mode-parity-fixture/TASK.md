# Web-mode parity fixture

This fixture defines the deterministic operator path that the web-mode parity lane must prove.

## Acceptance contract

- Start web mode scoped to `dev-root/alpha-app` and preserve that cwd as the active project context.
- Discover `alpha-app` and `beta-app` from the tracked `dev-root` without depending on external services.
- Support switching or equivalent project retargeting from `alpha-app` to `beta-app` using the existing web project-selection surfaces.
- Expose a browser-visible success condition using shipped UI selectors rather than inferred internal state.

## Required observables

- Launch readiness emits the normal `[gsd] Web mode startup: status=started ...` line and a `Ready → http://.../#token=...` URL.
- The browser shell exposes the active project path at `data-testid="workspace-project-cwd"`.
- The sidebar exposes the active milestone/slice/task scope at `data-testid="sidebar-current-scope"`.
- The status bar exposes the current unit at `data-testid="status-bar-unit"`.
- The project picker / project-selection surfaces remain available for operator-driven context switching.

## Files to inspect before implementing the lane

- `package.json` — anchors the fixture as a dependency-free tracked artifact.
- `../web-mode-parity-manifest.json` — records the startup project, switch project, scopes, and expected observables.
- `dev-root/alpha-app/package.json` — identifies the startup target project.
- `dev-root/beta-app/package.json` — identifies the switch target project.

## Verification target for downstream web-mode parity lane

- Launch against `alpha-app`.
- Verify the browser-visible scope and current project path for `alpha-app`.
- Discover both tracked projects from `dev-root`.
- Switch or retarget to `beta-app` and verify the browser-visible project path updates accordingly.
