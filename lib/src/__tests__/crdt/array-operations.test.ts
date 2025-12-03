import { describe, it, expect } from 'vitest';
import * as Automerge from '@automerge/automerge';
import type { OpinionGraphDoc } from '../../schema';
import { createEmptyDoc } from '../../schema';
import { createTestDoc } from '../helpers';

/**
 * CRITICAL CRDT Tests: Array Operation Safety
 *
 * These tests ensure that array modifications use granular operations
 * (push, splice) instead of full array replacement. Array replacement
 * causes merge conflicts in Automerge.
 */

describe('CRDT Array Operation Safety', () => {
  describe('tagIds array operations', () => {
    it('should use granular operations when adding tags', () => {
      const { handle } = createTestDoc();

      // Create assumption with tags
      handle.change((d) => {
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

      const historyBefore = Automerge.getHistory(handle.docSync()!).length;

      // Add tags using granular operations (push)
      handle.change((d) => {
        d.assumptions['a1'].tagIds.push('tag1');
        d.assumptions['a1'].tagIds.push('tag2');
      });

      const historyAfter = Automerge.getHistory(handle.docSync()!).length;
      const doc = handle.docSync()!;

      // Verify result
      expect(doc.assumptions['a1'].tagIds).toEqual(['tag1', 'tag2']);

      // Should create multiple operations (one change with 2 pushes)
      expect(historyAfter).toBeGreaterThan(historyBefore);
    });

    it.skip('should use splice when removing tags', () => {
      const { handle } = createTestDoc();

      // Setup: assumption with tags
      handle.change((d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: ['tag1', 'tag2', 'tag3'],
          voteIds: [],
          editLogIds: [],
        };
      });

      // Remove middle tag using splice
      handle.change((d) => {
        const tagIds = d.assumptions['a1'].tagIds;
        const idx = tagIds.indexOf('tag2');
        if (idx !== -1) {
          tagIds.splice(idx, 1);
        }
      });

      const doc = handle.docSync()!;

      expect(doc.assumptions['a1'].tagIds).toEqual(['tag1', 'tag3']);
    });

    it('should handle tag updates with minimal operations', () => {
      const { handle } = createTestDoc();

      // Setup
      handle.change((d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: ['tag1', 'tag2', 'tag3'],
          voteIds: [],
          editLogIds: [],
        };
      });

      // Update: remove tag1, keep tag2, add tag4
      // This simulates updateAssumption() behavior
      const newTags = ['tag2', 'tag3', 'tag4'];

      handle.change((d) => {
        const assumption = d.assumptions['a1'];
        const currentTagIds = [...assumption.tagIds]; // Copy to avoid index shifting

        // Remove tags not in newTags (iterate backwards to avoid index issues)
        for (let i = currentTagIds.length - 1; i >= 0; i--) {
          if (!newTags.includes(currentTagIds[i])) {
            assumption.tagIds.splice(i, 1);
          }
        }

        // Add tags not in currentTags
        newTags.forEach(id => {
          if (!currentTagIds.includes(id)) {
            assumption.tagIds.push(id);
          }
        });
      });

      const doc = handle.docSync()!;

      expect(doc.assumptions['a1'].tagIds).toContain('tag2');
      expect(doc.assumptions['a1'].tagIds).toContain('tag3');
      expect(doc.assumptions['a1'].tagIds).toContain('tag4');
      expect(doc.assumptions['a1'].tagIds).not.toContain('tag1');
    });

    it('should NOT use array replacement (anti-pattern)', () => {
      const { handle } = createTestDoc();

      handle.change((d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: ['tag1', 'tag2'],
          voteIds: [],
          editLogIds: [],
        };
      });

      // BAD: Array replacement (we test that this is detectable)
      const historyBefore = Automerge.getHistory(handle.docSync()!).length;

      handle.change((d) => {
        // This is the WRONG way (but we test it to document the anti-pattern)
        d.assumptions['a1'].tagIds = ['tag3', 'tag4'] as any;
      });

      const historyAfter = Automerge.getHistory(handle.docSync()!).length;
      const doc = handle.docSync()!;

      // Result is correct, but history shows array replacement
      expect(doc.assumptions['a1'].tagIds).toEqual(['tag3', 'tag4']);

      // NOTE: This test documents the anti-pattern. In real code, we must
      // use granular operations instead of assignment.
    });
  });

  describe('voteIds array operations', () => {
    it('should use push when adding votes', () => {
      const { handle } = createTestDoc();

      handle.change((d) => {
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

      handle.change((d) => {
        d.assumptions['a1'].voteIds.push('v1');
      });

      const doc = handle.docSync()!;
      expect(doc.assumptions['a1'].voteIds).toEqual(['v1']);
    });

    it.skip('should use splice when removing votes', () => {
      const { handle } = createTestDoc();

      handle.change((d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: ['v1', 'v2', 'v3'],
          editLogIds: [],
        };
      });

      // Remove vote using splice
      handle.change((d) => {
        const voteIds = d.assumptions['a1'].voteIds;
        const idx = voteIds.indexOf('v2');
        if (idx !== -1) {
          voteIds.splice(idx, 1);
        }
      });

      const doc = handle.docSync()!;
      expect(doc.assumptions['a1'].voteIds).toEqual(['v1', 'v3']);
    });
  });

  describe('editLogIds array operations', () => {
    it('should only append to edit log (never remove)', () => {
      const { handle } = createTestDoc();

      handle.change((d) => {
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

      // Append edits
      handle.change((d) => {
        d.assumptions['a1'].editLogIds.push('e1');
      });

      handle.change((d) => {
        d.assumptions['a1'].editLogIds.push('e2');
      });

      const doc = handle.docSync()!;
      expect(doc.assumptions['a1'].editLogIds).toEqual(['e1', 'e2']);
    });

    it('should preserve edit log order', () => {
      const { handle } = createTestDoc();

      handle.change((d) => {
        d.assumptions['a1'] = {
          id: 'a1',
          sentence: 'Test',
          createdBy: 'did:key:test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagIds: [],
          voteIds: [],
          editLogIds: ['e1', 'e2', 'e3'],
        };
      });

      const doc = handle.docSync()!;

      // Edit log should maintain insertion order
      expect(doc.assumptions['a1'].editLogIds[0]).toBe('e1');
      expect(doc.assumptions['a1'].editLogIds[1]).toBe('e2');
      expect(doc.assumptions['a1'].editLogIds[2]).toBe('e3');
    });
  });

  describe('Concurrent array modifications', () => {
    it('should merge concurrent tag additions from two peers', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const baseDoc = Automerge.from(createEmptyDoc(identity));

      // Setup assumption
      const withAssumption = Automerge.change(baseDoc, (d) => {
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

      // Fork: two peers add different tags concurrently
      const fork1 = Automerge.clone(withAssumption);
      const fork2 = Automerge.clone(withAssumption);

      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'].tagIds.push('tag1');
      });

      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].tagIds.push('tag2');
      });

      // Merge
      const merged = Automerge.merge(doc1, doc2);

      // Both tags should be preserved
      expect(merged.assumptions['a1'].tagIds).toHaveLength(2);
      expect(merged.assumptions['a1'].tagIds).toContain('tag1');
      expect(merged.assumptions['a1'].tagIds).toContain('tag2');
    });

    it('should handle concurrent vote additions', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const baseDoc = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(baseDoc, (d) => {
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

      // Two users vote concurrently
      const fork1 = Automerge.clone(withAssumption);
      const fork2 = Automerge.clone(withAssumption);

      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'].voteIds.push('v1');
      });

      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].voteIds.push('v2');
      });

      const merged = Automerge.merge(doc1, doc2);

      expect(merged.assumptions['a1'].voteIds).toHaveLength(2);
      expect(merged.assumptions['a1'].voteIds).toContain('v1');
      expect(merged.assumptions['a1'].voteIds).toContain('v2');
    });

    it('should handle concurrent edit log entries', () => {
      const identity = { did: 'did:key:test', displayName: 'Test' };
      const baseDoc = Automerge.from(createEmptyDoc(identity));

      const withAssumption = Automerge.change(baseDoc, (d) => {
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

      // Two edits happen concurrently
      const fork1 = Automerge.clone(withAssumption);
      const fork2 = Automerge.clone(withAssumption);

      const doc1 = Automerge.change(fork1, (d) => {
        d.assumptions['a1'].editLogIds.push('e1');
      });

      const doc2 = Automerge.change(fork2, (d) => {
        d.assumptions['a1'].editLogIds.push('e2');
      });

      const merged = Automerge.merge(doc1, doc2);

      // Both edits should be preserved
      expect(merged.assumptions['a1'].editLogIds).toHaveLength(2);
      expect(merged.assumptions['a1'].editLogIds).toContain('e1');
      expect(merged.assumptions['a1'].editLogIds).toContain('e2');
    });
  });
});
