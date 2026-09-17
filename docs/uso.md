# Usar Erlen Slides

## Crear una charla

En Inicio elige **Nueva presentación**, **Explorar ejemplos** o **Importar proyecto**. Un documento nuevo empieza con una portada vacía. Pon un título y añade diapositivas desde la tira lateral. Puedes reordenarlas, cambiar el diseño o abrir la vista general.

En una pantalla vertical la diapositiva se coloca arriba, sus controles quedan en una barra debajo y las miniaturas se reparten en dos columnas; en horizontal y en el ordenador la tira sigue a un lado. Haz clic sobre el texto de la diapositiva para editar, o sobre una zona vacía —incluida cada columna o celda de los diseños de varias zonas— para escribir ahí mismo; el doble clic en el hueco de una zona añade otro texto. Una figura seleccionada se arrastra agarrándola y se estrecha o ensancha con las manijas de sus lados. El panel derecho separa Insertar, Diapositiva, Diseño y las propiedades del bloque seleccionado. Las ecuaciones reciben LaTeX; las reacciones reciben sintaxis mhchem. Por ejemplo: `A = \\varepsilon l c` en la documentación representa la orden LaTeX `A = \varepsilon l c` que debes escribir en el editor.

## Gráficas y química

Una gráfica conserva los pares de datos y sus etiquetas. Verifica unidades y significado de la incertidumbre antes de mostrar resultados. Los ejemplos tienen datos didácticos. El editor no certifica un ajuste, una asignación espectral ni la validez de un método.

En Recursos → Laboratorio científico puedes usar RDKit para analizar estructuras, Kekule para dibujarlas, 3Dmol para visualizarlas y Plotly para generar gráficas. Estas herramientas adicionales requieren servir los recursos de `public/libre/` por HTTP, incluso si el servidor es local y no hay Internet. Abrir únicamente el HTML offline permite seguir viendo figuras ya insertadas.

Para empezar una lámina con una idea clara, usa **Afirmación + evidencia** en Insertar → Nueva diapositiva. La plantilla deja una zona para la afirmación, otra para la figura y una nota para explicar incertidumbre y límites; sustituye los datos ilustrativos antes de presentar.

Antes de compartir, abre Archivo → Calidad científica. La revisión comprueba datos, ejes, unidades indicadas, escalas logarítmicas, barras de error, pies y procedencia. Sus avisos ayudan a revisar el archivo; no certifican la validez del experimento.

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
| HTML | Imprimir desde el navegador cuando el cuadro de impresión falla | Se ofrece dentro de Exportar → PDF como «Archivo imprimible (.html)»: es una copia paginada para imprimir, no un modo de presentación |

Los paquetes de figura y el **kit de defensa** incluyen `provenance.json` con la versión de Erlen, los identificadores de figuras, las fuentes disponibles y la huella SHA-256 de los datos. Es un registro de trazabilidad, no una copia de los datos que no hayas incluido.

No se ha certificado compatibilidad visual idéntica con todas las versiones de PowerPoint ni con todos los motores LaTeX. La validación específica de esta publicación está en [validacion.md](validacion.md).

## Referencias y conexiones voluntarias

Puedes escribir tus referencias o recuperar metadatos por DOI desde Crossref. Zotero ofrece conexión de escritorio o Web. Estas acciones se inician desde sus controles; no son necesarias para editar. Una clave de Zotero pertenece al usuario: no la agregues a ejemplos, capturas o repositorios.

## Móvil

En una pantalla estrecha las herramientas pasan a un panel desplegable. El menú de más opciones reúne acciones de archivo y exportación. La edición científica densa resulta más cómoda en una pantalla grande; la vista móvil permite revisar y hacer cambios puntuales.
