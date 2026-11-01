# Session Handoff — SETUP-001

**Fecha:** 2026-11-01, America/Buenos_Aires. **Estado:** SETUP-001 `in-progress`; otras 65 features `not-started`; ninguna `done`. El Checker independiente completó la reejecución real y la aceptación **no** fue aprobada: falta el original el documento de semillas retirado y GitHub Actions no se ejecutó remotamente. No iniciar otra feature ni crear backlog alternativo.

## Resultado del Checker independiente

Rerun real, sin confiar en los reportes del Builder y sin modificar la implementación:

| Aceptación | Resultado | Evidencia |
|---|---|---|
| Compatibilidad Laravel/PHP, Inertia/React y lockfiles | **PASS** | `composer validate --strict`, `composer check-platform-reqs`, `composer install --dry-run` y `npm ci --dry-run` exit 0; `npm ls` sin peers inválidos; locks coherentes. Laravel 13.39.0/PHP 8.5.10, Inertia PHP 3.6.0, React 19.3.1, Inertia JS 3.10.0, Vite 8.3.5, TS 5.9.3. |
| Inicio nativo y Compose con PostgreSQL test aislado | **PASS** | Nativo :8000/SSR :13714 y Compose :18080 sirven `/` y `/bootstrap/check` HTTP200 con HTML SSR real y SELECT1; Mailpit 200; test DB :55433/volumen `test-db` separada de dev :55432/`dev-db`. |
| Comandos reales + ejecución en GitHub Actions | **FAIL/PENDIENTE** | Los gates pasan localmente y en Compose, pero Actions no se ejecutó: no hay `.git`, remoto ni credenciales. YAML/local no prueba CI remoto. |
| Entrypoint fail-closed, sin instalar/migrar implícitamente | **PASS técnico** | 14 gates ejecutados, 13 técnicos exit0 y exit1 SOLO por harness ENOENT; runner 5/5 prueba catálogo faltante/duplicado, suite vacía y fallos reales; no hay install/migrate en el entrypoint; preparación test explícita separada. |

## Evidencia durable

- Nativo: [.cache/checker-verification-native.log](.cache/checker-verification-native.log) — 14 gates, 13 técnicos exit0, harness exit1.
- Compose: [.cache/checker-verification-compose.log](.cache/checker-verification-compose.log) — preparación `Nothing to migrate`, mismos 13 gates exit0.
- Seguridad: `.cache/checker-unsafe-preflight.log`, `.cache/checker-unsafe-prepare.log`, `.cache/checker-unsafe-url.log` — overrides unsafe exit1 antes de conectar/migrar.
- Estado/evidencia ampliada: [progress.md](progress.md) y `evidence` de SETUP-001 en [feature_list.json](feature_list.json).

## Bloqueos y riesgos históricos (no son instrucciones actuales)

1. **Original ausente:** falta el documento de semillas retirado. El harness y el entrypoint fallan correctamente; no reconstruirlo ni relajar el chequeo. Sin ese archivo no hay aceptación integral ni CI verde.
2. **CI remoto no ejecutado:** no existe `.git`, remoto autorizado ni credenciales. La aceptación que exige ejecutar los gates en GitHub Actions queda no verificada; no declarar done sin una corrida remota real.
3. **Incidencia histórica del Builder:** la primera instalación de Playwright usó la caché compartida del usuario y su GC eliminó browsers obsoletos. El Checker no repitió esa acción ni modificó la caché compartida; se usó `.cache/ms-playwright` con `PLAYWRIGHT_SKIP_BROWSER_GC=1`. `playwright.config.ts` fija la ruta local solo si `PLAYWRIGHT_BROWSERS_PATH` no viene predefinida; no se restauró la caché compartida.
4. **Riesgo menor:** el preflight solo rechaza `bootstrap/cache/config.php` y `public/hot`, no otras cachés Laravel (routes/views). No afectó esta corrida.

## Limpieza y estado restartable

`docker compose down --remove-orphans` exit0, sin `-v` ni prune: 6 volúmenes propios conservados (`dev-db`, `test-db`, `app-vendor`, `node-deps`, `quality-node`, `quality-vendor`). Sin contenedores/red propios; puertos 8000/18080/8011/13714/5173/55432/55433/8025/1025 libres; `public/hot` y `bootstrap/cache/config.php` ausentes; jobs propios recogidos. No se modificaron fuentes, dependencias ni datos; solo se regeneraron artefactos de build y logs de verificación. No Git init/commit.

## Próxima acción histórica (reemplazada abajo)

1. El usuario restituye el original el documento de semillas retirado y autoriza un repositorio/remoto.
2. Reejecutar `node scripts/verify-harness.mjs` y `node scripts/verify-harness.mjs --application` (nativo y Compose) con preparación test explícita.
3. Ejecutar GitHub Actions remoto y adjuntar su resultado.
4. Solo si todo pasa, el Checker podrá marcar SETUP-001 `done`; hasta entonces permanece `in-progress`. No avanzar otras features.


## Decisión humana vigente y Builder de corrección — 2026-11-01

Esta sección reemplaza las instrucciones históricas de restituir el documento retirado y de no publicar. El usuario confirmó que feature_list.json es su reemplazo real y autorizó Git/commit/push únicamente para SETUP-001 a https://github.com/alejoDiDiego/changuito. No reconstruir el documento retirado. Los fallos ENOENT/exit1 y la ausencia de CI de las rondas anteriores siguen siendo hechos históricos, no éxitos retroactivos.

- RED real: node --test tests/runner/tracker.test.mjs exit1 por validateTracker ausente (aserción función esperada); no se cuenta ENOENT histórico como RED. Log privado .cache/tracker-red.log.
- GREEN/refactor: función pura import-safe validateTracker, fixtures clonadas en memoria, sin mutar tracker; runner9/9, harness exit0 y auditoría100/100 (estructural, no eficacia medida). Fuentes JSON Pointer comprueban identidad y fallan con reorder obsoleto; se prueban esquema/IDs/campos/dependencias/ciclos/estados/evidencia.
- Solo source/description de las otras65 entradas fueron ajustados; aceptación/deps/prioridad/status conservados. SETUP conserva sus4 criterios e in-progress.
- Playwright fuerza cache privada incluso si existe override externo; GC deshabilitado, no tocar cache compartida.
- Remoto inspeccionado dos veces sin refs; Git inicializado main y origin autorizado. GCM no interactivo y API confirmaron push_permission=true sin imprimir credenciales. No inferir falta de auth por ausencia de gh/tokens ambientales.
- Próximo único escritor de aceptación: Checker independiente; no iniciar otra feature. Resultados completos y SHA/CI se registran debajo.
