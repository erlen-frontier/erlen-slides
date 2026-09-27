/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «tablas»: tablas desde un CSV, TSV o TXT de la carpeta de trabajo.

   Dos entradas con la misma lectura (tablas.pagina.js):
   - la propiedad «archivo_tabla» en un bloque {tipo: "table"}, en cualquier
     herramienta que reciba bloques (crear_presentacion, agregar_bloque…);
   - tabla_desde_archivo, que pone la tabla en diapositivas nuevas y, si no
     cabe, la parte en varias con el encabezado repetido, todas de una vez.

   Aquí se lee el archivo y se decide dónde va; interpretar y redondear se
   hace en la página, junto a esColumnaError y las reglas de parseTable. */
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {op, modifica, lee, archivoEnCarpeta, visible, ErrorUso} from '../motor.mjs';

const MAX_TABLA = 5 * 1024 * 1024;
/* Opciones de lectura: las consume esta extensión y no llegan a la app. */
const OPCIONES = ['columnas', 'filas', 'cifras', 'decimales', 'cifras_error', 'unidades', 'separador_decimal', 'encabezado', 'combinar_error'];

/* El pie solo nombra el archivo si se pide: una tabla de la app no tiene
   campo de procedencia y el nombre de un archivo de trabajo no siempre es
   algo que se quiera proyectar. */
function pieDe(a, ruta) {
  const pie = a.caption ?? a.pie;
  if (!a.pie_con_fuente) return pie;
  const fuente = 'Datos: ' + basename(ruta) + '.';
  return pie ? String(pie).trim() + ' ' + fuente : fuente;
}
async function leeTabla(a, aspecto) {
  const ruta = archivoEnCarpeta(a.archivo_tabla, 'el archivo de la tabla', MAX_TABLA);
  const bytes = readFileSync(ruta);
  if (bytes.subarray(0, 8000).includes(0)) throw new ErrorUso('«' + visible(ruta) + '» es binario. Guarda la hoja como CSV o texto separado por tabuladores.');
  const opciones = {};
  for (const k of OPCIONES) if (a[k] != null) opciones[k] = a[k];
  const pie = pieDe(a, ruta);
  const r = await op('tablaDesdeTexto', {texto: bytes.toString('utf8'), nombre: basename(ruta), opciones, aspecto, caption: pie});
  r.info.archivo_tabla = visible(ruta);
  r.pie = pie;
  return r;
}
/* modo: «bloque» (no puede partirse), «una» (herramienta sin partir) o
   «partida» (ya repartida, con filas_por_diapositiva quizá demasiado alto). */
const avisoAjuste = (j, modo) => {
  const out = [];
  if (j.filas > j.filas_max) out.push('La tabla tiene ' + j.filas + ' filas' + (modo === 'partida' ? ' por diapositiva' : '') + ' y caben unas ' + j.filas_max + ': '
    + ({bloque: 'usa tabla_desde_archivo con partir: true, o elige «filas».', una: 'pasa partir: true para repartirla, o elige «filas».', partida: 'baja «filas_por_diapositiva» o quítalo para usar la estimación.'})[modo]);
  if (j.ancho_caracteres > j.ancho_max) out.push('La tabla es ancha (unos ' + j.ancho_caracteres + ' caracteres por fila; caben unos ' + j.ancho_max + '): elige «columnas», combina valor y error o reduce «cifras». Partirla no la estrecha.');
  if (out.length) out.push('Es una estimación' + (modo === 'bloque' ? ' para una zona de ancho completo a 16:9 (en una columna o a 4:3 cabe menos)' : '') + ': compruébalo con vista_previa.');
  return out;
};

/* Bloque {tipo: "table", archivo_tabla: …}: se sustituye por sus filas. El
   informe de la lectura viaja en _importado y sale en datos_importados. */
