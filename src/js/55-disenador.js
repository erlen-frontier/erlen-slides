/* ==== 55-disenador.js ==== */
'use strict';
/* ================= el Diseñador =================
   Mira lo que tiene la diapositiva —cuánto texto, qué figuras, una lista
   corta, una cifra sola, una cita, una ecuación— y, si hay una imagen, su
   forma, sus colores, dónde está el peso visual y cuánto ruido tiene. Con
   eso propone acomodos completos y los enseña en miniatura
   de verdad, no como dibujo: cada propuesta es una copia real de la
   diapositiva ya cambiada. Aplicarla es un solo paso, y se deshace con Ctrl+Z.
   No manda nada a ningún servidor: el análisis ocurre en un lienzo, aquí. */

/* ---------- análisis de la imagen ---------- */
const _analisis = new Map();
function analizaImagen(src) {
  const k = (src || '').slice(0, 96) + '|' + (src || '').length;
  if (_analisis.has(k)) return Promise.resolve(_analisis.get(k));
  return new Promise(ok => {
    const im = new Image();
    im.onerror = () => ok(null);
    im.onload = () => {
      try {
        const N = 56;
        const cv = document.createElement('canvas');
        const ar = im.naturalWidth / Math.max(1, im.naturalHeight);
        const W = ar >= 1 ? N : Math.max(8, Math.round(N * ar));
        const H = ar >= 1 ? Math.max(8, Math.round(N / ar)) : N;
        cv.width = W; cv.height = H;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.drawImage(im, 0, 0, W, H);
        const d = c.getImageData(0, 0, W, H).data;
        const lumDe = i => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

        let sumL = 0, satMax = 0, nGris = 0, nClaro = 0;
        const cubos = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx ? (mx - mn) / mx : 0;
          if (sat > satMax) satMax = sat;
          if (sat < 0.12) nGris++;
          const l = lumDe(i); sumL += l;
          if (l > 0.93) nClaro++;
          if (sat < 0.15 || l < 0.08 || l > 0.96) continue;
          const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
          const q = cubos.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          q.n++; q.r += r; q.g += g; q.b += b;
          cubos.set(key, q);
        }
        const px = d.length / 4;
        const lum = sumL / px;

        /* energía de bordes y hacia dónde tira el peso visual */
        let ruido = 0, pesoX = 0, pesoTot = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = (y * W + x) * 4;
            const e = Math.abs(lumDe(i) - lumDe(i + 4)) + Math.abs(lumDe(i) - lumDe(i + W * 4));
            ruido += e; pesoX += e * x; pesoTot += e;
          }
        }
        ruido /= Math.max(1, (W - 2) * (H - 2));
        const cx = pesoTot ? pesoX / pesoTot / W : 0.5;

        const dom = [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 5)
          .map(q => rgb2hex([q.r / q.n, q.g / q.n, q.b / q.n]));
        const grisez = nGris / px, claridad = nClaro / px;
        const tipo = grisez > 0.86 ? 'micrografia' : (claridad > 0.42 && dom.length <= 3) ? 'grafico' : 'foto';

        const r = { ar, lum, ruido, pesoX: cx, dom, tipo, grisez, claridad,
          oscura: lum < 0.42, clara: lum > 0.72, panoramica: ar > 1.55, vertical: ar < 0.82, satMax };
        _analisis.set(k, r);
        if (_analisis.size > 24) _analisis.delete(_analisis.keys().next().value);
        ok(r);
      } catch (e) { ok(null); }
    };
    im.src = src;
  });
}
/* Un acento sacado de la imagen que se lea sobre el fondo del tema. */
function acentoDeImagen(an, deck) {
  const th = temaDe(deck || S.deck);
  const fondo = th.bg || '#FFFFFF';
  if (!an || !an.dom.length) return null;
  let mejor = null;
  an.dom.forEach(hex => {
    let c = hex;
    for (let i = 0; i < 6; i++) {
      const cr = contraste(c, fondo);
      if (cr >= 4.5) break;
      c = mezcla(c, th.dark ? '#FFFFFF' : '#101418', 0.16);
    }
    const cr = contraste(c, fondo);
    const [r, g, b] = hex2rgb(c);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const punt = cr * 0.6 + sat * 4;
    if (cr >= 3.6 && (!mejor || punt > mejor.punt)) mejor = { c, punt };
  });
  return mejor ? mejor.c : null;
}

/* ---------- cuánto texto hay en la diapositiva ---------- */
function pesoTexto(sl) {
  let car = 0, vin = 0, otros = 0;
  zonas(sl).flat().forEach(b => {
    if (b.type === 'text') car += (b.text || '').length;
    else if (b.type === 'bullets') { vin += (b.items || []).length; car += (b.items || []).map(x => x.t || '').join(' ').length; }
    else if (b.type !== 'image' && b.type !== 'galeria') otros++;
  });
  return { car, vin, otros, poco: car < 130 && vin <= 3, mucho: car > 380 || vin > 6 };
}

/* ---------- las propuestas ----------
   Cada una dice cómo se llama, por qué la propone y qué cambia. */
