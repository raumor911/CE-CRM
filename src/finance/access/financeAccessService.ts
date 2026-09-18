import { supabase } from '../../lib/supabase';

export async function verifyFinancePassword(password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-finance-password', {
      body: { password }
    });

    if (error) {
      // Intentar extraer el JSON si la respuesta fue HTTP error (ej. 401)
      if (error.context && typeof error.context.clone === 'function') {
        try {
          const body = await error.context.clone().json();
          if (body && body.success === false) {
            return false; // Contraseña incorrecta
          }
        } catch (e) {
          // Ignorar error de parsing y lanzar el original
        }
      }
      throw error; // Error técnico (red, 500, no disponible, etc)
    }

    return data?.success === true;
  } catch (err: any) {
    if (err.context && typeof err.context.clone === 'function') {
      try {
        const body = await err.context.clone().json();
        if (body && body.success === false) {
          return false;
        }
      } catch (e) {
        // Ignorar
      }
    }
    throw err;
  }
}
