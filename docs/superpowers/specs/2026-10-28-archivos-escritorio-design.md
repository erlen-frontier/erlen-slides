# Proyectos de escritorio

## Objetivo

En Linux, abrir un JSON de Tabula y volver a guardar en ese mismo archivo con Ctrl+S, o elegir otro destino con Guardar como. La biblioteca, el autoguardado y la recuperación existentes continúan disponibles. El formato JSON v1 y los datos científicos se conservan.

## Diseño

El diálogo nativo selecciona el archivo; Rust mantiene una referencia opaca temporal y no acepta rutas proporcionadas por el WebView. Abrir valida tamaño, UTF-8 y JSON; el editor aplica sus validaciones habituales. Guardar escribe una copia temporal y la reemplaza solo después de validarla. Una huella detecta cambios externos y evita sobrescribirlos; ante conflicto se ofrece Guardar como. No se escriben cambios en disco sin una orden de guardar.

La interfaz distingue el guardado local del archivo en disco y señala los cambios pendientes, incluidos los que llegan mientras un diálogo está abierto. Al cambiar de proyecto o cerrar se pide confirmar si hay cambios pendientes en disco. Cancelar, abrir un archivo inválido y los errores dejan intacto el documento actual. Si el archivo necesita ajustes al abrirlo, se informa y se conserva el original hasta una acción de guardado explícita. Las referencias de archivos duran solo la sesión; al recuperar desde la biblioteca se elige el archivo de nuevo.

## Alternativas y límites

La descarga JSON actual sigue disponible para copias; utilizarla como único guardado no permite volver a guardar en el mismo destino. Un permiso permanente del navegador no cubre el WebView de Linux; el diálogo y la escritura pasan por Tauri/Rust. No se promete resolver modificaciones simultáneas en red ni mantener la referencia tras reiniciar. Las comprobaciones incluyen interacciones asíncronas, cierre, recuperación, cancelación, conflictos y datos existentes.
