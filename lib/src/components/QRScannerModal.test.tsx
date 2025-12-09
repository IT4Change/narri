/**
 * Tests for QRScannerModal component logic
 *
 * These tests verify:
 * - Profile loading state detection
 * - Display name resolution with loading placeholder
 * - Button disabled state during loading
 * - Alert type selection based on loading state
 */

import { describe, it, expect } from 'vitest';
import type { KnownProfile, ProfileSignatureStatus } from '../hooks/useKnownProfiles';

// Type for local signature status used in QRScannerModal
type LocalSignatureStatus = ProfileSignatureStatus | 'loading' | 'waiting' | 'network-error';

/**
 * Helper to check if profile is still loading
 * Mirrors logic in QRScannerModal
 */
function isProfileLoading(
  signatureStatus: LocalSignatureStatus,
  knownProfile: KnownProfile | undefined
): boolean {
  return (
    signatureStatus === 'loading' ||
    signatureStatus === 'waiting' ||
    (knownProfile?.signatureStatus === 'pending' && !knownProfile?.displayName)
  );
}

/**
 * Helper to resolve display name with loading fallback
 * Mirrors logic in QRScannerModal
 */
function resolveDisplayName(
  knownProfile: KnownProfile | undefined,
  loadedProfile: { displayName?: string; avatarUrl?: string } | null,
  workspaceProfile: { displayName?: string; avatarUrl?: string } | undefined,
  loading: boolean,
  fallbackDid: string
): string {
  return (
    knownProfile?.displayName ||
    loadedProfile?.displayName ||
    workspaceProfile?.displayName ||
    (loading ? 'Profil wird geladen' : getDefaultDisplayName(fallbackDid))
  );
}

/**
 * Helper to get default display name from DID
 * Mirrors getDefaultDisplayName in did.ts
 */
function getDefaultDisplayName(did: string): string {
  const shortDid = did.substring(8, 16); // After "did:key:"
  return `User-${shortDid}`;
}

/**
 * Helper to determine alert type based on loading state
 * Mirrors logic in QRScannerModal render
 */
function getAlertType(isLoading: boolean): 'warning' | 'success' {
  return isLoading ? 'warning' : 'success';
}

/**
 * Helper to determine if button should be disabled
 * Mirrors logic in QRScannerModal render
 */
function isButtonDisabled(isLoading: boolean): boolean {
  return isLoading;
}

/**
 * Helper to get alert message based on loading state
 * Mirrors logic in QRScannerModal render
 */
function getAlertMessage(isLoading: boolean, displayName: string): string {
  if (isLoading) {
    return 'Bitte warte während das Profil im Netzwerk gesucht wird!';
  }
  return `Hiermit bestätige ich die Identität von ${displayName} und füge sie in mein Netzwerk hinzu.`;
}

describe('QRScannerModal Loading State', () => {
  describe('isProfileLoading', () => {
    it('should return true when signatureStatus is loading', () => {
      expect(isProfileLoading('loading', undefined)).toBe(true);
    });

    it('should return true when signatureStatus is waiting', () => {
      expect(isProfileLoading('waiting', undefined)).toBe(true);
    });

    it('should return true when knownProfile is pending without displayName', () => {
      const knownProfile: KnownProfile = {
        did: 'did:key:z6MkTest',
        source: 'external',
        signatureStatus: 'pending',
        lastUpdated: Date.now(),
      };

      expect(isProfileLoading('pending', knownProfile)).toBe(true);
    });

    it('should return false when knownProfile is pending but has displayName', () => {
      const knownProfile: KnownProfile = {
        did: 'did:key:z6MkTest',
        displayName: 'Test User',
        source: 'external',
        signatureStatus: 'pending',
        lastUpdated: Date.now(),
      };

      expect(isProfileLoading('pending', knownProfile)).toBe(false);
    });

    it('should return false when signatureStatus is valid', () => {
      const knownProfile: KnownProfile = {
        did: 'did:key:z6MkTest',
        displayName: 'Test User',
        source: 'trust-given',
        signatureStatus: 'valid',
        lastUpdated: Date.now(),
      };

      expect(isProfileLoading('valid', knownProfile)).toBe(false);
    });

    it('should return false when signatureStatus is invalid', () => {
      expect(isProfileLoading('invalid', undefined)).toBe(false);
    });

    it('should return false when signatureStatus is missing', () => {
      expect(isProfileLoading('missing', undefined)).toBe(false);
    });

    it('should return false when signatureStatus is network-error', () => {
      expect(isProfileLoading('network-error', undefined)).toBe(false);
    });
  });
});

