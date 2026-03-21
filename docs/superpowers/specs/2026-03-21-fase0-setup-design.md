# Spec: Fase 0 — Setup e Infraestructura Base

| Campo | Detalle |
|-------|---------|
| Fecha | 2026-03-21 |
| Estado | Aprobado |
| Stack | Next.js 14 + Supabase + TailwindCSS + shadcn/ui |
| Package manager | npm |
| Entorno local | Supabase CLI + Docker |

---

## Objetivo

Dejar la infraestructura completa lista para que el Sprint 1 pueda comenzar sin fricciones: proyecto Next.js funcional, base de datos local con todas las tablas/triggers/RLS, Auth configurado, tipos TypeScript generados y cliente Supabase integrado.

---

## Sección 1: Scaffolding y estructura del proyecto

### Inicialización

```bash
npx create-next-app@latest erp-vitrinas \
  --typescript --tailwind --eslint --app --import-alias="@/*"
```

TypeScript con `strict: true` en `tsconfig.json`. No se usa `--src-dir`.

### ESLint y Prettier

```bash
npm install --save-dev prettier eslint-config-prettier
```

`.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

`.eslintrc.json` — `prettier` al final del array `extends` para desactivar reglas conflictivas:
```json
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

### shadcn/ui

```bash
npx shadcn@latest init
```

- Estilo: `default`
- Base color: `slate`
- Variables CSS: activadas

### Dependencias adicionales

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zustand @tanstack/react-query
npm install zod
```

### Estructura de carpetas

```
erp-vitrinas/
├── app/
│   ├── (admin)/              # Rutas panel administrador
│   ├── (campo)/              # Rutas vista móvil colaboradoras
│   ├── login/
│   ├── page.tsx              # Root: redirige según sesión/rol
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui base
│   ├── admin/
│   └── campo/
├── lib/
│   ├── supabase/             # Clientes + tipos generados
│   ├── hooks/                # Stubs en Fase 0, implementados en Sprint 1+
│   ├── utils/
│   └── validations/          # Stubs en Fase 0
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
├── tests/
├── docs/
├── .env.example
├── .env.local                # En .gitignore
└── middleware.ts
```

**Root `app/page.tsx`:** Server Component que lee la sesión y redirige:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol === 'colaboradora') redirect('/campo/ruta-del-dia')
  redirect('/admin/dashboard')
}
```

### Variables de entorno (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_DB_PASSWORD=
STORAGE_BUCKET_FOTOS=
```

---

## Sección 2: Supabase local con Docker

### Inicialización

```bash
supabase init
supabase start
```

Levanta PostgreSQL, Auth, Storage y Studio en `http://localhost:54323`.

### Storage bucket local

Agregar en `supabase/config.toml` para que el bucket exista desde `supabase start`:

```toml
[storage]
enabled = true

[[storage.buckets]]
name = "fotos-visita"
public = false
```

Las políticas de acceso al bucket se agregan en `20260008_rls_policies.sql`.

### Estructura de migraciones

```
supabase/migrations/
  20260001_core_tables.sql           # categorias, productos, proveedores
  20260002_distribucion.sql          # zonas, puntos_de_venta, vitrinas, surtido_estandar
  20260003_personal_rutas.sql        # usuarios, rutas, rutas_pdv
  20260004_inventario.sql            # inventario_central, inventario_vitrina, movimientos_inventario
  20260005_visitas_cobros.sql        # visitas, detalle_visita, cobros, fotos_visita
  20260006_incidencias_garantias.sql # incidencias, garantias, compras, detalle_compra
  20260007_triggers_funciones.sql    # triggers y funciones SQL de negocio
  20260008_rls_policies.sql          # políticas RLS tablas + storage.objects
  20260009_auth_roles.sql            # trigger auth + sincronización de rol a app_metadata
  20260010_seed.sql                  # datos iniciales de prueba
```

### Ciclo de desarrollo local

```bash
supabase db reset                    # aplica las 10 migraciones desde cero
supabase migration new <nombre>      # crea nueva migración versionada
```

### Conexión a cloud (al final de Fase 0)

```bash
supabase link --project-ref <ref>
supabase db push
```

---

## Sección 3: Esquema de base de datos

### Principios

