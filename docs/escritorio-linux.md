# Erlen Slides para escritorio Linux

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

La aplicación de escritorio y el navegador tienen bibliotecas separadas. No se borran ni trasladan automáticamente. Para usar una presentación anterior, expórtala desde su biblioteca como proyecto JSON y ábrela en el escritorio; conserva el original y tus respaldos. El guardado local de la aplicación sigue usando el almacenamiento de su WebView, por lo que conviene mantener copias JSON fuera de ese almacenamiento.

En **Archivo → Exportar → Proyecto (.json)**, el escritorio muestra el selector de archivos del sistema. Rust valida el JSON y guarda una copia temporal en la misma carpeta antes de sustituir el destino. Cancelar no escribe nada y un error se comunica sin sustituir el archivo anterior. Se permite un guardado a la vez en cada instancia; si se modifica la presentación mientras está abierto el selector, se advierte que la copia no incluye los cambios posteriores. En Linux las copias JSON se crean con permisos privados para su propietario (`0600`), también al reemplazar un archivo; si necesitas compartirlas puedes cambiar sus permisos después. La descarga del navegador mantiene su comportamiento habitual.

El editor y sus herramientas científicas siguen ejecutándose en el WebView; la escritura de proyectos es la primera operación llevada al núcleo Rust. Las advertencias de importación, exportación y accesibilidad de la versión web siguen aplicando. No se incluyen cuentas, telemetría ni un servicio de sincronización.

El editor genera estilos durante la edición y para la impresión. En escritorio, la política de contenido permite esos estilos dinámicos; los scripts y las conexiones siguen sujetos a las restricciones configuradas en Tauri. Los enlaces web se abren mediante `xdg-open` en el navegador del sistema.
