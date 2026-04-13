/**
 * BMAD Pipeline Definitions
 *
 * Defines all available analysis pipelines and lookup helpers.
 */

import type { PipelineDefinition } from './types.js';

/**
 * Phase 1 Analysis Pipeline — sequential research → brief → prfaq → document.
 */
export const ANALYSIS_PIPELINE: PipelineDefinition = {
  id: 'analysis',
  name: 'Phase 1 Analysis',
  description:
    'Run the full Phase 1 BMAD analysis: domain research, market research, technical research, product brief, PRFAQ, and project documentation.',
  stages: [
    {
      skill: 'bmad-domain-research',
      description: 'Research the domain landscape, terminology, and key concepts',
      phase: '1-analysis/research',
      optional: false,
    },
    {
      skill: 'bmad-market-research',
      description: 'Analyze market positioning, competitors, and target users',
      phase: '1-analysis/research',
      optional: false,
    },
    {
      skill: 'bmad-technical-research',
      description: 'Investigate technical feasibility, architecture options, and tech stack',
      phase: '1-analysis/research',
      optional: false,
    },
    {
      skill: 'bmad-product-brief',
      description: 'Synthesize research into a product brief',
      phase: '1-analysis',
      optional: false,
    },
    {
      skill: 'bmad-prfaq',
      description: 'Generate press release and FAQ for the product',
      phase: '1-analysis',
      optional: true,
    },
    {
      skill: 'bmad-document-project',
      description: 'Document the project structure and output locations',
      phase: '1-analysis',
      optional: false,
    },
  ],
};

/**
 * Phase 2 Planning Pipeline — sequential prd → ux-design.
 */
export const PLANNING_PIPELINE: PipelineDefinition = {
  id: 'planning',
  name: 'Phase 2 Planning',
  description:
    'Run the Phase 2 BMAD planning workflows: create a product requirements document and UX design specifications based on Phase 1 research.',
  stages: [
    {
      skill: 'bmad-create-prd',
      description: 'Create a product requirements document from Phase 1 research',
      phase: '2-plan-workflows',
      optional: false,
    },
    {
      skill: 'bmad-create-ux-design',
      description: 'Plan UX patterns and design specifications based on the PRD',
      phase: '2-plan-workflows',
      optional: false,
    },
  ],
};

/**
 * Phase 3 Solutioning Pipeline — sequential create-architecture → create-epics-and-stories → check-implementation-readiness.
 */
export const SOLUTIONING_PIPELINE: PipelineDefinition = {
  id: 'solutioning',
  name: 'Phase 3 Solutioning',
  description:
    'Run the Phase 3 BMAD solutioning workflows: create system architecture, generate epics and stories, and verify implementation readiness.',
  stages: [
    {
      skill: 'bmad-create-architecture',
      description: 'Design system architecture based on Phase 1 research and Phase 2 planning',
      phase: '3-solutioning',
      optional: false,
    },
    {
      skill: 'bmad-create-epics-and-stories',
      description: 'Generate epics and user stories from the architecture and PRD',
      phase: '3-solutioning',
      optional: false,
    },
    {
      skill: 'bmad-check-implementation-readiness',
      description: 'Verify implementation readiness of epics and stories',
      phase: '3-solutioning',
      optional: false,
    },
  ],
};

/**
 * Phase 4 Implementation Pipeline — sequential sprint-planning → create-story → dev-story → code-review.
 */
export const IMPLEMENTATION_PIPELINE: PipelineDefinition = {
  id: 'implementation',
  name: 'Phase 4 Implementation',
  description:
    'Run the Phase 4 BMAD implementation workflows: sprint planning, story creation, development, and code review.',
  stages: [
    {
      skill: 'bmad-sprint-planning',
      description: 'Plan the sprint scope and prioritize stories for development',
      phase: '4-implementation',
      optional: false,
    },
    {
      skill: 'bmad-create-story',
      description: 'Create a development story from sprint backlog',
      phase: '4-implementation',
      optional: false,
    },
    {
      skill: 'bmad-dev-story',
      description: 'Develop and implement the story',
      phase: '4-implementation',
      optional: false,
    },
    {
      skill: 'bmad-code-review',
      description: 'Review the implemented code against requirements',
      phase: '4-implementation',
      optional: false,
    },
  ],
};

/** All registered pipelines. */
const PIPELINES: PipelineDefinition[] = [ANALYSIS_PIPELINE, PLANNING_PIPELINE, SOLUTIONING_PIPELINE, IMPLEMENTATION_PIPELINE];

/**
 * Look up a pipeline by its id.
 *
 * @param id - Pipeline identifier (e.g. 'analysis').
 * @returns The pipeline definition, or null if not found.
 */
export function getPipeline(id: string): PipelineDefinition | null {
  return PIPELINES.find((p) => p.id === id) ?? null;
}

/**
 * List all registered pipeline definitions.
 */
export function listPipelines(): PipelineDefinition[] {
  return [...PIPELINES];
}
