/**
 * Generic document structure shared by all Narrative apps
 *
 * This provides a common wrapper around app-specific data.
 * Identity profiles are stored per-workspace for display purposes.
 *
 * Note: Trust attestations have been moved to UserDocument for
 * cross-workspace Web of Trust functionality.
 */

import type { IdentityProfile, UserIdentity } from './identity';

/**
 * Identity lookup entry for workspace-internal profile resolution
 * Allows workspace participants to see each other's profiles without trust
 */
export interface IdentityLookupEntry {
  displayName?: string;
  avatarUrl?: string;
  /** UserDoc URL for bidirectional trust sync */
  userDocUrl?: string;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Context/Workspace metadata
 * Provides human-readable information about this collaboration space
 */
export interface ContextMetadata {
  /** Display name of this workspace/context */
  name: string;
  /** Optional description */
  description?: string;
  /** Optional avatar/icon URL */
  avatar?: string;
}

/**
 * Base document structure shared by all Narrative apps
 * Wraps app-specific data with shared identity infrastructure
 *
 * Note: Trust attestations have been moved to UserDocument (personal document)
 * for cross-workspace Web of Trust functionality.
 *
 * @template TData - App-specific data type (e.g., OpinionGraphData, MapData, or multi-module data)
 */
export interface BaseDocument<TData = unknown> {
  // Metadata
  version: string;
  lastModified: number;

  // Context information (for workspaces/multi-module support)
  context?: ContextMetadata;

  // Enabled modules (for multi-module documents)
  // Maps module ID to enabled state
  enabledModules?: Record<string, boolean>;

  // Identity (shared across all apps)
  identities: Record<string, IdentityProfile>;  // DID → profile

  /**
   * Identity lookup for workspace-internal profile resolution
   * Allows participants to see each other's profiles without trust relationship
   * Maps DID → IdentityLookupEntry
   */
  identityLookup?: Record<string, IdentityLookupEntry>;

  // App-specific data (can be single module or multi-module)
  data: TData;
}

/**
 * Create empty base document with creator identity
 *
 * @param initialData - App-specific initial data
 * @param creatorIdentity - Identity of the user creating the document
 * @param workspaceName - Optional workspace/context name
 * @param workspaceAvatar - Optional workspace avatar (data URL)
 * @returns BaseDocument with initialized identity
 */
export function createBaseDocument<TData>(
  initialData: TData,
  creatorIdentity: UserIdentity,
  workspaceName?: string,
  workspaceAvatar?: string
): BaseDocument<TData> {
  // Build identity profile from creator identity
  const profile: IdentityProfile = {};
  if (creatorIdentity.displayName !== undefined) {
    profile.displayName = creatorIdentity.displayName;
  }
  if (creatorIdentity.avatarUrl !== undefined) {
    profile.avatarUrl = creatorIdentity.avatarUrl;
  }
  if (creatorIdentity.publicKey !== undefined) {
    profile.publicKey = creatorIdentity.publicKey;
  }

  // Build context metadata if workspace info provided
  // Note: Only include avatar if it's defined (Automerge doesn't allow undefined values)
  const context: ContextMetadata | undefined =
    workspaceName || workspaceAvatar
      ? {
          name: workspaceName || 'Workspace',
          ...(workspaceAvatar && { avatar: workspaceAvatar }),
        }
      : undefined;

  return {
    version: '1.0.0',
    lastModified: Date.now(),
    ...(context && { context }),
    identities: {
      [creatorIdentity.did]: profile,
    },
    data: initialData,
  };
}

/**
 * Generate a simple unique ID
 * Can be used for any entity (assumptions, votes, tags, etc.)
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix?: string): string {
  const base = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  return prefix ? `${prefix}-${base}` : base;
}
