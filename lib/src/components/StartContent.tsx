/**
 * StartContent - Content area for start state (no workspace loaded)
 *
 * Introduces users to the Web of Trust concept and invites them to:
 * - Set up their profile
 * - Build their Web of Trust (verify friends)
 * - Start workspaces
 */

import { useState } from 'react';
import { UserAvatar } from './UserAvatar';

export interface StartContentProps {
  /** Callback when user wants to create a new workspace */
  onCreateWorkspace: (name: string, avatar?: string) => void;
  /** Callback to open own profile for editing */
  onOpenProfile: () => void;
  /** Callback to open QR scanner */
  onOpenScanner: () => void;
  /** Callback to show own QR code (opens profile) */
  onShowMyQR: () => void;
  /** Current user's identity */
  identity: {
    did: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export function StartContent({
  onCreateWorkspace,
  onOpenProfile,
  onOpenScanner,
  onShowMyQR,
  identity,
}: StartContentProps) {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const handleCreateSubmit = () => {
    const trimmed = workspaceName.trim();
    if (!trimmed) {
      onCreateWorkspace('Neuer Workspace');
    } else {
      onCreateWorkspace(trimmed);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex justify-center p-4 py-8">
      <div className="max-w-md w-full pb-16">
        {/* Welcome Header with Web of Trust explanation */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4">
            Willkommen im{' '}<br className="sm:hidden" /><span className="whitespace-nowrap">Web of Trust</span>
          </h1>
            <p className="text-sm text-base-content/70">
              Hier kannst du Inhalte{' '}<br className="sm:hidden" />gezielt mit vertrauten Personen teilen.
            </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-semibold">Dein Profil</span>
              </div>
              <p className="text-sm text-base-content/60 mb-3">
                Fülle dein Profil aus, damit andere dich erkennen können.
              </p>
              <div className="flex items-center gap-4">
                <UserAvatar
                  did={identity.did}
                  avatarUrl={identity.avatarUrl}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {identity.displayName || 'Unbenannt'}
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={onOpenProfile}
                >
                  Bearbeiten
                </button>
              </div>
            </div>
          </div>

          {/* Info: Web of Trust */}
          <p className="text-sm text-base-content/70 text-center px-4">
            Mit dem Web of Trust baust du ein persönliches Vertrauensnetzwerk auf – so kannst du Inhalte gezielt mit vertrauten Personen teilen.
          </p>

          {/* Web of Trust Card */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="font-semibold">Web of Trust aufbauen</span>
              </div>
              <p className="text-sm text-base-content/60 mb-3">
                Verifiziere Freunde per QR-Code, um sie deinem Netzwerk hinzuzufügen.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn btn-primary flex-col h-auto py-3 gap-1"
                  onClick={onOpenScanner}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="text-sm">QR scannen</span>
                </button>
                <button
                  className="btn btn-outline flex-col h-auto py-3 gap-1"
                  onClick={onShowMyQR}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="text-sm">Mein QR zeigen</span>
                </button>
              </div>
            </div>
          </div>

          {/* Info: Workspace */}
          <p className="text-sm text-base-content/70 text-center px-4">
            Ein Workspace ist ein geteilter Raum, wo alle Teilnehmer gemeinsam arbeiten und den gleichen Content sehen.
          </p>

          {/* Workspace Card */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-semibold">Workspace</span>
              </div>
              {!showCreateInput ? (
                <>
                  <p className="text-sm text-base-content/60 mb-3">
                    Trete einem Workspace über einen Einladungslink bei oder erstelle einen neuen.
                  </p>
                  <button
                    className="btn btn-outline w-full gap-3"
                    onClick={() => setShowCreateInput(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-semibold">Workspace erstellen</span>
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Name des Workspace (optional)"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost flex-1"
                      onClick={() => {
                        setShowCreateInput(false);
                        setWorkspaceName('');
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      onClick={handleCreateSubmit}
                    >
                      Erstellen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom spacer for mobile */}
        <div className="h-8" />
      </div>
    </div>
  );
}
