# ERP – CRM: Vitrinas en Consignación de Accesorios Electrónicos
### Documento Maestro de Planeación y Diseño para Desarrollo

| Campo | Detalle |
|---|---|
| Versión | 2.0 |
| Fecha | 2026 |
| Stack | Next.js 14 + Supabase + TailwindCSS + shadcn/ui |
| Tipo | Documento Interno de Producto |
| Estado | Borrador para Revisión |
| Audiencia | Producto, Desarrollo, Operaciones, Dirección |

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Alcance del Sistema](#2-alcance-del-sistema)
3. [Arquitectura Técnica](#3-arquitectura-técnica)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Modelo de Datos (ERD)](#5-modelo-de-datos-erd)
6. [Roles y Permisos](#6-roles-y-permisos)
7. [Historias de Usuario](#7-historias-de-usuario)
8. [Flujos de Proceso](#8-flujos-de-proceso)
9. [Convenciones de Código y Calidad](#9-convenciones-de-código-y-calidad)
10. [Fases de Desarrollo](#10-fases-de-desarrollo)
11. [Métricas y Reportes](#11-métricas-y-reportes)
12. [Requerimientos No Funcionales](#12-requerimientos-no-funcionales)
13. [Riesgos del Proyecto](#13-riesgos-del-proyecto)
14. [Definition of Done](#14-definition-of-done)
15. [Próximos Pasos](#15-próximos-pasos)

---

## 1. Resumen Ejecutivo

Este documento es la fuente única de verdad para el diseño y desarrollo del sistema ERP-CRM de vitrinas en consignación. Cubre arquitectura, modelo de datos, roles, historias de usuario, flujos de proceso, convenciones de código y plan de implementación por fases.

### 1.1 El Negocio

La empresa distribuye accesorios electrónicos (audífonos, cables, cargadores, etc.) a través de vitrinas propias instaladas en más de 200 comercios minoristas bajo el modelo de consignación: el comercio paga únicamente por lo que vende. Colaboradoras de campo recorren rutas diarias para contar inventario, cobrar y reponer.

### 1.2 Problema

- Gestión 100% manual con alto riesgo de error en conteos y cobros.
- Sin visibilidad en tiempo real del inventario por vitrina.
- Imposible escalar sin un sistema centralizado y trazable.
- Sin métricas confiables: ventas, rotación, incidencias, rentabilidad.

### 1.3 Solución

Plataforma web (SSR/SPA) construida sobre **Next.js 14** y **Supabase**, con interfaz completamente responsiva para que las colaboradoras operen desde el celular sin necesidad de app nativa. El sistema centraliza productos, vitrinas, inventarios, rutas, visitas, cobros, incidencias y analítica.

### 1.4 Objetivos del Sistema

1. Digitalizar el ciclo completo de visita: conteo → cobro → reposición.
2. Mantener inventario trazable en tiempo real (central y por vitrina).
3. Proveer dashboards y reportes para decisiones operativas y estratégicas.
4. Escalar de 200 a 2,000+ vitrinas sin rediseño de infraestructura.
5. Reducir errores, pérdidas y fraudes mediante controles digitales.

---

## 2. Alcance del Sistema

### 2.1 Módulos y Fases

| Módulo | Descripción | Fase |
|---|---|---|
| Autenticación y Roles | Login, sesiones, permisos por perfil. | MVP |
| Catálogo de Productos | CRUD de productos, categorías, precios, estado. | MVP |
| Puntos de Venta | Alta/baja/edición de comercios, datos de contacto, condiciones. | MVP |
| Vitrinas | Gestión de vitrinas, estado, surtido estándar. | MVP |
| Inventario Central | Stock en bodega, entradas por compra, bajas. | MVP |
| Inventario por Vitrina | Stock en cada vitrina, historial de movimientos. | MVP |
| Rutas y Planificación | Definición de rutas, asignación de PDV y colaboradoras. | MVP |
| Registro de Visitas | Flujo móvil: conteo, cálculo, cobro, reposición, fotos. | MVP |
| Incidencias | Registro, seguimiento y resolución de eventos anómalos. | MVP |
| Cobros | Registro de cobros por visita, saldos e historial. | MVP |
| Garantías y Devoluciones | Flujo de productos defectuosos devueltos. | Fase 2 |
| Proveedores y Compras | Datos de proveedores, órdenes de compra, entradas. | Fase 2 |
| Dashboard y Reportes | KPIs, gráficas, rankings, exportación Excel. | Fase 2 |
| Alertas y Notificaciones | Stock bajo, visitas pendientes, incidencias abiertas. | Fase 3 |
| Geolocalización | Mapa de PDV y vitrinas, optimización de rutas. | Fase 3 |

### 2.2 Fuera de Alcance (Fase 1)

- Contabilidad general y estados financieros.
- Nómina y RRHH.
- Sistema POS del comercio.
- CRM avanzado de clientes finales.
- Integraciones con pasarelas de pago.

---

## 3. Arquitectura Técnica

### 3.1 Decisión de Stack

Se adoptó un stack centrado en **Supabase** como backend-as-a-service para acelerar el desarrollo, reducir infraestructura propia y aprovechar capacidades nativas (auth, storage, realtime, RLS). **Next.js 14** provee SSR/SSG para el panel de administración y un router óptimo para la vista móvil de campo.

### 3.2 Stack Tecnológico Definitivo

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend / UI | Next.js 14+ (App Router) | SSR + SSG + routing nativo. Una sola base de código para admin y móvil. |
| Estilos | TailwindCSS + shadcn/ui | Desarrollo rápido, componentes accesibles, mobile-first. |
| Estado del cliente | Zustand + React Query (TanStack) | Estado global liviano; caché y sincronización de datos del servidor. |
| Backend / API | Supabase (PostgreSQL + PostgREST) | API auto-generada, sin servidor propio en Fase 1. |
| Auth | Supabase Auth (JWT) | Login, sesiones, roles con Row Level Security. |
| Base de Datos | PostgreSQL 15 (gestionada por Supabase) | Relacional, RLS por tabla, funciones SQL, triggers. |
| Archivos / Fotos | Supabase Storage | Carga desde móvil, URLs firmadas, bucket privado. |
| Tiempo Real | Supabase Realtime (websockets) | Dashboard live, alertas instantáneas de visitas e incidencias. |
| Funciones de Negocio | Supabase Edge Functions (Deno) | Lógica compleja: cálculo de ventas, validaciones, notificaciones. |
| Hosting | Vercel (frontend) + Supabase Cloud | Deploy automático desde Git, CDN global. |
| CI/CD | GitHub Actions | Tests, lint y deploy automático en merge a `main`. |
| Testing | Vitest + Playwright | Tests unitarios y e2e de flujos críticos. |
| Query Builder | Supabase JS Client v2 | Type-safe queries, sin ORM adicional en Fase 1. |

### 3.3 Capas del Sistema

**Capa de Presentación (Next.js + Tailwind)**
- Panel Admin (web desktop): gestión completa del negocio.
- Vista de Campo (web móvil responsiva): flujo simplificado de visita para colaboradoras.
- Componentes compartidos vía shadcn/ui.

**Capa de API (Supabase)**
- PostgREST: CRUD automático sobre las tablas con RLS activo.
- Edge Functions: lógica de negocio que requiere múltiples tablas o validaciones complejas.
- Realtime: suscripciones a cambios en visitas, inventario e incidencias.

**Capa de Datos (PostgreSQL en Supabase)**
- Tablas con RLS (Row Level Security) por rol.
- Triggers para auditoría automática (`updated_at`, log de cambios).
- Funciones PostgreSQL para cálculos críticos (ventas, inventario).

### 3.4 Seguridad con Row Level Security (RLS)

Cada tabla tendrá políticas RLS que garantizan que los datos solo sean accesibles según el rol del usuario autenticado. Ejemplos:

- Una colaboradora solo puede leer/escribir visitas donde `colaboradora_id = auth.uid()`.
- Solo administradores pueden modificar productos, precios y surtidos estándar.
- Los reportes de inventario valorizado son de solo lectura para roles no-admin.

### 3.5 Modo Offline (PWA)

La vista de campo se implementará como PWA con service worker para:

- Almacenar la ruta del día y el inventario de vitrinas en caché local (IndexedDB).
- Permitir registrar la visita completa sin conexión a internet.
- Sincronizar automáticamente al recuperar la conexión.
- Mostrar indicador de estado de conexión en la app móvil.

---

## 4. Estructura del Proyecto

### 4.1 Repositorio

```
erp-vitrinas/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Rutas del panel administrador
│   │   ├── dashboard/
│   │   ├── productos/
│   │   ├── vitrinas/
│   │   ├── puntos-de-venta/
│   │   ├── rutas/
│   │   ├── inventario/
│   │   ├── incidencias/
│   │   ├── garantias/
│   │   └── reportes/
│   ├── (campo)/                  # Rutas vista móvil colaboradoras
│   │   ├── ruta-del-dia/
│   │   ├── visita/[pdvId]/
│   │   └── incidencias/
│   ├── api/                      # API Routes de Next.js (si se necesitan)
│   └── layout.tsx
├── components/                   # Componentes compartidos
│   ├── ui/                       # shadcn/ui base
│   ├── admin/                    # Componentes exclusivos del panel
│   └── campo/                    # Componentes exclusivos de la vista móvil
├── lib/
│   ├── supabase/                 # Cliente Supabase + tipos generados
│   ├── hooks/                    # React hooks personalizados
│   ├── utils/                    # Funciones utilitarias
│   └── validations/              # Zod schemas
├── supabase/                     # Configuración Supabase
│   ├── migrations/               # Migraciones SQL versionadas
│   ├── functions/                # Edge Functions
│   └── seed/                     # Datos iniciales
├── tests/                        # Tests e2e (Playwright)
├── public/                       # Assets estáticos
├── .env.local                    # Variables de entorno locales
├── .env.example                  # Plantilla de variables
└── package.json
```

### 4.2 Variables de Entorno

| Variable | Descripción | Entorno |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. | Todos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase (uso en cliente). | Todos |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor/Edge Functions). | Servidor |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (para redirects de auth). | Todos |
| `SUPABASE_DB_PASSWORD` | Contraseña directa a PostgreSQL (migraciones). | Dev/CI |
| `STORAGE_BUCKET_FOTOS` | Nombre del bucket de Supabase Storage para fotos. | Todos |

---

## 5. Modelo de Datos (ERD)

### 5.1 Principios del Modelo

- Todas las tablas tienen `id UUID` como primary key.
- Todas incluyen `created_at`, `updated_at` (automático vía trigger) y `created_by`.
- Los movimientos de inventario son **inmutables**: no se borran, solo se crean nuevos.
- El inventario actual se mantiene como campo denormalizado sincronizado por triggers.
- Las políticas RLS se definen junto con cada tabla en la migración.

### 5.2 Tablas del Sistema

#### Núcleo de Catálogo

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `categorias` | id, nombre, descripcion, activo | Categorías de productos (audífonos, cables, etc.). |
| `productos` | id, codigo UNIQUE, nombre, categoria_id FK, descripcion, costo_compra, precio_venta_comercio, unidad_medida, estado, imagen_url | Catálogo completo de accesorios. |
| `proveedores` | id, nombre, contacto_nombre, contacto_email, contacto_tel, condiciones_pago, activo | Proveedores de inventario central. |

#### Red de Distribución

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `zonas` | id, nombre, ciudad, region | Agrupación geográfica de PDV. |
| `puntos_de_venta` | id, codigo UNIQUE, nombre_comercial, tipo, direccion, zona_id FK, lat, lng, contacto_nombre, contacto_tel, condiciones_pago, forma_pago_preferida, activo | Comercios donde se instalan vitrinas. |
| `vitrinas` | id, codigo UNIQUE, pdv_id FK, tipo, estado, fecha_instalacion, fecha_retiro, notas | Activo físico de la empresa en cada PDV. |
| `surtido_estandar` | id, vitrina_id FK, producto_id FK, cantidad_objetivo | Configuración objetivo de unidades por producto en la vitrina. |

#### Personal y Rutas

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `usuarios` | id (= auth.uid), nombre, email, rol, activo | Vinculada a Supabase Auth. El rol controla el acceso RLS. |
| `rutas` | id, codigo UNIQUE, nombre, colaboradora_id FK, zona_id FK, frecuencia, dias_visita (array), estado | Ruta asignada a una colaboradora con sus PDV. |
| `rutas_pdv` | id, ruta_id FK, pdv_id FK, orden_visita INT | PDV que pertenecen a cada ruta con su orden. |

#### Inventario

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `inventario_central` | id, producto_id FK UNIQUE, cantidad_actual INT, costo_promedio, fecha_actualizacion | Snapshot de stock en bodega. |
| `inventario_vitrina` | id, vitrina_id FK, producto_id FK, cantidad_actual INT, fecha_actualizacion. UNIQUE(vitrina_id, producto_id) | Snapshot de stock en cada vitrina. |
| `movimientos_inventario` | id, tipo, origen_tipo, origen_id, destino_tipo, destino_id, producto_id FK, cantidad INT, costo_unitario, referencia_tipo, referencia_id, usuario_id FK, notas | Registro inmutable de todo cambio de inventario. |

**Tipos de movimiento:** `compra` · `traslado_a_vitrina` · `venta` · `devolucion_garantia` · `baja` · `ajuste` · `traslado_entre_vitrinas`

#### Visitas y Cobros

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `visitas` | id, ruta_id FK, pdv_id FK, vitrina_id FK, colaboradora_id FK, fecha_hora_inicio, fecha_hora_fin, estado, motivo_no_realizada, monto_calculado, monto_cobrado, diferencia, notas | Registro central de cada visita. |
| `detalle_visita` | id, visita_id FK, producto_id FK, inv_anterior INT, inv_actual INT, unidades_vendidas INT (generado), unidades_repuestas INT, precio_unitario, subtotal_cobro | Línea por producto en la visita. |
| `cobros` | id, visita_id FK, monto DECIMAL, forma_pago, fecha, estado, notas | Registro del cobro al comercio por visita. |
| `fotos_visita` | id, visita_id FK, url TEXT, tipo, fecha_subida | Fotos tomadas durante la visita. |

**Estados de visita:** `planificada` · `en_ejecucion` · `completada` · `no_realizada`  
**Formas de pago:** `efectivo` · `transferencia` · `nequi` · `daviplata` · `otro`  
**Estados de cobro:** `registrado` · `confirmado` · `pendiente` · `discrepancia`

#### Incidencias, Garantías y Compras

| Tabla | Columnas Clave | Descripción |
|---|---|---|
| `incidencias` | id, visita_id FK, pdv_id FK, vitrina_id FK, tipo, descripcion, estado, responsable_id FK, resolucion, fecha_apertura, fecha_cierre | Eventos anómalos operativos. |
| `garantias` | id, pdv_id FK, producto_id FK, visita_recepcion_id FK, cantidad INT, fecha_venta_aprox, motivo, resolucion, estado, responsable_id FK | Devoluciones de productos defectuosos. |
| `compras` | id, proveedor_id FK, fecha, estado, total_estimado, total_real, notas | Orden de compra a proveedor. |
| `detalle_compra` | id, compra_id FK, producto_id FK, cantidad_pedida INT, cantidad_recibida INT, costo_unitario | Líneas de la orden de compra. |

**Tipos de incidencia:** `producto_defectuoso` · `robo` · `dano_vitrina` · `problema_espacio` · `cobro` · `otro`

### 5.3 Triggers y Funciones SQL Clave

| Nombre | Tipo | Descripción |
|---|---|---|
| `set_updated_at()` | Trigger (before update) | Actualiza `updated_at` automáticamente en todas las tablas. |
| `calcular_unidades_vendidas()` | Trigger (before insert en `detalle_visita`) | Calcula `unidades_vendidas = inv_anterior - inv_actual`. |
| `actualizar_inventario()` | Trigger (after insert en `movimientos_inventario`) | Actualiza `cantidad_actual` en `inventario_vitrina` o `inventario_central` según origen/destino. |
| `validar_stock_no_negativo()` | Trigger (before insert en `movimientos_inventario`) | Lanza excepción si el movimiento dejaría stock negativo. |
| `calcular_monto_visita()` | Function SQL | Calcula `monto_calculado` sumando subtotales de `detalle_visita`. |
| `get_kpi_ventas(fecha_inicio, fecha_fin)` | Function SQL | Retorna KPIs de ventas agrupados por ruta, colaboradora y PDV. |

---

## 6. Roles y Permisos

### 6.1 Perfiles

| Rol | Descripción | Interfaz Principal |
|---|---|---|
| `admin` | Control total del sistema. | Panel web completo. |
| `colaboradora` | Ejecución de visitas en campo. | Vista móvil: su ruta del día, visitas, incidencias. |
| `supervisor` | Supervisión de rutas y colaboradoras. | Panel web: rutas, visitas, incidencias, dashboard y reportes. |
| `analista` | Consulta y reportes. | Panel web: solo lectura, dashboards, exportaciones. |
| `compras` | Gestión de abastecimiento y control administrativo relacionado. | Panel web: proveedores, compras, inventario central, garantías en lectura y reporte de inventario. |

### 6.2 Matriz de Permisos

| Módulo | Admin | Colaboradora | Supervisor | Analista | Compras |
|---|---|---|---|---|---|
| Productos | CRUD | R | R | R | R |
| Puntos de venta | CRUD | R | R | R | R |
| Vitrinas | CRUD | R | R | R | R |
| Surtido estándar | CRUD | R | R | — | — |
| Inventario central | CRUD | — | R | R | CRUD |
| Inventario vitrina | CRUD | R + Reponer | R | R | R |
| Rutas | CRUD | R (la suya) | CRUD | R | — |
| Visitas | CRUD | C + R (las suyas) | R | R | — |
| Detalle visita | CRUD | C (en su visita) | R | R | — |
| Cobros | CRUD | C (en su visita) | R | R | — |
| Incidencias | CRUD | C + R | CRUD | R | — |
| Garantías | CRUD | C | R | R | R |
| Proveedores | CRUD | — | — | R | CRUD |
| Compras | CRUD | — | — | R | CRUD |
| Reportes | Completo | — | Completo | Completo | Inventario |
| Usuarios | CRUD | — | — | — | — |

---

## 7. Historias de Usuario

### 7.1 Autenticación y Roles

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-01 | Como usuario, quiero iniciar sesión con email y contraseña. | Login exitoso redirige según rol (admin → dashboard, colaboradora → ruta del día). Sesión persistente. | Alta |
| HU-02 | Como admin, quiero crear y gestionar usuarios con roles. | Se puede crear, editar, activar/desactivar usuarios. Solo admin puede asignar roles. | Alta |
| HU-03 | Como usuario, quiero cerrar sesión de forma segura. | La sesión se destruye en Supabase Auth. Redirige al login. | Alta |

### 7.2 Catálogo de Productos

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-04 | Como admin, quiero registrar un producto con código, nombre, categoría, costo y precio. | No se guarda sin código único ni precio. Producto aparece activo en el catálogo. | Alta |
| HU-05 | Como admin, quiero editar el precio de venta al comercio. | El nuevo precio aplica a visitas futuras. Visitas anteriores conservan el precio de su registro. | Alta |
| HU-06 | Como admin, quiero activar/desactivar productos. | Producto inactivo no aparece en opciones de reposición. Historial se conserva. | Alta |
| HU-07 | Como admin, quiero buscar y filtrar productos. | Resultados en tiempo real al escribir. Filtros por nombre, categoría y estado. | Media |

### 7.3 Puntos de Venta y Vitrinas

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-08 | Como admin, quiero registrar un PDV con sus datos de contacto, ubicación y tipo. | PDV guardado con todos sus campos. Se puede asociar a rutas y vitrinas. | Alta |
| HU-09 | Como admin, quiero registrar una vitrina y asignarla a un PDV. | Vitrina vinculada al PDV. Estado inicial: activa. | Alta |
| HU-10 | Como admin, quiero definir el surtido estándar de una vitrina. | Se puede definir cantidad objetivo por producto. El sistema lo usa como meta de reposición. | Alta |
| HU-11 | Como admin, quiero ver el inventario actual de una vitrina. | Pantalla muestra stock por producto, cantidad actual vs surtido estándar, fecha de última actualización. | Alta |
| HU-12 | Como admin, quiero marcar una vitrina como retirada. | Vitrina retirada no aparece en rutas activas. Su historial se conserva. | Media |

### 7.4 Rutas y Planificación

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-13 | Como admin, quiero crear una ruta con su lista de PDV y asignarla a una colaboradora. | Ruta guardada con PDV ordenados y colaboradora asignada. | Alta |
| HU-14 | Como colaboradora, quiero ver mi ruta del día al abrir la app. | La app muestra los PDV del día en orden con su estado (pendiente/completado). | Alta |
| HU-15 | Como admin, quiero ver las visitas planificadas vs realizadas de una ruta. | Dashboard muestra porcentaje de cobertura diario y semanal por ruta. | Alta |
| HU-16 | Como supervisor, quiero reasignar temporalmente una ruta a otra colaboradora. | El cambio queda registrado con fecha y motivo. No afecta el historial anterior. | Media |

### 7.5 Registro de Visitas (Flujo Core)

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-17 | Como colaboradora, quiero iniciar una visita en un PDV de mi ruta. | App muestra la vitrina con el inventario de la visita anterior. Se registra hora de inicio. | Alta |
| HU-18 | Como colaboradora, quiero ingresar el inventario actual y que el sistema calcule las unidades vendidas. | `unidades_vendidas = inv_anterior − inv_actual` por producto. Cálculo automático e instantáneo. | Alta |
| HU-19 | Como colaboradora, quiero ver el monto total a cobrar calculado automáticamente. | Monto = Σ(unidades_vendidas × precio_unitario). Se muestra desglosado por producto. | Alta |
| HU-20 | Como colaboradora, quiero registrar el monto cobrado y la forma de pago. | Se registra el monto real cobrado. Si difiere del calculado, la nota es obligatoria. | Alta |
| HU-21 | Como colaboradora, quiero registrar las unidades repuestas por producto. | El sistema sugiere reponer hasta el surtido estándar. Colaboradora puede ajustar. Se genera movimiento de inventario. | Alta |
| HU-22 | Como colaboradora, quiero tomar y subir una foto de la vitrina. | Foto subida a Supabase Storage y vinculada a la visita (antes y después de reposición). Al menos 1 foto final es obligatoria para completar la visita. | Media |
| HU-23 | Como colaboradora, quiero cerrar la visita y que el sistema actualice el inventario. | Al cerrar: actualiza `inventario_vitrina` e `inventario_colaboradora`, genera movimientos, registra el cobro y la visita queda en `completada`. | Alta |
| HU-24 | Como colaboradora, quiero marcar una visita como no realizada con su motivo. | Se registra la visita como `no_realizada` con motivo. El admin recibe una alerta. | Alta |

### 7.6 Inventario

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-25 | Como admin/compras, quiero registrar la entrada de productos al inventario central por compra. | Movimiento de tipo `compra`. Stock central aumenta. Referencia a la compra. | Alta |
| HU-26 | Como admin, quiero dar de baja unidades por robo, pérdida o daño. | Movimiento de baja con tipo, motivo, usuario y fecha. No se puede deshacer sin ajuste auditado. | Alta |
| HU-27 | Como admin, quiero ver el historial completo de movimientos de un producto o vitrina. | Historial ordenado por fecha con tipo, origen, destino, cantidad y usuario. | Media |
| HU-28 | Como admin, quiero ver el inventario total valorizado. | Reporte con stock actual por ubicación, costo total y valor a precio de venta. | Media |

### 7.7 Incidencias

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-29 | Como colaboradora, quiero registrar una incidencia durante la visita. | Incidencia creada con tipo, descripción, fotos opcionales, vinculada a la visita y al PDV. | Alta |
| HU-30 | Como admin/supervisor, quiero gestionar el ciclo de vida de una incidencia hasta cerrarla. | Solo se puede cerrar con resolución registrada. Estado: `abierta → en_análisis → resuelta → cerrada`. | Alta |
| HU-31 | Como admin, quiero ver el listado de incidencias abiertas con filtros. | Tabla con filtros por tipo, PDV y fecha. Indicador de antigüedad (días abierta). | Media |

### 7.8 Garantías

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-32 | Como colaboradora, quiero registrar la recepción de un producto defectuoso devuelto por el comercio. | Garantía creada con producto, motivo y fecha aprox. de venta. Producto se descuenta del inventario vitrina. | Alta |
| HU-33 | Como admin, quiero resolver una garantía indicando si se cambia, da de baja o devuelve al proveedor. | La resolución actualiza el inventario correspondiente y cierra la garantía. | Media |

### 7.9 Reportes y Dashboard

| ID | Historia | Criterios de Aceptación | Prioridad |
|---|---|---|---|
| HU-34 | Como admin, quiero un dashboard con ventas del día, visitas realizadas y cobros del mes. | Dashboard en tiempo real con Supabase Realtime y fallback polling. Incluye ventas diarias últimos 30 días, ventas del mes por ruta/colaboradora, top vitrinas, stock bajo y últimas 5 incidencias abiertas con antigüedad. | Alta |
| HU-35 | Como admin, quiero un reporte de ventas por período filtrable por ruta, colaboradora, PDV y producto. | Tabla y gráfica exportable a Excel (.xlsx) desde backend. | Media |
| HU-36 | Como admin, quiero un ranking de vitrinas por ventas. | Ranking filtrable por período. Indicadores de cambio vs período anterior. | Media |
| HU-37 | Como admin, quiero alertas de stock bajo en vitrinas (< 30% del surtido estándar). | Alerta visible en dashboard. Notificación opcional por email/WhatsApp en Fase 3. | Media |

---

## 8. Flujos de Proceso

### 8.1 Flujo de Visita Estándar

**Actor principal:** Colaboradora de campo (dispositivo móvil).

1. La colaboradora abre la app y ve su ruta del día con PDV pendientes.
2. Selecciona un PDV y pulsa **Iniciar Visita**. El sistema registra la hora de inicio.
3. La app muestra la vitrina con el inventario registrado en la última visita (`inv_anterior` por producto).
4. La colaboradora ingresa el inventario actual contado físicamente.
5. El sistema calcula automáticamente: `unidades_vendidas = inv_anterior − inv_actual`.
6. El sistema muestra el monto a cobrar: `Σ (unidades_vendidas × precio_unitario)`.
7. La colaboradora registra el monto cobrado y la forma de pago (puede diferir del calculado con nota obligatoria).
8. La app sugiere unidades a reponer para alcanzar el surtido estándar. La colaboradora confirma o ajusta.
9. Si hay eventos anómalos: registra incidencia o garantía.
10. Sube fotos de la vitrina (antes y después). Para completar la visita debe quedar al menos 1 foto final registrada.
11. Pulsa **Cerrar Visita**. El sistema: (a) actualiza `inventario_vitrina`, (b) descuenta `inventario_colaboradora`, (c) genera movimientos, (d) registra el cobro, (e) marca la visita como `completada`.

**Casos especiales:**
- **Sin conexión:** la visita se guarda en IndexedDB y se sincroniza al reconectar.
- **Diferencia de cobro:** se registra con el monto real y nota obligatoria. Queda en estado `discrepancia` para revisión del admin.
- **Visita no realizada:** la colaboradora la marca con motivo. El admin recibe alerta.

### 8.2 Flujo de Reposición de Inventario Central

1. El admin detecta stock bajo (alerta en dashboard o reporte de inventario).
2. El admin crea una orden de compra al proveedor desde el módulo de Compras.
3. Al recibir la mercancía, confirma la compra y registra cantidades reales recibidas.
4. El sistema genera movimientos de tipo `compra` y actualiza `inventario_central`.
5. En su próxima ruta, la colaboradora carga los productos para reponer vitrinas.

### 8.3 Flujo de Gestión de Incidencia

1. Colaboradora registra la incidencia durante la visita. Estado inicial: `abierta`.
2. Admin/supervisor recibe alerta en el dashboard. Revisa y cambia a `en_análisis`.
3. Se toman acciones (ajuste de inventario, contacto con el comercio, etc.).
4. Admin registra la resolución y cierra la incidencia. Estado final: `cerrada`.

> **Regla de negocio:** una incidencia no puede cerrarse sin resolución registrada.

### 8.4 Flujo de Garantía

1. El cliente final devuelve el producto defectuoso al comercio.
2. En la siguiente visita, la colaboradora recoge el producto y registra la garantía (producto, motivo, fecha aprox. de venta).
3. El sistema genera un movimiento de baja desde `inventario_vitrina` y crea la garantía con estado `abierta`.
4. El admin decide la resolución: cambio (genera reposición), baja definitiva, o devolución al proveedor.
5. El sistema actualiza inventarios según la resolución y cierra la garantía.

### 8.5 Flujo de Alta de Nueva Vitrina

1. Admin crea el PDV (si no existe).
2. Admin crea la vitrina y la asigna al PDV.
3. Admin define el surtido estándar (qué productos y cuántas unidades objetivo).
4. Admin asigna el PDV a una ruta existente o crea una nueva ruta.
5. La colaboradora asignada ve el nuevo PDV en su ruta en la próxima sesión.
6. En la primera visita, el sistema toma `inv_anterior = 0` para todos los productos.

---

## 9. Convenciones de Código y Calidad

### 9.1 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `VisitaCard`, `InventarioTable` |
| Hooks | camelCase con prefijo `use` | `useVisitas`, `useInventarioVitrina` |
| Funciones utilitarias | camelCase | `calcularMontoVisita`, `formatCurrency` |
| Variables / props | camelCase | `unidadesVendidas`, `fechaVisita` |
| Tablas SQL | snake_case plural | `puntos_de_venta`, `movimientos_inventario` |
| Columnas SQL | snake_case | `cantidad_actual`, `fecha_actualizacion` |
| Archivos componentes | PascalCase.tsx | `VisitaForm.tsx`, `ProductoCard.tsx` |
| Archivos utils | camelCase.ts | `formatDate.ts`, `calcInventario.ts` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FOTO_SIZE_MB`, `ESTADOS_VISITA` |
| Rutas Next.js | kebab-case | `puntos-de-venta`, `ruta-del-dia` |

### 9.2 Reglas de Código

- **TypeScript estricto:** `tsconfig` con `strict: true`. Sin `any` explícito.
- **Tipos de Supabase** generados automáticamente con `supabase gen types typescript`.
- **Validación** de formularios con Zod en cliente y en Edge Functions.
- **No hay fetch directo** a la API en componentes: toda la lógica de datos va en hooks o server actions.
- **Errores de Supabase** siempre manejados y mostrados al usuario (sin silent failures).
- Comentarios en **español** para lógica de negocio; **inglés** para infraestructura técnica.

### 9.3 Git y Pull Requests

- Rama principal: `main` (producción). Rama de integración: `develop`.
- Ramas de feature: `feature/HU-XX-descripcion-corta`.
- Commits en español con prefijo: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Todo PR requiere al menos 1 revisor y que pasen los checks de CI.
- No se hace push directo a `main` ni `develop`.

### 9.4 Testing

| Tipo | Herramienta | Cobertura Mínima |
|---|---|---|
| Tests unitarios | Vitest | Lógica de negocio: cálculo de ventas, validaciones de inventario, utils. |
| Tests de integración | Vitest + Supabase local | Flujos completos de visita y movimientos de inventario. |
| Tests e2e | Playwright | Flujos críticos: login, visita completa, cierre con reposición. |
| Tests de RLS | Supabase local | Verificar que cada rol solo accede a lo que le corresponde. |

---

## 10. Fases de Desarrollo

### 10.1 Resumen de Fases

| Fase | Nombre | Contenido Principal | Estimado |
|---|---|---|---|
| Fase 0 | Diseño y Setup | ERD, wireframes, ambientes, migraciones base, auth. | 2–3 sem. |
| Fase 1 (MVP) | Núcleo Operativo | Productos, vitrinas, rutas, flujo completo de visita, cobros, inventario, incidencias. | 8–10 sem. |
| Fase 2 | Gestión y Analítica | Garantías, proveedores, compras, dashboard, reportes, exportación Excel. | 6–8 sem. |
| Fase 3 | Escala y Optimización | Notificaciones, geolocalización, alertas automáticas, mejoras de rendimiento. | 4–6 sem. |

### 10.2 Fase 0: Diseño y Setup (2–3 semanas)

- Diagrama ERD completo y revisado en dbdiagram.io.
- Wireframes de alta fidelidad: panel admin (web) y vista de campo (móvil).
- Configuración del proyecto Supabase (dev, staging, prod).
- Migraciones SQL iniciales: todas las tablas, triggers, funciones y políticas RLS.
- Configuración del repositorio GitHub con estructura de carpetas.
- Setup de CI/CD con GitHub Actions (lint, test, deploy a Vercel).
- Configuración de Supabase Auth con roles personalizados.
- Definición del backlog completo en la herramienta elegida (Jira / Linear / Notion).

### 10.3 Fase 1: MVP – Plan de Sprints

| Sprint | Duración | Historias de Usuario |
|---|---|---|
| Sprint 1 | 2 sem. | HU-01, 02, 03 (Auth) + HU-04, 05, 06, 07 (Productos) + HU-08 (PDV) |
| Sprint 2 | 2 sem. | HU-09, 10, 11, 12 (Vitrinas) + HU-25 (Inventario central) + HU-13 (Rutas) |
| Sprint 3 | 2 sem. | HU-14, 15, 16 (Planif. rutas) + HU-17, 18, 19 (Inicio visita + cálculo) |
| Sprint 4 | 2 sem. | HU-20, 21, 22, 23, 24 (Cierre visita, cobro, reposición, fotos) |
| Sprint 5 | 1 sem. | HU-26, 27, 28 (Inventario avanzado) + HU-29, 30, 31 (Incidencias) |
| Sprint 6 | 1 sem. | Modo offline (PWA), ajustes UX móvil, pruebas con colaboradoras, bugs. |

### 10.4 Fase 2: Gestión y Analítica

- HU-32, 33: Módulo completo de Garantías con captura en campo y resolución administrativa.
- Módulo de Proveedores y Compras con recepción y actualización de inventario central.
- HU-34, 35, 36, 37: Dashboard en tiempo real y reportes de ventas alineados al release comercial.
- Reporte de inventario valorizado y vistas analíticas operativas.
- Exportación a Excel server-side con filtros de fecha, ruta, colaboradora, PDV y producto.

### 10.5 Fase 3: Escala y Optimización

- Notificaciones push (Web Push API) para alertas críticas.
- Integración con WhatsApp Business API para alertas operativas.
- Mapa de vitrinas y PDV con Mapbox o Google Maps.
- Optimización de consultas SQL para volumen alto (particionado, índices).
- Panel de configuración de parámetros globales (umbral de stock bajo, etc.).

---

## 11. Métricas y Reportes

### 11.1 KPIs Clave

| KPI | Fórmula | Frecuencia | Tabla(s) Fuente |
|---|---|---|---|
| Ventas totales | `SUM(subtotal_cobro)` de `detalle_visita` | Diario/Mensual | `detalle_visita`, `visitas` |
| Cobertura de visitas | Visitas completadas / planificadas × 100 | Semanal | `visitas` |
| Rotación de inventario | Unidades vendidas / Stock promedio en vitrina | Mensual | `detalle_visita`, `inventario_vitrina` |
| Tasa de incidencias | Nº incidencias / Nº visitas × 100 | Mensual | `incidencias`, `visitas` |
| Tasa de garantías | Unidades en garantía / Unidades vendidas × 100 | Mensual | `garantias`, `detalle_visita` |
| Ingreso por vitrina | Cobros totales / Nº vitrinas activas | Mensual | `cobros`, `vitrinas` |
| Saldo pendiente | `SUM(monto)` WHERE `estado = 'discrepancia'` | Diario | `cobros` |
| Días sin visitar | Hoy − fecha última visita por PDV | Diario | `visitas` |

### 11.2 Reportes del Dashboard

- **Tarjetas resumen:** ventas hoy, visitas realizadas/planificadas, cobros del mes, incidencias abiertas.
- **Gráfica de línea:** ventas diarias últimos 30 días.
- **Gráfica de barras:** ventas por ruta o colaboradora en el mes.
- **Tabla:** top 10 vitrinas por ventas del mes.
- **Tabla:** vitrinas con stock bajo (< 30% del surtido estándar).
- **Lista:** últimas 5 incidencias abiertas con antigüedad.

### 11.3 Reportes Exportables

- Ventas por período (filtros: ruta, colaboradora, PDV, producto).
- Inventario por ubicación (central + vitrinas) con valor económico.
- Visitas planificadas vs realizadas con detalle de diferencias.
- Incidencias y garantías por período.

---

## 12. Requerimientos No Funcionales

| Categoría | Requerimiento |
|---|---|
| Rendimiento | Tiempo de respuesta < 2 segundos en operaciones comunes con hasta 2,000 vitrinas activas. |
| Disponibilidad | 99% en horario operativo (6:00 a.m. – 9:00 p.m.). |
| Mobile-first | La vista de campo debe funcionar en smartphones Android 8+ desde Chrome. Sin app nativa en Fase 1. |
| Offline | La app de campo permite registrar una visita sin internet y sincroniza al recuperar conexión. |
| Seguridad | HTTPS obligatorio. JWT con expiración. Contraseñas con bcrypt vía Supabase Auth. RLS activo en todas las tablas. |
| Auditoría | Todo cambio en inventario, precio o rol queda registrado con usuario, fecha y acción. |
| Escalabilidad | Arquitectura preparada para 10× el volumen inicial sin rediseño de la base. |
| Respaldos | Backup automático diario de PostgreSQL (incluido en Supabase Cloud). Retención mínima 30 días. |
| Fotos | Compresión automática antes de subir (max 800 KB por foto). Formatos: JPG, PNG, WEBP. |
| Internacionalización | Idioma: español. Moneda: COP. Fechas: formato `dd/mm/yyyy`. |

---

## 13. Riesgos del Proyecto

| Riesgo | Impacto | Prob. | Mitigación |
|---|---|---|---|
| Resistencia al cambio de colaboradoras | Alto | Media | Piloto con 1 ruta antes del despliegue general. Capacitación con video y guía rápida. |
| Conectividad limitada en zonas de campo | Alto | Alta | Modo offline como requisito del MVP, no opcional. |
| Errores de conteo que generan inconsistencias | Alto | Media | Fotos obligatorias de vitrina. Alertas de desviación grande. Ajustes auditados. |
| Scope creep sin control | Medio | Alta | Backlog priorizado. Todo cambio de alcance pasa por el dueño del producto. |
| Límites de Supabase Free Tier en producción | Medio | Alta | Planificar upgrade a Supabase Pro antes del lanzamiento. Monitorear uso de storage y DB. |
| Pérdida de datos por falla técnica | Alto | Baja | Backups automáticos de Supabase + staging para pruebas destructivas. |
| Retrasos en definiciones de negocio | Medio | Media | Congelar requisitos por sprint. Decisiones pendientes bloquean el sprint, no el proyecto. |

---

## 14. Definition of Done

### Una Historia de Usuario está completada cuando:

1. El código fue revisado y aprobado en Pull Request por al menos 1 revisor.
2. Los tests unitarios y/o e2e asociados pasan exitosamente en CI.
3. La funcionalidad fue probada manualmente en el ambiente de staging.
4. Las políticas RLS fueron verificadas para los roles involucrados.
5. No existen bugs críticos ni bloqueantes pendientes.
6. La funcionalidad fue demostrada y aprobada por el dueño del producto.
7. Si aplica: la migración SQL está versionada en `/supabase/migrations/`.

### Un Sprint está completado cuando:

1. Todas las historias comprometidas cumplen la Definición de Hecho.
2. El ambiente de staging está actualizado y estable.
3. Se realizó la revisión del sprint con stakeholders.
4. El backlog del siguiente sprint está priorizado y estimado.

---

## 15. Próximos Pasos

| # | Acción | Responsable | Estado |
|---|---|---|---|
| 1 | Configurar `staging` y `production` en Vercel + Supabase Cloud con secretos separados. | Dev Lead | Pendiente |
| 2 | Activar branch protection en `main` y `develop` con checks obligatorios. | Dev Lead | Pendiente |
| 3 | Ejecutar smoke test post-deploy y documentar rollback simple. | Dev Lead | Pendiente |
| 4 | Validar política de backups y restauración en Supabase Cloud. | Dev Lead | Pendiente |
| 5 | Activar monitoreo mínimo sobre login, exportación, auth y sync offline. | Dev Lead | Pendiente |
| 6 | Preparar piloto comercial controlado con 1 ruta y checklist operativa diaria. | Operaciones | Pendiente |
| 7 | Cerrar evidencia de release candidate y aprobación funcional. | Product Owner + Dev | Pendiente |

---

*Fin del Documento — Versión 2.0 — Confidencial*
