/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «graficas»: gráficas científicas que un bloque chart solo no da.

   · comparar_espectros: varios archivos de un equipo en una sola gráfica,
     con normalización y desplazamiento declarados.
   · marcar_picos: rótulos en los picos (o bandas) de una gráfica, en puntos
     medidos; las etiquetas del usuario mandan y no se adivinan asignaciones.
   · intervalo_x junto a archivo_datos: recorta el archivo al leerlo.

   Node lee los archivos y calcula su SHA-256; la cuenta se hace en la página
   (graficas.pagina.js), con parseTable, detectaTecnica y chartSeries. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {modifica, op, archivoEnCarpeta, visible, ErrorUso} from '../motor.mjs';

const MAX_DATOS = 20 * 1024 * 1024;
const archivo = {type: 'string', description: 'Proyecto de la carpeta de trabajo.'};
const intervalo = {type: 'array', items: {type: 'number'}, minItems: 2, maxItems: 2, description: 'Recorte en x, [mínimo, máximo] en las unidades del archivo (p. ej. [5, 40] en 2θ). Se conservan los puntos dentro, extremos incluidos.'};
const cambia = {readOnlyHint: false, destructiveHint: false, openWorldHint: false};

/* El texto de un archivo de datos, con las mismas comprobaciones que archivo_datos. */
function leeArchivo(ruta0) {
  const ruta = archivoEnCarpeta(ruta0, 'el archivo de datos', MAX_DATOS);
  const bytes = readFileSync(ruta);
  if (bytes.subarray(0, 8000).includes(0)) throw new ErrorUso('«' + visible(ruta) + '» es binario. Exporta los datos del equipo como texto (CSV, TXT, XY, DAT).');
  return {ruta: visible(ruta), archivo: basename(ruta), texto: bytes.toString('utf8'), sha256: createHash('sha256').update(bytes).digest('hex')};
}

