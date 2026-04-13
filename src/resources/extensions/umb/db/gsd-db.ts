/**
 * GSD Database — typed query helpers backed by better-sqlite3.
 *
 * Usage:
 *   import { GsdDb } from "./gsd-db.js";
 *   const db = new GsdDb(":memory:");
 *   db.milestoneInsert({ id: "M001", title: "...", ... });
 *
 * Connection is lazy — SQLite file is created on first use.
 * Call db.close() to release the handle.
 */

import BetterSqlite3 from "better-sqlite3";
import { initializeSchema } from "./schema.js";
import type {
  MilestoneRow,
  MilestoneInput,
  SliceRow,
  SliceInput,
  TaskRow,
  TaskInput,
  RequirementRow,
  RequirementInput,
  DecisionRow,
  DecisionInput,
} from "./types.js";

type DatabaseInstance = BetterSqlite3.Database;

// ─── Snake_case ↔ camelCase helpers ────────────────────────────────────────

/** Convert camelCase object keys to snake_case for SQLite columns. */
function toSnake<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = value;
  }
  return out;
}

/** Convert snake_case object keys to camelCase for TypeScript interfaces. */
function toCamel<T>(row: Record<string, unknown>): T {
  const out = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out as T;
}

// ─── GsdDb class ───────────────────────────────────────────────────────────

export class GsdDb {
  private _db: DatabaseInstance | null = null;

  constructor(private readonly dbPath: string) {}

  /** Get or create the underlying SQLite connection. */
  private get db(): DatabaseInstance {
    if (!this._db) {
      this._db = new BetterSqlite3(this.dbPath);
      initializeSchema(this._db);
    }
    return this._db;
  }

  /** Close the database connection. */
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  /** Run an arbitrary SQL statement (for migrations, diagnostics, etc.). */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  // ─── Milestones ─────────────────────────────────────────────────────────

  milestoneInsert(input: MilestoneInput): MilestoneRow {
    const snake = toSnake(input);
    this.db.prepare(
      `INSERT INTO milestones (id, title, vision, status, depends_on,
        success_criteria, key_risks, proof_strategy, verification_contract,
        verification_integration, verification_operational, verification_uat,
        definition_of_done, requirement_coverage, boundary_map_markdown)
       VALUES (@id, @title, @vision, @status, @depends_on,
        @success_criteria, @key_risks, @proof_strategy, @verification_contract,
        @verification_integration, @verification_operational, @verification_uat,
        @definition_of_done, @requirement_coverage, @boundary_map_markdown)`,
    ).run(snake);
    return this.milestoneGet(input.id)!;
  }

