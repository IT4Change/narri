/**
 * BottomNav - Bottom navigation bar for mobile devices
 *
 * Shows module tabs at the bottom of the screen on mobile.
 * Hidden on desktop (md+) where the header tabs are shown instead.
 * Uses daisyUI dock component (v5).
 */

import type { ModuleId, ModuleInfo } from '../types';

interface BottomNavProps {
  modules: ModuleInfo[];
  enabledModules: Record<string, boolean>;
  activeModule: ModuleId;
  onModuleChange: (moduleId: ModuleId) => void;
}

export function BottomNav({
  modules,
  enabledModules,
  activeModule,
  onModuleChange,
}: BottomNavProps) {
  // Filter to only show enabled modules
  const visibleModules = modules.filter(
    (m) => enabledModules[m.id] !== false
  );

  return (
    <div className="dock dock-sm md:hidden z-[1000]">
      {visibleModules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={activeModule === module.id ? 'dock-active' : ''}
          onClick={() => onModuleChange(module.id)}
        >
          {module.icon}
          <span className="dock-label text-xs">{module.name}</span>
        </button>
      ))}
    </div>
  );
}
