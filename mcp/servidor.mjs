#!/usr/bin/env node
/* SPDX-License-Identifier: AGPL-3.0-only */
/* Servidor MCP de Erlen Slides: deja que un asistente de IA cree, edite,
   revise y exporte presentaciones con el mismo motor que el editor.

     npm ci && npm run build
     node mcp/servidor.mjs          (lo arranca el cliente MCP, por stdio)

   Habla MCP sobre stdio (JSON-RPC 2.0, un mensaje por línea) sin dependencias
   nuevas: el protocolo que hace falta aquí son cinco métodos. Nada se escribe
   en stdout salvo los mensajes del protocolo; los diagnósticos van a stderr.
   Documentación: docs/mcp.md. */
import {createInterface} from 'node:readline';
import * as M from './motor.mjs';
import * as N from './navegador.mjs';
import {archivos as archivosExtension} from './extensiones.mjs';
import {pathToFileURL} from 'node:url';
import {basename} from 'node:path';

const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCCIONES = `Erlen Slides es un editor de presentaciones científicas con acabado LaTeX/Beamer. Estas herramientas trabajan sobre proyectos JSON de la carpeta de trabajo del usuario, que después se abren en el editor.
Flujo recomendado: guia_formato (una vez por conversación) → crear_presentacion con todas las diapositivas (o agregar_diapositivas por partes) → revisar_presentacion → vista_previa (el mosaico sin «diapositiva» enseña toda la charla) → corregir lo que se desborde → exportar_presentacion.
Moléculas: un bloque estruct con «smiles» (o «archivo_mol» para un .mol/.sdf) da una estructura vectorial y editable. Si el SMILES lo escribiste tú y no el usuario, compara la fórmula y la masa molar de la respuesta con la molécula que se pidió antes de seguir.
Datos: si el usuario tiene archivos de su equipo (XRD, FTIR, UV-Vis, TGA, Raman, CV, CSV), usa un bloque chart con «archivo_datos»: la técnica, los ejes y la procedencia salen solos.
Reglas: no inventes datos, cifras ni referencias. Lo que no venga del usuario se marca como ilustrativo en el pie y en las notas. Las referencias solo se añaden si el usuario las da o están verificadas.
Cada cambio queda en el historial: deshacer lo revierte. Las diapositivas se numeran desde 1; los bloques se identifican por su id (ver_presentacion).`;

/* Esquemas sin «type» en lista: algunos clientes solo aceptan un tipo por
   propiedad, así que las alternativas van con anyOf. */
const archivo = {type: 'string', description: 'Proyecto JSON dentro de la carpeta de trabajo, p. ej. «tesis» o «grupo/avance.json»; «.json» es opcional.'};
const diapositiva = {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}], description: 'Número de diapositiva (desde 1) o su id.'};
const bloque = {type: 'object', additionalProperties: true, required: ['tipo'], properties: {tipo: {type: 'string', description: 'text, bullets, math, chem, estruct, table, chart, func, smart, bblock, teorema, quote, code, image, refs, spacer…'}},
  description: 'Un bloque: {"tipo": "<tipo>", ...propiedades} (guia_formato las lista). Imagen local: {"tipo":"image","archivo":"figs/sem.png","caption":"…"}. Datos de un equipo: {"tipo":"chart","archivo_datos":"datos/xrd.xy","caption":"…"}. Molécula: {"tipo":"estruct","smiles":"CC(=O)Oc1ccccc1C(=O)O","caption":"Ácido acetilsalicílico"}.'};
