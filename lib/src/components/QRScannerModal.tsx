import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import type { BaseDocument } from '../schema/document';
import { UserAvatar } from './UserAvatar';

interface QRScannerModalProps<TData = unknown> {
  isOpen: boolean;
  onClose: () => void;
  currentUserDid: string;
  doc: BaseDocument<TData>;
  onTrustUser: (did: string) => void;
}

export function QRScannerModal<TData = unknown>({
  isOpen,
  onClose,
  currentUserDid,
  doc,
  onTrustUser,
}: QRScannerModalProps<TData>) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannedDid, setScannedDid] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Start scanner when modal opens
  useEffect(() => {
    if (!isOpen || scannedDid) return;

    const startScanner = async () => {
      try {
        setIsScanning(true);
        setScanError('');

        // Create scanner instance
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        // Start scanning
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Parse the scanned QR code
            const match = decodedText.match(/narrative:\/\/verify\/(.+)/);
            if (match && match[1]) {
              const did = match[1];
              setScannedDid(did);
              setIsScanning(false);
              // Just stop scanning, don't clear yet
              scanner.stop().catch(console.error);
            } else {
              setScanError('Invalid QR code. Please scan a Narrative verification QR code.');
            }
          },
          (errorMessage) => {
            // Ignore common scanning errors
            if (!errorMessage.includes('NotFoundException')) {
              console.warn('QR Scan error:', errorMessage);
            }
          }
        );
      } catch (error) {
        console.error('Failed to start scanner:', error);
        setScanError('Failed to access camera. Please check permissions.');
        setIsScanning(false);
      }
    };

    startScanner();

    // Cleanup - only when modal closes
    return () => {
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        try {
          const state = currentScanner.getState();
          // Only try to stop if actually scanning
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            currentScanner.stop().catch(() => {});
          }
          currentScanner.clear();
        } catch (error) {
          // Ignore errors during cleanup
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    // Stop and clear scanner if it exists
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // Only try to stop if actually scanning
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScannedDid(null);
    setScanError('');
    setIsScanning(false);
    onClose();
  };

  const handleTrust = () => {
    console.log('[QRScannerModal] handleTrust called', {
      scannedDid,
      currentUserDid,
      hasOnTrustUser: !!onTrustUser
    });
    if (scannedDid) {
      console.log('[QRScannerModal] Calling onTrustUser with:', scannedDid);
      onTrustUser(scannedDid);
      console.log('[QRScannerModal] onTrustUser returned, closing modal');
      handleClose();
    } else {
      console.warn('[QRScannerModal] handleTrust called but no scannedDid!');
    }
  };

  if (!isOpen) return null;

  // Show confirmation dialog after successful scan
  if (scannedDid) {
    const profile = doc.identities[scannedDid];
    const displayName = profile?.displayName || 'Anonymous User';

    return (
      <div className="modal modal-open z-[9999]">
        <div className="modal-box max-w-md">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={handleClose}
          >
            ✕
          </button>

          <h3 className="font-bold text-lg mb-4">Verify Identity</h3>

          <div className="flex flex-col items-center gap-4 p-4 bg-base-200 rounded-lg">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-base-100">
              <UserAvatar
                did={scannedDid}
                avatarUrl={profile?.avatarUrl}
                size={80}
              />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{displayName}</div>
              <div className="text-xs text-base-content/50 break-all mt-2">
                {scannedDid}
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span className="text-sm">
              By trusting this user, you verify their identity. This helps build the web of trust.
            </span>
          </div>

          <div className="modal-action">
            <button className="btn" onClick={handleClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleTrust}>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Verify & Trust
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={handleClose}></div>
      </div>
    );
  }

  // Show scanner view
  return (
    <div className="modal modal-open z-[9999]">
      <div className="modal-box max-w-md">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
          onClick={handleClose}
        >
          ✕
        </button>

        <h3 className="font-bold text-lg mb-4">Scan QR Code</h3>

        <div className="flex flex-col gap-4">
          {/* Scanner container */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <div id="qr-reader" className="w-full"></div>
          </div>

          {scanError && (
            <div className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{scanError}</span>
            </div>
          )}

          <div className="text-sm text-base-content/70 text-center">
            Position the QR code within the frame to scan
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
