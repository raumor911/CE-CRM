import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Lock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';

interface ResetPasswordFormProps {
  session: Session | null;
  onSuccess: () => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  session,
  onSuccess,
  onRequestNewLink
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (session) {
      setInvalidLink(false);
    } else {
      // Wait 2 seconds before marking the link as invalid to account for session loading delay
      timeoutId = setTimeout(() => {
        if (!session) {
          setInvalidLink(true);
        }
      }, 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Delay to show success state before redirecting
      setTimeout(async () => {
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          console.error('Error signing out after password reset:', signOutError);
          setError('Contraseña actualizada, pero hubo un error al cerrar la sesión técnica.');
          setSuccess(false);
          setLoading(false);
          return;
        }

        onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'No fue posible actualizar la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Enlace inválido</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[280px]">
            El enlace de recuperación no es válido, ya fue utilizado o ha expirado por seguridad.
          </p>
        </div>
        <button
          onClick={onRequestNewLink}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-slate-900/10"
        >
          Solicitar un enlace nuevo
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center gap-6 py-4"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tight">¡Contraseña actualizada!</h2>
          <p className="text-xs text-emerald-600 font-medium leading-relaxed">
            Tu seguridad ha sido reforzada. Serás redirigido al acceso principal en unos segundos.
          </p>
        </div>
        <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'linear' }}
            className="h-full bg-emerald-500"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Establecer nueva contraseña</h2>
        <p className="text-xs text-slate-500 font-medium">Crea una contraseña segura para proteger tu cuenta de Catalyst.</p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-3"
            >
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-rose-700 leading-tight">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nueva Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              placeholder="Repite tu contraseña"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Actualizando...</span>
            </>
          ) : (
            <span>Actualizar contraseña</span>
          )}
        </button>
      </form>
    </div>
  );
};
