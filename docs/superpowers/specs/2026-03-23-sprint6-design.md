# Sprint 6 Design — Offline + QA + Pulido UX Móvil

**Fecha:** 2026-03-23
**Sprint:** 6
**Tareas SPRINTS.md:** S6-01 a S6-08

---

## Contexto

Sprint 5 dejó completo el MVP operativo: inventario avanzado, incidencias, flujo de visita transaccional y una base de pruebas mucho más robusta. El siguiente bloque natural no es añadir más módulos de negocio, sino volver confiable la operación real de campo:

1. que la colaboradora pueda seguir trabajando sin conexión,
2. que el cierre de visita no se pierda ni se duplique al reconectar,
3. que la experiencia móvil tenga feedback claro,
4. y que el sistema quede endurecido con QA específico de offline, móvil y permisos.

El código actual todavía depende totalmente de conectividad:

- no existe `service worker`
- no existe `manifest.webmanifest`
- no hay almacenamiento persistente en IndexedDB
- `useRutaDelDia` y `useVisita` solo leen online desde Supabase
- la subida de fotos es directa a Storage y falla si no hay internet
- `cerrar_visita()` no fue diseñado para reintentos ambiguos desde una cola offline

Sprint 6 debe resolver eso sin romper la arquitectura ya consolidada:

- hooks como fuente de datos
- componentes sin acceso directo a Supabase
- RLS como frontera de seguridad
- PostgreSQL como fuente de verdad final

---

## Objetivo del sprint

Convertir la vista de campo en una PWA operable en condiciones de conectividad débil o inexistente, con sincronización segura al reconectar, compresión de fotos, indicadores de estado claros y una batería de QA enfocada en robustez real de operación.

---

## Decisiones de diseño

1. **PWA manual, no `next-pwa`:** se implementa `service worker` propio, `manifest.webmanifest` y registro explícito desde cliente. El alcance offline es acotado y controlado; no conviene introducir una abstracción pesada para este sprint.

2. **Offline explícito por dominio, no persistencia ciega de React Query:** React Query sigue siendo la capa online/cache corto. La persistencia durable vive en una capa nueva `lib/offline/*` con IndexedDB, porque necesitamos colas, blobs de fotos, drafts y metadatos de sync, no solo snapshots de queries.

3. **Dos niveles locales para campo:**  
   - `snapshots` para leer ruta/visita sin internet  
   - `drafts + sync_queue` para operaciones pendientes y reintentos

4. **La unidad offline es la visita:** el estado local principal no será “un paso suelto”, sino un `visit draft` que representa la verdad local de la visita en progreso: inicio, conteo, cobro, reposiciones, incidencias, fotos y cierre pendiente.

5. **La cola de sync es append-only e idempotente:** cada operación offline genera un item en `sync_queue` con `id`, `type`, `entityId`, `payload`, `attemptCount`, `lastError`, `createdAt`. La app puede reconstruir el estado desde el draft, pero la cola es la fuente de replay.

6. **El cierre de visita requiere idempotencia del lado servidor:** `cerrar_visita()` no basta para offline porque un reintento tras timeout podría duplicar cobro y movimientos. Se crea una variante idempotente, por ejemplo `cerrar_visita_offline(...)`, respaldada por una tabla `sync_operaciones_visita`.

7. **No se depende de Background Sync del navegador:** en iOS/PWA esa API es inconsistente. La sincronización se dispara en eventos confiables: `online`, foco de la app, apertura de ruta del día, apertura de visita y acción manual de reintentar.

8. **Las fotos se comprimen antes de persistir localmente o subir:** se usa canvas/bitmap del navegador; target 800 KB, formatos `jpg/png/webp`, con salida preferente JPEG o WebP cuando sea posible.

9. **Los blobs de fotos pendientes viven en IndexedDB, no en Cache Storage:** Cache Storage sirve para assets/app shell. Las fotos de usuario pendientes requieren lookup por visita/incidencia y metadata adicional.

10. **La UI móvil siempre muestra estado de conectividad y de sincronización:** no basta con toast ocasional. Deben existir indicadores persistentes para: `online`, `offline`, `sincronizando`, `pendiente`, `error de sync`.

11. **La experiencia offline es solo para campo:** el panel admin no entra en alcance PWA completo. Admin se beneficia indirectamente de la mayor estabilidad y de más pruebas.