function propuestasDiseno(sl, b, an, deck) {
  const T = pesoTexto(sl);
  const th = temaDe(deck);
  const acc = acentoDeImagen(an, deck);
  const izq = an && an.pesoX < 0.44;      /* el motivo tira a la izquierda */
  const der = an && an.pesoX > 0.56;
  const P = [];
  const add = (id, n, d, fn, punt) => P.push({ id, n, d, aplica: fn, punt: punt || 0 });
  const est = e => Object.assign({ forma: 'recta', marco: 'none', sombra: false, filtro: 'none' }, e);

  /* la figura manda: a todo lo ancho */
  add('protagonista', 'La figura manda',
    'A todo lo ancho, con los márgenes estrechados y el texto reducido a un pie. Es lo que conviene cuando la figura es el argumento.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'ancho');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 96; blk.est = est({ sombra: true }); alFrente(s2, id); }
    }, T.poco ? 9 : 5);

  /* figura y texto lado a lado, del lado que no estorbe */
  add(der ? 'lado-izq' : 'lado-der', der ? 'Texto a la izquierda, figura a la derecha' : 'Figura a la izquierda, texto a la derecha',
    der ? 'El motivo de la imagen tira hacia la derecha, así que el texto va del otro lado y las miradas no se cruzan.'
        : (izq ? 'El motivo tira hacia la izquierda: la figura va ahí y el texto ocupa el resto.'
               : 'Dos columnas: la figura de un lado y el texto del otro, que es el acomodo que mejor aguanta el texto largo.'),
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'twocol');
      const blk = buscaBloque(s2, id);
      if (blk) {
        blk.w = 100; blk.est = est({ forma: 'redondo' });
        mueveA(s2, id, der ? 1 : 0);
        repartirResto(s2, id, der ? 0 : 1);
      }
    }, T.mucho ? 9 : 6);

  /* enunciado con la figura de fondo emocional */
  if (an && an.tipo === 'foto') add('portada', 'Portada suave',
    'Una sola idea grande con la figura aclarada debajo, para que el texto encima se lea. Va bien para abrir una sección.',
    (d, i, id) => {
      const s2 = d.slides[i];
      const blk = buscaBloque(s2, id);
      cambiaLayoutSilencioso(s2, 'enunciado');
      if (blk) { blk.w = 100; blk.est = est({ filtro: 'claro', forma: 'redondo' }); alFondo(s2, id); }
    }, T.poco ? 8 : 3);

  /* duotono con el acento: unifica figuras de origen distinto */
  if (an && an.tipo !== 'grafico') add('duotono', 'Duotono del tema',
    'La figura pasa a dos tonos del color de acento. Es lo que hace que un montón de fotos de fuentes distintas parezcan de la misma presentación.',
    (d, i, id) => { const blk = buscaBloque(d.slides[i], id); if (blk) blk.est = est({ filtro: 'duo', forma: 'redondo' }); },
    an.tipo === 'foto' ? 7 : 4);

  /* recorte en círculo: retratos y detalles */
  if (an && Math.abs(an.ar - 1) < 0.5) add('circulo', 'Recorte circular',
    'Un círculo con el marco del color de acento. Funciona con retratos y con detalles ampliados; no con espectros ni con gráficas.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'twocol');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 88; blk.est = est({ forma: 'circulo', marco: 'acento', sombra: true }); mueveA(s2, id, 0); repartirResto(s2, id, 1); }
    }, an.tipo === 'foto' ? 6 : 2);

  /* micrografías: contraste y marco fino, que es lo que pide una revista */
  if (an && (an.tipo === 'micrografia' || an.ruido > 0.09)) add('micrografia', 'Acabado de artículo',
    'Marco fino, más contraste y la figura centrada con su pie. Es el acabado que piden las revistas para una micrografía.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'content');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 74; blk.est = est({ marco: 'fino', filtro: an.tipo === 'micrografia' ? 'contraste' : 'none' }); alFrente(s2, id); }
    }, an.tipo === 'micrografia' ? 9 : 4);

  /* foto en papel: da aire y separa del fondo */
  add('papel', 'Copia en papel',
    'Borde blanco ancho y sombra, como una foto sobre la mesa. Separa la figura del fondo sin tener que ponerle una caja.',
    (d, i, id) => { const blk = buscaBloque(d.slides[i], id); if (blk) { blk.est = est({ marco: 'papel', sombra: true }); blk.w = Math.min(84, (blk.w || 70) + 8); } },
    an && an.clara ? 6 : 4);

  /* tomar el color de la imagen como acento de la presentación */
  if (acc && acc.toUpperCase() !== (th.acc || '').toUpperCase()) add('acento', 'Color de la figura',
    'Toma el color dominante de la imagen —ya corregido para que contraste— y lo usa como acento de toda la presentación.',
    d => { d.meta.acento = acc; }, 5, acc);

  /* si hay varias figuras sueltas, juntarlas en una galería */
  const otras = zonas(sl).flat().filter(x => x.type === 'image' && x.src);
  if (otras.length >= 2) add('galeria', 'Juntarlas en una galería',
    'Las ' + otras.length + ' figuras de esta diapositiva pasan a una sola galería numerada (a), (b), (c) con un pie común, como en un artículo.',
    (d, i) => {
      const s2 = d.slides[i];
      const imgs = [];
      CLAVES_ZONA.forEach(z => {
        (s2[z] || []).forEach(x => { if (x.type === 'image' && x.src) imgs.push({ src: x.src, cap: x.caption || '', alt: x.alt || '' }); });
        if (s2[z]) s2[z] = s2[z].filter(x => !(x.type === 'image' && x.src));
      });
      const gal = Object.assign(newBlock('galeria'), { w: 94, caption: '', gal: { imgs, modo: imgs.length >= 4 ? 'rejilla' : 'tira', cols: imgs.length >= 4 ? 2 : imgs.length, letras: true, hueco: 8 } });
      zona(s2, 0).push(gal);
    }, 10);

  P.forEach(x => { x.color = x.color || null; });
  P.sort((a, b) => b.punt - a.punt);
  return P.slice(0, 7);
}
/* mover el color propuesto a la propuesta correspondiente */
function propuestaColor(p) { return p.id === 'acento' ? p.col : null; }

