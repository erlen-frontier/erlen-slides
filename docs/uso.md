# Usar Tabula

Con **Ctrl+K** busca herramientas o texto de las diapositivas. Los resultados indican la sección donde vive cada acción y se pueden recorrer con las flechas y ejecutar con Enter.

En **Ver todas** puedes reorganizar la diapositiva actual con **Mover antes** y **Mover después**, o con **Alt+←** y **Alt+→**. La operación se puede deshacer. Si hay diapositivas marcadas, usa **Quitar la marca** antes de mover una.

## Lienzo libre

En una diapositiva que admita bloques, activa **Lienzo libre** debajo de la diapositiva. Se conservan sus bloques y su acomodo anterior: vuelve a pulsarlo para regresar. En una diapositiva **En blanco** puedes componer el contenido desde cero. La portada, las secciones y los índices que no admiten bloques conservan su comportamiento anterior.

Selecciona un bloque y arrastra su asa para moverlo o sus esquinas para cambiar su tamaño. Las flechas lo mueven; Mayús y las flechas cambian su tamaño. **Transformar objeto** abre el panel donde puedes escribir posición y tamaño en porcentaje. Activa **Bloquear proporciones** para conservar la relación entre anchura y altura al usar las esquinas, el teclado o los campos numéricos. Comprueba los avisos de recorte si reduces cajas con texto o figuras complejas.

En una imagen o figura seleccionada, arrastra la manija **Girar figura**; mantén Mayús para ajustar el giro en pasos de 15°. También puedes escribir un ángulo entre −180° y 180° en el panel y voltearla horizontal o verticalmente. El pie permanece legible y las anotaciones giran con la imagen. Los cambios se pueden deshacer; la imagen original, la autoría y los créditos se conservan. La revisión avisa si la figura o su pie quedan fuera de la diapositiva.

Al mover un bloque, **Imán** muestra guías y lo ajusta a los bordes o centros de la diapositiva y de otros bloques visibles. Puedes desactivarlo con el botón o mantener **Alt** durante un arrastre para omitirlo. Esc cancela el gesto.

Con **Ctrl**, **⌘** o **Mayús** y clic puedes marcar varios bloques. También puedes arrastrar desde un espacio vacío para dibujar un recuadro que selecciona los bloques visibles que toca; mantén **Mayús** para añadirlos a la selección y pulsa **Esc** para cancelar el gesto.

Arrastra el asa del bloque activo o usa las flechas para mover la selección. Las manijas del marco conjunto cambian proporcionalmente el tamaño y la posición de todos los bloques; con el bloque activo enfocado, **Mayús + flechas** también permite reducir o ampliar el conjunto. **Organizar** alinea los bordes o centros y distribuye los espacios entre tres o más bloques. Cada operación se deshace en un solo paso. **Supr** elimina la selección. Si alguno está bloqueado, desbloquéalo antes de transformar o eliminar la selección.

**Capas** muestra los bloques de delante hacia atrás, incluso cuando están superpuestos. Desde la lista puedes marcar varios o usar las flechas para adelantar o retrasar una capa. El orden se guarda en el proyecto y se conserva en la vista de presentación y el HTML autónomo.

**Formas** inserta un rectángulo, una elipse, una línea o una flecha directamente en la diapositiva. Muévelos y cambia su tamaño como cualquier bloque. Con doble clic puedes editar su color, sus objetos y su descripción en el editor de figuras. La figura sigue editable en el proyecto JSON; en PowerPoint se incorpora como imagen.

El proyecto JSON conserva la geometría, la orientación, el bloqueo de proporciones y el orden de capas. La vista de presentación, el HTML y el archivo para imprimir usan el mismo acomodo; versiones anteriores pueden abrir el contenido pero ignorar estas propiedades. PowerPoint conserva el giro y el volteo; las figuras con anotaciones se exportan como una imagen. Beamer conserva la orientación, pero Beamer y Markdown avisan de que cambia la colocación; revisa el archivo final antes de compartirlo.

## Conversar con IA

