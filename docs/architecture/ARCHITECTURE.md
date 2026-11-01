# ARCHITECTURE.md — Decisiones de arquitectura y calidad

**Estado:** arquitectura acordada, baseline v1 · **Fecha:** 2026-11-01  
**Referencias:** [PRODUCT.md](../product/PRODUCT.md) · [DOMAIN.md](../product/DOMAIN.md) · [feature_list.json](../../feature_list.json)

> Registra decisiones **ya tomadas** y los defaults cerrados para empezar. Evita convertir el diseño en un contrato prematuro de clases, rutas privadas o infraestructura comercial definitiva. Las features y escenarios observables viven en feature_list.json.

## 1. Estilo arquitectónico

**Decisión:** monolito modular con un solo backend Laravel, un despliegue lógico y contextos funcionales explícitos. No usar microservicios ni una instalación de aplicación por comercio.

**Motivación:** el producto requiere transacciones consistentes, desarrollo rápido, operación sencilla y límites estables de negocio. Separar procesos no aporta valor demostrado en esta etapa.

**Consecuencias y límites:**

- Cada módulo es dueño de sus reglas y persistencia; no se permite uso arbitrario de modelos, tablas o servicios internos de otros módulos.
- Se aceptan dependencias mediante interfaces/casos de uso públicos, consultas explícitas y eventos; evitar dependencias circulares.
- Las operaciones que necesitan respuesta consistente inmediata usan contratos sincrónicos. Los eventos se reservan para consecuencias posteriores y desacopladas, no para esconder transacciones críticas.
- `Shared` solo aloja conceptos verdaderamente transversales (dinero, contexto validado, utilidades). No será un módulo de negocio residual.
- Separación conceptual Application / Domain / Infrastructure / HTTP donde haya complejidad suficiente. No forzar capas y abstracciones para cada CRUD simple.
- Un módulo puede evolucionar internamente sin alterar contratos públicos de otros módulos.

## 2. Stack adoptado

| Ámbito | Elección |
|---|---|
| Backend | Laravel 13, PHP 8.3+ como objetivo de arranque; versiones finales compatibles se fijan en lockfiles. |
| Frontend | React 19, TypeScript, Tailwind CSS 4. |
| Navegación/renderizado | Inertia.js 3; Vite; SSR de la tienda pública. |
| UI | shadcn/ui y Radix para los componentes donde aporten valor; una plantilla responsive inicial. |
| Base de datos | PostgreSQL en desarrollo, test y producción. |
| Pruebas de backend | Pest (unitarias, integración/feature y arquitectura). |
| Pruebas frontend | Playwright para recorridos de navegador; Vitest/Testing Library cuando justifique tests de componentes. |
| Estilo/análisis | Laravel Pint, PHPStan/Larastan, ESLint y TypeScript. |
| Tareas y colas | Laravel Queues con driver `database` inicialmente; Redis opcional posteriormente. |
| Archivos | Almacenamiento gestionado por Laravel, con separación por comercio; adaptador de storage reemplazable. |
| Envío de correo | Servicio transaccional externo detrás de integración; Mailpit solo para desarrollo. |
| IA (P1) | Laravel AI SDK o adaptador equivalente **tras un contrato propio** para evitar dependencia del proveedor. |
| Suscripciones (P1) | Mercado Pago, con estado reconciliado desde backend/webhooks. |
| Compradores/WhatsApp | Enlace oficial `wa.me` con texto precargado; no WhatsApp Business API en P0. |
| Ejecución | Docker Compose como camino principal; ejecución nativa plenamente soportada. |
| CI | GitHub Actions. |

El uso de versiones objetivo del stack no autoriza actualizar dependencias automáticamente: se validará compatibilidad al crear el repositorio. No introducir Next.js, SPA separada, GraphQL, Kafka ni infraestructura distribuida para el MVP.

## 3. Mapa de módulos

