import { describe, it, expect } from 'vitest';
import * as Automerge from '@automerge/automerge';
import type { OpinionGraphDoc } from '../../schema';
import { createEmptyDoc } from '../../schema';

/**
 * CRITICAL CRDT Tests: Conflict Resolution
 *
 * These tests verify that Automerge correctly handles concurrent edits
 * from multiple peers without data loss.
 */

describe('CRDT Conflict Resolution', () => {
  describe('Concurrent assumption creation', () => {
    it('should preserve both assumptions when created with different IDs', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // Two peers create different assumptions concurrently
      const fork1 = Automerge.clone(base);
      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'First assumption',
          createdBy: 'did:key:user1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      const fork2 = Automerge.clone(base);
      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a2'] = {
          id: 'a2',
          sentence: 'Second assumption',
          createdBy: 'did:key:user2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both assumptions should exist
      expect(Object.keys(merged.assumptions)).toHaveLength(2);
      expect(merged.assumptions['a1']).toBeDefined();
      expect(merged.assumptions['a2']).toBeDefined();
      expect(merged.assumptions['a1'].sentence).toBe('First assumption');
      expect(merged.assumptions['a2'].sentence).toBe('Second assumption');
    });

    it('should handle last-write-wins when same ID is used', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // Two peers create assumption with SAME ID (unlikely but possible)
      const fork1 = Automerge.clone(base);
      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'First version',
          createdBy: 'did:key:user1',
          createdAt: 1000,
          updatedAt: 1000,
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      const fork2 = Automerge.clone(base);
      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Second version',
          createdBy: 'did:key:user2',
          createdAt: 2000,
          updatedAt: 2000,
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      const merged = Automerge.merge(doc1, doc2);

      // Automerge will pick one (deterministically)
      expect(Object.keys(merged.assumptions)).toHaveLength(1);
      expect(merged.assumptions['a1']).toBeDefined();
      // The winner is determined by Automerge's merge algorithm
    });
  });

  describe('Concurrent sentence edits', () => {
    it('should resolve conflicting sentence updates', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // Setup: create assumption
      const withAssumption = Automerge.change(base, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Original sentence',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      // Two peers edit the sentence concurrently
      const fork1 = Automerge.clone(withAssumption);
      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'].sentence = 'First edit';
        d.assumptions['a1'].updatedAt = 1000;
      });

      const fork2 = Automerge.clone(withAssumption);
      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].sentence = 'Second edit';
        d.assumptions['a1'].updatedAt = 2000;
      });

      const merged = Automerge.merge(doc1, doc2);

      // Automerge will pick one sentence (last-write-wins by actor ID)
      expect(merged.assumptions['a1'].sentence).toBeDefined();
      // The exact winner depends on Automerge's actor IDs
      expect(
        merged.assumptions['a1'].sentence === 'First edit' ||
        merged.assumptions['a1'].sentence === 'Second edit'
      ).toBe(true);
    });
  });

  describe('Concurrent vote operations', () => {
    it('should preserve concurrent votes from different users', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(base, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      // User1 votes green
      const fork1 = Automerge.clone(withAssumption);
      const doc1 = Automerge.change(fork1, (d) => {
        const voteId = 'v1';
        d.votes[voteId] = {
          id: voteId,
          assumptionId: 'a1',
          voterDid: 'did:key:user1',
          value: 'green',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        d.assumptions['a1'].voteIds.push(voteId);
      });

      // User2 votes red concurrently
      const fork2 = Automerge.clone(withAssumption);
      const doc2 = Automerge.change(fork2, (d) => {
        const voteId = 'v2';
        d.votes[voteId] = {
          id: voteId,
          assumptionId: 'a1',
          voterDid: 'did:key:user2',
          value: 'red',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        d.assumptions['a1'].voteIds.push(voteId);
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both votes should be preserved
      expect(Object.keys(merged.votes)).toHaveLength(2);
      expect(merged.votes['v1']).toBeDefined();
      expect(merged.votes['v2']).toBeDefined();
      expect(merged.assumptions['a1'].voteIds).toHaveLength(2);
    });

    it('should handle same user changing vote concurrently', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // Setup: user has voted green
      const withVote = Automerge.change(Automerge.from(createEmptyDoc(identity)), (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: ['v1'],
          editLogIds: [],
        };
        d.votes['v1'] = {
          id: 'v1',
          assumptionId: 'a1',
          voterDid: 'did:key:user1',
          value: 'green',
          createdAt: 1000,
          updatedAt: 1000,
        };
      });

      // User changes vote to yellow on device 1
      const fork1 = Automerge.clone(withVote);
      const doc1 = Automerge.change(fork1, (d) => {
        d.votes['v1'].value = 'yellow';
        d.votes['v1'].updatedAt = 2000;
      });

      // User changes vote to red on device 2 (offline)
      const fork2 = Automerge.clone(withVote);
      const doc2 = Automerge.change(fork2, (d) => {
        d.votes['v1'].value = 'red';
        d.votes['v1'].updatedAt = 2001;
      });

      const merged = Automerge.merge(doc1, doc2);

      // One vote wins (last-write-wins or actor-based)
      expect(merged.votes['v1'].value).toBeDefined();
      expect(['yellow', 'red']).toContain(merged.votes['v1'].value);
    });
  });

  describe('Delete operations', () => {
    it('should handle delete vs edit conflict (delete wins)', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(base, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      // Peer 1 deletes assumption
      const fork1 = Automerge.clone(withAssumption);
      const doc1 = Automerge.change(fork1, (d) => {
        delete d.assumptions['a1'];
      });

      // Peer 2 edits assumption concurrently
      const fork2 = Automerge.clone(withAssumption);
      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].sentence = 'Updated';
      });

      const merged = Automerge.merge(doc1, doc2);

      // Delete typically wins in CRDT semantics
      expect(merged.assumptions['a1']).toBeUndefined();
    });

    it('should handle concurrent deletes of same assumption', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(base, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
      });

      // Both peers delete the same assumption
      const fork1 = Automerge.clone(withAssumption);
      const doc1 = Automerge.change(fork1, (d) => {
        delete d.assumptions['a1'];
      });

      const fork2 = Automerge.clone(withAssumption);
      const doc2 = Automerge.change(fork2, (d) => {
        delete d.assumptions['a1'];
      });

      const merged = Automerge.merge(doc1, doc2);

      // Assumption should be deleted
      expect(merged.assumptions['a1']).toBeUndefined();
    });
  });

  describe('Tag operations', () => {
    it('should merge concurrent tag creations with different names', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // Two peers create different tags
      const fork1 = Automerge.clone(base);
      const doc1 = Automerge.change(fork1, (d) => {
        d.tags['t1'] = {
          id: 't1',
          name: 'Frontend',
          createdBy: 'did:key:user1',
          createdAt: Date.now(),
        };
      });

      const fork2 = Automerge.clone(base);
      const doc2 = Automerge.change(fork2, (d) => {
        d.tags['t2'] = {
          id: 't2',
          name: 'Backend',
          createdBy: 'did:key:user2',
          createdAt: Date.now(),
        };
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both tags should exist
      expect(Object.keys(merged.tags)).toHaveLength(2);
      expect(merged.tags['t1'].name).toBe('Frontend');
      expect(merged.tags['t2'].name).toBe('Backend');
    });

    it('should handle concurrent tag assignments to assumption', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(base, (d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: [],
        };
        d.tags['t1'] = {
          id: 't1',
          name: 'Tag1',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
        };
        d.tags['t2'] = {
          id: 't2',
          name: 'Tag2',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
        };
      });

      // Peer 1 adds t1 to assumption
      const fork1 = Automerge.clone(withAssumption);
      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'].tagIds.push('t1');
      });

      // Peer 2 adds t2 to assumption
      const fork2 = Automerge.clone(withAssumption);
      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].tagIds.push('t2');
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both tags should be assigned
      expect(merged.assumptions['a1'].tagIds).toHaveLength(2);
      expect(merged.assumptions['a1'].tagIds).toContain('t1');
      expect(merged.assumptions['a1'].tagIds).toContain('t2');
    });
  });

  describe('Identity updates', () => {
    it('should merge concurrent display name updates from same user', () => {
      const identity = { did: 'did:key:user1', displayName: 'Original' };
      const base = Automerge.from(createEmptyDoc(identity));

      // User changes name on device 1
      const fork1 = Automerge.clone(base);
      const doc1 = Automerge.change(fork1, (d) => {
        d.identities['did:key:user1'] = {
          displayName: 'Name from Device 1',
        };
      });

      // User changes name on device 2 (offline)
      const fork2 = Automerge.clone(base);
      const doc2 = Automerge.change(fork2, (d) => {
        d.identities['did:key:user1'] = {
          displayName: 'Name from Device 2',
        };
      });

      const merged = Automerge.merge(doc1, doc2);

      // One name wins (deterministic based on actor ID)
      expect(merged.identities['did:key:user1'].displayName).toBeDefined();
      expect([
        'Name from Device 1',
        'Name from Device 2',
      ]).toContain(merged.identities['did:key:user1'].displayName);
    });

    it('should preserve identity updates from different users', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const base = Automerge.from(createEmptyDoc(identity));

      // User1 sets their name
      const fork1 = Automerge.clone(base);
      const doc1 = Automerge.change(fork1, (d) => {
        d.identities['did:key:user1'] = {
          displayName: 'User 1',
        };
      });

      // User2 sets their name concurrently
      const fork2 = Automerge.clone(base);
      const doc2 = Automerge.change(fork2, (d) => {
        d.identities['did:key:user2'] = {
          displayName: 'User 2',
        };
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both identities should exist
      expect(merged.identities['did:key:user1'].displayName).toBe('User 1');
      expect(merged.identities['did:key:user2'].displayName).toBe('User 2');
    });
  });
});
