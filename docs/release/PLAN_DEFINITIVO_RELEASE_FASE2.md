# Plan Definitivo de Corrección, Cierre de Fase 2 y Release Comercial

## Resumen

Objetivo: dejar el ERP listo para despliegue comercial real hasta Fase 2, corrigiendo los hallazgos de release, alineando el producto con `ERP_CRM_Plan_v2.md`, cerrando gaps de seguridad/proceso y completando lo faltante del dashboard/reportes.

Criterio de salida: no se considera "lista para vender" hasta que pase una compuerta única de release con `db reset`, seed, `type-check`, `lint`, `build`, unit, e2e, `npm audit --omit=dev`, CI en runner limpio, staging verificado y checklist comercial firmado.

## Fase 1: Bloqueantes de Release y Base de Entrega

- Sustituir la exportación actual basada en `xlsx` por exportación `.xlsx` del lado servidor usando `exceljs` estable y auditado, expuesta por un endpoint único `GET /api/reportes/export`.
- Mover toda exportación a generación server-side por tipo de reporte; la UI solo descarga el archivo, no construye workbooks en el navegador.
- Mantener `buildWorksheet` y pruebas solo si siguen aportando valor; si no, reemplazarlas por tests de serialización/descarga del nuevo flujo server-side.
- Añadir una compuerta explícita: si la nueva dependencia de exportación deja vulnerabilidades productivas en `npm audit --omit=dev`, la release comercial queda bloqueada y no se aprueba despliegue.
- Implementar CI/CD con GitHub Actions: jobs separados para `type-check`, `lint`, `test`, `build`, `test:e2e`.
- Hacer que Playwright levante la app automáticamente con `webServer` y que CI arranque Supabase local antes de los e2e; los tests no deben depender de un `:3000` ya corriendo.
- Crear flujo de ambientes `staging` y `production`: Vercel + Supabase Cloud, secretos separados, smoke test post-deploy y rollback simple.
- Añadir branch protection sobre `main` y `develop` con checks obligatorios.
- Formalizar checklist de release en raíz: variables requeridas, migraciones pendientes, seed/fixtures, smoke tests y responsables.

## Fase 2: Alineación Funcional Completa con el Plan Maestro

- Completar el dashboard para alinearlo a `ERP_CRM_Plan_v2.md`: cambiar el KPI de "Cobros Hoy" a "Cobros del mes" y mantener ventas hoy, visitas realizadas/planificadas e incidencias abiertas.
- Añadir una fuente analítica nueva para "últimas 5 incidencias abiertas con antigüedad" y renderizarla en el dashboard principal.
- Mantener `Realtime + fallback polling`, pero extender invalidación también a las nuevas fuentes del dashboard.
- Completar el reporte de ventas con filtro por producto, tanto en SQL como en UI.
- Extender `get_reporte_ventas` con `p_producto_id UUID DEFAULT NULL` y reflejarlo en el filtro compartido de reportes.
- Mantener exportación `.xlsx` para ventas, ranking, inventario, visitas e incidencias/garantías usando el nuevo backend de export.
- Validar que `compras` vea solo el subconjunto de reportes definido para su rol y que `admin`/`supervisor`/`analista` mantengan acceso a la suite completa.
- Revisar y ajustar el enrutamiento por rol para que `compras` tenga home coherente en login, root y middleware/proxy; dejarlo cubierto por tests de navegación.
- Resolver la contradicción de fotos del plan: para release comercial, toda visita `completada` debe exigir al menos una foto final de vitrina; visitas `no_realizada` e incidencias mantienen reglas separadas.
- Actualizar `SPRINTS.md`, `README.md` y el propio `ERP_CRM_Plan_v2.md` solo cuando el código ya refleje el estado final; la documentación debe quedar sincronizada con el producto real.

## Fase 3: Hardening de Calidad, Modelo y Arquitectura