const zonas = {type: 'array', items: {type: 'array', items: bloque}, description: 'Una lista de bloques por zona, en orden («twocol» tiene 2 zonas, «cuadricula» 4…). Reemplaza el contenido de esas zonas.'};
const encabezados = {type: 'array', items: {type: 'string'}, description: 'Encabezados de zona en los diseños que los usan: comparacion, partida, filas, rejilla6, tresfig (letras de panel), objetivos; en «dato» son [cifra, rótulo] y en «cita» [autor o fuente].'};
const propsDiapositiva = {
  diseno: {type: 'string', description: 'Id de diseño (guia_formato): content, blanco (sin título ni pie: lienzo libre), titular, twocol, section, enunciado, dato, cuadricula… Por omisión «content».'},
  titulo: {type: 'string', description: 'Mejor una frase con la conclusión que un rótulo («El pH 10 da la fase más pura», no «Resultados»).'},
  notas: {type: 'string', description: 'Notas del orador: lo que se dice, no lo que se lee.'},
  minutos: {type: 'number', exclusiveMinimum: 0, description: 'Tiempo previsto para esta diapositiva.'},
  zonas, encabezados,
  division: {type: 'number', minimum: 15, maximum: 85, description: 'Solo twocol/barra: % de anchura de la primera columna.'},
  columnas: {type: 'integer', minimum: 2, maximum: 3, description: 'Solo flujo: 2 o 3 columnas.'}
};
const diapositivaNueva = {type: 'object', properties: propsDiapositiva};
const soloLectura = {readOnlyHint: true, openWorldHint: false};
const cambia = {readOnlyHint: false, destructiveHint: false, openWorldHint: false};
const borra = {readOnlyHint: false, destructiveHint: true, openWorldHint: false};

