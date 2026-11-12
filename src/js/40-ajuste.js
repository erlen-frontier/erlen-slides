/* ==== 40-ajuste.js ==== */
'use strict';
/* ================= ajustes con incertidumbre =================
   Un número sin su incertidumbre es lo que hace que el jurado pregunte.
   Calcularlo aparte es esfuerzo no recompensado: la paradoja del esfuerzo
   dice que ese es justo el que hay que quitar. */

/* Mínimos cuadrados con errores estándar de la pendiente y la ordenada. */
function linFitSE(pts) {
  const n = pts.length;
  if (n < 3) { const f = linFit(pts); return f ? Object.assign({ n, sm: null, sb: null, s: null }, f) : null; }
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const d = n * sxx - sx * sx;
  if (!d) return null;
  const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
  const yb = sy / n;
  let ssr = 0, sst = 0;
  for (const [x, y] of pts) { const f = m * x + b; ssr += (y - f) * (y - f); sst += (y - yb) * (y - yb); }
  const s2 = ssr / (n - 2);                       // varianza residual
  const sm = Math.sqrt(s2 * n / d);               // error estándar de la pendiente
  const sb = Math.sqrt(s2 * sxx / d);             // error estándar de la ordenada
  return { m, b, r2: sst ? 1 - ssr / sst : 1, n, sm, sb, s: Math.sqrt(s2) };
}
/* Residuales, para ver si el ajuste lineal era la forma correcta. */
function residuales(pts, f) { return pts.map(([x, y]) => [x, y - (f.m * x + f.b)]); }

/* Límite de detección de una curva de calibración: 3.3 σ / pendiente,
   el criterio de la ICH que piden casi todas las revistas. */
function limiteDeteccion(f) {
  if (!f || !f.s || !f.m) return null;
  return { ld: 3.3 * f.s / Math.abs(f.m), lc: 10 * f.s / Math.abs(f.m) };
}

/* Redondeo a la incertidumbre: 1.5479 ± 0.0231 → «1.548 ± 0.023». */
function conError(v, e) {
  if (e == null || !isFinite(e) || e === 0) return sigFig(v, 4);
  /* Con datos exactamente colineales la incertidumbre que sale del ajuste es
     ruido de coma flotante: escribir «± 1.6×10⁻¹⁸» aparenta una precisión que
     no existe, así que por debajo del millonésimo del valor no se reporta. */
  if (v !== 0 && Math.abs(e / v) < 1e-6) return sigFig(v, 4);
  const dec = Math.max(0, -Math.floor(Math.log10(Math.abs(e))) + 1);
  if (dec > 8) return sigFig(v, 4) + ' ± ' + sigFig(e, 2);
  return v.toFixed(dec) + ' ± ' + e.toFixed(dec);
}

/* ---------- anchura a media altura, medida sobre los datos ----------
   Sin suponer que el pico es gaussiano: se interpola el cruce por la mitad
   de la altura a cada lado, que es lo que se hace en la práctica. */
