# Compatibilidad con Windows (Chrome y Firefox)

La app se diseñó y probó primero en Mac. Esta guía recoge lo que se corrigió para que opere igual en Windows con Chrome y Firefox, y cómo volver a comprobarlo.

## Navegadores
- Chrome y Edge actuales, y Firefox 128 o posterior (lo exige Tailwind 4). Probado con Chromium 143 y Firefox 144.
- En Firefox el PDF se ve con su visor integrado (viene activo por defecto). Si alguien lo desactivó, la vista previa queda en blanco y se usa «Descargar PDF»; la vista previa lo avisa.

## Qué se corrigió
| Problema en Windows | Corrección |
|---|---|
| El tablero Kanban se desplazaba en horizontal con la barra **oculta**. En Mac se hace con el trackpad, pero con un ratón de Windows la rueda no mueve en horizontal y las últimas etapas quedaban inalcanzables. | La barra horizontal ahora se ve en escritorio (también funciona Shift + rueda). |
| Las barras de desplazamiento de Windows son gruesas y siempre visibles; en Mac son flotantes. | Estilo delgado y uniforme en Chrome y Firefox (`scrollbar-width` y `scrollbar-color`). `.scrollbar-hide` sigue disponible donde se quiera ocultar. |
| Importar CSV de Excel fallaba o dejaba un carácter invisible al final de cada fila: Windows usa `\r\n` (y Excel agrega un BOM). | La importación acepta `\n`, `\r\n` y `\r`, y quita el BOM. |
| Fechas, horas y números dependían del idioma del Windows del usuario (un equipo en inglés mostraba mes/día en vez de día/mes). | Formato fijo `es-MX` en toda la app. |
| `<html lang="en">` con la app en español: corrector ortográfico y traducción automática equivocados. | `lang="es-MX"`. |
| El botón de correo (`mailto:`) no hace nada en Windows si no hay una app de correo configurada. | El botón Correo ahora ofrece «Abrir en mi app de correo» y «Abrir en Gmail». |
| Copiar al portapapeles fallaba en silencio si el navegador lo negaba. | `copyToClipboard` con método de respaldo. |
| `npm run clean` usaba `rm -rf`, que no existe en cmd ni PowerShell. | Reemplazado por un comando de Node. |
| Saltos de línea mezclados (CRLF/LF) entre Mac y Windows al hacer commit. | `.gitattributes` y `.editorconfig` con LF. |

## Cómo comprobarlo
- Pruebas automáticas: `npx tsx --test tests/*.test.*` (incluye CSV con `\r\n` y el enlace de Gmail).
- Con Windows real: iniciar sesión en Chrome y Firefox y revisar el Kanban con un ratón (barra horizontal visible), importar un CSV guardado desde Excel, y en una cotización probar WhatsApp, Correo y Descargar PDF.

## Lo que no se pudo verificar sin un Windows real
- El aspecto exacto de las barras de desplazamiento y de la tipografía Inter con ClearType.
- Qué app de correo o de WhatsApp abre cada equipo (depende de lo que tenga instalado).
