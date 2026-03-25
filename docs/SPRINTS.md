# SPRINTS.md — ERP Vitrinas en Consignación

Archivo de seguimiento de sprints para el agente Claude Code.
**Leyenda de estados:** `[ ]` pendiente · `[~]` en progreso · `[x]` completado · `[!]` bloqueado

---

## Fase 0 — Diseño y Setup

**Objetivo:** Infraestructura base lista para comenzar el desarrollo.
**Estado general:** `[x]` completado

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| F0-01 | Inicializar proyecto Next.js 14 con App Router + TypeScript strict | `[x]` | |
| F0-02 | Configurar TailwindCSS + shadcn/ui | `[x]` | |
| F0-03 | Configurar Supabase (proyecto dev) | `[x]` | |
| F0-04 | Variables de entorno (`.env.local` + `.env.example`) | `[x]` | |
| F0-05 | Estructura de carpetas según plan (`app/`, `components/`, `lib/`, `supabase/`) | `[x]` | |
| F0-06 | Migración SQL: tablas núcleo (categorias, productos, proveedores) | `[x]` | |
| F0-07 | Migración SQL: red de distribución (zonas, puntos_de_venta, vitrinas, surtido_estandar) | `[x]` | |
| F0-08 | Migración SQL: personal y rutas (usuarios, rutas, rutas_pdv) | `[x]` | |
| F0-09 | Migración SQL: inventario (inventario_central, inventario_vitrina, movimientos_inventario) | `[x]` | |
| F0-10 | Migración SQL: visitas y cobros (visitas, detalle_visita, cobros, fotos_visita) | `[x]` | |
| F0-11 | Migración SQL: incidencias, garantias, compras, detalle_compra | `[x]` | |
| F0-12 | Triggers SQL: `set_updated_at()` en todas las tablas | `[x]` | |
| F0-13 | Triggers SQL: `calcular_unidades_vendidas()`, `actualizar_inventario()`, `validar_stock_no_negativo()` | `[x]` | |
| F0-14 | Funciones SQL: `calcular_monto_visita()`, `get_kpi_ventas()` | `[x]` | |
| F0-15 | Políticas RLS por tabla y por rol (admin, colaboradora, supervisor, analista, compras) | `[x]` | |
| F0-16 | Configurar Supabase Auth con roles personalizados | `[x]` | |
| F0-17 | Generar tipos TypeScript desde Supabase (`database.types.ts`) | `[x]` | |
| F0-18 | Configurar cliente Supabase en `lib/supabase/` (client + server) | `[x]` | |
| F0-19 | Setup Vitest + Playwright | `[x]` | |
| F0-20 | Seed inicial de datos de prueba | `[x]` | |

---

## Fase 1 — MVP: Núcleo Operativo

### Sprint 1 — Autenticación + Productos + PDV
**Objetivo:** Login funcional y catálogo de productos con CRUD.
**Estado general:** `[x]` completado
**HUs:** HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S1-01 | Página de login con email/contraseña (Supabase Auth) | HU-01 | `[x]` | |
| S1-02 | Redirección post-login según rol (admin → /dashboard, colaboradora → /ruta-del-dia) | HU-01 | `[x]` | |
| S1-03 | Middleware de protección de rutas + sesión persistente | HU-01 | `[x]` | |
| S1-04 | Página de logout | HU-03 | `[x]` | |
| S1-05 | CRUD de usuarios con asignación de roles (solo admin) | HU-02 | `[x]` | |
| S1-06 | Listado de productos con búsqueda en tiempo real y filtros | HU-07 | `[x]` | |
| S1-07 | Formulario de creación de producto (código único, nombre, categoría, costo, precio) | HU-04 | `[x]` | |
| S1-08 | Edición de producto (precio de venta al comercio) | HU-05 | `[x]` | |
| S1-09 | Activar/desactivar producto | HU-06 | `[x]` | |
| S1-10 | CRUD de categorías | HU-04 | `[x]` | |
| S1-11 | Listado y formulario de Puntos de Venta con datos de contacto y ubicación | HU-08 | `[x]` | |

---

