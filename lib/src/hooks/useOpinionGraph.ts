import { useDocument } from '@automerge/automerge-repo-react-hooks';
import { DocHandle, DocumentId } from '@automerge/automerge-repo';
import {
  Assumption,
  OpinionGraphDoc,
  VoteValue,
  computeVoteSummary,
  generateId,
} from '../schema';

/**
 * Main hook for accessing and mutating Opinion Graph data
 * Uses Automerge CRDT for automatic conflict resolution
 */
export function useOpinionGraph(
  docId: DocumentId,
  docHandle: DocHandle<OpinionGraphDoc>,
  currentUserDid: string
) {
  const [doc] = useDocument<OpinionGraphDoc>(docId);

  if (!doc) {
    return null;
  }

  // Convert normalized data to arrays for UI
  const assumptions = Object.values(doc.assumptions);
  const tags = Object.values(doc.tags);

  /**
   * Create a new assumption
   */
  const createAssumption = (title: string, description?: string) => {
    docHandle.change((d) => {
      const id = generateId();
      const assumption: any = {
        id,
        title,
        createdBy: currentUserDid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tagIds: [],
        voteIds: [],
      };

      // Only add description if provided (Automerge doesn't allow undefined)
      if (description !== undefined && description !== '') {
        assumption.description = description;
      }

      d.assumptions[id] = assumption;
      d.lastModified = Date.now();
    });
  };

  /**
   * Update an assumption
   */
  const updateAssumption = (
    assumptionId: string,
    updates: Partial<Pick<Assumption, 'title' | 'description'>>
  ) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption) return;

      if (updates.title !== undefined) assumption.title = updates.title;
      if (updates.description !== undefined) {
        if (updates.description === '') {
          delete assumption.description;
        } else {
          assumption.description = updates.description;
        }
      }
      assumption.updatedAt = Date.now();
      d.lastModified = Date.now();
    });
  };

  /**
   * Delete an assumption
   */
  const deleteAssumption = (assumptionId: string) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption) return;

      // Delete associated votes
      assumption.voteIds.forEach((voteId) => {
        delete d.votes[voteId];
      });

      // Remove from document
      delete d.assumptions[assumptionId];
      d.lastModified = Date.now();
    });
  };

  /**
   * Set or update a vote on an assumption
   * Enforces one vote per user per assumption
   */
  const setVote = (assumptionId: string, value: VoteValue) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption) return;

      // Find existing vote by current user
      const existingVoteId = assumption.voteIds.find((voteId) => {
        const vote = d.votes[voteId];
        return vote && vote.voterDid === currentUserDid;
      });

      if (existingVoteId) {
        // Update existing vote
        const vote = d.votes[existingVoteId];
        if (vote) {
          vote.value = value;
          vote.updatedAt = Date.now();
        }
      } else {
        // Create new vote
        const voteId = generateId();
        d.votes[voteId] = {
          id: voteId,
          assumptionId,
          voterDid: currentUserDid,
          value,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        assumption.voteIds.push(voteId);
      }

      d.lastModified = Date.now();
    });
  };

  /**
   * Remove current user's vote from an assumption
   */
  const removeVote = (assumptionId: string) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption) return;

      const voteIndex = assumption.voteIds.findIndex((voteId) => {
        const vote = d.votes[voteId];
        return vote && vote.voterDid === currentUserDid;
      });

      if (voteIndex !== -1) {
        const voteId = assumption.voteIds[voteIndex];
        delete d.votes[voteId];
        assumption.voteIds.splice(voteIndex, 1);
      }

      d.lastModified = Date.now();
    });
  };

  /**
   * Create a new tag
   */
  const createTag = (name: string, color?: string): string => {
    let tagId = '';
    docHandle.change((d) => {
      tagId = generateId();
      const tag: any = {
        id: tagId,
        name,
        createdBy: currentUserDid,
        createdAt: Date.now(),
      };

      // Only add color if provided (Automerge doesn't allow undefined)
      if (color !== undefined && color !== '') {
        tag.color = color;
      }

      d.tags[tagId] = tag;
      d.lastModified = Date.now();
    });
    return tagId;
  };

  /**
   * Add tag to assumption
   */
  const addTagToAssumption = (assumptionId: string, tagId: string) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption || !d.tags[tagId]) return;

      if (!assumption.tagIds.includes(tagId)) {
        assumption.tagIds.push(tagId);
      }
      d.lastModified = Date.now();
    });
  };

  /**
   * Remove tag from assumption
   */
  const removeTagFromAssumption = (assumptionId: string, tagId: string) => {
    docHandle.change((d) => {
      const assumption = d.assumptions[assumptionId];
      if (!assumption) return;

      const index = assumption.tagIds.indexOf(tagId);
      if (index !== -1) {
        assumption.tagIds.splice(index, 1);
      }
      d.lastModified = Date.now();
    });
  };

  /**
   * Get vote summary for an assumption
   */
  const getVoteSummary = (assumptionId: string) => {
    const assumption = doc.assumptions[assumptionId];
    if (!assumption) {
      return { green: 0, yellow: 0, red: 0, total: 0 };
    }
    return computeVoteSummary(assumption, doc.votes, currentUserDid);
  };

  /**
   * Update user identity
   */
  const updateIdentity = (updates: Partial<Omit<typeof doc.identity, 'did'>>) => {
    docHandle.change((d) => {
      if (updates.displayName !== undefined) {
        d.identity.displayName = updates.displayName;
      }
      if (updates.avatarUrl !== undefined) {
        if (updates.avatarUrl === '') {
          delete d.identity.avatarUrl;
        } else {
          d.identity.avatarUrl = updates.avatarUrl;
        }
      }
      d.lastModified = Date.now();
    });
  };

  return {
    doc,
    docHandle,
    currentUserDid,
    assumptions,
    tags,
    // Mutations
    createAssumption,
    updateAssumption,
    deleteAssumption,
    setVote,
    removeVote,
    createTag,
    addTagToAssumption,
    removeTagFromAssumption,
    updateIdentity,
    // Helpers
    getVoteSummary,
  };
}

export type OpinionGraphHook = ReturnType<typeof useOpinionGraph>;