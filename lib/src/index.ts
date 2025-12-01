// Schema exports
export {
  type Assumption,
  type Vote,
  type Tag,
  type UserIdentity,
  type OpinionGraphDoc,
  type VoteValue,
  type VoteSummary,
  computeVoteSummary,
  createEmptyDoc,
  generateId,
} from './schema';

// Hooks exports
export { useOpinionGraph, type OpinionGraphHook } from './hooks/useOpinionGraph';
