/**
 * AppShell - Generic application shell for Narrative apps
 *
 * Handles:
 * - Automerge repo initialization
 * - Document creation/loading (URL hash + localStorage)
 * - Identity management (DID generation + localStorage)
 * - Fake DID migration
 * - Optional: User Document initialization (personal cross-workspace data)
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { Repo, DocHandle, AutomergeUrl } from '@automerge/automerge-repo';
import { RepoContext } from '@automerge/automerge-repo-react-hooks';
import type { DocumentId } from '@automerge/automerge-repo';
import { generateDidIdentity, isFakeDid } from '../utils/did';
import type { UserIdentity } from '../schema/identity';
import type { UserDocument } from '../schema/userDocument';
import { createUserDocument } from '../schema/userDocument';
import {
  loadSharedIdentity,
  saveSharedIdentity,
  clearSharedIdentity,
  loadDocumentId,
  saveDocumentId,
  clearDocumentId,
} from '../utils/storage';
import {
  loadUserDocId,
  saveUserDocId,
  clearUserDocId,
} from '../hooks/useUserDocument';
import { LoadingScreen } from './LoadingScreen';
import { initDebugTools, updateDebugState } from '../utils/debug';
import { useCrossTabSync } from '../hooks/useCrossTabSync';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';

/** Timeout for document loading (ms) */
const DOC_LOAD_TIMEOUT = 15000;

/** Max retry attempts for document loading */
const MAX_RETRY_ATTEMPTS = 3;

export interface AppShellChildProps {
  documentId: DocumentId;
  currentUserDid: string;
  privateKey?: string;
  publicKey?: string;
  displayName?: string;
  onResetIdentity: () => void;
  onNewDocument: (name?: string, avatarDataUrl?: string) => void;

  // User Document (optional, only if enableUserDocument is true)
  userDocId?: string;
  userDocHandle?: DocHandle<UserDocument>;
}

export interface AppShellProps<TDoc> {
  /**
   * Automerge repo instance
   * (can be created by useRepository hook or passed directly)
   */
  repo: Repo;

  /**
   * Factory function to create empty document with user identity
   * @param identity - User identity
   * @param workspaceName - Optional workspace name
   * @param workspaceAvatar - Optional workspace avatar (data URL)
   */
  createEmptyDocument: (identity: UserIdentity, workspaceName?: string, workspaceAvatar?: string) => TDoc;

  /**
   * localStorage key prefix for this app (e.g., 'narrative', 'mapapp')
   * Used for storing document ID: `${storagePrefix}_docId`
   */
  storagePrefix: string;

  /**
   * Enable User Document for cross-workspace personal data
   * When true, AppShell will also initialize/load the user's personal document
   * @default false
   */
  enableUserDocument?: boolean;

  /**
   * Render function that receives initialized document and identity
   */
  children: (props: AppShellChildProps) => ReactNode;
}

/**
 * Generic app shell that handles document and identity initialization
 *
 * @example
 * ```tsx
 * <AppShell
 *   repo={repo}
 *   createEmptyDocument={createEmptyOpinionGraphDoc}
 *   storagePrefix="narrative"
 * >
 *   {(props) => <MainView {...props} />}
 * </AppShell>
 * ```
 */