function fwhm(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  if (p.length < 5) return null;
  const base = Math.min(...p.map(q => q[1]));
  let iMax = 0;
  p.forEach((q, i) => { if (q[1] > p[iMax][1]) iMax = i; });
  const alto = p[iMax][1] - base;
  if (alto <= 0) return null;
  const mitad = base + alto / 2;
  const cruce = (a, b) => a[1] === b[1] ? a[0] : a[0] + (mitad - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
  let xi = null, xd = null;
  for (let i = iMax; i > 0; i--) if (p[i - 1][1] <= mitad && p[i][1] >= mitad) { xi = cruce(p[i - 1], p[i]); break; }
  for (let i = iMax; i < p.length - 1; i++) if (p[i + 1][1] <= mitad && p[i][1] >= mitad) { xd = cruce(p[i + 1], p[i]); break; }
  if (xi == null || xd == null) return null;
  return { centro: p[iMax][0], alto, fwhm: Math.abs(xd - xi), izq: xi, der: xd, base };
}

/* ---------- constantes y transformaciones ---------- */
/* hc en eV·nm: un fotón de λ nm tiene E = 1239.84 / λ eV. */
const HC_EV_NM = 1239.84;
function nmAeV(nm) { return nm > 0 ? HC_EV_NM / nm : null; }

/* Kubelka–Munk: de reflectancia difusa R (en %) a F(R) = (1 − R)² / 2R,
   proporcional a α/S. Solo tiene sentido con 0 < R < 100 %; fuera, null. */
function kubelkaMunk(pct) {
  const R = pct / 100;
  return R > 0 && R < 1 ? (1 - R) * (1 - R) / (2 * R) : null;
}

/* Mínimo y máximo de una lista. No se usa Math.min(...lista): con miles de
   puntos el argumento se desborda. */
function extremos(v) {
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return { lo, hi };
}

/* ¿El eje x parece longitud de onda en nm y no energía en eV? Los eV de un
   espectro quedan entre 0 y unos 10; los nm del UV-Vis, entre cientos y miles. */
function pareceNanometros(xs) {
  const v = xs.filter(isFinite);
  if (v.length < 3) return false;
  const { lo, hi } = extremos(v);
  return lo >= 100 && hi <= 3000;
}

/* Scherrer: tamaño de cristalita a partir de la anchura del pico.
   fwhmGrados es la FWHM en 2θ (°) y dosThetaGrados la posición 2θ del pico (°).
   betaInstGrados, si se da, es la anchura instrumental: con perfiles gaussianos,
   β_muestra² = β_obs² − β_inst². Devuelve nm, o null si algún dato no es válido:
   un K o una λ de cero no son «el valor por omisión», son un error. */
function scherrer(fwhmGrados, dosThetaGrados, K = 0.9, lambdaNm = 0.15406, betaInstGrados = 0) {
  if (!(K > 0) || !(lambdaNm > 0) || !(fwhmGrados > 0) || !(betaInstGrados >= 0) || betaInstGrados >= fwhmGrados) return null;
  const betaDeg = betaInstGrados > 0 ? Math.sqrt(fwhmGrados * fwhmGrados - betaInstGrados * betaInstGrados) : fwhmGrados;
  const beta = betaDeg * Math.PI / 180;
  const theta = dosThetaGrados / 2 * Math.PI / 180;
  const cos = Math.cos(theta);
  if (!(cos > 0)) return null;
  return { nm: K * lambdaNm / (beta * cos), K, lambda: lambdaNm, theta: dosThetaGrados / 2, betaDeg, descontada: betaInstGrados > 0 };
}

/* Tauc: (αhν)^n frente a hν; el corte de la recta con el eje da Eg.
   pts = [[hν (eV), absorbancia o α; o F(R) si la fuente es reflectancia], …].
   Sin «ventana» se elige, entre los tramos de 25 % de los puntos (al menos 4),
   el de mayor R² con pendiente positiva. Con «ventana» = {desde, hasta} (eV)
   se ajusta todo ese intervalo.
   El error de Eg sale de la covarianza de la recta:
   σ(Eg) = (s/|m|)·√(1/n + (Eg − x̄)²/Sxx). Sumar los errores relativos de la
   pendiente y de la ordenada como si fueran independientes lo sobreestima mucho,
   porque la ordenada se extrapola lejos de los datos. */
function tauc(pts, directa, ventana) {
  const n = directa === false ? 0.5 : 2;
  /* Una absorción negativa es ruido: se trata como cero, sin elevarla al
     cuadrado, que la volvería positiva. Se ordena por energía antes de
     elegir el tramo, para que «tramo» signifique intervalo de energía. */
  const t = pts
    .filter(p => isFinite(p[0]))
    .map(([hv, a]) => [hv, Math.pow(Math.max(a * hv, 0), n)])
    .filter(p => isFinite(p[1]))
    .sort((p, q) => p[0] - q[0]);
  if (t.length < 5) return null;
  let seg, f, auto = false;
  if (ventana && Number.isFinite(ventana.desde) && Number.isFinite(ventana.hasta)) {
    const lo = Math.min(ventana.desde, ventana.hasta), hi = Math.max(ventana.desde, ventana.hasta);
    seg = t.filter(p => p[0] >= lo && p[0] <= hi);
    if (seg.length < 4) return null;
    f = linFitSE(seg);
  } else {
    const ven = Math.max(4, Math.round(t.length * 0.25));
    let mejor = null;
    for (let i = 0; i + ven <= t.length; i++) {
      const g = linFitSE(t.slice(i, i + ven));
      if (g && g.m > 0 && (!mejor || g.r2 > mejor.f.r2)) mejor = { f: g, i };
    }
    if (!mejor) return null;
    seg = t.slice(mejor.i, mejor.i + ven); f = mejor.f; auto = true;
  }
  if (!f || !(f.m > 0)) return null;
  const eg = -f.b / f.m;
  const k = seg.length;
  let sEg = null;
  if (f.s != null) {
    const xbar = seg.reduce((s, p) => s + p[0], 0) / k;
    const sxx = seg.reduce((s, p) => s + (p[0] - xbar) * (p[0] - xbar), 0);
    if (sxx > 0) sEg = f.s / f.m * Math.sqrt(1 / k + (eg - xbar) * (eg - xbar) / sxx);
  }
  return { eg, sEg, r2: f.r2, n: k, desde: seg[0][0], hasta: seg[k - 1][0], auto, seg, t, f };
}

/* Sensibilidad al tramo: el Eg con las ventanas vecinas, con inicio y fin desplazados
   ±frac del ancho de la ventana. Devuelve el mínimo y el máximo, o null si no hay dos. */
function sensibilidadTramo(pts, directa, r, frac = 0.1) {
  if (!r) return null;
  const d = (r.hasta - r.desde) * frac, egs = [];
  for (const dd of [-d, 0, d]) for (const dh of [-d, 0, d]) {
    const q = tauc(pts, directa, { desde: r.desde + dd, hasta: r.hasta + dh });
    if (q && Number.isFinite(q.eg)) egs.push(q.eg);
  }
  return egs.length > 1 ? { min: Math.min(...egs), max: Math.max(...egs), n: egs.length } : null;
}

/* ---------- gráficas pequeñas en SVG, sin dependencias ---------- */
/* Marcas «redondas» de un eje entre dos valores (pasos de 1, 2, 2.5, 5 × 10ⁿ). */
function marcasEje(lo, hi, k) {
  if (!(hi > lo)) return [lo];
  const bruto = (hi - lo) / k, mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = [1, 2, 2.5, 5, 10].map(f => f * mag).find(p => p >= bruto) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / paso) * paso; v <= hi + paso / 1e6; v += paso) out.push(+v.toFixed(10));
  return out;
}