| Módulo | Responsabilidad principal | Dependencia permitida (conceptual) |
|---|---|---|
| `Identity` | Registro, sesiones, verificación, recuperación | Tenancy para verificar acceso a un comercio |
| `Tenancy` | Comercios, configuración, contexto, membresías, publicación | Identidad/verificación y derechos de Billing cuando exista |
| `Catalog` | Catálogo, precio, estado y disponibilidad | Contexto de tenant autenticado |
| `Storefront` | Experiencia pública, visibilidad y consulta | Consultas públicas de Tenancy/Catalog |
| `Checkout` | Cotizar y crear pedido idempotente | Lectura autorizada de Tenancy/Catalog/Billing; operación de creación en Orders |
| `Orders` | Estados, snapshots, trazabilidad, seguimiento | Contexto de negocio; emite eventos |
| `Notifications` | Avisos, reintentos y preparación de contacto | Consume eventos, consulta datos mínimos autorizados |
| `AI` (P1) | Propuestas, aprobación, consumo | Comandos autorizados de Catalog/Tenancy |
| `Billing` (P1) | Planes, suscripciones y límites | Eventos externos verificables |
| `Platform` (P1) | Operación global/soporte auditado | Capacidades administrativas limitadas de otros módulos |

**Frontera crítica Checkout/Orders:** Checkout coordina revalidación y deduplicación de la intención; Orders es propietario de la creación persistente y del ciclo de vida. Un único flujo transaccional crea el pedido y registra el evento; no hay publicación eventual de una orden que todavía no existe.

**Frontera crítica Billing/Orders:** cobrar al comercio por el SaaS es independiente de cobrar al comprador en su tienda. No introducir `paid` en la máquina de estados de Orders.

**Frontera crítica AI/Catalog:** IA crea **propuestas**; aprobación humana ejecuta casos de uso normales de Catalog. Ningún job de IA escribe/publica productos eludiendo reglas de negocio.

## 4. Multi-tenancy y autorización

**Decisión:** un PostgreSQL, un esquema compartido, filas aisladas por `tenant_id`; no database-per-tenant ni schema-per-tenant.

1. El comercio se resuelve **en el servidor** desde contexto de ruta/dominio o desde una selección autorizada. Nunca desde un `tenant_id` confiado al navegador.
2. Middleware y Policies verifican membresía, rol, propiedad y operación. Una persona puede cambiar de comercio solo si pertenece a él.
3. Todas las consultas privadas y escrituras se acotan al comercio validado, incluidas tareas de cola, cachés, archivos, exportaciones, métricas, SSR y procesos de IA.
4. Índices, constraints y, cuando haga falta, claves foráneas compuestas refuerzan pertenencia y unicidad. Ejemplos: `(tenant_id, product_slug)` o referencias que obliguen a coincidir el tenant.
5. Acceso a recursos ajenos devuelve 404 o denegación segura sin filtrar existencia ni datos del otro negocio.
6. Los jobs transportan un identificador de comercio validable y reconstruyen contexto; **no** heredan accidentalmente el tenant de una request o worker anterior.
7. `platform_admin` usa facultades globales separadas, mínimas y auditadas.

**PostgreSQL Row Level Security:** no se activa en la primera versión sin diseñar exhaustivamente conexiones, sesiones, pooling y jobs. Puede evaluarse después como defensa adicional; el aislamiento en aplicación y restricciones SQL es obligatorio desde P0.

## 5. PostgreSQL y consistencia

- PostgreSQL real en todas las pruebas que validen persistencia; no sustituir integración por SQLite.
- IDs internos no enumerables (UUIDv7 adoptado como default); slugs públicos e identificadores de pedido tienen unicidad en su ámbito correcto.
- Dinero como enteros en unidad menor más código de moneda; cantidades enteras positivas; prohibir cálculos de dinero basados en `float`.
- Claves foráneas, `unique` compuestos, `check` e índices para invariantes; transacciones para operaciones atómicas.
- `OrderItem` guarda snapshot de nombre, cantidad, precio y totales. Cambios del catálogo nunca lo reescriben.
- El intento de checkout y la orden resultante tienen integridad transaccional e índice/constraint que materializa la idempotencia por comercio y clave.
- Las transiciones de estado de una orden deben ser atómicas frente a cambios concurrentes; conflicto reporta el estado actual.
- Migraciones reproducibles y compatibles con datos existentes; no editar migraciones ya aplicadas en entornos compartidos.

