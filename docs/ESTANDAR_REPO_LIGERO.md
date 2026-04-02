# Estandar Operativo Ligero del Repo

Fecha de adopcion: 2026-04-02
Estado: vigente hasta que se decida lo contrario

## Objetivo

Mantener un flujo de desarrollo rapido, simple y predecible.

Este repo prioriza:

- velocidad de ejecucion
- baja friccion para desarrollar
- buenas practicas minimas y utiles
- cero automatizacion que entorpezca sin aportar valor claro

## Reglas base

1. No usar Dependabot.
2. No exigir aprobaciones de Pull Request para trabajar.
3. No exigir checks automaticos para poder hacer merge o push.
4. No usar politicas de ramas que cierren PRs o bloqueen flujo normal.
5. No ejecutar escaneos de seguridad automáticos pesados por defecto.
6. Mantener solo la proteccion minima contra errores graves:
   - no permitir borrar `develop`
   - no permitir borrar `main`
   - no permitir force-push accidental sobre `develop`
   - no permitir force-push accidental sobre `main`

## Estado deseado del repo

El repo debe permanecer asi:

- sin `Dependabot`
- sin `branch-policy`
- sin `security.yml`
- sin `dast.yml`
- con un solo workflow: `.github/workflows/ci.yml`
- ese workflow debe ser manual (`workflow_dispatch`)

## Workflow minimo permitido

El workflow manual de calidad existe solo como apoyo cuando se quiera validar algo importante.

Debe hacer un unico recorrido simple:

1. instalar dependencias
2. correr `npm run type-check`
3. correr `npm run lint`
4. correr `npm test`
5. correr `npm run build`

No debe:

- bloquear pushes
- bloquear merges
- correr en cada push
- correr en cada PR
- ejecutar e2e por defecto
- ejecutar DAST por defecto
- ejecutar CodeQL por defecto

## Flujo de trabajo esperado

Flujo normal:

1. desarrollar en la rama que convenga
2. hacer push directo cuando haga sentido
3. usar PR solo si aporta contexto, no por obligacion
4. correr validaciones manuales cuando el cambio lo amerite

## Validacion minima recomendada

Para cambios normales de aplicacion:

- `npm run lint`
- `npm test`
- `npm run build`

Para cambios sensibles:

- autenticacion
- permisos
- base de datos
- facturacion
- exportaciones
- despliegue

sumar tambien:

- `npm run type-check`
- e2e si realmente aplica

## Regla de sentido comun

No introducir herramientas, hooks, bots, bloqueos o pipelines nuevos si:

- hacen mas lento el desarrollo
- agregan aprobaciones innecesarias
- crean ruido repetitivo
- no resuelven un problema real del proyecto

Toda automatizacion nueva debe justificar claramente:

- que problema resuelve
- cuanto tiempo ahorra o cuanto riesgo evita
- por que vale la friccion adicional

## Excepciones validas

Se puede endurecer temporalmente el proceso solo en casos concretos:

- release importante
- hotfix critico
- incidente de seguridad real
- cambio estructural de infraestructura

Cuando pase la excepcion, el repo debe volver a este estandar ligero.

## Nota final

La regla general de este proyecto es:

"simple por defecto, estricto solo cuando haga falta".
