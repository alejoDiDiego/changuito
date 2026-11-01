# SETUP-001 — ejecución y verificación

## Alcance y contrato canónico

Bootstrap técnico solamente: dos páginas neutras, sin usuarios, tiendas, catálogo ni pedidos. SETUP-001 permanece `in-progress`; el Checker independiente decide aceptación. Por decisión humana el tracker reemplaza el documento de semillas retirado; no reconstruirlo. El harness valida schema_version 1, conjunto exacto de IDs, tipos, fuentes, dependencias, ciclos, estados y evidencia. Las 65 fuentes usan JSON Pointer `feature_list.json#/features/<índice>` y deben resolver al mismo ID: al reordenar entradas hay que actualizar sus pointers; un pointer obsoleto falla. La auditoría estructural no sustituye aceptación.

## Runtime y locks

PHP **8.5.10**, Composer **2.10.3**, Node **24.15.0** / npm **12.0.2**, PostgreSQL **18.6**. Laravel **13.39.0** exige PHP `^8.3`; este proyecto restringe PHP a `~8.5.0` porque el lock real incluye Symfony 8.1 y Pest 4. No prometer ejecución del lock sobre PHP 8.3. Inertia PHP **3.6.0** admite Laravel `^13`; Inertia React **3.10.0** exige React/ReactDOM `^19`, fijados a **19.3.1**. Vite **8.3.5** admite Node >=22.12; plugin React **5.2.0** tiene peers compatibles. TypeScript **5.9.3**, Tailwind **4.3.3**, Pest **4.7.8**, Pint **1.32.1**, Larastan **3.13.2**. Versiones exactas resueltas en ambos lockfiles y frontend directo exacto. Composer usa restricciones de parche `~13.39.0` / `~3.6.0` para runtime (su validación estricta advierte contra constraints exactas), con versiones exactas en el lock; dev tools exactas. No usar `update` en preparación ni ignorar platform/peers. La imagen upstream Node24.15 trae npm11.12.1: las imágenes Node/quality instalan **npm12.0.2 en el prefijo local `/opt/npm`**, sin `-g`, antes de instalar dependencias. Actions hace lo mismo en `.cache/npm-runtime` y añade su `.bin` a PATH; no depende del npm incidental del runner.

