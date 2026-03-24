# CODEX_CONTEXT.md

Contexto operativo del proyecto para futuras sesiones de trabajo con Codex.

## Resumen

- Proyecto: `powERP`
- Dominio: ERP/CRM para gestionar vitrinas de accesorios electrónicos en consignación
- Operación: 200+ puntos de venta, visitas de campo, conteo de inventario, cobros, reposición y reportes
- App principal: `erp-vitrinas/`
- Estado general: Sprint 1, 2, 3, 4 y 5 implementados; Sprint 6 pendiente

## Stack

- Frontend: Next.js 16, React 19, TailwindCSS v4, shadcn/ui
- Estado cliente: Zustand + TanStack React Query v5
- Backend: Supabase (PostgreSQL, PostgREST, Auth, Storage, Realtime, Edge Functions)
- Validación: Zod + React Hook Form
- Testing: Playwright e2e, Vitest presente en el proyecto
- Deploy previsto: Vercel + Supabase Cloud

## Estructura importante

- Código app: `erp-vitrinas/`
- Documentación maestra: `CLAUDE.md`, `SPRINTS.md`, `ERP_CRM_Plan_v2.md`
- Planes y specs: `docs/superpowers/`
- Worktree histórica detectada: `.worktrees/sprint1/`
- Configuración local Claude: `.claude/`
- Artefactos de brainstorming visual: `.superpowers/brainstorm/`

## Reglas de arquitectura

- Todos los comandos de app deben correrse desde `erp-vitrinas/`
- No hacer llamadas directas a Supabase desde componentes
- Toda la lógica de datos va en `lib/hooks/`
- Admin y campo viven en route groups distintos
- Patrón crítico de rutas:
  - `app/(admin)/admin/...` genera `/admin/*`
  - `app/(campo)/campo/...` genera `/campo/*`
- Los movimientos de inventario son inmutables
- El stock actual es denormalizado y mantenido por triggers SQL

## Roles del sistema

- `admin`
- `colaboradora`
- `supervisor`
- `analista`
- `compras`

El middleware lee el rol desde `user.app_metadata.rol`.

## Estado funcional actual

### Implementado

- Fase 0 completa
- Sprint 1 completo: auth, usuarios, productos, categorías, puntos de venta
- Sprint 2 completo: vitrinas, inventario central, rutas
- Sprint 3 completo: ruta del día, inicio de visita, conteo, dashboard admin de visitas
- Sprint 4 completo: cobro, reposición, fotos, inventario de colaboradora y cierre transaccional
- Sprint 5 completo: bajas auditadas, historial, valorizado e incidencias en campo/admin

### Pendiente fuerte

- Sprint 6+: offline completo, analítica, reportes avanzados y escala

## Sprint 4 esperado

Sprint 4 ya quedó implementado con:

- Formas de pago como tabla propia
- `inventario_colaboradora`
- Extensión de `movimientos_inventario`
- RPC `cerrar_visita()`
- Flujo campo post-conteo:
  - cobro
  - reposición
  - fotos
  - confirmación de cierre

Notas importantes:

- La numeración real arrancó en `20260014+` porque `20260013_normalize_dias_visita.sql` ya existía en el repo.
- El bucket de Storage vigente es `fotos-visita`.
- El cierre registra movimientos de `venta` y `reposicion` para dejar consistente el snapshot de vitrina.

## Reglas de negocio clave

1. No se puede cerrar una visita sin cobro registrado.
2. Si `monto_cobrado != monto_calculado`, la nota es obligatoria.
3. El stock no puede quedar negativo.
4. Productos inactivos no deben aparecer en reposición.
5. Primera visita a vitrina nueva usa `inv_anterior = 0`.
6. Una incidencia no puede pasar a `resuelta` o `cerrada` sin resolución registrada.

## Archivos guía prioritarios

- `CLAUDE.md`: reglas operativas y convenciones del repo
- `SPRINTS.md`: estado por sprint
- `ERP_CRM_Plan_v2.md`: visión global del producto
- `docs/superpowers/plans/2026-03-23-sprint4-cierre-visita.md`: plan detallado de Sprint 4
- `docs/superpowers/specs/2026-03-23-sprint4-design.md`: diseño funcional y técnico de Sprint 4
- `docs/superpowers/plans/2026-03-23-sprint5-inventario-incidencias.md`: plan detallado de Sprint 5
- `docs/superpowers/specs/2026-03-23-sprint5-design.md`: diseño funcional y técnico de Sprint 5

## Observaciones del repo

- `erp-vitrinas/README.md` sigue siendo el README por defecto de Next.js y no refleja el estado real del proyecto
- Hay archivos sin trackear en git relacionados con documentación y `.claude/`
- `.superpowers/brainstorm/` contiene decisiones visuales útiles, pero no es fuente de verdad del dominio

## Convenciones útiles para continuar

- Comentarios de lógica de negocio: en español
- Infraestructura y código técnico: en inglés
- TypeScript en modo estricto
- Selectores Playwright recomendados: `input[name="..."]`
- Regenerar `lib/supabase/database.types.ts` después de cambios en migraciones

## Qué asumir en futuras sesiones

- La app activa está en `erp-vitrinas/`
- La documentación estratégica en raíz sí es relevante y vigente
- Si hay conflicto entre código y docs, verificar primero `CLAUDE.md` y luego el estado real del código
- El siguiente bloque natural de trabajo es Sprint 6
