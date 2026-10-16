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

## Selección por FiberTray y estado

El formulario sigue Delivery → GCO → FiberTray → puertos. El catálogo de FiberTrays activos de la GCO se obtiene mediante `GET /api/Assignment/deliveries/{deliveryId}/gcos/{gcoId}/fiber-trays`, conservando el alcance del Delivery y su nodo. No se filtran las bandejas por ocupación de sus puertos.

El endpoint de puertos acepta `FiberTrayId` y `StatusId` opcionales. Los filtros se aplican conjuntamente con la GCO y la búsqueda antes del conteo y de la paginación; omitir StatusId muestra todos los estados. El frontend exige seleccionar FiberTray antes de consultar puertos, limpia la selección previa al cambiar filtros y restaura el FiberTray al editar. Los estados provienen del catálogo existente. No requiere cambios de esquema ni otra migración.


### Equipment selection and occupied status

The equipment field offers active equipment associated with ports of the selected FiberTray. Suggestions are searched by name through the scoped equipment endpoint (up to 20 matches; refine the search for more). Users may also enter a new name, preserving the existing equipment creation behavior. Changing the FiberTray clears equipment selection and suggestions.

Status options supplied by the backend include `requiresEquipment`. When true (the database OCUPADO status), equipment is required, whitespace-only input is rejected, and the confirmation dialog cannot open until the field is valid. Other statuses allow a blank name to clear equipment. Deploy the accompanying backend change before this frontend feature.
