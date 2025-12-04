import { useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { QRScannerModal } from './QRScannerModal';
import type { BaseDocument } from '../schema/document';
import { getTrustAttestation } from '../schema/document';

interface CollaboratorsModalProps<TData = unknown> {
  isOpen: boolean;
  onClose: () => void;
  doc: BaseDocument<TData>;
  currentUserDid: string;
  hiddenUserDids: Set<string>;
  onToggleUserVisibility: (did: string) => void;
  onTrustUser: (did: string) => void;
}

export function CollaboratorsModal<TData = unknown>({
  isOpen,
  onClose,
  doc,
  currentUserDid,
  hiddenUserDids,
  onToggleUserVisibility,
  onTrustUser,
}: CollaboratorsModalProps<TData>) {
  const [showScanner, setShowScanner] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-[9999]">
      <div className="modal-box max-w-2xl">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3 className="font-bold text-lg mb-4">Collaborators</h3>
        <p className="text-sm text-base-content/60 mb-2">
          Uncheck to hide all contributions (assumptions, votes, edits) from a user.
        </p>

        {/* Scan QR Button */}
        <button
          className="btn btn-primary btn-sm w-full mb-4"
          onClick={() => setShowScanner(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          Scan QR Code to Verify
        </button>
        <div className="space-y-2">
          {Object.entries(doc.identities).map(([did, profile]) => {
            const isTrusted = getTrustAttestation(doc, currentUserDid, did) !== undefined;

            return (
              <div
                key={did}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  did === currentUserDid ? 'border-primary bg-primary/5' : 'border-base-300'
                } ${hiddenUserDids.has(did) ? 'opacity-50' : ''}`}
              >
                <div className="w-12 h-12 flex-shrink-0 relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <UserAvatar
                      did={did}
                      avatarUrl={profile.avatarUrl}
                      size={48}
                    />
                  </div>
                  {isTrusted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-base-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-success-content"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold truncate">
                      {profile.displayName || 'Anonymous'}
                    </div>
                    {did === currentUserDid && (
                      <span className="badge badge-primary badge-sm">You</span>
                    )}
                    {isTrusted && did !== currentUserDid && (
                      <span className="badge badge-success badge-sm gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-base-content/60 break-all">{did}</code>
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text">Show</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={!hiddenUserDids.has(did)}
                      onChange={() => onToggleUserVisibility(did)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(doc.identities).length === 0 && (
          <div className="text-center py-8 text-base-content/60">
            No collaborators yet
          </div>
        )}
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        currentUserDid={currentUserDid}
        doc={doc}
        onTrustUser={onTrustUser}
      />
    </div>
  );
}
