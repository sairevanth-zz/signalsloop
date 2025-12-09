/**
 * Self-Correcting Roadmaps - Main Export
 */

export { detectRoadmapAdjustmentTriggers } from './trigger-detection';

export {
    generateAdjustmentProposal,
    applyProposalChanges,
    rejectProposal,
    getPendingProposals
} from './proposal-generator';

export {
    TRIGGER_DETECTION_SYSTEM_PROMPT,
    PROPOSAL_GENERATION_SYSTEM_PROMPT,
    buildTriggerDetectionUserPrompt,
    buildProposalGenerationUserPrompt
} from './prompts/adjustment-prompts';
