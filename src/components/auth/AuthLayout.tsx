import React from 'react';
import { motion } from 'motion/react';
import { BrandConfig } from '../../config/branding';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-2 w-full max-w-[280px]">
              <BrandConfig.Logo className="h-auto w-full" />
            </div>
          </div>

          {children}

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Catalyst CRM • Creativos Espacios</p>
            <p className="text-[9px] text-slate-400 mt-1">Sales Cockpit v{BrandConfig.Version} • ISO 27001 Compliant</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
