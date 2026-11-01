# DOMAIN.md — Modelo conceptual y reglas de negocio

**Estado:** baseline de dominio v1 · **Fecha:** 2026-11-01  
**Referencias:** [PRODUCT.md](PRODUCT.md) · [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) · [feature_list.json](../../feature_list.json)

> Describe lenguaje ubicuo, identidades, agregados conceptuales, estados e invariantes. **No prescribe** tablas, clases, endpoints ni nombres de métodos. El modelo de persistencia lo implementará respetando estas reglas.

## 1. Lenguaje ubicuo

| Término | Significado exacto |
|---|---|
| Plataforma | SaaS que ofrece tiendas y gestión de pedidos a comercios. |
| Comercio / `Tenant` | Cliente de la plataforma, dueño de una tienda pública y sus datos. Es la frontera de aislamiento. |
| Tienda | Presentación pública del comercio; no representa una base de datos ni un despliegue separado. |
| Usuario | Identidad autenticada que puede pertenecer a varios comercios. |
| Membresía | Relación autorizada entre usuario y comercio, con rol y vigencia. |
| Propietario / `owner` | Usuario responsable de configurar y operar el comercio. |
| Comprador invitado | Persona no autenticada que solicita un pedido y puede consultarlo con un token. |
| Producto | Oferta del comercio con precio, publicación y disponibilidad manual. |
| Carrito | Selección provisional en el navegador; no crea obligaciones y no es autoridad de precios. |
| Cotización | Cálculo temporal del servidor de líneas, tarifas, moneda y total, sujeto a validez/reconfirmación. |
| Pedido / `Order` | Solicitud persistente e inmutable en sus términos económicos originales, pendiente de aceptación comercial. |
| Confirmación | Decisión explícita del comerciante de aceptar un pedido; no es confirmación de pago. |
| Handoff WhatsApp | Intento del comprador de abrir el canal con texto precargado; no implica mensaje enviado. |
| Seguimiento | Lectura limitada de un pedido por un enlace con token secreto y revocable. |
| Suscripción SaaS | Derecho del comercio a usar capacidades de la plataforma (P1); no corresponde a pagos del comprador. |
| Propuesta de IA | Contenido sugerido para revisión; no equivale a producto aprobado o publicado. |

## 2. Límites de dominio y dueños de reglas

| Contexto | Es dueño de | Consulta o emite |
|---|---|---|
| Identity | Identidad, credenciales, sesiones, verificación | Membresías de Tenancy para autorizar |
| Tenancy | Comercios, membresías, estado y configuración | Estado de Billing cuando aplique |
| Catalog | Categorías, productos, precios y disponibilidad | Identidad del tenant validado |
| Storefront | Visibilidad pública de tiendas/productos | Consultas de Tenancy y Catalog; no altera ambos |
| Checkout | Carrito interpretado, cotización, validación y creación única del pedido | Consulta Tenancy/Catalog y capacidad de Billing |
| Orders | Ciclo de vida posterior, snapshots, auditoría y seguimiento | Notifica eventos a otros contextos |
| Notifications | Avisos y contacto asistido | Consume eventos de Orders; no cambia sus estados |
| AI (P1) | Propuestas, aprobaciones y uso/costos | Invoca casos autorizados de Catalog al aprobar |
| Billing (P1) | Planes, suscripciones y derechos de uso | Resuelve habilitación de funciones |
| Platform (P1) | Operación global y soporte auditado | Accede de forma explícita y autorizada a otros contextos |

`Checkout` puede crear un pedido como operación coordinada con `Orders`, pero **Orders es propietario de la orden y sus estados**. Las dependencias entre contextos no autorizan acceso directo arbitrario a sus datos internos.

## 3. Entidades, agregados y relaciones

### 3.1 Comercio

