# Usar Erlen Slides

## Crear una charla

En Inicio elige **Nueva presentación**, **Explorar ejemplos** o **Importar proyecto**. Un documento nuevo empieza con una portada vacía. Pon un título y añade diapositivas desde la tira lateral. Puedes reordenarlas, cambiar el diseño o abrir la vista general.

En una pantalla vertical la diapositiva se coloca arriba, sus controles quedan en una barra debajo y las miniaturas se reparten en dos columnas; en horizontal y en el ordenador la tira sigue a un lado. Haz clic sobre el texto de la diapositiva para editar, o sobre una zona vacía —incluida cada columna o celda de los diseños de varias zonas— para escribir ahí mismo; el doble clic en el hueco de una zona añade otro texto. Una figura seleccionada se arrastra agarrándola y se estrecha o ensancha con las manijas de sus lados. Las herramientas están en la cinta de arriba: «Archivo» (abrir, guardar, exportar y acerca de) y las pestañas Inicio, Insertar, Diseño, Diapositiva, Presentar y Vista; al seleccionar un bloque aparece otra pestaña con el nombre de su tipo (Ecuación, Figura, Tabla…). Lo que necesita un formulario largo se abre en el panel de detalles de la derecha, que se cierra con ✕ o Escape. Si prefieres las propiedades siempre a la vista, Vista → Herramientas → Panel a la derecha (o Ctrl+Shift+B); la elección se recuerda. Las ecuaciones reciben LaTeX; las reacciones reciben sintaxis mhchem. Por ejemplo: `A = \\varepsilon l c` en la documentación representa la orden LaTeX `A = \varepsilon l c` que debes escribir en el editor.

## Gráficas y química

Una gráfica conserva los pares de datos y sus etiquetas. Verifica unidades y significado de la incertidumbre antes de mostrar resultados. Los ejemplos tienen datos didácticos. El editor no certifica un ajuste, una asignación espectral ni la validez de un método.

En Recursos → Laboratorio científico puedes usar RDKit para analizar estructuras, Kekule para dibujarlas, 3Dmol para visualizarlas y Plotly para generar gráficas. Estas herramientas adicionales requieren servir los recursos de `public/libre/` por HTTP, incluso si el servidor es local y no hay Internet. Abrir únicamente el HTML offline permite seguir viendo figuras ya insertadas.

Para empezar una lámina con una idea clara, usa **Afirmación + evidencia** en Insertar → Nueva diapositiva. La plantilla deja una zona para la afirmación, otra para la figura y una nota para explicar incertidumbre y límites; sustituye los datos ilustrativos antes de presentar.

Antes de compartir, abre Archivo → Calidad científica. La revisión comprueba datos, ejes, unidades indicadas, escalas logarítmicas, barras de error, pies y procedencia. Sus avisos ayudan a revisar el archivo; no certifican la validez del experimento.

## Un informe de Erlen DoE, como presentación