### Sprint 2 — Vitrinas + Inventario Central + Rutas
**Objetivo:** Gestión completa de vitrinas y configuración de rutas.
**Estado general:** `[x]` completado
**HUs:** HU-09, HU-10, HU-11, HU-12, HU-13, HU-25

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S2-01 | Crear vitrina y asignarla a un PDV | HU-09 | `[x]` | |
| S2-02 | Definir surtido estándar por vitrina (producto + cantidad objetivo) | HU-10 | `[x]` | |
| S2-03 | Vista de inventario actual de vitrina (stock vs surtido estándar) | HU-11 | `[x]` | |
| S2-04 | Marcar vitrina como retirada | HU-12 | `[x]` | |
| S2-05 | Entrada de productos al inventario central por compra | HU-25 | `[x]` | |
| S2-06 | Crear ruta con lista de PDV ordenada y asignar a colaboradora | HU-13 | `[x]` | |
| S2-07 | Vista de rutas: listado con estado y colaboradora asignada | HU-13 | `[x]` | |

### Sprint 2 — Log (2026-03-22)

Completado: Módulos Vitrinas (listado + detalle con tabs), Inventario Central y Rutas (con drag-and-drop de PDVs).

Decisiones técnicas:
- `params` en Next.js 16 desempaquetado con `use(params)` en client components
- Rollback compensatorio para mutaciones de 2 pasos en `useRutas` (create + insert PDVs; update con delete+reinsert)
- `useQueryClient()` siempre antes de `useQuery()` — regla confirmada en Sprint 2
- `z.input<typeof schema>` para tipos de formulario con `.default()` — patrón consolidado

---

### Sprint 3 — Planificación de Rutas + Inicio de Visita
**Objetivo:** Colaboradora puede ver su ruta y comenzar una visita con cálculo automático.
**Estado general:** `[x]` completado (2026-03-22)
**HUs:** HU-14, HU-15, HU-16, HU-17, HU-18, HU-19

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S3-01 | Vista móvil: ruta del día con PDV en orden y estado (pendiente/completado) | HU-14 | `[x]` | `/campo/ruta-del-dia` — hook `useRutaDelDia` |
| S3-02 | Dashboard admin: visitas planificadas vs realizadas por ruta | HU-15 | `[x]` | `/admin/visitas` — hook `useVisitas` con filtro de fecha |
| S3-03 | Reasignación temporal de ruta a otra colaboradora (con motivo y fecha) | HU-16 | `[x]` | `RutaSheet` — campo `nota_reasignacion` + migración 20260011 |
| S3-04 | Iniciar visita: registrar hora de inicio, mostrar inv_anterior por producto | HU-17 | `[x]` | `/campo/visita/[id]` — `VisitaInicioView` |
| S3-05 | Ingreso de inventario actual → cálculo automático de unidades_vendidas | HU-18 | `[x]` | `ConteoTable` — cálculo live en cliente |
| S3-06 | Mostrar monto total a cobrar desglosado por producto | HU-19 | `[x]` | `VisitaConteoView` — subtotales por producto |

---

### Sprint 4 — Cierre de Visita: Cobro + Reposición + Fotos
**Objetivo:** Flujo completo de visita: registrar cobro, reponer y cerrar.
**Estado general:** `[x]` completado (2026-03-23)
**HUs:** HU-20, HU-21, HU-22, HU-23, HU-24

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S4-01 | Registrar monto cobrado y forma de pago | HU-20 | `[x]` | `formas_pago` + flujo `VisitaCobroView` |
| S4-02 | Validación: nota obligatoria si monto_cobrado ≠ monto_calculado → estado `discrepancia` | HU-20 | `[x]` | Validación cliente + RPC `cerrar_visita()` |
| S4-03 | Sugerencia de reposición hasta surtido estándar, ajustable por colaboradora | HU-21 | `[x]` | `VisitaReposicionView` con stock de colaboradora |
| S4-04 | Subida de fotos de vitrina a Supabase Storage (antes/después de reposición) | HU-22 | `[x]` | Bucket `fotos-visita`; al menos 1 foto final requerida para completar la visita |
| S4-05 | Cierre de visita: actualizar inventario_vitrina + inventario_colaboradora + movimientos | HU-23 | `[x]` | RPC + `inventario_colaboradora` + movimientos inmutables |
| S4-06 | Cierre de visita: generar cobro + marcar visita como `completada` | HU-23 | `[x]` | Cobro persistido + badge de discrepancia en admin |
| S4-07 | Marcar visita como `no_realizada` con motivo | HU-24 | `[x]` | Cubierto como regresión de Sprint 3 y validado en e2e |