Abre el asistente con **Ctrl+J** y elige **Conversar con IA**. En **Conexión**, escribe el endpoint HTTPS completo de un servicio en la nube compatible con Chat Completions y llamadas de herramientas, el modelo y, si corresponde, su clave API. No se conecta hasta que envías un mensaje; la dirección y la clave se conservan solo durante la sesión. El proveedor puede aplicar sus propias tarifas. El chat requiere la aplicación de escritorio o la versión web servida; el HTML suelto abierto como `file:` no carga las operaciones del agente.

Al enviar una petición se comparte con el proveedor un resumen acotado de la presentación y la conversación, sin imágenes ni archivos incrustados. Las notas solo se incluyen si marcas la casilla. El agente puede proponer ideas, crear diapositivas y editar o reordenar contenido; aplica cada lote como un paso de deshacer. Si cambias la presentación mientras responde o alguna operación falla, no aplica el lote. Los bloques bloqueados y los datos científicos protegidos no se eliminan desde el chat. Revisa el resultado antes de presentarlo.

## Crear una charla

**Archivo → Importar presentación** acepta JSON, PowerPoint `.pptx` y Markdown `.md`. En la versión web también se accede desde **Inicio → Importar proyecto**. Elige el archivo, revisa la vista previa y pulsa **Abrir copia editable**. Cancelar deja intacta la presentación abierta. Se crea un nombre libre en tu biblioteca; un fallo de almacenamiento impide abrir la copia y avisa. Las copias descargadas desde Erlen DoE pasan por su comprobación y vista previa habitual.

El PowerPoint se lee localmente, sin subirlo. Textos, imágenes PNG/JPEG/GIF/WebP incrustadas, tablas, ecuaciones compatibles y notas se convierten a bloques. Las gráficas se recuperan como **tablas de datos**, incluidas las parejas x/y; después puedes crear una gráfica y elegir sus ejes y unidades. Los objetos agrupados se separan y las tablas largas repiten el encabezado. El acomodo, las fuentes y los efectos se adaptan al estilo de Tabula: la importación no reproduce la apariencia exacta de Office. Revisa los avisos sobre formas, patrones, celdas combinadas, recortes y medios no compatibles. Límites: 25 MiB de archivo, 100 MiB descomprimidos y hasta 200 diapositivas antes y después de adaptar. En el HTML suelto abierto con `file:`, la entrada conserva la importación JSON anterior; las herramientas adicionales requieren servir la carpeta completa.

**Insertar → Figura por capas** crea una composición de texto, rectángulos, elipses, flechas e imágenes. Añade un objeto y selecciónalo en la lista; cambia texto, color y orden. **Posición, tamaño y giro** despliega los controles numéricos. Los botones de movimiento y de deshacer/rehacer permiten trabajar sin arrastrar. Escribe una descripción accesible antes de insertar. El proyecto JSON guarda los objetos; un doble clic o **Editar capas** permite volver a editarlos. Las imágenes nuevas deben ser PNG/JPEG/WebP y pesar hasta 8 MiB; una figura admite hasta 100 objetos. Una copia grande puede superar la cuota de almacenamiento del navegador: descarga el proyecto si aparece el aviso de guardado.

Seleccionar una imagen existente y elegir **Anotar una copia** conserva el bloque original y su fuente científica. La copia incorpora la imagen como objeto bloqueado, que puedes desbloquear si necesitas moverlo; las anotaciones son otros objetos. Al adaptar un SVG se genera una representación PNG para el lienzo de la copia. Los datos científicos del bloque original permanecen intactos.

**Figuras del catálogo:** en una diapositiva que admita bloques, activa **Lienzo libre** y pulsa **Figuras**, o elige **Insertar → Catálogo científico**. Busca por nombre o área, revisa el dibujo y sus créditos y pulsa **Añadir al lienzo**. Cada pieza es un objeto SVG independiente: puedes moverla, cambiar su tamaño, ordenarla y combinarla con otros objetos. Los trazados internos de la pieza no se editan individualmente; **Anotar una copia** permite añadir elementos sobre ella. El proyecto JSON conserva la imagen y su procedencia sin necesitar el catálogo para abrirla. Las portadas y secciones no admiten bloques en el lienzo actual.

