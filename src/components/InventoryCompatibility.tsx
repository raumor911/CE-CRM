import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, AlertCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { cn } from '../lib/utils';

interface InventoryCompatibilityProps {
  productType: string;
  requiredQuantity: number;
}

export const InventoryCompatibility: React.FC<InventoryCompatibilityProps> = ({ 
  productType, 
  requiredQuantity 
}) => {
  const [compatibleProducts, setCompatibleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompatibleInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory_products')
          .select('*, active_assignment:rental_inventory_assignments(rental:rentals(contractual_end_date))')
          .eq('product_type', productType)
          .order('operational_status', { ascending: true });

        if (error) throw error;
        setCompatibleProducts(data || []);
      } catch (err) {
        console.error('Error fetching compatible inventory:', err);
      } finally {
        setLoading(false);
      }
    };

    if (productType) {
      fetchCompatibleInventory();
    }
  }, [productType]);

  const availableCount = compatibleProducts.filter(p => p.operational_status === 'Disponible').length;
  const isStockLow = availableCount < requiredQuantity;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (compatibleProducts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Package size={12} /> Inventario Compatible
        </h3>
        {availableCount > 0 && (
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border",
            isStockLow ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {availableCount} Disponibles
          </span>
        )}
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-50">
          {compatibleProducts.slice(0, 5).map((product) => {
            const isAvailable = product.operational_status === 'Disponible';
            const rentalEndDate = product.active_assignment?.[0]?.rental?.contractual_end_date;

            return (
              <div key={product.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isAvailable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-zinc-300"
                  )} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-zinc-900 group-hover:text-indigo-600 transition-colors">
                      {product.internal_id}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                      {isAvailable ? 'Disponible ahora' : 
                        rentalEndDate ? `Rentado hasta ${new Date(rentalEndDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}` : 
                        product.operational_status}
                    </span>
                  </div>
                </div>
                {isAvailable ? (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                ) : (
                  <Clock size={14} className="text-zinc-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isStockLow && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="text-amber-500 shrink-0" size={16} />
          <p className="text-[10px] text-amber-800 font-bold leading-tight">
            ALERTA: Solo existen {availableCount} unidades disponibles para este pedido de {requiredQuantity}.
          </p>
        </div>
      )}
    </div>
  );
};
