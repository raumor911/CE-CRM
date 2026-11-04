# Pipeline PMO

Acceso en escritorio: debajo de Pipeline. En móvil: Más → Pipeline PMO.

1. Aplicar `supabase/migrations/20261104000000_add_pmo_pipeline_to_leads.sql` en el SQL Editor de Supabase antes de utilizar PMO. ALTER TABLE toma un bloqueo breve; programar fuera de alta actividad si leads es grande.
2. En la tarjeta comercial, pulsar **Pasar a PMO**. Al confirmar el guardado, desaparece del tablero comercial y aparece en Brief en PMO. También puede seleccionarse un registro existente desde PMO e incorporarlo a Brief. Para un cliente nuevo, crearlo primero desde Pipeline → Nuevo Lead.
3. Mover entre Brief, Necesidad, Diseño, Manufactura y Entrega arrastrando la tarjeta o usando su selector (también accesible por teclado y móvil).
4. Pulsar el nombre para abrir el expediente existente: documentos, contacto y datos compartidos.

Datos: se reutiliza public.leads, su hook y suscripción en tiempo real, así como las políticas RLS existentes. El único campo nuevo es pmo_stage, nullable y con CHECK de cinco valores. NULL deja el registro fuera de PMO; no se incorpora ningún cliente automáticamente. Comercial muestra únicamente registros sin pmo_stage: una misma tarjeta no aparece simultáneamente en ambos pipelines. El traslado conserva el UUID, documentos, actividades y datos financieros; no inserta ni clona registros. No se modifica stage ni last_activity al avanzar dentro de PMO para no alterar las reglas comerciales de seguimiento. Los registros archivados siguen excluidos. Cada lead representa un proyecto; no se introducen múltiples proyectos por lead en este alcance.

La migración es transaccional y repetible. No se ha ejecutado contra producción. Si falta el campo, consultar el tablero comercial sigue funcionando y PMO muestra un error al intentar guardar, sin confirmar un cambio no persistido.

Validación: `npm run lint`, `npm run build`, `node --import tsx --test tests/pmoPipeline.test.tsx tests/financeService.test.ts`. No se validó contra una sesión autenticada de producción.
