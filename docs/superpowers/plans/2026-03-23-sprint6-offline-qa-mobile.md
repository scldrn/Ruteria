# Sprint 6 — Offline + QA + Pulido UX Móvil — Implementation Plan

> **For agentic workers:** implementar por tareas cerradas, validando regresiones de Sprint 4 y 5 antes de pasar a sincronización offline.

**Goal:** Habilitar operación offline confiable en la app de campo, sincronización segura al reconectar, compresión de fotos y endurecimiento de QA móvil/permisos.

**Architecture:** `service worker` manual + IndexedDB explícita para snapshots, drafts, cola y blobs. Supabase sigue siendo fuente de verdad final. El cierre de visita se vuelve idempotente vía RPC nueva para tolerar reintentos ambiguos.

**Tech Stack:** Next.js 16, React 19, TanStack React Query v5, Supabase PostgreSQL/Auth/Storage, Playwright, Vitest, IndexedDB nativa con wrapper propio ligero

---

## Prerequisito — Rama feature

```bash
cd /Users/sam/Proyects/PowerApp/erp-vitrinas
git checkout main && git pull
git checkout -b feature/sprint6-offline-qa-mobile
```

Verificación base:

```bash
npm run type-check
npm run lint
npm test
npx playwright test tests/sprint4.spec.ts
npx playwright test tests/sprint5.spec.ts
npx playwright test tests/sprint5-rls.spec.ts
```

Expected: todo verde antes de tocar offline.

---

## File Map

