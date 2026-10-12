# Incidentes: integración frontend

La ruta existente `/incidents` usa el módulo `features/incidents/incidents`. No se cambia Delivery, usuarios, navegación global ni configuración de URL/API.

## Funciones

1. Listado paginado (12 por página), búsqueda y filtros por tipo, estado y responsable. Las etiquetas y opciones proceden de GET /api/Incident/form-options.
2. Crear y actualizar título, descripción, tipo y estado. Al omitir el estado al crear, el backend elige su estado inicial configurado; no se fija un ID ni nombre en el cliente. Después de crear se abre el detalle del ID devuelto, con mensaje de éxito.
3. Detalle enlazable mediante `/incidents?id=1`, organizado en información, responsable, observaciones y archivos. Permite volver al listado conservando filtros durante la sesión de la pantalla.
4. Asignación y actualización del perfil son operaciones separadas para evitar presentar un guardado parcial como una sola operación exitosa. El responsable se selecciona de usuarios activos; null retira la asignación.
5. Agregar observaciones; preservar el texto si el servidor devuelve un error. Las observaciones existentes muestran texto, autor y fecha devueltos por la API.
6. Panel de adjuntos con nombre, tamaño, autor y fecha. Subida multipart, campo file, un archivo por operación. Rechaza archivos vacíos; el servidor sigue siendo la autoridad del límite configurable. Los errores de tamaño no descartan la selección automáticamente.
7. Descargar mediante HttpClient con responseType blob y el interceptor JWT existente. Construye la ruta desde IDs y no utiliza enlaces arbitrarios del servidor; el archivo se descarga con su nombre y se libera el Object URL.
8. Desactivar con confirmación, conservando historia en la base. Requiere el complemento backend feature/incidents-deactivation que agrega DELETE al controlador existente; no necesita una migración nueva.

## Acceso, estados y errores

GET /api/Auth/me proporciona permisos efectivos. incidents.read habilita consultas; incidents.write habilita las modificaciones cuando el usuario también puede consultar el módulo. No se restringe el módulo por EAIM, tipo o nombre de rol. Las cuentas de solo lectura no ven botones ni formularios de modificación; el backend continúa verificando cada operación.

Los formularios validan longitudes y campos requeridos, y bloquean envíos repetidos mientras una operación está pendiente. Se bloquea la edición si los catálogos no cargan. IDs de ruta inválidos no generan peticiones de detalle. Las respuestas tardías de otro incidente no reemplazan el detalle actual. Si se crea el incidente pero falla la navegación, se informa que ya fue creado y se cierra el formulario para evitar reenviar la creación.

Los nombres de tipos y estados, responsables, autores y fechas provienen del servicio. No hay catálogos quemados. Las etiquetas de interfaz y los mensajes de ayuda se presentan en español. Formatos de fecha utilizan DatePipe y configuración de la aplicación existente.

## Mobile first

Tarjetas y secciones de una columna en móvil, controles de al menos 44 px, diálogos nativos con foco modal, textos que pueden partir palabras y nombres de archivo que no expanden la pantalla. Desde 600 px, los formularios adoptan dos columnas; desde 900 px, el detalle divide información/observaciones y responsable/adjuntos en dos columnas. Las tarjetas llegan a tres columnas desde 1400 px. Se revisa ausencia de desbordamiento a 320, 375, 768 y 1440 px.

## Contratos usados

- GET/POST /api/Incident; GET/PUT/DELETE /api/Incident/{id}.
- GET /api/Incident/form-options.
- PUT /api/Incident/{id}/assignment.
- POST /api/Incident/{id}/observations.
- POST /api/Incident/{id}/attachments.
- GET /api/Incident/{id}/attachments/{attachmentId}/content.

La lista de archivos ya está en la respuesta del detalle; no se agrega una consulta redundante al endpoint de metadatos.

## Verificación

- npm run build: correcto, con avisos de presupuesto CSS de Delivery preexistentes.
- npm test -- --watch=false --include='src/app/features/incidents/incidents/**/*.spec.ts': 21 pruebas aprobadas.
- Chromium con API interceptada: creación, edición/estado, asignación, observaciones, subida, descarga, confirmación/desactivación y cuenta de solo lectura. Flujos comprobados a 320, 375, 768 y 1440 px sin desbordamiento ni errores de página; se verifica Authorization Bearer en todas las solicitudes API, incluida la descarga.
- Backend complementario: compilación y 97 pruebas focalizadas aprobadas; DELETE discoverable en Swagger y acceso anónimo rechazado con 401.
- La suite completa presenta 8 fallos fuera de las pruebas de este módulo, en App, Delivery y fixtures existentes. La ejecución aislada de origin/main también presenta 8 fallos; los errores de fixtures compartidos pueden afectar distintos tests según el orden. Se conservan sin cambios.

Las pruebas de navegador usan respuestas simuladas. La verificación con API y SQL Server locales debe hacerse después de desplegar el complemento backend. No se ejecutaron escrituras de base de datos, migraciones, commits ni PR como parte de la implementación.