- `id UUID DEFAULT gen_random_uuid()` en todas las tablas.
- Todas las tablas excepto `inventario_central`, `inventario_vitrina`, `movimientos_inventario` y `fotos_visita` tienen `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`, `created_by UUID REFERENCES usuarios(id) NULL`.
- `inventario_central` e `inventario_vitrina` usan `fecha_actualizacion TIMESTAMPTZ` en lugar de `updated_at` — son tablas de snapshot, no de historial. No tienen trigger `set_updated_at()`.
- `movimientos_inventario` es **inmutable** (solo INSERT). No tiene `updated_at` ni trigger `set_updated_at()`. No tiene `created_by` (el autor va en `usuario_id`).
- `fotos_visita` solo tiene `created_at` y no tiene `updated_at` ni `created_by` (es un registro inmutable de archivo).
- El stock actual (`cantidad_actual`) es denormalizado en `inventario_vitrina` e `inventario_central`, actualizado por trigger con `INSERT ... ON CONFLICT DO UPDATE`.

### Tablas por migración

#### `20260001` — Núcleo de catálogo
- `categorias`: id, nombre TEXT NOT NULL, descripcion TEXT, activo BOOLEAN DEFAULT true, created_at, updated_at, created_by NULL
- `productos`: id, codigo TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL, categoria_id FK, descripcion TEXT, costo_compra DECIMAL, precio_venta_comercio DECIMAL NOT NULL, unidad_medida TEXT, estado TEXT DEFAULT 'activo', imagen_url TEXT, created_at, updated_at, created_by NULL
- `proveedores`: id, nombre TEXT NOT NULL, contacto_nombre TEXT, contacto_email TEXT, contacto_tel TEXT, condiciones_pago TEXT, activo BOOLEAN DEFAULT true, created_at, updated_at, created_by NULL

#### `20260002` — Red de distribución
- `zonas`: id, nombre TEXT NOT NULL, ciudad TEXT, region TEXT, created_at, updated_at, created_by NULL
- `puntos_de_venta`: id, codigo TEXT UNIQUE NOT NULL, nombre_comercial TEXT NOT NULL, tipo TEXT, direccion TEXT, zona_id FK, lat DECIMAL, lng DECIMAL, contacto_nombre TEXT, contacto_tel TEXT, condiciones_pago TEXT, forma_pago_preferida TEXT, activo BOOLEAN DEFAULT true, created_at, updated_at, created_by NULL
- `vitrinas`: id, codigo TEXT UNIQUE NOT NULL, pdv_id FK NOT NULL, tipo TEXT, estado TEXT DEFAULT 'activa', fecha_instalacion DATE, fecha_retiro DATE, notas TEXT, created_at, updated_at, created_by NULL
- `surtido_estandar`: id, vitrina_id FK NOT NULL, producto_id FK NOT NULL, cantidad_objetivo INT NOT NULL, created_at, updated_at, created_by NULL — UNIQUE(vitrina_id, producto_id)

#### `20260003` — Personal y rutas
- `usuarios`: id UUID PRIMARY KEY REFERENCES auth.users(id), nombre TEXT NOT NULL, email TEXT NOT NULL, rol TEXT NOT NULL, activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), created_by UUID REFERENCES usuarios(id) NULL
- `rutas`: id, codigo TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL, colaboradora_id REFERENCES usuarios(id), zona_id FK, frecuencia TEXT, dias_visita TEXT[], estado TEXT DEFAULT 'activa', created_at, updated_at, created_by NULL
- `rutas_pdv`: id, ruta_id FK NOT NULL, pdv_id FK NOT NULL, orden_visita INT NOT NULL, created_at, updated_at, created_by NULL — UNIQUE(ruta_id, pdv_id)

