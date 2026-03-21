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
**Estado general:** `[ ]` pendiente
**HUs:** HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S1-01 | Página de login con email/contraseña (Supabase Auth) | HU-01 | `[ ]` | |
| S1-02 | Redirección post-login según rol (admin → /dashboard, colaboradora → /ruta-del-dia) | HU-01 | `[ ]` | |
| S1-03 | Middleware de protección de rutas + sesión persistente | HU-01 | `[ ]` | |
| S1-04 | Página de logout | HU-03 | `[ ]` | |
| S1-05 | CRUD de usuarios con asignación de roles (solo admin) | HU-02 | `[ ]` | |
| S1-06 | Listado de productos con búsqueda en tiempo real y filtros | HU-07 | `[ ]` | |
| S1-07 | Formulario de creación de producto (código único, nombre, categoría, costo, precio) | HU-04 | `[ ]` | |
| S1-08 | Edición de producto (precio de venta al comercio) | HU-05 | `[ ]` | |
| S1-09 | Activar/desactivar producto | HU-06 | `[ ]` | |
| S1-10 | CRUD de categorías | HU-04 | `[ ]` | |
| S1-11 | Listado y formulario de Puntos de Venta con datos de contacto y ubicación | HU-08 | `[ ]` | |

---

### Sprint 2 — Vitrinas + Inventario Central + Rutas
**Objetivo:** Gestión completa de vitrinas y configuración de rutas.
**Estado general:** `[ ]` pendiente
**HUs:** HU-09, HU-10, HU-11, HU-12, HU-13, HU-25

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S2-01 | Crear vitrina y asignarla a un PDV | HU-09 | `[ ]` | |
| S2-02 | Definir surtido estándar por vitrina (producto + cantidad objetivo) | HU-10 | `[ ]` | |
| S2-03 | Vista de inventario actual de vitrina (stock vs surtido estándar) | HU-11 | `[ ]` | |
| S2-04 | Marcar vitrina como retirada | HU-12 | `[ ]` | |
| S2-05 | Entrada de productos al inventario central por compra | HU-25 | `[ ]` | |
| S2-06 | Crear ruta con lista de PDV ordenada y asignar a colaboradora | HU-13 | `[ ]` | |
| S2-07 | Vista de rutas: listado con estado y colaboradora asignada | HU-13 | `[ ]` | |

---

### Sprint 3 — Planificación de Rutas + Inicio de Visita
**Objetivo:** Colaboradora puede ver su ruta y comenzar una visita con cálculo automático.
**Estado general:** `[ ]` pendiente
**HUs:** HU-14, HU-15, HU-16, HU-17, HU-18, HU-19

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S3-01 | Vista móvil: ruta del día con PDV en orden y estado (pendiente/completado) | HU-14 | `[ ]` | |
| S3-02 | Dashboard admin: visitas planificadas vs realizadas por ruta | HU-15 | `[ ]` | |
| S3-03 | Reasignación temporal de ruta a otra colaboradora (con motivo y fecha) | HU-16 | `[ ]` | |
| S3-04 | Iniciar visita: registrar hora de inicio, mostrar inv_anterior por producto | HU-17 | `[ ]` | |
| S3-05 | Ingreso de inventario actual → cálculo automático de unidades_vendidas | HU-18 | `[ ]` | |
| S3-06 | Mostrar monto total a cobrar desglosado por producto | HU-19 | `[ ]` | |

---

### Sprint 4 — Cierre de Visita: Cobro + Reposición + Fotos
**Objetivo:** Flujo completo de visita: registrar cobro, reponer y cerrar.
**Estado general:** `[ ]` pendiente
**HUs:** HU-20, HU-21, HU-22, HU-23, HU-24

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S4-01 | Registrar monto cobrado y forma de pago | HU-20 | `[ ]` | |
| S4-02 | Validación: nota obligatoria si monto_cobrado ≠ monto_calculado → estado `discrepancia` | HU-20 | `[ ]` | |
| S4-03 | Sugerencia de reposición hasta surtido estándar, ajustable por colaboradora | HU-21 | `[ ]` | |
| S4-04 | Subida de fotos de vitrina a Supabase Storage (antes/después de reposición) | HU-22 | `[ ]` | |
| S4-05 | Cierre de visita: actualizar inventario_vitrina + inventario_central + movimientos | HU-23 | `[ ]` | |
| S4-06 | Cierre de visita: generar cobro + marcar visita como `completada` | HU-23 | `[ ]` | |
| S4-07 | Marcar visita como `no_realizada` con motivo | HU-24 | `[ ]` | |

---