describe('QRScannerModal Display Name Resolution', () => {
  describe('resolveDisplayName', () => {
    const testDid = 'did:key:z6MkabcdefghTest';

    it('should prefer knownProfile displayName', () => {
      const knownProfile: KnownProfile = {
        did: testDid,
        displayName: 'Alice (Known)',
        source: 'trust-given',
        signatureStatus: 'valid',
        lastUpdated: Date.now(),
      };

      const result = resolveDisplayName(
        knownProfile,
        { displayName: 'Alice (Loaded)' },
        { displayName: 'Alice (Workspace)' },
        false,
        testDid
      );

      expect(result).toBe('Alice (Known)');
    });

    it('should fallback to loadedProfile when knownProfile has no name', () => {
      const knownProfile: KnownProfile = {
        did: testDid,
        source: 'external',
        signatureStatus: 'pending',
        lastUpdated: Date.now(),
      };

      const result = resolveDisplayName(
        knownProfile,
        { displayName: 'Alice (Loaded)' },
        { displayName: 'Alice (Workspace)' },
        false,
        testDid
      );

      expect(result).toBe('Alice (Loaded)');
    });

    it('should fallback to workspaceProfile when no other names', () => {
      const result = resolveDisplayName(
        undefined,
        null,
        { displayName: 'Alice (Workspace)' },
        false,
        testDid
      );

      expect(result).toBe('Alice (Workspace)');
    });

    it('should show loading placeholder when loading and no names available', () => {
      const result = resolveDisplayName(
        undefined,
        null,
        undefined,
        true,
        testDid
      );

      expect(result).toBe('Profil wird geladen');
    });

    it('should show DID-based fallback when not loading and no names', () => {
      const result = resolveDisplayName(
        undefined,
        null,
        undefined,
        false,
        testDid
      );

      expect(result).toBe('User-z6Mkabcd');
    });

    it('should handle empty displayName as falsy', () => {
      const knownProfile: KnownProfile = {
        did: testDid,
        displayName: '',
        source: 'external',
        signatureStatus: 'pending',
        lastUpdated: Date.now(),
      };

      const result = resolveDisplayName(
        knownProfile,
        { displayName: 'Fallback' },
        undefined,
        false,
        testDid
      );

      expect(result).toBe('Fallback');
    });
  });
});

describe('QRScannerModal Alert Type', () => {
  describe('getAlertType', () => {
    it('should return warning when loading', () => {
      expect(getAlertType(true)).toBe('warning');
    });

    it('should return success when not loading', () => {
      expect(getAlertType(false)).toBe('success');
    });
  });

  describe('getAlertMessage', () => {
    it('should show loading message when loading', () => {
      const message = getAlertMessage(true, 'Alice');

      expect(message).toBe('Bitte warte während das Profil im Netzwerk gesucht wird!');
      expect(message).not.toContain('Alice');
    });

    it('should show confirmation message with name when not loading', () => {
      const message = getAlertMessage(false, 'Alice');

      expect(message).toBe('Hiermit bestätige ich die Identität von Alice und füge sie in mein Netzwerk hinzu.');
      expect(message).toContain('Alice');
    });

    it('should include loading placeholder name in confirmation', () => {
      const message = getAlertMessage(false, 'Profil wird geladen');

      expect(message).toContain('Profil wird geladen');
    });
  });
});

