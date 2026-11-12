# Notas históricas de Erlen Slides 0.2.0

> Documento histórico, no guía de la versión actual de Tabula ni confirmación del estado de las releases disponibles. El contenido siguiente describe la distribución de entonces; sus cifras, resultados y limitaciones no validan el código actual. Se conserva como antecedente técnico, sin nuevas ejecuciones de pruebas. Para el funcionamiento actual consulta el [README](../README.md) y el [manual](uso.md); para publicar, sigue el [proceso vigente](publicacion.md).

Segunda publicación de **Erlen Slides**, bajo AGPL-3.0-only. Sigue siendo local:
sin cuentas, sin servidor y sin telemetría.

## Escribir en la diapositiva

- El cartel de zona vacía **es** el control que crea el texto: un clic —o Enter,
  porque es enfocable— añade un bloque en *esa* zona y deja el cursor dentro. En
  una cuadrícula 2×2, tres de las cuatro celdas eran inalcanzables con el ratón.
- Una figura seleccionada se arrastra agarrándola y tiene manijas de anchura a
  los dos lados.
- En vertical el lienzo se ciñe a la diapositiva en vez de dejarla flotando: a
  390 × 844 el espacio muerto pasa de unos 320 px a 12, el pie del lienzo cabe en
  una fila y la tira de miniaturas se convierte en una rejilla de dos columnas
  con miniaturas de ~170 px, donde las seis diapositivas de un ejemplo se ven a
  la vez.

## Gráficas

- **Barras de error.** Una columna titulada «±», «error», «sd», «sem» o «desv» no
  es una serie: es la incertidumbre de la anterior. El eje se ensancha para que
  la barra quepa entera, y viaja igual al PDF.
- **Ejes logarítmicos**, con marcas por décadas. Un cero o un negativo no tiene
  logaritmo: queda fuera del dibujo y el editor dice cuántos. Con el eje Y en
  logaritmo el ajuste se hace sobre el logaritmo —la linealización de siempre— y
  se reporta como `log₁₀ y = m x + b`.
- La ecuación del ajuste y su R² llegan por fin al PDF; estaban sólo en pantalla.
- El margen izquierdo se ajusta al rótulo más largo, el eje llega hasta el dato
  que dibuja, las medidas se marcan cuando son pocas y las columnas numéricas de
  una tabla se alinean a la derecha, también en Beamer.

## PowerPoint

Dos averías que ninguna comprobación de estructura detecta, encontradas al abrir
el archivo con un lector OOXML independiente y con LibreOffice Impress:

- El SmartArt —y con él las estructuras, los montajes y la geometría— llegaba
  como una hilera de rótulos sueltos, sin cajas, sin flechas y sin color.
- Una diapositiva salía en blanco en aproximadamente dos de cada cinco
  exportaciones, con formas escritas con `sz="NaN"`.

## Química

- Los rótulos de elemento (N azul, O rojo…) llegan al PDF con su color, y el
  rótulo se recorta contra el papel del tema en vez de contra un parche blanco.
- El montaje de laboratorio y las estructuras se reparten en catálogo/modelo,
  motor y editor, con **una sola tabla de decisiones que leen la pantalla y el
  PDF**: donde había dos copias, ya habían divergido.

## Comprobaciones registradas entonces

73 pruebas automáticas (eran 37 en 0.1.0), build reproducible, los 12 ejemplos se
regeneran idénticos y el ZIP publicado tiene el mismo sha256 en dos compilaciones.
Los paquetes de PowerPoint se abrieron con python-pptx y se convirtieron a PDF con
LibreOffice Impress sin ninguna diapositiva en blanco.

El [registro histórico de validaciones](validacion.md) detalla el alcance y los límites.
En aquella comprobación, el `.tex` no se había compilado con una distribución LaTeX
y el `.pptx` no se había abierto en Microsoft PowerPoint. Todos los datos de los
ejemplos eran ilustrativos. Estas notas no certifican que las comprobaciones se
hayan repetido ni que aquellos límites describan por completo la versión actual.