**Creación de pedido:**

1. Resolver tenant y validar tienda, horarios, elegibilidad, productos y modalidad.
2. Calcular cotización de autoridad y verificar aceptación vigente.
3. Dentro de transacción, garantizar intención única, revalidar lo necesario, guardar pedido + líneas snapshot + evento de creación + resultado idempotente.
4. Confirmar transacción antes de devolver éxito.
5. Mostrar confirmación web; avisos asíncronos solo después del commit.
6. Apertura de WhatsApp por acción explícita del comprador, sin alterar estado de pedido.

**Límite conocido de entrega de eventos:** un `afterCommit` evita ejecutar efectos sobre datos revertidos, pero no garantiza por sí solo entrega tras una caída entre commit y encolado. La fuente primaria es la orden persistida y consultable. Si se requiere entrega garantizada de eventos externos, adoptar *transactional outbox* con diseño explícito; no prometer exactamente-once para correo/WhatsApp.

## 6. Frontend y superficies HTTP

**Panel privado:** Inertia + React/TypeScript; foco en formularios, validaciones, bandeja y gestión de estados. No precisa SEO.

**Tienda pública:** Inertia con SSR; navegación móvil, accesibilidad, HTML indexable, imágenes optimizadas y metadatos básicos. `Storefront` es lectura pública de datos publicados, no un acceso a modelos privados.

**Ruta pública P0:** `/tienda/{slug}` y rutas subordinadas de catálogo, checkout y seguimiento. Subdominios y dominios personalizados son P2. El diseño del resolvedor permite añadirlos después sin alterar el dominio, pero **no** implementamos certificados/DNS personalizados en P0.

**Plantilla:** única, configurable en logo, nombre, descripción y colores acotados. Sin editor visual ni temas ilimitados.

**Carrito:** por comercio y en almacenamiento local del navegador; si está deshabilitado, comportamiento en memoria. La estimación en UI puede quedar obsoleta, siempre debe revalidarse en backend. No se guardan precios del navegador como autoridad.

**Accesibilidad:** controles por teclado, estados de error/éxito comprensibles, roles accesibles y diseño móvil. Los flujos críticos deben probarse visual y funcionalmente, no solo por respuestas HTTP.

## 7. WhatsApp, notificaciones e integraciones

- P0 usa únicamente enlace `wa.me` con texto URL-encoded y destinatario comercial normalizado. El navegador puede no abrir WhatsApp; se ofrece copiar mensaje y teléfono.
- El pedido se crea y confirma **en la web antes** del handoff. No hay envío/recepción/leído comprobado ni chatbot automático.
- El enlace no incluye token secreto de seguimiento, credenciales, ni datos personales no necesarios.
- La bandeja de pedidos es la fuente de verdad operativa. El correo de aviso al comercio es secundario, de mejor esfuerzo y reintentable; jamás debe revertir el pedido.
- En P1, webhooks de Billing deben verificar origen mediante mecanismo oficial del proveedor, procesar duplicados y desorden y reconciliar estado real antes de conceder derechos.
- En P1, IA tiene timeouts, límites de cuota por comercio, resultados estructurados validados, revisión humana, tareas reintentables e identificación de costos.
- No se mezclan errores de terceros con reglas de confirmación/pago: una integración fallida no genera éxito ficticio.

## 8. Despliegue y experiencia de desarrollo

**Principio:** Docker es medio de ejecución preferido, **no dependencia lógica del código**.

