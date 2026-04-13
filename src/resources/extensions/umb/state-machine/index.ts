/**
 * GSD State Machine — public barrel exports and engine factory.
 *
 * Re-exports all public types, the state machine, and gate manager.
 * Provides createGsdEngine() to wire everything together with a single call.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type {
  EntityType,
  AnyStatus,
  StateMachinePhase,
  TransitionResult,
  StateMachineConfig,
} from "./types.js";

export {
  MILESTONE_TRANSITIONS,
  SLICE_TRANSITIONS,
  TASK_TRANSITIONS,
  GsdStateMachineError,
} from "./types.js";

// ─── State Machine ─────────────────────────────────────────────────────────

export { GsdStateMachine } from "./state-machine.js";

// ─── Gate Manager ──────────────────────────────────────────────────────────

export {
  GsdGateManager,
  GateError,
} from "./gates.js";
export type {
  GatePolicy,
  GateTransitionType,
  GateConfig,
  GateResult,
} from "./gates.js";

// ─── Engine factory ────────────────────────────────────────────────────────

import { GsdDb } from "../db/gsd-db.js";
import { GsdStateMachine } from "./state-machine.js";
import { GsdGateManager } from "./gates.js";
import type { StateMachineConfig } from "./types.js";
import { AutoModeManager } from "../auto/auto-state.js";

/**
 * Wired GSD engine instance containing DB, state machine, gate manager,
 * and auto-mode lifecycle manager.
 */
export interface GsdEngine {
  readonly db: GsdDb;
  readonly stateMachine: GsdStateMachine;
  readonly gates: GsdGateManager;
  readonly autoMode: AutoModeManager;
}

/**
 * Create a fully wired GSD engine.
 *
 * Instantiates GsdDb, GsdStateMachine, and GsdGateManager together,
 * so consumers don't need to know the wiring details.
 *
 * @param dbPath - SQLite database path (e.g. ".gsd/gsd.db")
 * @param config - Optional state machine configuration
 */
export function createGsdEngine(
  dbPath: string,
  config?: StateMachineConfig,
): GsdEngine {
  const db = new GsdDb(dbPath);
  const stateMachine = new GsdStateMachine(db, config);
  const gates = new GsdGateManager(db, stateMachine);
  const autoMode = new AutoModeManager();

  return { db, stateMachine, gates, autoMode };
}
