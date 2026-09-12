import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
}

interface BottomNavigationProps {
  currentView: string;
  onViewChange: (view: any) => void;
  mainNavItems: readonly NavItem[];
  secondaryNavItems: readonly NavItem[];
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (open: boolean) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentView,
  onViewChange,
  mainNavItems,
  secondaryNavItems,
  isMoreMenuOpen,
  setIsMoreMenuOpen
}) => {
  const { signOut } = useAuth();

  // Físicas de resorte pesadas solicitadas por el usuario (stiffness: 100, damping: 40)
  const springConfig = { type: 'spring', stiffness: 100, damping: 40 };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-100 px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] z-50 flex items-center justify-between shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
      {mainNavItems.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onViewChange(item.id);
              setIsMoreMenuOpen(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300 relative px-2 py-1",
              isActive ? "text-zinc-900" : "text-zinc-400"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all duration-500",
              isActive ? "bg-zinc-100 scale-110" : "bg-transparent scale-100"
            )}>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
              isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0"
            )}>
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="activeNav"
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-900 rounded-full"
                transition={springConfig}
              />
            )}
          </button>
        );
      })}
      
      <button
        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
        className={cn(
          "flex flex-col items-center gap-1.5 transition-all duration-300 px-2 py-1",
          isMoreMenuOpen ? "text-zinc-900" : "text-zinc-400"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-xl transition-all duration-500",
          isMoreMenuOpen ? "bg-zinc-100 scale-110" : "bg-transparent scale-100"
        )}>
          <MoreHorizontal size={20} strokeWidth={isMoreMenuOpen ? 2.5 : 2} />
        </div>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
          isMoreMenuOpen ? "opacity-100" : "opacity-60"
        )}>
          Más
        </span>
      </button>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[-1]"
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={springConfig}
              className="absolute bottom-[calc(100%+16px)] left-4 right-4 bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden"
            >
              <div className="p-3 space-y-1">
                <div className="px-4 py-3 mb-2 border-b border-zinc-50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Configuración</p>
                </div>
                {secondaryNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]",
                      currentView === item.id ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={currentView === item.id ? "text-zinc-900" : "text-zinc-400"} />
                      <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-300" />
                  </button>
                ))}
                <div className="h-px bg-zinc-50 my-2 mx-4" />
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-rose-600 active:bg-rose-50 transition-all active:scale-[0.98]"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
