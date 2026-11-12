# Historial de etapas de Catalyst

## Activación

1. En un entorno de pruebas, verificar que `public.leads` tiene las columnas referenciadas en la migración, en particular `created_at`, `user_id`, `pmo_stage` y las columnas de cierre financiero. Usar una sesión normal para comprobar que sus permisos actuales permiten consultar, crear y mover tarjetas.
2. Aplicar `20261112000000_lead_stage_timeline.sql` antes de desplegar el código. La migración agrega una tabla, un índice y dos funciones; no actualiza ni reconstruye tarjetas existentes. Las funciones respetan los permisos actuales de `leads`.
3. Probar una creación, un movimiento comercial, un traspaso a PMO, un cambio dentro de PMO y un cierre financiero. Confirmar que el Timeline muestra la actividad previa y los nuevos eventos, y que repetir el destino no agrega un evento. Probar con dos usuarios permitidos para verificar visibilidad y autor.

Consulta de verificación, por tarjeta:

```sql
SELECT kind, from_pipeline, from_stage, to_pipeline, to_stage,
       actor_id, actor_name, created_at
FROM public.lead_stage_events
WHERE lead_id = 'UUID_DE_LA_TARJETA'
ORDER BY created_at DESC, id DESC;
```

El flujo de la aplicación usa las funciones de guardado. Las escrituras directas a `leads` fuera de Catalyst, incluyendo SQL manual o clientes antiguos, no generan eventos. No mantener dos versiones de escritura activas durante la validación.

## Tarjetas anteriores y rollback

El Timeline muestra las actividades existentes y, si está disponible, la fecha registrada de alta de cualquier tarjeta, incluidas las de mayo de 2026. La fecha de alta no prueba la etapa inicial. La importación se distingue de la creación y no se retrofecha como si se hubiera observado una transición en el pasado.

Para revertir, volver primero a la versión anterior de la aplicación. Conservar la tabla y sus filas: volver al código anterior no exige borrar el historial, aunque los movimientos hechos con esa versión no se registrarán. No calcular tiempos por etapa para trayectorias incompletas sin identificarlas como tales.