const HERRAMIENTAS = [
  {name: 'guia_formato', title: 'Guía del formato',
    description: 'Diseños de diapositiva, temas, tipos de bloque con sus propiedades por omisión, clases de gráficas, SmartArt y teoremas, y las convenciones de TeX, mhchem y datos. Consúltala antes de construir.',
    inputSchema: {type: 'object', properties: {}}, annotations: soloLectura,
    run: async () => ({...(await M.guia()), convenciones: CONVENCIONES})},
  {name: 'listar_presentaciones', title: 'Listar presentaciones',
    description: 'Proyectos de Erlen Slides de la carpeta de trabajo, del más reciente al más antiguo.',
    inputSchema: {type: 'object', properties: {}}, annotations: soloLectura,
    run: async () => M.listar()},
  {name: 'listar_ejemplos', title: 'Listar ejemplos',
    description: 'Los doce ejemplos editables (datos ilustrativos) que sirven de punto de partida: calibración, cinética, defensa de tesis, journal club, reunión de laboratorio…',
    inputSchema: {type: 'object', properties: {}}, annotations: soloLectura,
    run: async () => M.ejemplos()},
  {name: 'crear_presentacion', title: 'Crear presentación',
    description: 'Crea un proyecto con portada y, si se pasan, todas sus diapositivas en una sola llamada; o una copia de un ejemplo (desde_ejemplo). No sobrescribe salvo que se pida, y entonces la versión anterior queda en el historial.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo, titulo: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string', description: 'Id de tema (guia_formato), p. ej. metropolis, revista, catedra, marino, nocturno.'},
      aspecto: {type: 'string', enum: ['169', '43']}, acento: {type: 'string', pattern: '^#[0-9a-fA-F]{6}$', description: 'Color de acento #RRGGBB opcional.'},
      diapositivas: {type: 'array', items: diapositivaNueva, description: 'Diapositivas que van tras la portada. O entran todas o ninguna.'},
      desde_ejemplo: {type: 'string', description: 'Id de un ejemplo de listar_ejemplos.'}, sobrescribir: {type: 'boolean'}}},
    annotations: cambia, run: M.crear},
  {name: 'ver_presentacion', title: 'Ver presentación',
    description: 'Esquema de la presentación: metadatos, minutos, y cada diapositiva con su diseño, título, zonas y un resumen de cada bloque con su id. Con «diapositiva» devuelve esa diapositiva completa; con completo=true, el proyecto entero. Las imágenes incrustadas se resumen salvo incluir_binarios.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, diapositiva, completo: {type: 'boolean'}, incluir_binarios: {type: 'boolean'}}},
    annotations: soloLectura, run: M.ver},
  {name: 'editar_metadatos', title: 'Editar metadatos',
    description: 'Cambia título, subtítulo, autores, institución, fecha, tema, aspecto, acento, tipografía, numeración o pie. null borra un campo opcional.',
    inputSchema: {type: 'object', required: ['archivo', 'cambios'], properties: {archivo, cambios: {type: 'object', additionalProperties: false, properties: {
      titulo: {type: 'string'}, titulo_corto: {type: 'string', description: 'El que va en el pie.'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string'}, aspecto: {type: 'string', enum: ['169', '43']}, acento: {anyOf: [{type: 'string', pattern: '^#[0-9a-fA-F]{6}$'}, {type: 'null'}]},
      tipografia: {anyOf: [{type: 'string'}, {type: 'null'}]}, numeros: {type: 'boolean'}, pie: {type: 'boolean'}}}}},
    annotations: cambia, run: M.metadatos},
  {name: 'agregar_diapositivas', title: 'Agregar diapositivas',
    description: 'Añade varias diapositivas de una vez, cada una con su diseño, título, notas, minutos y bloques. O entran todas o ninguna, y el error dice cuál falló. Por omisión van al final.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositivas'], properties: {archivo, diapositivas: {type: 'array', minItems: 1, items: diapositivaNueva}, posicion: {type: 'integer', minimum: 1, description: 'Posición de la primera (desde 1).'}}},
    annotations: cambia, run: M.agregaDiapositivas},
  {name: 'agregar_diapositiva', title: 'Agregar diapositiva',
    description: 'Añade una diapositiva con su diseño, título, notas, duración y, opcionalmente, todos sus bloques (zonas). Por omisión va al final.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, ...propsDiapositiva, posicion: {type: 'integer', minimum: 1, description: 'Posición (desde 1) donde insertarla.'}}},
    annotations: cambia, run: M.agregaDiapositiva},
  {name: 'editar_diapositiva', title: 'Editar diapositiva',
    description: 'Cambia título, notas, duración, diseño (reparte los bloques como el editor), encabezados, o reemplaza las zonas indicadas.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva, ...propsDiapositiva}},
    annotations: cambia, run: M.editaDiapositiva},
  {name: 'duplicar_diapositiva', title: 'Duplicar diapositiva',
    description: 'Copia una diapositiva justo detrás de ella, con bloques nuevos (ids nuevos). Útil para variantes o para construir por pasos.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva}},
    annotations: cambia, run: M.duplicaDiapositiva},
  {name: 'mover_diapositiva', title: 'Mover diapositiva',
    description: 'Mueve una diapositiva a otra posición (desde 1).',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'a'], properties: {archivo, diapositiva, a: {type: 'integer', minimum: 1}}},
    annotations: cambia, run: M.mueveDiapositiva},
  {name: 'eliminar_diapositiva', title: 'Eliminar diapositiva',
    description: 'Elimina una diapositiva (se puede deshacer).',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva}},
    annotations: borra, run: M.eliminaDiapositiva},
  {name: 'agregar_bloque', title: 'Agregar bloque',
    description: 'Añade un bloque a una zona de una diapositiva: texto, viñetas, ecuación, reacción, estructura química (desde SMILES o MOL), tabla, gráfica (también desde un archivo de datos del equipo), gráfica dinámica, SmartArt, caja, teorema, código, cita o imagen.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'bloque'], properties: {archivo, diapositiva, bloque, zona: {type: 'integer', minimum: 1, description: 'Zona desde 1 (por omisión 1).'}, posicion: {type: 'integer', minimum: 1, description: 'Posición dentro de la zona, desde 1 (por omisión al final).'}}},
    annotations: cambia, run: M.agregaBloque},
  {name: 'editar_bloque', title: 'Editar bloque',
    description: 'Cambia propiedades de un bloque por su id. Solo se tocan las enviadas; null borra una. En una imagen, «archivo» reemplaza la figura; en una gráfica, «archivo_datos» vuelve a leer los datos; en una estructura, «smiles» o «archivo_mol» la redibujan y «estilo» cambia la norma de dibujo.',
    inputSchema: {type: 'object', required: ['archivo', 'bloque', 'cambios'], properties: {archivo, bloque: {type: 'string', description: 'Id del bloque.'}, cambios: {type: 'object', additionalProperties: true}}},
    annotations: cambia, run: M.editaBloque},
  {name: 'eliminar_bloque', title: 'Eliminar bloque',
    description: 'Elimina un bloque por su id (se puede deshacer).',
    inputSchema: {type: 'object', required: ['archivo', 'bloque'], properties: {archivo, bloque: {type: 'string'}}},
    annotations: borra, run: M.eliminaBloque},
  {name: 'agregar_referencia', title: 'Agregar referencia',
    description: 'Añade una referencia bibliográfica y la cita en las diapositivas indicadas. Solo con referencias que dio el usuario o que verificaste: nunca inventes autores, títulos, años ni DOI.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, autores: {type: 'string'}, titulo: {type: 'string'}, revista: {type: 'string'}, anio: {type: 'string'}, vol: {type: 'string'}, pag: {type: 'string'}, doi: {type: 'string'}, url: {type: 'string'},
      clave: {type: 'string', pattern: '^[A-Za-z0-9]{1,40}$', description: 'Clave para citar en línea con [@clave], p. ej. «Kojima2009».'},
      diapositivas: {type: 'array', items: diapositiva, description: 'Diapositivas donde se cita.'}}},
    annotations: cambia, run: M.agregaReferencia},
  {name: 'historial_presentacion', title: 'Historial',
    description: 'Versiones guardadas antes de cada cambio (las 50 últimas) y lo que se puede rehacer.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo}}, annotations: soloLectura,
    run: async a => M.historial(a)},
  {name: 'deshacer', title: 'Deshacer',
    description: 'Revierte los últimos cambios de un proyecto (por omisión uno).',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, pasos: {type: 'integer', minimum: 1}}},
    annotations: cambia, run: async a => M.deshacer(a)},
  {name: 'rehacer', title: 'Rehacer',
    description: 'Vuelve a aplicar lo deshecho, mientras no haya cambios nuevos.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, pasos: {type: 'integer', minimum: 1}}},
    annotations: cambia, run: async a => M.rehacer(a)},
  {name: 'revisar_presentacion', title: 'Revisar presentación',
    description: 'Auditoría del editor: calidad científica de figuras (ejes, unidades, pies, procedencia, escalas log), accesibilidad, estructura (títulos, diapositivas vacías, exceso de texto), tiempo frente a un objetivo y avisos por formato de exportación.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, minutos_objetivo: {type: 'number', exclusiveMinimum: 0, description: 'Duración que tiene la charla.'}}},
    annotations: soloLectura, run: M.revisar},
  {name: 'vista_previa', title: 'Vista previa',
    description: 'Renderiza en Chromium. Sin «diapositiva», un mosaico numerado de toda la charla (hasta 36) en una imagen; con «diapositiva» (una o hasta ocho), cada una a tamaño real. Siempre informa qué bloques se desbordan. Requiere Chromium o Chrome.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, diapositiva: {anyOf: [diapositiva, {type: 'array', items: diapositiva, maxItems: 8}]}, desde: {type: 'integer', minimum: 1, description: 'Mosaico: primera diapositiva.'}}},
    annotations: soloLectura,
    run: async a => {
      const r = await N.vistaPrevia(a);
      const {imagenes, ...resto} = r;
      resto.imagenes = imagenes.map(x => x.n || 'mosaico');
      return {content: [{type: 'text', text: JSON.stringify(resto, null, 2)}, ...imagenes.map(x => ({type: 'image', data: x.png, mimeType: 'image/png'}))], structuredContent: resto};
    }},
  {name: 'exportar_presentacion', title: 'Exportar presentación',
    description: 'Exporta a la carpeta de trabajo: beamer (carpeta con el .tex y las figuras, lista para Overleaf), html (imprimible, autónomo), pdf o pptx (estos dos requieren Chromium o Chrome).',
    inputSchema: {type: 'object', required: ['archivo', 'formato'], properties: {archivo, formato: {type: 'string', enum: ['beamer', 'html', 'pdf', 'pptx']}, destino: {type: 'string', description: 'Nombre del archivo (o de la carpeta, en beamer) de salida.'}}},
    annotations: cambia,
    run: async a => {
      if (a.formato === 'beamer' || a.formato === 'html') return M.exportaTexto(a, a.formato);
      if (a.formato === 'pdf') return N.exportaPdf(a);
      if (a.formato === 'pptx') return N.exportaPptx(a);
      if (FORMATOS[a.formato]) return FORMATOS[a.formato](a);
      throw new M.ErrorUso('Formato desconocido: «' + a.formato + '». Usa ' + ['beamer', 'html', 'pdf', 'pptx', ...Object.keys(FORMATOS)].join(', ') + '.');
    }}
];