/* ---------- utilidades que usan las propuestas ---------- */
function buscaBloque(sl, id) { return zonas(sl).flat().find(x => x.id === id) || null; }
function alFrente(sl, id) {
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k > 0) sl[z].unshift(sl[z].splice(k, 1)[0]);
  });
}
function alFondo(sl, id) {
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k >= 0 && k < sl[z].length - 1) sl[z].push(sl[z].splice(k, 1)[0]);
  });
}
/* Deja el bloque en la zona pedida y el resto del contenido en la otra. */
function mueveA(sl, id, zi) {
  let blk = null;
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k >= 0) blk = sl[z].splice(k, 1)[0];
  });
  if (blk) zona(sl, zi).push(blk);
}
function repartirResto(sl, id, zi) {
  const otros = [];
  CLAVES_ZONA.forEach((z, k) => {
    if (!sl[z] || k === zi) return;
    for (let i = sl[z].length - 1; i >= 0; i--) if (sl[z][i].id !== id) otros.unshift(sl[z].splice(i, 1)[0]);
  });
  if (otros.length) zona(sl, zi).push(...otros);
}
/* Cambio de acomodo sin tocar el estado ni el historial: es para una copia. */
function cambiaLayoutSilencioso(sl, to) {
  if (sl.layout === to) return;
  const destino = zonasDe(to);
  const todos = CLAVES_ZONA.reduce((a, k) => a.concat(sl[k] || []), []);
  CLAVES_ZONA.forEach(k => delete sl[k]);
  sl.layout = to;
  if (destino > 0) { for (let i = 0; i < destino; i++) zona(sl, i); zona(sl, 0).push(...todos); }
  else sl.blocks = [];
  if (typeof prepararZonas === 'function') { try { prepararZonas(sl, to); } catch (e) { /* el arranque es opcional */ } }
}

/* ================= propuestas según el contenido =================
   Lo de arriba parte de una figura. Esto parte de lo que la diapositiva ya
   tiene —mucho texto, una gráfica con su explicación, varias figuras, una
   lista corta, una cifra sola, una cita, una ecuación— y propone acomodos
   completos. Tres reglas que no se negocian:
   · solo se reordena o se convierte lo que ya está: nunca se escribe una
     palabra nueva, ni una cifra, ni un autor;
   · la misma diapositiva da siempre las mismas propuestas, en el mismo
     orden (el servidor MCP las vuelve a calcular para aplicar la elegida);
   · cada propuesta dice en una frase por qué la hace. */
const DIS_FIG = ['image', 'chart', 'func', 'galeria', 'video', 'montaje', 'geo', 'estruct', 'smart', 'table'];
const DIS_TXT = ['text', 'bullets', 'bblock', 'quote', 'teorema'];
const DIS_QUIM = ['math', 'chem', 'estruct'];
const DIS_NOMBRE = { image: 'figura', chart: 'gráfica', func: 'gráfica', galeria: 'galería', video: 'video', montaje: 'montaje',
  geo: 'figura', estruct: 'estructura', smart: 'diagrama', table: 'tabla' };

function disTexto(b) {
  switch (b.type) {
    case 'text': case 'quote': return String(b.text || '');
    case 'bullets': return (b.items || []).map(it => String(it.t || '')).join('\n');
    case 'bblock': return String(b.btitle || '') + '\n' + String(b.body || '');
    case 'teorema': return String(b.body || '');
    default: return '';
  }
}
function disVacio(b) {
  return !b || b.type === 'spacer' || b.type === 'refs'
    || (b.type === 'text' && !String(b.text || '').trim())
    || (b.type === 'bullets' && !(b.items || []).some(it => String(it.t || '').trim()))
    || (b.type === 'image' && !b.src)
    || (b.type === 'galeria' && !((b.gal || {}).imgs || []).length);
}
const disPalabras = t => String(t || '').replace(/\$[^$]*\$/g, ' x ').split(/\s+/).filter(Boolean).length;

/* Qué hay en la diapositiva, contado sin mirar el acomodo actual. */
function leeContenido(sl) {
  const bloques = zonas(sl).flat().filter(Boolean);
  const utiles = bloques.filter(b => !disVacio(b));
  const textos = utiles.filter(b => DIS_TXT.includes(b.type));
  return {
    bloques, utiles, textos,
    car: textos.reduce((s, b) => s + disTexto(b).length, 0),
    palabras: textos.reduce((s, b) => s + disPalabras(disTexto(b)), 0),
    figuras: utiles.filter(b => DIS_FIG.includes(b.type)),
    quimica: utiles.filter(b => DIS_QUIM.includes(b.type)),
    listas: textos.filter(b => b.type === 'bullets'),
    otros: utiles.filter(b => !DIS_FIG.includes(b.type) && !DIS_TXT.includes(b.type) && !DIS_QUIM.includes(b.type))
  };
}
function leeDiapositiva(C) {
  if (!C.utiles.length) return 'La diapositiva está vacía: pon algo y te propongo cómo acomodarlo.';
  const n = (k, s, p) => k + ' ' + (k === 1 ? s : p);
  const partes = [];
  if (C.palabras) partes.push(n(C.palabras, 'palabra', 'palabras') + ' de texto');
  if (C.listas.length) partes.push(n(C.listas.length, 'lista', 'listas'));
  const figs = C.figuras.filter(b => b.type !== 'estruct');
  if (figs.length) partes.push(n(figs.length, 'figura o tabla', 'figuras o tablas'));
  if (C.quimica.length) partes.push(n(C.quimica.length, 'ecuación o estructura', 'ecuaciones o estructuras'));
  if (!partes.length) partes.push(n(C.utiles.length, 'bloque', 'bloques'));
  return 'Veo ' + partes.join(', ') + '. Toca una propuesta para aplicarla; se deshace con Ctrl+Z.';
}
/* La figura con la que trabaja la parte de imagen: la primera con algo dentro. */
function figuraPrincipal(sl) {
  return zonas(sl).flat().find(b => b && ((b.type === 'image' && b.src) || (b.type === 'galeria' && ((b.gal || {}).imgs || []).length))) || null;
}

/* Rehace el acomodo de una diapositiva con un reparto por zonas. Lo que no
   aparece en el reparto no se pierde: va al final de la última zona. Los
   encabezados se ponen explícitos (vacíos si no se dan), porque los de
   muestra de algunos diseños son datos de otra investigación. */
