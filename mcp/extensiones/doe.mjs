/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «doe»: un informe de Erlen DoE (informe-v1) como presentación.

   El informe llega a la carpeta de trabajo de dos maneras: la copia que DoE
   descarga fuera de la suite (erlen-copia-slides-<id8>.json, un registro de
   intercambio v2 con su SHA-256) o el informe suelto (el payload
   erlen-context-copy-v1). La copia se verifica aquí, con el mismo transporte
   que el editor (web/exchange-v2.mjs); validar y convertir se hace en la
   página (doe.pagina.js) con leeInforme e informeADeck. Nada de lo que trae
   el informe se reescribe: las cifras, los recortes que el módulo anuncia y
   la diapositiva de procedencia salen tal cual. */
import {readFileSync, statSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {op, rutaSegura, archivoEnCarpeta, guardaVersion, escribe, visible, ErrorUso} from '../motor.mjs';
import {verifyTransfer, TRANSFER_LIMIT} from '../../web/exchange-v2.mjs';

const ZONAS = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'];
const SIMULADO = 'DATOS SIMULADOS';

/* El archivo y lo que informeADeck necesita para la procedencia: id, huella
   y fecha de la copia. */
async function leeCopia(archivo) {
  const ruta = archivoEnCarpeta(archivo, 'el informe', TRANSFER_LIMIT);
  const bytes = readFileSync(ruta);
  let bruto;
  try { bruto = JSON.parse(bytes.toString('utf8')); } catch (e) { throw new ErrorUso('«' + visible(ruta) + '» no es un JSON válido: ' + e.message); }
  if (bruto && typeof bruto === 'object' && !Array.isArray(bruto) && bruto.version === 2 && 'payloadJSON' in bruto) {
    /* verifyTransfer comprueba forma, destino y huella: una copia tocada a
       mano o dirigida a otra app no se abre, igual que en el editor. */
    let r;
    try { r = await verifyTransfer(bruto, 'slides'); } catch (e) { throw new ErrorUso('«' + visible(ruta) + '»: ' + e.message); }
    return {ruta, payload: r.payload, copia: {id: r.id, sha256: r.sha256, createdAt: r.createdAt},
      forma: 'copia de intercambio verificada', avisos: []};
  }
  /* Un informe suelto no trae copia: se identifica por su nombre y la huella
   de sus bytes, y la fecha es la del archivo. Se dice, para que nadie tome
   esa fecha por la del envío desde DoE. */
  return {ruta, payload: bruto, copia: {id: basename(ruta), sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: Math.floor(statSync(ruta).mtimeMs)},
    forma: 'informe suelto',
    avisos: ['El archivo es el informe sin su copia de intercambio: la procedencia lleva el nombre del archivo, el SHA-256 de sus bytes y su fecha de modificación como fecha de envío.']};
}

/* Lo que se creó, diapositiva a diapositiva, en la forma de la vista previa
   del editor (previewInforme). */
function lista(deck) {
  return deck.slides.map((sl, i) => {
    const bl = ZONAS.flatMap(k => sl[k] || []);
    return {n: i + 1, id: sl.id, diseno: sl.layout,
      titulo: String(sl.layout === 'title' ? deck.meta.title : sl.title || '').replace(/\\\$/g, '$') + (/continuación/.test(sl.subtitle || '') && !/\(\d+\/\d+\)$/.test(sl.title || '') ? ' (cont.)' : ''),
      contenido: sl.layout === 'title' ? 'portada' : bl.map(b => b.type === 'table' ? 'tabla de ' + ((b.rows || []).length - 1) + ' filas' : b.type === 'chart' ? 'gráfica' : b.type === 'bullets' ? (b.items || []).length + ((b.items || []).length === 1 ? ' viñeta' : ' viñetas') : b.type === 'code' ? 'código' : 'texto').join(' · ')};
  });
}

const procedencia = o => o && {aplicacion: o.app, titulo: o.titulo, proyecto: o.proyecto || null, copia: o.id, sha256: o.sha256, enviada: o.creada, recibida: o.recibida, simulado: o.simulado};

const archivo_informe = {type: 'string', description: 'Archivo JSON de la carpeta de trabajo con el informe: la copia que descarga DoE (erlen-copia-slides-<id8>.json) o el informe informe-v1 suelto.'};
const META = ['titulo', 'subtitulo', 'autores', 'institucion', 'fecha', 'tema', 'acento'];

export default {
  herramientas: [{
    name: 'importar_informe_doe', title: 'Importar informe de Erlen DoE',
    description: 'Convierte un informe de Erlen DoE (informe-v1: matriz del diseño, efectos, ANOVA, figuras…) en una presentación nueva, con la misma conversión del editor: portada, secciones repartidas para que quepan, tablas recortadas a lo que se lee de lejos (el recorte se dice en el pie y en las notas), figuras como gráficas de datos editables y una diapositiva de procedencia al final con la huella de la copia. Acepta la copia de intercambio (se verifica su SHA-256) o el informe suelto. No cambia ninguna cifra del informe. Devuelve los avisos de la conversión, la lista de diapositivas y la procedencia.',
    inputSchema: {type: 'object', required: ['archivo_informe', 'archivo'], properties: {
      archivo_informe,
      archivo: {type: 'string', description: 'Proyecto nuevo que se crea en la carpeta de trabajo.'},
      sobrescribir: {type: 'boolean', description: 'Reemplaza un proyecto existente; la versión anterior queda en el historial.'},
      titulo: {type: 'string', description: 'Título de la portada; por omisión, el del informe.'},
      subtitulo: {type: 'string', description: 'Si el informe declara datos simulados, se conserva «DATOS SIMULADOS».'},
      autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string', description: 'Id de tema (guia_formato). El reparto se mide con Metropolis: con otro tema, revisa con vista_previa.'},
      acento: {type: 'string', pattern: '^#[0-9a-fA-F]{6}$'}}},
    annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
    run: async a => {
      const c = await leeCopia(a.archivo_informe);
      const destino = rutaSegura(a.archivo, '.json');
      /* Se comparan los archivos, no los nombres: en un disco que no distingue
         mayúsculas, o con un enlace, dos nombres pueden ser el mismo informe. */
      const mismo = () => { const x = statSync(destino), y = statSync(c.ruta); return x.dev === y.dev && x.ino === y.ino; };
      if (destino === c.ruta || (existsSync(destino) && mismo())) throw new ErrorUso('El proyecto no puede llamarse como el informe: «' + visible(c.ruta) + '» se conserva intacto. Elige otro nombre.');
      if (existsSync(destino) && !a.sobrescribir) throw new ErrorUso('«' + visible(destino) + '» ya existe. Elige otro nombre o pasa sobrescribir: true (la versión anterior queda en el historial).');
      const r = await op('informeDoe', {payload: c.payload, copia: c.copia});
      let deck = r.deck, avisos = r.avisos;
      const cambios = {};
      for (const k of META) if (a[k] != null) cambios[k] = String(a[k]);
      /* Un informe con datos simulados lo dice en el subtítulo de la portada;
         un subtítulo propio no puede borrarlo. */
      if (r.simulado && cambios.subtitulo != null && !cambios.subtitulo.includes(SIMULADO)) cambios.subtitulo = [cambios.subtitulo.trim(), SIMULADO].filter(Boolean).join(' · ');
      if (Object.keys(cambios).length) {
        const m = await op('metadatos', {deck, cambios});
        deck = m.deck; avisos = [...new Set(avisos.concat(m.avisos))];
      }
      guardaVersion(destino, 'importar_informe_doe');
      escribe(destino, deck);
      const notas = ['La última diapositiva es la procedencia del informe: consérvala.',
        'Las cifras son las del informe; si algo se recortó para caber, lo dicen el pie y las notas de esa diapositiva, y el informe completo sigue en Erlen DoE.'];
      if (r.simulado) notas.unshift('El informe declara DATOS SIMULADOS: la portada, cada diapositiva y la procedencia lo dicen. No los presentes como mediciones.');
      if (cambios.tema && cambios.tema !== 'metropolis') notas.push('El reparto de texto y tablas se midió con Metropolis: con el tema «' + cambios.tema + '», mira vista_previa por si algo no cabe.');
      notas.push('Siguiente paso: revisar_presentacion y vista_previa; añade tu interpretación en diapositivas nuevas sin cambiar los valores del informe.');
      return {archivo: visible(destino), informe: visible(c.ruta), forma: c.forma, diapositivas: deck.slides.length, lista: lista(deck),
        avisos_conversion: r.conversion, avisos: c.avisos.concat(avisos), procedencia: procedencia(deck.meta.origen), simulado: r.simulado, notas};
    }
  }, {
    name: 'vista_previa_informe', title: 'Vista previa de un informe de DoE',
    description: 'Valida un informe de Erlen DoE (copia de intercambio o informe-v1 suelto) y resume lo que importar_informe_doe crearía, sin escribir nada: secciones, tablas y figuras del informe, diapositivas resultantes, recortes que habría que hacer, procedencia y los límites del tipo informe-v1. Si el informe no es válido, devuelve el motivo.',
    inputSchema: {type: 'object', required: ['archivo_informe'], properties: {archivo_informe}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const c = await leeCopia(a.archivo_informe);
      const r = await op('informeDoe', {payload: c.payload, copia: c.copia});
      return {informe: visible(c.ruta), forma: c.forma, valido: true, contenido: r.informe, simulado: r.simulado,
        diapositivas: r.deck.slides.length, lista: lista(r.deck), avisos_conversion: r.conversion, avisos: c.avisos.concat(r.avisos),
        procedencia: procedencia(r.deck.meta.origen), limites: r.limites};
    }
  }],
  prompts: [{
    name: 'charla_desde_informe_doe', title: 'Charla a partir de un informe de DoE',
    description: 'Convierte un informe de Erlen DoE en una charla de reunión de grupo sin tocar sus cifras.',
    arguments: [{name: 'archivo_informe', description: 'La copia o el informe en la carpeta de trabajo.', required: true}, {name: 'minutos', description: 'Duración prevista.'}],
    texto: a => `Quiero presentar el informe de Erlen DoE «${a.archivo_informe}» en una reunión de grupo${a.minutos ? ' de ' + a.minutos + ' minutos' : ''}.
1. Llama a vista_previa_informe y cuéntame qué trae, qué tablas o figuras habría que recortar y si declara datos simulados.
2. Pregúntame autores, institución y el nombre del proyecto; después llama a importar_informe_doe.
3. Ejecuta revisar_presentacion${a.minutos ? ' con minutos_objetivo=' + a.minutos : ''} y enséñame el mosaico de vista_previa.
4. Propón una diapositiva de conclusiones con lo que dice el informe, sin inventar resultados ni cambiar valores, y déjala antes de la procedencia, que va siempre al final.`
  }]
};