const CONVENCIONES = {
  texto: 'text, bullets, bblock y teorema admiten $matemáticas en línea$ (\\$ para un dólar literal) y citas [@clave] de referencias añadidas con agregar_referencia. No hay marcado de negrita: el texto es literal.',
  math: 'Bloque «math»: tex sin $, p. ej. "E = mc^2" o "\\\\frac{d[A]}{dt} = -k[A]".',
  chem: 'Bloque «chem»: sintaxis mhchem sin \\ce{}, p. ej. "2 H2 + O2 -> 2 H2O" o "Zn^2+ + 2 OH- <=> Zn(OH)2 v".',
  chart: 'Bloque «chart»: data es una tabla (lista de filas o texto con tabuladores) con encabezado; la primera columna es x y las demás, series. Una columna «±» tras una serie es su barra de error. kind: linea, dispersion, ajuste o barras. Unidades entre paréntesis en xlabel/ylabel y siempre un caption.',
  datos_de_equipo: 'Bloque «chart» con archivo_datos (ruta en la carpeta de trabajo; CSV, TXT, XY, DAT…): detecta separador, coma decimal y técnica (xrd, ftir, uvvis, tga, raman, cv, pl) y rotula los ejes con unidades; registra la procedencia (archivo, fecha, filas, huella). Opcionales: tecnica (forzarla), columnas ([1,3]: x y las series a usar, desde 1), max_puntos (por omisión 1500; se submuestrea conservando picos). Las propiedades que envíes además (caption, xlabel…) mandan sobre las detectadas.',
  estruct: 'Bloque «estruct»: {"tipo":"estruct","smiles":"…","caption":"…","w":55}. RDKit calcula el dibujo 2D, los aromáticos en forma de Kekulé, las cargas y las cuñas de los estereocentros definidos; el resultado es la estructura nativa del editor (vectorial, editable, TikZ en Beamer). También «mol» (texto de un bloque MOL) o «archivo_mol» (.mol o .sdf de la carpeta; se respeta su dibujo). «estilo»: diapo (por omisión, para proyectar), acs, nature, rsc, cell o wiley. La respuesta trae fórmula, masa molar, SMILES canónico y estereocentros sin asignar: compruébalos.',
  table: 'Bloque «table»: rows es una lista de filas; header=true marca la primera como encabezado.',
  smart: 'Bloque «smart»: items es una lista de textos o de {t, d} (d = detalle).',
  image: 'Bloque «image»: {"tipo":"image","archivo":"ruta/en/la/carpeta.png","caption":"…","w":70}. PNG, JPEG, GIF, WebP o SVG hasta 8 MB; también src con https o data:.',
  refs: 'Bloque «refs»: lista las referencias citadas.',
  alias: 'Se aceptan nombres en español para las propiedades comunes (texto, pie, datos, filas, ecuacion, eje_x…); si una propiedad no la usa la aplicación, la respuesta lo avisa.',
  honestidad: 'Datos que no vengan del usuario se marcan como ilustrativos en el pie y en las notas. No inventes referencias.'
};