12. **Sprint 6 también endurece QA estructural:** se amplía Playwright móvil, pruebas de permisos y regresión; no se trata solo de features visibles.

---

## Arquitectura propuesta

### Capa nueva: `lib/offline/`

Módulos esperados:

- `db.ts`: apertura/versionado de IndexedDB
- `stores.ts`: acceso tipado a stores
- `drafts.ts`: CRUD de drafts de visita
- `queue.ts`: enqueue/dequeue/retry/failure
- `snapshots.ts`: cache persistente de ruta del día y visitas
- `photos.ts`: persistencia de blobs + metadata
- `network.ts`: detección de estado online/heartbeat Supabase
- `sync.ts`: orquestador de sincronización
- `compression.ts`: compresión/resizing de imágenes

### Stores de IndexedDB

Stores mínimas:

- `route_snapshots`
- `visit_snapshots`
- `visit_drafts`
- `sync_queue`
- `pending_photos`
- `app_meta`

### Flujo online/offline de lectura

1. Intentar leer online.
2. Si responde, normalizar y persistir snapshot local.
3. Si falla por red, leer desde snapshot local.
4. Si no existe snapshot, mostrar estado vacío offline y CTA de reintento.

### Flujo online/offline de escritura

1. La UI escribe sobre `visit_draft`.
2. Si hay conexión saludable, intenta persistir de inmediato.
3. Si no hay conexión, encola operación y marca draft como `pending_sync`.
4. Al reconectar, el sincronizador procesa la cola en orden estable.

---

## Diseño del sincronizador

### Tipos de operación

Operaciones previstas:

- `visit:start`
- `visit:save-count`
- `visit:mark-no-realizada`
- `visit:upload-photo`
- `visit:delete-photo`
- `visit:create-incidencia`
- `visit:close`

### Reglas de replay

- `visit:start`: `update visitas set estado='en_ejecucion'... where id = ?`
- `visit:save-count`: `upsert detalle_visita` por `visita_id, producto_id`
- `visit:mark-no-realizada`: update idempotente
- `visit:create-incidencia`: insert/upsert con `id` generado en cliente
- `visit:upload-photo`: subir blob, luego insertar fila asociada
- `visit:close`: RPC idempotente con `client_sync_id`

### Tabla nueva de idempotencia

```sql
CREATE TABLE sync_operaciones_visita (
  client_sync_id UUID PRIMARY KEY,
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('close')),
  payload_hash TEXT,
  procesado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);
```

Uso:

- si llega un `client_sync_id` nuevo, el RPC procesa normalmente
- si llega uno repetido, devuelve éxito lógico sin volver a insertar cobro ni movimientos

### RPC nuevo esperado

`cerrar_visita_offline(`

- `p_visita_id uuid`
- `p_cobro jsonb`
- `p_reposiciones jsonb`
- `p_client_sync_id uuid`

`)`

Semántica:

- misma lógica de `cerrar_visita()`
- protege contra reintentos duplicados
- si la visita ya quedó `completada` con ese `client_sync_id`, responde sin repetir side effects

No se reemplaza `cerrar_visita()` todavía; la app de campo usará la variante offline-safe.

---

## Fotos y compresión

### Reglas UX/técnicas

- formatos de entrada permitidos: `image/jpeg`, `image/png`, `image/webp`
- fotos mayores se redimensionan manteniendo proporción
- objetivo: archivo final <= 800 KB
- si no se logra en primer intento, bajar calidad progresivamente
- persistir metadata:
  - `localPhotoId`
  - `entityType`
  - `entityId`
  - `blob`
  - `mimeType`
  - `size`
  - `status`

### Path de Storage

Se mantiene bucket `fotos-visita`.

Rutas propuestas:

- visita: `visitas/{visita_id}/{local_photo_id}.jpg`
- incidencia: `incidencias/{incidencia_id}/{local_photo_id}.jpg`

Usar IDs estables evita duplicados al reintentar.

---

## UX móvil

### Indicadores persistentes

Nuevo componente fijo en vista campo:

- `Online`
- `Sin conexión`
- `Sincronizando...`
- `Pendiente por sincronizar`
- `Error al sincronizar`

### Estados esperados

- si la ruta del día viene de snapshot local, mostrar “Mostrando datos guardados”
- si una visita tiene draft local pendiente, mostrar badge visible en lista de ruta
- al cerrar visita offline, confirmar “Visita guardada en este dispositivo”
- al sincronizar correctamente, confirmar “Visita sincronizada”