### Docker Compose — entorno principal

Servicios iniciales: aplicación PHP/Laravel, servidor web, PostgreSQL, entorno Node/Vite, worker de cola y Mailpit; Redis opcional. SSR público requiere su proceso Node en los despliegues que lo habiliten.

### Desarrollo nativo — alternativa soportada

PHP/Composer, Node/npm y PostgreSQL local o remoto, mismas versiones mayores, extensiones PHP requeridas (`pdo_pgsql`, etc.). La aplicación se ejecuta sin instrucciones `docker compose` obligatorias y con configuración de entorno documentada.

### Paridad

- Comandos semánticamente equivalentes para preparar entorno, migrar, ejecutar app/worker, tests PHP, Playwright, chequeo de tipos y lint.
- Diferencias permitidas: host de PostgreSQL, puertos, rutas de volúmenes y forma de iniciar servicios. No duplicar lógica de negocio ni tests por modo.
- Pruebas de integración/E2E siempre contra PostgreSQL aislado; no contra base de desarrollo con datos reales.
- CI incluye ejecución completa automatizada en entorno reproducible y smoke/guía verificable para el modo nativo.

## 9. Calidad y estrategia TDD

**Proceso obligatorio para cada cambio de comportamiento:**

1. **Red:** especificar prueba observable que falle por la capacidad todavía no desarrollada, no por un error artificial de configuración.
2. **Green:** implementar el comportamiento mínimo que cumple esa prueba.
3. **Refactor:** mejorar diseño manteniendo pruebas verdes.

**Niveles:**

- **Pest Unit:** cálculos de dinero, invariantes, transiciones y políticas puras.
- **Pest Feature/integración:** autenticación, permisos, tenant, transacciones, restricciones de PostgreSQL, idempotencia, errores y reintentos.
- **Pruebas de arquitectura:** dependencias permitidas, ciclos entre módulos y ausencia de acceso transversal prohibido.
- **Vitest/Testing Library:** componentes React con comportamiento complejo, cuando el aislamiento aporte señal adicional.
- **Playwright E2E:** flujos completos reales de comerciante y comprador, incluyendo móvil, errores y aislamiento entre tiendas, con backend y PostgreSQL reales.

**Cobertura Playwright prioritaria:** publicación de tienda; navegación y carrito; pedido normal; precio modificado; producto no disponible; checkout de tienda pausada; red interrumpida después de crear pedido; apertura/copia de WhatsApp; seguimiento; transición de orden; acceso cruzado. Ejecutar Chromium como base y ampliar cobertura Firefox/WebKit en regresión según costo.

**Antifalsos positivos:** datos de prueba deterministas, aislamiento de DB por test/worker o secuenciación controlada, nada de suites paralelas que trunquen una DB compartida, traces/capturas en fallos y ninguna suposición de que los externos respondieron si no existe evidencia. Los tests de integraciones externas usan fakes y tests de contrato controlados; Playwright no depende de enviar mensajes reales de WhatsApp.

**Definition of Done de una feature:** aceptación comprobada, RED-GREEN-REFACTOR evidenciado, errores y recuperación, autorización/tenancy, integración PostgreSQL cuando corresponda, Playwright para recorrido crítico, tests y análisis estático verdes, sin PII en logs, y cambios de contrato reflejados en la documentación.

## 10. Seguridad, datos personales y operaciones

- Autenticación y autorización en servidor, CSRF, rate limits en login/checkout, validación estricta de contenido/archivos, gestión de secretos fuera del repositorio y transporte cifrado en producción.
- Datos de comprador visibles solo a quienes operan su pedido; el seguimiento público usa un secreto aleatorio con hash persistido y muestra un resumen minimizado.
- Cambios de estado sensibles y acciones globales auditados. No registrar en logs teléfonos completos, direcciones, tokens ni datos de pago.
- Backups automáticos y restauración ensayada en ambiente aislado, no solo copias sin verificar.
- P0 conserva pedido e historial ante fallos de correo o WhatsApp; degradación de IA y Billing en P1 sin corrupción de dominio.
- Políticas de privacidad, términos, retención/supresión y operación legal requieren revisión antes de la apertura comercial; la especificación funcional no reemplaza asesoramiento jurídico.