/* ---------- prompts ----------
   Plantillas que el cliente puede ofrecer al usuario como atajos. */
const PROMPTS = [
  {name: 'presentacion_desde_resultados', title: 'Presentación a partir de resultados',
    description: 'Arma una charla científica a partir de los datos y notas del usuario.',
    arguments: [{name: 'tema', description: 'De qué trata la charla', required: true}, {name: 'audiencia', description: 'Reunión de grupo, congreso, defensa, clase…'}, {name: 'minutos', description: 'Duración'}, {name: 'archivos', description: 'Archivos de datos o figuras en la carpeta de trabajo'}],
    texto: a => `Prepara en Erlen Slides una presentación sobre: ${a.tema}.
Audiencia: ${a.audiencia || 'no indicada (pregúntala si cambia el enfoque)'}. Duración: ${a.minutos ? a.minutos + ' min' : 'no indicada'}.${a.archivos ? '\nArchivos disponibles: ' + a.archivos + '.' : ''}
1. Consulta guia_formato. Propón primero el guion (una línea por diapositiva, con el mensaje de cada una) y espera mi visto bueno.
2. Crea el proyecto con crear_presentacion y todas las diapositivas. Títulos que digan la conclusión; notas del orador y minutos en cada una.
3. Usa mis archivos de datos con archivo_datos y dibuja las moléculas con bloques estruct (smiles o archivo_mol), comprobando la fórmula devuelta. No inventes cifras ni referencias; si falta un dato, deja el hueco señalado y dímelo.
4. Ejecuta revisar_presentacion${a.minutos ? ' con minutos_objetivo=' + a.minutos : ''}, mira el mosaico con vista_previa y corrige desbordes y avisos.
5. Resume qué hiciste y qué falta que yo aporte.`},
  {name: 'revisar_antes_de_presentar', title: 'Revisión antes de presentar',
    description: 'Revisión crítica de una presentación existente, con correcciones.',
    arguments: [{name: 'archivo', description: 'Proyecto a revisar', required: true}, {name: 'minutos', description: 'Duración disponible'}],
    texto: a => `Revisa la presentación «${a.archivo}» como lo haría un director de tesis exigente.
1. ver_presentacion y revisar_presentacion${a.minutos ? ' (minutos_objetivo=' + a.minutos + ')' : ''}; vista_previa en mosaico.
2. Evalúa: hilo argumental, un mensaje por diapositiva, títulos que concluyen, figuras con ejes, unidades y pie, exceso de texto, tiempo.
3. Enumera los problemas por gravedad y propón la corrección de cada uno. Aplica solo los arreglos de forma (desbordes, pies, unidades, títulos); consulta antes de cambiar contenido científico.
4. Recuerda que todo se puede revertir con deshacer.`},
  {name: 'figura_desde_datos', title: 'Figura desde un archivo de datos',
    description: 'Convierte un archivo de un equipo en una diapositiva con la gráfica bien rotulada.',
    arguments: [{name: 'archivo', description: 'Proyecto de destino', required: true}, {name: 'datos', description: 'Archivo de datos en la carpeta de trabajo', required: true}, {name: 'mensaje', description: 'Qué debe ver la audiencia'}],
    texto: a => `En «${a.archivo}», añade una diapositiva con una gráfica del archivo «${a.datos}» (bloque chart con archivo_datos).
Comprueba en la respuesta la técnica detectada, las columnas y el intervalo de x; si algo no cuadra, corrígelo con tecnica o columnas.
${a.mensaje ? 'El mensaje de la diapositiva es: ' + a.mensaje + '. Úsalo como título.' : 'Pregúntame qué debe ver la audiencia antes de poner el título.'}
Escribe un pie que diga qué se midió y qué mirar, y enséñame la vista previa de esa diapositiva.`}
];
/* ---------- extensiones ----------
   mcp/extensiones/*.mjs (ver extensiones.mjs). Un nombre repetido es un error
   de quien escribe la extensión: se dice al arrancar, en vez de que una
   herramienta tape a otra en silencio. */
