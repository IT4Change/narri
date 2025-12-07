/**
 * WorkspaceSwitcher - Dropdown for switching between workspaces/documents
 *
 * Shared component for all Narrative apps.
 */

export interface WorkspaceInfo {
  id: string; // DocumentId as string
  name: string;
  avatar?: string;
  lastAccessed: number;
}

interface WorkspaceSwitcherProps {
  currentWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  logoUrl: string;
  onSwitchWorkspace: (workspaceId: string) => void;
  onNewWorkspace: () => void;
  /** Callback to open workspace modal (for current workspace) */
  onOpenWorkspaceModal?: () => void;
}

export function WorkspaceSwitcher({
  currentWorkspace,
  workspaces,
  logoUrl,
  onSwitchWorkspace,
  onNewWorkspace,
  onOpenWorkspaceModal,
}: WorkspaceSwitcherProps) {
  const displayName = currentWorkspace?.name || 'Workspace';

  return (
    <div className="dropdown">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost text-xl flex items-center gap-2"
      >
        {currentWorkspace?.avatar ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <img
              src={currentWorkspace.avatar}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <img src={logoUrl} alt="Narrative" className="h-12 pb-2 text-current" />
        )}
        <span className="hidden sm:inline max-w-[150px] truncate">{displayName}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 opacity-70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[2000] mt-6 w-64 p-2 shadow-lg"
      >
        {/* Current workspace - click opens modal */}
        {currentWorkspace && (
          <>
            <li className="menu-title text-xs opacity-50 px-2 pt-1">
              Aktueller Workspace
            </li>
            <li>
              <a
                className="flex items-center gap-2 bg-base-200"
                onClick={() => onOpenWorkspaceModal?.()}
              >
                {currentWorkspace.avatar ? (
                  <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={currentWorkspace.avatar}
                      alt={currentWorkspace.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {currentWorkspace.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="truncate font-medium flex-1">{currentWorkspace.name}</span>
                {/* Settings icon hint */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            </li>
          </>
        )}

        {/* Other workspaces */}
        {workspaces.filter((w) => w.id !== currentWorkspace?.id).length > 0 && (
          <>
            <li className="menu-title text-xs opacity-50 px-2 pt-3">
              Andere Workspaces
            </li>
            {workspaces
              .filter((w) => w.id !== currentWorkspace?.id)
              .sort((a, b) => b.lastAccessed - a.lastAccessed)
              .map((workspace) => (
                <li key={workspace.id}>
                  <a
                    className="flex items-center gap-3"
                    onClick={() => onSwitchWorkspace(workspace.id)}
                  >
                    {workspace.avatar ? (
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={workspace.avatar}
                          alt={workspace.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-base-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">
                          {workspace.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="truncate">{workspace.name}</span>
                  </a>
                </li>
              ))}
          </>
        )}

        <div className="divider my-1"></div>

        {/* New workspace */}
        <li>
          <a
            className="flex items-center gap-3 text-primary"
            onClick={onNewWorkspace}
          >
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span>Neuer Workspace</span>
          </a>
        </li>
      </ul>
    </div>
  );
}

/**
 * Load workspace list from localStorage
 */
export function loadWorkspaceList(storageKey = 'narrativeWorkspaces'): WorkspaceInfo[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load workspace list:', e);
  }
  return [];
}

/**
 * Save workspace list to localStorage
 */
export function saveWorkspaceList(workspaces: WorkspaceInfo[], storageKey = 'narrativeWorkspaces'): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspaces));
  } catch (e) {
    console.error('Failed to save workspace list:', e);
  }
}

/**
 * Add or update workspace in the list
 */
export function upsertWorkspace(
  workspaces: WorkspaceInfo[],
  workspace: WorkspaceInfo
): WorkspaceInfo[] {
  const existingIndex = workspaces.findIndex((w) => w.id === workspace.id);
  if (existingIndex >= 0) {
    // Update existing
    const updated = [...workspaces];
    updated[existingIndex] = workspace;
    return updated;
  } else {
    // Add new
    return [...workspaces, workspace];
  }
}
