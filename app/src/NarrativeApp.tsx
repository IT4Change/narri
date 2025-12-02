import { useRepo } from '@automerge/automerge-repo-react-hooks';
import { useEffect, useState } from 'react';
import {
  createEmptyDoc,
  type UserIdentity,
  generateDidIdentity,
  isFakeDid,
} from 'narrative-ui';
import { MainView } from './components/MainView';
import { LoadingScreen } from './components/LoadingScreen';
import { DocumentId } from '@automerge/automerge-repo';

/**
 * Main Narrative application
 * Handles Automerge document initialization and identity
 */
export function NarrativeApp() {
  const repo = useRepo();
  const [documentId, setDocumentId] = useState<DocumentId | null>(null);
  const [currentUserDid, setCurrentUserDid] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | undefined>(undefined);
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeDocument();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const newDocId = params.get('doc');
      if (newDocId && newDocId !== documentId) {
        setDocumentId(newDocId as DocumentId);
        localStorage.setItem('narrativeDocId', newDocId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [documentId]);

  const initializeDocument = async () => {
    // Check URL for shared document ID (e.g., #doc=automerge:...)
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const urlDocId = urlParams.get('doc');

    // Try to load existing document from URL, then localStorage
    const savedDocId = localStorage.getItem('narrativeDocId');
    const savedIdentityJson = localStorage.getItem('narrativeIdentity');

    // Migration: Check for fake DIDs and reset
    if (savedIdentityJson) {
      const savedIdentity = JSON.parse(savedIdentityJson);
      if (isFakeDid(savedIdentity.did)) {
        console.warn('Detected fake DID. Upgrading to real DIDs. Clearing localStorage...');
        localStorage.removeItem('narrativeIdentity');
        localStorage.removeItem('narrativeDocId');
        alert('Upgraded to secure DIDs. Your identity has been reset. Please create a new board.');
        window.location.hash = '';
        window.location.reload();
        return;
      }
    }

    // Each browser needs its own identity
    let identity: UserIdentity & { privateKey?: string };
    if (savedIdentityJson) {
      identity = JSON.parse(savedIdentityJson);
    } else {
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
      localStorage.setItem('narrativeIdentity', JSON.stringify(identity));
    }
    setCurrentUserDid(identity.did);
    setPrivateKey(identity.privateKey); // Set private key for signing
    setPublicKey(identity.publicKey); // Set public key for identity verification
    setDisplayName(identity.displayName); // Set display name for identity

    const docIdToUse = urlDocId || savedDocId;

    if (docIdToUse) {
      // Load existing document (from URL or localStorage)
      setDocumentId(docIdToUse as DocumentId);
      localStorage.setItem('narrativeDocId', docIdToUse);

      // Update URL if not already there
      if (!urlDocId) {
        window.location.hash = `doc=${docIdToUse}`;
      }

      setIsInitializing(false);
    } else {
      // Create new document with current user's identity
      const handle = repo.create(createEmptyDoc(identity));
      const docId = handle.documentId;

      // Save document ID and add to URL
      localStorage.setItem('narrativeDocId', docId);
      window.location.hash = `doc=${docId}`;

      setDocumentId(docId);
      setIsInitializing(false);
    }
  };

  const handleResetId = () => {
    localStorage.removeItem('narrativeIdentity');
    window.location.reload();
  };

  const handleNewBoard = async () => {
    const storedIdentity = localStorage.getItem('narrativeIdentity');
    let identity: UserIdentity;

    if (storedIdentity) {
      identity = JSON.parse(storedIdentity);
    } else {
      // Generate new identity if none exists (shouldn't happen, but safe fallback)
      const didIdentity = await generateDidIdentity(
        `User-${Math.random().toString(36).substring(7)}`
      );
      identity = {
        did: didIdentity.did,
        displayName: didIdentity.displayName,
        publicKey: didIdentity.publicKey,
      };
      localStorage.setItem('narrativeIdentity', JSON.stringify({
        ...identity,
        privateKey: didIdentity.privateKey,
      }));
    }

    const handle = repo.create(createEmptyDoc(identity));
    const docId = handle.documentId;
    localStorage.setItem('narrativeDocId', docId);

    // Push new hash so back button returns to previous board
    const url = new URL(window.location.href);
    url.hash = `doc=${docId}`;
    window.history.pushState(null, '', url.toString());
    setDocumentId(docId);
  };

  // Show loading while initializing
  if (isInitializing || !documentId || !currentUserDid) {
    return <LoadingScreen />;
  }

  return (
    <MainView
      documentId={documentId}
      currentUserDid={currentUserDid}
      privateKey={privateKey}
      publicKey={publicKey}
      displayName={displayName}
      onResetId={handleResetId}
      onNewBoard={handleNewBoard}
    />
  );
}