function disAcomoda(sl, layout, reparto, zt) {
  const todos = zonas(sl).flat().filter(Boolean);
  const usados = new Set();
  reparto.forEach(z => z.forEach(b => usados.add(b.id)));
  const sobran = todos.filter(b => !usados.has(b.id));
  const n = Math.max(1, zonasDe(layout));
  CLAVES_ZONA.forEach(k => delete sl[k]);
  sl.layout = layout;
  for (let i = 0; i < n; i++) zona(sl, i);
  reparto.forEach((z, i) => zona(sl, Math.min(i, n - 1)).push(...z));
  if (sobran.length) zona(sl, n - 1).push(...sobran);
  const def = ZT_DEF[layout];
  if (zt || def) {
    const largo = Math.max((zt || []).length, def ? def.length : 0);
    const prev = sl.zt || [];
    sl.zt = Array.from({ length: largo }, (_, i) => zt ? (zt[i] == null ? '' : String(zt[i])) : (prev[i] == null ? '' : prev[i]));
  }
  prepararZonas(sl, layout);
}
const disBloque = (sl, id) => zonas(sl).flat().find(b => b && b.id === id) || null;
/* En una columna, una figura a 78 % queda como un sello: se le da todo el
   ancho de su zona. La estructura química no, que calcula su propio ancho. */
function disLlena(sl) {
  zonas(sl).flat().forEach(b => { if (b && DIS_FIG.includes(b.type) && b.type !== 'estruct' && typeof b.w === 'number') b.w = 100; });
}

/* Parte el texto en dos mitades por donde se corta solo: entre bloques, entre
   viñetas de primer nivel o entre párrafos. Devuelve [primera, segunda] o
   null si no hay por dónde. Trabaja sobre la diapositiva que recibe. */
function disParteTexto(textos) {
  const mitad = (largos) => {
    const total = largos.reduce((s, x) => s + x, 0);
    let acc = 0, k = 1, mejor = Infinity;
    for (let j = 1; j < largos.length; j++) {
      acc += largos[j - 1];
      const dif = Math.abs(total / 2 - acc);
      if (dif < mejor) { mejor = dif; k = j; }
    }
    return k;
  };
  if (textos.length >= 2) {
    const k = mitad(textos.map(b => disTexto(b).length));
    return [textos.slice(0, k), textos.slice(k)];
  }
  const b = textos[0];
  if (!b) return null;
  if (b.type === 'bullets') {
    /* Solo se corta delante de una viñeta de primer nivel: una subviñeta no
       se separa de la suya. Se agrupan y se busca la mitad por grupos. */
    const grupos = [];
    (b.items || []).forEach(it => { if (!(+it.lvl > 0) || !grupos.length) grupos.push([it]); else grupos[grupos.length - 1].push(it); });
    if (grupos.length < 2) return null;
    const k = mitad(grupos.map(g => g.reduce((s, x) => s + String(x.t || '').length, 0)));
    const b2 = Object.assign(deepCopy(b), { id: uid(), items: deepCopy(grupos.slice(k).flat()) });
    b.items = grupos.slice(0, k).flat();
    return [[b], [b2]];
  }
  if (b.type === 'text') {
    const par = String(b.text || '').split(/\n\s*\n/);
    if (par.length < 2) return null;
    const k = mitad(par.map(x => x.length));
    const b2 = Object.assign(deepCopy(b), { id: uid(), text: par.slice(k).join('\n\n') });
    b.text = par.slice(0, k).join('\n\n');
    return [[b], [b2]];
  }
  return null;
}

/* Las figuras en grupos: cada figura abre uno y el texto que la sigue va con
   ella. Lo que haya antes de la primera figura se queda aparte. */
function disGrupos(C) {
  const grupos = [], antes = [];
  C.utiles.forEach(b => {
    if (DIS_FIG.includes(b.type)) grupos.push({ fig: b, txt: [] });
    else if (grupos.length) grupos[grupos.length - 1].txt.push(b);
    else antes.push(b);
  });
  return { grupos, antes };
}

/* ---------- de una lista a un SmartArt ----------
   Qué diagrama pide una lista, leído en lo que dice: años al principio son
   una cronología; «1.», «primero», «después» o flechas son pasos; volver al
   inicio es un ciclo; un elemento con varios hijos es una jerarquía. Si nada
   de eso aparece, una lista en cajas. */
const DIS_ANIO = /^\s*(?:1[5-9]|20)\d{2}(?:\s*[–-]\s*(?:(?:1[5-9]|20)\d{2}|hoy|actualidad))?(?![\d.,])/i;
const DIS_ORDEN = /^\s*(?:\d+\s*[.)º°:-]|paso\s+\d+|etapa\s+\d+|primer[oa]?\b|segund[oa]\b|tercer[oa]?\b|luego\b|despu[eé]s\b|a continuaci[oó]n\b|por [uú]ltimo\b|finalmente\b)/i;
const DIS_CICLO = /(?:^|[^\wÁ-úñ])(?:ciclo|recicl[\wÁ-úñ]*|regener[\wÁ-úñ]*|reutiliz[\wÁ-úñ]*|vuelve|de nuevo|se repite|reinici[\wÁ-úñ]*)(?![\wÁ-úñ])/i;
function claseSmart(todos) {
  /* Una viñeta vacía (la que queda al pulsar Intro) no cuenta ni llega al diagrama. */
  const items = (todos || []).filter(it => String(it.t || '').trim());
  const top = items.filter(it => !(+it.lvl > 0));
  const hijos = items.length - top.length;
  if (!items.length || !items.every(it => String(it.t || '').length <= 110)) return [];
  const out = [];
  if (hijos) {
    /* Los diagramas con niveles leen el primer elemento como raíz o como
       encabezado: solo encajan si la lista empieza en el primer nivel. */
    if (+items[0].lvl > 0) return [];
    if (top.length === 1 && hijos >= 2 && hijos <= 6) {
      out.push(['jerarquia', 'Un concepto y sus ' + hijos + ' ramas: la lista ya es una clasificación, y como jerarquía se ve de un golpe.']);
      out.push(['radial', 'El concepto al centro y sus ' + hijos + ' aspectos alrededor, sin orden de importancia.']);
    } else if (top.length === 2 && items.length >= 4 && items.length <= 12) {
      out.push(['contraste', 'Dos encabezados con sus puntos debajo: enfrentados en dos columnas se comparan mejor.']);
    }
    return out;
  }
  const n = top.length;
  if (n < 3 || n > 6) return [];
  const txt = top.map(it => String(it.t || ''));
  const anios = txt.filter(t => DIS_ANIO.test(t)).length;
  const orden = txt.filter(t => DIS_ORDEN.test(t)).length;
  const flechas = txt.some(t => /→|->|⟶/.test(t));
  if (anios >= n - 1) out.push(['cronologia', 'Cada punto empieza con un año: en una línea de tiempo el orden se ve sin leer.']);
  if (DIS_CICLO.test(txt.join(' | '))) out.push(['ciclo', 'La lista habla de volver al inicio: como ciclo, la última etapa enlaza con la primera.']);
  if (orden >= Math.ceil(n / 2) || flechas) out.push(['proceso', 'Son ' + n + ' pasos en orden: como proceso con flechas, la secuencia se lee sin numerarla.']);
  out.push(['lista', n + ' puntos cortos: en cajas numeradas pesan igual y se leen de un vistazo.']);
  if (!out.some(x => x[0] === 'proceso')) out.push(['proceso', 'Si el orden importa, como proceso con flechas cada punto lleva al siguiente.']);
  return out;
}
/* Convierte las viñetas en elementos del diagrama sin tocar el texto: solo
   se quita la numeración que el diagrama ya dibuja, y en una cronología el
   año pasa a ser el rótulo y el resto el detalle. */
