# PRODUCT.md — Plataforma SaaS de tiendas y pedidos por WhatsApp

**Estado:** especificación de producto acordada (baseline v1)  
**Fecha:** 2026-11-01  
**Documentos relacionados:** [DOMAIN.md](DOMAIN.md) · [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) · [feature_list.json](../../feature_list.json)

## 1. Visión y problema

Construir un SaaS para que comercios pequeños creen y operen una tienda online propia, exhiban un catálogo y reciban pedidos ordenados sin depender de largas conversaciones para definir productos, cantidades, precios y modalidad de entrega. El canal de contacto/cierre inicial es WhatsApp, pero **el pedido se registra primero en nuestro sistema**.

El comprador no necesita una cuenta. Cada comercio tiene una tienda pública independiente y un panel privado. La plataforma cobra al comercio por el servicio en la etapa comercial; **no cobra comisiones sobre las ventas** y, en el alcance inicial, no procesa pagos del comprador.

La plataforma no es un marketplace centralizado, un servicio de repartidores ni un sistema de contabilidad. El valor está en hacer sencilla la digitalización y la operación de pedidos de un negocio de barrio.

## 2. Objetivos del producto

1. Que un comerciante no técnico pueda configurar, publicar y compartir su tienda.
2. Que un comprador seleccione productos y modalidades sin pedir un catálogo por chat.
3. Que un pedido quede registrado de forma consistente y recuperable **antes** de ofrecer abrir WhatsApp.
4. Que el comerciante vea, contacte, confirme y gestione pedidos desde su panel.
5. Que cada negocio y sus datos permanezcan aislados de los demás.
6. Que la plataforma pueda prestar el servicio a muchos comercios con el mismo producto, sin instalaciones particulares.
7. En la V1 comercial, monetizar mediante suscripción fija y reducir esfuerzo de carga de catálogo con IA supervisada.

## 3. Alcance y prioridad

- **P0 / MVP piloto:** alta de usuario/comercio, configuración y publicación, catálogo simple, tienda pública, carrito invitado, cotización, pedido persistido e idempotente, WhatsApp manual, bandeja, estados, enlace de seguimiento, seguridad, auditoría y operación básica. El piloto permite habilitación manual del comercio sin cobro recurrente automatizado.
- **P1 / V1 comercial:** suscripciones y planes, colaboradores, administración global, importación y asistencia de IA, exportaciones/reportes, gestión de datos, avisos automáticos opcionales, variantes/extras y mejoras de operación.
- **P2 / evolución explícitamente postergada:** checkout con pago del comprador, integración de cuentas del comercio para cobrar, promociones/cupones, inventario avanzado/reservas, dominios personalizados y subdominios, marketplace, apps móviles nativas, logística propia, temas visuales avanzados y agentes que venden autónomamente.

Las etiquetas son prioridad y alcance, **no** estimaciones de duración. Una primera prueba vertical puede cubrir menos capacidades que todo P0, pero ninguna tienda real debe operar sin los controles P0 correspondientes a lo que se habilite.

## 4. Actores

| Actor | Capacidades y límites |
|---|---|
| Visitante | Navega tiendas y productos públicos. |
| Comprador invitado | Mantiene carrito por comercio, registra pedido, inicia contacto en WhatsApp y consulta estado por enlace seguro. No inicia sesión. |
| Propietario (`owner`) | Configura y opera el comercio, publica la tienda y administra pedidos. Único rol de comercio del MVP. |
| Operador (`operator`, P1) | Gestiona catálogo y pedidos, sin acceder a propiedad, accesos ni suscripción. |
| Administrador de plataforma (`platform_admin`, P1) | Gestiona la operación global bajo permisos y auditoría específicos; no se confunde con un propietario. |
| Sistema | Ejecuta notificaciones, reintentos, alertas y reconciliaciones. |
| Proveedores externos | Correo, generación con IA, eventual facturación recurrente; WhatsApp es solo apertura de enlace en P0. |

Un usuario puede ser propietario o miembro de más de un comercio. Una membresía en A jamás concede acceso a B.

## 5. Experiencia principal del comerciante (P0)

1. Se registra, verifica su email e inicia sesión.
2. Crea un comercio en estado borrador y se convierte en su propietario.
3. Completa identidad pública, logo/colores acotados, número de WhatsApp, horarios y política fuera de horario, retiro y/o reparto local.
4. Crea categorías planas y productos simples con nombre, descripción, precio, imágenes, publicación y disponibilidad manual.
5. Un checklist indica requisitos faltantes. Publica cuando tiene correo verificado, información mínima, WhatsApp válido, horario configurado, al menos un método de entrega y un producto publicable disponible.
6. Comparte la URL pública `/tienda/{slug}`.
7. Ve en su bandeja los pedidos nuevos aun si ningún mensaje fue enviado por WhatsApp, consulta contacto/dirección cuando corresponde, y opera estados.
8. Puede pausar o reanudar la tienda; una pausa bloquea **pedidos nuevos** sin borrar historial y deja visible el catálogo con aviso.