---

### Sprint 5 — Inventario Avanzado + Incidencias
**Objetivo:** Gestión completa de bajas de inventario e incidencias operativas.
**Estado general:** `[x]` completado (2026-03-23)
**HUs:** HU-26, HU-27, HU-28, HU-29, HU-30, HU-31

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S5-01 | Baja de unidades por robo, pérdida o daño (movimiento inmutable con motivo) | HU-26 | `[x]` | `BajaInventarioSheet` + `motivo_baja` en `movimientos_inventario` |
| S5-02 | Historial de movimientos por producto o vitrina | HU-27 | `[x]` | Tab `Movimientos` en `/admin/inventario` usando vista `movimientos_inventario_detalle` |
| S5-03 | Reporte de inventario total valorizado | HU-28 | `[x]` | Tab `Valorizado` en `/admin/inventario` usando vista `inventario_valorizado` |
| S5-04 | Registro de incidencia durante visita (tipo, descripción, fotos opcionales) | HU-29 | `[x]` | CTA `Reportar incidencia` en `/campo/visita/[id]` + `IncidenciaSheet` |
| S5-05 | Ciclo de vida de incidencia: abierta → en_análisis → resuelta → cerrada (resolución obligatoria) | HU-30 | `[x]` | Trigger SQL + `IncidenciaDetalleSheet` |
| S5-06 | Listado de incidencias abiertas con filtros por tipo, PDV, fecha y días abierta | HU-31 | `[x]` | `/admin/incidencias` |

---

### Sprint 6 — Modo Offline + QA + Pulido UX Móvil
**Objetivo:** App de campo funciona sin internet; estabilización y pruebas con colaboradoras.
**Estado general:** `[x]` completado (2026-03-23)

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| S6-01 | Service worker: cachear ruta del día e inventario de vitrinas en IndexedDB | `[x]` | `manifest.webmanifest`, `sw.js`, snapshots `route/visit` y stores offline |
| S6-02 | Guardar visita completa offline y sincronizar al reconectar | `[x]` | Cola para `start`, `save-count`, `mark-no-realizada`, `upload-photo`, `create-incidencia` y `close` |
| S6-03 | Indicador de estado de conexión en la app móvil | `[x]` | `ConnectionStatusBar` con estados `online/offline/syncing/pending/error` |
| S6-04 | Compresión automática de fotos antes de subir (max 800 KB, formatos JPG/PNG/WEBP) | `[x]` | `lib/offline/compression.ts` usado en fotos de visita e incidencia |
| S6-05 | Tests e2e Playwright: login, visita completa, cierre con reposición | `[x]` | Regresiones `sprint3`, `sprint4`, `sprint6-offline`, `sprint6-mobile`, `mobile` |
| S6-06 | Tests RLS: verificar que cada rol solo accede a lo que le corresponde | `[x]` | `sprint5-rls.spec.ts` ampliado con `sync_operaciones_visita` |
| S6-07 | Ajustes UX móvil (feedback de carga, errores Supabase visibles, accesibilidad) | `[x]` | Banners persistentes, toasts offline claros y spec móvil dedicada |
| S6-08 | Bug fixes del MVP | `[x]` | Hardening de hydration, sync queue, selectors E2E y flujo offline completo |

---

## Fase 2 — Gestión y Analítica

