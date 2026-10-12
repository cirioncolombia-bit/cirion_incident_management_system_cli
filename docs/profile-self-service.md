# Perfil propio y visualización de la cuenta

## Comportamiento

Mi perfil muestra la información del usuario autenticado: nombres y apellidos, correo, área, clasificación, EAIM, roles y permisos efectivos, estado y fechas/auditoría de cuenta y metadatos de acceso. No se exponen hashes ni contraseñas almacenadas.

Se pueden editar exclusivamente nombres, apellidos, correo y área. Roles, permisos, clasificación, EAIM y estado son de solo lectura; se administran desde Usuarios con la autorización existente. El cambio de contraseña usa contraseña actual, nueva y confirmación; la confirmación es una validación del cliente, sin añadir una política de complejidad no acordada.

La cuenta ya existe al iniciar sesión: el perfil usa consulta y actualización del usuario propio, sin duplicar creación de usuarios ni incorporar baja de cuenta.

El encabezado de bienvenida, nombre, iniciales y roles del menú y sidebar usan el usuario real, sin datos de ejemplo. AuthService conserva una única identidad en memoria y comparte el GET inicial entre layout y perfil. Al guardar nombres/área se actualizan inmediatamente esos datos visibles. Al salir, expirar sesión o iniciar otra se limpia la identidad; una respuesta pendiente de otra sesión no reemplaza la cuenta actual.

Cambiar correo o contraseña invalida las sesiones anteriores según el comportamiento del backend existente. Tras el éxito se limpia la sesión y se muestra en login un mensaje para volver a autenticarse. Los errores de contraseña actual no cierran sesión ni se presentan como éxito. Se conservan los mensajes y el indicador global de espera de la aplicación.

## Backend necesario

Reutiliza AuthController y CredentialsService:

1. GET /api/Auth/me: amplía el DTO de manera aditiva con campos personales, área y auditoría; mantiene datos de roles/permisos existentes.
2. PUT /api/Auth/me: recibe solo firstName, secondName, firstSurname, secondSurname, email y areaId. El sujeto JWT identifica tanto al usuario objetivo como al actor; no admite un ID ajeno ni campos de acceso. Valida nombres, email único incluso contra inactivos y área activa.
3. GET /api/Auth/profile-options: devuelve áreas activas para el formulario propio, sin usar el endpoint administrativo users.manage.
4. POST /api/Auth/change-password: se conserva sin cambios de contrato.

Todos los endpoints requieren sesión vigente, aunque el usuario no tenga permisos administrativos. La autorización administrativa de /api/User no se modifica. El backend ignora campos extra de acceso enviados en el DTO propio y no cambia roles, EAIM, clasificación, IsActive o hash mediante PUT me.

No se crean nuevos controladores, entidades ni columnas. No requiere migración. El complemento backend está en feature/profile-self-service del repositorio backend y debe desplegarse antes del frontend de la misma rama.

## Verificación

- Frontend: npm run build y 20 pruebas de perfil/estado de identidad/expiración de sesiones aprobadas.
- Backend: compilación y 108 pruebas focalizadas aprobadas. Incluye modificación del perfil sin permisos administrativos, rechazo de duplicados/área inactiva, invalidación por email y preservación de campos de acceso ante un cuerpo manipulado.
- Filtro MVC: perfil propio accesible con sesión válida incluso externa sin grants; actualización administrativa sigue rechazada. Swagger expone los contratos y el acceso anónimo recibe 401.
- EF no tiene cambios de modelo pendientes; no se genera una migración.
- Chromium con respuestas API interceptadas: cuenta Pruebas, un solo GET para layout/perfil, actualización inmediata del encabezado, campos de acceso sin controles, cambio de contraseña correcto/incorrecto y cambio de email con retorno a login. Tamaños 320, 375, 768 y 1440 px sin desbordamiento.

La persistencia/rollback real en SQL Server queda pendiente de validación local. No se ejecutó SQL ni se crearon commits o PR en esta implementación.