**Modo inicial de negocio:** enfocado en comercios de comida preparada/rotiserías para el piloto; el sistema sigue siendo genérico. Productos con variantes, sabores obligatorios o extras con precios propios no forman parte de P0: se admiten productos simples y observaciones, pero no se presenta una observación como mecanismo fiable de cobrar extras.

## 6. Experiencia del comprador (P0)

1. Visita una tienda publicada; puede explorar y buscar productos, precios y disponibilidad.
2. Agrega productos y cantidades a un carrito separado por tienda; el carrito se conserva localmente si el navegador lo permite.
3. Elige `pickup` o `delivery`; para reparto carga dirección y visualiza una **tarifa fija** y cobertura descriptiva. El comercio confirma posteriormente si puede cubrirla.
4. Completa nombre, teléfono, notas y aceptación de la información de privacidad; no crea cuenta.
5. El servidor recalcula el pedido con productos y tarifas vigentes. Ante diferencias de precio o disponibilidad, el comprador corrige y **vuelve a confirmar**; nunca se confirma con un importe implícitamente cambiado.
6. Al confirmar, el sistema persiste un **único** pedido `pending`, ítems históricos, totales y registro de auditoría. Devuelve número público y enlace seguro de seguimiento.
7. **Primero** aparece la confirmación dentro de nuestra web; **después**, por acción explícita del comprador, puede abrir WhatsApp con un mensaje preparado, repetir la acción o copiar mensaje/teléfono.
8. La apertura de WhatsApp no certifica que se haya enviado, leído ni aceptado un mensaje. Si WhatsApp falla, el pedido sigue registrado.
9. El comprador revisa el estado mediante su enlace; en P0 no recibe mensajes automáticos de WhatsApp ni cancela directamente desde la web: contacta al comercio.

Mostrar siempre que el pedido y la disponibilidad están **sujetos a confirmación del comercio**. `completed` significa entregado según declaración del comercio, no pago verificado.

## 7. Gestión del pedido (P0)

El pedido comienza en `pending`. El propietario puede:

- Confirmarlo tras verificar disponibilidad y cobertura; o rechazarlo mientras está pendiente.
- Pasarlo secuencialmente a `preparing`, `ready` y `completed`.
- Cancelarlo desde `pending`, `confirmed`, `preparing` o `ready`, registrando motivo y actor; nunca modificar un pedido terminal.
- Contactar manualmente al comprador desde el panel.
- Consultar la línea de tiempo de transiciones.

**No** puede modificar silenciosamente precio, cantidad o cargo de entrega de un pedido ya registrado. Si hay discrepancia comercial se coordina externamente; en P1 habrá procedimiento trazable para nuevo acuerdo, sin reescribir el pedido original.

Un pedido `pending` **no expira automáticamente** en P0. No se reserva ni descuenta stock cuantitativo. Se puede marcar manualmente un producto como no disponible; las órdenes existentes no cambian por ello.

## 8. Configuración comercial y límites iniciales

| Tema | Comportamiento definido |
|---|---|
| Horarios | Por defecto no se reciben pedidos fuera de horario. El propietario puede habilitarlos expresamente y mostrar advertencia. |
| Entrega | Retiro o reparto local, al menos uno habilitado. Reparto: costo fijo y cobertura en texto; sin cálculo geográfico automático. |
| Cobros | Efectivo/transferencia pueden coordinarse fuera de la plataforma; no hay estado de pago verificado. |
| Catálogo | Categorías planas y productos simples. Precio no negativo en moneda del comercio; piloto en ARS. |
| Personalización | Una plantilla responsive; logo, nombre, descripción y paleta limitada; sin editor visual. |
| Cantidades | Límite inicial de 20 unidades por línea y 50 líneas por carrito; mensajes claros y controles de abuso. |
| Imágenes | Máximo 8 por producto, 5 MiB por archivo; validación real del contenido y optimización. |
| Publicación | El catálogo público se ve mientras la tienda está `published` o `paused`; `draft`, `suspended` y `archived` no exponen datos privados. |
| Orden pendiente | No vencimiento automático P0; avisos de antigüedad y política opt-in en P1. |
| Enlace de seguimiento | Token aleatorio revocable; activo durante la operación y hasta 180 días después del estado terminal, salvo revocación o obligación legal específica. |
| Idempotencia checkout | La misma intención se deduplica durante al menos 72 horas; repetir clave con diferente contenido se rechaza. |
| Piloto | Activación manual sin integración de cobro; Billing automatizado en P1. |