**Estado general:** `[x]` completado (2026-03-24)
**HUs:** HU-32, HU-33, HU-34, HU-35, HU-36, HU-37

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| F2-01 | Registro de garantía (producto defectuoso devuelto por comercio) | HU-32 | `[x]` | Captura en campo + baja auditada desde vitrina |
| F2-02 | Resolución de garantía: cambio / baja / devolución a proveedor | HU-33 | `[x]` | Gestión admin con responsables y actualización de inventario |
| F2-03 | Módulo de Proveedores: CRUD con datos de contacto y condiciones de pago | — | `[x]` | Acceso `admin` y `compras` |
| F2-04 | Módulo de Compras: crear orden, confirmar recepción, registrar cantidades reales | — | `[x]` | Recepción parcial/real y entrada a inventario central |
| F2-05 | Dashboard en tiempo real: ventas del día, visitas, cobros, incidencias abiertas | HU-34 | `[x]` | Realtime + fallback polling; KPI de cobros del mes |
| F2-06 | Gráfica de ventas diarias últimos 30 días | HU-34 | `[x]` | |
| F2-07 | Gráfica de ventas por ruta/colaboradora en el mes | HU-34 | `[x]` | |
| F2-08 | Tabla: top 10 vitrinas por ventas del mes | HU-34 | `[x]` | |
| F2-09 | Tabla: vitrinas con stock bajo (< 30% del surtido estándar) | HU-37 | `[x]` | Incluye feed de 5 incidencias abiertas con antigüedad |
| F2-10 | Reporte de ventas por período con filtros exportable a Excel (.xlsx) | HU-35 | `[x]` | Filtros por ruta, colaboradora, PDV y producto; export server-side |
| F2-11 | Ranking de vitrinas por ventas con indicadores de cambio vs período anterior | HU-36 | `[x]` | Export server-side |
| F2-12 | Reporte de inventario por ubicación con valor económico exportable | — | `[x]` | Único reporte visible para rol `compras` |
| F2-13 | Reporte de visitas planificadas vs realizadas exportable | — | `[x]` | |
| F2-14 | Reporte de incidencias y garantías por período exportable | — | `[x]` | |

### Fase 2 — Log (2026-03-24)

Completado: Garantías, Proveedores, Compras, Dashboard, Reportes y hardening de release comercial.

Decisiones técnicas:
- Exportación `.xlsx` movida a backend con `exceljs` y endpoint único `/api/reportes/export`.
- `compras` usa home dedicado `/admin/compras`; `proxy`, `root` y login comparten `getHomeForRole`.
- Dashboard alineado con el plan maestro: `cobros_mes`, feed de 5 incidencias abiertas y suite analítica con realtime + fallback.
- Toda visita `completada` requiere al menos 1 foto final de vitrina, también validado en RPC y flujo offline.
- Playwright ahora levanta la app vía `webServer`; CI resetea Supabase local, genera tipos, corre tests y `npm audit --omit=dev`.

---

## Fase 3 — Escala y Optimización

**Estado general:** `[ ]` pendiente

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| F3-01 | Notificaciones push (Web Push API) para alertas críticas | `[ ]` | |
| F3-02 | Integración WhatsApp Business API para alertas operativas | `[ ]` | |
| F3-03 | Mapa de vitrinas y PDV (Mapbox o Google Maps) | `[ ]` | |
| F3-04 | Optimización SQL: índices, particionado para volumen alto | `[ ]` | |
| F3-05 | Panel de configuración de parámetros globales (umbral stock bajo, etc.) | `[ ]` | |

---

## Log de Progreso

> El agente debe registrar aquí cualquier decisión técnica relevante, bloqueante o cambio de alcance.

| Fecha | Sprint/Tarea | Acción | Detalle |
|-------|-------------|--------|---------|
| 2026-03-21 | Fase 0 | Completado | Setup completo: Next.js 14, 10 migraciones SQL, triggers, RLS, auth triggers, seed, clientes Supabase, middleware. |
| 2026-03-21 | Sprint 1 | Completado | Auth, AppShell/AppSidebar, CRUD productos/categorías/PDV/usuarios. 13 tests Playwright. React Query all-client. |
| 2026-03-21 | Sprint 1 | Bug fix | Route groups (admin)/(campo) no generan prefijo URL. Páginas movidas a subcarpetas admin/ y campo/ dentro del grupo. |
| 2026-03-21 | Sprint 1 | Bug fix | Selects vacíos en PDV (zona_id, forma_pago_preferida) fallaban validación Zod. Añadido z.preprocess para convertir "" → undefined. |
| 2026-03-22 | Sprint 2 | Completado | Módulos Vitrinas (listado + detalle tabs), Inventario Central y Rutas con DnD. Dependencias: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities. |
| 2026-03-23 | Sprint 4 | Completado | Flujo completo de cierre de visita: cobro, reposición, fotos y cierre transaccional vía RPC. Admin: formas de pago e inventario de colaboradoras. |
| 2026-03-23 | Sprint 5 | Completado | Inventario avanzado: bajas, historial y valorizado. Incidencias: captura en campo, gestión admin y ciclo de vida validado en DB. |
| 2026-03-23 | Sprint 6 | Completado | Offline de campo con IndexedDB + cola de sync + RPC idempotente para cierre de visita, fotos/incidencias pendientes, compresión y QA móvil/offline. |
| 2026-03-24 | Fase 2 | Completado | Garantías, proveedores, compras, dashboard y reportes cerrados. Exportación Excel server-side, filtro por producto, routing por rol unificado, checklist de release y CI end-to-end. |