function listaASmart(b, kind) {
  const items = (b.items || []).filter(it => String(it.t || '').trim()).map(it => {
    let t = String(it.t || '').trim(), d = '';
    if (kind === 'proceso' || kind === 'lista') t = t.replace(/^\s*(?:\d+\s*[.)º°:-]|(?:paso|etapa)\s+\d+\s*[:.–-]?)\s*/i, '') || t;
    if (kind === 'cronologia') {
      const m = t.match(DIS_ANIO);
      if (m && t.slice(m[0].length).trim()) { d = t.slice(m[0].length).replace(/^\s*[:.,–—-]\s*/, '').trim(); t = m[0].trim(); }
    }
    const x = { t };
    if (d) x.d = d;
    if (+it.lvl > 0) x.lvl = 1;
    return x;
  });
  const s = { id: b.id, type: 'smart', kind, w: 90, caption: '', anim: 'fade', items };
  if (b.step) s.step = true;
  return s;
}

/* ---------- una cifra sola ---------- */
const DIS_CIFRA = /(?:[<>≈~±≤≥]\s*)?[−-]?\d+(?:[.,]\d+)?(?:\s*(?:×|x)\s*10\^?\{?[−-]?\d+\}?)?(?:\s*(?:%|‰|°C|°|K|nm|µm|μm|mm|cm|m²\/g|m2\/g|mg|kg|g|mL|µL|L|mmol|mol|mM|µM|M|min|ms|h|s|eV|kJ\/mol|kJ|J|kW|W|mA|V|MPa|GPa|kPa|Pa|ppm|ppb|kDa|Da|rpm|m)(?![A-Za-zÁ-úñÑ]))?/g;
const disCifras = b => disTexto(b).replace(/\$[^$]*\$/g, ' ').match(DIS_CIFRA) || [];
function datoUnico(C) {
  if (C.figuras.length || C.quimica.length || C.otros.length || C.textos.length > 2 || C.car > 180) return null;
  if (C.textos.reduce((s, b) => s + disCifras(b).length, 0) !== 1) return null;
  const b = C.textos.find(x => disCifras(x).length === 1);
  /* Con matemáticas en línea la cifra podría repetirse dentro de la fórmula
     y el rótulo saldría mutilado: mejor no proponerlo. */
  if (disTexto(b).includes('$')) return null;
  if (!(b.type === 'text' || (b.type === 'bullets' && (b.items || []).length === 1))) return null;
  const cifra = disCifras(b)[0].trim();
  const t = disTexto(b);
  const k = t.indexOf(cifra);
  if (k < 0) return null;
  const rotulo = (t.slice(0, k) + ' ' + t.slice(k + cifra.length)).replace(/\s+/g, ' ').replace(/^[\s:;,.–—-]+|[\s:;,–—-]+$/g, '').trim();
  return { b, cifra, rotulo };
}
/* ---------- una cita ---------- */
const DIS_COMILLAS = /^\s*[«“"„]([\s\S]+?)[»”"]\s*(?:[—–-]\s*(.+?))?\s*$/;
function citaDe(C) {
  if (C.figuras.length || C.quimica.length || C.otros.length) return null;
  const q = C.textos.find(b => b.type === 'quote') || C.textos.find(b => b.type === 'text' && DIS_COMILLAS.test(String(b.text || '')));
  if (!q) return null;
  const resto = C.textos.filter(b => b !== q);
  if (resto.length > 1 || resto.reduce((s, b) => s + disTexto(b).length, 0) > 160) return null;
  if (q.type === 'quote') return { b: q, texto: String(q.text || '').trim(), autor: String(q.by || '').trim() };
  const m = String(q.text).match(DIS_COMILLAS);
  return { b: q, texto: m[1].trim(), autor: (m[2] || '').trim() };
}