- Eliminar stubs y deuda visible de validación: implementar o borrar definitivamente los placeholders de `visitas` y `cobros`; no deben quedar `TODO` funcionales antiguos.
- Normalizar el modelo respecto al principio del plan: añadir `created_at`, `updated_at` y `created_by` a las tablas operativas/snapshot/fotos que hoy no cumplen ese estándar, con migraciones seguras y regeneración de tipos.
- Mantener `movimientos_inventario` como ledger inmutable; cualquier ajuste adicional debe seguir entrando por movimientos, no por updates manuales de stock.
- Revisar que ningún componente haga acceso de datos directo fuera de hooks/server boundaries; conservar la regla de encapsulación como criterio de aceptación.
- Revisar todas las funciones `SECURITY DEFINER` y dejar justificado cada caso con comentario técnico y test de permiso asociado.
- Añadir smoke/performance checks para las vistas y funciones analíticas con dataset ampliado; objetivo: operaciones comunes bajo 2s en escenario representativo de Fase 2.
- Verificar i18n de interfaz: español consistente, COP consistente y fechas visibles en formato de negocio.
- Confirmar PWA y offline desde la óptica comercial: instalación, reconexión, compresión de fotos, cola de sync y estados visibles.

## Fase 4: Readiness Comercial y Operación

- Crear una `release candidate checklist` con evidencia obligatoria de seguridad, pruebas, staging, respaldo, observabilidad y aprobación funcional.
- Configurar monitoreo mínimo de producción: uptime checks sobre `/login` y rutas clave, revisión de logs Vercel/Supabase, alertas de errores de exportación/sync/auth.
- Verificar backup policy y restauración en Supabase Cloud; no basta asumir el plan, debe quedar comprobado para staging/prod.
- Preparar un piloto comercial controlado como etapa inmediatamente anterior a venta general: 1 ruta, 1 supervisor, 1 admin, checklist operativa diaria y soporte de incidentes.
- Dejar material de salida comercial: guía rápida de admin, guía rápida de colaboradora y checklist de onboarding de cliente.
- Cerrar Fase 2 en `SPRINTS.md` solo cuando el gate comercial esté verde y el plan maestro ya no tenga gaps funcionales abiertos dentro de ese alcance.

## Cambios de Interfaces y Contratos

- Nuevo endpoint de exportación: `GET /api/reportes/export?tipo=<ventas|ranking|inventario|visitas|incidencias>&...filtros`.
- `get_reporte_ventas` se amplía con `p_producto_id UUID DEFAULT NULL`.
- `useReportes` deja de descargar con librería de cliente y pasa a consumir el endpoint de exportación.
- `useDashboard` amplía su contrato para incluir `cobros_mes` y `incidencias_recientes`.
- El cierre de visita pasa a validar al menos 1 foto final obligatoria para estado `completada`.
- El middleware/proxy consolida `getHomeForRole` para `admin`, `supervisor`, `analista`, `compras`, `colaboradora`.

## Plan de Pruebas y Aceptación

- Infraestructura: `supabase db reset`, seed auth, generación de tipos y suite completa desde runner limpio sin servidor manual.
- Calidad: `npm run type-check`, `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e`, `npm audit --omit=dev`.
- Seguridad: tests de RLS por rol para reportes, dashboard, garantías, compras, exportación y rutas por rol.
- Dashboard: validar KPI mensual de cobros, feed de 5 incidencias abiertas, realtime y fallback.
- Reportes: validar filtro por producto en ventas, exportación `.xlsx` por cada reporte y permisos por rol.
- Campo: validar obligación de foto para visita completada, y que offline siga funcionando con esa regla.
- Release: smoke tests en staging sobre login, visita completa, compra/recepción, garantía, dashboard, reportes y exportación.
- Documentación: aceptar la release solo si `README`, `SPRINTS` y `ERP_CRM_Plan_v2` reflejan exactamente el comportamiento implementado.

## Supuestos y Defaults Elegidos

- Alcance cerrado en Fase 2; Fase 3 queda explícitamente fuera de este plan de corrección comercial.
- El objetivo es producción comercial, no solo piloto.
- La estructura del plan y de la ejecución será por fases.
- La exportación `.xlsx` se mantiene como requisito; no se degrada a CSV salvo bloqueo explícito de seguridad aprobado fuera de este plan.
- Una foto final de vitrina será obligatoria para visitas completadas, porque es la decisión más consistente con el riesgo operativo del documento maestro.
- El producto sigue siendo single-tenant para una sola operación comercial; no se incluye multiempresa en este alcance.
