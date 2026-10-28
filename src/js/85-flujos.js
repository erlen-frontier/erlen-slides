/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
/* Extensiones locales y optativas: no se contacta con CDN ni proveedores. */
const EXT_SLIDES = new Map();
const EXT_RUTAS = { markdown: 'markdown-core.mjs', mermaid: 'mermaid/mermaid.esm.min.mjs', pptx: 'pptxgen.bundle.js', operaciones: 'operaciones.js', exportador: 'exportaciones-avanzadas.js', flujos: 'flujos-editor.js', pptxcore: 'pptx-core.mjs', figurascore: 'figuras-core.mjs', fabric: 'fabric.mjs', importar: 'importar-presentacion.js', figuras: 'figuras-editor.js', compartir: 'compartir-presentacion.js', catalogo: 'figures-catalog/index.mjs' };
async function extensionSlides(nombre) {
  if (!EXT_RUTAS[nombre]) throw new Error('Herramienta desconocida.');
  if (location.protocol === 'file:') throw new Error('Sirve la carpeta de la aplicación con un servidor local para usar esta herramienta.');
  if (!EXT_SLIDES.has(nombre)) {
    const url = new URL('libre/' + EXT_RUTAS[nombre], document.baseURI).href;
    const carga = ['markdown', 'mermaid', 'pptxcore', 'figurascore', 'fabric', 'catalogo'].includes(nombre) ? import(url) : new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = url;
      const timer = setTimeout(() => { s.remove(); reject(new Error('La herramienta no terminó de cargar. Inténtalo de nuevo.')); }, 20000);
      s.onload = () => { clearTimeout(timer); resolve(({ pptx: window.PptxGenJS, exportador: window.ERLEN_EXPORTADORES, flujos: window.ERLEN_FLUJOS, importar: window.ERLEN_IMPORTAR, figuras: window.ERLEN_FIGURAS, compartir: window.ERLEN_COMPARTIR })[nombre] || window.ERLEN_MCP); };
      s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('No se pudo cargar la herramienta local. Comprueba el paquete de la aplicación.')); };
      document.head.append(s);
    });
    EXT_SLIDES.set(nombre, carga.catch(e => { EXT_SLIDES.delete(nombre); throw e; }));
  }
  return EXT_SLIDES.get(nombre);
}

function fuenteDiagramaValida(texto) {
  return typeof texto === 'string' && texto.trim().length > 0 && texto.length <= 20000 && !/%%\{|^\s*click\s|<\/?(?:script|iframe|img|foreignObject)\b|https?:\/\//im.test(texto);
}
const GRABACION = { recorder: null, pistas: [], solicitando: false };
async function flujoSlides(nombre, args) { const ext = await extensionSlides('flujos'); return ext[nombre](...args); }
function deckDesdeMarkdown(...args) { return flujoSlides('deckDesdeMarkdown', args); }
function openMarkdown(...args) { return flujoSlides('openMarkdown', args).catch(e => toast(e.message, 'warn')); }
function exportMarkdownUI(...args) { return flujoSlides('exportMarkdownUI', args).catch(e => toast(e.message, 'warn')); }
function exportPPTXEditable() { return openCompartir('pptx'); }
function openHTMLPresentacion() { return openCompartir('html'); }
function generaDiagrama(...args) { return flujoSlides('generaDiagrama', args); }
function openDiagramaTexto(...args) { return flujoSlides('openDiagramaTexto', args).catch(e => toast(e.message, 'warn')); }
function openTemasVisuales(...args) { return flujoSlides('openTemasVisuales', args).catch(e => toast(e.message, 'warn')); }
function openGrabacion(...args) { return flujoSlides('openGrabacion', args).catch(e => toast(e.message, 'warn')); }
function openOrganizarBloques(...args) { return flujoSlides('openOrganizarBloques', args).catch(e => toast(e.message, 'warn')); }
async function openImportarPresentacion() { if (location.protocol === 'file:') return importJSON(); try { return (await extensionSlides('importar')).openImportarPresentacion(); } catch (e) { toast(e.message, 'warn'); } }
async function openFiguraCapas(b) { try { return await (await extensionSlides('figuras')).openFiguraCapas(b); } catch (e) { toast(e.message, 'warn'); } }
async function openCompartir(formato) { try { return (await extensionSlides('compartir')).openCompartir(formato); } catch (e) { toast(e.message, 'warn'); } }
/* Save-time insertion: cancelling a figure editor never creates a slide.
   A cover or section gets one blank figure slide, in the same undo step. */
function insertaFiguraNueva(b, slide) {
  const i = S.deck.slides.indexOf(slide); if (i < 0) throw new Error('La diapositiva ya no está abierta.');
  if (!zonasDe(slide.layout)) {
    const nueva = { id: uid(), layout: 'blanco', title: b.alt || '', blocks: [b] };
    S.deck.slides.splice(i + 1, 0, nueva); S.cur = i + 1; SESION.nuevas++;
  } else zona(slide, clamp((S.insCol || 1) - 1, 0, zonasDe(slide.layout) - 1)).push(b);
}
