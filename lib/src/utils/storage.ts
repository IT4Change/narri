/**
 * Storage utilities for shared identity management
 *
 * Provides localStorage abstraction for identity persistence
 * across multiple Narrative apps.
 */

import type { UserIdentity } from '../schema/identity';

/**
 * Shared localStorage key for identity across all Narrative apps
 * This ensures the same DID is used in narrative-app, map-app, etc.
 */
const SHARED_IDENTITY_KEY = 'narrative_shared_identity';

/**
 * Extended identity with private key for signing
 * Private key is stored locally but never synced via Automerge
 */
export interface StoredIdentity extends UserIdentity {
  privateKey?: string;  // Base64-encoded Ed25519 private key (stored locally only)
  userDocUrl?: string;  // UserDocument Automerge URL (only used during export/import)
}

/**
 * Load shared identity from localStorage
 *
 * @returns Stored identity if found, null otherwise
 */
export function loadSharedIdentity(): StoredIdentity | null {
  try {
    const json = localStorage.getItem(SHARED_IDENTITY_KEY);
    if (!json) return null;

    const identity = JSON.parse(json) as StoredIdentity;

    // Validate required fields
    if (!identity.did || typeof identity.did !== 'string') {
      console.warn('Invalid identity in localStorage: missing or invalid DID');
      return null;
    }

    return identity;
  } catch (error) {
    console.error('Failed to load identity from localStorage:', error);
    return null;
  }
}

/**
 * Save shared identity to localStorage
 *
 * @param identity - Identity to save (including private key)
 */
export function saveSharedIdentity(identity: StoredIdentity): void {
  try {
    localStorage.setItem(SHARED_IDENTITY_KEY, JSON.stringify(identity));
  } catch (error) {
    console.error('Failed to save identity to localStorage:', error);
    throw error;
  }
}

/**
 * Clear shared identity from localStorage
 * Used when resetting identity or logging out
 */
export function clearSharedIdentity(): void {
  try {
    localStorage.removeItem(SHARED_IDENTITY_KEY);
  } catch (error) {
    console.error('Failed to clear identity from localStorage:', error);
  }
}

/**
 * Get document ID for a specific app
 *
 * @param appPrefix - App-specific prefix (e.g., 'narrative', 'mapapp')
 * @returns Document ID if found, null otherwise
 */
export function loadDocumentId(appPrefix: string): string | null {
  try {
    return localStorage.getItem(`${appPrefix}_docId`);
  } catch (error) {
    console.error(`Failed to load document ID for ${appPrefix}:`, error);
    return null;
  }
}

/**
 * Save document ID for a specific app
 *
 * @param appPrefix - App-specific prefix (e.g., 'narrative', 'mapapp')
 * @param documentId - Document ID to save
 */
export function saveDocumentId(appPrefix: string, documentId: string): void {
  try {
    localStorage.setItem(`${appPrefix}_docId`, documentId);
  } catch (error) {
    console.error(`Failed to save document ID for ${appPrefix}:`, error);
    throw error;
  }
}

/**
 * Clear document ID for a specific app
 *
 * @param appPrefix - App-specific prefix (e.g., 'narrative', 'mapapp')
 */
export function clearDocumentId(appPrefix: string): void {
  try {
    localStorage.removeItem(`${appPrefix}_docId`);
  } catch (error) {
    console.error(`Failed to clear document ID for ${appPrefix}:`, error);
  }
}

/**
 * Export identity to a downloadable JSON file
 * Includes UserDocument URL so it can be restored on import
 *
 * @param filename - Optional custom filename (defaults to 'narrative-identity-{timestamp}.json')
 */
export function exportIdentityToFile(filename?: string): void {
  const identity = loadSharedIdentity();
  if (!identity) {
    console.warn('No identity to export');
    return;
  }

  // Include UserDocument URL so it can be restored on import
  const userDocUrl = localStorage.getItem('narrative_user_doc_id');
  const exportData: StoredIdentity = {
    ...identity,
    ...(userDocUrl ? { userDocUrl } : {}),
  };

  const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `narrative-identity-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import identity from a file picker dialog
 * Restores UserDocument URL if present in the export file
 *
 * @param onSuccess - Callback on successful import with the imported identity (without userDocUrl)
 * @param onError - Optional callback on error
 */
export function importIdentityFromFile(
  onSuccess?: (identity: StoredIdentity) => void,
  onError?: (error: string) => void
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content) as StoredIdentity;

        if (!importedData.did) {
          throw new Error('Invalid identity file: missing DID');
        }

        // Restore UserDocument URL if present (so existing UserDocument is loaded)
        if (importedData.userDocUrl) {
          localStorage.setItem('narrative_user_doc_id', importedData.userDocUrl);
        }

        // Save identity without userDocUrl (it's stored separately)
        const { userDocUrl, ...identityWithoutUrl } = importedData;
        saveSharedIdentity(identityWithoutUrl);

        // Call success callback with imported identity - caller decides what to do next
        onSuccess?.(identityWithoutUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ungültige Identity-Datei';
        onError?.(message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
