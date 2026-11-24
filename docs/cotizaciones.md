# Cotizaciones de venta y renta

Genera cotizaciones en PDF desde un lead del pipeline, las guarda en la base de datos y asigna un folio consecutivo.

## Qué hace
- **Pipeline → detalle del lead → pestaña "Cotizaciones"**: crea una cotización de venta o renta (según la categoría del lead), la guarda con su folio y descarga o abre el PDF.
- **Precios y cotizaciones** (Ajustes → Precios y cotizaciones): catálogo de contenedores (precio y fichas técnicas), servicios (flete y maniobras; altas, bajas y cambios; la baja requiere `20261123020000_quotes_service_delete.sql`), tipo de cambio USD→MXN con historial y series de folio.
- Cada cotización conserva una copia fija de los datos del cliente, los precios y los términos con los que se hizo. Cambiar el catálogo después no altera cotizaciones ya emitidas.
- Estados: borrador → enviada → aceptada / rechazada / cancelada. "Vencida" se calcula por la fecha de vigencia, no se guarda. Lo enviado no se edita: se duplica para hacer una nueva (otro folio).
- Enviar la cotización al cliente es manual. El sistema solo marca "enviada".

## Reglas de cálculo
- Todo en centavos enteros. IVA 16 % sobre el subtotal (flete y maniobras llevan IVA).
- Venta en USD: precio MXN = precio USD × tipo de cambio vigente al cotizar; el tipo de cambio queda guardado en la cotización.
- Renta: el depósito en garantía no causa IVA y se suma después ("Total con depósito"). Por defecto es 1 mes de renta, editable.
- **El servidor recalcula los totales** (`create_quote`); lo que envíe el navegador para dinero se ignora.

## Folios
- Los asigna la base de datos de forma atómica (`next_quote_folio`), nunca el navegador.
- Valores iniciales (suposición, ajustables en *Ajustes → Precios y cotizaciones → Folios*): venta continúa desde 21788 (siguiente **21789**) y renta desde ED0079 (siguiente **ED0080**).
- El siguiente folio solo puede subir, nunca bajar.

## Activación (NO se aplica sola)
1. Probar primero en un proyecto o rama de Supabase de pruebas.
2. Ejecutar `supabase/migrations/20261123000000_create_quotes_module.sql` (transaccional y repetible; solo agrega tablas y funciones).
3. Reversión: volver a la versión anterior de la app. Solo si las tablas están vacías o con datos de prueba: `supabase/rollbacks/20261123000000_drop_quotes_module.sql`.

## Editar y enviar

**Editar (conserva el folio).** En la pestaña Cotizaciones del lead, el botón Editar está disponible en borradores y en cotizaciones enviadas. Aceptadas, rechazadas y canceladas quedan congeladas: para cambiarlas se duplican. El folio, el tipo (venta o renta) y el lead no cambian. Los totales los recalcula el servidor. Cada edición guarda la versión anterior completa en `quote_revisions` y sube `quotes.revision`; el PDF muestra "Rev. N" a partir de la segunda versión. Si alguien más modificó la cotización mientras se editaba, el guardado falla y pide recargar. Al editar se conservan la fecha original y el tipo de cambio con el que se cotizó. Requiere la migración `20261123010000_quotes_edit.sql` (después de la de creación).

**Enviar.** En la vista previa del PDF, WhatsApp y Correo usan el teléfono y el correo que quedaron en la cotización. El enlace no puede llevar el archivo: la app descarga el PDF y abre el mensaje ya redactado, y quien envía adjunta el archivo. El número de 10 dígitos se toma como de México (+52). El envío no cambia el estado: después se pulsa "Marcar enviada" en la lista.

**Histórico.** En Ajustes → Precios y cotizaciones → Folios, debajo de las series, está el histórico de todas las cotizaciones (venta y renta, de cualquier lead): folio, cliente, productos, destino y fecha de generación, con búsqueda (sin acentos) y filtros por tipo y estado. Cada fila abre su PDF. Muestra las 500 más recientes. No requiere migración adicional.

## Vista previa sin base de datos
`npm run dev` y abrir `http://localhost:3000/?preview=quotes`. Usa datos sintéticos en memoria, no pide login y no toca Supabase. Solo existe en desarrollo (no se incluye en el build de producción).

## Preguntas abiertas
- **Permisos (RLS)**: igual que Rentas, cualquier usuario autenticado puede ver y crear cotizaciones y editar precios. No hay roles ni aislamiento por usuario. Definir si solo ciertos usuarios deben editar precios.
- **`leads`**: la migración asume `leads.id` UUID con llave primaria (el `CREATE TABLE` de `leads` no está en el repo). Si no coincide, la migración falla completa y no deja nada a medias.
- **`lead_activities`**: el registro de actividad en el lead es "al mejor esfuerzo" porque tampoco está su `CREATE TABLE` en el repo.
- Impuestos fuera del 16 % (por ejemplo franja fronteriza), IVA del depósito y revisión legal de los términos: confirmar con contador y abogado.
- Logo: `public/media/branding/creativos-espacios-logo.jpg` es el extraído de los PDFs (350 px). Reemplazar por el archivo original; la ruta está en `src/config/quoteDefaults.ts`.
