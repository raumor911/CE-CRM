import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  initialEmail?: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  initialEmail = ''
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?mode=reset-password`,
      });

      if (error) throw error;

      setRequestSent(true);
      setCooldown(60);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('No fue posible enviar el enlace. Verifica tu conexión e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-bold w-fit"
        >
          <ArrowLeft size={16} />
          Volver al acceso
        </button>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recuperar acceso</h2>
        <p className="text-xs text-slate-500 font-medium">Ingresa tu correo institucional para recibir un enlace de recuperación.</p>
      </div>

      <AnimatePresence mode="wait">
        {requestSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-900">Enlace enviado</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Si el correo está asociado con una cuenta, recibirás un enlace para restablecer tu contraseña.
              </p>
            </div>

            <button
              onClick={handleResetRequest}
              disabled={loading || cooldown > 0}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : '¿No recibiste nada? Reenviar enlace'}
            </button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleResetRequest}
            className="space-y-4"
          >
            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-rose-700 leading-tight">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Correo Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                  placeholder="usuario@creativosespacios.com"
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
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar enlace de recuperación</span>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
