/**
 * GSD Database schema definition.
 *
 * All DDL statements for creating the GSD SQLite database.
 * Tables use TEXT primary keys (human-readable IDs like M001, S01, T01).
 * Timestamps stored as ISO-8601 strings for readability.
 * JSON-heavy fields stored as TEXT (SQLite has native JSON but TEXT is simpler
 * for our use case and avoids type affinity issues).
 */

// ─── Milestones ────────────────────────────────────────────────────────────

const CREATE_MILESTONES = `
CREATE TABLE IF NOT EXISTS milestones (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  vision        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active', 'completed', 'validated', 'deferred')),
  depends_on    TEXT,
  success_criteria TEXT,
  key_risks     TEXT,
  proof_strategy TEXT,
  verification_contract TEXT,
  verification_integration TEXT,
  verification_operational TEXT,
  verification_uat TEXT,
  definition_of_done TEXT,
  requirement_coverage TEXT,
  boundary_map_markdown TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CREATE_MILESTONES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
`;

// ─── Slices ────────────────────────────────────────────────────────────────

const CREATE_SLICES = `
CREATE TABLE IF NOT EXISTS slices (
  id            TEXT PRIMARY KEY,
  milestone_id  TEXT NOT NULL,
  title         TEXT NOT NULL,
  goal          TEXT NOT NULL DEFAULT '',
  risk          TEXT NOT NULL DEFAULT 'medium'
                CHECK(risk IN ('low', 'medium', 'high')),
  depends       TEXT,
  demo          TEXT,
  success_criteria TEXT,
  proof_level   TEXT NOT NULL DEFAULT 'demo'
                CHECK(proof_level IN ('demo', 'test', 'contract', 'production')),
  integration_closure TEXT,
  observability_impact TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'active', 'complete', 'skipped')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);
`;

const CREATE_SLICES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_slices_milestone_id ON slices(milestone_id);
CREATE INDEX IF NOT EXISTS idx_slices_status ON slices(status);
`;

// ─── Tasks ─────────────────────────────────────────────────────────────────

const CREATE_TASKS = `
CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  slice_id      TEXT NOT NULL,
  milestone_id  TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  estimate      TEXT,
  files         TEXT,
  verify        TEXT,
  inputs        TEXT,
  expected_output TEXT,
  observability_impact TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'active', 'complete')),
  one_liner     TEXT,
  narrative     TEXT,
  verification  TEXT,
  verification_evidence TEXT,
  deviations    TEXT,
  known_issues  TEXT,
  key_files     TEXT,
  key_decisions TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (slice_id) REFERENCES slices(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);
`;

const CREATE_TASKS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_tasks_slice_id ON tasks(slice_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`;

// ─── Requirements ──────────────────────────────────────────────────────────

const CREATE_REQUIREMENTS = `
CREATE TABLE IF NOT EXISTS requirements (
  id            TEXT PRIMARY KEY,
  class         TEXT NOT NULL
                CHECK(class IN ('functional', 'non-functional', 'operational')),
  description   TEXT NOT NULL,
  why           TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active', 'validated', 'deferred', 'invalidated')),
  validation    TEXT,
  notes         TEXT,
  primary_owner TEXT,
  supporting_slices TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CREATE_REQUIREMENTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_class ON requirements(class);
`;

// ─── Decisions ─────────────────────────────────────────────────────────────

const CREATE_DECISIONS = `
CREATE TABLE IF NOT EXISTS decisions (
  id            TEXT PRIMARY KEY,
  scope         TEXT NOT NULL,
  decision      TEXT NOT NULL,
  choice        TEXT NOT NULL,
  rationale     TEXT NOT NULL DEFAULT '',
  revisable     INTEGER NOT NULL DEFAULT 1,
  when_context  TEXT,
  made_by       TEXT NOT NULL DEFAULT 'agent'
                CHECK(made_by IN ('human', 'agent', 'collaborative')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CREATE_DECISIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_decisions_scope ON decisions(scope);
`;

// ─── Aggregate ─────────────────────────────────────────────────────────────

/** All DDL statements, executed in order to set up a fresh GSD database. */
export const ALL_DDL = [
  // Tables first (order matters for FK references)
  CREATE_MILESTONES,
  CREATE_SLICES,
  CREATE_TASKS,
  CREATE_REQUIREMENTS,
  CREATE_DECISIONS,
  // Indexes after tables
  CREATE_MILESTONES_INDEXES,
  CREATE_SLICES_INDEXES,
  CREATE_TASKS_INDEXES,
  CREATE_REQUIREMENTS_INDEXES,
  CREATE_DECISIONS_INDEXES,
];

/**
 * Execute all DDL statements inside a transaction.
 * Safe to call on an already-initialized database (IF NOT EXISTS).
 */
export function initializeSchema(db: { exec(sql: string): void }): void {
  db.exec("PRAGMA foreign_keys = ON;");
  for (const ddl of ALL_DDL) {
    db.exec(ddl);
  }
}