#### `20260004` — Inventario
- `inventario_central`: id, producto_id FK UNIQUE NOT NULL, cantidad_actual INT NOT NULL DEFAULT 0, costo_promedio DECIMAL, fecha_actualizacion TIMESTAMPTZ DEFAULT now()
- `inventario_vitrina`: id, vitrina_id FK NOT NULL, producto_id FK NOT NULL, cantidad_actual INT NOT NULL DEFAULT 0, fecha_actualizacion TIMESTAMPTZ DEFAULT now() — UNIQUE(vitrina_id, producto_id)
- `movimientos_inventario`: id, tipo TEXT NOT NULL, direccion TEXT NOT NULL CHECK (direccion IN ('entrada','salida')), origen_tipo TEXT, origen_id UUID, destino_tipo TEXT, destino_id UUID, producto_id FK NOT NULL, cantidad INT NOT NULL CHECK (cantidad > 0), costo_unitario DECIMAL, referencia_tipo TEXT, referencia_id UUID, usuario_id REFERENCES usuarios(id), notas TEXT, created_at TIMESTAMPTZ DEFAULT now()

**`cantidad` siempre es positivo.** El campo `direccion` indica si el movimiento suma (`'entrada'`) o resta (`'salida'`) stock en la ubicación de destino/origen. Para todos los tipos excepto `ajuste`, la dirección está implícita en el tipo pero igual debe registrarse. Para `ajuste`, el creador del movimiento setea `direccion` explícitamente.

**Tipos de movimiento (CHECK constraint):** `compra` · `traslado_a_vitrina` · `venta` · `devolucion_garantia` · `baja` · `ajuste` · `traslado_entre_vitrinas`

| tipo | direccion esperada |
|------|-------------------|
| `compra` | `entrada` (a central) |
| `traslado_a_vitrina` | `entrada` (a vitrina) / `salida` (de central) |
| `venta` | `salida` (de vitrina) |
| `devolucion_garantia` | `salida` (de vitrina) |
| `baja` | `salida` |
| `ajuste` | explícita — `entrada` o `salida` |
| `traslado_entre_vitrinas` | `salida` (de origen) / `entrada` (a destino) |

#### `20260005` — Visitas y cobros
- `visitas`: id, ruta_id FK NULL, pdv_id FK NOT NULL, vitrina_id FK NOT NULL, colaboradora_id REFERENCES usuarios(id) NOT NULL, fecha_hora_inicio TIMESTAMPTZ, fecha_hora_fin TIMESTAMPTZ, estado TEXT DEFAULT 'planificada', motivo_no_realizada TEXT, monto_calculado DECIMAL DEFAULT 0, monto_cobrado DECIMAL, diferencia DECIMAL GENERATED ALWAYS AS (COALESCE(monto_cobrado,0) - COALESCE(monto_calculado,0)) STORED, notas TEXT, created_at, updated_at, created_by NULL
- `detalle_visita`: id, visita_id FK NOT NULL, producto_id FK NOT NULL, inv_anterior INT NOT NULL, inv_actual INT NOT NULL, unidades_vendidas INT NOT NULL DEFAULT 0, unidades_repuestas INT DEFAULT 0, precio_unitario DECIMAL NOT NULL, subtotal_cobro DECIMAL GENERATED ALWAYS AS (unidades_vendidas * precio_unitario) STORED, created_at, updated_at, created_by NULL
- `cobros`: id, visita_id FK NOT NULL, monto DECIMAL NOT NULL, forma_pago TEXT NOT NULL, fecha TIMESTAMPTZ DEFAULT now(), estado TEXT DEFAULT 'registrado', notas TEXT, created_at, updated_at, created_by NULL
- `fotos_visita`: id, visita_id FK NOT NULL, url TEXT NOT NULL, tipo TEXT, fecha_subida TIMESTAMPTZ DEFAULT now()

**Estados de visita (CHECK):** `planificada` · `en_ejecucion` · `completada` · `no_realizada`
**Formas de pago (CHECK):** `efectivo` · `transferencia` · `nequi` · `daviplata` · `otro`
**Estados de cobro (CHECK):** `registrado` · `confirmado` · `pendiente` · `discrepancia`

