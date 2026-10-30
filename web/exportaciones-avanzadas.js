/* SPDX-License-Identifier: AGPL-3.0-only */
/* Adaptadores locales. El JSON científico es la fuente; los conversores no lo
   modifican. Los límites se devuelven por diapositiva, nunca en silencio. */
window.ERLEN_EXPORTADORES = (() => {
  const pausa = () => new Promise(r => setTimeout(r, 20));
  const hex = (c, fondo) => hex6(c, fondo).replace('#', '');
  const script = s => '<script>' + s.replace(/<\/script/gi, '<\\/script') + '</script>';
  const json = x => JSON.stringify(x).replace(/</g, '\\u003c');
  async function recurso(ruta) {
    const r = await fetch(new URL('libre/' + ruta, document.baseURI));
    if (!r.ok) throw new Error('No se pudo leer el recurso local ' + ruta + '.');
    return r.text();
  }
  function imagenBase64(src) {
    if (/;base64,/i.test(src)) return src;
    const coma = src.indexOf(','), tipo = src.slice(5, coma).split(';')[0];
    let texto = decodeURIComponent(src.slice(coma + 1));
    if (tipo === 'image/svg+xml') {
      const doc = new DOMParser().parseFromString(texto, 'image/svg+xml'), svg = doc.documentElement;
      if (doc.querySelector('parsererror')) throw new Error('SVG de imagen inválido.');
      const caja = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      // An SVG can deliberately letterbox its viewBox inside a differently
      // proportioned viewport. Preserve explicit pixel sizes so PowerPoint
      // does not stretch the artwork when it fills the measured image box.
      const size = name => {
        const value = (svg.getAttribute(name) || '').trim();
        return /^(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(value) && parseFloat(value) > 0;
      };
      if ((!size('width') || !size('height')) && caja.length === 4 && caja.every(Number.isFinite) && caja[2] > 0 && caja[3] > 0) { svg.setAttribute('width', caja[2]); svg.setAttribute('height', caja[3]); }
      texto = new XMLSerializer().serializeToString(svg);
    }
    let bin = ''; for (const n of new TextEncoder().encode(texto)) bin += String.fromCharCode(n);
    return 'data:' + tipo + ';base64,' + btoa(bin);
  }
  function chartNativo(b) {
    if (b.type !== 'chart' || !['linea', 'dispersion', 'barras'].includes(b.kind) || b.logX || b.logY || b.offset || b.area || b.xrev || b.invertirX || b.destaca || b.capas || b.despues || b.region || b.regiones || b.picos?.length || b._ejes || b.xminAuto === false || b.yminAuto === false) return null;
    const series = chartSeries(b);
    if (!series.length || series.some(s => s.pts.some(p => p.length > 2 || !p.every(Number.isFinite)))) return null;
    const xs = series[0].pts.map(p => p[0]);
    if (series.some(s => s.pts.length !== xs.length || s.pts.some((p, i) => p[0] !== xs[i]))) return null;
    const ys = series.map(s => ({ name: s.name, labels: xs.map(String), values: s.pts.map(p => p[1]) }));
    return { tipo: b.kind === 'barras' ? 'bar' : 'scatter', datos: b.kind === 'barras' ? ys : [{ name: b.xlabel || 'x', values: xs }, ...ys] };
  }
  /* Subconjunto explícito del path SVG: los comandos que no se entienden
     conservan la figura completa como imagen, en vez de aproximarla. */
  function puntosPath(d, k) {
    const partes = String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [];
    const pts = []; let i = 0, cmd = null, x = 0, y = 0;
    const nums = n => { if (i + n > partes.length) throw new Error('Path incompleto'); const a = partes.slice(i, i + n).map(Number); if (!a.every(Number.isFinite)) throw new Error('Path no compatible'); i += n; return a; };
    while (i < partes.length) {
      if (/^[a-zA-Z]$/.test(partes[i])) cmd = partes[i++];
      if (!cmd || !/^[MLHVZ]$/i.test(cmd)) return null;
      const relativo = cmd === cmd.toLowerCase(), c = cmd.toUpperCase();
      if (c === 'Z') { pts.push({ close: true }); cmd = null; continue; }
      if (c === 'H') { const [v] = nums(1); x = relativo ? x + v : v; }
      else if (c === 'V') { const [v] = nums(1); y = relativo ? y + v : v; }
      else { const v = nums(2); x = relativo ? x + v[0] : v[0]; y = relativo ? y + v[1] : v[1]; }
      pts.push({ x: x * k, y: y * k, ...(c === 'M' ? { moveTo: true } : {}) });
      if (c === 'M') cmd = relativo ? 'l' : 'L';
    }
    return pts.length ? pts : null;
  }
  function smartNativo(b, deck, holder) {
    const L = smartLayout(b, deck, holder.getBoundingClientRect().width);
    if (L.formas.some(f => !['rect', 'circle', 'line', 'path'].includes(f.t))) return null;
    try { if (L.formas.some(f => f.t === 'path' && !puntosPath(f.d, 1))) return null; } catch { return null; }
    return L;
  }
  async function creaPPTX(deck) {
    deck = deepCopy(deck);
    const C = await extensionSlides('pptx');
    if (typeof C !== 'function') throw new Error('El escritor PowerPoint no se cargó correctamente.');
    const pptx = new C(), avisos = [], th = temaDe(deck), [W, H] = slideDims(deck), pw = deck.meta.aspect === '43' ? 10 : 13.333333;
    const k = pw / W, fuente = FUENTE_PPTX[fuenteDe(deck.meta).id] || 'Calibri';
    pptx.defineLayout({ name: 'ERLEN', width: pw, height: 7.5 }); pptx.layout = 'ERLEN';
    pptx.author = deck.meta.authors || ''; pptx.subject = 'Presentación · Tabula'; pptx.title = deck.meta.title || ''; pptx.company = deck.meta.institute || ''; pptx.lang = 'es-ES';
    pptx.theme = { headFontFace: fuente, bodyFontFace: fuente, lang: 'es-ES' };
    const banco = h('div', { style: 'position:absolute;left:-99999px;top:0' }); document.body.append(banco);
    const css = collectCSS();
    try {
      for (let i = 0; i < deck.slides.length; i++) {
        const sl = deck.slides[i]; if (fueraDeRama(sl, deck)) continue;
        if (sl.lienzoLibre && zonasDe(sl.layout) && zonas(sl).some(z => z.length))
          avisos.push({ diapositiva: i + 1, bloque: null, motivo: 'La posición libre puede diferir en PowerPoint; revisa el acomodo, el orden y los recortes.' });
        const raiz = renderSlide(deck, i, 'export', 99); banco.replaceChildren(raiz);
        await document.fonts?.ready;
        await Promise.all([...raiz.querySelectorAll('img')].map(im => im.decode?.().catch(() => {}) || Promise.resolve()));
        await pausa();
        const pagina = pptx.addSlide(); pagina.background = { color: hex(th.bg) }; pagina.addNotes(sl.notes || '');
        const r0 = raiz.getBoundingClientRect();
        const caja = el => { const r = el.getBoundingClientRect(); const p = { x: (r.left - r0.left) * k, y: (r.top - r0.top) * k, w: r.width * k, h: r.height * k }; if (!Object.values(p).every(Number.isFinite) || p.w <= 0 || p.h <= 0) throw new Error('Diapositiva ' + (i + 1) + ': no se pudo medir el contenido.'); return p; };
        const texto = (el, t, extra = {}) => {
          if (!el || (Array.isArray(t) ? !t.some(r => r.text.trim()) : !String(t || '').trim())) return;
          const cs = getComputedStyle(el); pagina.addText(Array.isArray(t) ? t : String(t), { ...caja(el), fontFace: fuente, fontSize: Math.max(6, parseFloat(cs.fontSize) * k * 72), color: hex(cs.color, th.bg), margin: 0, breakLine: false, valign: 'top', align: ['left', 'center', 'right', 'justify'].includes(cs.textAlign) ? cs.textAlign : 'left', bold: Array.isArray(t) ? false : +cs.fontWeight >= 600, italic: Array.isArray(t) ? false : /^(italic|oblique)/.test(cs.fontStyle), ...extra });
        };
        /* PptxGenJS hereda opciones del cuadro cuando una corrida pone false.
           Por eso el cuadro no declara negrita/cursiva y cada corrida lleva
           el estilo calculado, incluido el que hereda del tema o del bloque. */
        const corridasTexto = el => {
          const runs = [];
          const salto = () => {
            if (!runs.length || runs[runs.length - 1].options.breakLine) runs.push({text: '', options: {}});
            runs[runs.length - 1].options.breakLine = true;
          };
          const visita = nodo => {
            if (nodo.nodeType === 3) {
              const cs = getComputedStyle(nodo.parentElement);
              const opciones = {bold: +cs.fontWeight >= 600, italic: /^(italic|oblique)/.test(cs.fontStyle)};
              nodo.data.split('\n').forEach((parte, j) => { if (j) salto(); if (parte) runs.push({text: parte, options: {...opciones}}); });
            } else if (nodo.nodeType === 1) {
              if (nodo.tagName === 'BR') salto();
              else for (const hijo of nodo.childNodes) visita(hijo);
            }
          };
          let parrafo = false;
          for (const hijo of el.childNodes) {
            if (hijo.nodeType === 1 && hijo.tagName === 'P') { if (parrafo) salto(); parrafo = true; }
            visita(hijo);
          }
          return runs;
        };
        const fondo = el => { if (!el) return; const bg = getComputedStyle(el).backgroundColor; if (opaco(bg)) pagina.addShape('rect', { ...caja(el), fill: { color: hex(bg, th.bg) }, line: { transparency: 100 } }); };
        const foto = async (el, alt) => { const uri = await rasteriza(el, css, 2); if (!uri) throw new Error('Diapositiva ' + (i + 1) + ': no se pudo exportar una figura.'); pagina.addImage({ ...caja(el), data: uri, altText: alt || 'Figura' }); };
        const aviso = (b, motivo) => avisos.push({ diapositiva: i + 1, bloque: b.id, motivo });
        fondo(raiz.querySelector('.frametitle')); fondo(raiz.querySelector('.sec-band')); fondo(raiz.querySelector('.obj-parte.k0'));
        for (const el of raiz.querySelectorAll('.ft-t,.ft-s,.tp-title,.tp-sub,.tp-auth,.tp-inst,.tp-date,.sec-kicker,.sec-name,.zona-tit,.comp-tit,.paso-tit,.celda-tit,.paso-n,.dt-num,.dt-rot,.ct-autor,.fl-rot,.pt-tit,.tf-rot,.obj-tit')) {
          if (el.querySelector('.katex')) await foto(el, 'Texto con matemáticas'); else texto(el, el.textContent);
        }
        /* Las coordenadas ya están en unidades de diapositiva, no en píxeles
           del banco. Las líneas independientes quedan detrás de los bloques. */
        if (Array.isArray(sl.conectores) && sl.conectores.length) {
          const ky = 7.5 / H;
          for (const c of conectoresVisibles(sl, deck)) pagina.addShape('line', {
            x: Math.min(c.x1, c.x2) * k, y: Math.min(c.y1, c.y2) * ky,
            w: Math.abs(c.x2 - c.x1) * k, h: Math.abs(c.y2 - c.y1) * ky,
            flipH: c.x2 < c.x1, flipV: c.y2 < c.y1,
            line: { color: hex(c.color, th.bg), width: c.grosor * k * 72,
              ...(c.flecha === 'ambos' ? { beginArrowType: 'triangle' } : c.flecha === 'ninguna' ? { beginArrowType: 'none' } : {}),
              endArrowType: c.flecha === 'ninguna' ? 'none' : 'triangle' }
          });
        }
        for (const el of raiz.querySelectorAll('.blk[data-bid]')) {
          const b = findBlockEn(deck, el.dataset.bid)?.block; if (!b || b.type === 'spacer') continue;
          const pie = el.querySelector('figcaption,.chart-cap,.smart-cap,.tab-caption');
          const t = transformacionLibreDe(b), transformada = b.type === 'image' && (t.giro || t.voltearH || t.voltearV);
          if (['text', 'quote', 'code', 'bullets'].includes(b.type) && !el.querySelector('.katex')) {
            if (b.type === 'code') fondo(el.querySelector('pre'));
            const t = b.type === 'text' ? corridasTexto(el) : b.type === 'bullets' ? [...el.querySelectorAll('li')].map((li, j) => '  '.repeat(b.items[j]?.lvl || 0) + '• ' + li.textContent).join('\n') : el.textContent;
            texto(el, t, b.type === 'code' ? { fontFace: 'Courier New' } : {});
          } else if (b.type === 'table' && !el.querySelector('.katex')) {
            const tab = el.querySelector('table'), cs = getComputedStyle(tab.querySelector('td,th') || tab);
            const rows = [...tab.rows].map((r, ri) => [...r.cells].map(c => ({ text: c.textContent, options: { bold: !!b.header && ri === 0, fill: ri === 0 && b.header ? hex(th.acc) : hex(th.bg), color: ri === 0 && b.header ? hex(tintaSobre(th.acc)) : hex(th.fg) } })));
            if (rows.length) pagina.addTable(rows, { ...caja(tab), fontFace: fuente, fontSize: parseFloat(cs.fontSize) * k * 72, margin: 3, border: { pt: 0.5, color: hex(th.fg) }, autoPage: false, align: b.align === 'l' ? 'left' : 'center' });
            if (pie) texto(pie, pie.textContent);
          } else if (b.type === 'chart' && chartNativo(b)) {
            const g = chartNativo(b), holder = el.querySelector('.chart-holder'), pal = chartPalette(deck);
            pagina.addChart(g.tipo, g.datos, { ...caja(holder), barDir: 'col', catAxisTitle: mathToUnicode(b.xlabel), valAxisTitle: mathToUnicode(b.ylabel), showCatName: false, showLegend: b.legend !== false, showTitle: !!b.title, title: mathToUnicode(b.title), chartColors: pal.series.map(c => hex(c)), showCatAxisTitle: !!b.xlabel, showValAxisTitle: !!b.ylabel, lineSize: b.kind === 'linea' ? 1.5 : 0, lineDataSymbol: b.kind === 'linea' && b.puntos === false ? 'none' : 'circle', showValue: false, showBorder: false, showSerName: false, chartArea: { fill: { color: hex(th.bg) } }, plotArea: { fill: { color: hex(th.bg) } }, catAxisLabelColor: hex(th.fg), valAxisLabelColor: hex(th.fg), catAxisTitleColor: hex(th.fg), valAxisTitleColor: hex(th.fg), legendColor: hex(th.fg), catAxisLabelFontSize: 12, valAxisLabelFontSize: 12 });
            if (pie) texto(pie, pie.textContent);
          } else if (b.type === 'smart' && smartNativo(b, deck, el.querySelector('.smart-box'))) {
            const holder = el.querySelector('.smart-box'), p = caja(holder), L = smartNativo(b, deck, holder), u = p.w / 1000;
            for (const f of L.formas) {
              const opciones = { fill: { color: hex(f.fill || th.bg), transparency: f.fill ? Math.round((1 - (f.op ?? 1)) * 100) : 100 }, line: { color: hex(f.stroke || th.fg), width: f.grosor ? f.grosor * u * 72 : 0.8, transparency: f.stroke ? 0 : 100 } };
              if (f.t === 'rect') pagina.addShape(f.rx ? 'roundRect' : 'rect', { ...opciones, x: p.x + f.x * u, y: p.y + f.y * u, w: f.w * u, h: f.h * u, rectRadius: Math.min(1, (f.rx || 0) / Math.max(1, f.h)) });
              else if (f.t === 'circle') pagina.addShape('ellipse', { ...opciones, x: p.x + (f.cx - f.r) * u, y: p.y + (f.cy - f.r) * u, w: 2 * f.r * u, h: 2 * f.r * u });
              else if (f.t === 'path') pagina.addShape('custGeom', { ...p, ...opciones, points: puntosPath(f.d, u) });
              else if (f.t === 'line') pagina.addShape('line', { x: p.x + Math.min(f.x1, f.x2) * u, y: p.y + Math.min(f.y1, f.y2) * u, w: Math.abs(f.x2 - f.x1) * u, h: Math.abs(f.y2 - f.y1) * u, flipH: f.x2 < f.x1, flipV: f.y2 < f.y1, line: { color: hex(f.stroke || th.fg), width: f.gruesa ? 1.2 : 0.8, transparency: f.tenue ? 50 : 0, endArrowType: f.flecha ? 'triangle' : 'none' } });
            }
            for (const r of holder.querySelectorAll('.smart-rot')) texto(r, r.textContent);
            if (pie) texto(pie, pie.textContent);
          } else if (b.type === 'image' && el.querySelector('.imgwrap')?.childElementCount === 1 && !b.est?.filtro && !b.est?.forma && !b.est?.marco && !b.frame) {
            if (!/^data:image\//i.test(b.src || '')) throw new Error('Incrusta las imágenes remotas antes de exportar el PowerPoint editable.');
            const env = el.querySelector('.imgwrap'), im = el.querySelector('img');
            const medidas = transformada ? sinTransformacionVisual(env, () => caja(im)) : caja(im);
            pagina.addImage({ ...medidas, data: imagenBase64(await imagenParaExportar(b.src, FORMATOS_PPTX, im)), altText: b.alt || b.caption || 'Figura',
              ...(transformada ? {rotate:t.giro, flipH:t.voltearH, flipV:t.voltearV} : {}) });
            if (pie) texto(pie, pie.textContent);
          } else if (transformada && el.querySelector('.imgwrap')) {
            const env = el.querySelector('.imgwrap'), medidas = sinTransformacionVisual(env, () => caja(env));
            const uri = await rasteriza(env, css, 2, {sinTransformacion:true});
            if (!uri) throw new Error('Diapositiva ' + (i + 1) + ': no se pudo exportar la figura transformada.');
            pagina.addImage({ ...medidas, data:uri, altText:b.alt || b.caption || 'Figura', rotate:t.giro, flipH:t.voltearH, flipV:t.voltearV });
            aviso(b, 'La figura conserva su apariencia como imagen; sus objetos internos no son editables en PowerPoint.');
            if (pie) texto(pie, pie.textContent);
          } else {
            await foto(el, b.alt || b.caption || b.type); aviso(b, 'La figura conserva su apariencia como imagen; sus objetos internos no son editables en PowerPoint.');
          }
        }
        const fl = raiz.querySelector('.footline'); fondo(fl);
        for (const el of raiz.querySelectorAll('.footline .fl-cell,.footline>span,.pagenum,.pie-nota')) { fondo(el); texto(el, el.textContent); }
        for (const im of raiz.querySelectorAll('.tp-logo img,.tp-logo-esq img,.footline img,.pie-logo img')) { if (!/^data:image\//i.test(im.src)) throw new Error('Incrusta el logotipo antes de exportar el PowerPoint editable.'); pagina.addImage({ ...caja(im), data: imagenBase64(await imagenParaExportar(im.src, FORMATOS_PPTX, im)), altText: im.alt }); }
        for (const recorte of recortesSlide(raiz)) avisos.push({ diapositiva: i + 1, bloque: recorte.bloque, motivo: 'Contenido recortado en el editor: revisa su acomodo antes de compartir.' });
      }
      return { blob: await pptx.write({ outputType: 'blob', compression: true }), avisos };
    } finally { banco.remove(); }
  }

async function creaHTML(deck, incluirNotas = false) {
  deck = deepCopy(deck);
  const [js, cssReveal, runtime, katexJS] = await Promise.all(['reveal.js', 'reveal.css', 'chart-runtime.js', 'katex.min.js'].map(recurso));
  const avisosLicencia = ['LICENSE', 'licenses/reveal.js.txt', 'licenses/KaTeX-MIT.txt', 'licenses/KaTeX-fonts-MIT.txt', 'licenses/GUST-FONT-LICENSE.txt', 'licenses/LPPL-1.3c.txt', 'licenses/CMU-OFL.txt', 'licenses/erlen-diseno-MIT.txt'];
  const licencias = Object.fromEntries(await Promise.all(avisosLicencia.map(async p => [p, await recurso('../' + p)])));
  const [W, H] = slideDims(deck), paginas = [], vivos = [];
  const banco = h('div', { style: 'position:absolute;left:-99999px;top:0' }); document.body.append(banco);
  try {
    for (let i = 0; i < deck.slides.length; i++) {
      const sl = deck.slides[i]; if (fueraDeRama(sl, deck)) continue;
      const raiz = renderSlide(deck, i, 'present', 0); banco.replaceChildren(raiz);
      await document.fonts?.ready;
      await Promise.all([...raiz.querySelectorAll('img')].map(im => im.decode?.().catch(() => {}) || Promise.resolve()));
      ajustaMarcosImagenesLibres(raiz);
      await pausa();
      ajustaPiesFiguras(raiz);
      for (const el of raiz.querySelectorAll('[contenteditable],[data-edit]')) { el.removeAttribute('contenteditable'); el.removeAttribute('data-edit'); }
      const frags = [...raiz.querySelectorAll('.frag')];
      for (const el of frags) { el.classList.remove('frag', 'on'); el.classList.add('fragment'); el.dataset.fragmentIndex = el.dataset.frag; }
      for (const v of raiz.querySelectorAll('video')) { v.removeAttribute('autoplay'); v.removeAttribute('data-autoplay'); v.setAttribute('controls', ''); }
      for (const b of zonas(sl).flat()) if (b.type === 'func' && b.sliders) {
        const el = [...raiz.querySelectorAll('.blk')].find(el => el.dataset.bid === b.id), holder = el?.querySelector('.chart-holder');
        if (holder) vivos.push({ id: b.id, b: deepCopy(b), ancho: holder.getBoundingClientRect().width / ((b.w || 78) / 100) });
      }
      for (const el of raiz.querySelectorAll('img,video')) if (el.getAttribute('src') && !/^data:/i.test(el.getAttribute('src'))) throw new Error('Incrusta las imágenes y vídeos remotos antes de generar el HTML autónomo.');
      paginas.push('<section aria-label="Diapositiva ' + (paginas.length + 1) + '">' + raiz.outerHTML + (incluirNotas ? '<aside class="notes">' + esc(sl.notes || '').replace(/\n/g, '<br>') + '</aside>' : '') + '</section>');
    }
  } finally { banco.remove(); }
  const datos = { meta: deepCopy(deck.meta) }; delete datos.meta.refs;
  const arranque = `const S={deck:${json(datos)}};
${runtime}
const vivos=${json(vivos)};
for(const v of vivos){const el=[...document.querySelectorAll('.blk')].find(e=>e.dataset.bid===v.id);if(!el)continue;const holder=el.querySelector('.chart-holder');el.querySelector('.sliders')?.remove();el.append(buildSliders(v.b,holder,S.deck,'present',v.ancho));}
const presenter=new Reveal({width:${W},height:${H},margin:0.02,hash:!['about:','data:'].includes(location.protocol),controls:true,progress:true,center:false,transition:'none',keyboard:true,embedded:false});presenter.initialize();
presenter.on('slidechanged',()=>{const foco=document.activeElement,seccion=foco?.closest('.reveal section');if(seccion&&seccion!==presenter.getCurrentSlide())foco.blur();});
const nota=document.getElementById('notasLectura');
if(nota){let visible=false;const actualiza=()=>{nota.innerHTML=presenter.getCurrentSlide()?.querySelector('.notes')?.innerHTML||'Sin notas';};document.getElementById('verNotas').onclick=()=>{visible=!visible;nota.hidden=!visible;actualiza();};presenter.on('slidechanged',actualiza);}
document.addEventListener('keydown',e=>{if(e.target.matches('input[type=range]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.stopPropagation();},true);`;
  const estilo = '\nhtml,body{background:#10151b;margin:0;overflow:hidden}.reveal .slides>section{padding:0;text-align:initial}.reveal .slides .slide{width:' + W + 'px;height:' + H + 'px}.reveal .slides .fragment{visibility:visible;opacity:0}.reveal .slides .fragment.visible{opacity:1}.reveal .slides .notes{display:none}.reveal .slides .slide img{max-width:100%;max-height:none;border:0;box-shadow:none;margin:0}.reveal .slides .slide p{margin:0}.html-ayuda{position:fixed;left:12px;bottom:10px;z-index:30;color:#eee;background:#10151be6;padding:6px 10px;border-radius:6px;font:12px system-ui}.html-ayuda a{color:#eee}.html-notas{position:fixed;right:12px;bottom:40px;z-index:31;width:min(420px,80vw);max-height:40vh;overflow:auto;padding:16px;background:#fff;color:#17202a;font:16px/1.5 system-ui}.html-notas[hidden]{display:none}@media(prefers-reduced-motion:reduce){.reveal *{animation:none!important;transition:none!important}}';
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(deck.meta.title || 'Presentación') + '</title><style>' + cssReveal + '\n' + collectCSS() + estilo + '</style></head><body><div class="reveal"><div class="slides">' + paginas.join('') + '</div></div><div class="html-ayuda">Flechas: avanzar · F: pantalla completa · Esc: vista general' + (incluirNotas ? ' · <button id="verNotas">Notas</button>' : '') + ' · <a href="' + esc(ERLEN_SOURCE_URL) + '">Código fuente de Tabula</a></div>' + (incluirNotas ? '<div id="notasLectura" class="html-notas" hidden></div>' : '') + script(katexJS) + script(js) + script(arranque) + '</body></html>';
  return new Blob([html.replace('</body>', '<script type="application/json" id="erlen-licencias">' + json(licencias) + '</script></body>')], { type: 'text/html;charset=utf-8' });
}
  return { creaPPTX, creaHTML, chartNativo, puntosPath };
})();