---

## Notas del Agente

> Usar esta sección para contexto acumulado entre sesiones (decisiones de arquitectura, dependencias entre tareas, deuda técnica).

- Las tareas de RLS (F0-15) deben completarse antes de cualquier Sprint 1.
- Regenerar `database.types.ts` (F0-17) después de cada migración SQL.
- Los triggers de inventario (F0-13) son bloqueantes para Sprint 4 (cierre de visita).
- El modo offline (Sprint 6) puede desarrollarse en paralelo al Sprint 5 si hay capacidad.

### Decisiones Sprint 1 (relevantes para sprints futuros)

**Estructura de rutas:** Los route groups `(admin)` y `(campo)` son solo organizativos — NO añaden segmento URL. Las páginas viven en subcarpetas `admin/` y `campo/` dentro del grupo para generar `/admin/*` y `/campo/*`. Respetar este patrón en todos los sprints.

**Roles:** `UserRol` y `ROLES` exportados desde `lib/validations/usuarios.ts`. El middleware lee `user.app_metadata.rol`. Para crear usuarios en Supabase local usar Docker: `docker exec -i supabase_db_erp-vitrinas psql -U postgres`.

**Formularios:** Selects HTML con opción vacía (`value=""`) necesitan `z.preprocess((v) => v === '' ? undefined : v, ...)` antes del validador Zod. Aplicar en todos los schemas nuevos que tengan campos opcionales con select.

**Tests e2e:** Playwright configurado. Selectores por `input[name="..."]` (no por label, los Field no tienen htmlFor). Admin user: `admin@erp.local` / `Admin1234!`.

**Git:** `develop` no existía en el remote al inicio del Sprint 1 — el PR fue directo a `main`. Antes de Sprint 2 crear `develop` en el remote y trabajar con el flujo correcto: feature → develop → main.

### Log Sprint 3 (2026-03-22)

| Fecha | Sprint/Tarea | Acción | Detalle |
|-------|-------------|--------|---------|
| 2026-03-22 | Sprint 2 | Completado | Módulos Vitrinas, Inventario Central y Rutas. PR mergeado a main antes de iniciar Sprint 3. |
| 2026-03-22 | Sprint 3 | Completado | Flujo de visita campo completo + dashboard admin visitas. 7/7 tests Playwright. Rama `feature/sprint3-visitas-campo`. |

### Decisiones Sprint 3 (relevantes para sprints futuros)

**PostgREST FK path en `visitas`:** No existe FK directa de `visitas` a `rutas_pdv`. Para obtener `orden_visita`, unir a través de `rutas!inner(nombre, rutas_pdv(orden_visita, pdv_id))` y hacer match por `pdv_id` en cliente.

**Edge Functions Deno + tsconfig:** Las Edge Functions usan globals de Deno no disponibles en Node. Añadir `"supabase/functions"` al array `exclude` de `tsconfig.json` para evitar errores de tipo en `tsc --noEmit`.

**Cache React Query en mutations:** Si el sheet/dialog reabre inmediatamente tras guardar, `invalidateQueries` puede llegar tarde (refetch async). Solución: usar `setQueryData` para actualizar el cache sincrónicamente en `onSuccess` + `invalidateQueries` para consistencia background.

**Prop drilling a sheets:** Al pasar datos de un row a un sheet de edición, revisar que TODOS los campos del schema del formulario estén incluidos en el objeto prop — especialmente campos opacionales nuevos. Omitir un campo hace que el sheet muestre el default en lugar del valor guardado.

**`inv_anterior = 0`:** Primera visita a una vitrina nueva no tiene row en `inventario_vitrina`. Usar `inventarioMap.get(prod.id) ?? 0`.

**Cron de generación de visitas:** `supabase/config.toml` en CLI local v2.75.0 no soporta `schedule` en `[functions.*]`. Configurar el cron desde el dashboard de Supabase Cloud en producción.