### Defaults operativos cerrados para piloto productivo

| Aspecto | Default inicial / criterio verificable |
|---|---|
| Objetivo de disponibilidad del checkout | 99,5 % mensual, excluyendo mantenimiento anunciado; se mide, no se da por alcanzado. |
| Objetivo RPO | Hasta 1 hora de datos perdibles mediante backups/PITR adecuados al proveedor. |
| Objetivo RTO | Restauración funcional en hasta 4 horas en un ejercicio de recuperación. |
| Almacenamiento de pedidos | Retención operativa por defecto de 24 meses tras terminal, sujeta a solicitudes válidas y obligaciones legales. |
| Archivos de imagen | Hasta 5 MiB por archivo y 8 imágenes por producto al comienzo. |
| Presupuesto de referencia de infraestructura | Hasta US$150/mes como guardrail del piloto, a contrastar con cotizaciones antes del despliegue; no implica capacidad garantizada. |
| Seguimiento público | Revocable; hasta 180 días tras cierre del pedido por defecto. |
| Intentos idempotentes | Recuperables/deduplicados por al menos 72 horas. |

Si la infraestructura elegida no puede cumplir RPO/RTO o el presupuesto no lo permite, se ajusta la contratación operativa **antes de habilitar tiendas reales**; no se desactiva una garantía anunciada sin registrar el cambio.

## 11. Registro resumido de decisiones (ADRs conocidos)

| ID | Decisión | Estado |
|---|---|---|
| ADR-001 | Monolito modular Laravel, un deploy lógico | Adoptada |
| ADR-002 | Multi-tenancy shared database/shared schema (`tenant_id`) | Adoptada |
| ADR-003 | Panel privado Inertia/React; tienda pública Inertia SSR | Adoptada |
| ADR-004 | PostgreSQL, snapshots económicos, transacciones e idempotencia | Adoptada |
| ADR-005 | Carrito → pedido persistido → WhatsApp por enlace manual | Adoptada |
| ADR-006 | Docker Compose preferido, desarrollo nativo soportado | Adoptada |
| ADR-007 | TDD Red–Green–Refactor + Pest/PostgreSQL + Playwright | Adoptada |
| ADR-008 | Colas Laravel database iniciales; Redis opcional | Adoptada |
| ADR-009 | Un solo template de tienda y `/tienda/{slug}` en MVP | Default cerrado |
| ADR-010 | Owner en P0; operadores/administración global P1 | Default cerrado |
| ADR-011 | IA no bloquea MVP y requiere aprobación humana en P1 | Default cerrado |
| ADR-012 | Billing de SaaS en P1, pago de compradores fuera de alcance | Adoptada |
| ADR-013 | RLS no inicial; autorización en aplicación y constraints en PostgreSQL | Adoptada |
| ADR-014 | Horario restrictivo por defecto, sin expiración automática de pedidos P0 | Default cerrado |
| ADR-015 | Retenciones, límites y SLO/RPO/RTO del piloto establecidos arriba | Default cerrado |

## 12. Decisiones deliberadamente **no** especificadas

Estas no son nuevos requisitos abiertos del producto, sino detalles que deben decidirse durante implementación sin alterar los comportamientos anteriores: nombres definitivos de tablas/campos, esquema exacto de endpoints, estructura de clases y DTOs, proveedor de hosting/storage/correo, mecanismo de autenticación de integraciones concretas, proveedor/modelo de IA, forma exacta de versionar cotizaciones, diseño visual final y granularidad de permisos P1. Un cambio que altere reglas del dominio o contratos públicos requiere su propio ADR y actualización de los documentos y del tracker afectados.
