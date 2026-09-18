import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { verifyFinancePassword } from './financeAccessService';
import { cn } from '../../lib/utils';

interface FinancePasswordGateProps {
  onUnlock: () => void;
}

export const FinancePasswordGate: React.FC<FinancePasswordGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length === 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const isValid = await verifyFinancePassword(password);
      if (isValid) {
        onUnlock();
      } else {
        setError('Contraseña incorrecta.');
      }
    } catch (err) {
      console.error(err);
      setError('No fue posible validar el acceso. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-[80vh] w-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-900 px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Módulo protegido</h2>
          <p className="mt-2 text-sm text-slate-300">
            Ingresa la contraseña para acceder<br />
            a la información financiera.
          </p>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3.5 pr-12 text-base transition-colors",
                    "focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900",
                    error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50",
                    loading && "opacity-50"
                  )}
                  placeholder="•••••••••••••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && (
                <p className="text-sm font-medium text-rose-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={password.trim().length === 0 || loading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-[13px] font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-slate-800",
                (password.trim().length === 0 || loading) && "cursor-not-allowed opacity-50"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Desbloquear'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