describe('QRScannerModal Button State', () => {
  describe('isButtonDisabled', () => {
    it('should be disabled when loading', () => {
      expect(isButtonDisabled(true)).toBe(true);
    });

    it('should be enabled when not loading', () => {
      expect(isButtonDisabled(false)).toBe(false);
    });
  });
});

describe('QRScannerModal Full Flow', () => {
  describe('initial scan state', () => {
    it('should show loading state immediately after scan', () => {
      const signatureStatus: LocalSignatureStatus = 'loading';
      const knownProfile = undefined;
      const loadedProfile = null;
      const workspaceProfile = undefined;
      const scannedDid = 'did:key:z6MkNewContact';

      const loading = isProfileLoading(signatureStatus, knownProfile);
      const displayName = resolveDisplayName(
        knownProfile,
        loadedProfile,
        workspaceProfile,
        loading,
        scannedDid
      );
      const alertType = getAlertType(loading);
      const buttonDisabled = isButtonDisabled(loading);

      expect(loading).toBe(true);
      expect(displayName).toBe('Profil wird geladen');
      expect(alertType).toBe('warning');
      expect(buttonDisabled).toBe(true);
    });
  });

  describe('profile loaded state', () => {
    it('should show normal state after profile loads', () => {
      const knownProfile: KnownProfile = {
        did: 'did:key:z6MkNewContact',
        displayName: 'New Friend',
        avatarUrl: 'friend-avatar.png',
        source: 'external',
        signatureStatus: 'valid',
        lastUpdated: Date.now(),
      };
      const signatureStatus: LocalSignatureStatus = 'valid';
      const loadedProfile = null;
      const workspaceProfile = undefined;
      const scannedDid = 'did:key:z6MkNewContact';

      const loading = isProfileLoading(signatureStatus, knownProfile);
      const displayName = resolveDisplayName(
        knownProfile,
        loadedProfile,
        workspaceProfile,
        loading,
        scannedDid
      );
      const alertType = getAlertType(loading);
      const buttonDisabled = isButtonDisabled(loading);
      const alertMessage = getAlertMessage(loading, displayName);

      expect(loading).toBe(false);
      expect(displayName).toBe('New Friend');
      expect(alertType).toBe('success');
      expect(buttonDisabled).toBe(false);
      expect(alertMessage).toContain('New Friend');
    });
  });

  describe('network error state', () => {
    it('should allow confirmation even with network error', () => {
      const signatureStatus: LocalSignatureStatus = 'network-error';
      const knownProfile = undefined;
      const loadedProfile = null;
      const workspaceProfile = undefined;
      const scannedDid = 'did:key:z6MkUnreachable';

      const loading = isProfileLoading(signatureStatus, knownProfile);
      const displayName = resolveDisplayName(
        knownProfile,
        loadedProfile,
        workspaceProfile,
        loading,
        scannedDid
      );
      const buttonDisabled = isButtonDisabled(loading);

      // Not considered loading - user can still confirm
      expect(loading).toBe(false);
      expect(displayName).toBe('User-z6MkUnre');
      expect(buttonDisabled).toBe(false);
    });
  });

  describe('workspace fallback state', () => {
    it('should use workspace profile when available', () => {
      const signatureStatus: LocalSignatureStatus = 'missing';
      const knownProfile = undefined;
      const loadedProfile = null;
      const workspaceProfile = { displayName: 'Workspace User', avatarUrl: 'ws-avatar.png' };
      const scannedDid = 'did:key:z6MkWorkspaceUser';

      const loading = isProfileLoading(signatureStatus, knownProfile);
      const displayName = resolveDisplayName(
        knownProfile,
        loadedProfile,
        workspaceProfile,
        loading,
        scannedDid
      );

      expect(loading).toBe(false);
      expect(displayName).toBe('Workspace User');
    });
  });
});

