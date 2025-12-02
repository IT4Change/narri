/**
 * Narrative data schema for Automerge.
 *
 * Defines the TypeScript types for the CRDT document structure.
 * Automerge automatically handles conflict resolution and syncing.
 */

/**
 * Vote value type: green (agree), yellow (neutral), red (disagree)
 */
export type VoteValue = 'green' | 'yellow' | 'red';

/**
 * User identity (DID-based)
 * Uses real did:key with Ed25519 keypair (format: did:key:z6Mk...)
 */
export interface UserIdentity {
  did: string;          // did:key:z6Mk... (derived from Ed25519 public key)
  displayName?: string;
  avatarUrl?: string;
  publicKey?: string;   // Base64-encoded Ed25519 public key (32 bytes)
}

/**
 * Optional identity metadata by DID
 */
export interface IdentityProfile {
  displayName?: string;
  avatarUrl?: string;
  publicKey?: string;   // Base64-encoded Ed25519 public key for signature verification
}

/**
 * Tag for categorizing assumptions
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdBy: string; // DID
  createdAt: number;

  // Phase 2: Cryptographic signatures (JWS format)
  signature?: string;
  publicKey?: string;
}

/**
 * Single vote on an assumption by a user
 */
export interface Vote {
  id: string;
  assumptionId: string;
  voterDid: string;
  voterName?: string;
  value: VoteValue;
  createdAt: number;
  updatedAt: number;

  // Phase 2: Cryptographic signatures (JWS format)
  signature?: string;
  publicKey?: string;  // Unused (use lookup in doc.identities instead)
}

/**
 * Edit log entry for an assumption
 */
export interface EditEntry {
  id: string;
  assumptionId: string;
  editorDid: string;
  editorName?: string;
  type: 'create' | 'edit';
  previousSentence: string;
  newSentence: string;
  previousTags?: string[];
  newTags?: string[];
  createdAt: number;

  // Phase 2: Cryptographic signatures (JWS format)
  signature?: string;
  publicKey?: string;
}

/**
 * Core Assumption entity
 * Represents a statement (single sentence) that can be voted on
 */
export interface Assumption {
  id: string;
  sentence: string;
  createdBy: string; // DID
  creatorName?: string;
  createdAt: number;
  updatedAt: number;
  tagIds: string[];
  voteIds: string[];
  editLogIds: string[];

  // Phase 2: Cryptographic signatures (JWS format)
  signature?: string;
  publicKey?: string;
}

/**
 * Root document structure for Automerge
 * This is the top-level CRDT document
 */
export interface OpinionGraphDoc {
  // User identity (DEPRECATED: use identities map instead)
  identity?: UserIdentity;
  identities: Record<string, IdentityProfile>;
  createdBy?: string; // DID of board creator (optional for display purposes)

  // Collections (normalized by ID)
  assumptions: Record<string, Assumption>;
  votes: Record<string, Vote>;
  tags: Record<string, Tag>;
  edits: Record<string, EditEntry>;

  // Metadata
  version: string;
  lastModified: number;
}

/**
 * Helper type for vote aggregation (computed client-side)
 */
export interface VoteSummary {
  green: number;
  yellow: number;
  red: number;
  total: number;
  userVote?: VoteValue;
}

/**
 * Compute vote summary for an assumption
 */
export function computeVoteSummary(
  assumption: Assumption,
  allVotes: Record<string, Vote>,
  currentUserDid?: string
): VoteSummary {
  const summary: VoteSummary = {
    green: 0,
    yellow: 0,
    red: 0,
    total: 0,
  };

  // Get all votes for this assumption
  const assumptionVotes = assumption.voteIds
    .map((id) => allVotes[id])
    .filter((v): v is Vote => v !== undefined);

  for (const vote of assumptionVotes) {
    if (vote.value === 'green') summary.green++;
    else if (vote.value === 'yellow') summary.yellow++;
    else if (vote.value === 'red') summary.red++;

    summary.total++;

    // Track current user's vote
    if (currentUserDid && vote.voterDid === currentUserDid) {
      summary.userVote = vote.value;
    }
  }

  return summary;
}

/**
 * Create an empty Narrative document
 */
export function createEmptyDoc(identity: UserIdentity): OpinionGraphDoc {
  const identities: Record<string, IdentityProfile> = {};
  if (identity.did) {
    const profile: IdentityProfile = {};
    if (identity.displayName !== undefined) profile.displayName = identity.displayName;
    if (identity.avatarUrl !== undefined) profile.avatarUrl = identity.avatarUrl;
    if (identity.publicKey !== undefined) profile.publicKey = identity.publicKey;
    identities[identity.did] = profile;
  }

  return {
    identity, // Keep for backward compatibility with old documents
    identities,
    createdBy: identity.did, // Track board creator
    assumptions: {},
    votes: {},
    tags: {},
    edits: {},
    version: '0.1.0',
    lastModified: Date.now(),
  };
}

/**
 * Generate a simple unique ID
 * TODO: Replace with proper UUID or content-addressed ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