export default {
  herramientas: [{
    name: 'comparar_espectros', title: 'Comparar espectros o difractogramas',
    description: 'Una gráfica con varias series, una por archivo de equipo (XRD, FTIR, Raman, UV-Vis, TGA…): p. ej. tres difractogramas de HDL Zn-Al sintetizados a distinto pH. Si los archivos no comparten los valores de x, cada serie conserva solo sus puntos medidos (no se interpola). normalizar: ninguno (por omisión), max o area; desplazar: auto (por omisión; apila sin cruces, la primera serie arriba), un porcentaje o 0 para superponer. La respuesta y el pie propuesto dicen qué se hizo; la procedencia registra todos los archivos y la respuesta trae el SHA-256 de cada uno. Sin «diapositiva», crea una diapositiva nueva (en «posicion», o al final).',
    inputSchema: {type: 'object', required: ['archivo', 'archivos'], properties: {
      archivo,
      archivos: {type: 'array', minItems: 2, maxItems: 8, description: 'Los archivos, en el orden en que se apilan (el primero arriba).',
        items: {anyOf: [{type: 'string'}, {type: 'object', required: ['ruta'], properties: {
          ruta: {type: 'string', description: 'Archivo de datos en la carpeta de trabajo.'},
          nombre: {type: 'string', description: 'Nombre de la serie (por omisión, el del archivo sin extensión), p. ej. «pH 8».'},
          columna: {type: 'integer', minimum: 2, description: 'Columna de y, contando desde 1 (por omisión 2).'}}}]}},
      diapositiva: {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}], description: 'Diapositiva existente donde añadir la gráfica (número o id). Sin ella se crea una nueva.'},
      zona: {type: 'integer', minimum: 1, description: 'Con «diapositiva»: zona de destino (por omisión 1).'},
      posicion: {type: 'integer', minimum: 1, description: 'Sin «diapositiva»: posición de la diapositiva nueva (por omisión, al final).'},
      titulo: {type: 'string', description: 'Título de la diapositiva nueva; mejor la conclusión que un rótulo.'},
      normalizar: {type: 'string', enum: ['ninguno', 'max', 'area'], description: 'max: cada serie entre su máximo; area: entre su área (trapecios). Cambia lo que se lee en la figura: dilo en el pie.'},
      desplazar: {anyOf: [{type: 'string', enum: ['auto']}, {type: 'number', minimum: 0, maximum: 150}], description: 'Separación vertical entre series como % del intervalo de y; 0 superpone con leyenda.'},
      intervalo_x: intervalo,
      tecnica: {type: 'string', description: 'Fuerza la técnica: xrd, ftir, uvvis, tga, raman, cv, pl.'},
      caption: {type: 'string', description: 'Pie de figura. Sin él se usa el propuesto, que dice la normalización y el desplazamiento.'},
      max_puntos: {type: 'integer', minimum: 50, description: 'Puntos por serie como máximo (por omisión 1500); se submuestrea conservando cada pico.'},
      propiedades: {type: 'object', additionalProperties: true, description: 'Otras propiedades del bloque chart (w, xlabel, ylabel, title…).'}}},
    annotations: cambia,
    run: async a => {
      if (!Array.isArray(a.archivos) || a.archivos.length < 2 || a.archivos.length > 8) throw new ErrorUso('«archivos» debe listar de 2 a 8 archivos.');
      const archivos = a.archivos.map(x => {
        const spec = typeof x === 'string' ? {ruta: x} : (x && typeof x === 'object' ? x : {});
        if (typeof spec.ruta !== 'string') throw new ErrorUso('Cada elemento de «archivos» es una ruta o {ruta, nombre?, columna?}.');
        return {...leeArchivo(spec.ruta), nombre: spec.nombre, columna: spec.columna};
      });
      return modifica(a.archivo, 'graficasCompara', {...a, archivos}, 'comparar_espectros');
    }
  }, {
    name: 'marcar_picos', title: 'Marcar picos de una gráfica',
    description: 'Busca los picos (o las bandas, en un FTIR en transmitancia) de un bloque chart y los rotula en la figura, también en Beamer y PowerPoint. Posición e intensidad son las de puntos medidos de la gráfica, nunca interpoladas. El rótulo automático es la posición; «etiquetas» [{x, texto}] pone los tuyos (p. ej. {"x": 11.6, "texto": "(003)"}) sobre el pico más cercano. No asigna índices de Miller ni bandas: eso lo decide el usuario. Con «longitud_onda» (Å) informa además el espaciado d de Bragg.',
    inputSchema: {type: 'object', required: ['archivo', 'bloque'], properties: {
      archivo,
      bloque: {type: 'string', description: 'Id del bloque chart (ver_presentacion).'},
      serie: {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}], description: 'Solo esta serie (número desde 1 o nombre). Por omisión, todas.'},
      prominencia_min: {type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1, description: 'Cuánto debe sobresalir un pico, como fracción del intervalo de y de su serie (por omisión 0.05).'},
      max_picos: {type: 'integer', minimum: 1, maximum: 30, description: 'Máximo de picos automáticos por serie, los más prominentes (por omisión 10).'},
      sentido: {type: 'string', enum: ['auto', 'maximos', 'minimos'], description: 'auto: mínimos si el eje y es transmitancia; si no, máximos.'},
      etiquetas: {type: 'array', items: {type: 'object', required: ['x', 'texto'], properties: {
        x: {type: 'number'}, texto: {type: 'string'}, serie: {type: 'integer', minimum: 1, description: 'Por omisión, la primera serie marcada.'}}},
        description: 'Rótulos del usuario: mandan sobre el automático del pico más cercano dentro de tolerancia_x.'},
      solo_etiquetas: {type: 'boolean', description: 'Rotula solo los picos de «etiquetas».'},
      tolerancia_x: {type: 'number', exclusiveMinimum: 0, description: 'Distancia máxima entre la x de una etiqueta y su pico (por omisión, la mayor de 5 pasos de muestreo o el 0.5 % del intervalo).'},
      suavizado: {type: 'integer', minimum: 0, description: 'Semiancho, en puntos, de la media móvil que localiza los picos (por omisión automático; 0 sin suavizar).'},
      longitud_onda: {type: 'number', exclusiveMinimum: 0, description: 'Solo DRX: λ en Å para calcular d (Cu Kα1 = 1.5406). No se supone ninguna.'},
      reemplazar: {type: 'boolean', description: 'Por omisión true: quita antes los rótulos de las series marcadas.'}}},
    annotations: cambia,
    run: a => modifica(a.archivo, 'graficasPicos', a, 'marcar_picos')
  }],

  convenciones: {
    graficas_comparar: 'comparar_espectros junta varios archivos del equipo en una gráfica (una serie por archivo), con normalizar (ninguno|max|area) y desplazar (auto|%|0). No interpola: si las rejillas de x difieren, cada serie guarda solo sus puntos. El pie propuesto dice la normalización y el desplazamiento; si escribes otro, dilo tú.',
    graficas_picos: 'Bloque chart: «picos» es una lista de {x, y, serie, txt, abajo?} en unidades de los datos (serie desde 0; abajo para bandas de transmitancia). Mejor usa marcar_picos, que los pone en puntos medidos. No escribas índices de Miller ni asignaciones que el usuario no haya dado.',
    graficas_recorte: 'Bloque chart con archivo_datos: «intervalo_x» [min, max] recorta el archivo al leerlo; la técnica se detecta con el archivo completo y la procedencia lo dice («archivo.xy (x 5–40)»).'
  },

  /* intervalo_x junto a archivo_datos: el recorte se hace antes de que la app
     lea el archivo, con un nombre de procedencia que lo declara. */
  transformaBloque: async (b, {datos}) => {
    if (!b || b.intervalo_x == null) return b;
    if (b.archivo_datos == null) throw new ErrorUso('«intervalo_x» solo vale junto a «archivo_datos» (o en comparar_espectros).');
    const orig = datos[b.archivo_datos];
    if (!orig) throw new ErrorUso('No se pudo leer «' + b.archivo_datos + '».');
    const r = await op('graficasRecorta', {texto: orig.texto, nombre: orig.nombre, intervalo_x: b.intervalo_x});
    const [lo, hi] = [Math.min(...b.intervalo_x), Math.max(...b.intervalo_x)];
    const clave = b.archivo_datos + '#x=' + lo + '..' + hi;
    datos[clave] = {nombre: orig.nombre + ' (x ' + lo + '–' + hi + ')', texto: r.texto};
    const out = {...b, archivo_datos: clave};
    delete out.intervalo_x;
    if (out.tecnica == null && r.tecnica) out.tecnica = r.tecnica;
    return out;
  }
};
