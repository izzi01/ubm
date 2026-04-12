/**
 * GSD branch naming patterns — single source of truth.
 *
 * gsd/quick/<id>-<slug>               → QUICK_BRANCH_RE
 * gsd/<workflow>/<...>                 → WORKFLOW_BRANCH_RE (non-milestone gsd/ branches)
 */

/** Matches gsd/quick/ task branches */
export const QUICK_BRANCH_RE = /^gsd\/quick\//;

/** Matches gsd/ workflow branches (non-milestone, e.g. gsd/workflow-name/...) */
export const WORKFLOW_BRANCH_RE = /^gsd\/(?!M\d)[\w-]+\//;
