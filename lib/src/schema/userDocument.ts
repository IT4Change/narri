/**
 * User Document Schema
 *
 * Personal document for user-centric data that spans across workspaces.
 * This document is synchronized via Automerge and contains:
 * - User profile (name, avatar)
 * - Trust attestations (given and received)
 * - Vouchers (DANK tokens)
 * - Workspace list
 *
 * Security model:
 * - Anyone can technically write to any Automerge document
 * - Protection is via cryptographic signatures verified at read time
 * - Invalid signatures are ignored when reading data
 */

import type { TrustAttestation } from './identity';

/**
 * User profile information
 *
 * Security: Profile is signed by the document owner.
 * Invalid signatures should cause fallback to DID-based display name.
 */
export interface UserProfile {
  displayName: string;
  avatarUrl?: string;
  /** Timestamp when profile was last updated (included in signature) */
  updatedAt?: number;
  /**
   * JWS signature proving this profile was set by the document owner
   * Signed payload: { displayName, avatarUrl, updatedAt }
   * Verified against the DID in the parent UserDocument
   */
  signature?: string;
}

/**
 * Voucher/Token (DANK)
 * Represents a transferable unit of value
 */
export interface Voucher {
  id: string;
  /** Amount in smallest unit */
  amount: number;
  /** Currency/token type */
  currency: string;
  /** Who issued this voucher */
  issuerDid: string;
  /** Current owner */
  ownerDid: string;
  /** Creation timestamp */
  createdAt: number;
  /** Signature from issuer (proves authenticity) */
  issuerSignature: string;
  /** Optional: expiration timestamp */
  expiresAt?: number;
  /** Optional: notes/memo */
  memo?: string;
}

/**
 * Workspace reference
 * Minimal info needed to load a workspace
 */
export interface WorkspaceRef {
  /** Automerge document ID */
  docId: string;
  /** Display name (cached for offline) */
  name: string;
  /** Optional avatar (cached for offline) */
  avatar?: string;
  /** When this workspace was added */
  addedAt: number;
  /** Last accessed timestamp */
  lastAccessedAt?: number;
}

/**
 * User Document
 *
 * Personal document synced across devices.
 * Contains user-centric data that should persist across workspaces.
 */
export interface UserDocument {
  /** Schema version for migrations */
  version: string;

  /** Last modification timestamp */
  lastModified: number;

  /** Owner's DID (did:key:z6Mk...) */
  did: string;

  /** User profile */
  profile: UserProfile;

  /**
   * Trust attestations given by this user
   * Key: trusteeDid (who I'm trusting)
   * Value: Signed attestation
   *
   * These are signed by me (the document owner)
   */
  trustGiven: Record<string, TrustAttestation>;

  /**
   * Trust attestations received from others
   * Key: trusterDid (who is trusting me)
   * Value: Signed attestation from the truster
   *
   * These are signed by the respective trusters.
   * Invalid signatures are ignored at read time.
   */
  trustReceived: Record<string, TrustAttestation>;

  /**
   * Vouchers owned by this user
   * Key: voucher ID
   */
  vouchers: Record<string, Voucher>;

  /**
   * Workspaces this user is a member of
   * Key: workspace document ID
   */
  workspaces: Record<string, WorkspaceRef>;
}

/**
 * Create an empty User Document
 *
 * @param did - Owner's DID
 * @param displayName - Initial display name
 * @returns New UserDocument
 */
export function createUserDocument(did: string, displayName: string): UserDocument {
  return {
    version: '1.0.0',
    lastModified: Date.now(),
    did,
    profile: {
      displayName,
    },
    trustGiven: {},
    trustReceived: {},
    vouchers: {},
    workspaces: {},
  };
}

/**
 * Add a workspace reference to the user document
 *
 * @param doc - User document to modify (inside Automerge change callback)
 * @param docId - Workspace document ID
 * @param name - Workspace name
 * @param avatar - Optional workspace avatar
 */
export function addWorkspace(
  doc: UserDocument,
  docId: string,
  name: string,
  avatar?: string
): void {
  const now = Date.now();
  doc.workspaces[docId] = {
    docId,
    name,
    ...(avatar && { avatar }),
    addedAt: now,
    lastAccessedAt: now,
  };
  doc.lastModified = now;
}

/**
 * Remove a workspace reference
 *
 * @param doc - User document to modify
 * @param docId - Workspace document ID to remove
 */
export function removeWorkspace(doc: UserDocument, docId: string): void {
  delete doc.workspaces[docId];
  doc.lastModified = Date.now();
}

/**
 * Update workspace last accessed time
 *
 * @param doc - User document to modify
 * @param docId - Workspace document ID
 */
export function touchWorkspace(doc: UserDocument, docId: string): void {
  if (doc.workspaces[docId]) {
    doc.workspaces[docId].lastAccessedAt = Date.now();
    doc.lastModified = Date.now();
  }
}

/**
 * Update user profile
 *
 * @param doc - User document to modify
 * @param profile - Partial profile updates
 */
export function updateUserProfile(
  doc: UserDocument,
  profile: Partial<UserProfile>
): void {
  if (profile.displayName !== undefined) {
    doc.profile.displayName = profile.displayName;
  }
  if (profile.avatarUrl !== undefined) {
    doc.profile.avatarUrl = profile.avatarUrl;
  } else if (profile.avatarUrl === null) {
    // Explicitly remove avatar
    delete doc.profile.avatarUrl;
  }
  doc.lastModified = Date.now();
}

/**
 * Add a trust attestation given by this user
 *
 * @param doc - User document to modify
 * @param attestation - Signed trust attestation
 */
export function addTrustGiven(doc: UserDocument, attestation: TrustAttestation): void {
  doc.trustGiven[attestation.trusteeDid] = attestation;
  doc.lastModified = Date.now();
}

/**
 * Remove a trust attestation given by this user
 *
 * @param doc - User document to modify
 * @param trusteeDid - DID of the user to untrust
 */
export function removeTrustGiven(doc: UserDocument, trusteeDid: string): void {
  delete doc.trustGiven[trusteeDid];
  doc.lastModified = Date.now();
}

/**
 * Add a trust attestation received from another user
 * Note: This should be called by the truster writing to the trustee's document
 *
 * @param doc - User document to modify
 * @param attestation - Signed trust attestation from the truster
 */
export function addTrustReceived(doc: UserDocument, attestation: TrustAttestation): void {
  doc.trustReceived[attestation.trusterDid] = attestation;
  doc.lastModified = Date.now();
}

/**
 * Remove a trust attestation received from another user
 *
 * @param doc - User document to modify
 * @param trusterDid - DID of the user who gave trust
 */
export function removeTrustReceived(doc: UserDocument, trusterDid: string): void {
  delete doc.trustReceived[trusterDid];
  doc.lastModified = Date.now();
}