const FORMATOS = {};
for (const ruta of archivosExtension('.mjs')) {
  const ext = (await import(pathToFileURL(ruta).href)).default || {};
  const origen = basename(ruta);
  for (const h of ext.herramientas || []) {
    if (HERRAMIENTAS.some(x => x.name === h.name)) throw new Error(origen + ': la herramienta «' + h.name + '» ya existe.');
    if (!h.inputSchema || h.inputSchema.type !== 'object' || typeof h.run !== 'function') throw new Error(origen + ': «' + h.name + '» necesita inputSchema de tipo object y run.');
    HERRAMIENTAS.push({annotations: {openWorldHint: false}, ...h});
  }
  for (const p of ext.prompts || []) {
    if (PROMPTS.some(x => x.name === p.name)) throw new Error(origen + ': el prompt «' + p.name + '» ya existe.');
    PROMPTS.push({arguments: [], ...p});
  }
  Object.assign(CONVENCIONES, ext.convenciones || {});
  for (const [nombre, fn] of Object.entries(ext.formatos || {})) {
    if (['beamer', 'html', 'pdf', 'pptx'].includes(nombre) || FORMATOS[nombre]) throw new Error(origen + ': el formato «' + nombre + '» ya existe.');
    FORMATOS[nombre] = fn;
  }
  if (ext.transformaBloque) M.TRANSFORMADORES.push(ext.transformaBloque);
}
if (Object.keys(FORMATOS).length) {
  const exp = HERRAMIENTAS.find(x => x.name === 'exportar_presentacion');
  exp.inputSchema.properties.formato.enum.push(...Object.keys(FORMATOS));
  exp.description += ' Además: ' + Object.keys(FORMATOS).join(', ') + '.';
}

