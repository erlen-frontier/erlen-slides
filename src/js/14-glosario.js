/* ==== 14-glosario.js ==== */
'use strict';
/* ================= glosario propio de la app ================= */
const GUIA_URL = 'https://github.com/erlen-frontier/erlen-slides/blob/main/docs/uso.md';

const GLOSARIO = [
  { g:'Acomodo del texto', items:[
    { t:'Texto fluido', d:'Reparte un solo hilo de texto en dos o tres columnas, como un artículo. Es el diseño para cuando hay mucho que decir: en vez de encoger la letra hasta que quepa, el texto salta a la columna siguiente y conserva un tamaño legible.',
      ej:'Diapositiva → Acomodo del texto → Texto fluido. El número de columnas se elige en el mismo panel.' },
    { t:'Enunciado', d:'Una sola idea, grande y centrada, con aire alrededor. Funciona para conclusiones, transiciones y para el mensaje que quieres que el público recuerde.',
      ej:'Menos de veinte palabras. Si necesitas más, probablemente sea una diapositiva de contenido.' },
    { t:'A todo lo ancho', d:'Estrecha los márgenes laterales al mínimo para que una figura, una tabla o una gráfica ocupen casi toda la diapositiva.',
      ej:'Útil cuando una gráfica con muchos puntos quedaba apretada en el diseño normal.' },
    { t:'Barra lateral', d:'Una franja estrecha con las cifras o condiciones que el público debe tener a la vista, y el contenido principal al lado con todo el ancho restante.',
      ej:'Condiciones de síntesis a la izquierda, resultados a la derecha.' },
    { t:'Comparación', d:'Dos bloques con su propio encabezado de color: antes y después, método A contra método B, control contra tratamiento. Los encabezados se editan haciendo clic sobre ellos.',
      ej:'El lado derecho toma el color de acento del tema, así que se lee como el nuevo.' },
    { t:'Tres columnas y Pasos', d:'Tres ideas en paralelo. En el diseño de pasos cada columna lleva además un número y un título, lo que convierte la diapositiva en una metodología de un vistazo.',
      ej:'Síntesis → Caracterización → Análisis, cada etapa con su descripción debajo.' },
    { t:'Cuadrícula 2×2', d:'Cuatro celdas con título propio. Sirve para cuatro técnicas, cuatro resultados o los cuatro cuadrantes de una matriz de decisión.',
      ej:'DRX, FTIR, SEM y UV-Vis, cada una con lo que aportó.' },
    { t:'Tamaño del texto y márgenes', d:'Dos controles por diapositiva. El tamaño escala todo el cuerpo entre 70 y 140 %; los márgenes laterales se pueden estrechar para ganar ancho. Juntos evitan que el contenido quede reducido en medio de una diapositiva vacía.',
      ej:'El botón Ajustar texto al espacio prueba tamaños y se queda con el mayor que todavía cabe sin desbordarse.' }
  ]},
  { g:'Composición', items:[
    { t:'LaTeX', d:'Un sistema donde describes qué es cada cosa —un título, una ecuación, una tabla— y él decide cómo componerla con reglas tipográficas profesionales. Es la razón de que las fórmulas de un artículo científico se vean como se ven.',
      ej:'Aquí no hace falta escribirlo: la app arma el LaTeX por ti y puedes exportarlo cuando quieras.' },
    { t:'Modo matemático', d:'Todo lo que escribas entre signos de pesos se compone como matemáticas: las variables salen en cursiva, los subíndices se acomodan y los símbolos toman su forma correcta.',
      eq:'E_g = 2.30\\ \\mathrm{eV} \\qquad \\tilde{\\nu} = 1667\\ \\mathrm{cm^{-1}}',
      ej:'Eso de arriba se escribió tecleando  $E_g = 2.30$ eV  y  $\\tilde{\\nu} = 1667$ cm$^{-1}$  dentro de un texto normal. Funciona en títulos, viñetas, pies de figura y rótulos de ejes.' },
    { t:'Beamer', d:'La clase de LaTeX pensada para presentaciones. Cada diapositiva es un "frame" con su título, y las secciones alimentan el índice automáticamente.',
      ej:'Es lo que genera Exportar → Código Beamer: un .tex que compila en Overleaf sin tocar nada.' },
    { t:'Tema', d:'Define de una vez colores, tipografías, barra de título y pie de página. Cambiarlo no toca el contenido, solo su apariencia.',
      ej:'Metropolis para congresos, Sobrio para una defensa, Nocturno para salas con poca luz.' },
    { t:'Caja Beamer', d:'Un recuadro con título y color. El neutro sirve para definiciones, el rojo para advertencias y limitaciones, el verde para ejemplos. El público aprende el código de color en la primera diapositiva.',
      ej:'Insertar → Caja Beamer, y elige el tipo en ⚙ Propiedades.' },
    { t:'mhchem', d:'La extensión que compone reacciones químicas. Los números tras un elemento se vuelven subíndice solos y las cargas se colocan como superíndice.',
      eq:'\\ce{CaCO3(s) ->[\\Delta] CaO(s) + CO2 ^}',
      ej:'La paleta de reacciones la usa por debajo: tú eliges flechas y estados con un clic.' }
  ]},
  { g:'Diagramas SmartArt', items:[
    { t:'Qué es', d:'Diez diagramas listos —proceso, lista, ciclo, jerarquía, pirámide, embudo, radial, Venn, cronología y matriz 2×2— que se arman escribiendo el texto de cada elemento. No hay que dibujar nada: tú das los textos y el diagrama se acomoda solo.',
      ej:'Insertar → Diagrama SmartArt, elige el tipo y escribe los elementos.' },
    { t:'Proceso y Pasos', d:'Etapas encadenadas con punta de flecha. Es el diagrama para una ruta de síntesis o una metodología, donde el orden es lo que importa.',
      ej:'Precursores → Coprecipitación → Envejecimiento → Lavado y secado.' },
    { t:'Ciclo', d:'Etapas que vuelven al inicio, con flechas curvas entre ellas. Para procesos iterativos: sintetizar, caracterizar, analizar, ajustar y volver a empezar.',
      ej:'Los círculos crecen solos si tus textos traen palabras largas.' },
    { t:'Jerarquía y Radial', d:'Un concepto que se abre en ramas, o un centro rodeado de sus propiedades. El primer elemento de la lista es la raíz o el centro; los demás son las ramas.',
      ej:'Caracterización → Estructura (DRX), Composición (FTIR, XPS), Morfología (SEM).' },
    { t:'Pirámide, Embudo y Venn', d:'La pirámide apila niveles de lo específico a lo general; el embudo va reduciendo un conjunto hasta un resultado; el Venn muestra lo que comparten dos o tres conjuntos.',
      ej:'Embudo: 32 condiciones probadas → 8 con fase pura → 3 reproducibles → 1 óptima.' },
    { t:'Cronología y Matriz', d:'La cronología pone hitos sobre una línea de tiempo con los rótulos alternando arriba y abajo; la matriz reparte cuatro cuadrantes con sus ejes.',
      ej:'Cronología para el plan de trabajo; matriz para clasificar por dos criterios.' },
    { t:'Cómo se exporta', d:'El diagrama se dibuja en vectorial, así que sale nítido en el PDF a cualquier escala. En el código Beamer viaja como TikZ real: figuras editables, no imágenes.',
      ej:'Con babel-spanish en Overleaf las palabras largas se parten solas dentro de las formas.' }
  ]},
  { g:'Contenido vivo', items:[
    { t:'Gráfica de datos', d:'Pegas tus columnas de Excel u Origin y se dibuja sola, en vectorial. Reconoce tabuladores, comas, punto y coma y la coma decimal del Excel en español.',
      ej:'La primera columna es el eje X; cada columna siguiente es una serie.' },
    { t:'Espectro apilado', d:'Modo de la gráfica de línea que separa verticalmente varias curvas para compararlas sin que se encimen, con su nombre al final de cada trazo. Es como se comparan difractogramas o espectros IR en la literatura.',
      ej:'Actívalo con "Apilar series con desplazamiento" y ajusta la separación con el deslizador.' },
    { t:'Ajuste lineal', d:'Traza la recta de mínimos cuadrados sobre tus puntos y escribe su ecuación con el coeficiente de determinación. Mide qué fracción de la variación explica la recta.',
      eq:'y = mx + b \\qquad R^{2} = 1 - \\dfrac{\\sum (y_i-\\hat{y}_i)^{2}}{\\sum (y_i-\\bar{y})^{2}}',
      ej:'Con seis patrones de 0 a 10 mg L⁻¹ da m = 0.0565, b = 0.0043 y R² = 0.9998.' },
    { t:'Barras de error', d:'Una columna titulada «±», «error», «sd», «sem» o «desv» no se dibuja como serie: es la incertidumbre de la columna anterior y sale como barra vertical con topes, en pantalla y en el PDF. El eje se ensancha para que la barra quepa entera.',
      ej:'Tres columnas —tiempo, conversión y ±— dan una serie con su incertidumbre en cada punto.', k:'error incertidumbre barra desviacion sd sem sigma repeticiones' },
    { t:'Eje logarítmico', d:'Escala → Eje X o Eje Y logarítmico. Las marcas van por décadas y, si hay ajuste, la recta se calcula sobre el logaritmo: es la linealización de siempre, la que convierte una caída exponencial en una recta. Un cero o un negativo no tienen logaritmo y quedan fuera del dibujo; el editor dice cuántos.',
      eq:'\\log_{10} c = \\log_{10} c_0 - \\dfrac{k}{2.303}\\,t',
      ej:'Una cinética de primer orden en eje log da una recta cuya pendiente es −k/2.303.', k:'logaritmo log decadas cinetica primer orden arrhenius semilog linealizacion' },
    { t:'Gráfica dinámica', d:'Escribes una fórmula con x como variable y cualquier otra letra se convierte en un deslizador que puedes mover mientras presentas: la curva cambia en vivo frente al público.',
      eq:'I\\cdot\\mathrm{gauss}(x,\\,x_0,\\,w/2.3548)',
      ej:'Mover el ancho w muestra el efecto del tamaño de cristalita mejor que explicarlo.' },
    { t:'Parámetro y deslizador', d:'Cada letra distinta de x se vuelve un parámetro con valor, mínimo y máximo. Si fijas el eje Y, mover el deslizador cambia visiblemente la altura de la curva en vez de reescalar el eje.',
      ej:'En el editor: "Fijar el eje Y (para que el deslizador cambie la altura de la curva)".' },
    { t:'Video y GIF', d:'Arranca solo al llegar a la diapositiva, sin sonido y en bucle. Para el PDF se guarda el primer fotograma, así la versión impresa no queda con un hueco.',
      ej:'Ideal para animaciones de simulación o time-lapse de una síntesis. Máximo 12 MB.' },
    { t:'Aparición por pasos', d:'Cualquier bloque puede aparecer en su propio paso, con un efecto de entrada. Los pasos avanzan con la flecha derecha durante la presentación y en el PDF salen todos revelados.',
      ej:'⚙ Propiedades → "Aparecer en su propio paso" y elige el efecto.' }
  ]},
  { g:'Antes de presentar', items:[
    { t:'Revisión', d:'Una pasada por todo el mazo que junta lo que conviene arreglar: contenido que no cabe en el marco, contraste por debajo de lo legible en una sala con luz, figuras sin pie, imágenes con menos píxeles de los que necesita el tamaño al que se proyectan, diapositivas vacías o sin título, secciones sin contenido y signos $ desparejados.',
      ej:'Exportar → Revisar antes de presentar. Cada hallazgo te lleva a su diapositiva de un clic.' },
    { t:'Contraste', d:'La razón entre la luminancia del texto y la del fondo que tiene detrás. Por debajo de 3:1 no se lee en un proyector con luz de sala; 4.5:1 es el mínimo cómodo. La revisión compara cada texto contra el fondo que de verdad tiene, no contra el del papel.',
      ej:'Texto gris claro sobre blanco da 2.3:1 y desaparece en cuanto encienden las luces.' },
    { t:'Resolución al proyectar', d:'Una imagen necesita al menos tantos píxeles como el tamaño en el que se va a ver. Si la insertas a media diapositiva de una de 1280 px, por debajo de unos 600 px de ancho se nota borrosa. Los SVG no cuentan: son vectoriales.',
      ej:'Una captura de pantalla de 400 px estirada a 900 se ve mal en cuanto la proyectas.' }
  ]},
  { g:'Al presentar', items:[
    { t:'Vista de presentador', d:'Una segunda ventana solo para ti, mientras el proyector muestra la presentación: cronómetro, hora del reloj, la diapositiva en pantalla, la que sigue y las notas de esa diapositiva. Se abre con la tecla P al presentar, o desde la flecha del botón Presentar.',
      ej:'Arrastra la ventana a la pantalla de tu computadora y deja el proyector en modo extendido, no duplicado. Si el navegador bloquea la ventana, el panel aparece abajo de la presentación con un aviso.' },
    { t:'Cronómetro', d:'Cuenta el tiempo transcurrido desde que abriste la vista de presentador. Se puede pausar y poner en cero sin salir de la presentación.',
      ej:'Para un examen de grado con 20 minutos de exposición, poner el cronómetro en cero al empezar la primera diapositiva de contenido.' },
    { t:'Notas del orador', d:'El texto que escribes en la pestaña Diapositiva y que nunca se proyecta. Aparecen en la vista de presentador y, con la tecla N, como una franja sobre la presentación.',
      ej:'Sirven para el dato exacto que no cabe en la diapositiva: una constante, una referencia, la respuesta a la pregunta que siempre hacen.' },
    { t:'Lápiz y puntero', d:'La tecla L enciende el lápiz para dibujar sobre la diapositiva, otra vez lo cambia por un puntero luminoso y una tercera lo apaga; C borra los trazos. Los trazos son de la sesión: no se guardan en el proyecto ni salen en el PDF.',
      ej:'Rodear el pico de un difractograma mientras lo explicas, y borrarlo antes de pasar.' },
    { t:'Ir a', d:'Escribir un número durante la presentación, o pulsar G, abre un cuadro para saltar a una diapositiva por su número o por parte de su título.',
      ej:'«¿Puede volver a la de metodología?» — escribes «metod» y Enter.' },
    { t:'Ritmo', d:'Si pusiste minutos previstos, la vista de presentador muestra cuánto deberías llevar hasta esta diapositiva y la diferencia con el cronómetro; pasado medio minuto de retraso, el reloj se pone rojo.',
      ej:'«previsto 8:30 de 20:00  +1:12» quiere decir que vas un minuto largo por encima de lo planeado.' }
  ]},
  { g:'Meter contenido', items:[
    { t:'Arrastrar al lienzo', d:'Sueltas un archivo sobre la diapositiva y se convierte en lo que toca: una imagen en figura, un GIF o un video en bloque de video, un .csv o .tsv en gráfica si los datos son numéricos y en tabla si no, y un .json en el proyecto entero.',
      ej:'Arrastrar el .csv del difractómetro directo del explorador a la diapositiva.' },
    { t:'Pegar', d:'Una captura del portapapeles entra como figura; una tabla copiada de Excel entra como gráfica o como tabla según los datos; algo con \\frac, \\alpha o entre signos de pesos entra como ecuación; una lista con guiones entra como viñetas.',
      ej:'Copias tres columnas de Origin, pegas, y ya está la gráfica.' },
    { t:'Desde un esquema', d:'Pegas tu índice o tu guion en texto plano y se arma la estructura. «# » abre una sección, «## » abre una diapositiva, «- » añade una viñeta y con dos espacios delante la anida.',
      ej:'El índice de la tesis, pegado tal cual, deja las secciones y los títulos puestos.' }
  ]},
  { g:'Trabajar con imágenes', items:[
    { t:'Encuadre', d:'El botón ⛶ de la barra de la figura abre el encuadre: arrastras la imagen, la acercas con la rueda y eliges la proporción. El original se guarda aparte, así que puedes volver a encuadrar sin pérdida o quitar el recorte.',
      ej:'Recortar una micrografía a 1:1 para que quede pareja con las otras tres de la cuadrícula.' },
    { t:'Texto alterno', d:'Una descripción corta de lo que muestra la imagen, para quien no la ve. Es distinta del pie de figura: el pie se proyecta, el texto alterno no. Viaja al archivo imprimible y al PowerPoint.',
      ej:'⚙ Propiedades de la figura → Texto alterno.' },
    { t:'Anchura con guías', d:'Las figuras, gráficas, videos y diagramas llevan una manija en el borde. Al arrastrarla aparecen los márgenes, el centro y las fracciones habituales, y se engancha sola a un cuarto, un tercio, la mitad… o a la anchura de otro bloque de la misma diapositiva.',
      ej:'Dos figuras con la misma anchura quedan iguales sin ajustar números a mano.' }
  ]},
  { g:'Hacerlo tuyo', items:[
    { t:'Color de acento', d:'El color con el que se pintan títulos, viñetas, cajas, diagramas y pie. Cada tema trae el suyo, pero puedes poner el de tu universidad o tu laboratorio. En el .tex sale como \\definecolor más \\setbeamercolor{structure}, que es de donde Beamer saca casi todo el color.',
      ej:'Diseño → Color de acento. Las series de las gráficas no cambian: su paleta está comprobada para contraste y daltonismo.' },
    { t:'Estilo', d:'La combinación guardada de tema, color, tipografía, formato, pie, escudo y datos de portada, con un nombre. Se aplica a cualquier presentación de un clic, y puedes marcar uno para que las nuevas arranquen con él. No guarda contenido.',
      ej:'Guardar «CUCEI azul» una vez y no volver a configurar nada.' },
    { t:'Plantilla de arranque', d:'Presentaciones que ya vienen armadas con sus secciones, sus diapositivas y tiempos sugeridos: defensa de tesis, avance de proyecto, seminario de grupo y clase.',
      ej:'La de defensa trae dieciocho diapositivas: antecedentes, hipótesis, objetivos, metodología, resultados, discusión, conclusiones y agradecimientos.' },
    { t:'Apariencia del editor', d:'Clara, oscura o la del sistema. Solo afecta a la interfaz de Erlen; las diapositivas siguen viéndose con el color de su tema.',
      ej:'El botón ◐ de la barra de arriba. Se recuerda entre sesiones.' }
  ]},
  { g:'La ventana de trabajo', items:[
    { t:'Dónde están las herramientas', d:'Dos disposiciones. «Cinta arriba» es la de fábrica: «Archivo» y las pestañas Inicio, Insertar, Diseño, Diapositiva, Presentar y Vista, más una pestaña con el nombre del bloque que tengas seleccionado, como en las apps de oficina. Lo que necesita un formulario largo (un deslizador, un color, todas las propiedades de un bloque) se abre en el panel de detalles de la derecha, que se cierra con ✕ o Escape. «Panel a la derecha» deja esas propiedades siempre a la vista en un panel lateral con pestañas.',
      ej:'Vista → Herramientas, o Ctrl+Shift+B. La elección se recuerda entre sesiones; Ctrl+F1 pliega la cinta.' },
    { t:'Efectos de entrada', d:'Quince maneras de que un bloque aparezca al presentar, agrupadas como en PowerPoint: discretos (aparecer, surgir), con movimiento (subir, bajar, desde los lados, acercar, alejar, rebote) y de revelado (barrido, cortina, voltear, destacar, dibujar trazo). Cada uno tiene velocidad y retardo. Solo actúan al presentar y respetan «reducir movimiento» del sistema.',
      ej:'«Destacar» da un pulso con el color de acento: sirve para el dato que no quieres que se pierda. En el PDF el paso se conserva, pero el movimiento no: un PDF no anima.' },
    { t:'Transiciones', d:'Once maneras de pasar de una diapositiva a la siguiente: fundido, desplazamiento, empuje, subir, persiana horizontal y vertical, abrir, cerrar, caja y destello. No son un adorno de la app: cada una escribe en el PDF la orden de transición de página de verdad, y los lectores en pantalla completa la respetan.',
      ej:'Fundido es la más segura en un proyector viejo; el destello, para una portada y nada más.' }
  ]},
  { g:'Trabajo de científico', items:[
    { t:'Acabados de los diagramas', d:'Cada SmartArt se puede ver con cuatro pieles, como los montajes de laboratorio: Relleno (cajas macizas con la rampa del acento, lo más legible de lejos), Contorno (solo borde y texto en color, para cuando hay una figura al lado), Editorial (sin cajas: una barra fina de color y la tipografía haciendo la jerarquía) y Relieve (relleno suave con sombra corta). El acabado se resuelve en la propia disposición, así que la pantalla, el PDF en TikZ y el PowerPoint dicen lo mismo. La tinta de cada texto se elige por contraste real contra su fondo, no por un umbral.',
      k:'acabado smartart relleno contorno editorial relieve diagrama piel' },
    { t:'Los dieciséis diagramas', d:'A los diez de siempre —proceso, lista, ciclo, jerarquía, pirámide, embudo, radial, Venn, cronología y matriz 2×2— se suman: Espina (Ishikawa: el efecto a la derecha y las causas colgando del eje), Pila de capas (un dispositivo o una película de canto, con el espesor al lado), Cronograma (barras sobre una escala; el periodo se lee del detalle, «2–5»), Mapa lateral (un centro y ramas, con subniveles marcables), Matriz 3×3 y Contraste (dos columnas enfrentadas con encabezado). En el mapa y en el contraste, el botón ⤷ de cada elemento lo marca como sub.',
      k:'espina ishikawa capas cronograma gantt mapa lateral matriz 3x3 contraste diagramas' },
    { t:'Los veintidós acomodos de página', d:'Además de los trece anteriores: Figura a sangre (la imagen llena la diapositiva y el texto va en una banda oscura encima; en el PDF sale a tamaño de papel con TikZ), Figura con pie ancho (la figura ocupa dos tercios y el pie va al lado con aire), Zigzag (dos filas alternadas figura-texto y texto-figura), Pantalla partida (dos mitades a sangre, sin marcos), Tres filas (bandas horizontales con rótulo a la izquierda), Cuadrícula 3×2 (seis celdas rotuladas), Dato grande (una cifra enorme con su rótulo) y Cita destacada (una cita con su autor). Todos exportan a Beamer y ninguno pierde bloques al cambiar de acomodo.',
      k:'acomodo plantilla pagina sangre pie ancho zigzag partida filas rejilla dato cita' },
    { t:'Esqueleto de artículo', d:'Exportar → Esqueleto de artículo (.tex). Las diapositivas de sección son secciones, cada afirmación es una subsección, tus notas son la prosa, las figuras y tablas van con sus pies, las ecuaciones como equation, el respaldo como material complementario y las referencias numeradas al final. Usa el mismo preámbulo que ya compila para la charla, sin overlays.', k:'articulo paper esqueleto exportar tex' },
    { t:'Ramas de la charla', d:'Diseño → Ramas. Una rama es un nombre, las diapositivas que no van, y si quieres un nivel y un título. Figuras, referencias y texto son los mismos: corriges una vez. Con una rama activa, presentar, el PDF, el PowerPoint y el artículo dejan fuera lo que no va; en la tira esas diapositivas se ven atenuadas con ⊘.', k:'ramas rama version variante comite corta' },
    { t:'Memoria de diapositivas', d:'Inicio → Memoria (o «dónde expliqué…» al asistente). Busca por título, texto y notas en la charla abierta y en las guardadas en este navegador, con la normalización del asistente y los sinónimos del glosario. «Traer» copia la diapositiva con sus datos, sus referencias y sus glosas.', k:'memoria buscar charlas reutilizar' },
    { t:'La charla en el tiempo', d:'Ctrl+Shift+T. Cada diapositiva es tan ancha como sus minutos previstos, con el guion debajo; arrastra el borde derecho para cambiarlos. Con un objetivo en minutos te dice cuánto te pasas o te sobra, y la barra azul es lo medido en tu último ensayo.', k:'linea de tiempo minutos ritmo ensayo' },
    { t:'Accesibilidad', d:'Diseño → Accesible. Paleta Okabe-Ito por omisión en las gráficas (segura con protanopia, deuteranopia y tritanopia; también en el PDF y el PowerPoint), texto alterno de las figuras desde el pie con un botón, aviso de gráficas sin pie y tablas sin encabezado, contraste de la revisión, MathML en las ecuaciones y subtítulos al presentar.', k:'accesibilidad daltonismo okabe alt contraste mathml' },
    { t:'Niveles y glosario', d:'Diseño → Público: comité, congreso o divulgación. Un término marcado en el texto como {{perovskita}} lleva su explicación en una frase (Diseño → Glosario): en divulgación sale al pie de la diapositiva y como nota al pie en el PDF; en congreso solo al pasar el cursor; para el comité no estorba. Un bloque puede marcarse «solo comité» o «solo divulgación» en su panel y aparece únicamente en ese nivel, también al exportar.', k:'nivel publico comite congreso divulgacion glosa glosario' },
    { t:'Las preguntas que te van a hacer', d:'Diapositiva → Preguntas. A partir de la técnica de cada gráfica (DRX, FTIR, UV-Vis, TGA, Raman, CV), los ajustes, las tablas, las ecuaciones y las palabras de tus títulos, propone las preguntas de un sinodal. Son plantillas, no adivinación. «Preparar respuesta» crea una diapositiva de respaldo con la pregunta de título; las abiertas quedan en rojo. Los respaldos salen con la tecla Q al presentar.', k:'preguntas sinodal defensa respaldo preparar respuesta' },
    { t:'Cerrar el ciclo y lo aprendido', d:'Al terminar una presentación de más de tres minutos, la app ofrece marcar en cada diapositiva si preguntaron, hubo caras de duda o fluyó. Se guarda en este navegador y, con varias charlas, «Lo que aprendiste» agrupa por título y señala qué explicación confunde de manera consistente, con una sugerencia concreta.', k:'cierre ciclo aprendido retroalimentacion charlas historial' },
    { t:'Subtítulos', d:'Al presentar, la tecla S muestra tus notas como subtítulos abajo; pulsada otra vez, el texto en otro idioma que escribas en Diapositiva → Subtítulos. Si hay un párrafo por paso, cambian con las viñetas. Todo local, sin traducción automática.', k:'subtitulos bilingue accesibilidad tecla s' },
    { t:'Cuéntamelo primero', d:'Hablas (reconocimiento de voz del navegador, si lo tiene) o pegas lo que dirías, y la app saca las afirmaciones: lo que tiene verbo y dice qué pasa, sin muletillas. Cada una se vuelve el título de una diapositiva y la oración completa queda en sus notas. Luego se abre la vista de argumento.', k:'cuentamelo voz dictar hablar afirmaciones' },
    { t:'Figura viva: capas, antes/después, procedencia y paquete', d:'En el panel de una gráfica: «Revelar por capas» la construye al presentar (ejes → cada serie → el ajuste → el punto que importa, con su rótulo) y cada capa lleva lo que dices, que aparece en la vista de presentador; en el PDF son overlays reales de Beamer con los ejes fijados. «Antes y después» guarda un segundo estado de la gráfica o de la imagen que entra como paso, con los ejes abarcando los dos y una animación en pantalla. La procedencia registra de qué archivo salió, cuándo, cuántas filas y una huella; si vuelves a soltar un archivo con el mismo nombre, la app ofrece actualizar todas las gráficas que lo usan; el sello puede ir bajo la figura y en el PDF. El paquete reproducible es un .zip con datos.csv, figura.tex (pgfplots standalone) y figura.png.',
      k:'capas antes despues procedencia huella paquete reproducible csv pgfplots figura viva' },
    { t:'Derivación guiada', d:'En el panel de una ecuación, «Mostrarla paso a paso»: escribes cada paso tal como queda y lo que cambió respecto al anterior se pinta del color de acento, con el porqué al lado. Al presentar, cada paso entra con la flecha; en el .tex es un align con \\visible por celda, así que se revela igual en el PDF.',
      k:'derivacion paso a paso ecuacion pasos resaltar' },
    { t:'Vista de argumento y modo esqueleto', d:'La charla como cadena de afirmaciones (Ctrl+Shift+A): cada renglón es el título de una diapositiva escrito como frase con verbo, y a su lado la evidencia que lo sostiene —gráfica, figura, tabla, ecuación—. Lo que no afirma nada o no tiene evidencia se ve como hueco. «Leerlo de corrido» junta las afirmaciones en un párrafo: si no se sigue, la charla tampoco. El modo esqueleto («Empezar por el argumento») deja el lienzo cerrado hasta que hay tres afirmaciones con verbo; siempre se puede saltar.',
      k:'argumento afirmacion evidencia esqueleto aserción estructura hilo' },
    { t:'Tutor de diseño', d:'Cuando la app acomoda algo (el Diseñador, al poner una figura, al escribir un título de sección) te dice el porqué en una tarjeta. Seis reglas: título que dice la conclusión, toda figura con pie, una figura por diapositiva, poco texto junto a una figura, seis viñetas o menos, lo que dices va en las notas. Cuando una la aplicas tú solo tres veces, deja de explicártela; lo que arregla la app no cuenta. Se apaga o se silencia por regla.',
      k:'tutor reglas lecciones aprender diseño andamiaje' },
    { t:'Carga cognitiva', d:'Tres indicadores por diapositiva con su arreglo: redundancia (cuánto de lo que dirás ya está escrito, comparando el texto en pantalla con tus notas), atención dividida (figura de un lado y mucho texto del otro, tablas grandes, varias figuras) y señalización (si el título o las negritas dicen qué mirar). Vienen de los principios de Mayer y Sweller. La tira de arriba pinta toda la charla en verde, ámbar o rojo.',
      k:'carga cognitiva redundancia atencion dividida senalizacion mayer sweller' },
    { t:'Recorrido del ojo', d:'Una capa sobre la diapositiva (Ctrl+Shift+M) con el orden estimado en que se mira: círculos numerados unidos por una línea. Se calcula con tamaño, contraste, posición, color y tipo de elemento; es una estimación, no una medición. Si tu evidencia principal no está entre lo primero, la leyenda te lo dice.',
      k:'mirada ojo recorrido saliencia jerarquia visual' },
    { t:'Estilo de cita y bibliografía automática', d:'La marca de la cita nunca se teclea: se calcula. Hay cuatro estilos —numérico [1], superíndice de la ACS, autor-año (Kojima et al., 2009) y autor-número— y al cambiar de estilo se reescribe la presentación entera. Cada referencia tiene una clave tipo BibTeX (kojima2009): escribes [@kojima2009] en cualquier texto, viñeta o pie y ahí sale la marca; varias juntas con [@una; @otra]. Si insertas una cita a la mitad de la charla, todo se renumera solo. La diapositiva de referencias aparece con la primera cita, se ordena según el estilo (por aparición o alfabética), se parte en varias si pasa de ocho y desaparece si te quedas sin citar nada.',
      k:'cita citas estilo numerico superindice autor ano bibliografia automatica clave renumerar acs apa ieee' },
    { t:'Zotero', d:'Conecta la app con tu biblioteca de Zotero para no volver a teclear lo que ya tienes capturado. Hay tres vías: la nube (api.zotero.org, con una clave de solo lectura que tú creas en zotero.org/settings/keys y que se queda en tu navegador), Zotero de escritorio (127.0.0.1:23119, sin clave y sin internet, activando «Allow other applications on this computer to communicate with Zotero») y por archivo (lo que exportes en CSL JSON, BibTeX o RIS, arrastrándolo a la ventana). Las que vienen de Zotero quedan enlazadas y se pueden volver a pedir con «Actualizar las que ya tengo».',
      k:'zotero biblioteca referencias gestor clave api csl bibtex ris' },
    { t:'Referencias y citas', d:'Pegas un DOI y se consulta Crossref, o pegas una entrada BibTeX y se lee sola. La referencia queda guardada en la presentación, la cita corta aparece al pie de las diapositivas donde la uses —con el nombre de la revista abreviado como en un artículo— y se numera por orden de aparición. Al exportar, el .tex lleva una diapositiva de referencias con la lista completa.',
      ej:'El artículo «Ten simple rules for effective presentation slides» señala que la gente deja las citas para el final y luego pierde de dónde salió cada figura; por eso están aquí, en el momento de ponerla.' },
    { t:'Respaldo para preguntas', d:'El apéndice de la charla. Una diapositiva marcada como respaldo no cuenta en la numeración ni en el tiempo previsto, y no se llega a ella avanzando: al presentar, la tecla Q abre un índice con miniaturas y un filtro para saltar a la que responde la pregunta. En el .tex van tras \\appendix, que es como Beamer deja de contarlas.',
      ej:'El control que no cuentas, el ajuste que te van a pedir, la muestra que no salió.' },
    { t:'Ajustar la charla a un tiempo', d:'Le dices los minutos que te dan y propone qué mandar al respaldo hasta que quepa. Ordena por lo que cuesta menos perder: pesa el tipo de contenido, si escribiste notas, y dónde cae en su sección; nunca toca la portada, el índice, las secciones ni lo que marques como imprescindible. No borra nada.',
      ej:'La charla de 45 minutos que hay que dar en 12, que es el caso de todos los congresos.' },
    { t:'Adaptar una figura de artículo', d:'Arrastras sobre la figura para marcar sus paneles, tapar la leyenda o la serie que no vas a comentar, y señalar con flecha, círculo o recuadro el dato del que hablas. De ahí sale una diapositiva por panel, cada una con su letra, su pie y el «modificado de» ya citado. Las tapas y las señales salen al PDF como TikZ sobre la imagen, no como captura.',
      ej:'Lo recomienda el MIT Comm Lab: ante una figura densa el público «salta a intentar entenderla» y deja de escucharte.' }
  ]},
  { g:'Figuras e imágenes', items:[
    { t:'Ideas de diseño', d:'El Diseñador mira la figura que acabas de poner —su forma, sus colores dominantes, hacia dónde tira el motivo y cuánto ruido tiene— y también cuánto texto hay en la diapositiva. Con eso propone acomodos completos, y cada miniatura es tu diapositiva de verdad ya cambiada, no un dibujo. El análisis ocurre en tu navegador: no se manda nada a ningún servidor.',
      ej:'Si el motivo tira a la derecha, propone el texto a la izquierda para que las miradas no se crucen. Se abre solo al poner una figura, y eso se puede desactivar.' },
    { t:'Estilo de figura', d:'Forma (esquinas suaves, círculo, hexágono, bordes difuminados), marco (fino, grueso, del color de acento o tipo foto), sombra y filtro de color (blanco y negro, duotono, más contraste, aclarada). En pantalla se ve al instante; al exportar, el efecto se cuece en el archivo, así que el PDF sale idéntico sin paquetes raros de LaTeX.',
      ej:'El duotono usa el color de acento: pone un montón de fotos de fuentes distintas en la misma familia visual. La opción «aclarada» sirve para escribir encima.' },
    { t:'Galería de figuras', d:'De dos a seis figuras con su letra (a), (b), (c) y un pie común, en cuadrícula, tira o mosaico. En el .tex sale como una figura con minipages —lo que se hace en un artículo— y no necesita el paquete subcaption.',
      ej:'Cuatro micrografías a distintos aumentos, o la misma muestra a 0, 6 y 24 horas en modo tira.' },
    { t:'Iconos y formas', d:'Noventa y cinco iconos vectoriales y treinta formas y llamadas —flechas, bocadillos, cintas, corchetes y marcos de encuadre— dentro de la misma biblioteca del montaje, así que se colocan, se pintan y salen a TikZ igual que el material de laboratorio. Muchas formas admiten una frase corta dentro.',
      ej:'Un marco de esquinas para señalar la zona interesante de una micrografía, o un bocadillo con la pregunta que quieres dejar en el aire.' }
  ]},
  { g:'Moverte por la presentación', items:[
    { t:'Asistente', d:'Un ayudante dentro de la app, en Ctrl+J o en el botón ✦. Le escribes con tus palabras lo que quieres hacer y él lo hace, o te explica cómo funciona algo y te resalta el control en pantalla. También revisa la presentación entera y te acompaña paso a paso en las tareas largas. No manda nada a internet: conoce el catálogo de lo que la app sabe hacer y empareja tu frase contra él.',
      ej:'«ponme el tema oscuro», «añade un matraz Erlenmeyer», «¿qué le falta a mi presentación?», «acompáñame paso a paso».' },
    { t:'Ir a / hacer', d:'Con Ctrl+K se abre un campo donde escribes y encuentras las dos cosas a la vez: diapositivas por su texto y acciones por su nombre. Las flechas mueven la marca y Enter ejecuta.',
      ej:'Escribir «tauc» salta a la diapositiva que lo menciona; escribir «palatino» cambia la tipografía.' },
    { t:'Buscar y reemplazar', d:'Ctrl+F recorre títulos, subtítulos, viñetas, celdas de tabla, cajas, citas, pies de figura, textos de los diagramas y notas del orador. Por omisión ignora acentos y mayúsculas.',
      ej:'Corregir un nombre mal escrito en cuarenta diapositivas de una vez; el reemplazo se puede deshacer.' },
    { t:'Vista de clasificador', d:'Con Ctrl+G o el botón ⊞ de abajo, todas las diapositivas se ven a la vez en una rejilla, agrupadas por sección. Se reordenan arrastrando y se marcan varias para duplicarlas o borrarlas. Es la vista para revisar la estructura completa.',
      ej:'Antes de una defensa, para comprobar que el orden y los tiempos cuadran.' },
    { t:'Secciones en la tira', d:'Las diapositivas se agrupan bajo la sección a la que pertenecen y la sección se pliega con el triángulo, para no perderse en presentaciones largas.',
      ej:'Con seis secciones y cuarenta diapositivas, plegarlas deja la estructura completa a la vista.' },
    { t:'Selección múltiple', d:'Ctrl+clic marca diapositivas sueltas y Mayús+clic marca un tramo; arriba aparecen los botones para duplicarlas o eliminarlas de golpe. Esc quita la marca.',
      ej:'Marcar las cinco de resultados y duplicarlas para probar otro orden.' }
  ]},
  { g:'Tipografía', items:[
    { t:'Latin Modern', d:'La letra de fábrica de LaTeX, la que Knuth dibujó para TeX (Computer Modern) puesta al día. Si un artículo se compuso en LaTeX sin cambiar la tipografía, está en esta letra. Va dentro de la app, así que la pantalla y el PDF coinciden.',
      ej:'Diseño → Tipografía → Latin Modern. En el .tex es \\usepackage{lmodern}.' },
    { t:'Times y Palatino', d:'TeX Gyre Termes y TeX Gyre Pagella, los clones libres de Times y Palatino. Times es la que piden casi todas las plantillas de revista; Palatino es más ancha y descansada, la típica de tesis y libros de química.',
      ej:'En el .tex son \\usepackage{mathptmx} y \\usepackage{mathpazo}.' },
    { t:'Helvetica y New Century', d:'TeX Gyre Heros clona Helvetica, la que Elsevier y ACS piden para los rótulos de las figuras; TeX Gyre Schola clona New Century Schoolbook, de trazo grueso y muy legible de lejos, la de Physical Review.',
      ej:'Helvetica en las diapositivas hace juego con los ejes de las gráficas de la revista.' },
    { t:'STIX Two', d:'La diseñaron entre AIP, APS, ACS, IEEE y Elsevier justo para publicación científica: cubre todos los símbolos matemáticos y químicos que se necesitan.',
      ej:'Buena elección si la presentación lleva muchas fórmulas y quieres que texto y símbolos casen.' },
    { t:'Matemáticas de la familia', d:'Paquetes como mathptmx o mathpazo cambian también las ecuaciones, no solo el texto. En pantalla las fórmulas siempre se ven con Computer Modern (es lo que dibuja KaTeX), así que si quieres que el PDF salga idéntico a la pantalla, desactiva esa casilla y solo cambiará el texto.',
      ej:'Con la casilla apagada, Times usa tgtermes: texto Times, ecuaciones Computer Modern.' },
    { t:'IfFileExists', d:'La orden de LaTeX que carga un paquete solo si está instalado. Erlen la usa en los paquetes que pueden faltar, de modo que el .tex compila en cualquier instalación y en Overleaf toma la tipografía buena.',
      ej:'\\IfFileExists{stix2.sty}{\\usepackage{stix2}}{\\usepackage{mathptmx}}' }
  ]},
  { g:'Pie de página', items:[
    { t:'Plantilla del pie', d:'En Beamer el pie se elige con \\setbeamertemplate{footline}[…]. Aquí están las mismas opciones: el que trae el tema, solo el número, una línea de texto a lo ancho, o dos y tres celdas —los pies que Beamer llama «split» e «infolines»— y ninguno.',
      ej:'Para una defensa de tesis suelen pedirse tres celdas: programa, sección actual y número de diapositiva.' },
    { t:'Insert', d:'Cada celda muestra un dato que Beamer inserta solo en cada diapositiva: autores, título, subtítulo, institución, fecha, sección actual, número o número/total. Son los \\insertshortauthor, \\insertsection y \\insertframenumber del original.',
      ej:'Celda 1: autores · Celda 2: sección actual · Celda 3: número / total.' },
    { t:'Piezas entre llaves', d:'En el texto libre y en la línea del pie, lo que va entre llaves se sustituye en cada diapositiva. Sirven {autor}, {titulo}, {tituloCorto}, {subtitulo}, {institucion}, {fecha}, {seccion}, {leyenda}, {n} y {N}. Al exportar se convierten en el insert de Beamer que les toca.',
      ej:'«CUCEI · {seccion} · {n}/{N}» se ve como «CUCEI · Síntesis y caracterización · 7/24».' },
    { t:'Fondo y línea', d:'El fondo puede ser transparente, un tono tenue del color de acento, el acento sólido o la barra del tema; encima se puede poner una línea fina o de acento. Los colores salen de la tabla del tema, así que la pantalla y el PDF de LaTeX coinciden.',
      ej:'Tenue con línea de acento se lee bien sin competir con el contenido.' },
    { t:'Portada y secciones', d:'Beamer declara esas diapositivas como [plain], y una diapositiva plain no lleva pie. Si pides que el pie aparezca ahí, Erlen las exporta sin [plain].',
      ej:'Útil cuando el comité pide el folio en todas las páginas, portada incluida.' }
  ]},
  { g:'Notas del orador', items:[
    { t:'Editor de notas', d:'Una ventana con la nota a la izquierda y su vista previa a la derecha, y flechas para recorrer las diapositivas sin cerrarla. Una línea que empieza con «- » se vuelve viñeta, y entre signos de pesos se componen matemáticas.',
      ej:'Diapositiva → Notas del orador → Editor de notas.' },
    { t:'Minutos previstos', d:'El tiempo que planeas dedicar a cada diapositiva. Se suma en un total, aparece en la miniatura y en la vista de presentador se compara con el cronómetro para avisarte si vas atrasado.',
      ej:'Para 20 minutos de exposición: 1 min por diapositiva de contenido y 2 en las de resultados.' },
    { t:'Notas en el PDF', d:'Beamer puede imprimirlas. «Páginas aparte» intercala una página de notas después de cada diapositiva (\\setbeameroption{show notes}); «segunda pantalla» hace cada página del doble de tamaño, con la diapositiva de un lado y las notas del otro, que es lo que leen programas como pdfpc.',
      ej:'Para ensayar en papel conviene «páginas aparte»; para proyectar con dos pantallas, «segunda pantalla · derecha».' },
    { t:'Guion imprimible', d:'Una hoja tamaño carta con la miniatura de cada diapositiva, sus notas y el tiempo previsto y acumulado. Es el equivalente a las note pages de Beamer, pero sin salir de la app.',
      ej:'Exportar → Guion del orador, o el botón del editor de notas.' }
  ]},
  { g:'Identidad institucional', items:[
    { t:'Escudo o logotipo', d:'Una imagen que se coloca sola en la portada —centrada sobre el título o en la esquina superior— y, si lo pides, al pie de todas las diapositivas de contenido. Se sube una vez en la pestaña Diseño.',
      ej:'Un PNG con fondo transparente se ve bien sobre cualquier tema; un SVG además no pierde nitidez al proyectar.' },
    { t:'Leyenda del pie', d:'Una línea discreta abajo a la izquierda, en todas las diapositivas de contenido. Para el programa, la dependencia o el evento.',
      ej:'«Maestría en Ciencias en Química · CUCEI · Universidad de Guadalajara».' },
    { t:'Cómo viaja al .tex', d:'El logotipo se descarga junto con las figuras, con el nombre logo-erlen, y el código lo coloca en la portada y al pie. Si aún no subes el archivo a Overleaf, el documento compila igual y simplemente no aparece.',
      ej:'Exportar → Descargar figuras trae también el logotipo; súbelo a Overleaf con ese nombre.' }
  ]},
  { g:'Mover y ordenar', items:[
    { t:'Asa de arrastre', d:'El punteado ⠿ de la barra del bloque. Arrastrando desde ahí el bloque se reacomoda dentro de la diapositiva, salta de columna, o se va a otra diapositiva si lo sueltas sobre una miniatura de la izquierda. Funciona con ratón y con el dedo.',
      ej:'Una línea punteada muestra dónde va a caer el bloque antes de soltarlo.' },
    { t:'Mover a…', d:'El botón ⇥ de la barra del bloque abre una lista con las diapositivas y sus zonas. Es la vía cómoda en el teléfono o cuando el destino está lejos en la tira.',
      ej:'Mover una tabla de la diapositiva 4 a la columna 2 de la 11 sin arrastrar por toda la tira.' },
    { t:'Historial ligero', d:'Deshacer guarda 150 pasos, pero las imágenes y los videos se guardan una sola vez y los pasos solo los mencionan. Por eso trabajar con figuras pesadas no llena la memoria del navegador.',
      ej:'Doce ediciones sobre una diapositiva con una imagen de 600 kB ocupan menos de 1 MB, no 7.' }
  ]},
  { g:'Exportación', items:[
    { t:'Folleto', d:'La versión impresa para repartir: 2, 3 o 6 diapositivas por hoja. Las de 2 y 3 llevan renglones al lado para que el comité anote mientras escucha.',
      ej:'Exportar → Folleto para repartir. Se abre en el navegador y se imprime como PDF.' },
    { t:'Guardar en un archivo', d:'El autoguardado vive dentro del navegador y se pierde si limpias los datos del sitio. Con permiso del navegador, Erlen escribe además en un .json del disco y lo mantiene al día cada vez que guardas.',
      ej:'Archivo → Guardar en un archivo del disco. El indicador de arriba muestra ⤓ mientras está activo.' },
    { t:'PowerPoint (.pptx)', d:'El archivo se arma dentro de la app, sin subir nada. Los textos, las viñetas y las tablas quedan editables en PowerPoint; las ecuaciones, gráficas y diagramas van como imagen nítida, porque no tienen equivalente. Las notas del orador también viajan.',
      ej:'Cuando el congreso pide el archivo en PowerPoint y no acepta PDF.' },
    { t:'Proyecto a prueba de fallos', d:'Al abrir un .json, Erlen lo revisa: repara diseños o bloques que no reconoce, empareja las filas de las tablas y repone los identificadores repetidos. Si algo se ajustó, lo dice en una lista en vez de quedarse a medias.',
      ej:'Un proyecto guardado con una versión anterior se abre igual y te explica qué cambió.' },
    { t:'pgfplots', d:'El paquete de LaTeX que dibuja gráficas vectoriales con la misma tipografía del documento. Tus gráficas viajan al .tex como código real, no como imágenes: se editan, escalan sin pixelarse y se ven parte del texto.',
      ej:'Cambiar un color o un rótulo en Overleaf es editar una línea, no rehacer la figura.' },
    { t:'booktabs', d:'El estilo de tabla científica: solo líneas horizontales y de tres grosores. Las líneas verticales no se usan en composición científica.',
      ej:'Las tablas que insertes ya salen con este estilo, en pantalla y en el .tex.' },
    { t:'multicol', d:'El paquete que reparte el texto en columnas dentro de una página. Es lo que usa el diseño de texto fluido al exportar a Beamer.',
      ej:'Tu diapositiva de dos columnas de texto sale en el .tex como un entorno multicols.' },
    { t:'Proyecto .json', d:'Un respaldo completo de la presentación: diapositivas, datos de las gráficas, imágenes y video. Sirve para pasar el trabajo a otro dispositivo o guardarlo fuera del navegador.',
      ej:'El guardado automático vive en este navegador; el .json es tu copia portátil.' },
    { t:'Formato 16:9 y 4:3', d:'La proporción de la diapositiva. Panorámica para proyectores y pantallas actuales; clásica para salas con proyector antiguo o pantallas cuadradas.',
      ej:'Se cambia en Diseño y toda la presentación se reajusta.' }
  ]}
];

function renderGlosario() {
  const cont = h('div');
  cont.append(h('p', { class: 'hint', style: 'margin:0 0 14px;font-size:13px' },
    'Los términos de esta app. Para el vocabulario de las técnicas —Bragg, Scherrer, PLS, ANOVA, Tauc y demás— abre la ',
    h('a', { href: GUIA_URL, target: '_blank', rel: 'noopener', style: 'color:var(--acc);font-weight:600' }, 'guía de caracterización'),
    ', que trae 84 términos con su ecuación y un ejemplo resuelto.'));
  GLOSARIO.forEach(gr => {
    cont.append(h('span', { class: 'panel-label', style: 'display:block;margin:16px 0 9px' }, gr.g));
    gr.items.forEach(it => {
      const card = h('div', { class: 'glo' });
      card.append(h('b', null, it.t));
      card.append(h('p', null, it.d));
      if (it.eq) card.append(h('div', { class: 'glo-eq', html: kStr(it.eq, true) }));
      if (it.ej) card.append(h('p', { class: 'glo-ej' }, it.ej));
      cont.append(card);
    });
  });
  return cont;
}


