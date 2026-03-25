# Release Candidate Checklist — Fase 2

Checklist operativa para aprobar una release comercial de `powERP` hasta Fase 2.

Runbook complementario: `DEPLOYMENT_RUNBOOK.md`.

## 1. Infraestructura local y CI

- [ ] `cd erp-vitrinas`
- [ ] `npm ci`
- [ ] `supabase start`
- [ ] `./scripts/export-supabase-env.sh dotenv > .env.local`
- [ ] `npm run db:reset`
- [ ] `npm run seed:auth`
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm run audit:prod`
- [ ] GitHub Actions en runner limpio en verde: `type-check`, `lint`, `test`, `build`, `e2e`, `audit`

## 2. Variables requeridas

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `SUPABASE_DB_PASSWORD`
- [ ] `STORAGE_BUCKET_FOTOS=fotos-visita`

## 3. Base de datos y fixtures

- [ ] Sin migraciones pendientes en `erp-vitrinas/supabase/migrations/`
- [ ] `database.types.ts` alineado con el schema real
- [ ] Seed SQL y seed Auth reproducibles desde runner limpio
- [ ] Usuarios semilla disponibles: `admin`, `supervisor`, `analista`, `compras`, `colaboradora`

## 4. Smoke tests funcionales

- [ ] Login por rol redirige al home correcto
- [ ] `compras` entra a `/admin/compras`
- [ ] Dashboard muestra `ventas_hoy`, `cobros_mes`, visitas e incidencias abiertas recientes
- [ ] Reporte de ventas filtra por producto
- [ ] Exportación `.xlsx` funciona para ventas, ranking, inventario, visitas e incidencias/garantías
- [ ] `compras` solo ve el subset permitido de reportes
- [ ] Garantía: registrar, asignar responsable y resolver
- [ ] Compra: crear, confirmar y recibir
- [ ] Campo: visita completa exige al menos 1 foto final
- [ ] Campo offline: conteo, fotos, incidencia/garantía y sincronización

## 5. Release y operación

- [ ] README, SPRINTS y plan maestro sincronizados con el producto real
- [ ] Staging verificado después del deploy
- [ ] Smoke post-deploy en staging
- [ ] Procedimiento de rollback documentado
- [ ] Branch protection activa en `main` y `develop`
- [ ] Monitoreo mínimo configurado para login, auth, exportación y sync
- [ ] Política de backups y restauración validada en staging/prod

## 6. Responsables

- [ ] Desarrollo
- [ ] QA
- [ ] Operaciones
- [ ] Aprobación funcional