describe('QRScannerModal QR Code Format', () => {
  /**
   * Parse QR code value
   * Format: narrative://verify/{did}?userDoc={encodedUrl}&name={encodedName}
   */
  function parseQRCode(value: string): { did: string; userDocUrl?: string; name?: string } | null {
    const match = value.match(/narrative:\/\/verify\/([^?]+)(\?.*)?/);
    if (!match || !match[1]) {
      return null;
    }

    const did = match[1];
    let userDocUrl: string | undefined;
    let name: string | undefined;

    if (match[2]) {
      const params = new URLSearchParams(match[2]);
      const encodedUrl = params.get('userDoc');
      if (encodedUrl) {
        userDocUrl = decodeURIComponent(encodedUrl);
      }
      const encodedName = params.get('name');
      if (encodedName) {
        name = decodeURIComponent(encodedName);
      }
    }

    return { did, userDocUrl, name };
  }

  /**
   * Generate QR code value
   */
  function generateQRCode(did: string, userDocUrl?: string, name?: string): string {
    const params = new URLSearchParams();
    if (userDocUrl) {
      params.set('userDoc', userDocUrl);
    }
    if (name) {
      params.set('name', name);
    }
    const queryString = params.toString();
    return queryString ? `narrative://verify/${did}?${queryString}` : `narrative://verify/${did}`;
  }

  describe('parseQRCode', () => {
    it('should parse QR code with DID only', () => {
      const result = parseQRCode('narrative://verify/did:key:z6MkTest');

      expect(result).not.toBeNull();
      expect(result?.did).toBe('did:key:z6MkTest');
      expect(result?.userDocUrl).toBeUndefined();
    });

    it('should parse QR code with DID and userDocUrl', () => {
      const userDocUrl = 'automerge:abc123def456';
      const qrValue = `narrative://verify/did:key:z6MkTest?userDoc=${encodeURIComponent(userDocUrl)}`;

      const result = parseQRCode(qrValue);

      expect(result).not.toBeNull();
      expect(result?.did).toBe('did:key:z6MkTest');
      expect(result?.userDocUrl).toBe(userDocUrl);
    });

    it('should return null for invalid QR code', () => {
      expect(parseQRCode('invalid://something')).toBeNull();
      expect(parseQRCode('narrative://other/path')).toBeNull();
      expect(parseQRCode('random string')).toBeNull();
    });

    it('should handle special characters in userDocUrl', () => {
      const userDocUrl = 'automerge:abc+def/ghi?param=value';
      const qrValue = `narrative://verify/did:key:z6MkTest?userDoc=${encodeURIComponent(userDocUrl)}`;

      const result = parseQRCode(qrValue);

      expect(result?.userDocUrl).toBe(userDocUrl);
    });

    it('should parse QR code with DID, userDocUrl and name', () => {
      const userDocUrl = 'automerge:abc123def456';
      const name = 'Alice';
      const qrValue = `narrative://verify/did:key:z6MkTest?userDoc=${encodeURIComponent(userDocUrl)}&name=${encodeURIComponent(name)}`;

      const result = parseQRCode(qrValue);

      expect(result).not.toBeNull();
      expect(result?.did).toBe('did:key:z6MkTest');
      expect(result?.userDocUrl).toBe(userDocUrl);
      expect(result?.name).toBe(name);
    });

    it('should parse QR code with DID and name (no userDocUrl)', () => {
      const name = 'Bob';
      const qrValue = `narrative://verify/did:key:z6MkTest?name=${encodeURIComponent(name)}`;

      const result = parseQRCode(qrValue);

      expect(result).not.toBeNull();
      expect(result?.did).toBe('did:key:z6MkTest');
      expect(result?.userDocUrl).toBeUndefined();
      expect(result?.name).toBe(name);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code with DID only', () => {
      const qrValue = generateQRCode('did:key:z6MkTest');

      expect(qrValue).toBe('narrative://verify/did:key:z6MkTest');
    });

    it('should generate QR code with DID and userDocUrl', () => {
      const userDocUrl = 'automerge:abc123';
      const qrValue = generateQRCode('did:key:z6MkTest', userDocUrl);

      expect(qrValue).toContain('narrative://verify/did:key:z6MkTest?');
      expect(qrValue).toContain(`userDoc=${encodeURIComponent(userDocUrl)}`);
    });

    it('should generate QR code with DID, userDocUrl and name', () => {
      const userDocUrl = 'automerge:abc123';
      const name = 'Alice';
      const qrValue = generateQRCode('did:key:z6MkTest', userDocUrl, name);

      expect(qrValue).toContain('narrative://verify/did:key:z6MkTest?');
      expect(qrValue).toContain(`userDoc=${encodeURIComponent(userDocUrl)}`);
      expect(qrValue).toContain(`name=${encodeURIComponent(name)}`);
    });

    it('should generate QR code with DID and name (no userDocUrl)', () => {
      const name = 'Bob';
      const qrValue = generateQRCode('did:key:z6MkTest', undefined, name);

      expect(qrValue).toBe(`narrative://verify/did:key:z6MkTest?name=${encodeURIComponent(name)}`);
    });

    it('should be reversible with parseQRCode', () => {
      const did = 'did:key:z6MkTest123';
      const userDocUrl = 'automerge:xyz789';
      const name = 'Charlie';

      const qrValue = generateQRCode(did, userDocUrl, name);
      const parsed = parseQRCode(qrValue);

      expect(parsed?.did).toBe(did);
      expect(parsed?.userDocUrl).toBe(userDocUrl);
      expect(parsed?.name).toBe(name);
    });

    it('should handle special characters in name', () => {
      const name = 'Jürgen Müller-Schmidt';
      const qrValue = generateQRCode('did:key:z6MkTest', undefined, name);
      const parsed = parseQRCode(qrValue);

      expect(parsed?.name).toBe(name);
    });
  });
});

