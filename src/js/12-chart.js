/* ==== 12-chart.js ==== */
'use strict';
/* ================= gráficas en SVG vectorial =================
   Se dibujan en el mismo espacio de coordenadas de la diapositiva, así que
   salen nítidas en pantalla y vectoriales en el PDF. */

/* Paleta categórica validada (adyacente ≤6; en dispersión la forma del
   marcador acompaña al color como codificación secundaria). */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const SERIES_DARK  = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
const MARKERS = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'];

function chartPalette(deck) {
  const th = temaDe(deck);
  return {
    /* Paleta segura para daltonismo por omisión; la clásica sigue disponible. */
    series: (typeof paletaSegura === 'function' && paletaSegura()) ? (th.dark ? OKABE_ITO_OSCURO : OKABE_ITO) : (th.dark ? SERIES_DARK : SERIES_LIGHT),
    ink: th.fg, mut: th.dark ? '#9AAAB6' : '#5A6470',
    grid: th.dark ? '#39434D' : '#DFE3E8',
    axis: th.dark ? '#6C7A86' : '#9BA4AE',
    surface: th.bg,
    accent: th.acc || '#C0392B'
  };
}

/* ---------- números y ejes ---------- */
function niceTicks(min, max, want) {
  if (!isFinite(min) || !isFinite(max)) return { ticks: [0, 1], min: 0, max: 1 };
  if (min === max) { const d = Math.abs(min) || 1; min -= d * 0.1; max += d * 0.1; }
  const span = max - min;
  const raw = span / Math.max(2, want || 5);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepN = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = stepN * mag;
  const t0 = Math.ceil(min / step - 1e-9) * step;
  const ticks = [];
  for (let v = t0; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return { ticks, step };
}
function fmtTick(v, step) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || (a < 1e-3 && a > 0)) {
    const ex = Math.floor(Math.log10(a));
    const m = v / Math.pow(10, ex);
    const ms = (Math.abs(m - Math.round(m)) < 0.05) ? String(Math.round(m)) : m.toFixed(1);
    return (ms === '1' ? '' : ms + '×') + '10^' + ex;
  }
  const dec = step ? Math.max(0, Math.min(6, -Math.floor(Math.log10(step)) + (step < 1 ? 0 : 0))) : 2;
  let s = v.toFixed(Math.max(0, dec));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
/* Marcas de un eje logarítmico. Un eje log no se rotula «cada paso»: se
   rotula por décadas, y solo cuando el recorrido es corto caben dentro el 2 y
   el 5. Con muchas décadas se saltan las que no quepan. */
function ticksLog(min, max) {
  const e0 = Math.floor(Math.log10(min) + 1e-12), e1 = Math.ceil(Math.log10(max) - 1e-12);
  const dec = Math.max(1, e1 - e0);
  const mant = dec <= 1 ? [1, 2, 3, 5, 7] : dec <= 3 ? [1, 2, 5] : [1];
  const salto = dec > 8 ? Math.ceil(dec / 8) : 1;
  const out = [];
  for (let e = e0; e <= e1; e++) {
    if (salto > 1 && ((e % salto) + salto) % salto !== 0) continue;
    for (const m of mant) {
      const v = m * Math.pow(10, e);
      if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(v);
    }
  }
  return { ticks: out.length ? out : [min, max], log: true };
}
/* El rango de un eje logarítmico llega hasta la década que envuelve los datos.
   Si lo que entra no es positivo no hay logaritmo posible: se sustituye por un
   rango legible en vez de propagar un NaN al dibujo entero. */
function rangoLog(min, max) {
  if (!(max > 0)) { min = 1; max = 10; }
  if (!(min > 0)) min = max / 10;
  if (max <= min) max = min * 10;
  return [Math.pow(10, Math.floor(Math.log10(min) + 1e-12)), Math.pow(10, Math.ceil(Math.log10(max) - 1e-12))];
}
/* Texto de tick como nodos SVG (soporta 10^n con superíndice) */
function tickText(v, step) {
  const s = fmtTick(v, step);
  const m = /^(.*)10\^(-?\d+)$/.exec(s);
  if (!m) return [{ t: s }];
  return [{ t: m[1] + '10' }, { t: m[2], sup: true }];
}
/* En un eje log el rótulo es la potencia: «10⁻³» y no «0.001». Mientras el
   número se lea de un vistazo se escribe entero, que es lo que espera el ojo. */
function tickTextLog(v) {
  const e = Math.floor(Math.log10(v) + 1e-9);
  const man = v / Math.pow(10, e);
  if (e >= -3 && e <= 4) return [{ t: fmtTick(v, Math.pow(10, e) / 10) }];
  const cabeza = Math.abs(man - 1) < 1e-9 ? '10' : (Math.round(man * 10) / 10) + '×10';
  return [{ t: cabeza }, { t: String(e), sup: true }];
}
/* La marca de un eje, sea cual sea su escala: una sola puerta para que la
   rejilla, los rótulos y el ancho del margen no puedan discrepar. */
const rotuloTick = (eje, v) => eje.log ? tickTextLog(v) : tickText(v, eje.step);
const anchoRotulo = partes => partes.reduce((a, p) => a + String(p.t).length * (p.sup ? 0.72 : 1), 0);

/* Texto para el interior del SVG: convierte lo básico de LaTeX a Unicode
   (los títulos de ejes sí usan KaTeX, fuera del SVG). */
const GREEK_UNI = { alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',
  kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',
  Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',
  times:'×',cdot:'·',pm:'±',approx:'≈',leq:'≤',geq:'≥',neq:'≠',infty:'∞',circ:'°',ell:'ℓ',AA:'Å',degree:'°' };
const SUB_UNI = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','a':'ₐ','e':'ₑ','i':'ᵢ','o':'ₒ','x':'ₓ','n':'ₙ','p':'ₚ','s':'ₛ','t':'ₜ' };
const SUP_UNI = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ' };
function mathToUnicode(src) {
  let t = String(src == null ? '' : src);
  t = t.replace(/\\([A-Za-z]+)/g, (m, w) => GREEK_UNI[w] != null ? GREEK_UNI[w] : '');
  t = t.replace(/_\{([^{}]*)\}|_(\w)/g, (m, a, b) => (a != null ? a : b).split('').map(c => SUB_UNI[c] || c).join(''));
  t = t.replace(/\^\{([^{}]*)\}|\^(-?\w)/g, (m, a, b) => (a != null ? a : b).split('').map(c => SUP_UNI[c] || c).join(''));
  t = t.replace(/\\(?=[^A-Za-z])/g, '');
  return t.replace(/[${}]/g, '').replace(/\s+/g, ' ').trim();
}

