# Administración de usuarios

La ruta `/users` conserva el módulo `features/users/pages/users-list` y presenta Usuarios, Roles, Permisos y EAIM. Usa Reactive Forms, el HttpClient configurado, la URL de environment y el interceptor JWT existente. No hay nombres de roles usados para autorización en el frontend.

## Acceso y comportamiento

`GET /api/Auth/me` obtiene permisos efectivos. Usuarios, roles y permisos requieren `users.manage`; administrar EAIM requiere `catalogs.manage`. Un usuario externo no accede a la administración global. El backend sigue siendo la autoridad de seguridad.

Usuarios tiene paginación de 12 registros, búsqueda y filtros de EAIM, rol y clasificación; excluye inactivos por defecto. Incluye detalle administrativo con metadatos de acceso. Crear envía usuario, contraseña y roles en una operación. Editar perfil y reemplazar roles son operaciones separadas para evitar presentar cambios parciales como una única operación exitosa. El formulario nunca reenvía contraseñas o roles en una edición de perfil.

Los catálogos muestran solo registros activos. Roles permite seleccionar varios permisos existentes; el catálogo proviene del servidor. Los códigos de permisos son contratos de operaciones: un nuevo código no implementa una operación nueva; cambiar un código usado puede retirar acceso. DELETE requiere confirmación y representa desactivación lógica; no borra las relaciones históricas. No se incluyen operaciones de reactivación inexistentes en la API.

Formularios y registros se muestran en una columna en móvil, con controles táctiles de al menos 44 px, contenido que puede partir palabras y diálogo nativo modal con foco gestionado por el navegador. Los formularios aumentan a dos columnas desde 600 px; las tarjetas a dos desde 900 px y tres desde 1400 px. Guardados pendientes bloquean envíos repetidos; errores no cierran el formulario. Si el catálogo de permisos no carga, no se puede guardar un rol con permisos accidentalmente vacíos.

## Contratos utilizados

1. Usuario: GET/POST `/api/User`, GET/PUT/DELETE `/api/User/{id}`, GET `/api/User/form-options`, PUT `/api/User/{id}/roles`.
2. EAIM existente: GET/POST `/api/Eaim`, GET/PUT/DELETE `/api/Eaim/{id}`.
3. Backend complementario necesario: GET/POST `/api/Roles`, GET/PUT/DELETE `/api/Roles/{id}`; GET/POST `/api/Permission`, GET/PUT/DELETE `/api/Permission/{id}`.
4. Rol: `{ name, description, permissionIds }`. Permiso: `{ code, description }`. Las respuestas de catálogos usan `{ data }`, mientras usuarios conserva `{ rows, page, totalPages, totalCount }`.

Los endpoints de roles y permisos no existían al comenzar esta integración. El cambio complementario está en la rama backend `feature/users-admin-catalogs`, usando entidades y tablas existentes, sin cambio de esquema ni migración nueva. Debe desplegarse para que esas dos secciones funcionen. No se modifican endpoints existentes de usuarios ni EAIM.

## Verificación

- `npm run build`.
- `npm test -- --watch=false --include='src/app/features/users/**/*.spec.ts'`: 13 pruebas del componente y sus contratos HTTP.
- Navegador Chromium con respuestas API interceptadas: creación de usuarios, edición independiente de roles, detalle, creación/edición de los tres catálogos y confirmación/desactivación, con tamaños 320, 375, 768 y 1440 px; comprobar ausencia de desbordamiento horizontal.
- La suite general presenta 8 fallos que se reproducen en `origin/main` antes de estos cambios; corresponden a App, Delivery, DeliveryEdit, DeliveryNew e Incidents. No se modifican esas pruebas ni funcionalidades en este trabajo.
- La validación final con el SQL Server y credenciales reales del entorno local debe realizarse tras desplegar el complemento backend. No se realizaron escrituras en una base real desde este entorno.