function propuestasContenido(sl) {
  if (!sl || !zonasDe(sl.layout)) return [];
  const C = leeContenido(sl);
  if (!C.utiles.length) return [];
  const P = [];
  const add = (id, n, d, aplica, punt) => P.push({ id, n, d, aplica, punt, origen: 'contenido' });
  const ids = arr => arr.map(b => b.id);
  const toma = (s2, lista) => lista.map(id => disBloque(s2, id)).filter(Boolean);
  const nombre = b => DIS_NOMBRE[b.type] || 'figura';
  const art = b => ['video', 'montaje', 'diagrama'].includes(nombre(b)) ? 'El ' : 'La ';

  /* mucho texto y nada más: repartirlo */
  const soloTexto = !C.figuras.length && !C.quimica.length && !C.otros.length;
  const vinetas = C.listas.reduce((s, b) => s + (b.items || []).length, 0);
  if (soloTexto && (C.car > 420 || vinetas > 7)) {
    const cols = C.car > 1100 ? 3 : 2;
    const tx = ids(C.textos);
    add('flujo', 'Texto fluido en ' + cols + ' columnas',
      'Son unas ' + C.palabras + ' palabras de texto corrido: repartidas en ' + cols + ' columnas, como en un artículo, los renglones se acortan y se leen mejor.',
      (d, i) => { const s2 = d.slides[i]; disAcomoda(s2, 'flujo', [toma(s2, ids(C.utiles))]); s2.cols = cols; }, 8);
    add('dos-columnas', 'Partir en dos columnas',
      'El texto se parte en dos columnas por donde se corta solo —entre bloques, viñetas o párrafos—, sin cambiar una palabra.',
      (d, i) => {
        const s2 = d.slides[i];
        const partes = disParteTexto(toma(s2, tx));
        if (!partes) throw new Error('sin corte');
        disAcomoda(s2, 'twocol', partes);
      }, 6);
    add('dos-diapositivas', 'Partir en dos diapositivas',
      'Hay demasiado para una sola: la segunda mitad pasa a una diapositiva nueva justo después, con el mismo título. Una idea por diapositiva.',
      (d, i) => {
        const s2 = d.slides[i];
        const partes = disParteTexto(toma(s2, tx));
        if (!partes) throw new Error('sin corte');
        const lay = zonasDe(s2.layout) === 1 ? s2.layout : 'content';
        const segunda = new Set(ids(partes[1]));
        const nueva = { id: uid(), layout: lay, title: s2.title || '', blocks: [] };
        if (s2.cols != null) nueva.cols = s2.cols;
        disAcomoda(nueva, lay, [partes[1]]);
        disAcomoda(s2, lay, [partes[0]]);
        CLAVES_ZONA.forEach(k => { if (s2[k]) s2[k] = s2[k].filter(b => !segunda.has(b.id)); });
        d.slides.splice(i + 1, 0, nueva);
      }, C.car > 900 ? 9 : 5);
  }

  /* una figura con su explicación */
  const figs = C.figuras;
  if (figs.length === 1 && C.textos.length && C.car >= 40) {
    const f = figs[0], resto = C.utiles.filter(b => b !== f);
    if (f.type !== 'image' && f.type !== 'galeria') {
      add('figura-texto', art(f) + nombre(f) + ' a un lado, el texto al otro',
        art(f) + nombre(f) + ' y su explicación, cada una en su columna: se leen a la par en vez de apilarse.',
        (d, i) => { const s2 = d.slides[i]; disAcomoda(s2, 'twocol', [toma(s2, [f.id]), toma(s2, ids(resto))]); s2.split = 58; disLlena(s2); }, sl.layout === 'content' ? 8 : 6);
    }
    if (C.car <= 520) add('pie-ancho', art(f) + nombre(f) + ' con pie ancho',
      art(f) + nombre(f) + ' ocupa casi todo y el texto va al lado, como un pie con aire: es lo que pide una figura que hay que leer con calma.',
      (d, i) => { const s2 = d.slides[i]; disAcomoda(s2, 'piefigura', [toma(s2, [f.id]), toma(s2, ids(resto))]); disLlena(s2); }, C.car <= 260 ? 7 : 5);
  }

  /* varias figuras: en rejilla, cada una con lo que la explica */
  if (figs.length >= 2 && figs.length <= 4) {
    const G = disGrupos(C);
    const celdas = G.grupos.map((g, k) => (k === 0 ? G.antes : []).concat([g.fig], g.txt));
    const conTexto = G.grupos.some(g => g.txt.length);
    const reparto = s2 => celdas.map(c => toma(s2, ids(c)));
    if (figs.length === 2) {
      add('lado-a-lado', 'Las dos figuras lado a lado',
        'Las dos figuras, una junto a la otra' + (conTexto ? ' y cada una con su texto debajo' : '') + ': se comparan de un vistazo.',
        (d, i) => { const s2 = d.slides[i]; disAcomoda(s2, 'twocol', reparto(s2)); s2.split = 50; disLlena(s2); }, 7);
      if (G.grupos.every(g => g.txt.length) && !G.antes.length)
        add('zigzag', 'Zigzag: dos resultados encadenados',
          'Figura y texto, luego texto y figura: dos resultados que se leen uno detrás del otro sin perder cuál explica a cuál.',
          (d, i) => { const s2 = d.slides[i]; const [a, b] = G.grupos;
            disAcomoda(s2, 'zigzag', [toma(s2, [a.fig.id]), toma(s2, ids(a.txt)), toma(s2, ids(b.txt)), toma(s2, [b.fig.id])]); disLlena(s2); }, 6);
    }
    if (figs.length === 3) add('tres', 'Tres figuras en tres columnas',
      'Las tres figuras en paralelo, cada una en su columna' + (conTexto ? ' con lo que la explica debajo' : '') + '.',
      (d, i) => { const s2 = d.slides[i]; disAcomoda(s2, 'tres', reparto(s2)); disLlena(s2); }, 7);
    if (figs.length === 4 || (figs.length === 3 && G.antes.length)) add('cuadricula', 'Cuadrícula 2×2',
      figs.length === 4 ? 'Cuatro figuras en cuatro celdas iguales: ninguna manda sobre las otras y se recorren en orden.'
        : 'Las tres figuras y el texto de entrada en cuatro celdas: el texto hace de primera pieza.',
      (d, i) => { const s2 = d.slides[i];
        const c = figs.length === 4 ? reparto(s2) : [toma(s2, ids(G.antes))].concat(G.grupos.map(g => toma(s2, ids([g.fig].concat(g.txt)))));
        disAcomoda(s2, 'cuadricula', c, ['', '', '', '']); disLlena(s2); }, figs.length === 4 ? 8 : 5);
  }

  /* una lista corta: SmartArt */
  const lista = C.listas.find(b => claseSmart(b.items || []).length);
  if (lista && C.figuras.length <= 1) {
    claseSmart(lista.items || []).slice(0, 2).forEach(([kind, razon], k) => {
      add('smart-' + kind, 'Lista como ' + SK[kind].n.toLowerCase(), razon,
        (d, i) => {
          const s2 = d.slides[i];
          CLAVES_ZONA.forEach(z => { const arr = s2[z]; if (!arr) return; const j = arr.findIndex(b => b.id === lista.id); if (j >= 0) arr[j] = listaASmart(arr[j], kind); });
        }, k ? 5 : 8);
    });
  }

  /* una cifra con su rótulo */
  const dato = datoUnico(C);
  if (dato) add('dato', 'Dato grande',
    'Una sola cifra —' + dato.cifra + '— con su rótulo: en grande es lo que el público se lleva de la diapositiva.',
    (d, i) => {
      const s2 = d.slides[i];
      disAcomoda(s2, 'dato', [toma(s2, ids(C.utiles.filter(b => b !== dato.b)))], [dato.cifra, dato.rotulo]);
      CLAVES_ZONA.forEach(z => { if (s2[z]) s2[z] = s2[z].filter(b => b.id !== dato.b.id); });
    }, 9);

  /* una cita */
  const cita = citaDe(C);
  if (cita) add('cita', 'Cita destacada',
    'Es una cita' + (cita.autor ? ' de ' + cita.autor : '') + ': sola, grande y con su autor debajo respira mejor.' + (cita.autor ? '' : ' El autor queda en blanco para que lo escribas.'),
    (d, i) => {
      const s2 = d.slides[i];
      const q = disBloque(s2, cita.b.id);
      const txt = { id: q.id, type: 'text', text: cita.texto, size: 'n', align: 'left' };
      if (q.anim) txt.anim = q.anim;
      /* El bloque de texto hereda el id de la cita: disAcomoda la da por
         colocada y la original no vuelve como sobrante. */
      disAcomoda(s2, 'cita', [[txt].concat(toma(s2, ids(C.utiles.filter(b => b !== cita.b))))], [cita.autor]);
    }, 9);

  /* una ecuación, una reacción o una estructura: al centro */
  const otrasFig = C.figuras.filter(b => b.type !== 'estruct');
  if (C.quimica.length === 1 && !otrasFig.length && !C.otros.length && C.car <= 240) {
    const q = C.quimica[0];
    const quien = q.type === 'estruct' ? 'La estructura' : q.type === 'chem' ? 'La reacción' : 'La ecuación';
    add('enfasis', quien + ' al centro',
      quien + ' es la protagonista: sola, centrada y ' + (q.type === 'math' ? 'más grande' : 'con aire') + ', con el texto como apoyo.',
      (d, i) => {
        const s2 = d.slides[i];
        disAcomoda(s2, 'enunciado', [toma(s2, ids(C.utiles))]);
        const b = disBloque(s2, q.id);
        if (b && b.type === 'math') b.size = 'l';
      }, 8);
  }
  return P;
}

