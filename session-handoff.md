# Session Handoff — SETUP-001

**Fecha:** 2026-11-01, America/Buenos_Aires. **Estado vigente:** SETUP-001 `in-progress`; otras 65 features `not-started`; ninguna `done`. Implementación publicada ccb69dd24a06c5016dedc490c4207d0dcc1ea455 con nativo/Compose 14 gates exit0 y Actions run41279886731 SUCCESS. El Checker independiente reejecutó aceptación 1-4 PASS, pero no puede marcar `done`: al cambiar el estado, el caso negativo de `tests/runner/tracker.test.mjs` deja de fallar y rompe el gate runner. No editar implementación en esta ronda; no iniciar otra feature ni crear backlog alternativo.

## Resultado histórico del Checker independiente (antes de la decisión humana y corrección)

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


### Publicación y Actions reales — resultado vigente

- Implementación publicada: origin/main ccb69dd24a06c5016dedc490c4207d0dcc1ea455 (bootstrap b797830 + fix cache Linux ccb69dd), sin force ni integración destructiva. Lista explícita115 archivos revisada; env locales/deps/cache/logs/build/reportes ignorados; scan secretos sin hits. git diff --cached --check del commit inicial detectó únicamente whitespace preexistente en skill/docs Markdown (incluye hard breaks); no se alteró skill ajena por estilo.
- Nativo: preparación explícita Nothing to migrate, entrypoint14/14 exit0, runner9/9, Chromium2/2. Logs privados .cache/builder2-native.log.
- Primera corrida https://github.com/alejoDiDiego/changuito/actions/runs/41279566827 SHA b7978305c210b6af10cff4fba8a56073c56cb691: native success, compose failure (browser ausente al forzar ruta privada). Fallo local Compose equivalente preservado en .cache/builder2-compose.log. Fix no relaja gate: image/cache privada Linux sembrada en quality-browser; no toca cache usuario ni cache Windows.
- Corrida corregida https://github.com/alejoDiDiego/changuito/actions/runs/41279886731 SHA ccb69dd24a06c5016dedc490c4207d0dcc1ea455: COMPLETED/SUCCESS, native124769461702 SUCCESS y compose124769461518 SUCCESS. API + logs de AMBOS jobs verifican14 gates y Chromium2 passed; prep/cleanup success. Logs privados .cache/ci-124769461518.log y .cache/ci-124769461702.log, resumen .cache/actions-result.json. No logs privados publicados.

### Siguiente único escritor: Checker, sin implementación

Revisar aceptación independiente y mantener una sola feature. Builder NO marca done. El árbol entregado deja únicamente feature_list.json/progress.md/session-handoff.md de evidencia sin commit; implementación ya publicada en SHA anterior. Tras su revisión, Checker puede publicar SOLO esos3 artefactos: inspeccionar git status --short y git diff -- esos archivos, ejecutar harness y tests pertinentes, git fetch origin, comprobar git merge-base --is-ancestor origin/main HEAD (si falla, preservar historia y resolver sin force), git add -- feature_list.json progress.md session-handoff.md, revisar git diff --cached, git commit de evidencia y git push origin main. No git add ciego ni publicar cache/env/logs. Registrar nuevo SHA y observar Actions native+compose para ESE SHA, no atribuirle automáticamente el resultado del SHA anterior. No empezar otra feature.


### Cierre local comprobado del Builder

- Compose corregido: build quality exit0; preparación explícita Nothing to migrate exit0;14/14 gates exit0, runner9/9, Chromium2/2. Log privado .cache/builder2-compose-fixed.log. Gates nativos/Compose se ejecutaron EN SERIE.
- docker compose down --remove-orphans exit0, SIN -v/prune. Sin contenedores/red propios;7 volúmenes conservados (incluye nuevo quality-browser). Puertos8000/18080/8011/13714/5173/55432/55433/8025/1025 sin listeners; public/hot y config cache ausentes. No restaurar/tocar cache compartida.
- Git status final esperado: M feature_list.json, M progress.md, M session-handoff.md, únicamente evidencia sin commit para Checker. Implementación publicada origin/main ccb69dd24a06c5016dedc490c4207d0dcc1ea455. Jobs propios recogidos. SETUP sigue in-progress;65 not-started; ninguna done.
- Limitaciones históricas irreversibles preservadas: no hubo RED previo de capacidad inicial HTTP/SSR/DB; incidente de browserGC de ronda anterior no se reescribe ni se restaura. Auditoría100 es estructural, no medición de eficacia.


## Checker independiente final — 2026-11-01

- **Aceptación 1-4: PASS** en rerun real. Locks/platform/dry-runs exit0; nativo preparación `Nothing to migrate` y entrypoint14/14 exit0, runner9/9, Chromium2/2; Compose quality preparación exit0 y14/14 exit0 con PostgreSQL test aislado `changuito_test/changuito_test`, npm12.0.2/Playwright1.64.1; negativo `DB_DATABASE=changuito_dev` exit1 antes de gates; CI implementación ccb69dd24a06c5016dedc490c4207d0dcc1ea455 run41279886731 SUCCESS, native124769461702 y compose124769461518 SUCCESS (API de jobs).
- **Bloqueo para `done`:** con SETUP-001 `done`, la mutación `t.features[1].status='in-progress'` de `tests/runner/tracker.test.mjs` deja de violar dependencias (F-001 depende de SETUP `done`), `validateTracker` la acepta y `assert.throws` falla. Fixture aislada 3/4 tests exit1 (`.cache/checker2-done-runner.log`); marcar `done` rompería runner/entrypoint/CI. No se editó implementación ni se marcó done.
- **Estado:** SETUP-001 `in-progress`; otras65 `not-started`; ninguna otra activa ni `done`. Contratos de las otras65 sin cambios vs HEAD; documento de semillas retirado `git grep0`; source pointers válidos; 66 entradas exactas. Limpieza `docker compose down --remove-orphans` exit0 sin `-v`/prune: 7 volúmenes, sin contenedores/red propios, puertos propios libres, `public/hot` y config cache ausentes; jobs propios recogidos.
- **Publicación:** solo `feature_list.json`, `progress.md` y `session-handoff.md`, tras revisar diff/secretos, fetch y ancestor guard, commit/push sin force. El CI del nuevo SHA de estado se consulta por API y se registra en `.cache/checker2-state-actions.json` como evidencia local no publicada, para evitar bucle de commits de CI.
- **Próxima acción:** corregir el caso negativo del runner (dependencia insatisfecha o SETUP `not-started`), repetir entrypoint nativo/Compose y CI, y recién entonces aceptar SETUP-001. No iniciar otra feature sin solicitud.