Al compartir, algunas licencias requieren atribución. **Archivo → Créditos de figuras** permite consultarla y descargarla; incluye esos créditos junto al resultado. El kit de defensa los incorpora automáticamente. Markdown avisa que no conserva la procedencia editable al volver a importarlo; guarda el proyecto JSON para seguir trabajando.

Si creas una figura o un diagrama desde una portada o sección, al insertar se añade una diapositiva en blanco para mostrarlo. Cancelar no añade nada y la inserción completa se deshace en un paso.

**Inicio → Desde Markdown** abre un guion con vista previa. Usa `# Título` para la portada y `## Título` para las diapositivas; admite listas, tablas, ecuaciones, notas y columnas con el mismo [formato del servidor MCP](mcp.md). «Crear presentación» añade un documento nuevo a la biblioteca y conserva la charla abierta. Para traer figuras desde el guion, incrústalas como `data:image/...`; los archivos locales se insertan después. Archivo → Guion Markdown exporta imágenes incrustadas y avisa si un bloque necesita el proyecto JSON para conservar todas sus propiedades.

**Inicio → Organizar bloques** permite agrupar, desagrupar, bloquear, alinear, duplicar, eliminar o trasladar una selección a otra zona. Ctrl/⌘/Mayús + clic añade bloques a la selección; un grupo se selecciona junto. Cada operación tiene un solo paso de deshacer. Bloquear protege los controles del editor; desbloquea antes de cambiar el contenido. Diseño → Vista previa de temas enseña los estilos sobre la diapositiva actual.

**Insertar → Diagrama desde texto** dibuja flujos, secuencias, relaciones y cronogramas con Mermaid. Pulsa «Dibujar», revisa etiquetas y conexiones e inserta la figura. El JSON conserva SVG y fuente; «Datos científicos…» o doble clic la reabre. Se rechazan enlaces y configuración embebida. Los diagramas existentes se siguen viendo sin cargar Mermaid.

**Presentar → Grabar presentación** solicita compartir una pestaña o pantalla y, opcionalmente, el micrófono. «Detener y descargar» guarda WebM o MP4 según el navegador. También se detiene al terminar la captura desde el navegador. Requiere localhost o HTTPS y compatibilidad con MediaRecorder; el archivo se guarda en tu equipo.

En Inicio elige **Nueva presentación**, **Explorar ejemplos** o **Importar proyecto**. Un documento nuevo empieza con una portada vacía. Pon un título y añade diapositivas desde la tira lateral. Puedes reordenarlas, cambiar el diseño o abrir la vista general.

En una pantalla vertical la diapositiva se coloca arriba, sus controles quedan en una barra debajo y las miniaturas se reparten en dos columnas; en horizontal y en el ordenador la tira sigue a un lado. Haz clic sobre el texto de la diapositiva para editar, o sobre una zona vacía —incluida cada columna o celda de los diseños de varias zonas— para escribir ahí mismo; el doble clic en el hueco de una zona añade otro texto. Una figura seleccionada se arrastra agarrándola y se estrecha o ensancha con las manijas de sus lados. Las herramientas están en la cinta de arriba: «Archivo» (abrir, guardar, exportar y acerca de) y las pestañas Inicio, Insertar, Diseño, Diapositiva, Presentar y Vista; al seleccionar un bloque aparece otra pestaña con el nombre de su tipo (Ecuación, Figura, Tabla…). Lo que necesita un formulario largo se abre en el panel de detalles de la derecha, que se cierra con ✕ o Escape. Si prefieres las propiedades siempre a la vista, Vista → Herramientas → Panel a la derecha (o Ctrl+Shift+B); la elección se recuerda. Las ecuaciones reciben LaTeX; las reacciones reciben sintaxis mhchem. Por ejemplo: `A = \\varepsilon l c` en la documentación representa la orden LaTeX `A = \varepsilon l c` que debes escribir en el editor.

## Gráficas y química

Una gráfica conserva los pares de datos y sus etiquetas. Verifica unidades y significado de la incertidumbre antes de mostrar resultados. Los ejemplos tienen datos didácticos. El editor no certifica un ajuste, una asignación espectral ni la validez de un método.