/* Todas las propuestas para una diapositiva: las del contenido y, si hay una
   figura, las de la imagen (con su análisis, si ya se hizo). Cada propuesta
   trae la copia del proyecto ya cambiada; se descartan las que no cambian
   nada y las que repiten el resultado de otra mejor puntuada. */
function propuestasDiapositiva(deck, i, opciones) {
  const o = opciones || {};
  const sl = deck && deck.slides[i];
  if (!sl || !zonasDe(sl.layout)) return [];
  const P = propuestasContenido(sl);
  const fig = o.bloque || figuraPrincipal(sl);
  if (fig) propuestasDiseno(sl, fig, o.an || null, deck).forEach(p => {
    const f = p.aplica;
    P.push(Object.assign({}, p, { origen: 'figura', aplica: (d, k) => f(d, k, fig.id) }));
  });
  /* uid() da ids distintos en cada copia: la huella los ignora para que dos
     propuestas iguales se reconozcan como iguales. */
  const conocidos = new Set(zonas(sl).flat().filter(Boolean).map(b => b.id));
  const huella = d => JSON.stringify([d.slides[i], d.slides.length !== deck.slides.length ? d.slides[i + 1] : null, d.slides.length, d.meta],
    (k, v) => k === 'id' && typeof v === 'string' && !conocidos.has(v) ? '·' : v);
  const vistas = new Set([huella(deck)]), out = [];
  P.sort((a, b) => b.punt - a.punt).forEach(p => {
    if (out.some(x => x.id === p.id)) return;
    const copia = deepCopy(deck);
    try { p.aplica(copia, i); } catch (e) { return; }
    const hu = huella(copia);
    if (vistas.has(hu)) return;
    vistas.add(hu);
    p.copia = copia;
    out.push(p);
  });
  return out.slice(0, o.max || 8);
}

/* ---------- el panel ---------- */
let _disPanel = null, _disCuerpo = null, _disBloque = null;
function panelDisenador() {
  if (_disPanel) return _disPanel;
  _disCuerpo = h('div', { class: 'dis-cuerpo' });
  _disPanel = h('aside', { class: 'dis', id: 'disPanel', role: 'complementary', 'aria-label': 'Ideas de diseño' },
    h('div', { class: 'dis-head' },
      h('span', { class: 'dis-tit' }, '✨ Ideas de diseño'),
      h('button', { class: 'icon-btn', title: 'Cerrar', onclick: cierraDisenador }, '✕')),
    _disCuerpo,
    h('div', { class: 'dis-pie' },
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!(S.prefs && S.prefs.sinDisenador),
          onchange: e => { S.prefs = S.prefs || {}; S.prefs.sinDisenador = e.target.checked; if (typeof guardaPrefs === 'function') guardaPrefs(); } }),
        'No abrirlo solo al poner una figura')));
  $('#asisRoot').append(_disPanel);
  return _disPanel;
}
function cierraDisenador() {
  document.body.classList.remove('con-dis');
  if (_disPanel) _disPanel.classList.remove('on');
  _disBloque = null;
}
/* Se abre para la diapositiva actual. Si hay una figura (la indicada, la
   seleccionada o la primera de la diapositiva), además se analiza la imagen
   y se suman sus propuestas a las del contenido. */
