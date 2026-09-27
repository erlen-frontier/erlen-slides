/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «bibliografia»: traer las referencias que el usuario ya tiene en
   un .bib o un .ris, citarlas por su clave y, solo si se permite la red,
   completar una referencia con Crossref a partir de su DOI.

   Node lee los archivos y habla con Crossref; la página interpreta y guarda,
   con los mismos lectores que usa el editor (bibliografia.pagina.js). Nada de
   esto inventa datos: lo que no está en el archivo o en Crossref se queda
   vacío y se informa. */
import {readFileSync} from 'node:fs';
import {basename, extname} from 'node:path';
import {ErrorUso, archivoEnCarpeta, lee, modifica, version} from '../motor.mjs';

const MAX_BIB = 5 * 1024 * 1024;
const ESPERA_MS = 15000;
const archivo = {type: 'string', description: 'Proyecto JSON dentro de la carpeta de trabajo, p. ej. «tesis»; «.json» es opcional.'};
const diapositiva = {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}], description: 'Número de diapositiva (desde 1) o su id.'};
const cambia = {readOnlyHint: false, destructiveHint: false, openWorldHint: false};
const limpiaDOI = s => String(s || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');

/* El formato lo dice la extensión; si no, el contenido. */
function formatoDe(nombre, texto, pedido) {
  if (pedido) return pedido;
  const ext = extname(nombre || '').toLowerCase();
  if (ext === '.bib' || ext === '.bibtex') return 'bib';
  if (ext === '.ris') return 'ris';
  if (/^\s*TY\s+-/m.test(texto)) return 'ris';
  if (/@\w+\s*[{(]/.test(texto)) return 'bib';
  throw new ErrorUso('No reconocí el formato' + (nombre ? ' de «' + nombre + '»' : '') + ': se admite BibTeX (.bib) o RIS (.ris). Indica «formato» si la extensión engaña.');
}

async function importar(a) {
  if ((a.archivo_bib == null) === (a.texto == null)) throw new ErrorUso('Pasa «archivo_bib» (un .bib o .ris de la carpeta de trabajo) o «texto» (su contenido), uno de los dos.');
  let texto, origen = null;
  if (a.archivo_bib != null) {
    const ruta = archivoEnCarpeta(a.archivo_bib, 'el archivo de bibliografía', MAX_BIB);
    const bytes = readFileSync(ruta);
    if (bytes.subarray(0, 8000).includes(0)) throw new ErrorUso('«' + basename(ruta) + '» es binario. Exporta la bibliografía como BibTeX o RIS (texto).');
    texto = bytes.toString('utf8');
    origen = basename(ruta);
  } else {
    texto = String(a.texto);
    if (texto.length > MAX_BIB) throw new ErrorUso('El texto pasa de 5 MB: guárdalo como archivo en la carpeta de trabajo.');
  }
  const formato = formatoDe(origen, texto, a.formato);
  lee(a.archivo);
  const r = await modifica(a.archivo, 'importaBibliografia', {texto, formato}, 'importar_bibliografia');
  /* Un .bib en Latin-1 leído como UTF-8 deja «�» donde iban los acentos. */
  if (texto.includes('�')) r.avisos = (r.avisos || []).concat(['El archivo no parece estar en UTF-8: algunos acentos salieron como «�». Vuelve a exportarlo en UTF-8 (en JabRef y Zotero es una opción al exportar).']);
  return {...(origen ? {origen} : {}), formato, ...r};
}

/* ---------- Crossref ---------- */
const RED_APAGADA = 'completar_por_doi está desactivada: consulta api.crossref.org (el servicio público de metadatos de Crossref, gratuito y sin clave), y este servidor no sale a internet sin permiso. ' +
  'Para activarla, añade ERLEN_SLIDES_RED=1 a las variables de entorno del servidor MCP en la configuración de tu cliente (junto a ERLEN_SLIDES_DIR) y reinícialo; opcionalmente, ERLEN_SLIDES_CORREO=tu@correo para que Crossref sepa a quién avisar si algo falla. ' +
  'Mientras tanto: importar_bibliografia con el .bib o .ris del usuario, o agregar_referencia con los datos que él te dé.';

function agenteUsuario() {
  const correo = String(process.env.ERLEN_SLIDES_CORREO || '').trim();
  /* La «cortesía» de Crossref: identificarse con un correo da acceso a su
     grupo de servidores más estable. Solo si la persona lo configuró. */
  const mailto = /^[^\s@<>();]+@[^\s@<>();]+\.[^\s@<>();]+$/.test(correo) ? '; mailto:' + correo : '';
  return 'ErlenSlides/' + version() + ' (https://github.com/erlen-frontier/erlen-slides' + mailto + ')';
}
async function consultaCrossref(doi) {
  /* ERLEN_SLIDES_CROSSREF solo lo usan las pruebas, con un servidor local. */
  const base = String(process.env.ERLEN_SLIDES_CROSSREF || 'https://api.crossref.org').replace(/\/+$/, '');
  let res;
  try {
    res = await fetch(base + '/works/' + encodeURIComponent(doi), {
      headers: {Accept: 'application/json', 'User-Agent': agenteUsuario()},
      signal: AbortSignal.timeout(ESPERA_MS), redirect: 'follow'
    });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new ErrorUso('Crossref no respondió en ' + ESPERA_MS / 1000 + ' s. Inténtalo más tarde; no se cambió nada.');
    throw new ErrorUso('No se pudo llegar a Crossref (' + (e && e.cause && e.cause.code || e && e.message || e) + '). Revisa la conexión; no se cambió nada.');
  }
  if (res.status === 404) throw new ErrorUso('Crossref no conoce el DOI «' + doi + '». Revisa que esté bien copiado; los DOI de DataCite (conjuntos de datos, algunas tesis) no están en Crossref.');
  if (res.status === 429 || res.status === 503) throw new ErrorUso('Crossref pide esperar (' + res.status + '). Inténtalo en un momento; no se cambió nada.');
  if (!res.ok) throw new ErrorUso('Crossref respondió ' + res.status + '; no se cambió nada.');
  let j;
  try { j = await res.json(); } catch { throw new ErrorUso('Crossref devolvió algo que no es JSON; no se cambió nada.'); }
  if (!j || typeof j.message !== 'object' || !j.message) throw new ErrorUso('La respuesta de Crossref no trae metadatos; no se cambió nada.');
  return j.message;
}
async function completar(a) {
  const doi = limpiaDOI(a.doi);
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new ErrorUso('«' + a.doi + '» no parece un DOI (empiezan por «10.», p. ej. 10.1021/ja809467h).');
  if (process.env.ERLEN_SLIDES_RED !== '1') throw new ErrorUso(RED_APAGADA);
  lee(a.archivo);
  const mensaje = await consultaCrossref(doi);
  return {fuente: 'api.crossref.org', ...(await modifica(a.archivo, 'completaDOI', {doi, mensaje, clave: a.clave}, 'completar_por_doi'))};
}

export default {
  herramientas: [
    {name: 'importar_bibliografia', title: 'Importar bibliografía',
      description: 'Añade al proyecto las referencias de un archivo BibTeX (.bib) o RIS (.ris) del usuario (Zotero, Mendeley, JabRef, la web de la revista). Entiende varias entradas, llaves anidadas, acentos de LaTeX ({\\\'e} → é), autores con «and», meses y páginas con «--». No duplica: salta las que ya estaban por DOI o por título y año. Conserva la clave de BibTeX para citar con [@clave] (si no es válida la limpia y lo dice). Informa de las añadidas, las repetidas, las que tienen huecos (sin autores, título o año) y las claves cambiadas. No cita nada: para eso, citar.',
      inputSchema: {type: 'object', required: ['archivo'], properties: {
        archivo,
        archivo_bib: {type: 'string', description: 'Ruta del .bib o .ris en la carpeta de trabajo.'},
        texto: {type: 'string', description: 'O el contenido BibTeX/RIS tal como lo pegó el usuario (en vez de archivo_bib).'},
        formato: {type: 'string', enum: ['bib', 'ris'], description: 'Solo si la extensión no lo deja claro.'}}},
      annotations: cambia, run: importar},
    {name: 'citar', title: 'Citar referencias',
      description: 'Cita referencias del proyecto al pie de una diapositiva por su clave (la de importar_bibliografia, agregar_referencia o ver_presentacion). Devuelve el número que toma cada una en el estilo de la charla. Con bloque_referencias=true se asegura también la diapositiva de referencias. Para citar dentro de un texto, escribe [@clave] en él con editar_bloque.',
      inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'claves'], properties: {
        archivo, diapositiva,
        claves: {type: 'array', minItems: 1, items: {type: 'string'}, description: 'Claves a citar, p. ej. ["Kojima2009"] (se acepta «@Kojima2009»).'},
        bloque_referencias: {type: 'boolean', description: 'Si no hay bloque de referencias, añadirlo (la bibliografía automática, o una diapositiva propia si está apagada).'}}},
      annotations: cambia, run: a => modifica(a.archivo, 'citaClaves', a, 'citar')},
    {name: 'completar_por_doi', title: 'Completar por DOI (Crossref)',
      description: 'Consulta el DOI en api.crossref.org y rellena los campos vacíos de la referencia con ese DOI (o de la de «clave», si aún no tenía DOI y el título coincide); si no existe, la añade. Nunca sobrescribe lo que ya había: las diferencias se devuelven para que decida el usuario. Necesita internet y solo funciona si el servidor se arrancó con ERLEN_SLIDES_RED=1.',
      inputSchema: {type: 'object', required: ['archivo', 'doi'], properties: {
        archivo,
        doi: {type: 'string', description: 'El DOI, con o sin https://doi.org/.'},
        clave: {type: 'string', description: 'Referencia existente sin DOI que completar, o la clave para la nueva.'}}},
      annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: true}, run: completar}
  ],
  prompts: [
    {name: 'citar_desde_bibliografia', title: 'Citar desde mi bibliografía',
      description: 'Importa el .bib o .ris del usuario y propone qué referencia va en cada diapositiva.',
      arguments: [{name: 'archivo', description: 'Proyecto de la carpeta de trabajo', required: true}, {name: 'bibliografia', description: 'El .bib o .ris en la carpeta de trabajo', required: true}],
      texto: a => `En el proyecto «${a.archivo}» de Erlen Slides:
1. Importa mis referencias de «${a.bibliografia}» con importar_bibliografia. Dime cuántas entraron, cuáles ya estaban y cuáles tienen huecos; no rellenes huecos suponiendo datos.
2. Con ver_presentacion, propón qué referencias van en cada diapositiva (una tabla: diapositiva, afirmación que respalda, clave). Usa solo referencias de mi archivo y dime qué afirmaciones se quedan sin fuente.
3. Cuando lo apruebe, cítalas con citar (bloque_referencias=true en la primera) y enséñame la vista previa de una diapositiva con citas y de la bibliografía.`}
  ],
  convenciones: {
    bibliografia: 'Referencias: importar_bibliografia trae las del .bib o .ris del usuario sin duplicar (por DOI o título y año) y conserva su clave de BibTeX; citar las pone al pie de una diapositiva por clave; en un texto se cita con [@clave] o [@una; @otra]. La bibliografía se añade sola al final y se renumera por orden de aparición. completar_por_doi consulta Crossref solo si el servidor tiene ERLEN_SLIDES_RED=1. Nunca inventes referencias ni rellenes campos que no vengan del usuario o de Crossref.'
  }
};