/* Gráfica de Tauc: los puntos transformados (oscuros, los del tramo), el ajuste
   (sólido en el tramo, discontinuo al extrapolarlo hasta el eje) y el corte, Eg. */
function graficaTauc(r, etiquetaY) {
  const W = 330, H = 196, L = 50, R = 12, T = 14, B = 34;
  const ex = extremos(r.t.map(p => p[0]).concat([r.eg])), ey = extremos(r.t.map(p => p[1]));
  const x0 = ex.lo, x1 = ex.hi, y1 = (ey.hi > 0 ? ey.hi : 1) * 1.08;
  const sx = v => L + (v - x0) / ((x1 - x0) || 1) * (W - L - R);
  const sy = v => H - B - v / y1 * (H - B - T);
  const svg = sv('svg', { class: 'an-plot', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
    'aria-label': 'Gráfica de Tauc. Banda prohibida ' + conError(r.eg, r.sEg) + ' eV' });
  svg.append(sv('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'an-eje' }),
    sv('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, class: 'an-eje' }));
  marcasEje(x0, x1, 4).forEach(v => svg.append(
    sv('line', { x1: sx(v), y1: H - B, x2: sx(v), y2: H - B + 4, class: 'an-eje' }),
    sv('text', { x: sx(v).toFixed(1), y: H - B + 15, 'text-anchor': 'middle' }, sigFig(v, 3))));
  marcasEje(0, y1, 3).forEach(v => svg.append(
    sv('text', { x: L - 6, y: (sy(v) + 3).toFixed(1), 'text-anchor': 'end' }, sigFig(v, 2))));
  const dentro = new Set(r.seg);
  r.t.forEach(p => {
    const en = dentro.has(p);
    svg.append(sv('circle', { cx: sx(p[0]).toFixed(1), cy: sy(p[1]).toFixed(1), r: en ? 2.4 : 1.3, class: en ? 'an-pto an-pto-on' : 'an-pto' }));
  });
  const y = x => r.f.m * x + r.f.b;
  if (r.eg < r.desde) svg.append(sv('line', { x1: sx(r.eg).toFixed(1), y1: sy(0).toFixed(1), x2: sx(r.desde).toFixed(1), y2: sy(y(r.desde)).toFixed(1), class: 'an-tramo-x' }));
  svg.append(sv('line', { x1: sx(r.desde).toFixed(1), y1: sy(y(r.desde)).toFixed(1), x2: sx(r.hasta).toFixed(1), y2: sy(y(r.hasta)).toFixed(1), class: 'an-tramo' }));
  svg.append(sv('circle', { cx: sx(r.eg).toFixed(1), cy: sy(0).toFixed(1), r: 3.5, class: 'an-eg' }));
  svg.append(sv('text', { x: L + 6, y: T + 11 }, etiquetaY),
    sv('text', { x: L + 6, y: T + 25, class: 'an-eg-t' }, 'Eg = ' + conError(r.eg, r.sEg) + ' eV'));
  svg.append(sv('text', { x: ((L + W - R) / 2).toFixed(1), y: H - 4, 'text-anchor': 'middle' }, 'hν (eV)'));
  return svg;
}

/* Pico y anchura: los datos, la línea a media altura entre la base y el máximo,
   y los dos cruces donde se mide la FWHM. */
function graficaPico(pts, w) {
  const W = 330, H = 170, L = 50, R = 12, T = 14, B = 30;
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  const ex = extremos(p.map(q => q[0])), ey = extremos(p.map(q => q[1]));
  const sx = v => L + (v - ex.lo) / ((ex.hi - ex.lo) || 1) * (W - L - R);
  const sy = v => H - B - (v - ey.lo) / ((ey.hi - ey.lo) || 1) * (H - B - T);
  const svg = sv('svg', { class: 'an-plot', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
    'aria-label': 'Pico centrado en ' + sigFig(w.centro, 5) + '°, FWHM ' + sigFig(w.fwhm, 4) + '°' });
  svg.append(sv('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'an-eje' }),
    sv('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, class: 'an-eje' }));
  marcasEje(ex.lo, ex.hi, 4).forEach(v => svg.append(
    sv('line', { x1: sx(v).toFixed(1), y1: H - B, x2: sx(v).toFixed(1), y2: H - B + 4, class: 'an-eje' }),
    sv('text', { x: sx(v).toFixed(1), y: H - B + 15, 'text-anchor': 'middle' }, sigFig(v, 4))));
  marcasEje(ey.lo, ey.hi, 3).forEach(v => svg.append(
    sv('text', { x: L - 6, y: (sy(v) + 3).toFixed(1), 'text-anchor': 'end' }, sigFig(v, 3))));
  svg.append(sv('polyline', { points: p.map(q => sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1)).join(' '), class: 'an-curva' }));
  const ym = sy(w.base + w.alto / 2).toFixed(1);
  svg.append(sv('line', { x1: sx(w.izq).toFixed(1), y1: ym, x2: sx(w.der).toFixed(1), y2: ym, class: 'an-tramo-x' }));
  [w.izq, w.der].forEach(x => svg.append(sv('line', { x1: sx(x).toFixed(1), y1: ym, x2: sx(x).toFixed(1), y2: H - B, class: 'an-tramo-x' })));
  /* La etiqueta va junto a un cruce, fuera del pico; si el pico está al borde, al otro lado. */
  const aDer = sx(w.der) < W - 90;
  svg.append(sv('text', { x: (aDer ? sx(w.der) + 6 : sx(w.izq) - 6).toFixed(1), y: (+ym - 4).toFixed(1),
    'text-anchor': aDer ? 'start' : 'end', class: 'an-eg-t' }, 'FWHM ' + sigFig(w.fwhm, 4) + '°'));
  return svg;
}

/* ---------- panel de análisis del bloque de gráfica ---------- */
const MODOS_ANALISIS = [
  { id: 'lineal', n: 'Ajuste lineal' },
  { id: 'pico', n: 'Pico y anchura' },
  { id: 'scherrer', n: 'Scherrer' },
  { id: 'tauc', n: 'Tauc' }
];
/* Longitudes de onda de los ánodos más habituales, en nm. */
const RADIACIONES_AN = [[0.15406, 'Cu Kα · 0.15406 nm'], [0.07107, 'Mo Kα · 0.07107 nm'], [0.17902, 'Co Kα · 0.17902 nm']];

/* Modo al abrir: el último usado; si no hay, el que pide la técnica del archivo. */
function modoInicialAnalisis(b) {
  if (b.analisis) return b.analisis;
  if (b.tecnica === 'xrd') return 'pico';
  if (b.tecnica === 'uvvis' || b.tecnica === 'uvvis-dr') return 'tauc';
  return 'lineal';
}

/* Ajustes del análisis con sus valores por omisión. Se guardan en la gráfica
   como analisisOpc, un objeto opcional: versiones anteriores lo ignoran. */
function opcionesAnalisis(b) {
  const o = b.analisisOpc || {};
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  return {
    serie: Math.max(0, Math.floor(num(o.serie, 0))),
    fuente: o.fuente === 'dr' || o.fuente === 'abs' ? o.fuente : (b.tecnica === 'uvvis-dr' ? 'dr' : 'abs'),
    directa: typeof o.directa === 'boolean' ? o.directa : true,
    nmAeV: o.nmAeV === true,
    desde: num(o.desde, null),
    hasta: num(o.hasta, null),
    K: num(o.K, 0.9),
    lambda: num(o.lambda, 0.15406),
    betaInst: num(o.betaInst, null)
  };
}

/* Serie elegida, con sus puntos numéricos. Null si tiene menos de tres. */
function analisisDe(b, idx) {
  const series = chartSeries(b);
  if (!series.length) return null;
  const k = Math.min(Math.max(0, Math.floor(+idx || 0)), series.length - 1);
  const s = series[k];
  const pts = (s.pts || []).filter(p => isFinite(p[0]) && isFinite(p[1]));
  return pts.length < 3 ? null : { pts, nombre: s.name || 'serie', k };
}

/* Puntos de Tauc: energía en eV y la magnitud a transformar (absorbancia o F(R)).
   Cuenta los que quedan fuera de su dominio, para decirlo en pantalla. */
function puntosTauc(a, opc) {
  const conv = opc.nmAeV && pareceNanometros(a.pts.map(p => p[0]));
  const pts = [];
  let excl = 0;
  for (const [x, y] of a.pts) {
    const hv = conv ? nmAeV(x) : x;
    const v = opc.fuente === 'dr' ? kubelkaMunk(y) : y;
    if (hv == null || v == null || !isFinite(hv) || !isFinite(v)) { excl++; continue; }
    pts.push([hv, v]);
  }
  return { pts, excl, convertido: conv };
}

function filaAnalisis(et, val, nota) {
  return h('div', { class: 'an-fila' },
    h('span', { class: 'an-et' }, et), h('b', { class: 'an-val' }, val),
    nota ? h('span', { class: 'an-nota' }, nota) : null);
}

/* Botones de elección exclusiva con el aspecto de los selectores del modal. */
function segmentoAn(opciones, actual, alCambiar) {
  let vigente = actual;
  const cont = h('div', { class: 'seg', style: 'margin-bottom:10px' });
  const pinta = () => $$('button', cont).forEach(x => x.classList.toggle('on', x.dataset.v === String(vigente)));
  opciones.forEach(([v, n]) => cont.append(h('button', { 'data-v': String(v), onclick: () => { vigente = v; pinta(); alCambiar(v); } }, n)));
  pinta();
  return cont;
}

function openAnalisis(b) {
  let opc = opcionesAnalisis(b);
  let sucio = false;
  /* Los cambios viven en la gráfica y se guardan con un único paso de deshacer
     al cerrar el diálogo, no uno por cada pulsación. */
  const cambia = cambios => { b.analisisOpc = Object.assign({}, b.analisisOpc, cambios); opc = opcionesAnalisis(b); sucio = true; };
  const ctx = { b, opc: () => opcionesAnalisis(b), cambia, guardado: () => { sucio = false; } };
  const series = chartSeries(b);
  const cuerpo = h('div');
  const conDatos = s => (s.pts || []).filter(p => isFinite(p[0]) && isFinite(p[1])).length >= 3;
  if (!series.some(conDatos)) {
    cuerpo.append(h('p', { class: 'hint' }, 'Hacen falta al menos tres puntos con números para analizar la serie.'));
    openModal({ title: 'Análisis', size: 'modal-sm', body: cuerpo, foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')] });
    return;
  }
  let a = analisisDe(b, opc.serie);
  const info = h('p', { class: 'hint', style: 'margin-top:0' });
  const pintaInfo = () => {
    info.textContent = a ? 'Serie analizada: ' + a.nombre + ' · ' + a.pts.length + ' puntos.'
      : 'Esta serie no tiene al menos tres puntos con números. Elige otra.';
  };
  pintaInfo();
  cuerpo.append(info);
  if (series.length > 1) {
    cuerpo.append(h('div', { class: 'an-campo' }, h('label', null, 'Serie ',
      h('select', { class: 'field', onchange: e => { cambia({ serie: +e.target.value }); a = analisisDe(b, opc.serie); pintaInfo(); dibuja(); } },
        series.map((s, i) => h('option', { value: String(i), selected: i === (a ? a.k : opc.serie) ? true : null },
          (s.name || 'serie ' + (i + 1)) + ' · ' + (s.pts || []).length + ' puntos'))))));
  }

  let modo = modoInicialAnalisis(b);
  const seg = h('div', { class: 'seg seg-4 seg-wrap', style: 'margin-bottom:14px' });
  const panel = h('div');
  const dibuja = () => {
    panel.innerHTML = '';
    if (!a) { panel.append(h('p', { class: 'hint' }, 'Elige una serie con al menos tres puntos.')); return; }
    panel.append(modo === 'lineal' ? panelLineal(a, ctx) : modo === 'pico' ? panelPico(a)
      : modo === 'scherrer' ? panelScherrer(a, ctx) : panelTauc(a, ctx));
  };
  MODOS_ANALISIS.forEach(m => seg.append(h('button', { class: modo === m.id ? 'on' : '',
    onclick: e => { modo = m.id; b.analisis = m.id; sucio = true; $$('button', seg).forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); dibuja(); } }, m.n)));
  cuerpo.append(seg, panel);
  dibuja();
  openModal({ title: 'Análisis de la serie', size: 'modal-sm', body: cuerpo,
    onclose: () => { if (sucio) commit(); },
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
}

function panelLineal(a, ctx) {
  const cont = h('div');
  const f = linFitSE(a.pts);
  if (!f) { cont.append(h('p', { class: 'hint' }, 'No se pudo ajustar.')); return cont; }
  cont.append(filaAnalisis('Pendiente', conError(f.m, f.sm), f.sm ? 'error estándar del ajuste' : 'con 3 puntos o más se calcula el error'));
  cont.append(filaAnalisis('Ordenada al origen', conError(f.b, f.sb)));
  cont.append(filaAnalisis('R²', f.r2.toFixed(5)));
  cont.append(filaAnalisis('Puntos', String(f.n)));
  if (f.s != null) cont.append(filaAnalisis('Desviación residual', sigFig(f.s, 3)));
  const ld = limiteDeteccion(f);
  if (ld) {
    cont.append(h('div', { class: 'an-sep' }, 'Si es una curva de calibración'));
    cont.append(filaAnalisis('Límite de detección', sigFig(ld.ld, 3), '3.3 σ/m, criterio ICH'));
    cont.append(filaAnalisis('Límite de cuantificación', sigFig(ld.lc, 3), '10 σ/m'));
  }
  cont.append(residualesSVG(a.pts, f));
  cont.append(h('p', { class: 'hint' }, 'Si los residuales dibujan una curva en vez de una nube, la relación no es lineal en todo el intervalo.'));
  cont.append(h('button', { class: 'btn btn-sm', onclick: () => {
    ctx.b.title = (ctx.b.title ? ctx.b.title + ' · ' : '') + 'm = ' + conError(f.m, f.sm) + ', R² = ' + f.r2.toFixed(4);
    commit(); ctx.guardado(); closeModal(); toast('Resultado puesto en el título de la gráfica');
  } }, 'Poner el resultado en el título'));
  return cont;
}

function panelPico(a) {
  const cont = h('div');
  const w = fwhm(a.pts);
  if (!w) { cont.append(h('p', { class: 'hint' }, 'No se encontró un pico con dos cruces por la media altura. Recorta los datos al pico.')); return cont; }
  cont.append(filaAnalisis('Centro del pico', sigFig(w.centro, 5)));
  cont.append(filaAnalisis('Altura', sigFig(w.alto, 4), 'sobre la línea base'));
  cont.append(filaAnalisis('FWHM', sigFig(w.fwhm, 4), 'anchura a media altura, medida sobre los datos'));
  cont.append(filaAnalisis('Cruces', sigFig(w.izq, 5) + '  y  ' + sigFig(w.der, 5)));
  cont.append(graficaPico(a.pts, w));
  cont.append(h('p', { class: 'hint' }, 'Medida directa por interpolación, sin suponer que el pico es gaussiano. Si el fondo no es plano, réstalo antes.'));
  return cont;
}

function panelScherrer(a, ctx) {
  const cont = h('div');
  const w = fwhm(a.pts);
  const o0 = ctx.opc();
  const pre = RADIACIONES_AN.find(([v]) => Math.abs(v - o0.lambda) < 1e-9);
  const sel = h('select', { class: 'field', 'aria-label': 'Radiación del tubo', style: 'width:auto' },
    RADIACIONES_AN.map(([v, n]) => h('option', { value: String(v), selected: pre && pre[0] === v ? true : null }, n)),
    h('option', { value: 'otra', selected: pre ? null : true }, 'Otra longitud de onda'));
  const cajaK = h('input', { class: 'field', type: 'number', step: '0.01', value: o0.K, 'aria-label': 'Factor de forma K', style: 'width:110px' });
  const cajaL = h('input', { class: 'field', type: 'number', step: '0.00001', value: o0.lambda, 'aria-label': 'Longitud de onda en nm', style: 'width:110px' });
  const cajaB = h('input', { class: 'field', type: 'number', step: '0.001', min: '0', value: o0.betaInst, placeholder: '0', 'aria-label': 'Anchura instrumental en grados', style: 'width:110px' });
  const grafico = h('div');
  const salida = h('div');
  const calcula = () => {
    grafico.innerHTML = ''; salida.innerHTML = '';
    if (!w) { salida.append(h('p', { class: 'hint' }, 'Primero hay que poder medir la anchura: recorta los datos a un solo pico.')); return; }
    grafico.append(graficaPico(a.pts, w));
    const bi = cajaB.value.trim() === '' ? 0 : +cajaB.value;
    if (!(bi >= 0)) { salida.append(h('p', { class: 'hint' }, 'La anchura instrumental no puede ser negativa.')); return; }
    if (bi >= w.fwhm) { salida.append(h('p', { class: 'hint' }, 'La anchura instrumental tiene que ser menor que la del pico medido (' + sigFig(w.fwhm, 4) + '°).')); return; }
    const r = scherrer(w.fwhm, w.centro, +cajaK.value, +cajaL.value, bi);
    if (!r) { salida.append(h('p', { class: 'hint' }, 'K y λ tienen que ser números positivos.')); return; }
    salida.append(filaAnalisis('FWHM medida', sigFig(w.fwhm, 4) + '°'));
    if (r.descontada) salida.append(filaAnalisis('FWHM de la muestra', sigFig(r.betaDeg, 4) + '°', 'β² = β_obs² − β_inst²'));
    salida.append(filaAnalisis('2θ del pico', sigFig(w.centro, 5) + '°'));
    salida.append(filaAnalisis('Tamaño de cristalita', sigFig(r.nm, 3) + ' nm', 'D = Kλ / (β cos θ)'));
    salida.append(h('p', { class: 'hint' }, r.descontada
      ? 'Anchura instrumental descontada suponiendo perfiles gaussianos. Mídela con un patrón de referencia.'
      : 'La anchura instrumental no está descontada: el valor es un límite inferior del tamaño real.'));
  };
  sel.addEventListener('change', () => {
    if (sel.value === 'otra') return;
    cajaL.value = sel.value;
    ctx.cambia({ lambda: +sel.value }); calcula();
  });
  cajaL.addEventListener('input', () => {
    const l = parseFloat(cajaL.value);
    ctx.cambia({ lambda: isFinite(l) ? l : null });
    const p = RADIACIONES_AN.find(([v]) => isFinite(l) && Math.abs(v - l) < 1e-9);
    sel.value = p ? String(p[0]) : 'otra';
    calcula();
  });
  cajaK.addEventListener('input', () => {
    const k = parseFloat(cajaK.value);
    ctx.cambia({ K: isFinite(k) ? k : null }); calcula();
  });
  cajaB.addEventListener('input', () => {
    const v = parseFloat(cajaB.value);
    ctx.cambia({ betaInst: isFinite(v) ? v : null }); calcula();
  });
  cont.append(h('div', { class: 'irow' }, h('label', null, 'K (factor de forma)'), cajaK),
    h('div', { class: 'irow' }, h('label', null, 'Radiación'), sel),
    h('div', { class: 'irow' }, h('label', null, 'λ (nm)'), cajaL),
    h('div', { class: 'irow' }, h('label', null, 'Anchura instrumental (°, opcional)'), cajaB),
    grafico, salida);
  calcula();
  return cont;
}

function panelTauc(a, ctx) {
  const cont = h('div');
  const avisos = h('div');
  const grafico = h('div');
  const salida = h('div');
  const cajaD = h('input', { class: 'field', type: 'number', step: '0.01', 'aria-label': 'Inicio del tramo (eV)', style: 'width:100px' });
  const cajaH = h('input', { class: 'field', type: 'number', step: '0.01', 'aria-label': 'Fin del tramo (eV)', style: 'width:100px' });
  /* El automático depende solo de los datos y de la transformación: se guarda
     mientras no cambien, para que escribir en las cajas no lo recalcule. */
  let claveAuto = null, autoRes = null;
  const automatico = (pts, opc) => {
    const clave = opc.fuente + '|' + opc.nmAeV + '|' + opc.directa;
    if (clave !== claveAuto) { claveAuto = clave; autoRes = tauc(pts, opc.directa, null); }
    return autoRes;
  };
  const recalcula = () => {
    const opc = ctx.opc();
    const datos = puntosTauc(a, opc);
    const auto = automatico(datos.pts, opc);
    /* Con un extremo fijado y el otro no, el que falta sale del automático. */
    const ambos = opc.desde != null && opc.hasta != null;
    let ventana = ambos ? { desde: opc.desde, hasta: opc.hasta } : null;
    if (!ambos && (opc.desde != null || opc.hasta != null) && auto) {
      ventana = { desde: opc.desde != null ? opc.desde : auto.desde, hasta: opc.hasta != null ? opc.hasta : auto.hasta };
    }
    const r = ventana ? tauc(datos.pts, opc.directa, ventana) : auto;
    if (document.activeElement !== cajaD) cajaD.value = opc.desde != null ? opc.desde : (r ? +r.desde.toFixed(3) : '');
    if (document.activeElement !== cajaH) cajaH.value = opc.hasta != null ? opc.hasta : (r ? +r.hasta.toFixed(3) : '');
    avisos.innerHTML = '';
    const xs = a.pts.map(p => p[0]);
    if (datos.convertido) {
      avisos.append(h('div', { class: 'an-aviso' }, 'Eje convertido de nm a eV con E = 1239.84 / λ. ',
        h('button', { class: 'btn btn-sm', onclick: () => { ctx.cambia({ nmAeV: false, desde: null, hasta: null }); recalcula(); } }, 'Usar nm')));
    } else if (pareceNanometros(xs)) {
      avisos.append(h('div', { class: 'an-aviso' }, 'El eje x parece estar en nanómetros, y Tauc necesita energía en eV. ',
        h('button', { class: 'btn btn-sm', onclick: () => { ctx.cambia({ nmAeV: true, desde: null, hasta: null }); recalcula(); } }, 'Convertir a eV (E = 1239.84 / λ)')));
    }
    if (opc.fuente === 'dr' && extremos(a.pts.map(p => p[1])).hi <= 1) {
      avisos.append(h('div', { class: 'an-aviso' }, 'Los valores de reflectancia parecen fracciones (0–1). Este modo espera porcentajes (0–100 %).'));
    }
    grafico.innerHTML = ''; salida.innerHTML = '';
    if (!r) {
      salida.append(h('p', { class: 'hint' }, 'No hay un tramo recto con pendiente positiva. Prueba otra fuente o transición, o un intervalo distinto.'));
      return;
    }
    salida.append(filaAnalisis('Banda prohibida', (r.sEg ? conError(r.eg, r.sEg) : sigFig(r.eg, 4)) + ' eV'));
    salida.append(filaAnalisis('R² del tramo', r.r2.toFixed(4)));
    salida.append(filaAnalisis('Tramo', sigFig(r.desde, 3) + ' – ' + sigFig(r.hasta, 3) + ' eV', r.auto ? 'automático (mejor R²)' : 'fijado a mano'));
    salida.append(filaAnalisis('Puntos en el tramo', String(r.n)));
    const vec = sensibilidadTramo(datos.pts, opc.directa, r);
    if (vec) salida.append(filaAnalisis('Eg con tramos vecinos', sigFig(vec.min, 4) + ' – ' + sigFig(vec.max, 4) + ' eV', 'inicio y fin ±10 % del ancho'));
    salida.append(h('p', { class: 'hint' }, 'El ± es solo el error estadístico de la recta. No recoge la elección del tramo ni el modelo de Tauc: prueba varios tramos antes de dar el valor.'));
    if (datos.excl) salida.append(h('p', { class: 'hint' }, 'Se excluyen ' + datos.excl + ' puntos sin valor válido en esta transformación.'));
    const etiqueta = '(' + (opc.fuente === 'dr' ? 'F(R)·hν' : 'αhν') + ')' + (opc.directa ? '²' : '^½');
    grafico.append(graficaTauc(r, etiqueta));
    grafico.append(h('p', { class: 'hint' }, 'Puntos oscuros: el tramo ajustado. Línea sólida: el ajuste; discontinua: su extrapolación hasta el eje.'));
  };
  const onVentana = () => {
    const d = parseFloat(cajaD.value), hh = parseFloat(cajaH.value);
    ctx.cambia({ desde: isFinite(d) ? d : null, hasta: isFinite(hh) ? hh : null });
    recalcula();
  };
  cajaD.addEventListener('input', onVentana);
  cajaH.addEventListener('input', onVentana);
  cont.append(h('div', { class: 'an-sep' }, 'Fuente de los datos'),
    segmentoAn([['abs', 'Absorbancia o α'], ['dr', 'Reflectancia difusa (%)']], ctx.opc().fuente, v => { ctx.cambia({ fuente: v }); recalcula(); }),
    avisos,
    h('div', { class: 'an-sep' }, 'Transición'),
    segmentoAn([[true, h('span', null, 'Directa · (αhν)', h('sup', null, '2'))], [false, h('span', null, 'Indirecta · (αhν)', h('sup', null, '½'))]], ctx.opc().directa, v => { ctx.cambia({ directa: v }); recalcula(); }),
    h('div', { class: 'an-sep' }, 'Tramo de ajuste (eV)'),
    h('div', { class: 'an-campo' },
      h('label', null, 'Desde ', cajaD), h('label', null, 'hasta ', cajaH),
      h('button', { class: 'btn btn-sm', onclick: () => { ctx.cambia({ desde: null, hasta: null }); recalcula(); } }, 'Automático')),
    salida, grafico);
  recalcula();
  return cont;
}

/* Gráfica pequeña de residuales, en SVG y sin dependencias. */
function residualesSVG(pts, f) {
  const res = residuales(pts, f);
  const W = 320, H = 92, m = 22;
  const xs = res.map(p => p[0]), ys = res.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const yMax = Math.max(...ys.map(Math.abs)) || 1;
  const sx = v => m + (v - x0) / ((x1 - x0) || 1) * (W - m - 8);
  const sy = v => H / 2 - v / yMax * (H / 2 - 12);
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'an-res' });
  svg.append(sv('line', { x1: m, x2: W - 8, y1: H / 2, y2: H / 2, stroke: 'currentColor', opacity: .35 }));
  res.forEach(([x, y]) => svg.append(sv('circle', { cx: sx(x).toFixed(1), cy: sy(y).toFixed(1), r: 3, fill: 'currentColor', opacity: .75 })));
  return h('div', { class: 'an-resbox' }, h('span', { class: 'an-et' }, 'Residuales'), svg);
}