async function transformaBloque(b) {
  if (!b || b.archivo_tabla == null) return b;
  const tipo = b.tipo ?? b.type;
  if (tipo != null && tipo !== 'table') throw new ErrorUso('«archivo_tabla» solo vale para bloques «table»; este es «' + tipo + '». Para graficar un archivo usa un bloque «chart» con «archivo_datos».');
  if (b.rows != null) throw new ErrorUso('Usa «archivo_tabla» o «rows», no los dos: las filas salen del archivo.');
  if (b.partir) throw new ErrorUso('Un bloque vive en una sola diapositiva: para repartir la tabla en varias usa la herramienta tabla_desde_archivo con partir: true.');
  const t = await leeTabla(b);
  const out = {...b, rows: t.rows, header: t.header};
  for (const k of [...OPCIONES, 'archivo_tabla', 'pie_con_fuente', 'partir', 'pie', 'caption']) delete out[k];
  if (t.pie != null) out.caption = t.pie;
  t.info.avisos.push(...avisoAjuste(t.ajuste, 'bloque'));
  /* Sin el proyecto a la vista no se sabe el aspecto ni la zona: la
     estimación supone el caso más holgado y lo dice. */
  out._importado = {...t.info, ajuste: {...t.ajuste, supuesto: 'zona de ancho completo a 16:9'}};
  return out;
}

const PROPIEDADES = {
  archivo_tabla: {type: 'string', description: 'CSV, TSV o TXT en la carpeta de trabajo. Detecta el separador (tabulador, «;», «,» o espacios) y la coma decimal como las gráficas.'},
  columnas: {type: 'array', items: {anyOf: [{type: 'integer'}, {type: 'string'}]}, description: 'Columnas a mostrar y su orden: número desde 1 o encabezado exacto. Por omisión, todas.'},
  filas: {type: 'array', items: {type: 'integer'}, description: '[primera, última] de las filas de datos, desde 1 y sin contar el encabezado.'},
  cifras: {anyOf: [{type: 'integer'}, {type: 'object'}], description: 'Cifras significativas: un número para todas las columnas numéricas o {"3": 3, "pH": 2} por columna. Nunca se añaden ceros que el archivo no trae.'},
  decimales: {anyOf: [{type: 'integer'}, {type: 'object'}], description: 'Decimales: un número para todas o por columna. Por columna mandan sobre el número general. No combines cifras y decimales en la misma columna.'},
  combinar_error: {anyOf: [{type: 'boolean'}, {type: 'array', items: {anyOf: [{type: 'integer'}, {type: 'string'}]}}], description: 'Une cada valor con la columna de error de su derecha (encabezado con ±, sd, sem, error, desv…) en «valor ± error», redondeando el error a 1 cifra (2 si empieza por 1) y el valor en la misma posición decimal. true: todos los pares; o la lista de columnas de valor.'},
  cifras_error: {type: 'integer', enum: [1, 2], description: 'Fuerza las cifras de la incertidumbre al combinar.'},
  unidades: {type: 'object', description: 'Unidad por columna, {"3": "Å", "T": "°C"}: se añade «(unidad)» al encabezado. Las que ya trae el encabezado («d (Å)», «T [°C]», «E / V») se reconocen; pedir otra distinta es un error.'},
  separador_decimal: {type: 'string', enum: ['.', ','], description: 'Marca decimal al mostrar. Por omisión, la del archivo.'},
  encabezado: {type: 'boolean', description: 'Si la primera fila es encabezado. Por omisión se detecta.'},
  pie_con_fuente: {type: 'boolean', description: 'Añade «Datos: archivo.csv.» al pie. Solo si el usuario lo pide.'}
};

