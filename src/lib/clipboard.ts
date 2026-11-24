/**
 * Copia texto al portapapeles. Usa la API moderna y, si el navegador la niega (permisos, página sin HTTPS,
 * Firefox con restricciones), cae al método clásico. Devuelve false si ninguno funcionó, en vez de fallar en silencio.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sigue con el método clásico
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
