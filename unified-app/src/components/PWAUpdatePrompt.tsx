/**
 * PWAUpdatePrompt - Shows a toast when a new version is available
 *
 * This component handles the "prompt" update strategy for PWA.
 * When a new service worker is available, it shows a notification
 * allowing the user to update immediately.
 */

import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);

      // Check for updates every 5 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  const handleUpdate = () => {
    // Update service worker and reload
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="toast toast-end toast-bottom z-[10000]">
      <div className="alert alert-info shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <div>
          <h3 className="font-bold">Update verfügbar</h3>
          <p className="text-sm">Eine neue Version ist verfügbar.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>
            Später
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleUpdate}>
            Jetzt updaten
          </button>
        </div>
      </div>
    </div>
  );
}