let _clipSeq = 0;
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
  }
  for (const k of kids.flat(9)) if (k) el.append(k);
  return el;
}
function markerPath(kind, cx, cy, r) {
  switch (kind) {
    case 'square': return `M${cx - r},${cy - r}h${2 * r}v${2 * r}h${-2 * r}z`;
    case 'triangle': return `M${cx},${cy - r * 1.15}L${cx + r * 1.05},${cy + r * 0.8}L${cx - r * 1.05},${cy + r * 0.8}z`;
    case 'diamond': return `M${cx},${cy - r * 1.25}L${cx + r * 1.15},${cy}L${cx},${cy + r * 1.25}L${cx - r * 1.15},${cy}z`;
    case 'cross': return `M${cx - r},${cy - r * .34}h${r * .66}v${-r * .66}h${r * .68}v${r * .66}h${r * .66}v${r * .68}h${-r * .66}v${r * .66}h${-r * .68}v${-r * .66}h${-r * .66}z`;
    case 'star': { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .5 : r * 1.2; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2); } return d + 'z'; }
    default: return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0z`;
  }
}

/* ---------- datos ---------- */
/* Convierte texto pegado de Excel/Origin en series. Detecta separador y coma decimal. */
function parseTable(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  const sample = lines.slice(0, 12).join('\n');
  const semi = (sample.match(/;/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  const com = (sample.match(/,/g) || []).length;
  let sep, decimalComma = false;
  if (tab > 0) sep = /\t/;
  else if (semi > 0) sep = /;/;
  else if (com > 0) sep = /,/;
  else sep = /\s+/;
  const num = s => {
    let t = String(s).trim().replace(/["']/g, '').replace(/−/g, '-');
    if (decimalComma) t = t.replace(/\./g, '').replace(',', '.');
    if (t === '' || t === '-' || t === '—') return NaN;
    const v = parseFloat(t.replace(/\s/g, ''));
    return isFinite(v) ? v : NaN;
  };
  const cells = lines.map(l => l.trim().split(sep).map(c => c.trim()));
  /* La coma decimal del Excel en español llega con tabuladores tan a menudo
     como con punto y coma: se decide por la forma de la celda («0,004»), no
     por el separador de columnas. Con la coma de separador no cabe la duda. */
  if (sep.source !== ',') {
    const ES_DECIMAL = /^[+-]?\d{1,3}(?:\.\d{3})*,\d+$|^[+-]?\d+,\d+$/;
    decimalComma = cells.some(r => r.some(c => ES_DECIMAL.test(c.replace(/["'\s]/g, ''))));
  }
  const ncol = Math.max(...cells.map(r => r.length));
  let headers = null, start = 0;
  const first = cells[0];
  if (first.some(c => c !== '' && isNaN(num(c)))) { headers = first.slice(); start = 1; }
  const rows = [];
  for (let i = start; i < cells.length; i++) {
    const r = [];
    for (let j = 0; j < ncol; j++) r.push(num(cells[i][j]));
    if (r.some(v => isFinite(v))) rows.push(r);
  }
  if (!headers) { headers = []; for (let j = 0; j < ncol; j++) headers.push(j === 0 ? 'x' : 'Serie ' + j); }
  while (headers.length < ncol) headers.push('Serie ' + headers.length);
  return { headers, rows };
}

/* ---------- la incertidumbre viaja en su propia columna ----------
   Una medida sin su error es media medida. La forma en que llega pegada desde
   Excel u Origin es siempre la misma: una columna a la derecha de la serie con
   un encabezado que la delata. Esta lista es la única que decide, y la leen
   por igual la pantalla y el PDF; fuera de ella, una columna es una serie más.
   Están solo las marcas que no significan otra cosa en un laboratorio: «E» es
   un potencial y «u» una velocidad, así que ninguna de las dos entra. */
const MARCA_ERROR = ['±', '+/-', '+-', 'sd', 'sem', 'err', 'error', 'errores', 'desv',
  'desviacion', 'desviación', 'incert', 'incertidumbre', 'sigma', 'σ', 'δy', 'dy', 'ey', 's.d.', 'e.e.'];
function esColumnaError(cab) {
  const t = String(cab == null ? '' : cab).toLowerCase()
    .replace(/[()\[\]{}]/g, ' ').replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (t.includes('±')) return true;
  if (MARCA_ERROR.includes(t.replace(/ /g, ''))) return true;
  /* «error de la absorbancia», «Absorbancia sd»: la marca abre o cierra. */
  const primera = t.split(' ')[0], ultima = t.split(' ').pop();
  const clara = m => m !== '+-' && m !== 's.d.' && m !== 'e.e.' && m.length > 1;
  return MARCA_ERROR.some(m => clara(m) && (primera === m || ultima === m));
}

function linFit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
  const d = n * sxx - sx * sx;
  if (!d) return null;
  const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
  const yb = sy / n;
  let ssr = 0, sst = 0;
  for (const [x, y] of pts) { const f = m * x + b; ssr += (y - f) * (y - f); sst += (y - yb) * (y - yb); }
  return { m, b, r2: sst ? 1 - ssr / sst : 1 };
}
const sigFig = (v, n) => {
  if (!isFinite(v) || v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) {
    const ex = Math.floor(Math.log10(a));
    return (v / Math.pow(10, ex)).toFixed(Math.max(0, (n || 3) - 1)) + '×10^' + ex;
  }
  const d = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(a)));
  let s = v.toFixed(Math.min(8, d));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
};

/* ---------- muestreo de una fórmula ----------
   Con 260 puntos fijos, una curva empinada salía con esquinas (un pico
   estrecho, un escalón de Fermi a baja temperatura) y una asíntota se unía
   con una raya vertical de un lado al otro, como si la función pasara por
   ahí. Aquí se parte de una rejilla base y se subdivide solo donde la curva
   se aparta de la recta entre dos puntos; si en la subdivisión más fina el
   salto sigue siendo grande, es una discontinuidad y se corta el trazo con
   un NaN, que es como la pantalla y pgfplots entienden «levanta el lápiz».
   Con el eje x logarítmico la rejilla se reparte por décadas: en lineal, la
   primera década de un rango 0.01–100 se quedaba con dos puntos. */
const FUNC_BASE = 200, FUNC_PROF = 7, FUNC_MAX = 900;
function muestreaFunc(f, x0, x1, logX) {
  const enLog = !!logX && x0 > 0 && x1 > 0;
  const aX = t => enLog ? Math.pow(10, t) : t;
  const t0 = enLog ? Math.log10(x0) : x0, t1 = enLog ? Math.log10(x1) : x1;
  const ev = t => { let y; try { y = f(aX(t)); } catch (e) { y = NaN; } return isFinite(y) ? y : NaN; };
  const base = [];
  for (let i = 0; i <= FUNC_BASE; i++) { const t = t0 + (t1 - t0) * i / FUNC_BASE; base.push([t, ev(t)]); }
  /* La escala «normal» de la curva, sin dejar que un polo la decida: los
     cuantiles 5–95 % de la rejilla base, que es uniforme y no está sesgada
     hacia donde se refinó. */
  const fin = base.map(q => q[1]).filter(isFinite).sort((a, c) => a - c);
  const cuantil = q => fin[Math.min(fin.length - 1, Math.max(0, Math.round(q * (fin.length - 1))))];
  let escala = fin.length ? cuantil(0.95) - cuantil(0.05) : 1;
  if (!(escala > 0)) escala = fin.length ? (fin[fin.length - 1] - fin[0]) || Math.abs(fin[0]) || 1 : 1;
  const tol = escala * 0.002, salto = escala * 0.25;
  const out = [];
  let presupuesto = FUNC_MAX - base.length;
  const refina = (ta, ya, tb, yb, prof) => {
    const fa = isFinite(ya), fb = isFinite(yb);
    if (!fa && !fb) return;
    /* Sin presupuesto se deja de refinar, pero no se corta: a la resolución
       de la rejilla base un seno rápido parecería un salto. */
    if (presupuesto <= 0 && prof < FUNC_PROF) return;
    if (prof >= FUNC_PROF) {
      /* En la subdivisión más fina, un salto grande entre dos vecinos puede
         ser pendiente (junto a un polo, 1/x sube mucho pero sin saltar) o
         discontinuidad. Lo distingue el punto medio: si la función es
         continua el salto se reparte entre las dos mitades; si no, casi todo
         cae en una. */
      if (fa && fb && Math.abs(yb - ya) > salto) {
        const ym = ev((ta + tb) / 2), J = Math.abs(yb - ya);
        if (!isFinite(ym) || Math.max(Math.abs(ym - ya), Math.abs(yb - ym)) > 0.9 * J) out.push([(ta + tb) / 2, NaN]);
      }
      return;
    }
    const tm = (ta + tb) / 2, ym = ev(tm);
    const recta = fa && fb && isFinite(ym) && Math.abs(ym - (ya + yb) / 2) <= tol &&
      /* Que el punto medio caiga en la recta no basta si los extremos ya
         están lejos: un polo simétrico (1/x en ±h) engaña al punto medio. */
      Math.abs(yb - ya) <= salto;
    if (recta) return;
    presupuesto--;
    refina(ta, ya, tm, ym, prof + 1);
    out.push([tm, ym]);
    refina(tm, ym, tb, yb, prof + 1);
  };
  for (let i = 0; i < base.length; i++) {
    out.push(base[i]);
    if (i < base.length - 1) refina(base[i][0], base[i][1], base[i + 1][0], base[i + 1][1], 0);
  }
  const pts = out.map(([t, y]) => [aX(t), y]);
  /* Cortes: cada tramo sin valor entre dos con valor (un salto, un polo que
     cae justo en la rejilla, un hueco del dominio). Los bordes del dominio
     no cuentan: ln x en [−1, 1] empieza en 0, no se corta. */
  let cortes = 0, visto = false, hueco = false;
  pts.forEach(q => {
    if (isFinite(q[1])) { if (visto && hueco) cortes++; visto = true; hueco = false; }
    else hueco = true;
  });
  /* Con un corte, o con valores diez veces más allá de la parte central de la
     curva (el 10¹⁶ junto a una asíntota), el eje no lo fijan los extremos:
     se propone el rango de la parte «normal», con holgura. */
  let rango = null;
  if (fin.length) {
    const lo = cuantil(0.05), hi = cuantil(0.95);
    const ys = pts.map(q => q[1]).filter(isFinite);
    const lejos = ys.some(y => y > hi + 10 * escala || y < lo - 10 * escala);
    if (cortes || lejos) {
      const m = (hi - lo || escala) * 0.15;
      rango = [Math.max(fin[0], lo - m), Math.min(fin[fin.length - 1], hi + m)];
    }
  }
  return { pts, cortes, rango };
}
/* Los valores de los parámetros, tal como los ve la fórmula. */
function valoresFunc(b) {
  const params = {};
  (b.params || []).forEach(p => { if (p && p.name) params[p.name] = +p.value; });
  return params;
}

/* ---------- construcción de series ---------- */
function chartSeries(b) {
  if (b.type === 'func') {
    const params = valoresFunc(b);
    const x0 = +b.xmin, x1 = +b.xmax;
    const out = [];
    let rango = null;
    (b.curves || []).forEach(cv => {
      const c = exprTry(cv.expr);
      if (!c || c.error) { out.push({ name: cv.name || cv.expr, pts: [], error: c ? c.error : 'fórmula vacía' }); return; }
      const v = Object.assign({}, params);
      const m = muestreaFunc(x => { v.x = x; return c.fn(v); }, x0, x1, b.logX);
      out.push({ name: cv.name || cv.expr, pts: m.pts, cortes: m.cortes, recortada: !!m.rango });
      /* El rango de todas las curvas: la que tiene polos aporta su parte
         normal; la que no, todo lo que dibuja. */
      const r = m.rango || (() => { const ys = m.pts.map(q => q[1]).filter(isFinite); return ys.length ? [Math.min(...ys), Math.max(...ys)] : null; })();
      if (r) rango = rango ? [Math.min(rango[0], r[0]), Math.max(rango[1], r[1])] : r;
    });
    if (out.some(s => s.recortada) && rango) out.rangoY = rango;
    return out;
  }
  const { headers, rows } = parseTable(b.data);
  const out = [];
  const ncol = headers.length;
  for (let j = 1; j < ncol; j++) {
    /* Una columna de error no es una serie: es la incertidumbre de la que
       viene delante, y se engancha como tercer número de cada punto. */
    if (out.length && esColumnaError(headers[j])) {
      const s = out[out.length - 1];
      if (!s.tieneError) {
        s.tieneError = true;
        s.pts.forEach(pt => { const e = rows[pt[3]][j]; if (isFinite(e) && e > 0) pt[2] = Math.abs(e); });
      }
      continue;
    }
    const pts = [];
    rows.forEach((r, i) => { if (isFinite(r[0]) && isFinite(r[j])) pts.push([r[0], r[j], NaN, i]); });
    if (pts.length) out.push({ name: headers[j], pts });
  }
  /* El índice de fila era andamio: un punto es (x, y) y, si la tiene, su barra. */
  out.forEach(s => { s.pts = s.pts.map(pt => isFinite(pt[2]) ? [pt[0], pt[1], pt[2]] : [pt[0], pt[1]]); });
  return out;
}

/* ---------- la escala de los ejes, decidida una sola vez ----------
   Qué eje va en logaritmo, qué punto cabe en él y en qué espacio se dibuja
   sale de aquí, y lo leen por igual la pantalla (`renderChart`) y el código
   pgfplots (`chartToPgf`). Es la misma regla que sostiene el montaje y las
   estructuras: una decisión que vive dos veces acaba divergiendo. */
function escalasChart(b, kind, offsetMode) {
  const logX = !!b.logX && kind !== 'barras';
  const logY = !!b.logY && kind !== 'barras' && !offsetMode;
  const eX = v => logX ? (v > 0 ? Math.log10(v) : NaN) : v;
  const eY = v => logY ? (v > 0 ? Math.log10(v) : NaN) : v;
  return {
    logX, logY, eX, eY,
    iX: t => logX ? Math.pow(10, t) : t,
    iY: t => logY ? Math.pow(10, t) : t,
    vale: pt => isFinite(eX(pt[0])) && isFinite(eY(pt[1]))
  };
}

/* ---------- render ---------- */
/* mode: 'edit' | 'thumb' | 'present' | 'export'  */
function chartAR(b) {
  if (isFinite(+b.ar) && +b.ar > 0) return +b.ar;
  if (b.hpx && b.wpx) return b.hpx / b.wpx;
  return 0.52;
}
/* availPx = ancho disponible en la diapositiva, en unidades de la propia
   diapositiva; así la gráfica se dibuja 1:1 y sus textos pesan igual que
   los del cuerpo. */
function renderChart(b, deck, mode, availPx) {
  const W = Math.round((availPx || 1188) * (b.w || 78) / 100);
  const H = Math.round(W * chartAR(b));
  const P = chartPalette(deck);
  const isFunc = b.type === 'func';
  const kind = isFunc ? 'linea' : (b.kind || 'linea');
  const interactive = mode === 'edit' || mode === 'present';
  const series = chartSeries(b);
  const err = series.find(s => s.error);

  const svg = sv('svg', {
    viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    xmlns: SVGNS, 'font-family': 'inherit', class: 'chart-svg',
    role: 'img', 'aria-label': b.title || 'Gráfica'
  });

  const FS = 19, FSL = 20;
  /* El margen izquierdo lo pide el rótulo de tick más largo; fijarlo en 72
     dejaba un pasillo vacío con «0,1» y apretaba el eje con «1,2×10⁻³». */
  let padL = 72;
  /* Rótulos de picos: posiciones medidas, no un dibujo aparte. Se reserva
     encima del marco una franja para los que van sobre un máximo y, dentro del
     eje, un hueco bajo el mínimo para los que van debajo (las bandas de un
     FTIR en transmitancia). Así no hace falta ensanchar el rango de los datos. */
  const FSP = 16, ALTO_PICO = FSP + 14;
  const picos = !isFunc && kind !== 'barras' && Array.isArray(b.picos)
    ? b.picos.filter(p => p && isFinite(+p.x) && isFinite(+p.y) && series[Math.floor(+p.serie) || 0]) : [];
  const picosArriba = picos.some(p => !p.abajo), huecoAbajo = picos.some(p => p.abajo) ? ALTO_PICO : 0;
  const padR = 26, padT = 16 + (picosArriba ? ALTO_PICO : 0);
  const padB = 48 + (series.length > 1 && !(kind === 'linea' && b.offset) && b.legend !== false ? 34 : 0);
  let iw = W - padL - padR, ih = H - padT - padB;

  /* desplazamiento vertical entre series (apilar espectros) */
  const offsetMode = !isFunc && kind === 'linea' && !!b.offset;
  /* Escala logarítmica. Un cero o un negativo no tienen logaritmo: en vez de
     inventarles uno se quedan fuera del dibujo, y el editor dice cuántos. En
     barras no cabe —la barra sale del cero— ni al apilar espectros, porque el
     desplazamiento se suma en el espacio que se ve. */
  const { logX, logY, eX, eY, vale } = escalasChart(b, kind, offsetMode);

  let allY = [], allX = [];
  /* Los extremos del eje tienen que abarcar la barra de error entera: si no,
     la incertidumbre se dibuja cortada, que es peor que no dibujarla. */
  const meteY = (y, e) => {
    if (isFinite(eY(y))) allY.push(y);
    if (isFinite(e) && e > 0 && isFinite(eY(y))) {
      allY.push(y + e);
      const bajo = y - e;
      allY.push(logY ? Math.max(bajo, y / 100) : bajo);
    }
  };
  const meteSerie = ss => ss.forEach(s => s.pts.forEach(pt => {
    if (!vale(pt)) return;
    allX.push(pt[0]); meteY(pt[1], pt[2]);
  }));
  meteSerie(series);
  /* Con un «después», los ejes abarcan los dos estados: así la comparación es
     honesta y el marco no salta al cambiar. */
  if (b.despues && b.despues.data && !isFunc) {
    meteSerie(chartSeries(Object.assign({}, b, { data: b.despues.data, despues: null })));
  }
  if (!allX.length) { allX = [0, 1]; allY = [0, 1]; }
  let yMinRaw = Math.min(...allY), yMaxRaw = Math.max(...allY);
  const spanY = (yMaxRaw - yMinRaw) || 1;
  const offStep = offsetMode ? spanY * (b.offsetPct == null ? 55 : b.offsetPct) / 100 : 0;
  const draw = series.map((s, i) => ({
    name: s.name, i, tieneError: !!s.tieneError,
    pts: s.pts.map(([x, y, e]) => [x, y + offStep * (series.length - 1 - i), e])
  }));
  let ys = [];
  draw.forEach(s => s.pts.forEach(([, y, e]) => {
    if (!isFinite(eY(y))) return;
    ys.push(y);
    if (isFinite(e) && e > 0) { ys.push(y + e); ys.push(logY ? Math.max(y - e, y / 100) : y - e); }
  }));
  if (b.despues && b.despues.data && !isFunc && !offsetMode) ys = ys.concat(allY.filter(v => isFinite(eY(v))));
  if (!ys.length) ys = logY ? [1, 10] : [0, 1];
  /* Una fórmula con polos propone su rango (muestreaFunc): sin eso, el valor
     que cae junto a la asíntota aplasta el resto de la curva contra el eje. */
  if (isFunc && series.rangoY && !logY) ys = series.rangoY.slice();

  let xmin = b.xminAuto === false && isFinite(+b.xmin0) ? +b.xmin0 : Math.min(...allX);
  let xmax = b.xminAuto === false && isFinite(+b.xmax0) ? +b.xmax0 : Math.max(...allX);
  if (isFunc) { xmin = +b.xmin; xmax = +b.xmax; }
  if (logX) { const r = rangoLog(Math.min(xmin, xmax), Math.max(xmin, xmax)); xmin = r[0]; xmax = r[1]; }
  if (b.xrev) { const t = xmin; xmin = xmax; xmax = t; }
  let ymin = Math.min(...ys), ymax = Math.max(...ys), pasoY = 0;
  if (b.yminAuto === false) { if (isFinite(+b.ymin0)) ymin = +b.ymin0; if (isFinite(+b.ymax0)) ymax = +b.ymax0; }
  /* En logarítmica el rango lo fijan las décadas, unas líneas más abajo:
     ensancharlo antes con el paso lineal lo dejaba corrido una década entera
     (con datos de 8 a 100 el eje salía de 10 a 1000). */
  else if (logY) { /* el rango log se ajusta abajo */ }
  else {
    /* Con un margen ciego del 8 % el último tick se quedaba por debajo del dato
       más alto y el máximo de la serie no se podía leer en el eje. Se redondea
       el rango a la marca siguiente: el eje termina justo en un tick, que ya
       hace de margen, y el extremo de los datos queda rotulado. */
    pasoY = niceTicks(ymin, ymax, 5).step;
    const y0 = Math.floor(ymin / pasoY + 1e-9) * pasoY;
    const y1 = Math.ceil(ymax / pasoY - 1e-9) * pasoY;
    ymin = y0 === ymin && y0 !== 0 ? y0 - pasoY : y0;
    ymax = y1 === ymax ? y1 + (kind === 'barras' ? 0 : pasoY) : y1;
    if (kind === 'barras') ymin = Math.min(0, ymin);
  }
  /* En escala logarítmica el rango se ajusta a décadas enteras, y un extremo
     no positivo puesto a mano se corrige en vez de romper el dibujo. */
  if (logY && (b.yminAuto !== false || !(ymin > 0) || !(ymax > ymin))) {
    const r = rangoLog(ymin, ymax); ymin = r[0]; ymax = r[1]; pasoY = 0;
  }
  /* Ejes fijados desde fuera: el antes/después y las capas necesitan que el
     marco no salte entre un estado y otro. */
  if (b._ejes) { if (isFinite(b._ejes.xmin)) xmin = b._ejes.xmin; if (isFinite(b._ejes.xmax)) xmax = b._ejes.xmax; if (isFinite(b._ejes.ymin)) ymin = b._ejes.ymin; if (isFinite(b._ejes.ymax)) ymax = b._ejes.ymax; }

  /* El FTIR se dibuja de mayor a menor número de onda: es la convención. */
  const invX = !!b.invertirX;
  /* Del dato al píxel, pasando por el espacio en que se dibuja: con escala
     lineal ese espacio es el dato mismo, y con logarítmica su logaritmo. */
  const pxDe = t => {
    const a = eX(xmin), z = eX(xmax), f = (t - a) / ((z - a) || 1);
    return invX ? padL + iw - f * iw : padL + f * iw;
  };
  const pyDe = t => padT + ih - huecoAbajo - (t - eY(ymin)) / ((eY(ymax) - eY(ymin)) || 1) * (ih - huecoAbajo);
  const sx = v => pxDe(eX(v));
  const sy = v => pyDe(eY(v));

  /* --- rejilla y ejes --- */
  const tx = logX ? ticksLog(Math.min(xmin, xmax), Math.max(xmin, xmax))
                 : niceTicks(Math.min(xmin, xmax), Math.max(xmin, xmax), 6);
  /* Con el rango ya redondeado se conserva el mismo paso: recalcularlo sobre
     el rango ensanchado dejaría la mitad de las marcas. */
  const ty = logY ? ticksLog(Math.min(ymin, ymax), Math.max(ymin, ymax))
    : pasoY ? { step: pasoY, ticks: (() => {
    const t = []; for (let v = Math.ceil(ymin / pasoY - 1e-9) * pasoY; v <= ymax + pasoY * 1e-9; v += pasoY) t.push(Math.abs(v) < pasoY * 1e-9 ? 0 : v);
    return t; })() } : niceTicks(ymin, ymax, 5);
  {
    const anchoTick = ty.ticks.reduce((m, v) => Math.max(m, anchoRotulo(rotuloTick(ty, v))), 1);
    padL = Math.round(clamp(26 + anchoTick * FS * 0.55, 46, 118));
    iw = W - padL - padR;
  }
  const g = sv('g');
  if (b.grid !== false) {
    ty.ticks.forEach(v => g.append(sv('line', { x1: padL, x2: padL + iw, y1: sy(v).toFixed(1), y2: sy(v).toFixed(1), stroke: P.grid, 'stroke-width': 1 })));
    tx.ticks.forEach(v => g.append(sv('line', { x1: sx(v).toFixed(1), x2: sx(v).toFixed(1), y1: padT, y2: padT + ih, stroke: P.grid, 'stroke-width': 1 })));
  }
  g.append(sv('line', { x1: padL, x2: padL + iw, y1: padT + ih, y2: padT + ih, stroke: P.axis, 'stroke-width': 1.4 }));
  g.append(sv('line', { x1: padL, x2: padL, y1: padT, y2: padT + ih, stroke: P.axis, 'stroke-width': 1.4 }));
  svg.append(g);

  const txt = (x, y, s, opt) => {
    const o = opt || {};
    const t = sv('text', {
      x, y, fill: o.fill || P.mut, 'font-size': o.size || FS,
      'text-anchor': o.anchor || 'middle', 'font-weight': o.weight || 400,
      transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null,
      'dominant-baseline': o.base || null
    });
    if (Array.isArray(s)) s.forEach(part => t.append(sv('tspan', { text: part.t, 'font-size': part.sup ? (o.size || FS) * 0.72 : null, dy: part.sup ? -(o.size || FS) * 0.42 : null })));
    else t.textContent = s;
    return t;
  };
  /* La barra de error. Va por debajo del marcador —el punto medido tiene que
     seguir siendo lo primero que se ve— y con topes, que es lo que la
     distingue de un trazo cualquiera. En escala logarítmica el brazo de abajo
     no puede cruzar el cero: se para en el borde del eje. */
  const barraError = (destino, x, y, e, col) => {
    if (!isFinite(e) || e <= 0 || !isFinite(sy(y))) return;
    const abajo = (logY && y - e <= 0) ? ymin : y - e;
    const X = sx(x), ya = sy(y + e), yb = sy(abajo);
    if (!isFinite(ya) || !isFinite(yb)) return;
    const w = 5;
    const g2 = sv('g', { stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' });
    g2.append(sv('line', { x1: X.toFixed(1), x2: X.toFixed(1), y1: ya.toFixed(1), y2: yb.toFixed(1) }));
    [ya, yb].forEach(Y => g2.append(sv('line', { x1: (X - w).toFixed(1), x2: (X + w).toFixed(1), y1: Y.toFixed(1), y2: Y.toFixed(1) })));
    destino.append(g2);
  };

  const ticksG = sv('g');
  tx.ticks.forEach(v => {
    const X = sx(v);
    if (X < padL - 2 || X > padL + iw + 2) return;
    ticksG.append(sv('line', { x1: X.toFixed(1), x2: X.toFixed(1), y1: padT + ih, y2: padT + ih + 6, stroke: P.axis, 'stroke-width': 1.4 }));
    ticksG.append(txt(X, padT + ih + 6 + FS, rotuloTick(tx, v)));
  });
  if (!offsetMode) ty.ticks.forEach(v => {
    const Y = sy(v);
    if (Y < padT - 2 || Y > padT + ih + 2) return;
    ticksG.append(sv('line', { x1: padL - 6, x2: padL, y1: Y.toFixed(1), y2: Y.toFixed(1), stroke: P.axis, 'stroke-width': 1.4 }));
    ticksG.append(txt(padL - 12, Y + FS * 0.34, rotuloTick(ty, v), { anchor: 'end' }));
  });
  else ticksG.append(txt(padL - 12, padT + ih * 0.5, mathToUnicode(b.yunit || 'u. a.'), { anchor: 'middle', rot: -90 }));
  svg.append(ticksG);


  /* --- marcas --- */
  const clip = 'clip' + (b.id || 'c') + '_' + (++_clipSeq);
  svg.append(sv('defs', null, sv('clipPath', { id: clip }, sv('rect', { x: padL - 2, y: padT - 6, width: iw + 4, height: ih + 8 }))));
  const plot = sv('g', { 'clip-path': `url(#${clip})` });
  const fits = [];
  /* Lo que lee un lector de pantalla: el pie y los ejes. */
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', (b.caption || b.title || 'Gráfica') + (b.xlabel ? '. Eje x: ' + mathToUnicode(b.xlabel) : '') + (b.ylabel ? '. Eje y: ' + mathToUnicode(b.ylabel) : '') + '. ' + draw.length + (draw.length === 1 ? ' serie' : ' series') + '.');
  /* Por capas: cada serie en su grupo, el ajuste en el suyo y el punto que se
     destaca al final; en la presentación se revelan una a una. */
  const porCapas = !!b.capas;
  const capas = [];
  const capaG = (nombre) => { const g = sv('g', { class: 'capa', 'data-capa': String(capas.length + 1), 'data-nombre': nombre }); capas.push(g); return g; };
  let gAjuste = null;
  /* Los rótulos de picos viven fuera del recorte del marco (van en la franja
     de encima). Por capas, cada serie es una capa sin recortar con sus datos
     recortados dentro, para que su rótulo entre con ella. */
  const capaSerie = [];

  draw.forEach((s, i) => {
    const col = P.series[i % P.series.length];
    const mk = MARKERS[i % MARKERS.length];
    const pts = s.pts.filter(vale);
    if (!pts.length) return;
    let destino = plot;
    if (porCapas) {
      capaSerie[i] = capaG(mathToUnicode(s.name));
      destino = sv('g', { 'clip-path': `url(#${clip})` });
      capaSerie[i].append(destino);
    }
    if (porCapas && kind === 'ajuste' && !gAjuste) gAjuste = sv('g', { class: 'capa', 'data-nombre': 'el ajuste' });
    const plotFit = porCapas && gAjuste ? gAjuste : destino;

    if (kind === 'barras') {
      const n = draw.length, slot = iw / Math.max(1, pts.length);
      const bw = Math.min(24, (slot / n) - 2 - (n > 1 ? 2 : 0));
      pts.forEach(([x, y, e]) => {
        const cx = sx(x) - (n * (bw + 2)) / 2 + i * (bw + 2) + bw / 2;
        const y0 = sy(Math.max(0, ymin)), y1 = sy(y);
        const hh = Math.abs(y0 - y1), top = Math.min(y0, y1), r = Math.min(4, bw / 2, hh);
        destino.append(sv('path', {
          d: `M${cx - bw / 2},${top + hh}v${-(hh - r)}a${r},${r} 0 0,1 ${r},${-r}h${bw - 2 * r}a${r},${r} 0 0,1 ${r},${r}v${hh - r}z`,
          fill: col
        }));
        /* Sobre la barra, la incertidumbre va en la tinta del texto: del color
           de la propia barra se perdería contra el relleno. */
        if (isFinite(e) && e > 0) {
          const ya = sy(y + e), yb = sy(logY && y - e <= 0 ? ymin : y - e);
          const g2 = sv('g', { stroke: P.ink, 'stroke-width': 1.5, 'stroke-linecap': 'round', fill: 'none' });
          g2.append(sv('line', { x1: cx.toFixed(1), x2: cx.toFixed(1), y1: ya.toFixed(1), y2: yb.toFixed(1) }));
          [ya, yb].forEach(Y => g2.append(sv('line', { x1: (cx - Math.min(6, bw / 2)).toFixed(1), x2: (cx + Math.min(6, bw / 2)).toFixed(1), y1: Y.toFixed(1), y2: Y.toFixed(1) })));
          destino.append(g2);
        }
      });
      return;
    }

    const d = [];
    let pen = false;
    s.pts.forEach(pt => {
      if (!vale(pt)) { pen = false; return; }
      d.push((pen ? 'L' : 'M') + sx(pt[0]).toFixed(1) + ',' + sy(pt[1]).toFixed(1));
      pen = true;
    });

    if (kind === 'linea') {
      const path = sv('path', { d: d.join(''), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      if (b.anim === 'draw' && (mode === 'present' || mode === 'edit')) path.classList.add('chart-draw');
      destino.append(path);
      /* Una curva sin puntos no deja ver dónde se midió. Con pocos datos son
         mediciones y se marcan; con muchos es un registro continuo y estorban.
         La casilla «Marcar los puntos» decide cuando el usuario quiere otra cosa. */
      pts.forEach(([x, y, e]) => barraError(destino, x, y, e, col));
      if (b.puntos == null ? (pts.length <= 30 || s.tieneError) : !!b.puntos) {
        pts.forEach(([x, y]) => destino.append(sv('path',
          { d: markerPath(mk, sx(x), sy(y), 5), fill: col, stroke: P.surface, 'stroke-width': 2 })));
      }
      if (b.area) {
        const base = sy(Math.max(ymin, Math.min(0, ymax)));
        destino.append(sv('path', { d: d.join('') + `L${sx(pts[pts.length - 1][0]).toFixed(1)},${base}L${sx(pts[0][0]).toFixed(1)},${base}z`, fill: col, opacity: 0.1 }));
      }
      if (offsetMode) {
        /* El nombre va al final de la curva en pantalla, que con el eje
           invertido (FTIR) es el primer punto de los datos y no el último. */
        const last = pts.reduce((a, q) => sx(q[0]) > sx(a[0]) ? q : a);
        destino.append(txt(sx(last[0]) - 8, sy(last[1]) - 10, mathToUnicode(s.name), { anchor: 'end', fill: P.ink, size: FS }));
      }
    } else {
      if (kind === 'ajuste') {
        /* El ajuste se hace en el espacio que se ve. Con el eje y en log, la
           recta que el químico busca es la de log y frente a x —la
           linealización de siempre—, y así además sale recta en el dibujo en
           vez de curvarse; con los dos ejes lineales, esto es el ajuste de
           siempre, número por número. */
        const enEje = pts.map(pt => [eX(pt[0]), eY(pt[1])]);
        const f = (typeof linFitSE === 'function' ? linFitSE(enEje) : null) || linFit(enEje);
        if (f) {
          fits.push({ f, col, name: s.name, logX, logY });
          const ta = eX(Math.min(xmin, xmax)), tb = eX(Math.max(xmin, xmax));
          plotFit.append(sv('line', {
            x1: pxDe(ta).toFixed(1), y1: pyDe(f.m * ta + f.b).toFixed(1),
            x2: pxDe(tb).toFixed(1), y2: pyDe(f.m * tb + f.b).toFixed(1),
            stroke: col, 'stroke-width': 2, opacity: .85
          }));
        }
      }
      pts.forEach(([x, y, e]) => barraError(destino, x, y, e, col));
      pts.forEach(([x, y]) => {
        destino.append(sv('path', { d: markerPath(mk, sx(x), sy(y), 5.5), fill: col, stroke: P.surface, 'stroke-width': 2 }));
      });
    }
  });
  /* Rótulos de los picos, de izquierda a derecha: el que choca con el anterior
     sube (o baja) un renglón en vez de taparlo. Por capas, cada rótulo entra
     con su serie. */
  const puestos = [], gPicos = sv('g');
  /* _picosHueco (el «después» de un antes/después): mismo hueco, sin rótulos. */
  (b._picosHueco ? [] : picos).map(p => ({ p, si: Math.floor(+p.serie) || 0 })).filter(q => draw[q.si])
    .map(q => Object.assign(q, { y: +q.p.y + offStep * (draw.length - 1 - q.si) }))
    .filter(q => vale([+q.p.x, q.y]))
    .map(q => Object.assign(q, { X: sx(+q.p.x), Y: sy(q.y) }))
    .filter(q => q.X >= padL - 1 && q.X <= padL + iw + 1)
    .sort((a, c) => a.X - c.X)
    .forEach(q => {
      const t = mathToUnicode(q.p.txt), abajo = !!q.p.abajo;
      const w = t.length * FSP * 0.56 + 6;
      let base = abajo ? q.Y + 10 + FSP : q.Y - 10;
      for (let k = 0; k < 4 && puestos.some(r => Math.abs(r.X - q.X) < (r.w + w) / 2 && Math.abs(r.base - base) < FSP + 2); k++)
        base += abajo ? FSP + 2 : -(FSP + 2);
      /* Por abajo no se pasa del eje x, donde están los números. */
      base = clamp(base, FSP, abajo ? padT + ih - 3 : H - 4);
      puestos.push({ X: q.X, w, base });
      const col = P.series[q.si % P.series.length];
      const g = sv('g', { class: 'pico' });
      g.append(sv('line', { x1: q.X.toFixed(1), x2: q.X.toFixed(1), y1: (q.Y + (abajo ? 3 : -3)).toFixed(1),
        y2: (abajo ? base - FSP + 2 : base + 3).toFixed(1), stroke: col, 'stroke-width': 1.2 }));
      /* El texto no se sale por los lados del marco aunque el pico esté en
         el borde, y lleva un halo del color del fondo para leerse sobre otra
         curva (con espectros apilados, la de arriba pasa por encima). */
      if (t) {
        const et = txt(clamp(q.X, padL + w / 2, padL + iw - w / 2), base, t, { fill: P.ink, size: FSP });
        et.setAttribute('stroke', P.surface); et.setAttribute('stroke-width', 4);
        et.setAttribute('paint-order', 'stroke'); et.setAttribute('stroke-linejoin', 'round');
        g.append(et);
      }
      (capaSerie[q.si] || gPicos).append(g);
    });
  if (porCapas) {
    /* Mismo orden en el documento que antes: las series, el ajuste y el
       punto destacado; así se numeran los pasos al presentar. */
    capas.forEach(g => svg.append(g));
    if (gAjuste) { gAjuste.dataset.capa = String(capas.length + 1); capas.push(gAjuste); plot.append(gAjuste); }
    /* el punto que importa: un anillo del color de acento y su etiqueta */
    const d = b.destaca;
    if (d && draw[d.serie] && draw[d.serie].pts[d.i] && isFinite(draw[d.serie].pts[d.i][1])) {
      const [x, y] = draw[d.serie].pts[d.i];
      const g = sv('g', { class: 'capa capa-destaca', 'data-capa': String(capas.length + 1), 'data-nombre': 'lo que importa' });
      g.append(sv('circle', { cx: sx(x).toFixed(1), cy: sy(y).toFixed(1), r: 11, fill: 'none', stroke: P.accent || '#C0392B', 'stroke-width': 3 }));
      /* el rótulo se pone del lado donde cabe */
      const derecha = sx(x) < padL + iw * 0.68;
      if (d.txt) g.append(txt(sx(x) + (derecha ? 16 : -16), sy(y) - 12, d.txt, { anchor: derecha ? 'start' : 'end', fill: P.accent || '#C0392B', size: FS, weight: 600 }));
      capas.push(g); plot.append(g);
    }
    svg.dataset.capas = String(capas.length);
  }
  svg.append(plot, gPicos);


  /* leyenda */
  if (draw.length > 1 && !offsetMode && b.legend !== false) {
    const y = H - 16;
    const items = draw.map((s, i) => ({ n: mathToUnicode(s.name), c: P.series[i % P.series.length], m: MARKERS[i % MARKERS.length] }));
    /* El ancho de cada entrada se estima por caracteres; con 0.52 los nombres
       largos («Pseudo-1.er orden») se montaban sobre la raya de la siguiente. */
    const wEst = items.map(it => String(it.n).length * FS * 0.58 + 52);
    let total = wEst.reduce((a, c) => a + c, 0);
    let x = padL + Math.max(0, (iw - total) / 2);
    items.forEach((it, i) => {
      if (kind === 'linea' || kind === 'ajuste') svg.append(sv('line', { x1: x, x2: x + 24, y1: y - 6, y2: y - 6, stroke: it.c, 'stroke-width': 3, 'stroke-linecap': 'round' }));
      if (kind !== 'linea') svg.append(sv('path', { d: markerPath(it.m, x + 12, y - 6, 5.5), fill: it.c, stroke: P.surface, 'stroke-width': 2 }));
      if (kind === 'barras') svg.append(sv('rect', { x: x + 4, y: y - 13, width: 16, height: 14, rx: 3, fill: it.c }));
      svg.append(txt(x + 32, y, mathToUnicode(it.n), { anchor: 'start', fill: P.ink, size: FS }));
      x += wEst[i];
    });
  }

  /* capa de lectura: cruz + valor al pasar el cursor */
  if (interactive && kind !== 'barras' && draw.length) {
    const hov = sv('g', { opacity: 0, 'pointer-events': 'none' });
    const vline = sv('line', { y1: padT, y2: padT + ih, stroke: P.axis, 'stroke-width': 1 });
    const dot = sv('circle', { r: 6, fill: P.ink, stroke: P.surface, 'stroke-width': 2 });
    const lbl = sv('text', { 'font-size': FS, fill: P.ink, 'text-anchor': 'middle', 'font-weight': 600 });
    const bg = sv('rect', { rx: 6, fill: P.surface, opacity: .92 });
    hov.append(vline, bg, dot, lbl);
    svg.append(hov);
    svg.style.pointerEvents = 'all';
    svg.addEventListener('mousemove', ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * W;
      if (px < padL || px > padL + iw) { hov.setAttribute('opacity', 0); return; }
      /* Del píxel al dato por el mismo camino que al dibujar: con el eje
         en logaritmo (o invertido) la interpolación lineal señalaba otro x. */
      const fr = (px - padL) / iw, fx = invX ? 1 - fr : fr;
      const xv = logX ? Math.pow(10, eX(xmin) + fx * (eX(xmax) - eX(xmin))) : xmin + fx * (xmax - xmin);
      let best = null;
      draw.forEach((s, i) => s.pts.forEach(pt => {
        if (!isFinite(pt[1])) return;
        const dd = Math.abs(pt[0] - xv);
        if (!best || dd < best.d) best = { d: dd, pt, i, name: s.name };
      }));
      if (!best) return;
      const X = sx(best.pt[0]), Y = sy(best.pt[1]);
      vline.setAttribute('x1', X); vline.setAttribute('x2', X);
      dot.setAttribute('cx', X); dot.setAttribute('cy', Y);
      dot.setAttribute('fill', P.series[best.i % P.series.length]);
      const raw = offsetMode ? best.pt[1] - offStep * (draw.length - 1 - best.i) : best.pt[1];
      lbl.textContent = `${sigFig(best.pt[0], 4)} ; ${sigFig(raw, 4)}`;
      const ly = Math.max(padT + FS, Y - 18);
      lbl.setAttribute('x', clamp(X, padL + 60, padL + iw - 60)); lbl.setAttribute('y', ly);
      const bw = lbl.textContent.length * FS * 0.55 + 16;
      bg.setAttribute('x', clamp(X, padL + 60, padL + iw - 60) - bw / 2);
      bg.setAttribute('y', ly - FS);
      bg.setAttribute('width', bw); bg.setAttribute('height', FS + 10);
      hov.setAttribute('opacity', 1);
    });
    svg.addEventListener('mouseleave', () => hov.setAttribute('opacity', 0));
  }

  if (err) {
    svg.append(sv('rect', { x: padL, y: padT, width: iw, height: ih, fill: P.surface, opacity: .82 }));
    svg.append(txt(padL + iw / 2, padT + ih / 2, 'Revisa la fórmula: ' + err.error, { fill: '#C0392B', size: FS }));
  }
  svg.classList.add('ch-svg');

  /* Los títulos van en HTML para que las matemáticas se compongan con KaTeX. */
  const box = h('div', { class: 'chart-box' });
  if (b.title) box.append(h('div', { class: 'ch-title', html: inlineRich(b.title) }));
  if (kind === 'ajuste' && fits.length && b.showFit !== false) {
    box.append(h('div', { class: 'ch-fit' }, fits.slice(0, 3).map((ft, i) => h('div', {
      html: (fits.length > 1 ? esc(mathToUnicode(ft.name)) + ': ' : '') +
        inlineRich(`$${ft.logY ? '\\log_{10} y' : 'y'} = ${sigFig(ft.f.m, 4)}\\,${ft.logX ? '\\log_{10} x' : 'x'} ${ft.f.b < 0 ? '-' : '+'} ${sigFig(Math.abs(ft.f.b), 4)}$`) +
        ' &nbsp;·&nbsp; ' + inlineRich(`$R^2 = ${ft.f.r2.toFixed(4)}$`) +
        /* La pendiente con su error es lo que se reporta en un artículo. */
        (b.conError !== false && ft.f.sm != null
          ? '<span class="ch-err">' + inlineRich(`$m = ${conError(ft.f.m, ft.f.sm)}$`) + '</span>' : '')
    }))));
  }
  if (b.ylabel) box.append(h('div', { class: 'ch-ylab' }, h('span', { html: inlineRich(b.ylabel) })));
  else box.append(h('div', { class: 'ch-ylab' }));
  box.append(svg);
  box.append(h('div', { class: 'ch-xlab', html: b.xlabel ? inlineRich(b.xlabel) : '' }));
  return box;
}


/* ---------- deslizadores en vivo ---------- */
/* Un parámetro que abarca décadas (el factor preexponencial de Arrhenius, de
   10⁸ a 10¹²) no se puede mover con un deslizador lineal: el valor típico
   queda pegado al extremo izquierdo. Con «log» el recorrido se reparte por
   décadas. Solo tiene sentido si los dos extremos son positivos. */
const paramLog = pr => !!pr.log && +pr.min > 0 && +pr.max > +pr.min;
const PASOS_LOG = 1000;
function posDeslizador(pr) {
  if (!paramLog(pr)) return pr.value;
  const a = Math.log10(pr.min), z = Math.log10(pr.max), v = Math.log10(Math.max(pr.min, Math.min(pr.max, pr.value)));
  return Math.round((v - a) / (z - a) * PASOS_LOG);
}
function valorDeslizador(pr, pos) {
  if (!paramLog(pr)) return +pos;
  const a = Math.log10(pr.min), z = Math.log10(pr.max);
  /* Tres cifras significativas: lo que se lee en la etiqueta es lo que queda. */
  return +Math.pow(10, a + (z - a) * pos / PASOS_LOG).toPrecision(3);
}
/* Un paso redondo que dé unas doscientas posiciones al deslizador: 1, 2 o 5
   por una potencia de diez, como los ticks. */
function pasoParam(min, max) {
  const span = Math.abs(+max - +min);
  if (!(span > 0) || !isFinite(span)) return 0.1;
  const raw = span / 200, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
  return +((n <= 1 + 1e-9 ? 1 : n <= 2 + 1e-9 ? 2 : n <= 5 + 1e-9 ? 5 : 10) * mag).toPrecision(1);
}
/* Al cambiar el recorrido se conserva el paso si sigue dando un número
   razonable de posiciones: el orden de una reflexión va de uno en uno y no
   debe volverse 0.01 por ensanchar el intervalo. */
function pasoConservado(step, min, max) {
  const n = Math.abs(+max - +min) / +step;
  const discreto = n >= 2 && n <= 2000 && Math.abs(n - Math.round(n)) < 1e-6;
  return step > 0 && ((n >= 10 && n <= 2000) || discreto) ? step : pasoParam(min, max);
}
/* El valor con su unidad, para la etiqueta y para el lector de pantalla. */
const textoParam = pr => fmtParam(pr.value) + (pr.unit ? ' ' + mathToUnicode(pr.unit) : '');
function buildSliders(b, holder, deck, mode, availPx) {
  /* Con tres parámetros o más, deslizadores más cortos: si no, la fila no
     cabe y el último se sale de la diapositiva. */
  const bar = h('div', { class: 'sliders' + (mode === 'present' ? ' pres' : '') + ((b.params || []).length >= 3 ? ' muchos' : '') });
  const redraw = deb(() => {
    holder.innerHTML = '';
    holder.append(renderChart(b, deck, mode, availPx));
  }, 16);
  /* Los valores con que se abrió la diapositiva: a ellos vuelve «↺». */
  const iniciales = (b.params || []).map(pr => pr.value);
  const filas = [];
  (b.params || []).forEach(pr => {
    const val = h('span', { class: 'sl-val' }, fmtParam(pr.value));
    const inp = h('input', {
      type: 'range', min: paramLog(pr) ? 0 : pr.min, max: paramLog(pr) ? PASOS_LOG : pr.max,
      step: paramLog(pr) ? 1 : pr.step, value: posDeslizador(pr),
      'aria-label': (pr.d || pr.name) + (pr.unit ? ' (' + mathToUnicode(pr.unit) + ')' : ''),
      'aria-valuetext': textoParam(pr),
      oninput: e => {
        pr.value = valorDeslizador(pr, e.target.value);
        val.textContent = fmtParam(pr.value);
        e.target.setAttribute('aria-valuetext', textoParam(pr));
        redraw();
      }
    });
    filas.push({ pr, inp, val });
    bar.append(h('label', { class: 'sl', title: pr.d || null },
      h('span', { class: 'sl-name', html: inlineRich('$' + (pr.tex || texParam(pr.name)) + '$') }),
      inp, val, pr.unit ? h('span', { class: 'sl-unit', html: inlineRich(pr.unit) }) : null));
  });
  bar.append(h('button', {
    class: 'sl-reset', type: 'button', title: 'Volver a los valores iniciales', 'aria-label': 'Volver a los valores iniciales',
    onclick: () => {
      filas.forEach(({ pr, inp, val }, i) => {
        pr.value = iniciales[i]; inp.value = posDeslizador(pr);
        val.textContent = fmtParam(pr.value); inp.setAttribute('aria-valuetext', textoParam(pr));
      });
      redraw();
    }
  }, '↺'));
  if (mode === 'present') bar.addEventListener('click', e => e.stopPropagation());
  return bar;
}
function fmtParam(v) {
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e4 || a < 1e-3) { const ex = Math.floor(Math.log10(a)); return (v / Math.pow(10, ex)).toFixed(1) + '\u00d710' + supDigits(ex); }
  return String(Math.round(v * 1e4) / 1e4);
}
function supDigits(n) {
  const map = { '-': '\u207b', 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079' };
  return String(n).split('').map(c => map[c] || c).join('');
}
/* nombres tipo Ea, x0, C0 se ven mejor con subíndice; theta, lam o eps, en
   griego. Un parámetro puede traer su propio «tex» y entonces manda ese. */
const GRIEGO_PARAM = { alpha: 1, beta: 1, gamma: 1, delta: 1, epsilon: 1, zeta: 1, eta: 1, theta: 1, kappa: 1, lambda: 1,
  mu: 1, nu: 1, xi: 1, rho: 1, sigma: 1, tau: 1, phi: 1, chi: 1, psi: 1, omega: 1,
  Gamma: 1, Delta: 1, Theta: 1, Lambda: 1, Xi: 1, Sigma: 1, Phi: 1, Psi: 1, Omega: 1,
  lam: 'lambda', eps: 'varepsilon' };
function texParam(name) {
  const griego = w => GRIEGO_PARAM[w] ? '\\' + (GRIEGO_PARAM[w] === 1 ? w : GRIEGO_PARAM[w]) : null;
  const sub = /^([A-Za-z]+)_([A-Za-z0-9]+)$/.exec(name);
  if (sub) return (griego(sub[1]) || (sub[1].length > 1 ? '\\mathrm{' + sub[1] + '}' : sub[1])) + '_{\\mathrm{' + sub[2] + '}}';
  const m = /^([A-Za-z]+)([A-Za-z0-9]*)$/.exec(name);
  if (!m) return name;
  const g = griego(m[1]);
  if (m[2]) return (g || m[1]) + '_{' + m[2] + '}';
  if (g) return g;
  if (m[1].length > 1) return '\\mathrm{' + m[1] + '}';
  return m[1];
}


