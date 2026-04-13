/**
 * GSD Database type definitions.
 *
 * These interfaces mirror the SQLite schema in schema.ts.
 * All row types use camelCase fields; column mapping happens in query helpers.
 */

// ─── Milestones ────────────────────────────────────────────────────────────

export interface MilestoneRow {
  id: string;
  title: string;
  vision: string;
  status: MilestoneStatus;
  dependsOn: string | null;
  successCriteria: string | null;
  keyRisks: string | null;
  proofStrategy: string | null;
  verificationContract: string | null;
  verificationIntegration: string | null;
  verificationOperational: string | null;
  verificationUat: string | null;
  definitionOfDone: string | null;
  requirementCoverage: string | null;
  boundaryMapMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneStatus =
  | "active"
  | "completed"
  | "validated"
  | "deferred";

// ─── Slices ────────────────────────────────────────────────────────────────

export interface SliceRow {
  id: string;
  milestoneId: string;
  title: string;
  goal: string;
  risk: SliceRisk;
  depends: string | null;
  demo: string | null;
  successCriteria: string | null;
  proofLevel: ProofLevel;
  integrationClosure: string | null;
  observabilityImpact: string | null;
  status: SliceStatus;
  createdAt: string;
  updatedAt: string;
}

export type SliceRisk = "low" | "medium" | "high";
export type ProofLevel = "demo" | "test" | "contract" | "production";
export type SliceStatus =
  | "pending"
  | "active"
  | "complete"
  | "skipped";

// ─── Tasks ─────────────────────────────────────────────────────────────────

export interface TaskRow {
  id: string;
  sliceId: string;
  milestoneId: string;
  title: string;
  description: string | null;
  estimate: string | null;
  files: string | null;
  verify: string | null;
  inputs: string | null;
  expectedOutput: string | null;
  observabilityImpact: string | null;
  status: TaskStatus;
  oneLiner: string | null;
  narrative: string | null;
  verification: string | null;
  verificationEvidence: string | null;
  deviations: string | null;
  knownIssues: string | null;
  keyFiles: string | null;
  keyDecisions: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus =
  | "pending"
  | "active"
  | "complete";

// ─── Requirements ──────────────────────────────────────────────────────────

export interface RequirementRow {
  id: string;
  class: RequirementClass;
  description: string;
  why: string;
  source: string;
  status: RequirementStatus;
  validation: string | null;
  notes: string | null;
  primaryOwner: string | null;
  supportingSlices: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RequirementClass =
  | "functional"
  | "non-functional"
  | "operational";
export type RequirementStatus =
  | "active"
  | "validated"
  | "deferred"
  | "invalidated";

// ─── Decisions ─────────────────────────────────────────────────────────────

export interface DecisionRow {
  id: string;
  scope: string;
  decision: string;
  choice: string;
  rationale: string;
  revisable: number; // SQLite boolean (0/1)
  whenContext: string | null;
  madeBy: DecisionMaker;
  createdAt: string;
  updatedAt: string;
}

export type DecisionMaker = "human" | "agent" | "collaborative";

// ─── Input types (for insert/update, omitting auto-generated fields) ───────

export type MilestoneInput = Omit<
  MilestoneRow,
  "createdAt" | "updatedAt"
>;
export type SliceInput = Omit<SliceRow, "createdAt" | "updatedAt">;
export type TaskInput = Omit<TaskRow, "createdAt" | "updatedAt">;
export type RequirementInput = Omit<RequirementRow, "createdAt" | "updatedAt">;
export type DecisionInput = Omit<DecisionRow, "createdAt" | "updatedAt">;