Los límites numéricos son **defaults de producto iniciales** y podrán revisarse a partir del piloto, sin modificar reglas históricas de pedidos.

## 9. Capacidades P1, sin confundirlas con MVP

- **Colaboración:** invitar operadores, aceptar invitaciones, revocar accesos y proteger la propiedad del comercio. Un propietario inicial; nunca dejar un comercio sin propietario.
- **Suscripciones SaaS:** planes y límites visibles, prueba o activación promocional, contratación/cambio, webhook validado e idempotente, mora, gracia, reactivación y consulta de cobros. El estado de suscripción y el estado de la tienda son distintos. La mora puede impedir pedidos nuevos, **no** borrar pedidos ni bloquear la recuperación de datos.
- **IA asistida:** proponer estructura de tienda, extraer productos desde texto/archivo/imagen, sugerir categorías y descripciones, revisar y aprobar propuestas, controlar cuotas/costos, reintentar/cancelar tareas. Nunca inventar precios como hechos, ni publicar sin aprobación.
- **Operación:** CSV de catálogo, variantes/extras, exportación y filtrado de pedidos, notas internas, detección de pendientes antiguos, resumen operativo, avisos automáticos consentidos y soporte/admin auditado.
- **Privacidad y datos:** exportación, anonimización/supresión con verificación de autoridad, retención y excepciones exigidas por norma aplicable. Política operativa inicial de retención de pedidos de 24 meses tras estado terminal, salvo obligaciones superiores o solicitudes válidas de supresión.

## 10. Reglas de error y recuperación observables

| Situación | Resultado esperado |
|---|---|
| Producto retirado, no disponible o de otro comercio | No se crea pedido; se identifica la línea corregible sin filtrar datos ajenos. |
| Precio o tarifa cambiados entre carrito y confirmación | Se muestra nueva cotización y se solicita reconfirmación explícita. |
| Tienda cerrada, pausada, suspendida o sin modalidad válida | No se crean pedidos; se conserva el carrito para reintento. |
| Compra repetida/doble clic/timeout después del guardado | Un solo pedido; se recupera el resultado con la clave idempotente. |
| Error antes del guardado | Ninguna orden parcial; posibilidad de reintentar sin duplicar. |
| WhatsApp no disponible o mensaje no enviado | Orden registrada y accesible; copiar/reintentar contacto sin crear otra orden. |
| Correo de aviso falla | La bandeja conserva el pedido; aviso secundario reintentable. |
| Comerciante intenta cambio de estado inválido o concurrente | Se rechaza con el estado vigente y se solicita actualizar vista. |
| Acceso cruzado o rol insuficiente | Denegación desde servidor sin exponer información privada. |
| IA o facturación externa fuera de servicio | No corromper pedidos ni fingir publicación/pago exitoso. |

## 11. Medición del piloto y riesgos por validar

Medir, por comercio y con datos minimizados: alta → configuración → publicación, productos publicados, visitas a tienda, carritos iniciados, cotizaciones, pedidos registrados, pedidos confirmados/completados declarados, rechazos, abandono, consultas al seguimiento, aperturas *solicitadas* de WhatsApp, tiempo hasta primera confirmación y uso del panel.

**No medir como comprobado:** mensajes de WhatsApp enviados/leídos, ingresos cobrados, ventas efectivas ni stock real. Una apertura de enlace puede ser solo una intención.

Hipótesis a validar: el comerciante mantiene precios, usa una segunda bandeja además de WhatsApp, acepta gestionar estados, elige una suscripción por el valor recibido y la carga inicial/soporte son sostenibles. La elección inicial de rotiserías se revisará si las variantes obligatorias bloquean la adopción.

## 12. Condiciones para considerar completo el producto P0

- Dos comercios pueden operar a la vez sin fugas de datos en panel, tienda pública, archivos, jobs o consultas.
- Un comprador invitado completa de punta a punta carrito → cotización → pedido persistido → confirmación web → WhatsApp manual → seguimiento.
- Los reintentos no duplican pedidos; los cambios de precio no se aceptan silenciosamente.
- Un propietario gestiona estados con transiciones válidas y trazabilidad.
- La tienda pública funciona correctamente en móvil, permite navegación accesible y no expone borradores ni datos sensibles.
- Existen procesos verificables de recuperación, backups, protección de datos y manejo de errores.
- Los recorridos críticos pasan las pruebas TDD, de integración PostgreSQL y de navegador Playwright en CI.

**Fuente funcional de detalle:** la especificación previa de casos de uso fue consolidada por comportamiento en [feature_list.json](../../feature_list.json). Este archivo es la referencia de intención y alcance de producto, no un listado de tareas técnicas.