Erlen DoE puede enviar su informe (tipo `informe-v1` del [contrato de copias de la suite](https://github.com/jorgegonzalezsevilla/erlen-suite/blob/main/docs/intercambio-doe.md)) para contarlo en una reunión de grupo. Dentro de la suite, la página de recursos del portal o el propio DoE abren `/slides/#copy=<id>`: Slides lee la copia al arrancar, la retira de la dirección sin dejar entrada en el historial y enseña una **vista previa** con las diapositivas que va a crear, los recortes que hizo falta hacer y, si el informe lo declara, el aviso **DATOS SIMULADOS**. Fuera de la suite, DoE descarga la copia como `erlen-copia-slides-<id8>.json`; ábrela con **Importar proyecto** y pasa por la misma vista previa.

Solo al pulsar **Crear presentación** aparece una presentación nueva en tu biblioteca, con el título del informe (y « (2)», « (3)»… si el nombre ya existe: nunca se sobrescribe otra). La presentación que tenías abierta se conserva. **Cancelar** no crea ni cambia nada, y la copia de intercambio sigue en la página de recursos, que es donde se borra.

| En el informe | En la presentación |
|---|---|
| Título, subtítulo y fecha | La portada; con datos simulados, el subtítulo termina en «DATOS SIMULADOS» |
| Cada sección | Una o más diapositivas con su título; las que siguen dicen «continuación» |
| Párrafos y listas | Texto y viñetas, sin pasar de unas 55 palabras ni de siete viñetas por diapositiva; un párrafo largo se parte por frases y, si hace falta, a media frase con «…» |
| Tablas | Tablas de Slides con las filas que caben (y hasta siete columnas); el pie dice cuántas filas y columnas se omitieron, y las celdas largas acaban en «…». Los números se muestran con hasta seis cifras significativas |
| Figuras | Gráficas de datos editables: de dispersión si todas las series son de puntos, de líneas si no; conservan el eje invertido del FTIR. Una serie de más de unos miles de puntos se aligera guardando el mínimo y el máximo de cada tramo, y el pie lo dice. Las marcas y regiones van a las notas. Una figura sin puntos se muestra como tabla de sus series; nunca como una imagen inventada |
| Procedencia | La última diapositiva: aplicación, proyecto, título, fechas, identificador de la copia y su SHA-256. También queda en el proyecto (`meta.origen`) y en las notas de cada diapositiva |

El reparto está calculado para el tema Metropolis en 16:9, con el que nace la presentación. Si cambias de tema o de proporción cambian las letras: **Preparar mi charla** avisa entonces de lo que no quepa. El texto llega tal cual lo escribió DoE; un «$» se muestra como signo, no abre matemáticas.

Se rechazan, con el motivo en español y sin tocar nada, las copias de otro tipo o de otra aplicación de origen, las dirigidas a otra aplicación, las que cambiaron después de enviarse (su SHA-256 ya no coincide), las que no están en este navegador y los informes que se salen de los límites del tipo (30 secciones, 200 bloques, 2 MiB, tablas de 50 columnas y 500 filas, figuras de 8 series y 20 000 puntos por serie).

## Guardar y recuperar

El indicador superior informa del autoguardado. Archivo permite conservar varias presentaciones con nombre. En Recursos hay copias de recuperación, respaldo ZIP, plantillas e identidad institucional. Un respaldo ZIP contiene proyectos JSON y un archivo de plantillas: importa cada presentación desde Inicio y las plantillas desde su opción específica.

Guarda una copia JSON externa antes de borrar los datos del navegador. Importar otro proyecto valida su estructura; los borradores actuales se conservan al cambiar desde Inicio si hay espacio disponible. Si el almacenamiento se llena, descarga tu trabajo antes de continuar.

## Presentar

Usa Presentar o F5. Avanza con las flechas; Esc vuelve al editor. N muestra notas, P abre la vista de presentador, L activa tinta/puntero y B alterna la pantalla en negro. Las ayudas dentro de la app describen atajos y opciones adicionales.

## Exportaciones

| Formato | Uso | Revisión necesaria |
|---|---|---|
| JSON | Conservar y volver a editar en Erlen | Es la copia de trabajo recomendada |
| PDF | Compartir una copia visual | Usa Imprimir/Guardar como PDF y revisa tamaño, fondos y recortes |
| PPTX | Abrir en software de presentaciones | Algunos elementos complejos se convierten en imágenes; revisa tipografías y alineación en el programa destino |
| Beamer / TEX | Continuar un flujo con LaTeX | Requiere una distribución de LaTeX; temas y elementos especiales pueden diferir de la vista web |
| SVG científico | Reutilizar una gráfica o función en un artículo | Selecciona una figura científica y usa Exportar → SVG científico; incluye ejes, trazos, etiquetas y `metadata` de procedencia, sin depender del CSS de la app |
| Informe de exportación (JSON) | Revisar riesgos antes de compartir | Exportar → Informe de exportación lista errores, advertencias e información por diapositiva y por formato |
| HTML | Imprimir desde el navegador cuando el cuadro de impresión falla | Se ofrece dentro de Exportar → PDF como «Archivo imprimible (.html)»: es una copia paginada para imprimir, no un modo de presentación |

Los paquetes de figura y el **kit de defensa** incluyen `provenance.json` con la versión de Erlen, los identificadores de figuras, las fuentes disponibles y la huella SHA-256 de los datos. Es un registro de trazabilidad, no una copia de los datos que no hayas incluido.

No se ha certificado compatibilidad visual idéntica con todas las versiones de PowerPoint ni con todos los motores LaTeX. La validación específica de esta publicación está en [validacion.md](validacion.md).

## Referencias y conexiones voluntarias

Puedes escribir tus referencias o recuperar metadatos por DOI desde Crossref. Zotero ofrece conexión de escritorio o Web. Estas acciones se inician desde sus controles; no son necesarias para editar. Una clave de Zotero pertenece al usuario: no la agregues a ejemplos, capturas o repositorios.

## Móvil

En una pantalla estrecha la cinta sigue arriba y se desplaza en horizontal; el panel de detalles se abre como cajón desde la cinta o desde el botón ☰. La edición científica densa resulta más cómoda en una pantalla grande; la vista móvil permite revisar y hacer cambios puntuales.
