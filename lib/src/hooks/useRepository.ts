/**
 * Hook for creating and configuring Automerge Repo
 *
 * Provides a reusable way to initialize Automerge repositories
 * with storage and network adapters.
 */

import { useMemo } from 'react';
import { Repo } from '@automerge/automerge-repo';
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

/**
 * Options for repository configuration
 */
export interface RepositoryOptions {
  /**
   * WebSocket sync server URL (single server, for backwards compatibility)
   * Default: 'wss://sync.automerge.org'
   * @deprecated Use `syncServers` array instead for multiple servers
   */
  syncServer?: string;

  /**
   * Array of WebSocket sync server URLs
   * All servers are connected in parallel for redundancy and faster sync.
   * Default: ['wss://sync.automerge.org']
   */
  syncServers?: string[];

  /**
   * Enable BroadcastChannel for same-browser multi-tab sync
   * Default: false (but recommended to set to true for instant cross-tab sync)
   *
   * This provides instant synchronization between tabs in the same browser,
   * without waiting for the WebSocket roundtrip to sync servers.
   */
  enableBroadcastChannel?: boolean;
}

/** Default sync servers for redundancy */
const DEFAULT_SYNC_SERVERS = ['wss://sync.automerge.org'];

/**
 * Hook for creating Automerge repository with browser adapters
 *
 * @param options - Repository configuration options
 * @returns Configured Automerge Repo instance
 *
 * @example
 * ```tsx
 * // Single server (backwards compatible)
 * const repo = useRepository({
 *   syncServer: 'wss://sync.automerge.org',
 * });
 *
 * // Multiple servers for redundancy
 * const repo = useRepository({
 *   syncServers: [
 *     'wss://sync.automerge.org',
 *     'wss://my-custom-server.com',
 *   ],
 * });
 * ```
 */
export function useRepository(options: RepositoryOptions = {}): Repo {
  const {
    syncServer,
    syncServers,
    enableBroadcastChannel = false,
  } = options;

  // Determine which servers to use:
  // 1. If syncServers array is provided, use it
  // 2. Else if syncServer string is provided, use it as single server
  // 3. Else use default servers
  const servers: string[] = syncServers
    ?? (syncServer ? [syncServer] : DEFAULT_SYNC_SERVERS);

  // Create stable key for useMemo dependency
  const serversKey = servers.join(',');

  const repo = useMemo(() => {
    const networkAdapters: BrowserWebSocketClientAdapter[] = [];

    // Create WebSocket adapter for each sync server
    for (const server of servers) {
      if (server) {
        console.log(`[useRepository] Connecting to sync server: ${server}`);
        networkAdapters.push(new BrowserWebSocketClientAdapter(server));
      }
    }

    const newRepo = new Repo({
      storage: new IndexedDBStorageAdapter(),
      network: networkAdapters,
    });

    // BroadcastChannel adapter for same-browser multi-tab sync
    // Provides instant sync between tabs without WebSocket roundtrip
    if (enableBroadcastChannel) {
      // Lazy import to avoid bundling if not used
      import('@automerge/automerge-repo-network-broadcastchannel').then(
        ({ BroadcastChannelNetworkAdapter }) => {
          const adapter = new BroadcastChannelNetworkAdapter();
          newRepo.networkSubsystem.addNetworkAdapter(adapter);
          console.log('[useRepository] BroadcastChannel adapter added');
        }
      );
    }

    console.log(`[useRepository] Repo initialized with ${networkAdapters.length} sync server(s)`);
    return newRepo;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serversKey, enableBroadcastChannel]);

  return repo;
}