La **gráfica dinámica** dibuja fórmulas (`x` es la variable del eje; cualquier otra letra es un parámetro con deslizador) y al presentar los deslizadores mueven la curva en vivo; en el PDF y en Beamer sale fija, con los valores que tenga al exportar.

- **Modelos listos**, cada uno con el significado y la unidad de cada símbolo (pasa el ratón por la tarjeta para ver sus supuestos): Arrhenius y su forma linealizada, cinéticas de 1.er y 2.º orden, pico gaussiano, gaussiana, lorentziana y pseudo-Voigt con el mismo FWHM, Beer–Lambert, isotermas de Langmuir y Freundlich, cinética de adsorción de pseudo-primer y pseudo-segundo orden, Scherrer, ley de Bragg, borde de absorción de Tauc, Van 't Hoff, Michaelis–Menten, Fermi–Dirac y superposición de ondas. Los valores iniciales son ilustrativos: cámbialos por los tuyos.
- **Parámetros**: cada uno tiene recorrido, valor, unidad (se ve junto al deslizador) y la casilla *log* para los que abarcan órdenes de magnitud, como un factor preexponencial. Al cambiar el recorrido el paso se recalcula. El botón ↺ junto a los deslizadores vuelve a los valores con que se abrió la diapositiva; con un deslizador enfocado, las flechas lo mueven a él y no pasan de diapositiva.
- **Muestreo**: la curva se refina donde cambia deprisa (un pico estrecho, el escalón de Fermi a baja temperatura) y se corta en las discontinuidades y los polos, en vez de unirlos con una raya vertical. Con polos, el eje Y se ajusta a la parte normal de la curva; *Fijar el eje Y* permite elegir otro rango. Los ejes pueden ir en logaritmo, y entonces el muestreo se reparte por décadas.
- **Errores**: si una fórmula no se entiende, el editor dice qué curva y marca con ▸ el carácter donde se atascó; también avisa de letras sin definir y de parámetros que chocan con una constante (`R`, `e`, `pi`, `kB`…).

En Recursos → Laboratorio científico puedes usar RDKit para analizar estructuras, Kekule para dibujarlas, 3Dmol para visualizarlas y Plotly para generar gráficas. Estas herramientas adicionales requieren servir los recursos de `public/libre/` por HTTP, incluso si el servidor es local y no hay Internet. Abrir únicamente el HTML offline permite seguir viendo figuras ya insertadas.

Cada diapositiva tiene un diseño: lo eliges en Inicio → Nueva y lo cambias, sin perder bloques, en Diapositiva → Acomodo. Además de los de estructura, columnas y cuadrículas, hay cuatro pensados para charlas científicas:

| Diseño | Para qué sirve | En Beamer y PowerPoint |
|---|---|---|
| **En blanco** | Lienzo libre, sin título ni pie ni número de página: una figura grande, un esquema o una sola frase. El título que tenga la diapositiva se guarda (sirve para la tira, la búsqueda y el índice), pero no se muestra, y la revisión no lo pide | Marco `[plain]` con sus bloques; en PowerPoint salen los bloques, sin pie |
| **Titular + figura** | El título es la conclusión en una frase completa, sin barra y a dos líneas si hace falta, y debajo va la evidencia. La revisión sugiere reescribirlo si tiene menos de cuatro palabras | El titular es el título del marco; la evidencia va centrada |
| **Tres figuras** | Tres paneles del mismo ancho con su letra —(a), (b), (c), editables— para comparar tres técnicas de la misma muestra | Tres columnas con la letra de cada panel |
| **Objetivos** | El objetivo general destacado arriba y los específicos debajo, con encabezados editables | El general en un `block`; los específicos debajo |

Las diapositivas nuevas nacen vacías: los encabezados de zona son rótulos genéricos, no datos.

Para empezar una lámina con una idea clara, usa **Afirmación + evidencia** en Insertar → Nueva diapositiva. La plantilla deja una zona para la afirmación, otra para la figura y una nota para explicar incertidumbre y límites; sustituye los datos ilustrativos antes de presentar.