#### `20260006` — Incidencias, garantías y compras
- `incidencias`: id, visita_id FK NULL, pdv_id FK NOT NULL, vitrina_id FK NULL, tipo TEXT NOT NULL, descripcion TEXT, estado TEXT DEFAULT 'abierta', responsable_id REFERENCES usuarios(id) NULL, resolucion TEXT, fecha_apertura TIMESTAMPTZ DEFAULT now(), fecha_cierre TIMESTAMPTZ NULL, created_at, updated_at, created_by NULL
- `garantias`: id, pdv_id FK NOT NULL, producto_id FK NOT NULL, visita_recepcion_id FK NULL, cantidad INT NOT NULL DEFAULT 1, fecha_venta_aprox DATE, motivo TEXT, resolucion TEXT, estado TEXT DEFAULT 'abierta', responsable_id REFERENCES usuarios(id) NULL, created_at, updated_at, created_by NULL
- `compras`: id, proveedor_id FK NOT NULL, fecha DATE NOT NULL, estado TEXT DEFAULT 'pendiente', total_estimado DECIMAL, total_real DECIMAL, notas TEXT, created_at, updated_at, created_by NULL
- `detalle_compra`: id, compra_id FK NOT NULL, producto_id FK NOT NULL, cantidad_pedida INT NOT NULL, cantidad_recibida INT DEFAULT 0, costo_unitario DECIMAL, created_at, updated_at, created_by NULL

### Triggers y funciones (`20260007`)

#### `set_updated_at()` — aplicado a estas tablas

Se aplica a todas las tablas que tienen `updated_at`. Lista explícita:
`categorias`, `productos`, `proveedores`, `zonas`, `puntos_de_venta`, `vitrinas`, `surtido_estandar`, `usuarios`, `rutas`, `rutas_pdv`, `visitas`, `detalle_visita`, `cobros`, `incidencias`, `garantias`, `compras`, `detalle_compra`.

**Excluidas** (sin `updated_at`): `inventario_central`, `inventario_vitrina`, `movimientos_inventario`, `fotos_visita`.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Ejemplo (repetir para cada tabla de la lista):
CREATE TRIGGER set_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

#### `calcular_unidades_vendidas()` — BEFORE INSERT en `detalle_visita`

```sql
CREATE OR REPLACE FUNCTION calcular_unidades_vendidas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unidades_vendidas = GREATEST(NEW.inv_anterior - NEW.inv_actual, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

`GREATEST(..., 0)` evita negativos ante errores de conteo; la diferencia de cobro captura la discrepancia.

#### `actualizar_inventario()` — AFTER INSERT en `movimientos_inventario`

Este trigger actualiza `inventario_central` y/o `inventario_vitrina` según el tipo de movimiento. `cantidad` es siempre positivo; `direccion` ('entrada'/'salida') determina el signo del `delta` que aplica el trigger:

| tipo | inventario_central | inventario_vitrina |
|------|-------------------|--------------------|
| `compra` | +cantidad (destino=central) | — |
| `traslado_a_vitrina` | -cantidad (origen=central) | +cantidad (destino=vitrina) |
| `venta` | — | -cantidad (origen=vitrina) |
| `devolucion_garantia` | — | -cantidad (origen=vitrina) |
| `baja` | -cantidad si origen_tipo='central' | -cantidad si origen_tipo='vitrina' |
| `ajuste` | +cantidad si `direccion='entrada'`, -cantidad si `direccion='salida'` | +/-cantidad según `direccion` |
| `traslado_entre_vitrinas` | — | -cantidad (origen_id=vitrina origen), +cantidad (destino_id=vitrina destino) |

**Patrón de upsert para `inventario_central`:**
```sql
INSERT INTO inventario_central (producto_id, cantidad_actual, fecha_actualizacion)
VALUES (NEW.producto_id, delta, now())
ON CONFLICT (producto_id)
DO UPDATE SET
  cantidad_actual = inventario_central.cantidad_actual + EXCLUDED.cantidad_actual,
  fecha_actualizacion = now();
```

**Patrón de upsert para `inventario_vitrina`:**
```sql
INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
VALUES (vitrina_id_target, NEW.producto_id, delta, now())
ON CONFLICT (vitrina_id, producto_id)
DO UPDATE SET
  cantidad_actual = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
  fecha_actualizacion = now();
