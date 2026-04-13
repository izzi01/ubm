/**
 * BMAD Pipeline Executor
 *
 * Executes a pipeline definition by running each stage sequentially,
 * accumulating context between stages, and tracking results.
 */

import type {
  PipelineDefinition,
  PipelineResult,
  PipelineStageResult,
  SessionFactory,
} from './types.js';
import {
  loadBmadSkill,
  resolveBmadConfig,
  composeExecutionPrompt,
} from '../bmad-executor/loader.js';

/**
 * Execute a pipeline sequentially, stage by stage.
 *
 * For each stage:
 * 1. If dryRun, mark as completed and continue (no session created).
 * 2. Load the skill via loadBmadSkill. If not found, skip (optional) or fail (required).
 * 3. Compose a prompt from the skill, config, user message + accumulated context.
 * 4. Call the session factory to create and run a session.
 * 5. If the session is cancelled or errors, fail the pipeline (skip if optional).
 * 6. Append the stage's description to the accumulated context for subsequent stages.
 *
 * @param pipeline - The pipeline definition to execute.
 * @param userMessage - The user's original task description.
 * @param cwd - The project working directory.
 * @param sessionFactory - Factory to create sessions for each stage.
 * @param opts - Execution options.
 */
export async function runPipeline(
  pipeline: PipelineDefinition,
  userMessage: string,
  cwd: string,
  sessionFactory: SessionFactory,
  opts?: { dryRun?: boolean },
): Promise<PipelineResult> {
  const dryRun = opts?.dryRun ?? false;

  // Resolve config once at the start
  const config = resolveBmadConfig(cwd);

  const completedStages: PipelineStageResult[] = [];
  const skippedStages: string[] = [];
  let accumulatedContext = '';
  let status: PipelineResult['status'] = 'completed';

  for (const stage of pipeline.stages) {
    // DryRun mode — mark every stage as completed without executing
    if (dryRun) {
      completedStages.push({ stage, status: 'completed' });
      continue;
    }

    // Load the skill
    const skill = loadBmadSkill(stage.skill, cwd);

    if (!skill) {
      if (stage.optional) {
        skippedStages.push(stage.skill);
        continue;
      }
      // Required skill missing — fail pipeline
      completedStages.push({
        stage,
        status: 'failed',
        error: `Skill not found: ${stage.skill}`,
      });
      status = 'failed';
      break;
    }

    // Compose the prompt with accumulated context
    const fullMessage = accumulatedContext
      ? `${userMessage}\n\n## Previous Pipeline Stages Completed\n\n${accumulatedContext}`
      : userMessage;
    const prompt = composeExecutionPrompt(skill, config, fullMessage);

    // Execute via session factory
    try {
      const result = await sessionFactory(prompt, stage.skill);

      if (result.cancelled) {
        const failResult: PipelineStageResult = {
          stage,
          status: 'failed',
          error: `Session cancelled for ${stage.skill}`,
        };
        if (stage.optional) {
          skippedStages.push(stage.skill);
        } else {
          completedStages.push(failResult);
          status = 'failed';
          break;
        }
        continue;
      }

      if (result.error) {
        const failResult: PipelineStageResult = {
          stage,
          status: 'failed',
          error: result.error,
        };
        if (stage.optional) {
          skippedStages.push(stage.skill);
        } else {
          completedStages.push(failResult);
          status = 'failed';
          break;
        }
        continue;
      }

      // Stage completed successfully
      completedStages.push({ stage, status: 'completed' });
      accumulatedContext += `## Completed: ${stage.skill}\n${stage.description}\n\n`;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      const failResult: PipelineStageResult = {
        stage,
        status: 'failed',
        error: errorMessage,
      };
      if (stage.optional) {
        skippedStages.push(stage.skill);
      } else {
        completedStages.push(failResult);
        status = 'failed';
        break;
      }
    }
  }

  // Determine final status
  if (status === 'completed' && skippedStages.length > 0) {
    status = 'partial';
  }

  return {
    pipeline,
    completedStages,
    skippedStages,
    status,
  };
}
