import { useDocument, useDocHandle } from '@automerge/automerge-repo-react-hooks';
import { DocumentId } from '@automerge/automerge-repo';
import type { MapDoc, UserLocation } from '../schema/map-data';
import { generateId } from '../schema/map-data';
import { signEntity } from 'narrative-ui';

/**
 * Main hook for accessing and mutating Map data
 * Uses Automerge CRDT for automatic conflict resolution
 *
 * @param docId - Document ID (can be null while loading)
 */
export function useMapDocument(
  docId: DocumentId | null,
  currentUserDid: string,
  privateKey?: string,
  publicKey?: string,
  displayName?: string
) {
  // In automerge-repo v2.x, useDocHandle handles async loading
  // Handle null docId case - hooks must be called unconditionally
  const docHandle = useDocHandle<MapDoc>(docId ?? undefined);
  const [doc] = useDocument<MapDoc>(docId ?? undefined);

  // Return null if doc or docHandle not ready yet
  if (!docId || !doc || !docHandle) {
    return null;
  }

  // Convert normalized data to arrays for UI
  const locations = Object.values(doc.data.locations);

  /**
   * Ensure current user's identity profile exists in doc.identities
   */
  const ensureIdentityProfile = (d: MapDoc) => {
    if (!d.identities) {
      d.identities = {};
    }

    if (!d.identities[currentUserDid]) {
      d.identities[currentUserDid] = {};
    }

    if (publicKey && !d.identities[currentUserDid].publicKey) {
      d.identities[currentUserDid].publicKey = publicKey;
    }

    if (displayName && !d.identities[currentUserDid].displayName) {
      d.identities[currentUserDid].displayName = displayName;
    }
  };

  /**
   * Set or update current user's location
   */
  const setMyLocation = async (lat: number, lng: number, label?: string) => {
    const now = Date.now();

    // Find existing location for current user
    const existingLocationId = Object.keys(doc.data.locations).find((id) => {
      const loc = doc.data.locations[id];
      return loc && loc.userDid === currentUserDid;
    });

    if (existingLocationId) {
      // Update existing location
      const locationData: any = {
        id: existingLocationId,
        userDid: currentUserDid,
        lat,
        lng,
        label,
        createdAt: doc.data.locations[existingLocationId].createdAt,
        updatedAt: now,
      };

      if (privateKey) {
        try {
          locationData.signature = await signEntity(locationData, privateKey);
        } catch (error) {
          console.error('Failed to sign location:', error);
        }
      }

      docHandle.change((d) => {
        ensureIdentityProfile(d);
        const loc = d.data.locations[existingLocationId];
        if (loc) {
          loc.lat = lat;
          loc.lng = lng;
          if (label !== undefined) loc.label = label;
          loc.updatedAt = now;
          if (locationData.signature) {
            loc.signature = locationData.signature;
          }
        }
        d.lastModified = Date.now();
      });
    } else {
      // Create new location
      const locationId = generateId();
      const locationData: any = {
        id: locationId,
        userDid: currentUserDid,
        lat,
        lng,
        label,
        createdAt: now,
        updatedAt: now,
      };

      if (privateKey) {
        try {
          locationData.signature = await signEntity(locationData, privateKey);
        } catch (error) {
          console.error('Failed to sign location:', error);
        }
      }

      docHandle.change((d) => {
        ensureIdentityProfile(d);
        // Build location object without undefined values (Automerge doesn't allow undefined)
        const newLocation: UserLocation = {
          id: locationId,
          userDid: currentUserDid,
          lat,
          lng,
          createdAt: now,
          updatedAt: now,
        };
        if (label !== undefined) {
          newLocation.label = label;
        }
        if (locationData.signature) {
          newLocation.signature = locationData.signature;
        }
        d.data.locations[locationId] = newLocation;
        d.lastModified = Date.now();
      });
    }
  };

  /**
   * Remove current user's location
   */
  const removeMyLocation = () => {
    docHandle.change((d) => {
      const locationId = Object.keys(d.data.locations).find((id) => {
        const loc = d.data.locations[id];
        return loc && loc.userDid === currentUserDid;
      });

      if (locationId) {
        delete d.data.locations[locationId];
        d.lastModified = Date.now();
      }
    });
  };

  /**
   * Get current user's location
   */
  const getMyLocation = (): UserLocation | null => {
    return (
      locations.find((loc) => loc && loc.userDid === currentUserDid) || null
    );
  };

  /**
   * Update user identity
   */
  const updateIdentity = (updates: Partial<{ displayName?: string; avatarUrl?: string }>) => {
    docHandle.change((d) => {
      ensureIdentityProfile(d);

      if (updates.displayName !== undefined) {
        const profile = d.identities[currentUserDid];
        if (updates.displayName === '') {
          delete profile.displayName;
        } else {
          profile.displayName = updates.displayName;
        }
      }
      if (updates.avatarUrl !== undefined) {
        const profile = d.identities[currentUserDid];
        if (updates.avatarUrl === '') {
          delete profile.avatarUrl;
        } else {
          profile.avatarUrl = updates.avatarUrl;
        }
      }
      d.lastModified = Date.now();
    });
  };

  return {
    doc,
    docHandle,
    currentUserDid,
    locations,
    // Mutations
    setMyLocation,
    removeMyLocation,
    getMyLocation,
    updateIdentity,
  };
}

export type MapDocumentHook = ReturnType<typeof useMapDocument>;