### Principios UX

- nunca bloquear el flujo por caída de red
- errores de sync visibles y accionables
- loading states claros
- formularios utilizables con una mano
- contraste y targets táctiles revisados

---

## QA del sprint

### Ejes de prueba

1. Lectura offline de ruta del día con snapshot ya cacheado
2. Inicio de visita sin conexión
3. Guardado de conteo offline
4. Cierre offline con sincronización posterior sin duplicados
5. Incidencia offline y posterior sync
6. Fotos comprimidas dentro del límite
7. Regresiones Sprint 4 y 5
8. RLS crítica por rol
9. Usabilidad móvil y ausencia de overflow

### Casos de fallo que Sprint 6 debe cubrir

- la app arranca offline con snapshot disponible
- la app arranca offline sin snapshot
- la red cae entre guardar conteo y cerrar visita
- la red cae después de enviar el cierre pero antes de recibir respuesta
- el replay de `close` no duplica cobro ni movimientos
- una foto pendiente falla de upload y queda reintentable
- una incidencia creada offline no se pierde al cerrar y reabrir la app

---

## File map propuesto

### Nuevos

- `erp-vitrinas/public/manifest.webmanifest`
- `erp-vitrinas/public/icons/*`
- `erp-vitrinas/public/sw.js`
- `erp-vitrinas/lib/offline/db.ts`
- `erp-vitrinas/lib/offline/stores.ts`
- `erp-vitrinas/lib/offline/queue.ts`
- `erp-vitrinas/lib/offline/drafts.ts`
- `erp-vitrinas/lib/offline/snapshots.ts`
- `erp-vitrinas/lib/offline/sync.ts`
- `erp-vitrinas/lib/offline/network.ts`
- `erp-vitrinas/lib/offline/compression.ts`
- `erp-vitrinas/lib/hooks/useOfflineSync.ts`
- `erp-vitrinas/components/campo/ConnectionStatusBar.tsx`
- `erp-vitrinas/components/campo/SyncPendingBadge.tsx`
- `erp-vitrinas/tests/sprint6-offline.spec.ts`
- `erp-vitrinas/tests/sprint6-mobile.spec.ts`
- `erp-vitrinas/supabase/migrations/20260028_sync_operaciones_visita.sql`

### Modificados

- `erp-vitrinas/app/layout.tsx`
- `erp-vitrinas/lib/providers.tsx`
- `erp-vitrinas/lib/hooks/useRutaDelDia.ts`
- `erp-vitrinas/lib/hooks/useVisita.ts`
- `erp-vitrinas/lib/hooks/useIncidencias.ts`
- `erp-vitrinas/app/(campo)/campo/ruta-del-dia/page.tsx`
- `erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx`
- `erp-vitrinas/components/campo/VisitaFotosView.tsx`
- `erp-vitrinas/lib/supabase/database.types.ts`
- `erp-vitrinas/tests/mobile.spec.ts`

---

## Riesgos y mitigaciones

### Riesgo 1: duplicación de side effects al reconectar

Mitigación:

- RPC idempotente con `client_sync_id`
- paths de fotos estables
- inserts con IDs generados en cliente cuando aplique

### Riesgo 2: IndexedDB crece demasiado por fotos

Mitigación:

- compresión previa
- purge de blobs tras sync exitoso
- límites por draft/visita

### Riesgo 3: percepción de “guardó” cuando no quedó durable

Mitigación:

- no depender solo de toasts
- mostrar estado persistente de draft y sync
- guardar primero en IndexedDB y luego notificar éxito local

### Riesgo 4: flakiness de pruebas E2E por red simulada

Mitigación:

- specs separadas y seriales
- helpers claros de modo offline/online
- reset controlado de snapshots y cola

---

## Resultado esperado al cerrar Sprint 6

- La colaboradora puede abrir su ruta del día sin internet si ya la había cargado antes.
- Puede iniciar y completar una visita offline.
- Puede registrar incidencias y fotos, quedando pendientes si no hay red.
- La app sincroniza automáticamente al reconectar.
- El cierre de visita no duplica cobros ni movimientos aunque haya reintentos.
- La UI móvil comunica claramente qué está guardado localmente y qué falta por sincronizar.
- La suite de QA cubre offline, móvil, regresiones y permisos críticos.
