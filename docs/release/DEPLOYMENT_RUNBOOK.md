# Deployment Runbook — Fase 2

Guía mínima para promover `powERP` a `staging` y `production` con rollback simple.

## 1. Prerrequisitos

- Vercel con 2 proyectos o 2 ambientes claramente separados: `staging` y `production`.
- Supabase Cloud con 2 proyectos separados: `staging` y `production`.
- Branch protection activa en `main` y `develop`.
- Checklist de release en verde: ver `RELEASE_CANDIDATE_CHECKLIST.md`.

## 2. Variables por ambiente

Configurar en Vercel, por ambiente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `STORAGE_BUCKET_FOTOS=fotos-visita`

Configurar además en operación:

- credenciales de acceso al proyecto Supabase Cloud
- política de backups habilitada y validada
- cron o automatización externa si luego se programan tareas operativas

## 3. Promoción a Staging

1. Confirmar que CI está en verde en la rama candidata.
2. Verificar localmente:
   - `cd erp-vitrinas`
   - `npm run ci:checks`
   - `npm run audit:prod`
3. Desplegar la rama candidata a `staging`.
4. Ejecutar migraciones contra Supabase `staging`.
5. Confirmar que la app responde en `/login`.

## 4. Smoke Test de Staging

Validar manualmente:

- login con `admin`, `analista`, `compras` y `colaboradora`
- routing correcto por rol
- dashboard con KPIs y tablas
- reportes y exportación `.xlsx`
- compra con recepción
- garantía con resolución
- visita completa con foto final obligatoria
- visita offline y sincronización

## 5. Promoción a Production

1. Aprobar funcionalmente `staging`.
2. Crear despliegue a `production` desde la misma revisión aprobada.
3. Ejecutar migraciones primero en Supabase `production`.
4. Publicar el deploy en Vercel.
5. Repetir smoke rápido post-deploy:
   - `/login`
   - dashboard
   - reportes/exportación
   - compra/garantía

## 6. Rollback Simple

Si el problema está solo en frontend:

1. Promover en Vercel el deployment anterior estable.
2. Repetir smoke mínimo en `/login`, dashboard y reportes.

Si el problema involucra schema o datos:

1. Poner la operación en pausa.
2. Identificar la migración problemática.
3. Restaurar desde backup o aplicar migración correctiva validada en `staging`.
4. Reabrir operación solo después de smoke completo.

## 7. Observabilidad Mínima

- uptime check sobre `/login`
- revisión de logs de Vercel en auth y `/api/reportes/export`
- revisión de logs de Supabase en RPC de cierre, compras y garantías
- seguimiento de errores de sync offline y exportación

## 8. Evidencia de Cierre

Guardar en la release:

- enlace al deploy de `staging`
- enlace al deploy de `production`
- captura o registro de smoke tests
- confirmación de backups
- aprobación funcional final