/* ---------- protocolo ---------- */
const escribe = m => process.stdout.write(JSON.stringify(m) + '\n');
const responde = (id, result) => escribe({jsonrpc: '2.0', id, result});
const error = (id, code, message) => escribe({jsonrpc: '2.0', id, error: {code, message}});
const log = (...x) => process.stderr.write('[erlen-slides-mcp] ' + x.join(' ') + '\n');

let versionProtocolo = VERSIONES[0];
/* structuredContent existe desde 2025-06-18: a clientes anteriores no se les manda. */
const conEstructura = () => versionProtocolo >= '2025-06-18';
async function llamaHerramienta(nombre, args) {
  const h = HERRAMIENTAS.find(x => x.name === nombre);
  if (!h) return {content: [{type: 'text', text: 'Herramienta desconocida: ' + nombre + '. Disponibles: ' + HERRAMIENTAS.map(x => x.name).join(', ') + '.'}], isError: true};
  if (args != null && (typeof args !== 'object' || Array.isArray(args))) return {content: [{type: 'text', text: 'Los argumentos deben ser un objeto.'}], isError: true};
  const faltan = (h.inputSchema.required || []).filter(k => args == null || args[k] == null || args[k] === '');
  if (faltan.length) return {content: [{type: 'text', text: 'Falta ' + faltan.map(k => '«' + k + '»').join(', ') + ' en ' + nombre + '.'}], isError: true};
  try {
    const r = await h.run(args || {});
    if (r && Array.isArray(r.content)) { if (!conEstructura()) delete r.structuredContent; return r; }
    /* Sangrado solo en respuestas cortas: en la guía o un proyecto entero
       los espacios gastan contexto del modelo sin aclarar nada. */
    const compacto = JSON.stringify(r);
    const out = {content: [{type: 'text', text: compacto.length > 4000 ? compacto : JSON.stringify(r, null, 2)}]};
    if (conEstructura() && r && typeof r === 'object' && !Array.isArray(r)) out.structuredContent = r;
    return out;
  } catch (e) {
    if (!(e instanceof M.ErrorUso)) log(nombre, e && e.stack || e);
    return {content: [{type: 'text', text: e instanceof M.ErrorUso ? e.message : 'Error interno: ' + (e && e.message || e)}], isError: true};
  }
}