**Ideas de diseño** (Diseño → Ideas, o Ctrl+K y «ideas de diseño») propone acomodos completos para la diapositiva actual según lo que contiene: un texto largo pasa a texto fluido o se parte en dos columnas o dos diapositivas; una gráfica con su explicación, a dos columnas o con pie ancho; dos a cuatro figuras, lado a lado, en zigzag, en tres columnas o en cuadrícula; una lista corta de tres a seis puntos, a un SmartArt (proceso si los puntos van numerados o en orden, cronología si empiezan con un año, ciclo si vuelven al inicio, jerarquía o radial si un punto tiene subpuntos); una cifra sola con su rótulo, a «Dato grande»; una cita, a «Cita destacada»; una ecuación, una reacción o una estructura, al centro y más grande. Si hay una imagen, además se analizan su forma y sus colores, como al insertarla. Cada miniatura es la diapositiva de verdad ya cambiada, con una frase que explica por qué; se aplica con un clic y se deshace con Ctrl+Z. Nunca se escribe texto nuevo: los encabezados que la propuesta no puede sacar de lo que ya hay (el autor de una cita sin autor, los rótulos de una cuadrícula) quedan vacíos para que los escribas.

Antes de compartir, abre Archivo → Calidad científica. La revisión comprueba datos, ejes, unidades indicadas, escalas logarítmicas, barras de error, pies y procedencia. Sus avisos ayudan a revisar el archivo; no certifican la validez del experimento.

## Una presentación que prepara el asistente

Si trabajas con un asistente de IA conectado al [servidor MCP](mcp.md), puede enseñarte lo que construyó con `abrir_en_editor`: tu navegador abre el editor en `http://127.0.0.1:8130/?abrir=<clave>` (el asistente te da la dirección si el navegador no se abre solo). Slides pide el proyecto a ese mismo servidor, retira la clave de la dirección y enseña una **vista previa** con sus diapositivas. Solo al pulsar **Abrir en el editor** entra en tu biblioteca, con su título (y « (2)» si el nombre ya existe); la presentación que tenías abierta se conserva. **Cancelar** no cambia nada.

La clave sirve una vez y caduca a los 10 minutos: si ves «El enlace caducó o ya se usó», pide al asistente que vuelva a abrirla. Lo que edites a partir de ahí se guarda en este navegador, no en el archivo del asistente: para devolverle tus cambios, usa **Exportar → Proyecto (.json)** y guarda el archivo en su carpeta de trabajo.

## Un informe de Erlen DoE, como presentación

