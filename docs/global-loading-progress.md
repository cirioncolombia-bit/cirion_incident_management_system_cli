# Indicador global de espera

Se agrega el diseño aprobado: panel blanco centrado, círculo azul animado, mensaje «Procesando solicitud…», subtítulo «Espera un momento» y fondo atenuado. Se implementa con CSS, sin imágenes externas ni dependencias nuevas.

1. LoadingService mantiene un contador de solicitudes y devuelve una función de finalización idempotente. Muestra el indicador tras 150 ms para evitar destellos en respuestas rápidas; lo oculta al terminar la última solicitud, sin retrasar artificialmente su finalización.
2. loadingInterceptor se registra antes del interceptor de autenticación existente y cubre todas las solicitudes al API configurado, incluidas lecturas, escrituras, login y archivos. defer cuenta al suscribirse; finalize limpia ante éxito, error o cancelación. Otros recursos no activan el indicador.
3. LoadingProgress se monta una vez junto al router-outlet. Usa un diálogo nativo modal para ocupar la capa superior incluso cuando hay formularios abiertos. El navegador bloquea interacción con el fondo y gestiona el foco. Escape no oculta un progreso mientras hay solicitudes pendientes; los diálogos del formulario y sus errores se conservan.
4. Los estilos se limitan al componente. El panel cabe en pantallas pequeñas, no muestra porcentajes ficticios y respeta prefers-reduced-motion. No se modifica la apariencia de los dropdowns ni el funcionamiento de los módulos.
5. Se conservan mensajes locales de éxito/error y estados propios de los botones. El indicador global solo comunica la espera por HTTP, no una animación de progreso de base de datos independiente.

## Verificación

- npm run build: correcto; conserva avisos de presupuesto CSS existentes de Delivery.
- npm test -- --watch=false --include='src/app/shared/loading/**/*.spec.ts': 12 pruebas aprobadas. Cubre concurrencia, escritura/lectura, respuestas rápidas, errores, cancelación, suscripciones repetidas, recursos ajenos, idempotencia y diálogo.
- Chromium con respuestas API demoradas e interceptadas: tamaños 320, 375, 768 y 1440 px, sin desbordamiento. Comprueba dos lecturas simultáneas, progreso por encima de un formulario modal, Escape, cierre ante error y conservación del formulario. Verifica movimiento reducido.

No se modificó el backend ni se ejecutó SQL. Las pruebas de navegador simulan demoras HTTP; el tiempo de espera real depende del API y del entorno local.
