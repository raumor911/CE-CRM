import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <img 
                src="https://ais-pre-7lln6mowgsjchyh7kug26e-157929339977.us-east1.run.app/Catalyst_Logo.png" 
                alt="Catalyst Logo" 
                className="h-16 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
          </div>

          {children}

          <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col items-center gap-1">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Creativos Espacios</p>
            <p className="text-indigo-500 font-black tracking-[0.2em] text-[11px] uppercase">Catalyst</p>
            <p className="text-[9px] text-zinc-600 mt-2">Sales Cockpit v1.1.0 • ISO 27001 Compliant</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