### Decisiones Sprint 4 (relevantes para sprints futuros)

**Numeración real de migraciones:** Sprint 4 no pudo arrancar en `20260013` porque ya existía `20260013_normalize_dias_visita.sql`. Las migraciones nuevas del sprint comienzan en `20260014`.

**Modelo de inventario de campo:** La reposición ya no sale de `inventario_central` directo. El flujo correcto es `central -> colaboradora -> vitrina`, con `inventario_colaboradora` como snapshot denormalizado y `movimientos_inventario` como fuente inmutable.

**Cierre de visita atómico:** El RPC `cerrar_visita()` es la fuente de verdad del cierre. Además de persistir cobro y reposiciones, también registra movimientos `venta` para que el stock de vitrina refleje el conteo antes de sumar reposición.

**Bucket de fotos:** El nombre consistente del bucket en local y RLS es `fotos-visita`. Evitar variantes como `visitas-fotos` o `fotos-visitas` en código nuevo.

**Foto final obligatoria:** Desde el cierre comercial de Fase 2, una visita no puede quedar `completada` sin al menos 1 foto final de vitrina. La regla vive en UI, sync offline y RPC.

**Regresión de Sprint 3:** Con Sprint 4, `guardarConteo` ya no redirige a ruta; ahora avanza a cobro dentro de `/campo/visita/[id]`. Los tests de Sprint 3 deben validar esa transición.

### Decisiones Sprint 6 (relevantes para sprints futuros)

**Offline explícito por dominio:** No persistir toda la cache de React Query como estrategia principal. Sprint 6 planea una capa propia `lib/offline/*` con snapshots, drafts, cola y blobs pendientes en IndexedDB.

**Cierre offline idempotente:** `cerrar_visita()` no es suficiente para reintentos ambiguos tras pérdida de red. Sprint 6 debe introducir un RPC idempotente respaldado por `client_sync_id`.

**PWA manual:** El plan de Sprint 6 usa `service worker` propio + `manifest.webmanifest`, evitando dependencias pesadas tipo `next-pwa` para mantener control fino del alcance offline.

### Decisiones Sprint 5 (relevantes para sprints futuros)

**Inventario avanzado dentro del módulo existente:** HU-26/27/28 no abrieron un módulo nuevo. Todo quedó integrado en `/admin/inventario` con tabs `Central`, `Colaboradoras`, `Movimientos` y `Valorizado`.

**Bajas auditadas:** Las bajas siguen usando `tipo = 'baja'` en `movimientos_inventario`; la causa estructurada se guarda en `motivo_baja` (`robo`, `perdida`, `dano`) y `notas` conserva el contexto libre.

**Historial y valorización por vistas SQL:** Para evitar joins repetidos en cliente, Sprint 5 creó las vistas `movimientos_inventario_detalle` e `inventario_valorizado`. Los hooks consumen esas vistas como fuente principal.

**Incidencias sin romper el stepper:** El registro de incidencias en campo se integró como acción secundaria en `/campo/visita/[id]`; no se añadió una nueva `EtapaVisita`, preservando el flujo estable de Sprint 4.

### Decisiones Fase 2 (relevantes para release y mantenimiento)

**Exportación de reportes:** Los workbooks ya no se construyen en cliente. Todo `.xlsx` sale del endpoint `/api/reportes/export` con `exceljs`; la UI solo descarga.

**Routing por rol:** `getHomeForRole` es la fuente única para login, `/` y `proxy`. Si se agrega un rol nuevo, debe actualizarse ahí primero.

**Reportes por rol:** `compras` entra al centro de reportes pero solo ve inventario. `admin`, `supervisor` y `analista` mantienen la suite completa.

**Gate comercial:** Antes de marcar una release como lista deben pasar `db:reset`, `seed:auth`, `types:gen`, `type-check`, `lint`, `test`, `build`, `test:e2e` y `audit:prod`.

**Fotos de incidencia:** Se reutiliza el bucket `fotos-visita` con paths `incidencias/{incidencia_id}/...`, y las referencias quedan en la tabla `fotos_incidencia`.

**Workflow de incidencias protegido en DB:** La transición `abierta -> en_analisis -> resuelta -> cerrada` y la resolución obligatoria al resolver/cerrar se validan en PostgreSQL, no solo en cliente.
