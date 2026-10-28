/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «markdown»: de un guion en Markdown a una presentación, y de una
   presentación a Markdown.

   Mucha gente escribe primero la charla como un esquema de texto (en sus
   notas, en un README, en lo que devuelve un asistente). importar_markdown lo
   convierte de una vez en diapositivas con los bloques reales del editor, y
   exportar_presentacion con formato «markdown» hace el camino inverso: un
   borrador del guion que se puede editar como texto y volver a importar.

   El analizador es propio y pequeño a propósito: solo reconoce lo que tiene
   equivalente en un bloque de la app y avisa de todo lo demás (negritas,
   enlaces, HTML, encabezados profundos…) en vez de tirarlo en silencio. La
   sintaxis está en docs/mcp-extensiones/markdown.md. */
import {readFileSync, writeFileSync, mkdirSync, statSync, existsSync} from 'node:fs';
import {dirname, basename, extname, posix} from 'node:path';
import {op, escribe, guardaVersion, preparaEntrada, archivoEnCarpeta, rutaSegura, visible, ErrorUso, proyectoValidado} from '../motor.mjs';

const MAX_MD = 2 * 1024 * 1024;
const EXT_MD = ['.md', '.markdown', '.txt'];

import {leeMarkdown, aMarkdown, MARCA} from '../../src/markdown-core.mjs';
export {leeMarkdown, aMarkdown, MARCA};

/* ---------- herramientas ---------- */
let zonasCache = null;
async function zonasPorDiseno() {
  if (!zonasCache) zonasCache = Object.fromEntries((await op('guia')).disenos.map(d => [d.id, d.zonas]));
  return zonasCache;
}

const META_ARGS = ['titulo', 'subtitulo', 'autores', 'institucion', 'fecha', 'tema', 'aspecto', 'acento'];

async function importa(a) {
  if ((a.archivo_md == null) === (a.markdown == null)) throw new ErrorUso('Pasa «archivo_md» (un .md de la carpeta de trabajo) o «markdown» (el texto), uno de los dos.');
  let texto, carpeta = '';
  if (a.archivo_md != null) {
    const ruta = archivoEnCarpeta(a.archivo_md, 'el archivo Markdown', MAX_MD);
    if (!EXT_MD.includes(extname(ruta).toLowerCase())) throw new ErrorUso('«archivo_md» debe ser .md, .markdown o .txt.');
    texto = readFileSync(ruta, 'utf8');
    carpeta = posix.dirname(visible(ruta));
  } else {
    texto = String(a.markdown);
    if (Buffer.byteLength(texto) > MAX_MD) throw new ErrorUso('El Markdown pasa de 2 MB.');
  }
  const destino = rutaSegura(a.archivo, '.json');
  if (!a.probar && existsSync(destino) && !a.sobrescribir) throw new ErrorUso('«' + visible(destino) + '» ya existe. Elige otro nombre o pasa sobrescribir: true (la versión anterior queda en el historial).');

  const r = leeMarkdown(texto);
  if (!r.diapositivas.length && !r.meta.titulo) throw new ErrorUso('El Markdown no tiene ni título ni diapositivas: usa «# Título» y «## Diapositiva» (ver guia_formato, convención «markdown»).');
  /* Las imágenes se buscan junto al .md, dentro de la carpeta de trabajo;
     el error dice la línea del Markdown. */
  for (const [b, n] of r.imagenes) {
    if (b.archivo == null) continue;
    if (carpeta && carpeta !== '.') b.archivo = posix.join(carpeta, b.archivo);
    try { archivoEnCarpeta(b.archivo, 'la imagen', Infinity); }
    catch (e) { throw new ErrorUso('Línea ' + n + ' del Markdown: ' + e.message); }
  }
  const meta = {...r.meta};
  META_ARGS.forEach(k => { if (a[k] != null) meta[k] = a[k]; });
  let res;
  try {
    const entrada = await preparaEntrada({...meta, diapositivas: r.diapositivas});
    res = await op('nueva', entrada);
  } catch (e) {
    /* «Diapositiva 3 del lote» se traduce a la línea del Markdown. */
    const x = /^Diapositiva (\d+) del lote/.exec(e.message);
    if (x && r.lineas[+x[1] - 1]) throw new ErrorUso('Línea ' + r.lineas[+x[1] - 1] + ' del Markdown: ' + e.message);
    throw e;
  }
  const avisosApp = [...res.avisos];
  if (r.portada.notas || r.portada.minutos) {
    res = await op('editaDiapositiva', {deck: res.deck, diapositiva: 1, notas: r.portada.notas || undefined, minutos: r.portada.minutos || undefined});
    avisosApp.push(...res.avisos);
  }
  const deck = res.deck;
  if (!a.probar) {
    guardaVersion(destino, 'importar_markdown');
    escribe(destino, deck);
  }
  const bloques = sl => ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'].reduce((s, k) => s + (sl[k] || []).length, 0);
  return {
    archivo: visible(destino), escrito: !a.probar, diapositivas: deck.slides.length,
    minutos: Math.round(deck.slides.reduce((s, sl) => s + (+sl.min || 0), 0) * 100) / 100,
    esquema: deck.slides.map((sl, k) => ({n: k + 1, diseno: sl.layout, titulo: k === 0 ? deck.meta.title : sl.title, bloques: bloques(sl), ...(sl.min ? {minutos: sl.min} : {}), ...(sl.notes ? {notas: true} : {})})),
    avisos: [...r.avisos, ...new Set(avisosApp)],
    nota: a.probar ? 'Solo se analizó: no se escribió nada. Repite sin «probar» para crear el proyecto.'
      : 'Revisa con revisar_presentacion y mira el mosaico con vista_previa. Las figuras de datos y las estructuras químicas se añaden después con agregar_bloque.'
  };
}