```

Si la fila no existe aún (primer movimiento del producto en esa ubicación), el `INSERT` la crea con `cantidad_actual = delta`.

#### `validar_stock_no_negativo()` — BEFORE INSERT en `movimientos_inventario`

Aplica cuando `NEW.direccion = 'salida'`. El trigger determina de qué tabla leer el stock usando `NEW.origen_tipo`:

```sql
-- Pseudocódigo del trigger:
IF NEW.direccion = 'salida' THEN
  IF NEW.origen_tipo = 'central' THEN
    SELECT COALESCE(cantidad_actual, 0) INTO stock_actual
    FROM inventario_central WHERE producto_id = NEW.producto_id;
  ELSIF NEW.origen_tipo = 'vitrina' THEN
    SELECT COALESCE(cantidad_actual, 0) INTO stock_actual
    FROM inventario_vitrina
    WHERE vitrina_id = NEW.origen_id AND producto_id = NEW.producto_id;
  ELSE
    -- origen_tipo NULL en una salida es un error de datos
    RAISE EXCEPTION 'origen_tipo requerido para movimientos de salida';
  END IF;

  IF COALESCE(stock_actual, 0) - NEW.cantidad < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: producto %, disponible %, solicitado %',
      NEW.producto_id, COALESCE(stock_actual, 0), NEW.cantidad;
  END IF;
END IF;
```

Si no existe fila de inventario para esa ubicación/producto, se asume stock = 0.

#### `actualizar_monto_calculado()` — AFTER INSERT/UPDATE/DELETE en `detalle_visita`

Actualiza `visitas.monto_calculado` tras cualquier cambio en las líneas de detalle:

```sql
CREATE OR REPLACE FUNCTION actualizar_monto_calculado()
RETURNS TRIGGER AS $$
DECLARE v_id UUID;
BEGIN
  v_id = COALESCE(NEW.visita_id, OLD.visita_id);
  UPDATE visitas
  SET monto_calculado = COALESCE(
    (SELECT SUM(subtotal_cobro) FROM detalle_visita WHERE visita_id = v_id), 0
  )
  WHERE id = v_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actualizar_monto_calculado
  AFTER INSERT OR UPDATE OR DELETE ON detalle_visita
  FOR EACH ROW EXECUTE FUNCTION actualizar_monto_calculado();
-- RETURN NEW en AFTER trigger es ignorado por PostgreSQL — seguro incluso en DELETE donde NEW es NULL.
```

`calcular_monto_visita(visita_id UUID)` se mantiene como función SQL auxiliar para consultas ad-hoc.

#### `get_kpi_ventas(fecha_inicio DATE, fecha_fin DATE)`

Función SQL que retorna tabla con: `ruta_id`, `colaboradora_id`, `pdv_id`, `total_vendido`, `total_cobrado`, `visitas_completadas`. Fuente: JOIN entre `visitas`, `detalle_visita`, `cobros` filtrando por `fecha_hora_inicio BETWEEN fecha_inicio AND fecha_fin` y `estado = 'completada'`.

### RLS (`20260008`)

**Función helper:**
```sql
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
```

`SECURITY DEFINER` + `SET search_path = public` previene search path injection. `STABLE` permite al planner cachear el resultado por transacción.

**Políticas de tablas** (cada fila = un `CREATE POLICY` separado):

| Tabla | Operación | Condición |
|-------|-----------|-----------|
| `productos` | SELECT | `auth.role() = 'authenticated'` |
| `productos` | INSERT, UPDATE, DELETE | `get_my_rol() = 'admin'` |
| `visitas` | SELECT | `colaboradora_id = auth.uid() OR get_my_rol() IN ('admin','supervisor','analista')` |
| `visitas` | INSERT | `get_my_rol() = 'colaboradora' AND colaboradora_id = auth.uid()` |
| `visitas` | UPDATE, DELETE | `get_my_rol() IN ('admin','supervisor')` |
| `detalle_visita` | SELECT | `EXISTS (SELECT 1 FROM visitas v WHERE v.id = visita_id AND (v.colaboradora_id = auth.uid() OR get_my_rol() IN ('admin','supervisor','analista')))` |
| `detalle_visita` | INSERT | `get_my_rol() IN ('colaboradora','admin')` |
| `cobros` | SELECT | `get_my_rol() IN ('admin','supervisor','analista') OR EXISTS (SELECT 1 FROM visitas v WHERE v.id = visita_id AND v.colaboradora_id = auth.uid())` |
| `cobros` | INSERT | `get_my_rol() IN ('colaboradora','admin')` |
| `movimientos_inventario` | SELECT | `get_my_rol() IN ('admin','supervisor','analista','compras')` |
| `movimientos_inventario` | INSERT | `get_my_rol() IN ('admin','colaboradora','compras')` |
| `usuarios` | ALL | `get_my_rol() = 'admin'` |
| `inventario_central` | SELECT | `get_my_rol() IN ('admin','compras','supervisor','analista')` |
| `inventario_central` | INSERT, UPDATE, DELETE | `get_my_rol() IN ('admin','compras')` |
| `inventario_vitrina` | SELECT | `auth.role() = 'authenticated'` |
| `inventario_vitrina` | INSERT, UPDATE, DELETE | `get_my_rol() IN ('admin','compras')` |

> Nota: `inventario_central` usa dos políticas separadas por operación (SELECT y write), no una política `ALL`. PostgreSQL aplica políticas de forma aditiva por operación.

**Políticas de Storage (`storage.objects` en bucket `fotos-visita`):**
```sql
CREATE POLICY "subir fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-visita' AND get_my_rol() IN ('colaboradora','admin'));