  milestoneGet(id: string): MilestoneRow | undefined {
    const row = this.db
      .prepare("SELECT * FROM milestones WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? toCamel<MilestoneRow>(row) : undefined;
  }

  milestoneGetAll(): MilestoneRow[] {
    const rows = this.db
      .prepare("SELECT * FROM milestones ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map((r) => toCamel<MilestoneRow>(r));
  }

  milestoneUpdate(
    id: string,
    patch: Partial<MilestoneInput>,
  ): MilestoneRow | undefined {
    const fields = Object.keys(toSnake(patch));
    if (fields.length === 0) return this.milestoneGet(id);

    const sets = fields.map((f) => `${f} = @${f}`).join(", ");
    const snake = toSnake(patch);
    snake.id = id;

    this.db.prepare(
      `UPDATE milestones SET ${sets}, updated_at = datetime('now') WHERE id = @id`,
    ).run(snake);

    return this.milestoneGet(id);
  }

  milestoneDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM milestones WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // ─── Slices ─────────────────────────────────────────────────────────────

  sliceInsert(input: SliceInput): SliceRow {
    const snake = toSnake(input);
    this.db.prepare(
      `INSERT INTO slices (id, milestone_id, title, goal, risk, depends,
        demo, success_criteria, proof_level, integration_closure,
        observability_impact, status)
       VALUES (@id, @milestone_id, @title, @goal, @risk, @depends,
        @demo, @success_criteria, @proof_level, @integration_closure,
        @observability_impact, @status)`,
    ).run(snake);
    return this.sliceGet(input.id)!;
  }

  sliceGet(id: string): SliceRow | undefined {
    const row = this.db
      .prepare("SELECT * FROM slices WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? toCamel<SliceRow>(row) : undefined;
  }

  sliceGetByMilestone(milestoneId: string): SliceRow[] {
    const rows = this.db
      .prepare("SELECT * FROM slices WHERE milestone_id = ? ORDER BY created_at")
      .all(milestoneId) as Record<string, unknown>[];
    return rows.map((r) => toCamel<SliceRow>(r));
  }

  sliceGetAll(): SliceRow[] {
    const rows = this.db
      .prepare("SELECT * FROM slices ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map((r) => toCamel<SliceRow>(r));
  }

  sliceUpdate(
    id: string,
    patch: Partial<SliceInput>,
  ): SliceRow | undefined {
    const fields = Object.keys(toSnake(patch));
    if (fields.length === 0) return this.sliceGet(id);

    const sets = fields.map((f) => `${f} = @${f}`).join(", ");
    const snake = toSnake(patch);
    snake.id = id;

    this.db.prepare(
      `UPDATE slices SET ${sets}, updated_at = datetime('now') WHERE id = @id`,
    ).run(snake);

    return this.sliceGet(id);
  }

  sliceDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM slices WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // ─── Tasks ──────────────────────────────────────────────────────────────

  taskInsert(input: TaskInput): TaskRow {
    const snake = toSnake(input);
    this.db.prepare(
      `INSERT INTO tasks (id, slice_id, milestone_id, title, description,
        estimate, files, verify, inputs, expected_output, observability_impact,
        status, one_liner, narrative, verification, verification_evidence,
        deviations, known_issues, key_files, key_decisions, completed_at)
       VALUES (@id, @slice_id, @milestone_id, @title, @description,
        @estimate, @files, @verify, @inputs, @expected_output,
        @observability_impact, @status, @one_liner, @narrative,
        @verification, @verification_evidence, @deviations, @known_issues,
        @key_files, @key_decisions, @completed_at)`,
    ).run(snake);
    return this.taskGet(input.id)!;
  }

  taskGet(id: string): TaskRow | undefined {
    const row = this.db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? toCamel<TaskRow>(row) : undefined;
  }

  taskGetBySlice(sliceId: string): TaskRow[] {
    const rows = this.db
      .prepare("SELECT * FROM tasks WHERE slice_id = ? ORDER BY created_at")
      .all(sliceId) as Record<string, unknown>[];
    return rows.map((r) => toCamel<TaskRow>(r));
  }

  taskGetByMilestone(milestoneId: string): TaskRow[] {
    const rows = this.db
      .prepare("SELECT * FROM tasks WHERE milestone_id = ? ORDER BY created_at")
      .all(milestoneId) as Record<string, unknown>[];
    return rows.map((r) => toCamel<TaskRow>(r));
  }

  taskGetAll(): TaskRow[] {
    const rows = this.db
      .prepare("SELECT * FROM tasks ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map((r) => toCamel<TaskRow>(r));
  }

  taskUpdate(
    id: string,
    patch: Partial<TaskInput>,
  ): TaskRow | undefined {
    const fields = Object.keys(toSnake(patch));
    if (fields.length === 0) return this.taskGet(id);

    const sets = fields.map((f) => `${f} = @${f}`).join(", ");
    const snake = toSnake(patch);
    snake.id = id;

    this.db.prepare(
      `UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = @id`,
    ).run(snake);

    return this.taskGet(id);
  }

  taskDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM tasks WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // ─── Requirements ───────────────────────────────────────────────────────

  requirementInsert(input: RequirementInput): RequirementRow {
    const snake = toSnake(input);
    this.db.prepare(
      `INSERT INTO requirements (id, class, description, why, source, status,
        validation, notes, primary_owner, supporting_slices)
       VALUES (@id, @class, @description, @why, @source, @status,
        @validation, @notes, @primary_owner, @supporting_slices)`,
    ).run(snake);
    return this.requirementGet(input.id)!;
  }

  requirementGet(id: string): RequirementRow | undefined {
    const row = this.db
      .prepare("SELECT * FROM requirements WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? toCamel<RequirementRow>(row) : undefined;
  }

  requirementGetAll(): RequirementRow[] {
    const rows = this.db
      .prepare("SELECT * FROM requirements ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map((r) => toCamel<RequirementRow>(r));
  }

  requirementUpdate(
    id: string,
    patch: Partial<RequirementInput>,
  ): RequirementRow | undefined {
    const fields = Object.keys(toSnake(patch));
    if (fields.length === 0) return this.requirementGet(id);

    const sets = fields.map((f) => `${f} = @${f}`).join(", ");
    const snake = toSnake(patch);
    snake.id = id;

    this.db.prepare(
      `UPDATE requirements SET ${sets}, updated_at = datetime('now') WHERE id = @id`,
    ).run(snake);

    return this.requirementGet(id);
  }

  requirementDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM requirements WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // ─── Decisions ──────────────────────────────────────────────────────────

  decisionInsert(input: DecisionInput): DecisionRow {
    const snake = toSnake(input);
    this.db.prepare(
      `INSERT INTO decisions (id, scope, decision, choice, rationale, revisable,
        when_context, made_by)
       VALUES (@id, @scope, @decision, @choice, @rationale, @revisable,
        @when_context, @made_by)`,
    ).run(snake);
    return this.decisionGet(input.id)!;
  }

  decisionGet(id: string): DecisionRow | undefined {
    const row = this.db
      .prepare("SELECT * FROM decisions WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? toCamel<DecisionRow>(row) : undefined;
  }

  decisionGetAll(): DecisionRow[] {
    const rows = this.db
      .prepare("SELECT * FROM decisions ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map((r) => toCamel<DecisionRow>(r));
  }

  decisionUpdate(
    id: string,
    patch: Partial<DecisionInput>,
  ): DecisionRow | undefined {
    const fields = Object.keys(toSnake(patch));
    if (fields.length === 0) return this.decisionGet(id);

    const sets = fields.map((f) => `${f} = @${f}`).join(", ");
    const snake = toSnake(patch);
    snake.id = id;

    this.db.prepare(
      `UPDATE decisions SET ${sets}, updated_at = datetime('now') WHERE id = @id`,
    ).run(snake);

    return this.decisionGet(id);
  }

  decisionDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM decisions WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}
