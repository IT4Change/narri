import { useEffect, useRef, useState } from 'react';
import { DocumentId } from '@automerge/automerge-repo';
import { useRepo } from '@automerge/automerge-repo-react-hooks';
import { ProfileModal, CollaboratorsModal, UserAvatar, addTrustAttestation } from 'narrative-ui';
import { useMapDocument } from '../hooks/useMapDocument';
import type { MapDoc } from '../schema/map-data';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  documentId: DocumentId;
  currentUserDid: string;
  privateKey?: string;
  publicKey?: string;
  displayName?: string;
  onResetIdentity: () => void;
  onNewDocument: () => void;
}

/**
 * Main map view component
 */
export function MapView({
  documentId,
  currentUserDid,
  privateKey,
  publicKey,
  displayName,
  onResetIdentity,
  onNewDocument,
}: MapViewProps) {
  const repo = useRepo();
  const docHandle = repo.find<MapDoc>(documentId);
  const mapData = useMapDocument(
    documentId,
    docHandle,
    currentUserDid,
    privateKey,
    publicKey,
    displayName
  );

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [hiddenUserDids, setHiddenUserDids] = useState<Set<string>>(new Set());

  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Force Leaflet to recalculate map size
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      // Clear all markers when map is destroyed
      markersRef.current.clear();
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers for hidden users or deleted locations
    currentMarkers.forEach((marker, locationId) => {
      const location = mapData.locations.find((loc) => loc.id === locationId);
      if (!location || hiddenUserDids.has(location.userDid)) {
        marker.remove();
        currentMarkers.delete(locationId);
      }
    });

    // Add or update markers
    mapData.locations.forEach((location) => {
      if (!location || hiddenUserDids.has(location.userDid)) return;

      const existingMarker = currentMarkers.get(location.id);
      const userName =
        mapData.doc.identities[location.userDid]?.displayName ||
        'Anonymous';
      const isCurrentUser = location.userDid === currentUserDid;

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLatLng([location.lat, location.lng]);
        existingMarker.setPopupContent(
          `<b>${userName}</b>${isCurrentUser ? ' (You)' : ''}${location.label ? '<br>' + location.label : ''}`
        );
      } else {
        // Create new marker
        const marker = L.marker([location.lat, location.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${isCurrentUser ? '#3b82f6' : '#ef4444'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .addTo(map)
          .bindPopup(
            `<b>${userName}</b>${isCurrentUser ? ' (You)' : ''}${location.label ? '<br>' + location.label : ''}`
          );

        currentMarkers.set(location.id, marker);
      }
    });
  }, [mapData?.locations, mapData?.doc, hiddenUserDids, currentUserDid]);

  // Handle placing marker mode
  useEffect(() => {
    if (!mapRef.current || !isPlacingMarker) return;

    const map = mapRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const label = prompt('Optional label for your location:');
      mapData?.setMyLocation(lat, lng, label || undefined);
      setIsPlacingMarker(false);
    };

    map.on('click', handleMapClick);

    // Change cursor
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
    };
  }, [isPlacingMarker, mapData]);

  if (!mapData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading document...</p>
        </div>
      </div>
    );
  }

  const handleShareClick = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    });
  };

  const handleExportIdentity = () => {
    const savedIdentity = localStorage.getItem('mapIdentity');
    if (!savedIdentity) return;

    const blob = new Blob([savedIdentity], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-identity-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportIdentity = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const identity = JSON.parse(event.target?.result as string);
          if (identity.did && identity.displayName) {
            localStorage.setItem('mapIdentity', JSON.stringify(identity));
            window.location.reload();
          } else {
            alert('Invalid identity file');
          }
        } catch (error) {
          alert('Error reading identity file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleZoomToMyLocation = () => {
    const myLocation = mapData.getMyLocation();
    if (myLocation && mapRef.current) {
      mapRef.current.setView([myLocation.lat, myLocation.lng], 10);
    }
  };

  const toggleUserVisibility = (did: string) => {
    setHiddenUserDids((prev) => {
      const next = new Set(prev);
      if (next.has(did)) {
        next.delete(did);
      } else {
        next.add(did);
      }
      return next;
    });
  };

  const handleTrustUser = (trusteeDid: string) => {
    console.log('handleTrustUser called', { currentUserDid, trusteeDid });
    docHandle.change((d) => {
      console.log('Before addTrustAttestation:', Object.keys(d.trustAttestations).length);
      const attestationId = addTrustAttestation(
        d,
        currentUserDid,
        trusteeDid,
        'verified',
        'in-person'
      );
      console.log('After addTrustAttestation:', { attestationId, count: Object.keys(d.trustAttestations).length });
      d.lastModified = Date.now();
    });
  };

  const myLocation = mapData.getMyLocation();

  return (
    <div className="w-screen h-screen bg-base-200 flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="navbar bg-base-100 text-base-content shadow-lg z-[600] flex-shrink-0">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl flex items-center gap-2">
            <img src={logoUrl} alt="Narrative Map" className="h-12 pb-2 text-current" />
            <span>Narrative Map</span>
          </a>
        </div>
        <div className="flex-none gap-2">
          <div className="flex items-center gap-2">
            <button
              className="w-11 h-11 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setShowIdentityModal(true)}
              title="Profil öffnen"
            >
              <UserAvatar
                did={currentUserDid}
                avatarUrl={mapData?.doc?.identities?.[currentUserDid]?.avatarUrl}
                size={44}
              />
            </button>
            <span className="hidden lg:block font-medium">
              {mapData?.doc?.identities?.[currentUserDid]?.displayName || 'Anonymous'}
            </span>
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-6 w-52 p-2 shadow">
              <li>
                <a onClick={() => setShowIdentityModal(true)}>
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profil
                </a>
              </li>
              <li>
                <a onClick={() => setShowCollaboratorsModal(true)}>
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Collaborators
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Stats Panel - Floating */}
        <div className="absolute top-4 right-4 z-[550] bg-base-100 text-base-content p-4 rounded-lg shadow-lg">
          <div className="text-sm">
            <div className="font-bold mb-2">Map Stats</div>
            <div>📍 {mapData.locations.length} locations</div>
            <div>👥 {Object.keys(mapData.doc.identities).length} users</div>
          </div>
        </div>

        {/* Control Panel - Floating */}
        <div className="absolute bottom-24 right-6 z-[550] flex flex-col gap-2">
          <button
            className={`btn ${isPlacingMarker ? 'btn-primary' : 'btn-neutral'} shadow-lg shadow-black/30`}
            onClick={() => setIsPlacingMarker(!isPlacingMarker)}
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {isPlacingMarker ? 'Click on map...' : myLocation ? 'Update Location' : 'Set Location'}
          </button>

          {myLocation && (
            <>
              <button
                className="btn btn-neutral shadow-lg shadow-black/30"
                onClick={handleZoomToMyLocation}
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                  />
                </svg>
                Find Me
              </button>

              <button
                className="btn btn-error shadow-lg shadow-black/30"
                onClick={() => {
                  if (confirm('Remove your location from the map?')) {
                    mapData.removeMyLocation();
                  }
                }}
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
                Remove Location
              </button>
            </>
          )}
        </div>
      </div>

      {/* Board Menu FAB */}
      <div className="fixed bottom-6 left-6 z-[550]">
        <div className="dropdown dropdown-top">
          <div tabIndex={0} role="button" className="btn btn-neutral shadow-lg shadow-black/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Doc
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content bg-neutral text-white rounded-box z-[1] mb-3 w-36 p-2 shadow-xl">
            <li>
              <a onClick={onNewDocument}>
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
                    d="M12 6v12m6-6H6"
                  />
                </svg>
                New Map
              </a>
            </li>
            <li>
              <a onClick={handleShareClick}>
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Identity Modal */}
      <ProfileModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        currentUserDid={currentUserDid}
        doc={mapData.doc}
        onUpdateIdentity={mapData.updateIdentity}
        onExportIdentity={handleExportIdentity}
        onImportIdentity={handleImportIdentity}
        onResetId={onResetIdentity}
        initialDisplayName={displayName}
      />

      {/* Collaborators Modal */}
      <CollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        doc={mapData.doc}
        currentUserDid={currentUserDid}
        hiddenUserDids={hiddenUserDids}
        onToggleUserVisibility={toggleUserVisibility}
        onTrustUser={handleTrustUser}
      />

      {/* Toast for copied URL */}
      {showCopiedToast && (
        <div className="toast toast-end">
          <div className="alert alert-success">
            <span>✓ Link copied to clipboard!</span>
          </div>
        </div>
      )}
    </div>
  );
}