async function exporta(a) {
  const {ruta, deck} = await proyectoValidado(a.archivo);
  const base = basename(ruta, '.json');
  const junto = posix.dirname(visible(ruta));
  const destino = rutaSegura(a.destino || (junto === '.' ? '' : junto + '/') + base + '.md', '.md');
  /* El nombre por omisión suele coincidir con el guion del que se importó:
     un .md escrito a mano (con comentarios, negritas o enlaces que la
     importación quitó) no se pisa. Una exportación anterior sí. */
  if (existsSync(destino) && !readFileSync(destino, 'utf8').includes(MARCA))
    throw new ErrorUso('«' + visible(destino) + '» ya existe y no es una exportación de Tabula: no se sobrescribe. Indica otro nombre en «destino».');
  const carpetaFiguras = basename(destino, extname(destino)) + '-figuras';
  const r = aMarkdown(deck, {zonasPorDiseno: await zonasPorDiseno(), carpetaFiguras});
  mkdirSync(dirname(destino), {recursive: true});
  if (r.figuras.length) {
    const dir = rutaSegura(posix.join(posix.dirname(visible(destino)), carpetaFiguras));
    mkdirSync(dir, {recursive: true});
    r.figuras.forEach(f => writeFileSync(dir + '/' + f.nombre, f.bytes));
  }
  writeFileSync(destino, r.md);
  return {
    archivo: visible(destino), bytes: statSync(destino).size, diapositivas: deck.slides.length,
    figuras: r.figuras.map(f => posix.join(posix.dirname(visible(destino)), carpetaFiguras, f.nombre).replace(/^\.\//, '')),
    avisos: r.avisos,
    nota: 'Las imágenes siguen incrustadas en el proyecto; aquí se extrajeron a ' + carpetaFiguras + '/ para que el Markdown se pueda volver a importar con importar_markdown.'
  };
}

export default {
  herramientas: [{
    name: 'importar_markdown', title: 'Importar Markdown',
    description: 'Crea una presentación desde un guion en Markdown, en una sola operación (entra entero o no entra): cabecera YAML o el primer «# » → título y metadatos; «# » → sección; «## » → diapositiva; viñetas (anidadas hasta 3 niveles); párrafos → texto; $$…$$ → ecuación; \\ce{…} o ```chem → reacción; ```lang → código; tablas | con encabezado; ![pie](ruta.png) → imagen de la carpeta; «Notas:» o «> nota:» → notas del orador; <!-- minutos: 2 --> → tiempo; --- → corte; «::: columnas» con ||| → dos columnas. Avisa de lo que no tiene equivalente. La sintaxis completa está en guia_formato (convención «markdown»).',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo_md: {type: 'string', description: 'Archivo .md de la carpeta de trabajo. Las imágenes se buscan junto a él.'},
      markdown: {type: 'string', description: 'El Markdown como texto, en lugar de archivo_md. Las imágenes se buscan en la carpeta de trabajo.'},
      archivo: {type: 'string', description: 'Proyecto JSON que se crea, p. ej. «charla-hdl».'},
      sobrescribir: {type: 'boolean', description: 'Reemplaza un proyecto existente (la versión anterior queda en el historial).'},
      probar: {type: 'boolean', description: 'Solo analiza y valida: devuelve el esquema y los avisos sin escribir nada.'},
      titulo: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string', description: 'Id de tema (guia_formato). Manda sobre el de la cabecera, como el resto de metadatos.'},
      aspecto: {type: 'string', enum: ['169', '43']}, acento: {type: 'string', pattern: '^#[0-9a-fA-F]{6}$'}}},
    annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
    run: importa
  }],
  convenciones: {
    markdown: 'importar_markdown y exportar_presentacion (formato «markdown»): cabecera YAML opcional (titulo, subtitulo, autores, institucion, fecha, tema, aspecto, acento); sin cabecera, el primer «# » es el título. «# X» sección; «## X» diapositiva; «### X» texto grande; «---» corte (diapositiva sin título); «- » viñetas (dos espacios por nivel, hasta 3); párrafo → texto (\\ o dos espacios al final = salto de línea; $…$ en línea se conserva); «$$…$$» ecuación; «\\ce{…}» solo en su párrafo, «$$\\ce{…}$$» o ```chem → reacción; ```lang → código; tabla | con fila separadora |---| (todas :--- = alineada a la izquierda) y «Tabla: pie» debajo; ![pie](ruta.png "texto alternativo"){w=60} → imagen (ruta junto al .md, dentro de la carpeta de trabajo); «> cita» con «> — Autor»; «Notas:» hasta la siguiente diapositiva o «> nota: …» → notas del orador; <!-- minutos: 2 -->, <!-- diseno: enunciado -->, <!-- encabezados: A | B -->; «::: columnas [40]» … «|||» … «:::» → columnas (2 twocol, 3 tres, 4 cuadricula). Negrita, cursiva, enlaces y HTML no existen en la app: se quitan con aviso; \\*, \\_, \\`, \\[ y \\~ escriben el carácter tal cual. La exportación no pisa un .md escrito a mano: usa «destino».'
  },
  formatos: {markdown: exporta}
};