Erlen DoE puede enviar su informe (tipo `informe-v1` del [contrato de copias de la suite](https://github.com/erlen-frontier-ops/erlen-suite/blob/main/docs/intercambio-doe.md)) para contarlo en una reunión de grupo. Dentro de la suite, la página de recursos del portal o el propio DoE abren `/slides/#copy=<id>`: Slides lee la copia al arrancar, la retira de la dirección sin dejar entrada en el historial y enseña una **vista previa** con las diapositivas que va a crear, cómo se repartieron las tablas largas, los recortes que hizo falta hacer y, si el informe lo declara, el aviso **DATOS SIMULADOS**. Fuera de la suite, DoE descarga la copia como `erlen-copia-slides-<id8>.json`; ábrela con **Importar proyecto** y pasa por la misma vista previa.

Solo al pulsar **Crear presentación** aparece una presentación nueva en tu biblioteca, con el título del informe (y « (2)», « (3)»… si el nombre ya existe: nunca se sobrescribe otra). La presentación que tenías abierta se conserva. **Cancelar** no crea ni cambia nada, y la copia de intercambio sigue en la página de recursos, que es donde se borra.

| En el informe | En la presentación |
|---|---|
| Título, subtítulo y fecha | La portada; con datos simulados, el subtítulo termina en «DATOS SIMULADOS» |
| Cada sección | Una o más diapositivas con su título; las que siguen dicen «continuación» |
| Párrafos y listas | Texto y viñetas, sin pasar de unas 55 palabras ni de siete viñetas por diapositiva; un párrafo largo se parte por frases y, si hace falta, a media frase con «…» |
| Tablas | Tablas de Slides de hasta siete columnas y las filas que caben. Una tabla más larga o más ancha **se reparte** en varias diapositivas, sin perder datos: las filas en tramos parejos (un L9 va en 5 y 4 corridas) con el encabezado en cada uno, y las columnas de más en grupos que repiten las que identifican cada fila (la primera y, si las hay justo detrás, las de los factores del diseño). El título lleva «(1/4)», «(2/4)»…; el pie dice qué filas y columnas hay en cada diapositiva, y las notas y la vista previa, cómo se repartió. Solo si hicieran falta más de doce diapositivas se recorta lo que sobra, y el pie y las notas dicen cuántas filas y columnas se omitieron. Las celdas largas acaban en «…» y los números se muestran con hasta seis cifras significativas, igual en todas las partes |
| Figuras | Gráficas de datos editables: de dispersión si todas las series son de puntos, de líneas si no; conservan el eje invertido del FTIR. Una serie de más de unos miles de puntos se aligera guardando el mínimo y el máximo de cada tramo, y el pie lo dice. Las marcas y regiones van a las notas. Una figura sin puntos se muestra como tabla de sus series; nunca como una imagen inventada |
| Procedencia | La última diapositiva: aplicación, proyecto, título, fechas, identificador de la copia y su SHA-256. También queda en el proyecto (`meta.origen`) y en las notas de cada diapositiva |

El reparto está calculado para el tema Metropolis en 16:9, con el que nace la presentación. Si cambias de tema o de proporción cambian las letras: **Preparar mi charla** avisa entonces de lo que no quepa. El texto llega tal cual lo escribió DoE; un «$» se muestra como signo, no abre matemáticas.

Se rechazan, con el motivo en español y sin tocar nada, las copias de otro tipo o de otra aplicación de origen, las dirigidas a otra aplicación, las que cambiaron después de enviarse (su SHA-256 ya no coincide), las que no están en este navegador y los informes que se salen de los límites del tipo (30 secciones, 200 bloques, 2 MiB, tablas de 50 columnas y 500 filas, figuras de 8 series y 20 000 puntos por serie).

## Guardar y recuperar

El indicador superior informa del autoguardado. Archivo permite conservar varias presentaciones con nombre. En Recursos hay copias de recuperación, respaldo ZIP, plantillas e identidad institucional. Un respaldo ZIP contiene proyectos JSON y un archivo de plantillas: importa cada presentación desde Inicio y las plantillas desde su opción específica.

En la aplicación de escritorio Linux, **Abrir proyecto** (Ctrl+O) abre un JSON desde el disco. **Guardar** (Ctrl+S) escribe en el archivo abierto y **Guardar como** (Ctrl+Mayús+S) permite elegir otro; para un documento nuevo, Guardar pregunta dónde crearlo. El indicador avisa si hay cambios pendientes. Si otra aplicación modifica el archivo, Tabula evita sobrescribirlo y propone guardar una copia. Al cerrar o cambiar de presentación con cambios sin guardar en disco se pide confirmación. La copia interna sigue autoguardándose y su recuperación es independiente del archivo elegido. Al reiniciar hay que volver a abrir el archivo o elegir un destino. Para PPTX y Markdown sigue disponible **Archivo → Importar presentación**.

Guarda una copia JSON externa antes de borrar los datos del navegador. Importar otro proyecto valida su estructura; los borradores actuales se conservan al cambiar desde Inicio si hay espacio disponible. Si el almacenamiento se llena, descarga tu trabajo antes de continuar.

## Presentar

Usa Presentar o F5. Avanza con las flechas; Esc vuelve al editor. N muestra notas, P abre la vista de presentador, L activa tinta/puntero y B alterna la pantalla en negro. Las ayudas dentro de la app describen atajos y opciones adicionales.

## Exportaciones

**Archivo → Revisar y compartir** reúne el formato y su revisión en un diálogo. También se abre al elegir PowerPoint editable o presentación HTML. Muestra problemas de contenido, accesibilidad, recursos externos y objetos fuera del borde de una figura. Cada hallazgo te lleva a su diapositiva o propiedades; **Volver a revisar** actualiza el resultado. La lista muestra primero problemas que corregir; el filtro permite ver también límites del formato. Los avisos orientan, no impiden descargar por sí solos.

**Incluir notas del orador** empieza desmarcado en PowerPoint y HTML: quien reciba el archivo podrá leerlas si las incluyes. El proyecto JSON siempre conserva las notas y los datos para continuar editando. Las figuras por capas se exportan como imagen en PowerPoint; sus objetos internos siguen editables en el JSON. Compara el archivo final en el equipo donde lo presentarás. La revisión de accesibilidad del editor no certifica un PDF etiquetado ni un archivo PowerPoint plenamente accesible.

| Formato | Uso | Revisión necesaria |
|---|---|---|
| JSON | Conservar y volver a editar en Tabula | Es la copia de trabajo recomendada |
| PDF | Compartir una copia visual | Usa Imprimir/Guardar como PDF y revisa tamaño, fondos y recortes |
| PPTX | Abrir en software de presentaciones | Algunos elementos complejos se convierten en imágenes; revisa tipografías y alineación en el programa destino |
| PPTX editable | Continuar editando texto, tablas, gráficas XY/barras y diagramas compatibles | Archivo → PowerPoint editable usa PptxGenJS. Incertidumbres, ajustes, anotaciones, escalas especiales, ecuaciones y funciones conservan la apariencia como imagen con aviso por diapositiva. Sigue disponible el exportador clásico. El JSON conserva las fuentes originales |
| Markdown | Editar el guion como texto y volver a importarlo | Imágenes incrustadas; los avisos indican bloques que requieren JSON para una reedición completa |
| HTML autónomo | Presentar sin conexión, con pasos, vista general y deslizadores de funciones | Archivo → Presentación HTML autónoma usa Reveal.js y el motor científico de Tabula. Incrusta imágenes/vídeos primero. Las notas se excluyen por defecto; al incluirlas pasan a formar parte del archivo compartido |
| Beamer / TEX | Continuar un flujo con LaTeX | Requiere una distribución de LaTeX; temas y elementos especiales pueden diferir de la vista web |
| SVG científico | Reutilizar una gráfica o función en un artículo | Selecciona una figura científica y usa Exportar → SVG científico; incluye ejes, trazos, etiquetas y `metadata` de procedencia, sin depender del CSS de la app |
| Informe de exportación (JSON) | Revisar riesgos antes de compartir | Exportar → Informe de exportación lista errores, advertencias e información por diapositiva y por formato |
| HTML | Imprimir desde el navegador cuando el cuadro de impresión falla | Se ofrece dentro de Exportar → PDF como «Archivo imprimible (.html)»: es una copia paginada para imprimir, no un modo de presentación |

Los paquetes de figura y el **kit de defensa** incluyen `provenance.json` con la versión de Tabula, los identificadores de figuras, las fuentes disponibles y la huella SHA-256 de los datos. Es un registro de trazabilidad, no una copia de los datos que no hayas incluido.

No se ha certificado compatibilidad visual idéntica con todas las versiones de PowerPoint ni con todos los motores LaTeX. La validación específica de esta publicación está en [validacion.md](validacion.md).

La revisión de desbordes comprueba tablas, figuras y etiquetas contra sus contenedores internos. Una tabla puede quedar recortada aunque el cuerpo general no desborde: corrige los avisos de «tabla recortada» antes de compartir.

## Referencias y conexiones voluntarias

Puedes escribir tus referencias o recuperar metadatos por DOI desde Crossref. Zotero ofrece conexión de escritorio o Web. Estas acciones se inician desde sus controles; no son necesarias para editar. Una clave de Zotero pertenece al usuario: no la agregues a ejemplos, capturas o repositorios.

## Móvil

En una pantalla estrecha la cinta sigue arriba y se desplaza en horizontal; el panel de detalles se abre como cajón desde la cinta o desde el botón ☰. La edición científica densa resulta más cómoda en una pantalla grande; la vista móvil permite revisar y hacer cambios puntuales.
