# La interfaz, con ejemplos reales de la aplicación

Estas imágenes son capturas de Firefox, tomadas con proyectos didácticos de este repositorio. No son bocetos de funciones futuras.

## Inicio

![Inicio](images/inicio.png)

La navegación organiza Inicio, Mis presentaciones, Ejemplos editables y Recursos. La acción principal crea una presentación vacía; las tarjetas abren copias editables de los ejemplos. El enlace al código y su licencia está en la barra lateral.

## Editor científico

![Editor](images/editor.png)

Arriba, la barra con la marca, el título, el guardado y «Presentar»; debajo, la cinta de herramientas común de la suite («Archivo», Inicio, Insertar, Diseño, Diapositiva, Presentar, Vista y la pestaña del bloque seleccionado). Debajo, de izquierda a derecha: secuencia de diapositivas, lienzo y, cuando lo pides desde la cinta, el panel de detalles. Debajo del lienzo están posición, zoom y vista general. El gráfico del ejemplo conserva sus datos; no es una captura pegada.

## Química y matemáticas

![Química](images/quimica.png)

Las reacciones y ecuaciones se componen tipográficamente. Las tablas permanecen editables. Los supuestos del modelo se explican en la misma presentación.

## Frente a la audiencia

![Modo presentación](images/presentar.png)

El modo de presentación dedica el espacio al contenido, con navegación por teclado, notas y herramientas de exposición.

## Pantalla estrecha

![Editor móvil](images/movil.png)

La cinta se desplaza en horizontal dentro de su franja; el panel de detalles se abre como cajón desde la cinta o desde el botón ☰.

## Reproducir las capturas

Construye y ejecuta la app. `node herramientas/capture-pages.mjs` prepara escenas temporales `_capture-*.html` en `public/`. Por ejemplo, Firefox puede capturar `http://127.0.0.1:8130/_capture-editor.html` con `--headless --screenshot` y un perfil temporal vacío. Usa 1440 × 1000 para escritorio y 390 × 844 para móvil. Estas escenas no deben incluirse en el paquete de distribución; el empaquetador las excluye.