export default {
  herramientas: [{
    name: 'tabla_desde_archivo', title: 'Tabla desde un archivo',
    description: 'Pone una tabla de un CSV/TSV/TXT de la carpeta de trabajo en una diapositiva nueva, o en varias si no cabe y se pide partir: true (el encabezado se repite y el título lleva «(cont.)»; entran todas o ninguna). Las celdas dicen lo que dice el archivo salvo el redondeo pedido; la respuesta cuenta cuántos valores cambiaron y da ejemplos. Para poner una tabla en una diapositiva que ya existe, usa agregar_bloque con {"tipo":"table","archivo_tabla":…} y las mismas opciones.',
    inputSchema: {type: 'object', required: ['archivo', 'archivo_tabla'], properties: {
      archivo: {type: 'string', description: 'Proyecto de la carpeta de trabajo.'},
      ...PROPIEDADES,
      titulo: {type: 'string', description: 'Título de la diapositiva (mejor, la conclusión que muestra la tabla). Las siguientes añaden «(cont.)».'},
      caption: {type: 'string', description: 'Pie de la tabla («Tabla n:» lo pone la app).'},
      align: {type: 'string', enum: ['c', 'l'], description: 'Alineación del texto: centrado (por omisión) o a la izquierda. Las columnas de cifras van siempre a la derecha.'},
      posicion: {type: 'integer', description: 'Posición de la primera diapositiva nueva (desde 1). Por omisión, al final.'},
      partir: {type: 'boolean', description: 'Si la tabla tiene más filas de las que caben, la reparte en varias diapositivas de tamaño parecido.'},
      filas_por_diapositiva: {type: 'integer', minimum: 3, description: 'Filas de datos por diapositiva al partir. Por omisión, las que caben según la estimación.'},
      notas: {type: 'string', description: 'Notas del orador de la primera diapositiva.'},
      minutos: {type: 'number', description: 'Minutos de la primera diapositiva.'}
    }},
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false},
    run: async a => {
      const {deck} = lee(a.archivo);
      if (a.filas_por_diapositiva != null && !a.partir) throw new ErrorUso('«filas_por_diapositiva» solo se usa con partir: true.');
      const t = await leeTabla(a, deck?.meta?.aspect);
      const cab = t.header ? [t.rows[0]] : [];
      const cuerpo = t.rows.slice(cab.length);
      /* Trozos de tamaño parecido: 20 filas en 7, 7 y 6, no en 9, 9 y 2. */
      let trozos = [cuerpo];
      if (a.partir) {
        const max = Math.max(3, Math.floor(+a.filas_por_diapositiva || t.ajuste.filas_max));
        const k = Math.ceil(cuerpo.length / max), base = Math.floor(cuerpo.length / k), resto = cuerpo.length % k;
        let ini = 0;
        trozos = Array.from({length: k}, (_, i) => cuerpo.slice(ini, ini += base + (i < resto ? 1 : 0)));
      }
      const titulo = a.titulo == null ? '' : String(a.titulo);
      const pie = t.pie;
      const diapositivas = trozos.map((filas, i) => ({
        titulo: i ? (titulo ? titulo + ' (cont.)' : '(cont.)') : titulo,
        zonas: [[{tipo: 'table', header: t.header, rows: cab.concat(filas), ...(a.align ? {align: a.align} : {}), ...(pie != null ? {caption: pie} : {})}]],
        ...(i === 0 && a.notas != null ? {notas: a.notas} : {}),
        ...(i === 0 && a.minutos != null ? {minutos: a.minutos} : {})
      }));
      const r = await modifica(a.archivo, 'agregaDiapositivas', {diapositivas, posicion: a.posicion}, 'tabla_desde_archivo');
      const mayor = Math.max(...trozos.map(x => x.length));
      const ajuste = {...t.ajuste, cabe: mayor <= t.ajuste.filas_max && t.ajuste.ancho_caracteres <= t.ajuste.ancho_max, filas: mayor};
      const {avisos: avisosTabla, ...tabla} = t.info;
      return {...r, tabla: {...tabla, diapositivas: trozos.length, filas_por_diapositiva: trozos.map(x => x.length), ajuste},
        avisos: [...(r.avisos || []), ...avisosTabla, ...avisoAjuste(ajuste, a.partir ? 'partida' : 'una')],
        nota: 'Mira el resultado con vista_previa' + (trozos.length > 1 ? ' (son ' + trozos.length + ' diapositivas).' : '.')};
    }
  }],
  convenciones: {
    tablas_desde_archivo: 'Bloque «table» con archivo_tabla (CSV/TSV/TXT de la carpeta de trabajo) o la herramienta tabla_desde_archivo, que además reparte en varias diapositivas (partir: true). Opciones: columnas (desde 1 o por encabezado), filas ([primera, última]), cifras o decimales (número o por columna), combinar_error (valor ± error con la incertidumbre a 1 cifra, 2 si empieza por 1), unidades ({"3": "Å"}), separador_decimal, encabezado, pie_con_fuente. Nunca se inventan ceros; la respuesta (datos_importados o tabla) dice cuántos valores cambiaron. No escribas a mano las cifras de un archivo que tienes.'
  },
  transformaBloque
};
