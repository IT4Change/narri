/**
 * UserListItem - Reusable component for displaying a user in a list
 *
 * Used by ParticipantsModal and CollaboratorsModal for consistent user display.
 * Clicking on the user opens their profile.
 */

import { UserAvatar } from './UserAvatar';
import { getDefaultDisplayName } from '../utils/did';
import type { TrustAttestation } from '../schema/identity';

type SignatureStatus = 'valid' | 'invalid' | 'missing' | 'pending';

export interface UserListItemProps {
  /** User's DID */
  did: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Current user's DID (for "You" badge) */
  currentUserDid: string;
  /** Whether this user is hidden */
  isHidden?: boolean;
  /** Outgoing trust (you trust them) */
  outgoingTrust?: TrustAttestation | null;
  /** Incoming trust (they trust you) */
  incomingTrust?: TrustAttestation | null;
  /** Signature status for outgoing trust */
  outgoingSignatureStatus?: SignatureStatus;
  /** Signature status for incoming trust */
  incomingSignatureStatus?: SignatureStatus;
  /** Profile signature status (from TrustedUserProfile) */
  profileSignatureStatus?: SignatureStatus;
  /** Callback when user is clicked (opens profile) */
  onUserClick?: (did: string) => void;
  /** Toggle visibility callback */
  onToggleVisibility?: (did: string) => void;
  /** Show visibility toggle */
  showVisibilityToggle?: boolean;
  /** Show trust badges */
  showTrustBadges?: boolean;
  /** Compact mode (smaller) */
  compact?: boolean;
}

