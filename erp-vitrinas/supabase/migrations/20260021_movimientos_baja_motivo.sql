ALTER TABLE movimientos_inventario
ADD COLUMN IF NOT EXISTS motivo_baja TEXT;

ALTER TABLE movimientos_inventario
DROP CONSTRAINT IF EXISTS movimientos_inventario_motivo_baja_check;

ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_inventario_motivo_baja_check
CHECK (
  motivo_baja IS NULL
  OR motivo_baja IN ('robo', 'perdida', 'dano')
);

ALTER TABLE movimientos_inventario
DROP CONSTRAINT IF EXISTS movimientos_baja_motivo_required;

ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_baja_motivo_required
CHECK (
  tipo <> 'baja'
  OR motivo_baja IS NOT NULL
);

ALTER TABLE movimientos_inventario
DROP CONSTRAINT IF EXISTS movimientos_baja_origen_required;

ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_baja_origen_required
CHECK (
  tipo <> 'baja'
  OR origen_tipo IN ('central', 'vitrina', 'colaboradora')
);

ALTER TABLE movimientos_inventario
DROP CONSTRAINT IF EXISTS movimientos_baja_origen_id_required;

ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_baja_origen_id_required
CHECK (
  tipo <> 'baja'
  OR origen_tipo = 'central'
  OR origen_id IS NOT NULL
);
