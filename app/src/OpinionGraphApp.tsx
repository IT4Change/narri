import { useRepo } from '@automerge/automerge-repo-react-hooks';
import { useEffect, useState } from 'react';
import { createEmptyDoc, generateId, type UserIdentity } from 'opinion-graph-ui';
import { MainView } from './components/MainView';
import { LoadingScreen } from './components/LoadingScreen';
import { DocumentId } from '@automerge/automerge-repo';

/**
 * Main Opinion Graph Application
 * Handles Automerge document initialization and identity
 */
export function OpinionGraphApp() {
  const repo = useRepo();
  const [documentId, setDocumentId] = useState<DocumentId | null>(null);
  const [currentUserDid, setCurrentUserDid] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeDocument();
  }, []);

  const initializeDocument = async () => {
    // Check URL for shared document ID (e.g., #doc=automerge:...)
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const urlDocId = urlParams.get('doc');

    // Try to load existing document from URL, then localStorage
    const savedDocId = localStorage.getItem('opinionGraphDocId');
    const savedIdentity = localStorage.getItem('opinionGraphIdentity');

    // Each browser needs its own identity
    let identity: UserIdentity;
    if (savedIdentity) {
      identity = JSON.parse(savedIdentity);
    } else {
      identity = {
        did: `did:key:${generateId()}`,
        displayName: `User-${Math.random().toString(36).substring(7)}`,
      };
      localStorage.setItem('opinionGraphIdentity', JSON.stringify(identity));
    }
    setCurrentUserDid(identity.did);

    const docIdToUse = urlDocId || savedDocId;

    if (docIdToUse) {
      // Load existing document (from URL or localStorage)
      setDocumentId(docIdToUse as DocumentId);
      localStorage.setItem('opinionGraphDocId', docIdToUse);

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
      localStorage.setItem('opinionGraphDocId', docId);
      window.location.hash = `doc=${docId}`;

      setDocumentId(docId);
      setIsInitializing(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('opinionGraphDocId');
    localStorage.removeItem('opinionGraphIdentity');
    window.location.reload();
  };

  // Show loading while initializing
  if (isInitializing || !documentId || !currentUserDid) {
    return <LoadingScreen />;
  }

  return <MainView documentId={documentId} currentUserDid={currentUserDid} onReset={handleReset} />;
}