**Identidad:** identificador interno inmutable (UUIDv7 como opción inicial), `slug` público único a nivel plataforma en P0.  
**Atributos principales:** nombre, descripción, contacto, teléfono WhatsApp normalizado, logo/colores, rubro, moneda, zona horaria, horarios, recepción fuera de horario, modalidades de entrega, tarifa fija/cobertura textual, estado.

**Relaciones:** un comercio tiene membresías, categorías, productos, pedidos y, en P1, suscripción y generaciones de IA. Todos los recursos operativos están asociados a **exactamente un** comercio.

**Invariantes:**

- No existe comercio sin al menos un propietario activo. En P0 se crea exactamente uno.
- Crear comercio y membresía inicial es atómico.
- Solo se puede publicar con requisitos mínimos completos: email del propietario verificado, identidad, WhatsApp, horario, modalidad válida y producto publicable disponible.
- Un comercio pausado mantiene acceso al historial, pero no recibe pedidos nuevos.
- El estado operativo del comercio es distinto al estado de la suscripción; la habilitación de checkout requiere ambos cuando Billing esté vigente.
- Nunca se transfiere automáticamente información ni permisos de un comercio a otro.

### 3.2 Usuario y membresía

**Usuario:** identidad global por correo único verificado para poder publicar, sesiones y credenciales.  
**Membresía:** comercio, usuario, rol (`owner` P0; `operator` P1), estado/vigencia.

**Invariantes:**

- El usuario puede ser miembro de varios comercios, pero cada solicitud y proceso opera con un comercio validado explícitamente.
- No se infiere una membresía a partir de rutas, parámetros del navegador o un email declarado.
- Revocar permisos afecta las siguientes operaciones del usuario; no elimina su actividad histórica.
- Un `platform_admin` no obtiene facultades por el mero hecho de ser dueño de una tienda y viceversa.
- En P1, no es posible revocar al último propietario sin transferir antes la propiedad.

### 3.3 Categoría y producto

**Categoría:** comercio, nombre, slug único por comercio y orden. Jerarquía plana en P0.  
**Producto:** comercio, categoría opcional, nombre, slug único por comercio, descripción, imágenes ordenadas, precio, moneda, orden, estado de publicación y disponibilidad manual.

**Invariantes:**

- Un producto o categoría no puede relacionarse con entidades de otro comercio.
- `published` y `is_available` son independientes: algo publicado puede mostrarse como no disponible.
- Solo productos publicados y disponibles pueden entrar en **nuevos** pedidos.
- Un producto archivado deja de ofrecerse y no se elimina de los snapshots históricos.
- Cambios de precio o nombre nunca cambian el contenido original de `OrderItem`.
- No existe inventario cuantitativo ni reserva en P0.
- En P0 no existen variantes ni extras de precio propio; son P1 y deberán tener snapshot explícito de su selección.

### 3.4 Carrito y cotización

**Carrito:** selección de un único comercio, con identificadores de productos, cantidades enteras positivas, modalidad y notas; puede mantenerse en almacenamiento local o, si falla, memoria de la visita. No es un registro de venta.

**Cotización:** resultado temporal producido por el backend a partir de productos, modo de cumplimiento, configuración y tarifas vigentes; identifica una versión o referencia reconocible por el servidor y un vencimiento breve.

**Invariantes:**

- No existen carritos mezclados entre dos comercios; se conservan separadamente en el navegador.
- Máximo inicial: 50 líneas por carrito y 20 unidades por línea, con controles del servidor.
- El precio del navegador nunca es autoridad ni es aceptado como total.
- La cotización usa una sola moneda, que debe coincidir con la del comercio (ARS en piloto).
- Ante cualquier cambio material de precio, entrega o disponibilidad antes de confirmar, el comprador debe revisar y aceptar de nuevo.
- Una cotización no es un pedido ni bloquea stock/precios de manera indefinida.

### 3.5 Pedido (`Order`) — agregado principal