### Archivos nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `public/manifest.webmanifest` | Manifest PWA |
| `public/sw.js` | Service worker para app shell/assets |
| `public/icons/*` | Íconos PWA mínimos |
| `lib/offline/db.ts` | Apertura y versionado de IndexedDB |
| `lib/offline/stores.ts` | Acceso tipado a stores |
| `lib/offline/snapshots.ts` | Persistencia de ruta del día y visitas |
| `lib/offline/drafts.ts` | Estado durable de visitas en progreso |
| `lib/offline/queue.ts` | Cola append-only de sync |
| `lib/offline/network.ts` | Estado de red + heartbeat |
| `lib/offline/sync.ts` | Orquestador principal de sincronización |
| `lib/offline/compression.ts` | Compresión y resize de fotos |
| `lib/hooks/useOfflineSync.ts` | Hook de estado/reintento de sync |
| `components/campo/ConnectionStatusBar.tsx` | Banner persistente de estado online/sync |
| `components/campo/SyncPendingBadge.tsx` | Badge de visita pendiente |
| `tests/sprint6-offline.spec.ts` | E2E de snapshots + cola + sync |
| `tests/sprint6-mobile.spec.ts` | QA visual/usable móvil ampliada |
| `supabase/migrations/20260028_sync_operaciones_visita.sql` | Tabla + RPC idempotente para cierre offline |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/layout.tsx` | Registrar manifest, SW y metadatos PWA |
| `lib/providers.tsx` | Inicializar listeners de red/sync si corresponde |
| `lib/hooks/useRutaDelDia.ts` | Online-first con fallback a snapshot local |
| `lib/hooks/useVisita.ts` | Draft local + cola + sync de cierre offline |
| `lib/hooks/useIncidencias.ts` | Soporte para incidencias offline/pending |
| `components/campo/VisitaFotosView.tsx` | Compresión previa y estados pending |
| `app/(campo)/campo/ruta-del-dia/page.tsx` | Banner/estado offline y badges |
| `app/(campo)/campo/visita/[id]/page.tsx` | Integración de sync status y guardado local |
| `tests/mobile.spec.ts` | Regresión móvil base más estricta |
| `lib/supabase/database.types.ts` | Tipos regenerados tras migración |
| `CODEX_CONTEXT.md` | Actualizar estado y próximos pasos |
| `SPRINTS.md` | Registrar planeación de Sprint 6 |

---

## Task 1: Base de datos para sync idempotente

**Files:**

- Create: `erp-vitrinas/supabase/migrations/20260028_sync_operaciones_visita.sql`
- Modify: `erp-vitrinas/lib/supabase/database.types.ts`

- [ ] **Step 1: Crear tabla `sync_operaciones_visita`**

Campos mínimos:

- `client_sync_id uuid primary key`
- `visita_id uuid not null references visitas(id) on delete cascade`
- `tipo text not null check (tipo in ('close'))`
- `payload_hash text null`
- `procesado_at timestamptz not null default now()`
- `created_by uuid references usuarios(id)`

- [ ] **Step 2: Crear RPC `cerrar_visita_offline()`**

Firmas sugeridas:

```sql
cerrar_visita_offline(
  p_visita_id uuid,
  p_cobro jsonb,
  p_reposiciones jsonb,
  p_client_sync_id uuid
)
```

Reglas:

- si `p_client_sync_id` ya existe, salir con éxito lógico
- si no existe, procesar lógica equivalente a `cerrar_visita()`
- registrar `client_sync_id`
- mantener semántica actual de cobro, movimientos y cambio de estado

- [ ] **Step 3: Aplicar migración y regenerar tipos**

```bash
cd erp-vitrinas
supabase db reset
supabase gen types typescript --local > lib/supabase/database.types.ts
npm run seed:auth
```

- [ ] **Step 4: Validar no duplicación**

Agregar test de DB o Playwright API-level que invoque dos veces `cerrar_visita_offline` con el mismo `client_sync_id` y verifique:

- un solo cobro
- movimientos no duplicados
- visita completada correctamente

---

## Task 2: Infraestructura PWA mínima

**Files:**

- Create: `erp-vitrinas/public/manifest.webmanifest`
- Create: `erp-vitrinas/public/sw.js`
- Create: `erp-vitrinas/public/icons/*`
- Modify: `erp-vitrinas/app/layout.tsx`

- [ ] **Step 1: Crear manifest**

Definir:

- `name`, `short_name`
- `display: standalone`
- `theme_color`, `background_color`
- íconos básicos
- `start_url: /campo/ruta-del-dia`

- [ ] **Step 2: Crear service worker manual**

Responsabilidades:

- cachear app shell y assets estáticos
- estrategia `network-first` para HTML del campo
- estrategia `stale-while-revalidate` para assets
- nunca persistir datos de negocio sensibles en Cache Storage

- [ ] **Step 3: Registrar SW desde cliente**

Evitar SSR issues:

- registrar solo en navegador
- no romper admin desktop

- [ ] **Step 4: Probar instalación básica**

Validar:

- manifest servido
- SW registrado
- navegación básica de campo sin errores al recargar

---

## Task 3: Capa IndexedDB para snapshots, drafts y cola

**Files:**

- Create: `erp-vitrinas/lib/offline/db.ts`
- Create: `erp-vitrinas/lib/offline/stores.ts`
- Create: `erp-vitrinas/lib/offline/snapshots.ts`
- Create: `erp-vitrinas/lib/offline/drafts.ts`
- Create: `erp-vitrinas/lib/offline/queue.ts`

- [ ] **Step 1: Diseñar esquema IndexedDB**

Stores:

- `route_snapshots`
- `visit_snapshots`
- `visit_drafts`
- `sync_queue`
- `pending_photos`
- `app_meta`

- [ ] **Step 2: Implementar helpers tipados**

Operaciones mínimas:

- `put/get/delete/list`
- `enqueue/dequeue/markFailed/markDone`
- `upsertDraft`
- `saveSnapshot`

- [ ] **Step 3: Modelar tipos**

Tipos sugeridos:

- `OfflineVisitDraft`
- `OfflineSyncItem`
- `OfflinePhotoBlob`
- `OfflineSyncStatus`

- [ ] **Step 4: Agregar tests unitarios**

Cubrir:

- serialización/deserialización
- actualización incremental del draft
- reintentos y errores de la cola

---

## Task 4: Lectura offline en ruta del día y detalle de visita

**Files:**

- Modify: `erp-vitrinas/lib/hooks/useRutaDelDia.ts`
- Modify: `erp-vitrinas/lib/hooks/useVisita.ts`
- Modify: `erp-vitrinas/app/(campo)/campo/ruta-del-dia/page.tsx`
- Modify: `erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx`

- [ ] **Step 1: `useRutaDelDia` online-first**

Comportamiento:

- si online, leer Supabase y persistir snapshot
- si falla por red, devolver snapshot
- exponer flags como:
  - `isOfflineFallback`
  - `lastSyncedAt`

- [ ] **Step 2: `useVisita` online-first con draft local**

Comportamiento:

- mezclar snapshot remoto con draft local pendiente
- si existe draft más reciente, priorizarlo en UI

- [ ] **Step 3: Exponer badges de visitas pendientes**

En `/campo/ruta-del-dia`:

- badge `Pendiente de sincronizar`
- badge `Error de sync`

- [ ] **Step 4: Mantener compatibilidad total online**

Expected:

- sin regresión del flujo actual cuando hay internet

---

## Task 5: Escrituras offline y sincronización

**Files:**

- Create: `erp-vitrinas/lib/offline/network.ts`
- Create: `erp-vitrinas/lib/offline/sync.ts`
- Create: `erp-vitrinas/lib/hooks/useOfflineSync.ts`
- Modify: `erp-vitrinas/lib/hooks/useVisita.ts`
- Modify: `erp-vitrinas/lib/hooks/useIncidencias.ts`

- [ ] **Step 1: Detectar conectividad real**

No confiar solo en `navigator.onLine`.

Implementar:

- listeners `online/offline`
- heartbeat corto a Supabase o endpoint simple

- [ ] **Step 2: Interceptar mutaciones de visita**

Para cada acción:

- actualizar draft local primero
- si offline, encolar
- si online, persistir y limpiar draft/queue según corresponda

- [ ] **Step 3: Implementar sincronizador serial**

Reglas:

- procesar un item a la vez
- detenerse en errores no recuperables
- marcar recoverable vs non-recoverable

- [ ] **Step 4: Integrar RPC idempotente para cierre**

El cierre debe usar `client_sync_id` generado en cliente.

- [ ] **Step 5: Limpiar cola y snapshots obsoletos**

Después de sync exitoso:

- borrar queue item
- limpiar blobs ya subidos
- marcar draft como sincronizado

---

## Task 6: Compresión de fotos y manejo de blobs pendientes

**Files:**

- Create: `erp-vitrinas/lib/offline/compression.ts`
- Modify: `erp-vitrinas/components/campo/VisitaFotosView.tsx`
- Modify: `erp-vitrinas/components/campo/IncidenciaSheet.tsx`
- Modify: `erp-vitrinas/lib/hooks/useVisita.ts`
- Modify: `erp-vitrinas/lib/hooks/useIncidencias.ts`

- [ ] **Step 1: Crear utilidad de compresión**

Requisitos:

- resize proporcional
- máximo 800 KB
- input `jpg/png/webp`
- salida preferente JPEG/WebP

- [ ] **Step 2: Guardar blob comprimido localmente**

Antes de upload o enqueue:

- calcular tamaño final
- persistir metadata

- [ ] **Step 3: Upload determinista al sincronizar**

Usar paths estables basados en IDs locales.

- [ ] **Step 4: Manejar errores parciales**

Si sube el blob pero falla la fila DB:

- dejar item reintentable
- no perder referencia local

---

## Task 7: UX móvil y visibilidad de estado

**Files:**

- Create: `erp-vitrinas/components/campo/ConnectionStatusBar.tsx`
- Create: `erp-vitrinas/components/campo/SyncPendingBadge.tsx`
- Modify: `erp-vitrinas/app/(campo)/campo/ruta-del-dia/page.tsx`
- Modify: `erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx`

- [ ] **Step 1: Crear banner persistente de estado**

Estados:

- online
- offline
- syncing
- pending
- error

- [ ] **Step 2: Añadir CTA de reintento manual**

Para casos:

- cola fallida
- heartbeat recuperado

- [ ] **Step 3: Mejorar feedback de carga/error**

Agregar:

- skeletons claros
- mensajes accionables
- errores Supabase legibles

- [ ] **Step 4: Revisar accesibilidad móvil**

Verificar:

- tamaños táctiles
- contraste
- focus visible
- overflow horizontal

---

## Task 8: QA exhaustiva de Sprint 6

**Files:**

- Create: `erp-vitrinas/tests/sprint6-offline.spec.ts`
- Create: `erp-vitrinas/tests/sprint6-mobile.spec.ts`
- Modify: `erp-vitrinas/tests/mobile.spec.ts`
- Modify/Add: tests unitarios de `lib/offline/*`

- [ ] **Step 1: E2E offline de snapshots**

Casos:

- cargar ruta online
- poner browser offline
- reabrir ruta del día desde snapshot

- [ ] **Step 2: E2E de visita offline completa**

Casos:

- iniciar visita offline
- guardar conteo
- cerrar offline
- volver online
- sincronizar
- verificar DB final

- [ ] **Step 3: E2E de incidencias offline**

Casos:

- crear incidencia offline
- sincronizar luego
- validar estado final en admin

- [ ] **Step 4: E2E de fotos comprimidas**

Validar:

- tamaño máximo
- upload posterior exitoso

- [ ] **Step 5: RLS y regresión**

Correr:

- `tests/sprint4.spec.ts`
- `tests/sprint5.spec.ts`
- `tests/sprint5-rls.spec.ts`

Agregar al menos un caso nuevo de permisos que siga verde tras capa offline.

---

## Task 9: Documentación y cierre del sprint

**Files:**

- Modify: `CODEX_CONTEXT.md`
- Modify: `SPRINTS.md`

- [ ] **Step 1: Actualizar estado del sprint**
- [ ] **Step 2: Registrar decisiones importantes**
- [ ] **Step 3: Dejar comandos de verificación final**

Checklist final esperado:

```bash
cd erp-vitrinas
supabase db reset
npm run seed:auth
npm run type-check
npm run lint
npm test
npx playwright test tests/sprint4.spec.ts
npx playwright test tests/sprint5.spec.ts
npx playwright test tests/sprint5-rls.spec.ts
npx playwright test tests/sprint6-offline.spec.ts
npx playwright test tests/sprint6-mobile.spec.ts
```

---

## Orden recomendado de implementación

1. Migración/RPC idempotente
2. Infraestructura PWA mínima
3. IndexedDB y cola
4. Lectura offline de ruta y visita
5. Mutaciones offline y sincronizador
6. Fotos comprimidas/pending
7. UX móvil/status
8. QA y regresiones
9. Documentación final

---

## Resultado esperado

Al terminar Sprint 6:

- la app de campo opera con conectividad intermitente,
- los datos quedan guardados localmente antes de depender de la red,
- la sincronización posterior es segura e idempotente,
- el cierre offline no duplica cobros ni inventario,
- y la calidad queda respaldada por pruebas específicas de móvil, offline y permisos.
