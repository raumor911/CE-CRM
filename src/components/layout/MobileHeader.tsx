import React from 'react';
import { Plus, Bell } from 'lucide-react';
import { BrandConfig } from '../../config/branding';
import { cn } from '../../lib/utils';

interface MobileHeaderProps {
  currentView: string;
  onPlusClick?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ currentView, onPlusClick }) => {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-6 py-4 flex items-center justify-between safe-top">
      <div className="w-24">
        <BrandConfig.Logo className="w-full h-auto" />
      </div>
      <div className="flex items-center gap-2">
        {onPlusClick && (
          <button
            onClick={onPlusClick}
            className="bg-zinc-900 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10 active:scale-90 transition-transform"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}
        <button className="text-zinc-400 p-2.5 active:bg-zinc-50 rounded-xl transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
};
