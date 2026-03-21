-- Usuarios (vinculados a auth.users)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'colaboradora'
    CHECK (rol IN ('admin','colaboradora','supervisor','analista','compras')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- Agregar FK created_by en tablas anteriores (ahora que usuarios existe)
ALTER TABLE categorias ADD CONSTRAINT fk_categorias_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE productos ADD CONSTRAINT fk_productos_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE proveedores ADD CONSTRAINT fk_proveedores_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE zonas ADD CONSTRAINT fk_zonas_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE puntos_de_venta ADD CONSTRAINT fk_pdv_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE vitrinas ADD CONSTRAINT fk_vitrinas_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE surtido_estandar ADD CONSTRAINT fk_surtido_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id);

-- Rutas de campo
CREATE TABLE rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  colaboradora_id UUID REFERENCES usuarios(id),
  zona_id UUID REFERENCES zonas(id),
  frecuencia TEXT,
  dias_visita TEXT[],
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','inactiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- PDV que pertenecen a cada ruta
CREATE TABLE rutas_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES rutas(id),
  pdv_id UUID NOT NULL REFERENCES puntos_de_venta(id),
  orden_visita INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  UNIQUE (ruta_id, pdv_id)
);
