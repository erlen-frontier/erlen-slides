# Tabula para escritorio Linux

La aplicación usa Tauri 2 y el WebView del sistema. El editor, los ejemplos y las bibliotecas científicas se empaquetan localmente. La instalación de la app no necesita ejecutar Node; Node y Rust se usan al construirla desde el código.

## Construir y ejecutar

Necesitas Node.js 22 o superior, npm, Rust y las dependencias de desarrollo de Tauri para Linux, incluidas GTK 3 y WebKitGTK 4.1. En Debian o Ubuntu, consulta los nombres vigentes en los [requisitos de Tauri](https://v2.tauri.app/start/prerequisites/). En Debian 13, los paquetes principales son `build-essential`, `libwebkit2gtk-4.1-dev` y `libgtk-3-dev`.

```sh
npm ci
npm run test:rust
npm run desktop:dev
```

Para construir el ejecutable y el paquete Debian:

```sh
npm run desktop:build
```

Con la configuración de Cargo por defecto, el paquete se escribe en `target/release/bundle/deb/`. Compilar no instala ni publica el programa. Linux es la primera plataforma de esta etapa; no se afirma compatibilidad verificada con Windows o macOS.

## Presentaciones y privacidad

La aplicación de escritorio y el navegador tienen bibliotecas separadas. No se borran ni trasladan automáticamente. Para usar una presentación anterior, expórtala desde su biblioteca como proyecto JSON y ábrela en el escritorio; conserva el original y tus respaldos. La biblioteca, el autoguardado y la recuperación siguen usando el almacenamiento del WebView, independiente de los archivos guardados en disco.

El nombre visible es Tabula. Se conservan el identificador de escritorio y las claves de almacenamiento de Erlen Slides para mantener accesible la biblioteca de la misma instalación; el nombre nuevo no cambia el formato JSON.

**Abrir proyecto (.json)** en Inicio o **Archivo → Abrir proyecto** (Ctrl+O) selecciona un archivo de Tabula y lo abre para editar. **Archivo → Guardar** (Ctrl+S) actualiza ese archivo; si aún no hay uno, pregunta dónde crearlo. **Guardar como** (Ctrl+Mayús+S) elige otro destino. El indicador distingue «Archivo guardado» de «Cambios sin guardar» y de la copia que solo vive en Tabula. La escritura del archivo se hace al guardar, no durante el autoguardado local.

Rust valida el JSON y guarda una copia temporal en la misma carpeta antes de sustituir el destino. Cancelar no escribe nada y un error se comunica sin sustituir el archivo anterior. Si el archivo cambia o se elimina fuera de Tabula, Guardar avisa y conserva ambos estados: usa Guardar como para elegir un destino. Si editas mientras está abierto un selector, los cambios posteriores quedan pendientes. Al cambiar de presentación o cerrar con cambios pendientes se solicita confirmación. El control de cambios externos no bloquea escrituras simultáneas de otras aplicaciones.

La referencia al archivo solo dura mientras esa presentación está abierta en la sesión; al reiniciar o recuperar una copia de la biblioteca vuelve a abrir el archivo o usa Guardar como. Se admiten proyectos de hasta 128 MiB en este flujo. En Linux los archivos JSON escritos por Tabula se crean con permisos privados para su propietario (`0600`), también al reemplazar un archivo; si necesitas compartirlos puedes cambiar sus permisos después. Archivo → Exportar → Proyecto (.json) sigue disponible para guardar una copia sin cambiar el archivo abierto. La versión web mantiene su comportamiento habitual.

El editor y sus herramientas científicas siguen ejecutándose en el WebView; la lectura, la escritura y la detección de cambios externos de archivos de proyecto se realizan en Rust. Las advertencias de importación, exportación y accesibilidad de la versión web siguen aplicando. No se incluyen cuentas, telemetría ni un servicio de sincronización.

El chat de IA es optativo y requiere un servicio en la nube compatible con Chat Completions y llamadas de herramientas. La conexión de escritorio se realiza mediante Rust por HTTPS, con límite de tamaño y sin seguir redirecciones. La clave y dirección elegidas permanecen en la memoria de la sesión. Cancelar intenta detener la petición local y evita aplicar la respuesta; el proveedor puede haber recibido ya la solicitud y aplicar sus tarifas.

El editor genera estilos durante la edición y para la impresión. En escritorio, la política de contenido permite esos estilos dinámicos; los scripts y las conexiones siguen sujetos a las restricciones configuradas en Tauri. Los enlaces web se abren mediante `xdg-open` en el navegador del sistema.