### Sprint 5 — Inventario Avanzado + Incidencias
**Objetivo:** Gestión completa de bajas de inventario e incidencias operativas.
**Estado general:** `[ ]` pendiente
**HUs:** HU-26, HU-27, HU-28, HU-29, HU-30, HU-31

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| S5-01 | Baja de unidades por robo, pérdida o daño (movimiento inmutable con motivo) | HU-26 | `[ ]` | |
| S5-02 | Historial de movimientos por producto o vitrina | HU-27 | `[ ]` | |
| S5-03 | Reporte de inventario total valorizado | HU-28 | `[ ]` | |
| S5-04 | Registro de incidencia durante visita (tipo, descripción, fotos opcionales) | HU-29 | `[ ]` | |
| S5-05 | Ciclo de vida de incidencia: abierta → en_análisis → resuelta → cerrada (resolución obligatoria) | HU-30 | `[ ]` | |
| S5-06 | Listado de incidencias abiertas con filtros por tipo, PDV, fecha y días abierta | HU-31 | `[ ]` | |

---

### Sprint 6 — Modo Offline + QA + Pulido UX Móvil
**Objetivo:** App de campo funciona sin internet; estabilización y pruebas con colaboradoras.
**Estado general:** `[ ]` pendiente

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| S6-01 | Service worker: cachear ruta del día e inventario de vitrinas en IndexedDB | `[ ]` | |
| S6-02 | Guardar visita completa offline y sincronizar al reconectar | `[ ]` | |
| S6-03 | Indicador de estado de conexión en la app móvil | `[ ]` | |
| S6-04 | Compresión automática de fotos antes de subir (max 800 KB, formatos JPG/PNG/WEBP) | `[ ]` | |
| S6-05 | Tests e2e Playwright: login, visita completa, cierre con reposición | `[ ]` | |
| S6-06 | Tests RLS: verificar que cada rol solo accede a lo que le corresponde | `[ ]` | |
| S6-07 | Ajustes UX móvil (feedback de carga, errores Supabase visibles, accesibilidad) | `[ ]` | |
| S6-08 | Bug fixes del MVP | `[ ]` | |

---

## Fase 2 — Gestión y Analítica

**Estado general:** `[ ]` pendiente
**HUs:** HU-32, HU-33, HU-34, HU-35, HU-36, HU-37

| # | Tarea | HU | Estado | Notas |
|---|-------|----|--------|-------|
| F2-01 | Registro de garantía (producto defectuoso devuelto por comercio) | HU-32 | `[ ]` | |
| F2-02 | Resolución de garantía: cambio / baja / devolución a proveedor | HU-33 | `[ ]` | |
| F2-03 | Módulo de Proveedores: CRUD con datos de contacto y condiciones de pago | — | `[ ]` | |
| F2-04 | Módulo de Compras: crear orden, confirmar recepción, registrar cantidades reales | — | `[ ]` | |
| F2-05 | Dashboard en tiempo real: ventas del día, visitas, cobros, incidencias abiertas | HU-34 | `[ ]` | Supabase Realtime |
| F2-06 | Gráfica de ventas diarias últimos 30 días | HU-34 | `[ ]` | |
| F2-07 | Gráfica de ventas por ruta/colaboradora en el mes | HU-34 | `[ ]` | |
| F2-08 | Tabla: top 10 vitrinas por ventas del mes | HU-34 | `[ ]` | |
| F2-09 | Tabla: vitrinas con stock bajo (< 30% del surtido estándar) | HU-37 | `[ ]` | |
| F2-10 | Reporte de ventas por período con filtros exportable a Excel (.xlsx) | HU-35 | `[ ]` | |
| F2-11 | Ranking de vitrinas por ventas con indicadores de cambio vs período anterior | HU-36 | `[ ]` | |
| F2-12 | Reporte de inventario por ubicación con valor económico exportable | — | `[ ]` | |
| F2-13 | Reporte de visitas planificadas vs realizadas exportable | — | `[ ]` | |
| F2-14 | Reporte de incidencias y garantías por período exportable | — | `[ ]` | |

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

---

## Notas del Agente

> Usar esta sección para contexto acumulado entre sesiones (decisiones de arquitectura, dependencias entre tareas, deuda técnica).

- Las tareas de RLS (F0-15) deben completarse antes de cualquier Sprint 1.
- Regenerar `database.types.ts` (F0-17) después de cada migración SQL.
- Los triggers de inventario (F0-13) son bloqueantes para Sprint 4 (cierre de visita).
- El modo offline (Sprint 6) puede desarrollarse en paralelo al Sprint 5 si hay capacidad.