export function AppShell<TDoc>({
  repo,
  createEmptyDocument,
  storagePrefix,
  enableUserDocument = false,
  children,
}: AppShellProps<TDoc>) {
  const [documentId, setDocumentId] = useState<DocumentId | null>(null);
  const [currentUserDid, setCurrentUserDid] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | undefined>(undefined);
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [failedDocId, setFailedDocId] = useState<string | null>(null);

  // User Document state (optional)
  const [userDocId, setUserDocId] = useState<string | undefined>(undefined);
  const [userDocHandle, setUserDocHandle] = useState<DocHandle<UserDocument> | undefined>(undefined);

  // Initialize debug tools on mount and set repo
  useEffect(() => {
    initDebugTools();
    updateDebugState({ repo });
  }, [repo]);

  // Cross-tab sync: reload when identity changes in another tab
  useCrossTabSync({
    autoReloadOnIdentityChange: true,
  });

  // Update debug state when userDocHandle changes
  useEffect(() => {
    if (!userDocHandle) return;

    const userDocUrl = userDocHandle.url;

    // Initial update
    const doc = userDocHandle.doc();
    if (doc) {
      updateDebugState({ userDoc: doc, userDocUrl });
    }

    // Subscribe to changes
    const onChange = () => {
      const updatedDoc = userDocHandle.doc();
      updateDebugState({ userDoc: updatedDoc, userDocUrl });
    };

    userDocHandle.on('change', onChange);
    return () => {
      userDocHandle.off('change', onChange);
    };
  }, [userDocHandle]);

  // Initialize document and identity on mount
  useEffect(() => {
    initializeDocument();
  }, []);

  // Listen to URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const newDocId = params.get('doc');
      if (newDocId && newDocId !== documentId) {
        setDocumentId(newDocId as DocumentId);
        saveDocumentId(storagePrefix, newDocId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [documentId, storagePrefix]);

  /**
   * Initialize or load the User Document
   * This is a personal document that syncs across workspaces
   */
  const initializeUserDocument = async (identity: { did: string; displayName?: string }) => {
    const savedUserDocId = loadUserDocId();

    let handle: DocHandle<UserDocument>;

    if (savedUserDocId) {
      // Try to load existing user document
      try {
        // In automerge-repo v2.x, find() returns a Promise that resolves when ready
        handle = await repo.find<UserDocument>(savedUserDocId as AutomergeUrl);

        // Verify the document belongs to this user
        const doc = handle.doc();
        if (doc && doc.did !== identity.did) {
          console.warn('User document DID mismatch, creating new document');
          // Create new document instead
          handle = repo.create<UserDocument>();
          handle.change((d) => {
            const newDoc = createUserDocument(identity.did, identity.displayName || 'User');
            Object.assign(d, newDoc);
          });
          saveUserDocId(handle.url);
        }
      } catch (e) {
        console.warn('Failed to load user document, creating new one', e);
        // Create new document
        handle = repo.create<UserDocument>();
        handle.change((d) => {
          const newDoc = createUserDocument(identity.did, identity.displayName || 'User');
          Object.assign(d, newDoc);
        });
        saveUserDocId(handle.url);
      }
    } else {
      // Create new user document
      handle = repo.create<UserDocument>();
      handle.change((d) => {
        const newDoc = createUserDocument(identity.did, identity.displayName || 'User');
        Object.assign(d, newDoc);
      });
      saveUserDocId(handle.url);
    }

    setUserDocId(handle.url);
    setUserDocHandle(handle);
  };

  const initializeDocument = async () => {
    // Check URL for shared document ID (e.g., #doc=automerge:...)
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const urlDocId = urlParams.get('doc');

    // Try to load existing document from URL, then localStorage
    const savedDocId = loadDocumentId(storagePrefix);
    const savedIdentity = loadSharedIdentity();

    // Migration: Check for fake DIDs and reset
    if (savedIdentity && isFakeDid(savedIdentity.did)) {
      console.warn('Detected fake DID. Upgrading to real DIDs. Clearing localStorage...');
      clearSharedIdentity();
      clearDocumentId(storagePrefix);
      alert('Upgraded to secure DIDs. Your identity has been reset. Please create a new board.');
      window.location.hash = '';
      window.location.reload();
      return;
    }

    // Each browser needs its own identity
    let identity = savedIdentity;
    if (!identity) {
      // Generate real DID with Ed25519 keypair
      const didIdentity = await generateDidIdentity(
        `User-${Math.random().toString(36).substring(7)}`
      );
      identity = {
        did: didIdentity.did,
        displayName: didIdentity.displayName,
        publicKey: didIdentity.publicKey,
        privateKey: didIdentity.privateKey, // Store for future signing
      };
      saveSharedIdentity(identity);
    }

    setCurrentUserDid(identity.did);
    setPrivateKey(identity.privateKey); // Set private key for signing
    setPublicKey(identity.publicKey); // Set public key for identity verification
    setDisplayName(identity.displayName); // Set display name for identity

    // Initialize User Document if enabled
    if (enableUserDocument) {
      await initializeUserDocument(identity);
    }

    const docIdToUse = urlDocId || savedDocId;

    if (docIdToUse) {
      // Normalize document ID: add automerge: prefix if missing
      const normalizedDocId = docIdToUse.startsWith('automerge:')
        ? docIdToUse
        : `automerge:${docIdToUse}`;

      // Validate AutomergeUrl format
      if (!isValidAutomergeUrl(normalizedDocId)) {
        console.error('Invalid document ID format:', docIdToUse);
        setLoadError(`Ungültige Dokument-ID: "${docIdToUse.substring(0, 30)}..."`);
        // Clear invalid ID from storage
        clearDocumentId(storagePrefix);
        setIsInitializing(false);
        return;
      }

      try {
        // Load existing document
        // In automerge-repo v2.x, find() returns a Promise that resolves when ready
        const loadStartTime = Date.now();
        console.log(`[AppShell] Loading document: ${normalizedDocId.substring(0, 30)}...`);
        console.log(`[AppShell] Timeout: ${DOC_LOAD_TIMEOUT}ms, Attempt: ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Document load timeout')), DOC_LOAD_TIMEOUT);
        });

        const handle = await Promise.race([
          repo.find(normalizedDocId as AutomergeUrl),
          timeoutPromise,
        ]);

        const loadDuration = Date.now() - loadStartTime;
        console.log(`[AppShell] repo.find() resolved in ${loadDuration}ms`);

        // Verify document was actually loaded (not just created empty)
        const doc = handle.doc();
        if (!doc) {
          console.error('[AppShell] Document handle exists but doc() returned null/undefined');
          throw new Error('Document not found or empty');
        }

        console.log(`[AppShell] Document loaded successfully in ${loadDuration}ms`);
        console.log(`[AppShell] Document keys:`, Object.keys(doc));

        setDocumentId(handle.documentId);
        saveDocumentId(storagePrefix, handle.documentId);

        // Update URL if not already there
        if (!urlDocId) {
          window.location.hash = `doc=${docIdToUse}`;
        }

        setRetryCount(0); // Reset retry count on success
        setIsInitializing(false);
      } catch (error) {
        console.error('[AppShell] Failed to load document:', error);
        console.error(`[AppShell] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`[AppShell] Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`[AppShell] Document ID: ${normalizedDocId}`);
        console.error(`[AppShell] Retry count: ${retryCount}/${MAX_RETRY_ATTEMPTS}`);

        // Store failed doc ID for retry
        setFailedDocId(docIdToUse);

        setLoadError(
          error instanceof Error && error.message === 'Document load timeout'
            ? `Dokument konnte nicht geladen werden (Timeout nach ${DOC_LOAD_TIMEOUT / 1000}s). Möglicherweise existiert es nicht mehr oder der Sync-Server ist nicht erreichbar.`
            : `Dokument konnte nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        );
        // Don't clear document ID yet - allow retry
        setIsInitializing(false);
        return;
      }
    } else {
      // Create new document with current user's identity
      const handle = repo.create(createEmptyDocument(identity));
      const docId = handle.documentId;

      // Save document ID and add to URL
      saveDocumentId(storagePrefix, docId);
      window.location.hash = `doc=${docId}`;

      setDocumentId(docId);
      setIsInitializing(false);
    }
  };

  const handleResetIdentity = () => {
    clearSharedIdentity();
    if (enableUserDocument) {
      clearUserDocId();
    }
    window.location.reload();
  };

  const handleNewDocument = async (workspaceName?: string, workspaceAvatar?: string) => {
    const storedIdentity = loadSharedIdentity();
    let identity = storedIdentity;

    if (!identity) {
      // Generate new identity if none exists (shouldn't happen, but safe fallback)
      const didIdentity = await generateDidIdentity(
        `User-${Math.random().toString(36).substring(7)}`
      );
      identity = {
        did: didIdentity.did,
        displayName: didIdentity.displayName,
        publicKey: didIdentity.publicKey,
        privateKey: didIdentity.privateKey,
      };
      saveSharedIdentity(identity);
    }

    const handle = repo.create(createEmptyDocument(identity, workspaceName, workspaceAvatar));
    const docId = handle.documentId;
    saveDocumentId(storagePrefix, docId);

    // Push new hash so back button returns to previous board
    const url = new URL(window.location.href);
    url.hash = `doc=${docId}`;
    window.history.pushState(null, '', url.toString());
    setDocumentId(docId);
  };

  // Show loading while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Retry loading the failed document
  const handleRetry = () => {
    if (failedDocId && retryCount < MAX_RETRY_ATTEMPTS) {
      console.log(`[AppShell] Retrying document load (attempt ${retryCount + 2}/${MAX_RETRY_ATTEMPTS})`);
      setRetryCount((prev) => prev + 1);
      setLoadError(null);
      setIsInitializing(true);
      // Re-trigger initialization
      initializeDocument();
    }
  };

  // Show error screen with recovery option
  if (loadError) {
    const canRetry = failedDocId && retryCount < MAX_RETRY_ATTEMPTS - 1;

    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="card-title justify-center text-error">Fehler beim Laden</h2>
            <p className="text-base-content/70 mb-4">{loadError}</p>

            {/* Debug info */}
            <div className="text-xs text-base-content/50 mb-4 font-mono bg-base-200 p-2 rounded">
              <div>Versuch: {retryCount + 1}/{MAX_RETRY_ATTEMPTS}</div>
              {failedDocId && <div className="truncate">Doc: {failedDocId.substring(0, 40)}...</div>}
            </div>

            <div className="card-actions justify-center flex-col gap-2">
              {canRetry && (
                <button
                  className="btn btn-warning w-full"
                  onClick={handleRetry}
                >
                  Erneut versuchen ({MAX_RETRY_ATTEMPTS - retryCount - 1} Versuche übrig)
                </button>
              )}
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  // Clear URL hash and storage, then reload to create new document
                  clearDocumentId(storagePrefix);
                  window.location.hash = '';
                  window.location.reload();
                }}
              >
                Neues Dokument erstellen
              </button>
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={() => {
                  // Just reload and try again with current URL
                  window.location.reload();
                }}
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check - should not happen after initialization
  if (!documentId || !currentUserDid) {
    return <LoadingScreen />;
  }

  return (
    <RepoContext.Provider value={repo}>
      {children({
        documentId,
        currentUserDid,
        privateKey,
        publicKey,
        displayName,
        onResetIdentity: handleResetIdentity,
        onNewDocument: handleNewDocument,
        // User Document (only if enabled)
        ...(enableUserDocument && {
          userDocId,
          userDocHandle,
        }),
      })}
    </RepoContext.Provider>
  );
}