const figuraConImagen = b => b && ((b.type === 'image' && b.src) || (b.type === 'galeria' && ((galDe(b).imgs[0] || {}).src)));
async function abreDisenador(b) {
  const sl = curSlide();
  if (!sl || !zonasDe(sl.layout)) { toast('Las ideas de diseño trabajan sobre diapositivas con contenido; esta es una portada, una sección o el índice'); return; }
  const sel = b || (S.selBlock && (findBlock(S.selBlock) || {}).block);
  const fig = figuraConImagen(sel) ? sel : figuraPrincipal(sl);
  if (typeof cierraAsistente === 'function') cierraAsistente();
  panelDisenador();
  const token = sl.id + '|' + (fig ? fig.id : '');
  _disBloque = token;
  document.body.classList.add('con-dis');
  _disPanel.classList.add('on');
  _disCuerpo.innerHTML = '';
  _disCuerpo.append(h('p', { class: 'hint' }, fig ? 'Mirando la figura…' : 'Mirando la diapositiva…'));
  const an = fig ? await analizaImagen(fig.type === 'galeria' ? galDe(fig).imgs[0].src : fig.src) : null;
  if (_disBloque !== token) return;
  pintaDisenador(fig, an);
}
function pintaDisenador(fig, an) {
  _disCuerpo.innerHTML = '';
  const sl = curSlide();
  const props = propuestasDiapositiva(S.deck, S.cur, { bloque: fig, an });
  const C = leeContenido(sl);
  _disCuerpo.append(h('p', { class: 'dis-lee' }, fig ? leeImagen(an) : leeDiapositiva(C)));
  const [W, H] = slideDims(S.deck);
  props.forEach(p => {
    /* la miniatura es la diapositiva de verdad, ya cambiada */
    const tw = 344, k = tw / W;
    const clip = h('div', { class: 'dis-clip', style: `width:${tw}px;height:${Math.round(H * k)}px` });
    let mini;
    try { mini = renderSlide(p.copia, S.cur, 'thumb'); } catch (e) { return; }
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const tar = h('button', { class: 'dis-tar', title: p.d, 'data-propuesta': p.id, onclick: () => aplicaPropuesta(p.id, sl.id, fig, an) },
      clip,
      h('div', { class: 'dis-txt' }, h('b', null, p.n), h('em', null, p.d)));
    _disCuerpo.append(tar);
  });
  if (!props.length) _disCuerpo.append(h('p', { class: 'hint' }, C.utiles.length ? 'No se me ocurre nada mejor de lo que ya tienes.' : 'Pon texto, una lista o una figura y te propongo cómo acomodarlos.'));
}
function leeImagen(an) {
  if (!an) return 'No pude leer la figura, pero aquí van los acomodos que suelen funcionar.';
  const t = an.tipo === 'micrografia' ? 'Parece una micrografía o una imagen en escala de grises'
    : an.tipo === 'grafico' ? 'Parece una gráfica o un dibujo con fondo claro'
    : 'Parece una fotografía';
  const f = an.panoramica ? 'panorámica' : an.vertical ? 'vertical' : 'casi cuadrada';
  const l = an.oscura ? ' y oscura' : an.clara ? ' y clara' : '';
  const p = an.pesoX < 0.44 ? ', con el motivo hacia la izquierda' : an.pesoX > 0.56 ? ', con el motivo hacia la derecha' : '';
  return t + ', ' + f + l + p + '. Toca una propuesta para aplicarla; se deshace con Ctrl+Z.';
}
/* Las tarjetas se pintaron para una diapositiva y un contenido concretos. Al
   pulsar se recalculan sobre lo que hay ahora: si cambió de diapositiva, o la
   propuesta ya no sale (se editó el texto), se repinta en vez de aplicar algo
   calculado para otra cosa. */
function aplicaPropuesta(id, slideId, fig, an) {
  const sl = curSlide();
  const vivo = fig ? buscaBloque(sl, fig.id) : null;
  const p = sl && sl.id === slideId ? propuestasDiapositiva(S.deck, S.cur, { bloque: vivo, an }).find(x => x.id === id) : null;
  if (!p) { toast('La diapositiva cambió: aquí van las ideas para lo que tiene ahora'); abreDisenador(figuraConImagen(vivo) ? vivo : undefined); return; }
  try { conTutorEnSilencio(() => p.aplica(S.deck, S.cur)); } catch (e) { toast('No se pudo aplicar esa idea'); return; }
  S.selBlock = null;
  conTutorEnSilencio(() => commit());
  { const sl = curSlide(); const l = typeof leccionPendiente === 'function' ? leccionPendiente(sl) : null;
    if (l) ensena(l.id, 'Por qué el Diseñador lo acomodó así'); }
  toast('Diseño aplicado · ' + p.n, null, { t: 'Deshacer', fn: doUndo });
  /* Con el panel abierto, las ideas se recalculan sobre lo que quedó. */
  const b2 = fig ? buscaBloque(curSlide(), fig.id) : null;
  if (_disBloque) abreDisenador(figuraConImagen(b2) ? b2 : undefined);
}
/* Se llama al terminar de poner una imagen. */
function disenadorAlPonerImagen(b) {
  if (!b || !b.src) return;
  if (S.prefs && S.prefs.sinDisenador) return;
  setTimeout(() => { if (b.src) abreDisenador(b); }, 260);
}


