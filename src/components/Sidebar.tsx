import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Table, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { BrandConfig } from '../config/branding';

interface SidebarProps {
  currentView: 'dashboard' | 'pipeline' | 'directory' | 'settings';
  onViewChange: (view: 'dashboard' | 'pipeline' | 'directory' | 'settings') => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  isCollapsed, 
  setIsCollapsed 
}) => {
  const { user, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'directory', label: 'Directorio', icon: Table },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-50 flex flex-col",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-center transition-all duration-300",
        isCollapsed ? "p-4" : "p-6"
      )}>
        <div className={cn(
          "bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center transition-all duration-300",
          isCollapsed ? "w-12 h-12 p-1" : "w-full p-4"
        )}>
          <BrandConfig.Logo className="w-full h-full" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
              currentView === item.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <item.icon size={20} className={cn(
              "shrink-0",
              currentView === item.id ? "text-white" : "group-hover:text-slate-900"
            )} />
            {!isCollapsed && (
              <span className="text-sm font-bold">{item.label}</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 space-y-4">
        <div className={cn(
          "flex items-center gap-3 px-2",
          isCollapsed ? "justify-center" : ""
        )}>
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
            <UserIcon size={16} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                {user?.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user?.email}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group relative",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold">Cerrar Sesión</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Cerrar Sesión
            </div>
          )}
        </button>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-900 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};
