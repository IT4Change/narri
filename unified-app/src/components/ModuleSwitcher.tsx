/**
 * ModuleSwitcher - Tab UI for switching between modules
 */

import type { ModuleId, ModuleInfo } from '../types';

interface ModuleSwitcherProps {
  modules: ModuleInfo[];
  enabledModules: Record<string, boolean>;
  activeModule: ModuleId;
  onModuleChange: (moduleId: ModuleId) => void;
}

export function ModuleSwitcher({
  modules,
  enabledModules,
  activeModule,
  onModuleChange,
}: ModuleSwitcherProps) {
  // Filter to only show enabled modules
  const visibleModules = modules.filter(
    (m) => enabledModules[m.id] !== false // Show if true or undefined (default enabled)
  );

  // Hidden on mobile (shown via BottomNav), visible on md+ screens
  return (
    <div className="hidden md:flex bg-base-200 rounded-lg p-1">
      {visibleModules.map((module) => (
        <button
          key={module.id}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${activeModule === module.id ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}
          onClick={() => onModuleChange(module.id)}
          title={module.description}
        >
          {module.icon}
          <span>{module.name}</span>
        </button>
      ))}
    </div>
  );
}