CREATE POLICY "leer fotos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-visita' AND get_my_rol() IN ('admin','supervisor','analista','colaboradora'));
```

### Auth roles (`20260009`)

**Mecanismo:** El rol se almacena en `public.usuarios.rol` (fuente de verdad) y se sincroniza a `auth.users.app_metadata.rol` para que el middleware pueda leerlo desde el JWT sin queries a la DB en cada request.

**Nota sobre latencia de cambio de rol:** Cuando un admin cambia el rol de un usuario, el trigger actualiza `app_metadata` inmediatamente, pero el cambio solo se refleja en el middleware a partir del próximo refresh del JWT del usuario afectado (próxima sesión o refresh automático de token). Esto es comportamiento esperado de Supabase Auth — no hay mecanismo de invalidación inmediata en Fase 0.

**Trigger al crear usuario:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'colaboradora',
    true
    -- created_by omitido: NULL porque no existe un usuario creador previo
  );
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', 'colaboradora')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Trigger de sincronización al cambiar rol:**
```sql
CREATE OR REPLACE FUNCTION sync_rol_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', NEW.rol)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_usuario_rol_changed
  AFTER UPDATE OF rol ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION sync_rol_to_app_metadata();
```

**Primer usuario admin:** El seed (`20260010`) actualiza el rol del primer usuario a `admin` tras crearlo en Studio, disparando el trigger de sincronización.

### Seed (`20260010`)

Datos mínimos para que Sprint 1 tenga datos contra los que trabajar. Usa CTEs para evitar UUIDs hardcodeados:

```sql
WITH
  zona AS (
    INSERT INTO zonas (nombre, ciudad, region)
    VALUES ('Zona Norte', 'Bogotá', 'Cundinamarca')
    RETURNING id
  ),
  pdv AS (
    INSERT INTO puntos_de_venta (codigo, nombre_comercial, zona_id, activo)
    SELECT 'PDV-001', 'Tienda Demo', zona.id, true FROM zona
    RETURNING id
  ),
  vitrina AS (
    INSERT INTO vitrinas (codigo, pdv_id, estado)
    SELECT 'VIT-001', pdv.id, 'activa' FROM pdv
    RETURNING id
  ),
  cat AS (
    INSERT INTO categorias (nombre) VALUES ('Audífonos')
    RETURNING id
  ),
  prod AS (
    INSERT INTO productos (codigo, nombre, categoria_id, precio_venta_comercio, estado)
    SELECT 'PRD-001', 'Audífono Básico', cat.id, 15000, 'activo' FROM cat
    RETURNING id
  )
INSERT INTO surtido_estandar (vitrina_id, producto_id, cantidad_objetivo)
SELECT vitrina.id, prod.id, 10 FROM vitrina, prod;

-- Inventario inicial insertado directamente en las tablas snapshot, sin pasar por movimientos_inventario.
-- Esto es intencional: el seed no genera registros en movimientos_inventario para el stock inicial.
INSERT INTO inventario_central (producto_id, cantidad_actual)
SELECT id, 50 FROM productos WHERE codigo = 'PRD-001';

INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual)
SELECT v.id, p.id, 10
FROM vitrinas v, productos p
WHERE v.codigo = 'VIT-001' AND p.codigo = 'PRD-001';

