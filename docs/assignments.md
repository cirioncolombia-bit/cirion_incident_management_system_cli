# Asignaciones

1. El módulo `/assignments` permite listar, consultar, crear, editar y desactivar asignaciones. Usa `assignments.read` y `assignments.write`, obtenidos del usuario autenticado. Los roles y permisos existentes se reutilizan.
2. La creación consulta un Delivery por ID y muestra Workorder/DKO, cliente, ciudad y nodo. La GCO depende del nodo; los puertos se consultan con paginación y muestran FiberTray, equipo y estado. No se unen Conduits, evitando multiplicar puertos.
3. El estado y el nombre del equipo se guardan junto con la asignación. Un nombre vacío deja el puerto sin equipo. El backend reutiliza un equipo activo con ese nombre o crea uno; no renombra equipos compartidos. Los catálogos vienen del backend.
4. Editar o desactivar no libera ni modifica el puerto anterior. Solo el puerto seleccionado se actualiza al guardar. Los puertos en uso siguen siendo seleccionables; no se agregó una regla de exclusividad.
5. Los registros anteriores sin Delivery continúan consultables para usuarios internos y requieren vincular un Delivery al editarlos. Los usuarios externos solo acceden a asignaciones vinculadas a su EAIM.
6. El servicio usa `/api/Assignment`, sus recursos `form-options`, `deliveries/{id}` y `deliveries/{id}/gcos/{gcoId}/ports`. Los cambios envían versiones del puerto y de la asignación; un conflicto requiere actualizar y revisar la información antes de guardar.

## Verificación

`npm run build`

`npm test -- --watch=false --include='src/app/features/incidents/assignments/**/*.spec.ts'`

Se verificó el CRUD en Chromium con API simulada a 320, 375, 768 y 1440 px. La validación contra SQL Server requiere aplicar primero la migración del backend.