Fuentes: [Laravel 13](https://laravel.com/framework/docs/13.x/releases), [Inertia instalación](https://inertiajs.com/docs/v3/installation/server-side-setup), [SSR](https://inertiajs.com/docs/v3/advanced/server-side-rendering). Además se comprobaron constraints de los manifests efectivamente instalados y `npm view` de peers.

## Preparación nativa (Windows PowerShell)

Prerequisitos instalados por el operador: runtimes anteriores y extensiones PHP `pdo_pgsql`, `mbstring`, `dom`, `xml`, `intl`, `zip`, `curl`, `openssl`. Docker no es obligatorio: se puede usar PostgreSQL local con roles/bases dedicados. Crear explícitamente, en una instancia de desarrollo vacía, `changuito_dev` y `changuito_test`, cada base propiedad de su rol homónimo; **no usar credenciales ni datos reales**. Ejemplo SQL a ejecutar por el administrador local (no lo ejecuta el verificador):

```sql
CREATE ROLE changuito_dev LOGIN PASSWORD 'local-development-only';
CREATE DATABASE changuito_dev OWNER changuito_dev;
CREATE ROLE changuito_test LOGIN PASSWORD 'local-tests-only';
CREATE DATABASE changuito_test OWNER changuito_test;
```

Si ambos están en una sola instancia nativa, ajustar puertos explícitamente en los archivos locales. Preferir instancia de test separada sin datos reales; Compose ya la proporciona. Nunca reutilizar una DB existente sin comprobar su propósito.

```powershell
composer install --no-interaction --prefer-dist
npm ci
Copy-Item .env.example .env               # solo si no existe; nunca sobrescribir configuración
Copy-Item .env.testing.example .env.testing # solo si no existe
php artisan key:generate                 # genera clave local, no imprimirla
node scripts/install-browser.mjs          # explícito; cache .cache/ms-playwright, GC deshabilitado
$env:APP_ENV='testing'
php scripts/prepare-test.php              # migraciones aditivas SOLO DB de test, sin reset/truncate
Remove-Item Env:APP_ENV
npm run build
npm run build:ssr
```

Linux: `cp` en lugar de `Copy-Item`, `APP_ENV=testing php scripts/prepare-test.php` en lugar de asignación PowerShell. Dependencias del SO para Chromium en Linux: instalación explícita `PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" PLAYWRIGHT_SKIP_BROWSER_GC=1 npx --no-install playwright install --with-deps chromium`. No instalaciones globales npm.

Para arrancar nativamente, en terminales propias (Ctrl+C al terminar):

```powershell
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
node bootstrap/ssr/ssr.js
# Opcional en otra terminal; genera public/hot mientras está activo:
npm run dev
# Solo tras migración explícita en la DB NUEVA de desarrollo:
php artisan migrate
php artisan queue:work --sleep=3 --tries=1
```

Abrir http://127.0.0.1:8000 y `/bootstrap/check` (consulta PostgreSQL). Sin Vite dev usa artefactos de producción. SSR falla explícitamente si falta el renderer; no fallback silencioso en los tests. No hay autenticación ni una tienda disponible.

## Docker Compose

Puertos ligados solo a loopback: web **18080** (configurable con `WEB_PORT`; 8080 estaba ocupado por un servicio ajeno y no se modificó), Vite **5173**, PostgreSQL dev **55432**, PostgreSQL test **55433**, Mailpit **8025** (SMTP **1025**). SSR **13714** y PHP-FPM son internos. Bases, usuarios y volúmenes dev/test independientes; credenciales públicas de ejemplo solo desarrollo local. Dependencias PHP en volumen `app-vendor` compartido únicamente por app/worker, Node en `node-deps`, y quality en sus propios volúmenes: no reutilizar vendor/node_modules de Windows dentro de Linux. Web y SSR tienen healthchecks reales; el timeout web de 10s contempla el arranque con bind mounts Windows (se midieron 3,9s en `/up` con vendor en host).

```powershell
# Preparar .env / clave local como arriba; Compose lee APP_KEY desde .env.
docker compose build app node quality
docker compose up -d --wait postgres postgres-test
docker compose run --rm app composer install --no-interaction --prefer-dist
docker compose run --rm node npm ci
docker compose run --rm node npm run build
docker compose run --rm node npm run build:ssr
# Solo nueva DB local de desarrollo, revisión explícita antes de ejecutar:
docker compose run --rm app php artisan migrate
# Producción compilada, no Vite dev para smoke SSR:
docker compose up -d --wait app web ssr worker mailpit
# Desarrollo opcional:
docker compose up -d node
```

Abrir http://127.0.0.1:18080. SSR sin JS debe mostrar `Changuito` y `Entorno técnico disponible`. El worker usa driver database; Mailpit solo correo local. No se envían mensajes externos. `npm run dev` nativo liga solo a loopback; Compose abre Vite dentro de su contenedor, publicado únicamente en loopback del host. HMR/origen público usa127.0.0.1:5173 y CORS admite únicamente orígenes HTTP de loopback (nativo8000/Compose18080, también puertos locales alternativos), no sitios externos.

Smoke explícito de Vite, separado de gates compilados:

```powershell
docker compose up -d --wait --wait-timeout 90 node
node scripts/smoke-vite.mjs # HTTP/transpilación + CORS backend8000/18080 y rechazo de origen externo
docker compose stop node
# Si queda public/hot, retirar únicamente ese archivo generado por este Vite propio.
```

Detener Vite y su hot file antes del entrypoint obligatorio; nunca usar ese smoke como sustituto de Playwright SSR/producción.

### Gates dentro de Compose

Servicio `quality` incluye PHP/Composer/Node y Chromium fijado al lock, con dependencias de SO y cache privada en la imagen. Los volúmenes de dependencias son exclusivos Linux y separados de los del host/Node dev.

```powershell
# .env.testing debe existir antes de verificar
docker compose up -d --wait postgres-test
docker compose build quality
docker compose run --rm quality composer install --no-interaction --prefer-dist
docker compose run --rm quality npm ci
docker compose run --rm quality php scripts/prepare-test.php
docker compose run --rm quality node scripts/verify-harness.mjs --application
```

No ejecutar gates nativo y Compose al mismo tiempo: comparten los artefactos del bind mount y la DB test serial. No ejecutar Vite dev durante gates; detener su proceso y quitar únicamente su `public/hot` residual si sigue presente. El verificador rechaza caché Laravel y hot file en lugar de alterarlos por su cuenta.

## Catálogo obligatorio

Entrypoint idéntico nativo/Compose/CI:

```powershell
node scripts/verify-harness.mjs --application
```

Ejecuta **todos** los gates aunque uno falle, y sale distinto de cero si falta/falla cualquiera. Preflight exige herramientas, locks, suites no vacías y entorno test seguro antes de procesos. No instala, no crea claves, no inicia infraestructura persistente y no migra. Playwright sí administra sus servidores temporales PHP/SSR y los cierra al terminar; puertos **8011/13714** deben estar libres, no reutiliza servidores ajenos. Runner Windows usa el Windows PowerShell incluido (`powershell.exe`) y resuelve npm/composer mediante sus shims PowerShell con propagación explícita de exit code; no requiere PowerShell 7 ni WSL. La política Bypass se limita al proceso hijo, sin modificar configuración global. El shim `composer.cmd` de Scoop se comprobó inseguro para gates porque devuelve 0 ante errores, por eso no se usa.

| Gate | Comando real |
|---|---|
| Harness documental | `node scripts/verify-harness.mjs` |
| Contratos del runner | `npm run test:runner` |
| Locks/platform | `composer validate --strict` y `composer check-platform-reqs` |
| Pest Unit | `composer test:unit` |
| Pest PostgreSQL / HTTP | `composer test:feature` |
| Pest arquitectura | `composer test:architecture` |
| Estilo no mutante | `composer lint` |
| PHPStan/Larastan nivel 8 | `composer analyse` |
| ESLint nofix | `npm run lint` |
| TypeScript estricto | `npm run typecheck` |
| Cliente + SSR | `npm run build` y `npm run build:ssr` |
| Chromium SSR/noJS, hidratación, móvil/teclado y navegación DB | `npm run test:e2e` |

Tests bootstrap, no simulación de cobertura del MVP: guardia DB rechaza SQLite/dev/URL overrides antes de conexiones/migraciones; integración comprueba identidad real PostgreSQL y rollback DDL/DML temporal; arquitectura prohíbe dep HTTP en soporte y debug termination; navegador usa HTML SSR real sin JS y navegación hidratada que consulta DB. Suites vacías fallan; Pest `--fail-on-empty-test-suite`, Playwright sin `passWithNoTests`, sin retries que oculten fallos. Traces/capturas en fallos solo contienen página neutra, sin datos de compradores.

[GitHub Actions](../.github/workflows/quality.yml) tiene jobs nativo y Compose, preparación explícita y mismo entrypoint. El remoto autorizado es https://github.com/alejoDiDiego/changuito. YAML escrito/local no equivale a corrida remota; consultar evidencia de SHA y ejecución real en progress/handoff.

## Detención no destructiva

```powershell
docker compose stop
# Alternativa: elimina contenedores/red propios, conserva volúmenes:
docker compose down --remove-orphans
```

Nunca `down -v`, prune, reset o migrate:fresh. Terminales nativas: Ctrl+C; Playwright limpia sus hijos. Comprobar puertos/servicios y jobs propios al cierre. No finalizar procesos ajenos. Ver evidencia concreta y limitaciones de esta sesión en [progress](../progress.md) y [handoff](../session-handoff.md).
