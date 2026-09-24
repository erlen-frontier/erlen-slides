# Notas de la versión 0.3.0

Slides recibe su primera copia de otra app de la suite: el informe de un análisis de **Erlen DoE**, que se abre como presentación nueva para contarlo en una reunión de grupo. El contrato que fija qué viaja es `docs/intercambio-doe.md` del portal (tipo `informe-v1`); cómo viaja, `web/exchange-v2.mjs`, que aquí se copia literalmente.

## Del informe a las diapositivas

La página de recursos del portal abre `/slides/#copy=<id>`. Slides lee la copia al arrancar, retira el `#copy=` de la dirección sin dejar entrada en el historial —la ruta queda en `#suite/inicio`, como siempre— y comprueba la huella SHA-256, el destino, el formato, el tipo, la app de origen y los límites del tipo. Si algo falla, lo dice en español y no toca nada.

Si todo cuadra, enseña una vista previa: qué diapositivas va a crear, qué recortó para que quepan y, si el informe lo declara, **DATOS SIMULADOS**. Solo al confirmar se guarda una presentación nueva en la biblioteca, con el título del informe y un sufijo si ese nombre ya existe; la que estaba abierta se conserva. Cancelar no crea nada. La copia de intercambio no se borra: eso se hace en la página de recursos.

- **Portada** con título, subtítulo y fecha; con datos simulados, el subtítulo y cada diapositiva lo dicen.
- **Secciones** en una o más diapositivas. Párrafos y listas se reparten sin pasar de unas 55 palabras ni de siete viñetas, y sin pasar del alto del cuerpo.
- **Tablas** de Slides con las filas que caben y hasta siete columnas; el pie dice cuántas se omitieron.
- **Figuras** como gráficas de datos editables (dispersión o líneas, con el eje invertido del FTIR). Una serie muy larga se aligera guardando el mínimo y el máximo de cada tramo, y el pie lo dice; marcas y regiones van a las notas.
- **Procedencia** en la última diapositiva (app, proyecto, título, identificador de la copia y SHA-256), en las notas y en el proyecto (`meta.origen`).

Fuera de la suite, DoE descarga la copia como archivo; **Importar proyecto** la reconoce y la lleva a la misma vista previa.

## Un arreglo de paso

La exportación a Beamer escribía `\textbackslash{}\$` para un «$» escrito como signo (`\$`), así que el PDF mostraba una barra que la pantalla no enseñaba. Ahora sale `\$`, como en pantalla.

## Comprobado

- 99 pruebas, todas pasan; siete nuevas en `tests/intercambio.test.mjs`: copia literal del transporte, conversión, rechazos de contenido, `#copy=` con vista previa y creación, cancelar, copias de otro tipo, destino, dañadas o ausentes, y el archivo descargado.
- Construcción: 95 módulos, 3011 KiB (el límite del HTML único es 3 MiB).
- Chromium 141 real, 1400 × 900: dos informes convertidos (uno como el de DoE y otro hecho para desbordar: títulos de tres líneas, treinta párrafos cortos, viñetas largas, un párrafo de 400 palabras, una frase de 300 palabras sin puntos y tablas de 12 y 3 columnas con celdas largas) dan 44 diapositivas de contenido y ninguna tiene contenido fuera del cuerpo, ni por abajo ni por el lado.

## Pendiente

No se ha probado con una copia enviada por la versión publicada de DoE en el portal desplegado: DoE se conecta en paralelo. La exportación a PowerPoint de una presentación nacida de un informe no se ha abierto con un lector independiente.