**Identidad:** ID interno no enumerable (UUIDv7), número público único **dentro del comercio**, comercio propietario, secreto de seguimiento cuyo hash se almacena.

**Contenido histórico:** estado, comprador (nombre y teléfono declarados, no verificados), modalidad (`pickup`/`delivery`), dirección si reparto, notas, moneda, subtotal, tarifa de reparto, total, fecha y canal de creación, instantánea de configuración/contacto relevante y líneas del pedido.

**Línea de pedido (`OrderItem`):** producto original (referencia opcional), nombre, precio unitario, cantidad, subtotal y observación; en P1 incorpora opciones elegidas con su impacto económico. Los datos económicos son snapshots.

**Historial (`OrderEvent`):** tipo de transición, actor real (`owner`, `operator`, sistema), estado previo/nuevo, motivo cuando aplique, instante y correlación. Se agrega sin sobrescribir eventos previos.

**Invariantes:**

- Todo pedido pertenece a exactamente un comercio y se crea con una o más líneas válidas.
- Se crea en `pending`, nunca en `confirmed`, `paid` o `completed` automáticamente.
- `subtotal = suma(cantidad × precio_unitario_snapshot)`; `total = subtotal + delivery_fee` en P0. Todos los valores monetarios son enteros en unidad menor, no `float`.
- La creación de cabecera, líneas, totales, clave de idempotencia y evento de creación es una sola unidad transaccional.
- No se cambia ni se borra retroactivamente el snapshot por cambios posteriores en catálogo o tarifas.
- Solo un actor autorizado puede efectuar transiciones permitidas; cada una se audita atómicamente.
- Los estados terminales no pueden reabrirse en P0. No hay estado financiero `paid` en Orders.
- El comercio declara la entrega en `completed`; **no** se infiere cobro, entrega logística verificada ni factura.
- Los datos del comprador se exponen solo a actores autorizados; el seguimiento público es una vista minimizada.

### 3.6 Intento de checkout (`CheckoutAttempt`)

Representa una intención única de crear pedido, asociada a comercio, clave de idempotencia, huella del contenido canónico, resultado y pedido correspondiente cuando fue creado.

**Invariantes:**

- Para un comercio y clave, una misma intención crea como máximo **un** pedido.
- La repetición de la misma clave y exactamente el mismo contenido devuelve el resultado existente, incluso si la respuesta original se perdió.
- La misma clave con contenido diferente es conflicto, no una nueva compra.
- La ventana de recuperación garantizada es de al menos **72 horas**. Vencida, no se promete deduplicación automática ilimitada.
- Las decisiones de concurrencia se resuelven en base de datos/transacción, nunca solo deshabilitando el botón de React.

### 3.7 Seguimiento y handoff de WhatsApp

**Seguimiento:** token de alta entropía entregado en la confirmación y persistido solo como hash; revocable; acceso hasta 180 días después de terminar el pedido, salvo revocación u obligación distinta.

**Handoff:** dato técnico de intento de apertura/copia de WhatsApp asociado al pedido, no estado de la orden.

**Invariantes:**

- Se muestra la confirmación web y el enlace de seguimiento **antes** de ofrecer contacto por WhatsApp.
- Fallo del handoff no revierte ni duplica el pedido.
- Un intento de apertura jamás se llama `message_sent` o `delivered`.
- El mensaje puede incluir identificador público, líneas, total, modalidad y referencia comercial; no incluye el token de seguimiento ni credenciales, y evita datos personales innecesarios.
- El seguimiento público muestra estado y resumen minimizado, nunca dirección residencial, notas privadas ni teléfono completo.
- Sin token válido, conocer el número público o ID interno no concede acceso.

### 3.8 Suscripción SaaS (P1)

**Suscripción:** comercio, plan, condiciones/versiones contratadas, estado local verificado, referencias externas, fechas e historial de eventos.  
**Derecho de uso (`entitlement`):** resultado de reglas sobre plan, período de prueba, mora, suspensión y límites.