const RECURSO_GUIA = 'erlen-slides://guia';
async function atiende(m) {
  const {id, method, params} = m;
  switch (method) {
    case 'initialize': {
      const pedida = params && params.protocolVersion;
      versionProtocolo = VERSIONES.includes(pedida) ? pedida : VERSIONES[0];
      return responde(id, {
        protocolVersion: versionProtocolo,
        capabilities: {tools: {}, resources: {}, prompts: {}},
        serverInfo: {name: 'erlen-slides', title: 'Erlen Slides', version: M.version()},
        instructions: INSTRUCCIONES
      });
    }
    case 'ping': return responde(id, {});
    case 'tools/list':
      return responde(id, {tools: HERRAMIENTAS.map(({run, ...h}) => h)});
    case 'tools/call':
      return responde(id, await llamaHerramienta(params && params.name, params && params.arguments));
    case 'resources/list':
      return responde(id, {resources: [{uri: RECURSO_GUIA, name: 'guia', title: 'Guía del formato de Erlen Slides', mimeType: 'application/json'}]});
    case 'resources/read':
      if (!params || params.uri !== RECURSO_GUIA) return error(id, -32002, 'Recurso desconocido');
      return responde(id, {contents: [{uri: RECURSO_GUIA, mimeType: 'application/json', text: JSON.stringify({...(await M.guia()), convenciones: CONVENCIONES}, null, 2)}]});
    case 'prompts/list': return responde(id, {prompts: PROMPTS.map(({texto, ...p}) => p)});
    case 'prompts/get': {
      const p = PROMPTS.find(x => x.name === (params && params.name));
      if (!p) return error(id, -32602, 'Prompt desconocido: ' + (params && params.name));
      const a = (params && params.arguments) || {};
      const faltan = p.arguments.filter(x => x.required && !a[x.name]).map(x => x.name);
      if (faltan.length) return error(id, -32602, 'Falta el argumento ' + faltan.join(', '));
      return responde(id, {description: p.description, messages: [{role: 'user', content: {type: 'text', text: p.texto(a)}}]});
    }
    default:
      if (id !== undefined) error(id, -32601, 'Método no disponible: ' + method);
  }
}

/* Los mensajes se atienden en orden: dos cambios seguidos sobre el mismo
   archivo no deben pisarse. */
let cola = Promise.resolve();
const rl = createInterface({input: process.stdin});
rl.on('line', linea => {
  if (!linea.trim()) return;
  let m;
  try { m = JSON.parse(linea); } catch { return error(null, -32700, 'JSON no válido'); }
  if (Array.isArray(m)) return error(null, -32600, 'Los lotes JSON-RPC no se admiten');
  cola = cola.then(() => atiende(m)).catch(e => { log(e && e.stack || e); if (m.id !== undefined) error(m.id, -32603, 'Error interno'); });
});
rl.on('close', () => { cola.then(() => N.cierra()).finally(() => process.exit(0)); });
log('listo; carpeta de trabajo:', M.carpetaTrabajo());
