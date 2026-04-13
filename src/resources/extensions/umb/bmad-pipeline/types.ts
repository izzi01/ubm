/**
 * BMAD Pipeline Types
 *
 * Defines the schema for pipeline definitions, stage results,
 * and execution results for the BMAD auto-analysis workflow.
 */

/**
 * A single stage in a BMAD analysis pipeline.
 */
export interface PipelineStage {
  /** Skill name to execute (e.g. 'bmad-domain-research'). */
  skill: string;
  /** Human-readable description of what this stage does. */
  description: string;
  /** Phase identifier (e.g. '1-analysis/research', '1-analysis'). */
  phase: string;
  /** Whether this stage is optional — skipped if skill not found. */
  optional: boolean;
}

/**
 * A complete pipeline definition with ordered stages.
 */
export interface PipelineDefinition {
  /** Unique pipeline identifier (e.g. 'analysis'). */
  id: string;
  /** Human-readable pipeline name. */
  name: string;
  /** Pipeline description. */
  description: string;
  /** Ordered list of stages to execute. */
  stages: PipelineStage[];
}

/**
 * Result from executing a single pipeline stage.
 */
export interface PipelineStageResult {
  /** The stage definition. */
  stage: PipelineStage;
  /** Execution status. */
  status: 'completed' | 'skipped' | 'failed';
  /** Error message if status is 'failed'. */
  error?: string;
}

/**
 * Overall result from executing a pipeline.
 */
export interface PipelineResult {
  /** The pipeline that was executed. */
  pipeline: PipelineDefinition;
  /** Stages that completed successfully. */
  completedStages: PipelineStageResult[];
  /** Names of stages that were skipped. */
  skippedStages: string[];
  /** Overall pipeline status. */
  status: 'completed' | 'partial' | 'failed';
}

/**
 * Factory function for creating sessions — provided by the command layer.
 */
export type SessionFactory = (
  prompt: string,
  skillName: string,
) => Promise<{ cancelled: boolean; error?: string }>;