**Invariantes:**

- Un redirect de pago o un payload sin verificar jamás habilita un plan pago.
- Webhooks repetidos o desordenados no aplican estado obsoleto.
- La mora puede bloquear nuevas capacidades/checkout tras gracia, pero **no** elimina pedidos ni datos históricos.
- Facturación de la plataforma no equivale a pagar un pedido de la tienda.
- Precios/condiciones de un contrato no se reescriben por editar el catálogo de planes.

### 3.9 Propuesta de IA (P1)

**Propuesta:** comercio propietario, fuente ingresada, tipo, estado, resultado estructurado provisional, consumo/costo estimado y aprobación.  
**Estados sugeridos:** `queued` → `running` → `draft` → `applied`; alternativas `failed` y `cancelled`.

**Invariantes:**

- La IA no es autoridad para definir precios reales, existencia o disponibilidad.
- Ninguna propuesta se publica o actualiza un producto sin validación y aprobación explícita del usuario autorizado.
- Reintentos, jobs repetidos y respuestas tardías no aplican dos veces ni reviven una cancelación.
- El costo/cuota se asocia al comercio, nunca se carga silenciosamente fuera del presupuesto permitido.

## 4. Máquinas de estados

### 4.1 Comercio

```text
draft --(publicar con requisitos)--> published
published --(pausar)-----------> paused
paused --(reanudar validado)----> published
published/paused --(suspensión P1)--> suspended
suspended --(reactivación autorizada P1)--> draft/paused/published*
draft/paused/published --(archivar P1)--> archived
```

`*` El estado de regreso exige nueva validación; nunca recupera permisos automáticamente si perdió requisitos. `draft` no es público. `paused` muestra catálogo pero no recibe pedidos. `suspended`/`archived` restringen superficie pública. Archivar y suspender son P1; no son botones disponibles en P0.

### 4.2 Producto

```text
draft --(publicar con datos válidos)--> published
published --(despublicar)-------> draft
draft/published --(archivar)---> archived
archived --(restaurar validado)-> draft
```

`is_available` cambia independientemente del estado. Restaurar no implica republicar ni reactivar pedidos antiguos.

### 4.3 Pedido

| Origen | Destino permitido | Condición |
|---|---|---|
| `pending` | `confirmed` | Comerciante acepta luego de verificar posibilidad de cumplir. |
| `pending` | `rejected` | Comerciante rechaza; motivo opcional. |
| `pending` | `cancelled` | Comerciante cancela; registra actor y motivo. |
| `confirmed` | `preparing` | Comienza preparación. |
| `preparing` | `ready` | Pedido listo para retiro/coordinación. |
| `ready` | `completed` | Comerciante declara entrega. |
| `confirmed`, `preparing`, `ready` | `cancelled` | Cancelación justificada y auditada. |
| `pending` | `expired` | **Solo P1**, con política opt-in y concurrencia controlada. |

`completed`, `rejected`, `cancelled`, `expired` son terminales. No hay saltos `pending → ready` ni `confirmed → completed` en P0. Dos acciones concurrentes incompatibles no se aplican ambas: una gana y la otra recibe conflicto/estado actual. Un reintento exactamente igual de transición ya aplicada puede devolver estado actual sin duplicar evento.

### 4.4 Suscripción (P1)

Estados conceptuales: `trialing`, `active`, `past_due`, `cancelled`, `suspended`, mapeados desde el proveedor externo verificable. Los derechos de uso se evalúan separadamente del estado de tienda.

## 5. Value objects y políticas compartidas

