# Changuito — Agent Harness

SaaS multi-tenant de tiendas y pedidos por WhatsApp. SETUP-001 en implementación: bootstrap técnico neutral, sin features de negocio; aceptación pendiente de Checker.

## Startup Workflow

Before writing code:
1. Confirmar directorio (`pwd`). Leer este archivo, [progress.md](progress.md), [session-handoff.md](session-handoff.md) y [feature_list.json](feature_list.json).
2. Leer [PRODUCT.md](docs/product/PRODUCT.md) y [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md); consultar [DOMAIN.md](docs/product/DOMAIN.md) y el contrato de aceptación de la feature en [feature_list.json](feature_list.json), fuente canónica que reemplaza el documento de semillas retirado.
3. Ejecutar `node scripts/verify-harness.mjs` (nativo Windows incluido), o `bash init.sh`. Esto verifica el harness, NO la aplicación.
4. Si existe `.git`, revisar `git status --short` y `git log --oneline -5`. Inspeccionar remoto antes de integrar; Git init/commit/push autorizados únicamente para SETUP-001 al remoto acordado, nunca forcepush ni secretos.
5. Elegir una feature con dependencias satisfechas; registrar `in-progress` antes de implementar. El siguiente trabajo recomendado es SETUP-001, no todo P0.

## Working Rules / Scope

- **One feature at a time**: como máximo una `in-progress`. No implementar P1/P2 sin solicitud explícita. F-061/F-062/F-063 son garantías transversales desde el primer cambio, no seguridad diferida.
- Producto/dominio definen comportamiento; arquitectura define restricciones; el tracker define contratos de features y guarda estado/evidencia; producto/dominio/arquitectura conservan sus restricciones. No inventar reglas: resolver conflictos antes de cambiar contratos.
- Stack objetivo: monolito modular Laravel 13 + React 19/TypeScript + Inertia 3/SSR + Tailwind 4; PostgreSQL real en integración. Validar compatibilidad PHP/Laravel y fijar versiones/lockfiles durante SETUP-001, sin actualizaciones automáticas.
- Aislamiento por tenant autorizado en servidor en HTTP, SQL, jobs, archivos y caché. Nunca confiar en tenant, rol, precios o totales del navegador.
- Dinero entero en unidad menor; snapshots históricos inmutables; checkout transaccional/idempotente (mínimo 72 h); reconfirmación explícita ante cambios materiales.
- Persistir pedido `pending` y mostrar confirmación web antes del WhatsApp manual. Abrir enlace no prueba envío, aceptación ni pago. Sin pagos de compradores, stock cuantitativo, variantes o IA autónoma en P0.
- TDD RED → GREEN → REFACTOR por comportamiento. Registrar fallo real esperado y resultado posterior. No usar SQLite para probar persistencia.
- No sobrescribir trabajo ajeno, borrar datos, ejecutar migraciones destructivas, publicar, instalar globalmente ni exponer secretos sin autorización. Tests usan PostgreSQL dedicado, nunca datos reales. No registrar PII/tokens.
- No delegar escrituras solapadas; un coordinador actualiza estado y evidencia. Mantener este archivo corto; detalles en documentación enlazada.

## Verification Commands

- Harness: `node scripts/verify-harness.mjs` o `bash init.sh` (sin instalar dependencias ni arrancar servicios).
- Auditoría estructural: `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .`.
- Aplicación: `node scripts/verify-harness.mjs --application` ejecuta catálogo obligatorio real, sin instalar ni migrar; falla ante herramientas/suites/gates faltantes o fallidos. El harness sigue obligatorio y valida directamente los contratos del tracker, sin documentos retirados.
- [Verificación](docs/verification.md) documenta preparación explícita nativa/Compose/CI y comandos Pest/PostgreSQL, arquitectura, Pint, PHPStan/Larastan, ESLint, TypeScript, build/SSR y Playwright. No afirmar aprobación integral antes del Checker.

## Definition of Done

Una feature está done only when: criterios y errores de su contrato en el tracker comprobados; evidencia RED/GREEN/refactor; autorización/tenancy y concurrencia pertinentes verificadas; integración PostgreSQL y Playwright para recorridos críticos; tests, lint, tipos, análisis y build verdes; contratos/documentación actualizados. Registrar comandos, resultados, fecha y entorno en `evidence` y progress. Un gate omitido/fallido es trabajo pendiente, no éxito. Las dependencias deben estar `done`; conservar evidencia histórica.

## End of Session

Actualizar status/evidence en el tracker; resumir cambios, checks reales, bloqueos y siguiente acción en progress y handoff. Dejar estado restartable, sin procesos olvidados. No marcar el producto completo por aprobar un chequeo estructural. No crear commits ni limpiar cambios del usuario automáticamente.