export function UserListItem({
  did,
  displayName,
  avatarUrl,
  currentUserDid,
  isHidden = false,
  outgoingTrust,
  incomingTrust,
  outgoingSignatureStatus,
  incomingSignatureStatus,
  profileSignatureStatus,
  onUserClick,
  onToggleVisibility,
  showVisibilityToggle = false,
  showTrustBadges = true,
  compact = false,
}: UserListItemProps) {
  const isCurrentUser = did === currentUserDid;
  const isBidirectional = !!outgoingTrust && !!incomingTrust;
  const hasOutgoingTrust = !!outgoingTrust;
  const hasIncomingTrust = !!incomingTrust;

  // Determine effective display name: use DID-based name if profile is invalid
  const isProfileInvalid = profileSignatureStatus === 'invalid';
  const effectiveDisplayName = isProfileInvalid
    ? getDefaultDisplayName(did)
    : (displayName || getDefaultDisplayName(did));

  // Effective avatar: hide if profile is invalid
  const effectiveAvatarUrl = isProfileInvalid ? undefined : avatarUrl;

  const handleClick = () => {
    if (onUserClick) {
      onUserClick(did);
    }
  };

  const avatarSize = compact ? 36 : 48;

  return (
    <div
      className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-3'} rounded-lg border ${
        isCurrentUser ? 'border-primary bg-primary/5' : 'border-base-300'
      } ${isHidden ? 'opacity-50' : ''} ${
        !hasOutgoingTrust && !isCurrentUser && showTrustBadges ? 'opacity-40 grayscale-[30%]' : ''
      } ${onUserClick ? 'cursor-pointer hover:bg-base-200 transition-colors' : ''}`}
      onClick={handleClick}
    >
      {/* Avatar with trust indicator */}
      <div className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} flex-shrink-0 relative`}>
        <div className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} rounded-full overflow-hidden`}>
          <UserAvatar did={did} avatarUrl={effectiveAvatarUrl} size={avatarSize} />
        </div>
        {showTrustBadges && isBidirectional && (
          <div className={`absolute -bottom-1 -right-1 ${compact ? 'w-5 h-5' : 'w-6 h-6'} bg-success rounded-full flex items-center justify-center border-2 border-base-100`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-success-content`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {showTrustBadges && hasOutgoingTrust && !isBidirectional && (
          <div className={`absolute -bottom-1 -right-1 ${compact ? 'w-5 h-5' : 'w-6 h-6'} bg-info rounded-full flex items-center justify-center border-2 border-base-100`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-info-content`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        )}
        {showTrustBadges && hasIncomingTrust && !isBidirectional && !hasOutgoingTrust && (
          <div className={`absolute -bottom-1 -right-1 ${compact ? 'w-5 h-5' : 'w-6 h-6'} bg-warning rounded-full flex items-center justify-center border-2 border-base-100`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-warning-content`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
          </div>
        )}
      </div>

      {/* Name and badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`font-semibold truncate ${compact ? 'text-sm' : ''}`}>
            {effectiveDisplayName}
          </div>
          {isCurrentUser && (
            <span className={`badge badge-primary ${compact ? 'badge-xs' : 'badge-sm'}`}>Du</span>
          )}
          {showTrustBadges && isBidirectional && !isCurrentUser && (
            <span className={`badge badge-success ${compact ? 'badge-xs' : 'badge-sm'} gap-1`}>
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
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Gegenseitig
            </span>
          )}
          {showTrustBadges && hasOutgoingTrust && !isBidirectional && !isCurrentUser && (
            <span className={`badge badge-info ${compact ? 'badge-xs' : 'badge-sm'} gap-1`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Du vertraust
            </span>
          )}
          {showTrustBadges && hasIncomingTrust && !isBidirectional && !isCurrentUser && (
            <span className={`badge badge-warning ${compact ? 'badge-xs' : 'badge-sm'} gap-1`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Vertraut dir
            </span>
          )}
          {/* Signature status indicators */}
          {showTrustBadges && !isCurrentUser && (
            <>
              {hasOutgoingTrust && outgoingSignatureStatus === 'valid' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1" data-tip="Deine Signatur verifiziert">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
              )}
              {hasOutgoingTrust && outgoingSignatureStatus === 'invalid' && (
                <span className="tooltip tooltip-top badge badge-error badge-xs gap-1" data-tip="Deine Signatur ungültig!">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
              )}
              {hasOutgoingTrust && outgoingSignatureStatus === 'missing' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1 opacity-50" data-tip="Deine Signatur fehlt (Legacy)">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              {hasIncomingTrust && incomingSignatureStatus === 'valid' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1" data-tip={`${effectiveDisplayName}s Signatur verifiziert`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              {hasIncomingTrust && incomingSignatureStatus === 'invalid' && (
                <span className="tooltip tooltip-top badge badge-error badge-xs gap-1" data-tip={`${effectiveDisplayName}s Signatur ungültig!`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              {hasIncomingTrust && incomingSignatureStatus === 'missing' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1 opacity-50" data-tip={`${effectiveDisplayName}s Signatur fehlt (Legacy)`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </>
          )}
          {/* Profile signature status badge */}
          {!isCurrentUser && profileSignatureStatus && (
            <>
              {profileSignatureStatus === 'valid' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1" data-tip="Profil verifiziert">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              {profileSignatureStatus === 'invalid' && (
                <span className="tooltip tooltip-top badge badge-error badge-xs gap-1" data-tip="Profil manipuliert!">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
              )}
              {profileSignatureStatus === 'missing' && (
                <span className="tooltip tooltip-top badge badge-ghost badge-xs gap-1 opacity-50" data-tip="Profil nicht signiert (Legacy)">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              )}
            </>
          )}
        </div>
        {!compact && (
          <code className="text-xs text-base-content/60 break-all">{did}</code>
        )}
      </div>

      {/* Visibility toggle */}
      {showVisibilityToggle && onToggleVisibility && (
        <div className="form-control" onClick={(e) => e.stopPropagation()}>
          <label className="label cursor-pointer gap-2">
            <span className="label-text">Show</span>
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={!isHidden}
              onChange={() => onToggleVisibility(did)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