describe('QRScannerModal Signature Status Badge', () => {
  type BadgeType = 'loading' | 'valid' | 'invalid' | 'network-error' | 'none';

  /**
   * Determine which badge to show based on signature status
   * Mirrors renderSignatureBadge logic in QRScannerModal
   */
  function getBadgeType(
    effectiveSignatureStatus: ProfileSignatureStatus,
    localSignatureStatus: LocalSignatureStatus
  ): BadgeType {
    if (
      effectiveSignatureStatus === 'pending' ||
      localSignatureStatus === 'loading' ||
      localSignatureStatus === 'waiting'
    ) {
      if (localSignatureStatus === 'loading' || localSignatureStatus === 'waiting') {
        return 'loading';
      }
      return 'none';
    }
    if (effectiveSignatureStatus === 'valid') {
      return 'valid';
    }
    if (effectiveSignatureStatus === 'invalid') {
      return 'invalid';
    }
    if (localSignatureStatus === 'network-error') {
      return 'network-error';
    }
    return 'none';
  }

  describe('getBadgeType', () => {
    it('should show loading badge when local status is loading', () => {
      expect(getBadgeType('pending', 'loading')).toBe('loading');
    });

    it('should show loading badge when local status is waiting', () => {
      expect(getBadgeType('pending', 'waiting')).toBe('loading');
    });

    it('should show valid badge when signature is valid', () => {
      expect(getBadgeType('valid', 'valid')).toBe('valid');
    });

    it('should show invalid badge when signature is invalid', () => {
      expect(getBadgeType('invalid', 'invalid')).toBe('invalid');
    });

    it('should show network-error badge on network error', () => {
      expect(getBadgeType('missing', 'network-error')).toBe('network-error');
    });

    it('should show no badge when status is missing', () => {
      expect(getBadgeType('missing', 'missing')).toBe('none');
    });

    it('should show no badge when pending but not loading', () => {
      expect(getBadgeType('pending', 'pending')).toBe('none');
    });
  });
});
