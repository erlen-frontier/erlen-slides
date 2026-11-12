/* ==== 75-articulo.js ==== */
'use strict';
/* ================= de la charla al artículo =================
   La cadena de afirmaciones son los encabezados; lo que dices en las notas es
   la prosa; las figuras, tablas y ecuaciones van con sus pies; las referencias
   ya están numeradas. Un botón produce el esqueleto LaTeX del artículo, con el
   mismo preámbulo que ya compila para la charla. No escribe el artículo por
   ti: te ahorra volver a capturar lo que ya tienes. */

let TEX_PLANO = false;   /* sin overlays: lo que va a un artículo, no a un proyector */
const LINEAS_BEAMER = /\\(usetheme|usecolortheme|usefonttheme|useinnertheme|useoutertheme|metroset|setbeamer|usebeamer|AtBeginSection|AtBeginSubsection|institute|titlegraphic|logo\{|mode<|beamertemplatenavigation|setbeamertemplate|addtobeamertemplate|deftranslation|hypersetup|setbeamersize|setbeamerfont)|pgfpages|beamer/;

function preambuloArticulo(deck) {
  const todo = toBeamer(deck);
  const ini = todo.indexOf('\\begin{document}');
  const cab = todo.slice(0, ini).split('\n');
  const out = ['\\documentclass[11pt,a4paper]{article}', '\\usepackage[margin=2.5cm]{geometry}', '\\usepackage{xcolor}'];
  cab.forEach(l => {
    if (/^\\documentclass/.test(l)) return;
    if (LINEAS_BEAMER.test(l)) return;
    if (/^\\(title|subtitle|author|date)\b/.test(l)) return;      /* se ponen aparte, a la manera de article */
    if (/^\s*%/.test(l) && /Beamer|beamer|tema|frame/i.test(l)) return;
    out.push(l);
  });
  out.push('\\usepackage{caption}', '\\captionsetup{font=small,labelfont=bf}', '\\setlength{\\parskip}{4pt}',
    '% Lo que en Beamer son cajas y columnas, aquí son párrafos con título y minipages.',
    '\\newenvironment{block}[1]{\\par\\medskip\\noindent\\textbf{#1}\\par\\nobreak\\smallskip}{\\par\\medskip}',
    '\\newenvironment{alertblock}[1]{\\par\\medskip\\noindent\\textcolor{tabulaacento}{\\textbf{#1}}\\par\\nobreak\\smallskip}{\\par\\medskip}',
    '\\newenvironment{exampleblock}[1]{\\par\\medskip\\noindent\\textbf{#1}\\par\\nobreak\\smallskip}{\\par\\medskip}',
    '\\newenvironment{columns}[1][]{\\par\\noindent}{\\par}',
    '\\newenvironment{column}[1]{\\begin{minipage}[t]{#1}}{\\end{minipage}\\hfill}',
    '\\providecommand{\\alert}[1]{\\textcolor{tabulaacento}{#1}}',
    '\\providecommand{\\structure}[1]{\\textbf{#1}}',
    '\\providecommand{\\pause}{}');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
/* Un bloque «plano»: sin capas, sin después, sin pasos. */
function aplana(b) {
  const c = Object.assign({}, b);
  if (c.type === 'chart') { c.capas = false; c.despues = null; delete c.destaca; }
  if (c.type === 'image') c.despues = null;
  if (c.type === 'bullets') c.step = false;
  c.step = false;
  return c;
}
function articuloTex(deck) {
  const d = deck || S.deck;
  const m = d.meta;
  TEX_PLANO = true;
  TEX_DECK = d;
  try {
    if (typeof sincronizaBib === 'function') sincronizaBib(d);
    const L = [preambuloArticulo(d), '', '\\title{' + texInline(m.title || 'Título') + (m.subtitle ? '\\\\[4pt]{\\large ' + texInline(m.subtitle) + '}' : '') + '}',
      '\\author{' + texInline(m.authors || '') + (m.institute ? '\\\\ {\\small ' + texInline(m.institute) + '}' : '') + '}',
      '\\date{' + texInline(m.date || '') + '}', '', '\\begin{document}', '\\maketitle', '',
      '\\begin{abstract}', '% Escribe aquí el resumen: una frase por afirmación de la charla suele bastar.',
      hiloArgumento(d).replace(/\{\{|\}\}/g, ''), '\\end{abstract}', ''];
    const cuerpo = [], extra = [];
    let enSeccion = false;
    d.slides.forEach(sl => {
      if (sl.layout === 'title' || sl.layout === 'toc' || sl.bibAuto || fueraDeRama(sl, d)) return;
      const dest = esRespaldo(sl) ? extra : cuerpo;
      if (sl.layout === 'section') { dest.push('\\section{' + texInline(sl.title || 'Sección') + '}', ''); enSeccion = true; return; }
      if (!esRespaldo(sl) && !enSeccion) { cuerpo.push('\\section{Introducción}', ''); enSeccion = true; }
      const tit = (sl.title || '').trim();
      if (tit && !esCierre(tit)) dest.push('\\subsection{' + texInline(tit.replace(/\{\{|\}\}/g, '')) + '}', '');
      const notas = String(sl.notes || '').trim();
      if (notas) { dest.push(texBlockText(notas.replace(/^\s*[-•*]\s+/gm, '')), ''); }
      const bloques = zonas(sl).flat().filter(b => bloqueVisible(b, d) && b.type !== 'refs' && b.type !== 'spacer' && b.type !== 'video').map(aplana);
      if (bloques.length) { dest.push(texBlocks(bloques, ''), ''); }
    });
    L.push(...cuerpo);
    if (extra.length) { L.push('\\section{Material complementario}', '% Lo que en la charla era respaldo para preguntas.', '', ...extra); }
    if (ordenRefs(d).length) { L.push('\\section*{Referencias}', referenciasTex(d, '', null), ''); }
    L.push('\\end{document}', '');
    return L.join('\n').replace(/\n{3,}/g, '\n\n');
  } finally { TEX_PLANO = false; TEX_DECK = null; }
}
function exportArticulo() {
  const tex = articuloTex(S.deck);
  downloadFile(deckSlug() + '-articulo.tex', tex, 'text/plain');
  toast('Esqueleto del artículo listo. Las figuras son las mismas de «Descargar figuras».');
}


