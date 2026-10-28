/* SPDX-License-Identifier: AGPL-3.0-only */
/* Catalog data and drawings are from Erlen Figures 0.21.0. The registry keeps
   the original author, license and normalized drawing identity for each asset. */
import entries, {LICENSE_NOTICES, SOURCES, CHANGES} from './assets/registry-index.mjs';
import {LAB as drawings, piezaSvg} from './catalog.mjs';

const ownGroups = new Set(['sintesis','caracter','materiales','ecologia','tierra','datos','social','ingenieria','astro']);
const groupAreas = {fisica:'Física', circuito:'Ingeniería', bio:'Biología', forma:'Formas y rótulos'};
const assets = entries.map(({source, changes, ...entry}) => {
  const [repository, commit] = SOURCES[source].split(' ');
  return Object.freeze({...entry, repository, commit,
    changes:changes.map(index => CHANGES[index]),
    licenseNotice:LICENSE_NOTICES[entry.notice || entry.license] || '',
    url:entry.url || `https://github.com/${repository}/blob/${commit}/${entry.path}`});
});
const native = drawings.map(entry => Object.freeze({
  area:groupAreas[entry.grp] || 'Laboratorio', type:'Ilustración de laboratorio', tags:[], ...entry,
  provider:ownGroups.has(entry.grp) ? 'erlen' : 'slides',
  author:ownGroups.has(entry.grp) ? 'Erlen Figures' : 'Slides 2.0 contributors',
  license:'AGPL-3.0-only'
}));
export const CATALOGO = Object.freeze([...assets, ...native]);
const byId = new Map(CATALOGO.map(entry => [entry.id, entry]));
const loaded = new Map(), pending = new Map(), attempts = new Map();
const normalize = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

export function buscarPiezas(texto = '', area = '') {
  const words = normalize(texto).trim().split(/\s+/).filter(Boolean);
  return CATALOGO.filter(entry => (!area || entry.area === area) && words.every(word =>
    normalize([entry.n, entry.name, entry.area, entry.provider, entry.author, entry.type, ...(entry.tags || [])].join(' ')).includes(word)));
}
export function piezaLista(id) {
  const entry = byId.get(id);
  return !!entry && (!entry.sha256 || loaded.has(id));
}
async function dibujo(entry) {
  if (!entry.sha256) return null;
  if (!/^[a-z0-9-]+$/.test(entry.chunk)) throw new Error('El archivo del catálogo no es válido.');
  if (!pending.has(entry.chunk)) {
    const attempt = attempts.get(entry.chunk) || 0;
    const suffix = attempt ? '?reintento=' + attempt : '';
    pending.set(entry.chunk, import(`./assets/chunks/${entry.chunk}.mjs${suffix}`).then(module => {
      for (const [id, svg] of Object.entries(module.default)) if (typeof svg === 'string') loaded.set(id, svg);
    }).catch(error => {
      pending.delete(entry.chunk); attempts.set(entry.chunk, attempt + 1);
      throw new Error('No se pudo cargar el dibujo del catálogo: ' + error.message);
    }));
  }
  await pending.get(entry.chunk);
  const svg = loaded.get(entry.id);
  if (!svg) throw new Error('El dibujo no está disponible en el catálogo.');
  return svg;
}
function procedencia(entry) {
  if (!entry.sha256) return {id:entry.id, name:entry.n, author:entry.author, license:entry.license,
    licenseURL:'https://www.gnu.org/licenses/agpl-3.0.html',
    url:'https://github.com/erlen-frontier/erlen-suite/blob/c8e743be0c0b88433cdf7a2807e6757c03e873af/apps/figures/src/catalog.mjs', changes:[]};
  return {id:entry.id, name:entry.n, originalTitle:entry.name,
    creatorURL:entry.author === 'Servier' ? 'https://smart.servier.com/' : entry.url,
    provider:entry.provider, repository:entry.repository, commit:entry.commit, path:entry.path,
    sha256:entry.sha256, normalizedSHA256:entry.normalizedSHA256, author:entry.author,
    license:entry.license, licenseNotice:entry.licenseNotice, licenseURL:entry.licenseURL,
    url:entry.url, changes:entry.changes.slice()};
}
export function textoAtribucion(source) {
  return [source.name + (source.originalTitle ? ' (' + source.originalTitle + ')' : ''),
    source.author + ' · ' + source.license, source.url, source.creatorURL !== source.url ? source.creatorURL : '',
    source.licenseURL, source.changes?.length ? 'Cambios: ' + source.changes.join('; ') : '', source.licenseNotice]
    .filter(Boolean).join('\n');
}
/* Catalog vectors are normalized at source. Check again before embedding to
   prevent active content or network-dependent resources in the presentation. */
function svgSeguro(source) {
  const parser = new document.defaultView.DOMParser(), parsed = parser.parseFromString(source, 'image/svg+xml');
  const root = parsed.documentElement;
  if (parsed.doctype || root?.localName !== 'svg' || parsed.querySelector('parsererror,script,foreignObject,iframe,object,embed')) {
    throw new Error('El dibujo del catálogo no es un SVG compatible.');
  }
  for (const node of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of node.attributes) {
      if (attribute.name === 'xmlns' || attribute.prefix === 'xmlns') continue;
      const value = attribute.value.trim();
      if (/^on/i.test(attribute.name) || ((attribute.localName === 'href' || attribute.localName === 'src') && !value.startsWith('#'))) {
        throw new Error('El dibujo del catálogo contiene un enlace no compatible.');
      }
      const rest = value.replace(/url\(\s*['"]?#[\w:.-]+['"]?\s*\)/gi, '');
      if (/url\s*\(|@import|javascript:|https?:|data:/i.test(rest)) throw new Error('El dibujo del catálogo contiene un recurso externo.');
    }
    if (node.localName === 'style' && /@import|url\s*\(\s*['"]?(?!#)/i.test(node.textContent)) {
      throw new Error('El dibujo del catálogo contiene estilos externos.');
    }
  }
  return document.importNode(root, true);
}
export async function crearFigura(id) {
  const entry = byId.get(id);
  if (!entry) throw new Error('La pieza no existe en el catálogo.');
  const data = await dibujo(entry), ns = 'http://www.w3.org/2000/svg';
  const root = data ? svgSeguro(data) : document.createElementNS(ns, 'svg');
  if (!data) {
    root.setAttribute('width', '100'); root.setAttribute('height', '140');
    root.setAttribute('viewBox', '0 0 100 140');
    root.append(piezaSvg(entry.id, {traza:'#235747', liq:'#3e86d6', fondo:'#ffffff'}, 'relieve'));
  }
  const credit = procedencia(entry), title = document.createElementNS(ns, 'title');
  title.textContent = entry.n;
  const metadata = document.createElementNS(ns, 'metadata'); metadata.textContent = JSON.stringify(credit);
  const desc = document.createElementNS(ns, 'desc'); desc.textContent = textoAtribucion(credit);
  root.prepend(title, metadata, desc);
  root.setAttribute('role', 'img');
  return {nombre:entry.n, svg:new document.defaultView.XMLSerializer().serializeToString(root), procedencia:credit};
}