- **Money:** importe entero no negativo + código de moneda; operaciones solo entre mismas monedas; redondeos definidos cuando P1 introduzca descuentos/opciones.
- **Phone:** contacto normalizado a formato internacional; formato válido no verifica titularidad.
- **BusinessHours:** zona horaria y tramos válidos sin superposición; por defecto no acepta nuevos pedidos fuera del horario, salvo opt-in.
- **Fulfillment:** `pickup` o `delivery`, datos mínimos para cada tipo; envío con tarifa fija y cobertura declarativa P0.
- **ProductSelection:** referencia a producto del mismo comercio + cantidad válida, no contiene precio de autoridad.
- **OrderQuote:** desglose autoritativo, versión/vigencia, sin garantía de stock reservado.
- **TrackingSecret:** aleatorio, no enumerable, solo hash persistido; revocable y con vigencia.
- **ActorContext:** identidad autenticada y comercio autorizado, o comprador invitado limitado por token.

## 6. Reglas transversales y excepciones

1. **Aislamiento:** cada lectura y mutación debe comprobar contexto de comercio. Recursos ajenos no se revelan; errores HTTP distinguibles solo cuando sea seguro.
2. **Concurrencia:** transiciones y modificaciones sensibles impiden sobrescribir estado por versiones obsoletas; idempotencia y restricciones deben resistir requests paralelos.
3. **Autoridad del servidor:** nunca se aceptan desde React como verdad el `tenant_id`, rol, estado, totales, precios o permisos.
4. **Consistencia histórica:** eliminar u ocultar productos y cambiar sus precios no altera pedidos previos.
5. **Efectos externos:** avisos por correo y WhatsApp no forman parte de la transacción del pedido; fallan de forma recuperable.
6. **Privacidad:** datos personales minimizados en páginas públicas, enlaces, trazas y logs; el contacto legítimo del comprador solo visible a operadores autorizados.
7. **No pérdida silenciosa:** un cambio significativo de precio exige reconfirmar; una transición inválida no es aceptada de forma parcial.
8. **Auditoría:** toda transición de pedido y operación de seguridad significativa deja evidencia del actor, instante y operación; su persistencia crítica es atómica con la mutación.
9. **Estados de error:** fallos de tercero o desconexiones no se convierten en confirmación de pedido, envío o pago ficticios.
10. **Datos retenidos:** órdenes terminales se conservan operativamente 24 meses como default, con mecanismos P1 de supresión/anonimización y excepciones legales. Archivar una tienda no equivale a borrar registros.

## 7. Escenarios que definen el modelo

- **Precio cambiado:** carrito muestra 10.000, producto pasa a 12.000 antes del checkout → nueva cotización visible, sin pedido hasta aceptación explícita.
- **Doble solicitud:** el navegador repite simultáneamente la misma intención → exactamente una orden y un evento de creación.
- **Respuesta perdida:** base confirma la orden, se corta la red → el comprador recupera esa orden dentro de 72 horas usando la misma clave.
- **Cambio de tienda:** un propietario de A solicita un producto de B → rechazo sin revelar detalles de B.
- **Producto archivado:** una orden vieja sigue mostrando el nombre y precio que tenía al comprar.
- **WhatsApp cerrado sin envío:** pedido registrado en `pending`; sin marca de mensaje entregado.
- **Confirmación simultánea y rechazo:** solo una transición válida, la otra devuelve conflicto.
- **Tienda pausada en otro dispositivo:** carrito conserva selecciones, pero ningún nuevo pedido se acepta.
- **Suscripción vencida (P1):** no se crean nuevos pedidos tras gracia, pero se consultan/gestionan los históricos.
- **IA caída (P1):** el comerciante continúa con carga manual y sus propuestas quedan pendientes/fallidas sin productos fantasmas.

## 8. Fuera del dominio P0 (no anticipar soluciones)

No hay cuentas de compradores, inventario/reservas, estado de pago, procesamiento de cobros de compradores, descuentos/cupones, repartidores, logística externa, devoluciones contables, chat bidireccional automático, dominios personalizados, ni generación autónoma de catálogo sin aprobación. Si se incorporan en P1/P2, requieren sus propios modelos y reglas; no deben simularse mediante flags dentro de `Order.status`.
