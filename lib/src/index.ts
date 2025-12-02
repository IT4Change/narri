// Schema exports
export {
  type Assumption,
  type Vote,
  type Tag,
  type UserIdentity,
  type IdentityProfile,
  type OpinionGraphDoc,
  type VoteValue,
  type VoteSummary,
  type EditEntry,
  computeVoteSummary,
  createEmptyDoc,
  generateId,
} from './schema';

// Hooks exports
export { useOpinionGraph, type OpinionGraphHook } from './hooks/useOpinionGraph';

// DID utilities exports
export {
  generateKeypair,
  generateDidIdentity,
  deriveDidFromPublicKey,
  extractPublicKeyFromDid,
  isFakeDid,
  isValidDid,
  base64Encode,
  base64Decode,
  type Keypair,
  type DidIdentity,
} from './utils/did';