-- El usuario admin se crea en Studio via Supabase Auth (email: admin@erp.local).
-- Después ejecutar en Studio SQL:
-- UPDATE public.usuarios SET rol = 'admin' WHERE email = 'admin@erp.local';
```

---

## Sección 4: Integración Next.js + Supabase

### Clientes en `lib/supabase/`

**`client.ts`** — para Client Components:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**`server.ts`** — para uso en el servidor (Server Components, Server Actions, Route Handlers). El `try/catch` en `set`/`remove` maneja silenciosamente el caso donde el contexto de render no permite escritura de cookies (Server Components de solo lectura):
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Falla silenciosamente en Server Components de solo lectura — esperado
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Idem
          }
        },
      },
    }
  )
}
```

### Middleware (`middleware.ts` en raíz)

Usa `getUser()` (no `getSession()`) — valida el JWT en el servidor de forma segura. El rol se lee desde `user.app_metadata.rol` del JWT, sin query a la DB:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: object) {
          request.cookies.set({ name, value, ...options } as never)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options } as never)
        },
        remove(name: string, options: object) {
          request.cookies.set({ name, value: '', ...options } as never)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options } as never)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const rol = user?.app_metadata?.rol as string | undefined

  // Usuario autenticado en /login → redirigir a su área
  if (path === '/login' && user) {
    const dest = rol === 'colaboradora' ? '/campo/ruta-del-dia' : '/admin/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Rutas privadas sin sesión → /login
  if (!user && (path.startsWith('/admin') || path.startsWith('/campo'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Acceso a área incorrecta según rol
  if (user) {
    const adminRoles = ['admin', 'supervisor', 'analista', 'compras']
    if (path.startsWith('/admin') && !adminRoles.includes(rol ?? '')) {
      return NextResponse.redirect(new URL('/campo/ruta-del-dia', request.url))
    }
    if (path.startsWith('/campo') && rol !== 'colaboradora') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/campo/:path*'],
}
```

**Root `/` es manejado por `app/page.tsx`** (Server Component con redirect), no por el middleware.

### Tipos generados

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

Se regenera después de cada migración. Todos los hooks y server actions importan `Database` desde aquí.

### Hooks (`lib/hooks/`) — stubs en Fase 0

```typescript
// lib/hooks/useProductos.ts (stub — implementar en Sprint 1)
export function useProductos() {
  throw new Error('useProductos: not implemented yet')
}
```

Archivos a crear: `useProductos.ts`, `useVitrinas.ts`, `useVisitas.ts`, `useInventario.ts`, `useRutas.ts`, `useIncidencias.ts`, `useUsuarios.ts`, `useCobros.ts`

### Validaciones (`lib/validations/`) — stubs en Fase 0

Archivos stub por dominio. Schemas Zod se implementan en el sprint correspondiente.

---

## Criterios de éxito de Fase 0

- [ ] `npm run dev` levanta la app en `localhost:3000` sin errores de compilación
- [ ] `supabase start` levanta el entorno local con Studio en `localhost:54323`
- [ ] `supabase db reset` aplica las 10 migraciones sin errores SQL
- [ ] INSERT en `detalle_visita` calcula `unidades_vendidas` automáticamente (verificar en Studio)
- [ ] Insertar movimiento de salida con cantidad > stock lanza excepción (verificar en Studio)
- [ ] `visitas.monto_calculado` se actualiza al insertar en `detalle_visita`
- [ ] El trigger de auth crea registro en `public.usuarios` al registrar un nuevo usuario
- [ ] Actualizar `public.usuarios.rol` sincroniza `app_metadata.rol` en `auth.users`
- [ ] Políticas RLS bloquean acceso no autorizado por rol (verificar con distintos `auth.uid()` en Studio)
- [ ] El bucket `fotos-visita` existe en Storage local
- [ ] `lib/supabase/database.types.ts` generado con todas las tablas presentes
- [ ] `/` redirige al área correcta según sesión/rol
- [ ] `/login` con sesión activa redirige a `/campo/ruta-del-dia` o `/admin/dashboard`
- [ ] `/admin/*` sin sesión redirige a `/login`
- [ ] `/campo/*` sin sesión redirige a `/login`
- [ ] Seed aplicado: zona, PDV, vitrina, producto, surtido estándar, stock inicial
- [ ] `.env.example` documenta las 6 variables requeridas
