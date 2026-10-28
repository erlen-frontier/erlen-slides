// SPDX-License-Identifier: AGPL-3.0-only
// Drawing adapter for the preserved Slides catalogue and SVG renderer.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hex2rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const rgb2hex=rgb=>'#'+rgb.map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0')).join('');
function sv(tag,attrs={},...children){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);el.append(...children);return el;}
/* ==== 47-lab.js ==== */
'use strict';
/* ================= material de laboratorio =================
   Dibujos vectoriales de vidrio y equipo para armar el diagrama de un montaje
   o de una ruta experimental. Cada pieza vive en una caja de 100 × 140 y se
   dibuja con trazos, así que hereda el color del tema y no se pixela nunca. */

/* Ayudas de dibujo: d() arma un path, y las piezas devuelven una lista de
   figuras {t:'p'|'l'|'c'|'r'|'e', ...} que se convierten a SVG o a TikZ. */
const P_ = (...seg) => ({ t: 'p', d: seg.join(' ') });
const L_ = (x1, y1, x2, y2) => ({ t: 'l', x1, y1, x2, y2 });
const C_ = (cx, cy, r) => ({ t: 'c', cx, cy, r });
const R_ = (x, y, w, h, rx) => ({ t: 'r', x, y, w, h, rx: rx || 0 });
const E_ = (cx, cy, rx, ry) => ({ t: 'e', cx, cy, rx, ry });
const F_ = fig => Object.assign({}, fig, { fill: true });     // relleno (líquido)

/* nivel de líquido: se dibuja como una figura rellena tenue */
const LIQ = fig => Object.assign({}, fig, { pap: 'liq' });
/* Papel de cada trazo: de él dependen el grosor, el relleno y si se dibuja
   o no en cada estilo. Es lo que separa un dibujo plano de uno con cuerpo. */
const V_ = fig => Object.assign({}, fig, { pap: 'vidrio' });   // cuerpo de vidrio
const S_ = fig => Object.assign({}, fig, { pap: 'solido' });   // carcasa de un equipo
const D_ = fig => Object.assign({}, fig, { pap: 'detalle' });  // marcas finas
const B_ = fig => Object.assign({}, fig, { pap: 'brillo' });   // reflejo del vidrio
const G_ = fig => Object.assign({}, fig, { pap: 'sombra' });   // sombra de apoyo
const M_ = fig => Object.assign({}, fig, { pap: 'metal' });    // pinzas, soportes
const A_ = fig => Object.assign({}, fig, { pap: 'acento' });   // rayo, señal, flecha en color
const N_ = fig => Object.assign({}, fig, { pap: 'fina' });     // marca fina suelta (fuera del cuerpo)

/* ---- ayudantes para lo que se repite ----
   Cuando una pieza necesita el mismo trazo diez veces, escribirlo diez veces
   solo invita a que el décimo salga descuadrado. Estos generan lo repetido a
   partir de una tabla escrita en el fuente: nunca de Math.random, porque el
   mismo dibujo tiene que salir idéntico en pantalla, en TikZ y en el PPTX. */

/* Una cinta: la misma curva serpenteante de ida y de vuelta, separada w en
   horizontal y cerrada en lazo. Es lo que convierte un alambre en un cuerpo.
   v se lee [x,y, cx,cy, x,y, cx,cy, x,y, …]: una M y luego tantas Q como haga falta. */
const cintaQ = (v, w) => {
  const n = v.length;
  let d = 'M' + (v[0] + w) + ' ' + v[1];
  for (let i = 2; i < n; i += 4) d += ' Q' + (v[i] + w) + ' ' + v[i + 1] + ' ' + (v[i + 2] + w) + ' ' + v[i + 3];
  d += ' L' + (v[n - 2] - w) + ' ' + v[n - 1];
  for (let i = n - 4; i >= 2; i -= 4) d += ' Q' + (v[i] - w) + ' ' + v[i + 1] + ' ' + (v[i - 2] - w) + ' ' + v[i - 1];
  return P_(d + ' Z');
};
/* La hebra gemela: el mismo trazado reflejado en el eje de la caja. */
const espejoQ = v => v.map((c, i) => i % 2 ? c : 100 - c);

/* Una malla de panal: el grafeno, el poro de una zeolita y la reja de un MOF
   son el mismo hexágono repetido. Se genera de la tabla de filas y columnas,
   con las coordenadas redondeadas, para que el dibujo salga idéntico en
   pantalla, en TikZ y en el PPTX. */
const redondo = v => Math.round(v * 100) / 100;
const hexD = (cx, cy, r) => {
  const a = redondo(r * 0.866), b = redondo(r / 2), x = redondo(cx), y = redondo(cy);
  return 'M' + x + ' ' + redondo(y - r) + ' L' + redondo(x + a) + ' ' + redondo(y - b) +
    ' L' + redondo(x + a) + ' ' + redondo(y + b) + ' L' + x + ' ' + redondo(y + r) +
    ' L' + redondo(x - a) + ' ' + redondo(y + b) + ' L' + redondo(x - a) + ' ' + redondo(y - b) + ' Z';
};
/* cols × rows hexágonos desde (x0,y0); sx inclina la malla para darle perspectiva. */
const panal = (x0, y0, cols, rows, r, sx) => {
  const a = r * 0.866, d = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
    d.push(hexD(x0 + i * r * 1.5 + j * sx, y0 + j * a * 2 + (i % 2 ? a : 0), r));
  return d.join(' ');
};

/* Un fosfolípido: cabeza polar y sus dos colas. s dice hacia dónde cuelgan. */
const lipido = (x, y, s) => [
  S_(C_(x, y, 4.6)),
  N_(P_('M' + (x - 2) + ' ' + (y + 4.6 * s) + ' Q' + (x - 3.6) + ' ' + (y + 11 * s) + ' ' + (x - 2.2) + ' ' + (y + 20 * s) +
    ' M' + (x + 2) + ' ' + (y + 4.6 * s) + ' Q' + (x + 3.6) + ' ' + (y + 11 * s) + ' ' + (x + 2.2) + ' ' + (y + 20 * s)))];
const monocapa = (xs, y, s) => xs.reduce((a, x) => a.concat(lipido(x, y, s)), []);

/* Espículas de un virus: mango y cabeza. El paso lo fija la tabla de ángulos,
   no el azar; por eso los ocho radios cada 45° dejan de parecer una rueda. */
const espiculas = (cx, cy, r0, r1, ang) => {
  const red = n => Math.round(n * 10) / 10;
  const en = (a, r) => [red(cx + r * Math.cos(a * Math.PI / 180)), red(cy + r * Math.sin(a * Math.PI / 180))];
  const mangos = ang.map(a => { const p = en(a, r0), q = en(a, r1); return 'M' + p[0] + ' ' + p[1] + ' L' + q[0] + ' ' + q[1]; });
  return [N_(P_(mangos.join(' ')))].concat(ang.map(a => { const p = en(a, r1 + 2.4); return M_(C_(p[0], p[1], 2.6)); }));
};

/* El esqueleto de una hebra de ADN. Los cruces caen a 20, 40, 68, 88 y 116:
   los huecos se alternan corto (20) y largo (28), y de esa desigualdad salen
   el surco menor y el mayor. La otra hebra es este mismo trazado en espejo. */
/* Un engranaje de n dientes trapezoidales alrededor de (cx, cy): radio de fondo r y
   altura de diente h. Los vértices salen de una cuenta, redondeados, como la malla. */
const engrane = (cx, cy, r, n, h, fase) => {
  const pasoA = 2 * Math.PI / n, pt = (rr, a) => redondo(cx + rr * Math.cos(a)) + ' ' + redondo(cy + rr * Math.sin(a)), d = [];
  for (let i = 0; i < n; i++) {
    const a = (fase || 0) + i * pasoA;
    d.push((i ? 'L' : 'M') + pt(r, a), 'L' + pt(r + h, a + pasoA * 0.15), 'L' + pt(r + h, a + pasoA * 0.45), 'L' + pt(r, a + pasoA * 0.6));
  }
  return P_(d.join(' ') + ' Z');
};

const ADN_HEBRA = [36, 12, 44, 15, 50, 20, 82, 30, 50, 40, 18, 54, 50, 68, 82, 78, 50, 88, 18, 102, 50, 116, 58, 121, 64, 124];

/* Una lámina de un hidróxido laminar vista en proyección oblicua: el canto de
   delante, la cara de arriba y el costado, desde la esquina (x0, y0) con largo w,
   grosor h y fondo (dx, dy). En el canto, el zigzag son los octaedros que comparten
   aristas; cada tercer hueco lleva el catión trivalente en el color del líquido,
   que es la proporción M²⁺:M³⁺ = 2:1 de una hidrotalcita típica. Todo sale de
   una cuenta fija, así que el dibujo es idéntico en pantalla, en PDF y en TikZ. */
const laminaHDL = (x0, y0, w, h, dx, dy, n) => {
  const r = redondo, x1 = x0 + w, paso = w / n, zig = [], m3 = [];
  for (let i = 0; i <= n; i++) zig.push((i ? ' L' : 'M') + r(x0 + i * paso) + ' ' + (i % 2 ? y0 : y0 + h));
  for (let i = 1; i < n; i += 3) m3.push(LIQ(C_(r(x0 + i * paso), r(y0 + h * 0.62), r(Math.min(2.4, paso * 0.34)))));
  const top = 'M' + x0 + ' ' + y0 + ' L' + r(x0 + dx) + ' ' + r(y0 + dy) + ' L' + r(x1 + dx) + ' ' + r(y0 + dy) + ' L' + x1 + ' ' + y0 + ' Z';
  const lado = 'M' + x1 + ' ' + y0 + ' L' + r(x1 + dx) + ' ' + r(y0 + dy) + ' L' + r(x1 + dx) + ' ' + r(y0 + dy + h) + ' L' + x1 + ' ' + (y0 + h) + ' Z';
  return [
    S_(R_(x0, y0, w, h, 0)), S_(P_(top)), S_(P_(lado)),
    D_(P_(zig.join(''))), ...m3];
};
/* Un anión carbonato plano (triángulo) y una molécula de agua, para la galería. */
const carbonato = (x, y, s) => A_(P_('M' + redondo(x - s) + ' ' + redondo(y + s * 0.58) + ' L' + redondo(x + s) + ' ' + redondo(y + s * 0.58) +
  ' L' + x + ' ' + redondo(y - s * 1.15) + ' Z'));
const agua = (x, y) => [N_(C_(x, y, 2.4)), N_(P_('M' + redondo(x - 1.6) + ' ' + redondo(y + 1.8) + ' L' + redondo(x - 3.4) + ' ' + redondo(y + 4.4) +
  ' M' + redondo(x + 1.6) + ' ' + redondo(y + 1.8) + ' L' + redondo(x + 3.4) + ' ' + redondo(y + 4.4)))];
/* La red de cationes de una lámina tipo brucita vista desde arriba, en oblicuo:
   una red triangular de n × n con base a = (ax, 0) y b = (bx, by). El catión
   trivalente ocupa uno de cada tres nudos en el orden √3 × √3 de una lámina
   con M²⁺:M³⁺ = 2:1; los demás son divalentes. */
const redBrucita = (x0, y0, ax, bx, by, n) => {
  const r = redondo, p = (u, v) => [r(x0 + u * ax + v * bx), r(y0 + v * by)], d = [], nodos = [];
  for (let v = 0; v <= n; v++) { const a = p(0, v), b = p(n, v); d.push('M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1]); }
  for (let u = 0; u <= n; u++) { const a = p(u, 0), b = p(u, n); d.push('M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1]); }
  for (let k = 1; k < 2 * n; k++) {
    const u0 = Math.min(k, n), v0 = k - u0, u1 = k - Math.min(k, n), v1 = Math.min(k, n);
    const a = p(u0, v0), b = p(u1, v1); d.push('M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1]);
  }
  for (let v = 0; v <= n; v++) for (let u = 0; u <= n; u++) {
    const [x, y] = p(u, v);
    nodos.push((u - v + 3 * n) % 3 === 0 ? LIQ(C_(x, y, 3.2)) : M_(C_(x, y, 2.3)));
  }
  return [D_(P_(d.join(' '))), ...nodos];
};

const LAB = [
  /* ---------- vidrio ----------
     Cada pieza se arma con un cuerpo cerrado (para poder rellenarlo), sus
     marcas finas aparte, un reflejo y la sombra de apoyo. */
  { id: 'vaso', n: 'Vaso de precipitados', grp: 'vidrio', fig: [
    G_(E_(50, 127, 30, 4)),
    V_(P_('M24 36 L24 116 Q24 126 34 126 L66 126 Q76 126 76 116 L76 36 Z')),
    LIQ(P_('M25 74 Q50 79 75 74 L75 116 Q75 125 66 125 L34 125 Q25 125 25 116 Z')),
    P_('M24 36 L24 116 Q24 126 34 126 L66 126 Q76 126 76 116 L76 36'),
    P_('M18 36 Q26 32 34 36'), L_(34, 36, 76, 36), P_('M76 36 Q84 39 88 45'),
    D_(P_('M28 60 L38 60 M28 74 L38 74 M28 88 L38 88 M28 102 L38 102')),
    D_(P_('M25 74 Q50 79 75 74')),
    B_(P_('M33 46 L33 108'))] },

  { id: 'erlenmeyer', n: 'Matraz Erlenmeyer', grp: 'vidrio', fig: [
    G_(E_(50, 127, 31, 4)),
    V_(P_('M41 24 L41 56 L19 116 Q17 126 26 126 L74 126 Q83 126 81 116 L59 56 L59 24 Z')),
    LIQ(P_('M29 96 Q50 101 71 96 L79 118 Q80 125 74 125 L26 125 Q20 125 21 118 Z')),
    P_('M41 24 L41 56 L19 116 Q17 126 26 126 L74 126 Q83 126 81 116 L59 56 L59 24'),
    P_('M37 21 Q50 17 63 21'), L_(38, 24, 62, 24),
    D_(P_('M29 96 Q50 101 71 96')), D_(P_('M41 40 L59 40')),
    B_(P_('M46 30 L46 54 L30 100'))] },

  { id: 'balon', n: 'Matraz de fondo redondo', grp: 'vidrio', fig: [
    G_(E_(50, 127, 26, 4)),
    V_(P_('M42 20 L42 62 A34 34 0 1 0 58 62 L58 20 Z')),
    LIQ(P_('M17 92 Q50 98 83 92 A34 34 0 0 1 17 92 Z')),
    P_('M42 20 L42 62 A34 34 0 1 0 58 62 L58 20'),
    P_('M38 17 Q50 13 62 17'), L_(39, 20, 61, 20),
    D_(L_(42, 34, 58, 34)), D_(L_(42, 40, 58, 40)),
    D_(P_('M17 92 Q50 98 83 92')),
    B_(P_('M46 26 L46 58')), B_(P_('M27 82 A28 28 0 0 1 34 66'))] },

  { id: 'balon2', n: 'Matraz de dos bocas', grp: 'vidrio', fig: [
    G_(E_(50, 127, 26, 4)),
    V_(P_('M42 22 L42 60 A34 34 0 1 0 58 60 L58 22 Z')),
    V_(P_('M70 34 L78 50 A34 34 0 0 0 62 58 Z')),
    LIQ(P_('M17 92 Q50 98 83 92 A34 34 0 0 1 17 92 Z')),
    P_('M42 22 L42 60 A34 34 0 1 0 58 60 L58 22'),
    P_('M66 32 L74 48'), P_('M78 30 L86 46'),
    P_('M38 19 Q50 15 62 19'), P_('M64 29 Q71 25 80 27'),
    D_(P_('M17 92 Q50 98 83 92')),
    B_(P_('M46 28 L46 56'))] },

  { id: 'aforado', n: 'Matraz aforado', grp: 'vidrio', fig: [
    G_(E_(50, 127, 29, 4)),
    V_(P_('M44 16 L44 68 Q22 96 22 112 Q22 126 34 126 L66 126 Q78 126 78 112 Q78 96 56 68 L56 16 Z')),
    LIQ(P_('M32 88 Q50 92 68 88 Q78 100 78 112 Q78 125 66 125 L34 125 Q22 125 22 112 Q22 100 32 88 Z')),
    P_('M44 16 L44 68 Q22 96 22 112 Q22 126 34 126 L66 126 Q78 126 78 112 Q78 96 56 68 L56 16'),
    P_('M40 13 Q50 9 60 13'), L_(41, 16, 59, 16),
    D_(L_(43, 46, 57, 46)), D_(P_('M32 88 Q50 92 68 88')),
    B_(P_('M48 22 L48 64')), B_(P_('M31 102 Q28 112 30 120'))] },

  { id: 'probeta', n: 'Probeta', grp: 'vidrio', fig: [
    G_(E_(50, 131, 22, 4)),
    V_(P_('M37 22 L37 112 L30 126 L70 126 L63 112 L63 22 Z')),
    LIQ(P_('M37.5 66 Q50 70 62.5 66 L62.5 112 L37.5 112 Z')),
    P_('M37 22 L37 112 L30 126 L70 126 L63 112 L63 22'),
    P_('M31 22 Q38 18 44 21'), L_(37, 22, 63, 22), P_('M63 22 Q69 25 72 30'),
    D_(P_('M38 34 L47 34 M38 42 L44 42 M38 50 L47 50 M38 58 L44 58 M38 74 L47 74 M38 82 L44 82 M38 90 L47 90 M38 98 L44 98')),
    D_(P_('M37.5 66 Q50 70 62.5 66')),
    B_(P_('M43 30 L43 106'))] },

  { id: 'tubo', n: 'Tubo de ensayo', grp: 'vidrio', area: 'Química', tags: ['ensayo', 'reacción', 'muestra'], fig: [
    G_(E_(50, 128, 15, 3)),
    V_(P_('M39 22 L39 108 Q39 126 50 126 Q61 126 61 108 L61 22 Z')),
    LIQ(P_('M39.5 84 Q50 88 60.5 84 L60.5 108 Q60.5 125 50 125 Q39.5 125 39.5 108 Z')),
    P_('M39 22 L39 108 Q39 126 50 126 Q61 126 61 108 L61 22'),
    P_('M34 21 Q50 16 66 21'), D_(P_('M39.5 84 Q50 88 60.5 84')),
    B_(P_('M44 30 L44 100'))] },

  { id: 'embudo', n: 'Embudo', grp: 'vidrio', fig: [
    V_(P_('M18 34 L45 82 L45 122 L55 122 L55 82 L82 34 Z')),
    P_('M18 34 L45 82 L45 122 L55 122 L55 82 L82 34 Z'),
    P_('M14 32 Q50 26 86 32'), D_(L_(45, 122, 55, 122)),
    B_(P_('M28 40 L46 74')), G_(E_(50, 124, 12, 3))] },

  { id: 'separacion', n: 'Embudo de separación', grp: 'vidrio', fig: [
    V_(P_('M40 16 L40 40 Q24 56 24 78 Q24 104 50 112 Q76 104 76 78 Q76 56 60 40 L60 16 Z')),
    LIQ(P_('M26 82 Q50 88 74 82 Q70 105 50 112 Q30 105 26 82 Z')),
    P_('M40 16 L40 40 Q24 56 24 78 Q24 104 50 112 Q76 104 76 78 Q76 56 60 40 L60 16'),
    P_('M36 13 Q50 9 64 13'),
    M_(C_(50, 118, 6)), P_('M50 112 L50 130'), D_(L_(44, 118, 56, 118)),
    D_(P_('M26 82 Q50 88 74 82')),
    B_(P_('M44 22 L44 42 Q32 56 31 74'))] },

  { id: 'kitasato', n: 'Kitasato y Büchner', grp: 'vidrio', area: 'Química', tags: ['filtración', 'vacío', 'Büchner', 'precipitado', 'lavado'], fig: [
    G_(E_(50, 127, 30, 4)),
    V_(P_('M40 58 L40 74 L20 116 Q18 126 27 126 L73 126 Q82 126 80 116 L60 74 L60 58 Z')),
    V_(P_('M31 20 L38 54 L62 54 L69 20 Z')),
    LIQ(P_('M28 100 Q50 105 72 100 L78 118 Q79 125 73 125 L27 125 Q21 125 22 118 Z')),
    P_('M40 58 L40 74 L20 116 Q18 126 27 126 L73 126 Q82 126 80 116 L60 74 L60 58'),
    P_('M31 20 L38 54 L62 54 L69 20 Z'), D_(L_(38, 44, 62, 44)),
    P_('M60 82 L84 82'), P_('M84 77 L84 87'),
    P_('M36 57 Q50 53 64 57'),
    D_(P_('M28 100 Q50 105 72 100')),
    B_(P_('M45 62 L45 72 L30 106'))] },

  { id: 'refrigerante', n: 'Refrigerante Liebig', grp: 'vidrio', fig: [
    V_(P_('M38 12 L38 30 L29 40 L29 106 L38 116 L38 134 L62 134 L62 116 L71 106 L71 40 L62 30 L62 12 Z')),
    P_('M38 12 L38 30 L29 40 L29 106 L38 116 L38 134'),
    P_('M62 12 L62 30 L71 40 L71 106 L62 116 L62 134'),
    P_('M34 11 Q50 7 66 11'), P_('M34 135 Q50 139 66 135'),
    D_(L_(44, 44, 44, 102)), D_(L_(56, 44, 56, 102)),
    P_('M29 54 L14 44'), P_('M71 94 L86 104'),
    P_('M11 40 L17 49'), P_('M83 99 L89 108'),
    D_(P_('M35 62 Q41 66 35 70 M65 82 Q59 86 65 90')),
    B_(P_('M34 46 L34 100'))] },

  { id: 'pipeta', n: 'Pipeta aforada', grp: 'vidrio', fig: [
    V_(P_('M45 10 L45 44 Q45 52 40 56 Q37 62 37 74 Q37 86 40 92 Q45 96 45 104 L45 120 L50 132 L55 120 L55 104 Q55 96 60 92 Q63 86 63 74 Q63 62 60 56 Q55 52 55 44 L55 10 Z')),
    LIQ(P_('M38 78 Q50 82 62 78 Q62 88 60 92 Q55 96 55 104 L55 120 L50 130 L45 120 L45 104 Q45 96 40 92 Q38 88 38 78 Z')),
    P_('M45 10 L45 44 Q45 52 40 56 Q37 62 37 74 Q37 86 40 92 Q45 96 45 104 L45 120 L50 132 L55 120 L55 104 Q55 96 60 92 Q63 86 63 74 Q63 62 60 56 Q55 52 55 44 L55 10'),
    P_('M41 9 Q50 5 59 9'),
    D_(L_(45, 26, 55, 26)), D_(L_(45, 32, 52, 32)),
    D_(P_('M38 78 Q50 82 62 78')),
    B_(P_('M48 16 L48 42')), B_(P_('M41 64 Q39 74 41 84'))] },

  { id: 'bureta', n: 'Bureta', grp: 'vidrio', fig: [
    V_(P_('M40 12 L40 100 L44 108 L44 116 L56 116 L56 108 L60 100 L60 12 Z')),
    LIQ(P_('M40.5 40 Q50 44 59.5 40 L59.5 100 L56 107 L44 107 L40.5 100 Z')),
    P_('M40 12 L40 100 L44 108 L44 116 L56 116 L56 108 L60 100 L60 12'),
    P_('M35 11 Q50 7 65 11'),
    M_(C_(50, 112, 7)), P_('M50 119 L50 132'), D_(L_(43, 112, 57, 112)),
    D_(P_('M41 24 L49 24 M41 32 L46 32 M41 48 L49 48 M41 56 L46 56 M41 64 L49 64 M41 72 L46 72 M41 80 L49 80 M41 88 L46 88')),
    D_(P_('M40.5 40 Q50 44 59.5 40')),
    B_(P_('M45 20 L45 96'))] },

  { id: 'petri', n: 'Caja Petri', grp: 'vidrio', fig: [
    G_(E_(50, 118, 40, 5)),
    V_(P_('M10 92 L10 104 Q10 116 50 116 Q90 116 90 104 L90 92 Q90 80 50 80 Q10 80 10 92 Z')),
    V_(P_('M16 74 L16 82 Q16 92 50 92 Q84 92 84 82 L84 74 Q84 64 50 64 Q16 64 16 74 Z')),
    E_(50, 92, 40, 13), P_('M10 92 L10 104 Q10 116 50 116 Q90 116 90 104 L90 92'),
    E_(50, 74, 34, 10), P_('M16 74 L16 82 Q16 92 50 92 Q84 92 84 82 L84 74'),
    B_(P_('M24 72 Q30 66 42 65'))] },

  { id: 'reloj', n: 'Vidrio de reloj', grp: 'vidrio', fig: [
    G_(E_(50, 100, 34, 4)),
    V_(P_('M14 94 Q50 56 86 94 Q50 104 14 94 Z')),
    P_('M14 94 Q50 56 86 94'), P_('M14 94 Q50 104 86 94'),
    B_(P_('M28 88 Q38 72 52 68'))] },

  { id: 'crisol', n: 'Crisol', grp: 'vidrio', area: 'Química', tags: ['calcinación', 'porcelana', 'alúmina', 'mufla', 'residuo'], fig: [
    G_(E_(50, 120, 24, 4)),
    S_(P_('M28 56 L38 118 L62 118 L72 56 Z')),
    P_('M28 56 L38 118 L62 118 L72 56 Z'), P_('M24 55 Q50 50 76 55'),
    S_(P_('M32 44 Q50 32 68 44 L68 47 L32 47 Z')), P_('M32 44 Q50 32 68 44'), L_(30, 47, 70, 47),
    D_(L_(34, 84, 66, 84))] },

  { id: 'mortero', n: 'Mortero y pistilo', grp: 'vidrio', area: 'Química', tags: ['ágata', 'molienda', 'moler', 'pulverizar', 'polvo', 'sólido'], fig: [
    G_(E_(50, 120, 30, 4)),
    S_(P_('M20 74 Q20 118 50 118 Q80 118 80 74 Z')),
    P_('M20 74 Q20 118 50 118 Q80 118 80 74'), P_('M16 73 Q50 66 84 73'),
    S_(P_('M62 20 L70 26 L52 62 Q45 69 41 62 Q39 55 46 51 Z')),
    P_('M62 20 L70 26 L52 62 Q45 69 41 62 Q39 55 46 51 Z'),
    B_(P_('M28 82 Q30 100 40 110'))] },

  { id: 'frasco', n: 'Frasco de reactivo', grp: 'vidrio', fig: [
    G_(E_(50, 127, 28, 4)),
    S_(R_(42, 12, 16, 16, 2)),
    V_(P_('M34 28 L34 42 Q22 52 22 68 L22 116 Q22 126 32 126 L68 126 Q78 126 78 116 L78 68 Q78 52 66 42 L66 28 Z')),
    LIQ(P_('M23 62 Q50 67 77 62 L77 116 Q77 125 68 125 L32 125 Q23 125 23 116 Z')),
    P_('M34 28 L34 42 Q22 52 22 68 L22 116 Q22 126 32 126 L68 126 Q78 126 78 116 L78 68 Q78 52 66 42 L66 28'),
    R_(42, 12, 16, 16, 2),
    D_(R_(31, 74, 38, 30, 3)), D_(P_('M37 84 L63 84 M37 92 L57 92')),
    B_(P_('M30 56 L30 110'))] },

  /* ---------- montaje y calor ---------- */
  { id: 'soporte', n: 'Soporte universal', grp: 'montaje', fig: [
    G_(E_(50, 126, 38, 4)),
    M_(P_('M12 116 L88 116 Q92 116 92 120 L92 124 Q92 128 88 128 L12 128 Q8 128 8 124 L8 120 Q8 116 12 116 Z')),
    M_(R_(23, 14, 7, 104, 3)),
    M_(R_(30, 37, 46, 6, 3)), M_(R_(64, 30, 14, 20, 3)),
    M_(R_(30, 76, 34, 6, 3)), M_(R_(54, 69, 12, 20, 3)),
    D_(C_(71, 40, 3)), D_(C_(60, 79, 3)),
    B_(P_('M25 22 L25 110'))] },

  { id: 'pinza', n: 'Pinza de sujeción', grp: 'montaje', fig: [
    M_(R_(8, 65, 34, 12, 4)),
    P_('M42 71 Q58 55 78 56 Q84 57 86 62'),
    P_('M42 71 Q58 87 78 86 Q84 85 86 80'),
    M_(C_(47, 71, 5)), D_(C_(47, 71, 2)),
    D_(P_('M14 68 L14 74 M20 68 L20 74'))] },

  { id: 'mechero', n: 'Mechero Bunsen', grp: 'montaje', fig: [
    G_(E_(50, 128, 26, 4)),
    M_(P_('M28 128 Q50 110 72 128 Z')), P_('M28 128 Q50 110 72 128 Z'),
    M_(R_(44, 50, 12, 62, 2)), M_(R_(39, 44, 22, 8, 3)),
    M_(C_(37, 98, 6)), D_(C_(37, 98, 2.5)),
    LIQ(P_('M50 42 Q39 24 50 4 Q61 24 50 42 Z')),
    P_('M50 42 Q39 24 50 4 Q61 24 50 42 Z'),
    D_(P_('M50 36 Q45 24 50 14 Q55 24 50 36 Z')),
    B_(P_('M46 54 L46 106'))] },

  { id: 'parrilla', n: 'Parrilla de agitación', grp: 'montaje', area: 'Química', tags: ['agitación', 'calentamiento', 'baño', 'placa', 'temperatura'], fig: [
    G_(E_(50, 122, 40, 4)),
    S_(P_('M10 82 Q10 78 14 78 L86 78 Q90 78 90 82 L90 114 Q90 120 84 120 L16 120 Q10 120 10 114 Z')),
    P_('M10 82 Q10 78 14 78 L86 78 Q90 78 90 82 L90 114 Q90 120 84 120 L16 120 Q10 120 10 114 Z'),
    M_(E_(50, 78, 32, 7)), E_(50, 78, 32, 7),
    D_(E_(50, 77, 22, 4)),
    M_(C_(27, 102, 7)), D_(C_(27, 102, 2.5)), D_(P_('M27 96 L27 99')),
    M_(C_(45, 102, 7)), D_(C_(45, 102, 2.5)),
    S_(R_(60, 94, 22, 14, 3)), D_(P_('M65 101 L77 101')),
    B_(P_('M16 86 L16 112'))] },

  { id: 'agitador', n: 'Barra magnética', grp: 'montaje', fig: [
    G_(E_(50, 84, 30, 3)),
    S_(R_(22, 62, 56, 14, 7)), R_(22, 62, 56, 14, 7),
    D_(E_(50, 69, 3.4, 7)),
    D_(P_('M30 63 L30 75 M70 63 L70 75')),
    N_(P_('M16 58 Q9 69 16 80 M13 77 L16 80 L19 77 M84 80 Q91 69 84 58 M81 61 L84 58 L87 61')),
    B_(P_('M28 65.5 L44 65.5'))] },

  { id: 'termometro', n: 'Termómetro', grp: 'montaje', fig: [
    V_(P_('M44 14 L44 96 Q37 103 37 110 Q37 123 50 123 Q63 123 63 110 Q63 103 56 96 L56 14 Z')),
    LIQ(P_('M47 58 L53 58 L53 98 Q60 104 60 110 Q60 120 50 120 Q40 120 40 110 Q40 104 47 98 Z')),
    P_('M44 14 L44 96 Q37 103 37 110 Q37 123 50 123 Q63 123 63 110 Q63 103 56 96 L56 14'),
    P_('M41 13 Q50 9 59 13'),
    D_(P_('M57 28 L66 28 M57 36 L62 36 M57 44 L66 44 M57 52 L62 52 M57 60 L66 60 M57 68 L62 68 M57 76 L66 76')),
    B_(P_('M47 22 L47 90'))] },

  /* ---------- equipo ---------- */
  { id: 'mufla', n: 'Mufla', grp: 'equipo', area: 'Química', tags: ['calcinación', 'sinterización', 'horno', 'tratamiento térmico', 'cerámica'], fig: [
    G_(E_(50, 122, 36, 4)),
    S_(R_(10, 30, 80, 84, 5)),
    R_(10, 30, 80, 84, 5),
    S_(R_(20, 42, 44, 50, 3)), R_(20, 42, 44, 50, 3),
    LIQ(R_(24, 62, 36, 26)),
    D_(P_('M28 74 L34 82 L40 68 L46 82 L52 70')),
    M_(C_(77, 54, 7)), D_(C_(77, 54, 2.5)), D_(P_('M77 47 L77 51')),
    S_(R_(70, 72, 14, 8, 2)), D_(P_('M73 76 L81 76')),
    M_(R_(14, 114, 8, 10, 2)), M_(R_(78, 114, 8, 10, 2)),
    B_(P_('M16 38 L16 106'))] },

  { id: 'estufa', n: 'Estufa de secado', grp: 'equipo', area: 'Química', tags: ['secado', 'horno', 'temperatura', 'muestra'], fig: [
    G_(E_(50, 122, 36, 4)),
    S_(R_(10, 26, 80, 90, 5)), R_(10, 26, 80, 90, 5),
    V_(R_(19, 36, 50, 70, 3)), R_(19, 36, 50, 70, 3),
    D_(L_(19, 60, 69, 60)), D_(L_(19, 82, 69, 82)),
    M_(C_(80, 42, 6)), D_(C_(80, 42, 2)),
    S_(R_(74, 58, 12, 6, 2)), D_(P_('M76 68 L84 68 M76 74 L82 74')),
    M_(R_(14, 116, 8, 10, 2)), M_(R_(78, 116, 8, 10, 2)),
    B_(P_('M24 42 L24 100'))] },

  { id: 'rotavapor', n: 'Rotavapor', grp: 'equipo', area: 'Química', tags: ['evaporación', 'disolvente', 'concentrar', 'vacío'], fig: [
    G_(E_(58, 128, 40, 4)),
    S_(R_(8, 92, 36, 30, 4)), R_(8, 92, 36, 30, 4),
    M_(C_(26, 107, 8)), D_(C_(26, 107, 3)),
    P_('M44 102 L56 102'),
    V_(P_('M56 34 L56 96 L60 96 L60 34 Z')), P_('M56 34 L56 96'), P_('M60 34 L60 96'),
    V_(C_(72, 34, 17)), C_(72, 34, 17),
    LIQ(P_('M56 40 A17 17 0 0 0 88 40 A17 17 0 0 1 56 40 Z')),
    P_('M52 26 L64 26'),
    V_(C_(74, 104, 17)), C_(74, 104, 17),
    LIQ(P_('M58 110 A17 17 0 0 0 90 110 A17 17 0 0 1 58 110 Z')),
    P_('M74 87 L74 74 L62 74'),
    D_(P_('M12 98 L26 98')),
    B_(P_('M62 28 A15 15 0 0 0 60 42'))] },

  { id: 'bomba', n: 'Bomba de vacío', grp: 'equipo', area: 'Química', tags: ['vacío', 'desgasificar', 'línea de vacío'], fig: [
    G_(E_(48, 122, 36, 4)),
    S_(P_('M12 58 Q12 54 16 54 L74 54 Q78 54 78 58 L78 112 Q78 118 72 118 L18 118 Q12 118 12 112 Z')),
    P_('M12 58 Q12 54 16 54 L74 54 Q78 54 78 58 L78 112 Q78 118 72 118 L18 118 Q12 118 12 112 Z'),
    M_(C_(43, 86, 16)), C_(43, 86, 16), D_(C_(43, 86, 6)),
    D_(P_('M43 70 L43 78 M43 94 L43 102 M27 86 L35 86 M51 86 L59 86')),
    S_(R_(78, 72, 10, 14, 2)), P_('M88 79 L96 79'),
    M_(R_(18, 118, 8, 8, 2)), M_(R_(66, 118, 8, 8, 2)),
    B_(P_('M18 62 L18 108'))] },

  { id: 'balanza', n: 'Balanza analítica', grp: 'equipo', area: 'Química', tags: ['pesar', 'masa', 'precursor', 'estequiometría'], fig: [
    G_(E_(50, 118, 38, 4)),
    S_(P_('M12 78 Q12 74 16 74 L84 74 Q88 74 88 78 L88 108 Q88 114 82 114 L18 114 Q12 114 12 108 Z')),
    P_('M12 78 Q12 74 16 74 L84 74 Q88 74 88 78 L88 108 Q88 114 82 114 L18 114 Q12 114 12 108 Z'),
    S_(R_(22, 86, 34, 16, 2)), R_(22, 86, 34, 16, 2),
    D_(P_('M27 94 L39 94 M43 94 L51 94')),
    M_(E_(62, 72, 20, 5)), E_(62, 72, 20, 5),
    V_(P_('M20 40 L20 72 M84 40 L84 72')), P_('M20 40 L20 72'), P_('M84 40 L84 72'),
    V_(R_(18, 34, 68, 8, 3)), R_(18, 34, 68, 8, 3),
    D_(P_('M62 66 L62 72')),
    B_(P_('M18 80 L18 106'))] },

  { id: 'ultrasonido', n: 'Baño de ultrasonido', grp: 'equipo', area: 'Química', tags: ['sonicación', 'dispersión', 'suspensión', 'coloide'], fig: [
    G_(E_(50, 122, 38, 4)),
    S_(P_('M10 58 Q10 54 14 54 L86 54 Q90 54 90 58 L90 112 Q90 118 84 118 L16 118 Q10 118 10 112 Z')),
    P_('M10 58 Q10 54 14 54 L86 54 Q90 54 90 58 L90 112 Q90 118 84 118 L16 118 Q10 118 10 112 Z'),
    V_(R_(20, 62, 44, 40, 3)), R_(20, 62, 44, 40, 3),
    LIQ(P_('M21 76 Q42 81 63 76 L63 101 L21 101 Z')),
    D_(P_('M21 76 Q42 81 63 76')),
    D_(P_('M27 88 Q33 82 39 88 Q45 94 51 88 Q57 82 57 88')),
    M_(C_(78, 68, 5)), D_(C_(78, 68, 1.8)), M_(C_(78, 84, 4)),
    S_(R_(72, 96, 14, 6, 2)),
    B_(P_('M25 68 L25 98'))] },

  { id: 'centrifuga', n: 'Centrífuga', grp: 'equipo', area: 'Química', tags: ['centrifugación', 'separación', 'precipitado', 'lavado'], fig: [
    G_(E_(50, 122, 40, 4)),
    S_(P_('M12 70 L12 104 Q12 120 50 120 Q88 120 88 104 L88 70 Z')),
    P_('M12 70 L12 104 Q12 120 50 120 Q88 120 88 104 L88 70'),
    V_(E_(50, 70, 38, 13)), E_(50, 70, 38, 13),
    D_(E_(50, 70, 26, 8)),
    M_(P_('M30 66 L38 50 L44 52 L36 68 Z')), M_(P_('M70 66 L62 50 L56 52 L64 68 Z')),
    M_(C_(50, 70, 6)), D_(C_(50, 70, 2.5)),
    S_(R_(58, 100, 20, 9, 2)), D_(P_('M62 105 L74 105')),
    B_(P_('M18 78 L18 100'))] },

  { id: 'uvvis', n: 'Espectrofotómetro', grp: 'equipo', area: 'Química', tags: ['espectroscopía', 'absorbancia', 'UV-Vis', 'cubeta', 'espectrofotometría'], fig: [
    G_(E_(50, 116, 42, 4)),
    S_(P_('M8 50 Q8 46 12 46 L88 46 Q92 46 92 50 L92 106 Q92 112 86 112 L14 112 Q8 112 8 106 Z')),
    P_('M8 50 Q8 46 12 46 L88 46 Q92 46 92 50 L92 106 Q92 112 86 112 L14 112 Q8 112 8 106 Z'),
    V_(R_(16, 56, 32, 26, 3)), R_(16, 56, 32, 26, 3),
    D_(P_('M22 64 L42 64 M22 71 L36 71')),
    S_(R_(56, 56, 28, 20, 2)), R_(56, 56, 28, 20, 2),
    LIQ(R_(62, 60, 8, 12)),
    D_(P_('M20 94 L44 94 M52 94 L82 94')),
    M_(C_(86, 60, 3.5)),
    B_(P_('M14 54 L14 102'))] },

  { id: 'drx', n: 'Difractómetro', grp: 'equipo', area: 'Química', tags: ['difracción', 'DRX', 'XRD', 'rayos X', 'goniómetro', 'cristalografía'], fig: [
    G_(E_(50, 124, 34, 4)),
    S_(C_(50, 82, 33)), C_(50, 82, 33),
    D_(C_(50, 82, 24)),
    M_(P_('M50 82 L26 60 L20 66 L44 88 Z')), M_(P_('M50 82 L78 66 L82 74 L54 88 Z')),
    S_(R_(14, 50, 16, 14, 3)), R_(14, 50, 16, 14, 3),
    S_(R_(72, 56, 16, 14, 3)), R_(72, 56, 16, 14, 3),
    M_(C_(50, 82, 6)), LIQ(C_(50, 82, 3.5)),
    D_(P_('M36 82 A14 14 0 0 1 44 69')),
    M_(R_(30, 118, 40, 8, 2)),
    B_(P_('M26 68 A32 32 0 0 0 24 92'))] },

  { id: 'campana', n: 'Campana de extracción', grp: 'equipo', fig: [
    G_(E_(50, 124, 42, 4)),
    S_(P_('M10 28 Q10 24 14 24 L86 24 Q90 24 90 28 L90 94 L10 94 Z')),
    P_('M10 28 Q10 24 14 24 L86 24 Q90 24 90 28 L90 94 L10 94 Z'),
    V_(R_(18, 34, 64, 30, 2)), R_(18, 34, 64, 30, 2), D_(L_(18, 52, 82, 52)),
    S_(R_(10, 94, 80, 24, 2)), R_(10, 94, 80, 24, 2),
    D_(P_('M20 104 L44 104 M52 104 L80 104')),
    M_(P_('M40 24 L40 8 L60 8 L60 24')), D_(P_('M46 16 L54 16')),
    D_(P_('M24 70 L76 70')),
    B_(P_('M22 40 L22 60'))] },

  { id: 'guantes', n: 'Equipo de protección', grp: 'equipo', fig: [
    V_(P_('M28 58 Q28 38 50 38 Q72 38 72 58 L72 72 Q72 78 66 78 L34 78 Q28 78 28 72 Z')),
    P_('M28 58 Q28 38 50 38 Q72 38 72 58 L72 72 Q72 78 66 78 L34 78 Q28 78 28 72 Z'),
    P_('M22 56 Q50 44 78 56'), D_(L_(28, 66, 72, 66)),
    B_(P_('M36 50 Q44 44 54 44')),
    S_(P_('M38 136 L38 122 Q32 114 26 106 Q23 101 27 99 Q31 98 35 103 L39 108 L39 92 Q39 88 42.5 88 Q46 88 46 92 L46 104 L46 86 Q46 82 49.5 82 Q53 82 53 86 L53 104 L53 88 Q53 84 56.5 84 Q60 84 60 88 L60 106 L60 94 Q60 90 63.5 90 Q67 90 67 94 L67 118 Q67 126 63 130 L63 136 Z')),
    P_('M38 136 L38 122 Q32 114 26 106 Q23 101 27 99 Q31 98 35 103 L39 108 L39 92 Q39 88 42.5 88 Q46 88 46 92 L46 104 L46 86 Q46 82 49.5 82 Q53 82 53 86 L53 104 L53 88 Q53 84 56.5 84 Q60 84 60 88 L60 106 L60 94 Q60 90 63.5 90 Q67 90 67 94 L67 118 Q67 126 63 130 L63 136 Z'),
    D_(P_('M38 128 L63 128 M46 104 L46 110 M53 104 L53 110 M60 106 L60 112')),
    B_(P_('M42 94 L42 116'))] },

  /* ---------- síntesis y preparación de sólidos ----------
     Lo que hay entre pesar el precursor y tener la muestra lista para medir.
     Nada de esto existe en las bibliotecas de biociencias, así que se dibuja
     aquí con la misma convención de papeles que el vidrio. */
  { id: 'autoclave', n: 'Autoclave hidrotermal', grp: 'sintesis', area: 'Química',
    tags: ['autoclave', 'hidrotermal', 'solvotermal', 'reactor', 'teflón', 'acero', 'síntesis'], fig: [
    G_(E_(50, 130, 28, 4)),
    M_(P_('M28 46 L28 116 Q28 126 38 126 L62 126 Q72 126 72 116 L72 46 Z')),
    M_(R_(20, 30, 60, 16, 4)),
    M_(R_(42, 18, 16, 12, 3)),
    V_(P_('M36 54 L36 110 Q36 118 44 118 L56 118 Q64 118 64 110 L64 54 Z')),
    LIQ(P_('M37 88 Q50 92 63 88 L63 110 Q63 117 56 117 L44 117 Q37 117 37 110 Z')),
    P_('M28 46 L28 116 Q28 126 38 126 L62 126 Q72 126 72 116 L72 46'),
    P_('M36 54 L36 110 Q36 118 44 118 L56 118 Q64 118 64 110 L64 54'),
    P_('M20 46 L80 46'),
    D_(C_(30, 38, 3)), D_(C_(50, 38, 3)), D_(C_(70, 38, 3)),
    D_(P_('M37 88 Q50 92 63 88')),
    D_(P_('M28 62 L36 62 M28 76 L36 76 M64 62 L72 62 M64 76 L72 76')),
    B_(P_('M32 58 L32 108'))] },

  { id: 'horno-tubular', n: 'Horno tubular', grp: 'sintesis', area: 'Química',
    tags: ['horno', 'tubular', 'calcinación', 'sinterización', 'atmósfera', 'gas', 'tratamiento térmico'], fig: [
    G_(E_(50, 120, 40, 4)),
    V_(R_(6, 62, 88, 20, 10)),
    S_(R_(24, 44, 52, 56, 5)),
    V_(R_(34, 62, 32, 20, 2)),
    S_(R_(30, 100, 40, 12, 3)),
    M_(R_(22, 112, 8, 8, 2)), M_(R_(70, 112, 8, 8, 2)),
    M_(P_('M40 79 L42 70 L58 70 L60 79 Z')),
    LIQ(R_(35, 63, 30, 18)),
    P_('M6 62 L94 62 M6 82 L94 82'),
    R_(24, 44, 52, 56, 5), R_(34, 62, 32, 20, 2), R_(30, 100, 40, 12, 3),
    P_('M40 79 L42 70 L58 70 L60 79 Z'),
    D_(P_('M28 52 L28 92 M32 52 L32 92 M68 52 L68 92 M72 52 L72 92')),
    D_(P_('M34 50 L66 50 M36 106 L50 106 M56 106 L64 106')),
    A_(P_('M2 72 L20 72 M15 67 L20 72 L15 77')),
    A_(P_('M80 72 L98 72 M93 67 L98 72 L93 77')),
    B_(P_('M12 66 L26 66'))] },

  { id: 'prensa', n: 'Prensa de pastillas', grp: 'sintesis', area: 'Química',
    tags: ['prensa', 'pastilla', 'pellet', 'KBr', 'presión', 'empastillado', 'hidráulica', 'compactación'], fig: [
    G_(E_(50, 128, 36, 4)),
    M_(R_(18, 104, 64, 18, 4)),
    M_(R_(20, 20, 60, 12, 3)),
    M_(R_(22, 32, 10, 72, 2)), M_(R_(68, 32, 10, 72, 2)),
    M_(R_(42, 32, 16, 26, 2)), M_(R_(46, 58, 8, 10, 1)),
    S_(R_(34, 68, 32, 24, 3)),
    LIQ(R_(40, 84, 20, 6)),
    R_(18, 104, 64, 18, 4), R_(20, 20, 60, 12, 3),
    P_('M22 32 L22 104 M32 32 L32 104 M68 32 L68 104 M78 32 L78 104'),
    R_(42, 32, 16, 26, 2), R_(34, 68, 32, 24, 3),
    M_(C_(84, 46, 10)), C_(84, 46, 10), D_(C_(84, 46, 4)), D_(P_('M84 46 L88 40')),
    N_(P_('M78 54 Q72 62 66 70')),
    D_(P_('M40 76 L60 76')),
    A_(P_('M50 4 L50 18 M45 13 L50 18 L55 13')),
    B_(P_('M26 36 L26 100'))] },

  { id: 'troquel', n: 'Troquel de pastilla', grp: 'sintesis', area: 'Química',
    tags: ['troquel', 'dado', 'pastilla', 'pellet', 'KBr', 'molde', 'émbolo', 'empastillado'], fig: [
    G_(E_(50, 128, 28, 4)),
    M_(R_(40, 18, 20, 12, 2)),
    M_(R_(44, 30, 12, 34, 1)),
    M_(P_('M28 60 L28 108 L72 108 L72 60 Z')),
    M_(R_(22, 108, 56, 12, 2)),
    LIQ(R_(36, 92, 28, 8, 1)),
    R_(40, 18, 20, 12, 2), R_(44, 30, 12, 34, 1),
    P_('M28 60 L28 108 L72 108 L72 60'),
    R_(22, 108, 56, 12, 2), R_(36, 92, 28, 8, 1),
    D_(P_('M36 60 L36 108 M64 60 L64 108')),
    D_(P_('M42 84 L47 84 M53 84 L59 84')),
    A_(P_('M50 4 L50 14 M45 9 L50 14 L55 9')),
    B_(P_('M32 64 L32 104'))] },

  { id: 'desecador', n: 'Desecador', grp: 'sintesis', area: 'Química',
    tags: ['desecador', 'secado', 'sílica gel', 'humedad', 'vacío', 'almacenamiento'], fig: [
    G_(E_(50, 128, 34, 4)),
    V_(P_('M18 66 L18 104 Q18 122 38 122 L62 122 Q82 122 82 104 L82 66 Z')),
    V_(P_('M20 60 Q50 34 80 60 Z')),
    M_(R_(44, 37, 12, 10, 3)),
    LIQ(P_('M20 98 Q50 104 80 98 L80 104 Q80 121 62 121 L38 121 Q20 121 20 104 Z')),
    P_('M18 66 L18 104 Q18 122 38 122 L62 122 Q82 122 82 104 L82 66'),
    P_('M20 60 Q50 34 80 60'),
    P_('M14 60 L86 60 M14 66 L86 66'),
    R_(44, 37, 12, 10, 3),
    D_(P_('M22 86 L78 86')),
    D_(C_(32, 86, 2.5)), D_(C_(50, 86, 2.5)), D_(C_(68, 86, 2.5)),
    D_(P_('M20 98 Q50 104 80 98')),
    B_(P_('M26 70 L26 104')), B_(P_('M30 54 Q38 46 48 44'))] },

  { id: 'schlenk', n: 'Línea Schlenk', grp: 'sintesis', area: 'Química',
    tags: ['Schlenk', 'vacío', 'atmósfera inerte', 'nitrógeno', 'argón', 'trampa', 'llave'], fig: [
    G_(E_(50, 128, 36, 4)),
    V_(R_(8, 34, 84, 16, 8)),
    V_(R_(20, 50, 8, 16, 1)), V_(R_(46, 50, 8, 16, 1)), V_(R_(72, 50, 8, 16, 1)),
    M_(C_(24, 68, 6)), M_(C_(50, 68, 6)), M_(C_(76, 68, 6)),
    V_(P_('M66 82 L66 108 Q66 120 78 120 Q90 120 90 108 L90 82 Z')),
    LIQ(P_('M67 100 Q78 104 89 100 L89 108 Q89 119 78 119 Q67 119 67 108 Z')),
    R_(8, 34, 84, 16, 8),
    P_('M20 50 L20 66 M28 50 L28 66 M46 50 L46 66 M54 50 L54 66 M72 50 L72 66 M80 50 L80 66'),
    C_(24, 68, 6), C_(50, 68, 6), C_(76, 68, 6),
    P_('M66 82 L66 108 Q66 120 78 120 Q90 120 90 108 L90 82'),
    P_('M76 74 L76 82'),
    D_(P_('M18 68 L30 68 M24 62 L24 74 M44 68 L56 68 M50 62 L50 74 M70 68 L82 68 M76 62 L76 74')),
    D_(P_('M67 100 Q78 104 89 100')),
    N_(P_('M24 74 Q21 86 26 98')), N_(P_('M50 74 Q47 86 52 98')),
    A_(P_('M2 42 L18 42 M7 37 L2 42 L7 47')),
    B_(P_('M14 38 L34 38')), B_(P_('M70 88 L70 110'))] },

  { id: 'soxhlet', n: 'Extractor Soxhlet', grp: 'sintesis', area: 'Química',
    tags: ['Soxhlet', 'extracción', 'reflujo', 'disolvente', 'cartucho', 'sifón'], fig: [
    G_(E_(50, 130, 24, 4)),
    V_(P_('M40 14 L40 40 L60 40 L60 14 Z')),
    V_(P_('M36 44 L36 82 Q36 88 42 88 L58 88 Q64 88 64 82 L64 44 Z')),
    V_(C_(50, 108, 20)),
    LIQ(P_('M37 70 Q50 74 63 70 L63 82 Q63 87 58 87 L42 87 Q37 87 37 82 Z')),
    LIQ(P_('M30 112 Q50 118 70 112 A20 20 0 0 1 30 112 Z')),
    P_('M40 14 L40 40 M60 14 L60 40 M38 10 L62 10 M40 14 L60 14'),
    P_('M36 44 L36 82 Q36 88 42 88 L58 88 Q64 88 64 82 L64 44'),
    P_('M38 40 L62 40 M38 44 L62 44'),
    C_(50, 108, 20),
    P_('M42 88 L42 92 M58 88 L58 92'),
    D_(P_('M42 19 Q58 22 42 25 Q58 28 42 31 Q58 34 42 37')),
    D_(R_(42, 52, 16, 26, 2)),
    D_(P_('M30 112 Q50 118 70 112')),
    V_(P_('M64 56 Q74 60 74 76 Q74 86 64 90 L64 86 Q70 83 70 76 Q70 63 64 60 Z')),
    P_('M64 56 Q74 60 74 76 Q74 86 64 90 M64 60 Q70 63 70 76 Q70 83 64 86'),
    V_(P_('M36 50 Q26 54 26 70 Q26 82 36 86 L36 82 Q30 79 30 70 Q30 57 36 54 Z')),
    P_('M36 50 Q26 54 26 70 Q26 82 36 86 M36 54 Q30 57 30 70 Q30 79 36 82'),
    B_(P_('M40 50 L40 80')), B_(P_('M36 100 A16 16 0 0 0 34 114'))] },

  { id: 'columna', n: 'Columna cromatográfica', grp: 'sintesis', area: 'Química',
    tags: ['columna', 'cromatografía', 'sílica', 'elución', 'purificación', 'fase estacionaria', 'banda'], fig: [
    G_(E_(50, 132, 16, 3)),
    V_(P_('M30 16 L70 16 L58 40 L58 100 L42 100 L42 40 Z')),
    LIQ(P_('M42 46 Q50 49 58 46 L58 62 Q50 65 42 62 Z')),
    LIQ(P_('M42 74 Q50 77 58 74 L58 86 Q50 89 42 86 Z')),
    M_(P_('M42 100 L58 100 L53 108 L47 108 Z')),
    M_(C_(50, 111, 6)),
    P_('M30 16 L70 16 L58 40 L58 100 M42 100 L42 40 L30 16'),
    P_('M42 100 L58 100 L53 108 L47 108 Z'), C_(50, 111, 6),
    D_(P_('M42 46 Q50 49 58 46 M42 74 Q50 77 58 74 M42 66 Q50 69 58 66')),
    D_(P_('M44 111 L56 111 M50 105 L50 117')),
    N_(P_('M50 119 L50 124')),
    LIQ(C_(50, 128, 3)),
    B_(P_('M46 40 L46 96'))] },

  { id: 'manta', n: 'Manta de calentamiento', grp: 'sintesis', area: 'Química',
    tags: ['manta', 'calentamiento', 'reflujo', 'matraz', 'temperatura', 'calefacción'], fig: [
    G_(E_(50, 130, 40, 4)),
    V_(P_('M40 18 L40 50 A30 30 0 1 0 60 50 L60 18 Z')),
    LIQ(P_('M23 66 Q50 72 77 66 L80 82 L20 82 Z')),
    S_(P_('M12 82 L88 82 L88 98 Q88 124 50 124 Q12 124 12 98 Z')),
    P_('M40 18 L40 50 A30 30 0 1 0 60 50 L60 18'),
    P_('M36 15 Q50 11 64 15'),
    P_('M12 82 L88 82 M88 98 Q88 124 50 124 Q12 124 12 98 L12 82'),
    D_(P_('M23 66 Q50 72 77 66')),
    D_(E_(50, 82, 38, 4)),
    D_(P_('M26 108 L74 108')),
    M_(C_(84, 112, 7)), C_(84, 112, 7), D_(C_(84, 112, 2.5)),
    N_(P_('M12 114 Q4 118 2 126')),
    B_(P_('M44 24 L44 52')), B_(P_('M27 68 A28 28 0 0 1 34 56'))] },

  { id: 'tamiz', n: 'Tamiz de malla', grp: 'sintesis', area: 'Química',
    tags: ['tamiz', 'malla', 'granulometría', 'tamizado', 'polvo', 'partícula', 'tamaño de grano'], fig: [
    G_(E_(50, 128, 34, 4)),
    M_(P_('M16 92 L16 108 Q16 118 50 118 Q84 118 84 108 L84 92 Z')),
    M_(E_(50, 92, 34, 11)),
    M_(P_('M16 58 L16 74 Q16 84 50 84 Q84 84 84 74 L84 58 Z')),
    M_(E_(50, 58, 34, 11)),
    LIQ(E_(50, 58, 27, 8)),
    P_('M16 92 L16 108 Q16 118 50 118 Q84 118 84 108 L84 92'),
    P_('M16 58 L16 74 Q16 84 50 84 Q84 84 84 74 L84 58'),
    E_(50, 92, 34, 11), E_(50, 58, 34, 11),
    D_(P_('M26 58 L74 58 M30 52 L70 52 M30 64 L70 64 M36 48 L36 68 M50 47 L50 69 M64 48 L64 68')),
    D_(E_(50, 92, 27, 8)),
    B_(P_('M20 62 L20 74')), B_(P_('M20 96 L20 108'))] },

  { id: 'portamuestras', n: 'Portamuestras de polvo', grp: 'sintesis', area: 'Química',
    tags: ['portamuestras', 'polvo', 'difracción', 'DRX', 'XRD', 'muestra', 'enrasar', 'preparación'], fig: [
    G_(E_(48, 116, 40, 5)),
    M_(P_('M10 96 L34 56 L92 56 L68 96 Z')),
    M_(P_('M10 96 L10 104 L68 104 L68 96 Z')),
    M_(P_('M68 96 L92 56 L92 64 L68 104 Z')),
    LIQ(P_('M24 88 L42 66 L80 66 L62 88 Z')),
    P_('M10 96 L34 56 L92 56 L68 96 Z'),
    P_('M10 96 L10 104 L68 104 L68 96 M68 104 L92 64 L92 56'),
    D_(P_('M24 88 L42 66 L80 66 L62 88 Z')),
    M_(P_('M46 32 L86 32 L88 38 L48 38 Z')), P_('M46 32 L86 32 L88 38 L48 38 Z'),
    N_(P_('M46 38 L40 50')),
    B_(P_('M16 92 L36 60'))] },

  /* ---------- caracterización ----------
     Los instrumentos y, sobre todo, las gráficas: un difractograma o una
     isoterma dicen de qué trata la figura mucho antes que cualquier rótulo.
     Las curvas van en papel de acento, así que toman el color elegido. */
  { id: 'difractograma', n: 'Difractograma de rayos X', grp: 'caracter', area: 'Química',
    tags: ['difractograma', 'difracción', 'DRX', 'XRD', 'rayos X', 'patrón', 'cristalino', 'Bragg', 'fase'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 100 L24 100 L27 62 L30 100 L38 100 L41 44 L44 100 L50 100 L53 78 L56 100 L62 100 L65 56 L68 100 L74 100 L77 84 L80 100 L88 100')),
    D_(P_('M27 56 L27 50 M41 38 L41 32 M65 50 L65 44')),
    N_(P_('M14 32 L18 32 M14 50 L18 50 M14 68 L18 68 M14 86 L18 86')),
    N_(P_('M30 104 L30 108 M46 104 L46 108 M62 104 L62 108 M78 104 L78 108'))] },

  { id: 'tga', n: 'Curva termogravimétrica', grp: 'caracter', area: 'Química',
    tags: ['TGA', 'ATG', 'termogravimetría', 'DSC', 'análisis térmico', 'pérdida de masa', 'descomposición'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 38 L30 38 Q38 38 42 54 Q45 64 52 64 Q60 64 64 82 Q67 92 74 92 L88 92')),
    N_(P_('M18 64 L24 64 M28 64 L34 64 M38 64 L44 64 M48 64 L52 64')),
    N_(P_('M18 92 L24 92 M28 92 L34 92 M38 92 L44 92 M48 92 L54 92 M58 92 L64 92 M68 92 L74 92')),
    D_(P_('M42 54 L42 46 M64 82 L64 74')),
    N_(P_('M14 38 L18 38 M14 64 L18 64 M14 92 L18 92')),
    N_(P_('M34 104 L34 108 M54 104 L54 108 M74 104 L74 108'))] },

  { id: 'isoterma', n: 'Isoterma de adsorción', grp: 'caracter', area: 'Química',
    tags: ['isoterma', 'adsorción', 'BET', 'porosidad', 'histéresis', 'área superficial', 'nitrógeno', 'mesoporo'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 96 L28 88 L44 84 Q58 81 64 67 Q70 51 78 41 L88 30')),
    A_(P_('M88 30 Q73 35 67 45 Q59 59 47 63 Q35 67 28 88')),
    D_(P_('M56 62 L56 54')),
    N_(P_('M14 38 L18 38 M14 60 L18 60 M14 82 L18 82')),
    N_(P_('M36 104 L36 108 M54 104 L54 108 M72 104 L72 108'))] },

  { id: 'espectro', n: 'Espectro infrarrojo', grp: 'caracter', area: 'Química',
    tags: ['espectro', 'infrarrojo', 'FTIR', 'IR', 'Raman', 'transmitancia', 'banda', 'vibración', 'número de onda'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 36 L24 36 Q28 36 30 48 Q32 60 35 48 Q37 38 40 38 L48 38 Q51 38 53 62 Q55 84 58 62 Q60 40 63 40 L70 40 Q73 40 75 54 Q77 66 79 54 Q81 42 84 42 L88 42')),
    D_(P_('M30 46 L30 40 M53 60 L53 54')),
    N_(P_('M14 36 L18 36 M14 60 L18 60 M14 84 L18 84')),
    N_(P_('M34 104 L34 108 M54 104 L54 108 M74 104 L74 108'))] },

  { id: 'voltamperograma', n: 'Voltamperograma cíclico', grp: 'caracter', area: 'Química',
    tags: ['voltamperometría', 'cíclica', 'CV', 'electroquímica', 'potencial', 'corriente', 'redox', 'pico'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 64 L88 64 M50 26 L50 104')),
    A_(P_('M24 62 Q38 60 48 44 Q54 34 62 40 Q72 48 84 52')),
    A_(P_('M84 52 Q72 60 62 74 Q54 86 46 80 Q36 72 24 62')),
    D_(P_('M48 44 L48 36 M62 74 L62 82')),
    N_(P_('M80 60 L86 64 L80 68 M54 30 L50 24 L46 30'))] },

  { id: 'sem', n: 'Microscopio electrónico de barrido', grp: 'caracter', area: 'Física',
    tags: ['SEM', 'MEB', 'microscopía electrónica', 'barrido', 'columna', 'morfología', 'micrografía', 'electrones'], fig: [
    G_(E_(50, 128, 34, 4)),
    S_(P_('M34 14 L66 14 L66 30 L60 30 L60 84 L40 84 L40 30 L34 30 Z')),
    S_(P_('M18 84 L82 84 L82 116 Q82 122 76 122 L24 122 Q18 122 18 116 Z')),
    M_(R_(32, 38, 36, 8, 2)), M_(R_(32, 56, 36, 8, 2)),
    V_(R_(24, 92, 24, 20, 2)),
    M_(R_(56, 96, 20, 10, 2)),
    LIQ(C_(50, 90, 3.5)),
    P_('M34 14 L66 14 L66 30 L60 30 L60 84 L40 84 L40 30 L34 30 Z'),
    P_('M18 84 L82 84 L82 116 Q82 122 76 122 L24 122 Q18 122 18 116 Z'),
    R_(32, 38, 36, 8, 2), R_(32, 56, 36, 8, 2), R_(24, 92, 24, 20, 2), R_(56, 96, 20, 10, 2),
    A_(P_('M50 32 L50 86')),
    D_(P_('M38 42 L62 42 M38 60 L62 60')),
    D_(P_('M28 98 L44 98 M28 104 L40 104 M60 110 L72 110')),
    B_(P_('M38 18 L38 28')), B_(P_('M24 88 L24 114'))] },

  { id: 'afm', n: 'Microscopio de fuerza atómica', grp: 'caracter', area: 'Física',
    tags: ['AFM', 'fuerza atómica', 'punta', 'cantiléver', 'topografía', 'rugosidad', 'nanoescala', 'barrido'], fig: [
    G_(E_(50, 126, 38, 4)),
    S_(P_('M10 100 Q30 92 50 96 Q70 100 90 92 L90 118 L10 118 Z')),
    M_(P_('M22 46 L58 62 L54 70 L18 54 Z')),
    M_(P_('M56 66 L60 94 L64 66 Z')),
    S_(R_(6, 14, 16, 16, 3)), S_(R_(74, 18, 16, 16, 3)),
    P_('M10 100 Q30 92 50 96 Q70 100 90 92'),
    P_('M22 46 L58 62 L54 70 L18 54 Z'),
    P_('M56 66 L60 94 L64 66 Z'),
    R_(6, 14, 16, 16, 3), R_(74, 18, 16, 16, 3),
    A_(P_('M18 30 L40 54 M40 54 L76 36')),
    D_(P_('M10 108 Q30 100 50 104 Q70 108 90 100')),
    D_(P_('M78 24 L86 24 M78 30 L86 30 M10 20 L18 20')),
    N_(C_(60, 96, 2.5)),
    B_(P_('M24 50 L50 62'))] },

  { id: 'potenciostato', n: 'Potenciostato', grp: 'caracter', area: 'Química',
    tags: ['potenciostato', 'electroquímica', 'voltamperometría', 'impedancia', 'electrodos', 'corriente', 'potencial'], fig: [
    G_(E_(50, 122, 42, 4)),
    S_(P_('M8 46 Q8 42 12 42 L88 42 Q92 42 92 46 L92 104 Q92 112 84 112 L16 112 Q8 112 8 104 Z')),
    V_(R_(16, 52, 44, 32, 3)),
    M_(C_(72, 60, 5)), M_(C_(72, 74, 5)), M_(C_(72, 88, 5)),
    M_(R_(16, 112, 10, 8, 2)), M_(R_(74, 112, 10, 8, 2)),
    P_('M8 46 Q8 42 12 42 L88 42 Q92 42 92 46 L92 104 Q92 112 84 112 L16 112 Q8 112 8 104 Z'),
    R_(16, 52, 44, 32, 3),
    C_(72, 60, 5), C_(72, 74, 5), C_(72, 88, 5),
    A_(P_('M20 74 Q30 72 36 62 Q42 54 50 60 Q54 64 56 68')),
    A_(P_('M56 68 Q50 76 42 78 Q32 80 20 74')),
    D_(C_(72, 60, 2)), D_(C_(72, 74, 2)), D_(C_(72, 88, 2)),
    D_(P_('M18 92 L40 92 M46 92 L58 92')),
    N_(P_('M77 60 Q88 58 96 48')), N_(P_('M77 74 Q90 74 98 72')), N_(P_('M77 88 Q90 90 96 98')),
    B_(P_('M14 50 L14 100'))] },

  { id: 'celda-3e', n: 'Celda de tres electrodos', grp: 'caracter', area: 'Química',
    tags: ['celda', 'tres electrodos', 'electroquímica', 'electrodo de trabajo', 'referencia', 'contraelectrodo', 'electrolito'], fig: [
    G_(E_(50, 130, 32, 4)),
    V_(P_('M22 52 L22 112 Q22 124 36 124 L64 124 Q78 124 78 112 L78 52 Z')),
    S_(P_('M18 44 L82 44 L82 54 L18 54 Z')),
    M_(R_(28, 20, 7, 76, 2)), M_(R_(46, 16, 9, 84, 2)), M_(R_(66, 20, 7, 76, 2)),
    LIQ(P_('M23 70 Q50 76 77 70 L77 112 Q77 123 64 123 L36 123 Q23 123 23 112 Z')),
    P_('M22 52 L22 112 Q22 124 36 124 L64 124 Q78 124 78 112 L78 52'),
    P_('M18 44 L82 44 L82 54 L18 54 Z'),
    R_(28, 20, 7, 76, 2), R_(46, 16, 9, 84, 2), R_(66, 20, 7, 76, 2),
    D_(P_('M23 70 Q50 76 77 70')),
    D_(P_('M46 86 L55 86 M28 28 L35 28 M66 28 L73 28')),
    A_(C_(31, 104, 3)), A_(C_(69, 104, 3)),
    B_(P_('M26 58 L26 110'))] },

  { id: 'bragg', n: 'Difracción de Bragg', grp: 'caracter', area: 'Física',
    tags: ['Bragg', 'difracción', 'planos', 'rayos X', 'ángulo', 'distancia interplanar', 'cristal', 'ley de Bragg'], fig: [
    S_(C_(8, 76, 4)), S_(C_(24, 76, 4)), S_(C_(40, 76, 4)), S_(C_(56, 76, 4)), S_(C_(72, 76, 4)), S_(C_(88, 76, 4)),
    S_(C_(8, 96, 4)), S_(C_(24, 96, 4)), S_(C_(40, 96, 4)), S_(C_(56, 96, 4)), S_(C_(72, 96, 4)), S_(C_(88, 96, 4)),
    S_(C_(8, 116, 4)), S_(C_(24, 116, 4)), S_(C_(40, 116, 4)), S_(C_(56, 116, 4)), S_(C_(72, 116, 4)), S_(C_(88, 116, 4)),
    D_(P_('M4 76 L96 76 M4 96 L96 96 M4 116 L96 116')),
    A_(P_('M12 20 L40 76 M40 76 L68 20')),
    A_(P_('M20 20 L58 96 M58 96 L96 20')),
    N_(P_('M80 76 L80 96 M77 80 L80 76 L83 80 M77 92 L80 96 L83 92')),
    N_(P_('M46 76 A18 18 0 0 0 40 62'))] },

  /* ---------- materiales y estructura ----------
     La celda, la red y la nanoestructura. Se dibujan en proyección oblicua
     —las aristas de atrás en papel de detalle— porque es la vista que se usa
     en un artículo de estado sólido y la que sigue leyéndose en blanco y negro. */
  { id: 'celda-unitaria', n: 'Celda unitaria cúbica', grp: 'materiales', area: 'Materiales',
    tags: ['celda unitaria', 'cúbica', 'cristal', 'red', 'estructura', 'parámetro de red', 'cristalografía', 'BCC'], fig: [
    G_(E_(56, 108, 32, 5)),
    D_(P_('M46 34 L86 34 L86 74 L46 74 Z')),
    D_(P_('M26 54 L46 34 M66 54 L86 34 M66 94 L86 74 M26 94 L46 74')),
    P_('M26 54 L66 54 L66 94 L26 94 Z'),
    S_(C_(46, 34, 5)), S_(C_(86, 34, 5)), S_(C_(86, 74, 5)), S_(C_(46, 74, 5)),
    S_(C_(26, 54, 5)), S_(C_(66, 54, 5)), S_(C_(66, 94, 5)), S_(C_(26, 94, 5)),
    LIQ(C_(56, 64, 8)), C_(56, 64, 8),
    N_(P_('M26 100 L66 100 M26 97 L26 103 M66 97 L66 103')),
    B_(P_('M24 58 L24 90'))] },

  { id: 'celda-hex', n: 'Celda unitaria hexagonal', grp: 'materiales', area: 'Materiales',
    tags: ['celda unitaria', 'hexagonal', 'HCP', 'wurtzita', 'cristal', 'red', 'estructura', 'cristalografía'], fig: [
    G_(E_(50, 120, 30, 5)),
    D_(P_('M26 88 L38 67 L62 67 L74 88')),
    D_(P_('M38 19 L38 67 M62 19 L62 67')),
    P_('M74 40 L62 61 L38 61 L26 40 L38 19 L62 19 Z'),
    P_('M74 88 L62 109 L38 109 L26 88'),
    P_('M74 40 L74 88 M62 61 L62 109 M38 61 L38 109 M26 40 L26 88'),
    S_(C_(38, 19, 4.5)), S_(C_(62, 19, 4.5)),
    S_(C_(74, 40, 4.5)), S_(C_(26, 40, 4.5)), S_(C_(62, 61, 4.5)), S_(C_(38, 61, 4.5)),
    S_(C_(74, 88, 4.5)), S_(C_(26, 88, 4.5)), S_(C_(62, 109, 4.5)), S_(C_(38, 109, 4.5)),
    LIQ(C_(50, 64, 7)), C_(50, 64, 7),
    B_(P_('M28 44 L28 84'))] },

  { id: 'red-cristalina', n: 'Red cristalina', grp: 'materiales', area: 'Materiales',
    tags: ['red cristalina', 'periodicidad', 'cristal', 'átomos', 'estructura', 'sólido', 'defecto', 'dopante'], fig: [
    G_(E_(54, 120, 38, 5)),
    D_(P_('M36 36 L92 36 M36 64 L92 64 M36 92 L92 92 M36 36 L36 92 M64 36 L64 92 M92 36 L92 92')),
    D_(P_('M24 48 L36 36 M52 48 L64 36 M80 48 L92 36 M24 76 L36 64 M52 76 L64 64 M80 76 L92 64 M24 104 L36 92 M52 104 L64 92 M80 104 L92 92')),
    P_('M24 48 L80 48 M24 76 L80 76 M24 104 L80 104 M24 48 L24 104 M52 48 L52 104 M80 48 L80 104'),
    S_(C_(36, 36, 4)), S_(C_(64, 36, 4)), S_(C_(92, 36, 4)),
    S_(C_(36, 64, 4)), S_(C_(64, 64, 4)), S_(C_(92, 64, 4)),
    S_(C_(36, 92, 4)), S_(C_(64, 92, 4)), S_(C_(92, 92, 4)),
    S_(C_(24, 48, 5.5)), S_(C_(52, 48, 5.5)), S_(C_(80, 48, 5.5)),
    S_(C_(24, 76, 5.5)), S_(C_(52, 76, 5.5)), S_(C_(80, 76, 5.5)),
    S_(C_(24, 104, 5.5)), S_(C_(52, 104, 5.5)), S_(C_(80, 104, 5.5)),
    LIQ(C_(52, 76, 4.4)),
    B_(P_('M20 54 L20 98'))] },

  { id: 'perovskita', n: 'Estructura tipo perovskita', grp: 'materiales', area: 'Materiales',
    tags: ['perovskita', 'ABX3', 'octaedro', 'celda unitaria', 'estructura', 'óxido', 'cristal'], fig: [
    G_(E_(56, 108, 32, 5)),
    D_(P_('M46 34 L86 34 L86 74 L46 74 Z')),
    D_(P_('M26 54 L46 34 M66 54 L86 34 M66 94 L86 74 M26 94 L46 74')),
    P_('M26 54 L66 54 L66 94 L26 94 Z'),
    A_(P_('M56 44 L36 64 L56 84 L76 64 Z')),
    A_(P_('M56 44 L46 74 L56 84 L66 54 Z')),
    A_(P_('M36 64 L46 74 L76 64 L66 54 Z')),
    S_(C_(46, 34, 4.5)), S_(C_(86, 34, 4.5)), S_(C_(86, 74, 4.5)), S_(C_(46, 74, 4.5)),
    S_(C_(26, 54, 4.5)), S_(C_(66, 54, 4.5)), S_(C_(66, 94, 4.5)), S_(C_(26, 94, 4.5)),
    LIQ(C_(56, 44, 4)), LIQ(C_(56, 84, 4)), LIQ(C_(36, 64, 4)), LIQ(C_(76, 64, 4)),
    LIQ(C_(46, 74, 4)), LIQ(C_(66, 54, 4)),
    M_(C_(56, 64, 5.5)), C_(56, 64, 5.5),
    B_(P_('M24 58 L24 90'))] },

  { id: 'nanoparticula', n: 'Nanopartícula', grp: 'materiales', area: 'Materiales',
    tags: ['nanopartícula', 'nanomaterial', 'coloide', 'faceta', 'ligando', 'tamaño', 'nanoescala', 'síntesis'], fig: [
    G_(E_(50, 118, 30, 5)),
    S_(P_('M50 26 L76 38 L84 64 L70 90 L44 96 L22 80 L18 52 L32 32 Z')),
    P_('M50 26 L76 38 L84 64 L70 90 L44 96 L22 80 L18 52 L32 32 Z'),
    D_(P_('M32 32 L50 62 L76 38 M50 62 L84 64 M50 62 L70 90 M50 62 L22 80 M50 62 L18 52 M50 62 L44 96')),
    N_(P_('M50 26 L50 14 M76 38 L86 28 M84 64 L96 66 M70 90 L78 102 M44 96 L44 108 M22 80 L12 90 M18 52 L6 48 M32 32 L24 20')),
    LIQ(C_(50, 62, 6)), C_(50, 62, 6),
    B_(P_('M26 48 L38 34'))] },

  { id: 'core-shell', n: 'Nanopartícula núcleo-coraza', grp: 'materiales', area: 'Materiales',
    tags: ['core-shell', 'núcleo', 'coraza', 'recubrimiento', 'nanopartícula', 'capa', 'híbrido', 'nanoescala'], fig: [
    G_(E_(50, 118, 30, 5)),
    V_(C_(50, 64, 38)),
    LIQ(C_(50, 64, 20)),
    C_(50, 64, 38), C_(50, 64, 20),
    N_(P_('M64 50 L77 37 M61 47 L67 53 M74 34 L80 40')),
    B_(P_('M26 44 A30 30 0 0 1 40 32'))] },

  { id: 'nanotubo', n: 'Nanotubo de carbono', grp: 'materiales', area: 'Materiales',
    tags: ['nanotubo', 'carbono', 'CNT', 'quiralidad', 'grafeno', 'nanoescala', 'cilindro'], fig: [
    G_(E_(50, 118, 38, 5)),
    V_(P_('M18 44 L78 44 A10 26 0 0 1 78 96 L18 96 A10 26 0 0 0 18 44 Z')),
    V_(E_(78, 70, 10, 26)),
    P_('M18 44 A10 26 0 0 0 18 96 M18 44 L78 44 M18 96 L78 96'),
    E_(78, 70, 10, 26),
    D_(E_(78, 70, 6, 16)),
    D_(P_('M24 52 L70 52 M22 62 L74 62 M22 78 L74 78 M24 88 L70 88')),
    D_(P_('M32 46 L28 94 M46 44 L42 96 M60 44 L56 96 M72 46 L68 94')),
    B_(P_('M22 54 L22 86'))] },

  { id: 'grafeno', n: 'Lámina de grafeno', grp: 'materiales', area: 'Materiales',
    tags: ['grafeno', 'carbono', '2D', 'lámina', 'panal', 'hexagonal', 'nanomaterial', 'red'], fig: [
    G_(E_(50, 118, 36, 5)),
    V_(P_(panal(18, 52, 5, 3, 9, 6))),
    P_(panal(18, 52, 5, 3, 9, 6)),
    LIQ(C_(48, 76, 5)), C_(48, 76, 5),
    N_(P_('M48 71 L48 62')),
    B_(P_('M12 52 L12 68'))] },

  { id: 'mof', n: 'Estructura tipo MOF', grp: 'materiales', area: 'Materiales',
    tags: ['MOF', 'red metalorgánica', 'poro', 'ligando', 'nodo metálico', 'porosidad', 'adsorción', 'reticular'], fig: [
    G_(E_(54, 120, 38, 5)),
    D_(P_('M36 36 L92 36 M36 64 L92 64 M36 92 L92 92 M36 36 L36 92 M64 36 L64 92 M92 36 L92 92')),
    D_(P_('M24 48 L36 36 M52 48 L64 36 M80 48 L92 36 M24 76 L36 64 M52 76 L64 64 M80 76 L92 64 M24 104 L36 92 M52 104 L64 92 M80 104 L92 92')),
    P_('M24 48 L80 48 M24 76 L80 76 M24 104 L80 104 M24 48 L24 104 M52 48 L52 104 M80 48 L80 104'),
    S_(R_(32, 32, 8, 8, 2)), S_(R_(60, 32, 8, 8, 2)), S_(R_(88, 32, 8, 8, 2)),
    S_(R_(32, 60, 8, 8, 2)), S_(R_(60, 60, 8, 8, 2)), S_(R_(88, 60, 8, 8, 2)),
    S_(R_(32, 88, 8, 8, 2)), S_(R_(60, 88, 8, 8, 2)), S_(R_(88, 88, 8, 8, 2)),
    S_(R_(20, 44, 8, 8, 2)), S_(R_(48, 44, 8, 8, 2)), S_(R_(76, 44, 8, 8, 2)),
    S_(R_(20, 72, 8, 8, 2)), S_(R_(48, 72, 8, 8, 2)), S_(R_(76, 72, 8, 8, 2)),
    S_(R_(20, 100, 8, 8, 2)), S_(R_(48, 100, 8, 8, 2)), S_(R_(76, 100, 8, 8, 2)),
    LIQ(C_(38, 62, 7)), C_(38, 62, 7), LIQ(C_(66, 90, 6)), C_(66, 90, 6),
    B_(P_('M18 54 L18 96'))] },

  { id: 'zeolita', n: 'Zeolita porosa', grp: 'materiales', area: 'Materiales',
    tags: ['zeolita', 'porosa', 'canal', 'tamiz molecular', 'aluminosilicato', 'catálisis', 'poro', 'microporo'], fig: [
    G_(E_(52, 122, 36, 5)),
    S_(P_('M18 50 L38 32 L90 32 L90 90 L70 108 L18 108 Z')),
    LIQ(P_(hexD(32, 66, 9) + ' ' + hexD(56, 66, 9) + ' ' + hexD(32, 92, 9) + ' ' + hexD(56, 92, 9))),
    P_('M18 50 L38 32 L90 32 L90 90 L70 108 L18 108 Z'),
    P_('M18 50 L70 50 L70 108 M70 50 L90 32'),
    D_(P_(hexD(32, 66, 9) + ' ' + hexD(56, 66, 9) + ' ' + hexD(32, 92, 9) + ' ' + hexD(56, 92, 9))),
    D_(P_(hexD(78, 42, 6) + ' ' + hexD(58, 42, 6))),
    A_(C_(32, 66, 3.4)), A_(C_(56, 92, 3.4)),
    B_(P_('M22 56 L22 100'))] },

  { id: 'pelicula', n: 'Película delgada', grp: 'materiales', area: 'Materiales',
    tags: ['película delgada', 'film', 'sustrato', 'recubrimiento', 'capa', 'espesor', 'depósito', 'sputtering'], fig: [
    G_(E_(52, 120, 40, 5)),
    S_(P_('M14 78 L14 106 L68 106 L68 78 Z')),
    S_(P_('M68 78 L92 58 L92 86 L68 106 Z')),
    LIQ(P_('M14 70 L38 50 L92 50 L68 70 Z')),
    LIQ(P_('M14 70 L14 78 L68 78 L68 70 Z')),
    LIQ(P_('M68 70 L92 50 L92 58 L68 78 Z')),
    P_('M14 78 L14 106 L68 106 M68 106 L92 86 L92 58 M68 78 L68 106'),
    P_('M14 70 L38 50 L92 50 L68 70 Z'),
    P_('M14 70 L14 78 L68 78 L68 70 M68 78 L92 58'),
    N_(P_('M8 70 L8 78 M5 70 L11 70 M5 78 L11 78')),
    A_(P_('M30 20 L30 36 M25 31 L30 36 L35 31')),
    A_(P_('M50 16 L50 32 M45 27 L50 32 L55 27')),
    A_(P_('M70 20 L70 36 M65 31 L70 36 L75 31')),
    B_(P_('M18 82 L18 102'))] },

  { id: 'polvo', n: 'Polvo cristalino', grp: 'materiales', area: 'Materiales',
    tags: ['polvo', 'cristalino', 'muestra', 'grano', 'molienda', 'sólido', 'partícula', 'vidrio de reloj'], fig: [
    G_(E_(50, 118, 38, 5)),
    V_(P_('M10 96 Q50 118 90 96 Q50 104 10 96 Z')),
    S_(P_('M22 96 Q28 74 38 68 Q46 62 50 54 Q56 64 64 70 Q74 76 78 96 Z')),
    P_('M10 96 Q50 118 90 96 Q50 104 10 96 Z'),
    P_('M22 96 Q28 74 38 68 Q46 62 50 54 Q56 64 64 70 Q74 76 78 96 Z'),
    D_(P_('M34 90 L40 80 L46 88 Z M52 92 L58 82 L64 90 Z M42 76 L48 68 L54 76 Z M28 92 L32 84 L36 92 Z M66 92 L70 84 L74 92 Z')),
    LIQ(P_('M44 62 L50 54 L56 62 L50 70 Z')), P_('M44 62 L50 54 L56 62 L50 70 Z'),
    B_(P_('M30 90 Q34 78 42 72'))] },

  { id: 'catalizador', n: 'Catalizador soportado', grp: 'materiales', area: 'Materiales',
    tags: ['catalizador', 'soporte', 'dispersión', 'nanopartícula', 'sitio activo', 'catálisis', 'heterogéneo'], fig: [
    G_(E_(50, 120, 34, 5)),
    V_(C_(50, 68, 38)), C_(50, 68, 38),
    D_(P_('M22 42 Q34 56 28 74 M70 40 Q62 58 74 72 M40 100 Q50 88 62 98')),
    S_(C_(34, 44, 7)), S_(C_(66, 40, 6)), S_(C_(78, 62, 6.5)), S_(C_(24, 70, 6)),
    S_(C_(44, 62, 7.5)), S_(C_(62, 76, 6)), S_(C_(38, 90, 6.5)), S_(C_(70, 92, 5.5)),
    LIQ(C_(44, 62, 4.6)), LIQ(C_(34, 44, 4.2)),
    A_(P_('M50 14 L50 24 M45 19 L50 24 L55 19')),
    N_(P_('M88 96 Q96 88 94 78')),
    B_(P_('M26 52 A32 32 0 0 1 40 38'))] },

  /* ---------- hidróxidos dobles laminares ----------
     Lo que hace falta para contar una hidrotalcita en una figura: la lámina, la
     galería con su anión y su agua, el octaedro que la forma, el efecto memoria y
     el patrón de difracción que la identifica. Son esquemas: la proporción 2:1 y
     el carbonato son el caso típico, no una composición medida. */
  { id: 'hdl', n: 'Hidróxido doble laminar (HDL)', grp: 'materiales', area: 'Materiales',
    tags: ['HDL', 'LDH', 'hidrotalcita', 'hidróxido doble laminar', 'arcilla aniónica', 'lámina', 'galería',
      'interlaminar', 'carbonato', 'espaciado basal', 'brucita', 'intercambio aniónico'], fig: [
    G_(E_(48, 124, 38, 4)),
    ...laminaHDL(10, 30, 62, 9, 14, -10, 10),
    ...laminaHDL(10, 68, 62, 9, 14, -10, 10),
    ...laminaHDL(10, 106, 62, 9, 14, -10, 10),
    carbonato(24, 50, 4.2), carbonato(52, 48, 4.2), ...agua(38, 49), ...agua(66, 46),
    carbonato(34, 88, 4.2), carbonato(62, 86, 4.2), ...agua(20, 87), ...agua(48, 85),
    N_(P_('M94 30 L94 68 M91 30 L97 30 M91 68 L97 68')),
    B_(P_('M30 25 L52 25'))] },

  { id: 'lamina-brucita', n: 'Lámina tipo brucita', grp: 'materiales', area: 'Materiales',
    tags: ['brucita', 'lámina', 'octaedro', 'HDL', 'LDH', 'hidrotalcita', 'catión trivalente', 'sustitución',
      'red triangular', 'superred'], fig: [
    G_(E_(52, 116, 40, 4)),
    S_(P_('M8 46 L68 46 L92 98 L32 98 Z')),
    S_(P_('M32 98 L92 98 L92 104 L32 104 Z')),
    ...redBrucita(14, 50, 12.8, 4.6, 10, 4),
    B_(P_('M36 101 L60 101'))] },

  { id: 'octaedro', n: 'Octaedro M(OH)₆', grp: 'materiales', area: 'Materiales',
    tags: ['octaedro', 'coordinación', 'hidroxilo', 'M(OH)6', 'catión', 'poliedro', 'HDL', 'brucita', 'estructura'], fig: [
    G_(E_(50, 124, 26, 4)),
    V_(P_('M50 20 L80 58 L50 108 L20 70 Z')),
    D_(P_('M36 46 L50 20 M36 46 L50 108 M36 46 L20 70 M36 46 L80 58')),
    P_('M64 82 L50 20 M64 82 L50 108 M64 82 L20 70 M64 82 L80 58'),
    LIQ(C_(50, 64, 8)), C_(50, 64, 8),
    M_(C_(50, 20, 5)), M_(C_(80, 58, 5)), M_(C_(50, 108, 5)), M_(C_(20, 70, 5)), M_(C_(64, 82, 5)), M_(C_(36, 46, 4)),
    N_(P_('M50 15 L50 9 M85 56 L91 54 M50 113 L50 119 M15 72 L9 74 M68 86 L72 91 M33 42 L30 37')),
    B_(P_('M28 66 L44 34'))] },

  { id: 'efecto-memoria', n: 'Efecto memoria de un HDL', grp: 'materiales', area: 'Materiales',
    tags: ['efecto memoria', 'reconstrucción', 'calcinación', 'óxido mixto', 'HDL', 'LDH', 'rehidratación',
      'hidrotalcita', 'adsorción'], fig: [
    G_(E_(50, 122, 30, 4)),
    ...laminaHDL(28, 26, 38, 6, 10, -7, 6),
    ...laminaHDL(28, 44, 38, 6, 10, -7, 6),
    carbonato(40, 37, 3), carbonato(58, 36, 3),
    S_(P_('M30 92 L38 84 L46 88 L44 98 L34 100 Z')), S_(P_('M48 86 L58 80 L66 86 L62 96 L50 96 Z')),
    S_(P_('M36 104 L46 100 L54 106 L48 114 L38 112 Z')), S_(P_('M56 100 L66 98 L72 106 L64 114 L56 110 Z')),
    D_(P_('M34 92 L42 92 M52 88 L60 88 M40 106 L48 106 M60 104 L66 106')),
    A_(P_('M80 44 Q92 66 78 86 M74 82 L78 86 L83 82')),
    A_(P_('M90 72 Q84 66 88 58 Q90 64 93 62 Q96 68 90 72')),
    A_(P_('M22 90 Q8 66 20 44 M16 49 L20 44 L25 48')),
    N_(P_('M10 60 Q6 66 10 69 Q14 66 10 60')),
    B_(P_('M31 29 L44 29'))] },

  /* ---------- síntesis por coprecipitación ---------- */
  { id: 'phmetro', n: 'pH-metro con electrodo', grp: 'sintesis', area: 'Química',
    tags: ['pH', 'pH-metro', 'electrodo de vidrio', 'medida', 'coprecipitación', 'control de pH', 'potenciometría'], fig: [
    G_(E_(52, 126, 44, 3)),
    S_(R_(6, 30, 48, 42, 4)),
    V_(R_(12, 36, 36, 16, 2)),
    D_(P_('M16 40 L22 40 L19 49 M29 40 L35 40 L35 49 L29 49 Z M38 40 L44 40 L44 49 L38 49 Z')), D_(C_(25.5, 48.6, 0.9)),
    M_(C_(18, 62, 3.4)), M_(C_(30, 62, 3.4)), M_(C_(42, 62, 3.4)),
    N_(P_('M54 40 Q70 40 74 18')),
    M_(R_(69, 12, 10, 10, 2)),
    V_(P_('M70 22 L78 22 L78 100 Q78 106 74 108 Q70 106 70 100 Z')),
    V_(P_('M58 76 L58 116 Q58 122 64 122 L90 122 Q96 122 96 116 L96 76')),
    LIQ(P_('M58.5 92 L95.5 92 L95.5 116 Q95.5 121.5 90 121.5 L64 121.5 Q58.5 121.5 58.5 116 Z')),
    D_(P_('M72 30 L72 96 M76 30 L76 96')),
    B_(P_('M10 34 L10 68'))] },

  { id: 'reactor-encamisado', n: 'Reactor encamisado', grp: 'sintesis', area: 'Química',
    tags: ['reactor', 'encamisado', 'camisa', 'termostato', 'agitación mecánica', 'coprecipitación', 'síntesis',
      'temperatura controlada'], fig: [
    G_(E_(50, 128, 36, 4)),
    V_(P_('M16 46 L16 104 Q16 124 50 124 Q84 124 84 104 L84 46 Z')),
    V_(P_('M24 44 L24 100 Q24 116 50 116 Q76 116 76 100 L76 44 Z')),
    LIQ(P_('M24.5 70 L75.5 70 L75.5 100 Q75.5 115.5 50 115.5 Q24.5 115.5 24.5 100 Z')),
    M_(R_(84, 52, 12, 6, 1)), M_(R_(4, 104, 12, 6, 1)),
    S_(R_(14, 36, 72, 8, 3)),
    S_(R_(38, 6, 24, 14, 3)), D_(P_('M43 13 L57 13')),
    M_(R_(47, 20, 6, 16, 1)),
    P_('M50 36 L50 102'), M_(P_('M36 102 L64 102 L60 96 L40 96 Z')),
    D_(P_('M20 60 L20 100 M80 60 L80 100')),
    B_(P_('M29 50 L29 104'))] },

  { id: 'coprecipitacion', n: 'Coprecipitación a pH constante', grp: 'sintesis', area: 'Química',
    tags: ['coprecipitación', 'pH constante', 'goteo', 'bureta', 'sales metálicas', 'base', 'HDL', 'LDH',
      'síntesis', 'precipitado', 'envejecimiento'], fig: [
    G_(E_(50, 132, 40, 3)),
    S_(R_(12, 118, 76, 10, 3)), D_(C_(78, 123, 2.4)), D_(P_('M18 123 L34 123')),
    V_(P_('M22 72 L22 110 Q22 118 30 118 L70 118 Q78 118 78 110 L78 72')),
    LIQ(P_('M22.5 88 L77.5 88 L77.5 110 Q77.5 117.5 70 117.5 L30 117.5 Q22.5 117.5 22.5 110 Z')),
    D_(R_(43, 110, 14, 4, 2)),
    D_(C_(34, 98, 1.3)), D_(C_(44, 102, 1.3)), D_(C_(62, 97, 1.3)), D_(C_(68, 104, 1.3)), D_(C_(38, 108, 1.3)), D_(C_(58, 106, 1.3)),
    V_(P_('M14 6 L14 52 L17 58 L17 64 L21 64 L21 58 L24 52 L24 6 Z')),
    LIQ(P_('M14.5 20 L23.5 20 L23.5 52 L20.5 57 L17.5 57 L14.5 52 Z')),
    M_(C_(19, 60, 3.4)), P_('M19 64 L26 78'),
    V_(P_('M76 6 L76 52 L79 58 L79 64 L83 64 L83 58 L86 52 L86 6 Z')),
    LIQ(P_('M76.5 26 L85.5 26 L85.5 52 L82.5 57 L79.5 57 L76.5 52 Z')),
    M_(C_(81, 60, 3.4)), P_('M81 64 L74 78'),
    A_(P_('M28 82 Q26 86 28 88 Q30 86 28 82 M72 82 Q70 86 72 88 Q74 86 72 82')),
    M_(R_(46, 28, 8, 8, 2)), N_(P_('M50 28 Q50 16 60 12 L66 10')),
    V_(P_('M47 36 L53 36 L53 104 Q53 109 50 110 Q47 109 47 104 Z')),
    B_(P_('M27 76 L27 110'))] },

  { id: 'drx-hdl', n: 'Difractograma de un HDL', grp: 'caracter', area: 'Química',
    tags: ['difractograma', 'DRX', 'XRD', 'HDL', 'LDH', 'hidrotalcita', '(003)', 'reflexiones basales',
      'espaciado basal', 'patrón'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 100 L27 100 L30 34 L33 100 L39 100 L42 62 L45 100 L52 100 Q56 82 60 100 L62 93 L64 100 L66 95 L68 100 L76 100 L78 88 L79.5 100 L81 90 L82.5 100 L88 100')),
    D_(P_('M30 28 L30 22 M42 56 L42 50 M56 80 L56 74 M79.5 82 L79.5 76')),
    N_(P_('M14 32 L18 32 M14 50 L18 50 M14 68 L18 68 M14 86 L18 86')),
    N_(P_('M30 104 L30 108 M46 104 L46 108 M62 104 L62 108 M78 104 L78 108'))] },

  /* ---------- biología ----------
     Convención de papeles, la misma que en el vidrio pero que hasta ahora solo
     estaba de hecho y no escrita:
       · G_ va la primera: una elipse plana bajo la pieza, la sombra de apoyo
         que la asienta en el papel. En un corte —la bicapa, la raíz— no hay
         suelo, así que va detrás, como masa que da profundidad.
       · B_ va el último y siempre en la mitad izquierda: la luz entra por
         arriba y por la izquierda, como en todo el catálogo.
       · Lo que representa un objeto lleva papel de cuerpo (S_ o V_). Sin él la
         pieza sale idéntica en «con cuerpo» y en «línea», y ahí es donde se
         nota que un dibujo es barato.
       · Lo de dentro de un cuerpo va en D_, que es el único papel que se pinta
         en negativo sobre el relleno del estilo sólido. N_ solo por fuera. */
  { id: 'celula-animal', n: 'Célula animal', grp: 'bio', fig: [
    G_(E_(50, 117, 32, 4)),
    S_(P_('M46 26 Q72 24 85 40 Q96 56 88 74 Q80 100 54 111 Q28 116 15 94 Q3 72 12 50 Q22 28 46 26 Z')),
    /* Núcleo con envoltura doble y nucléolo; a su derecha el retículo rugoso,
       con los ribosomas como puntadas sobre las cisternas. */
    D_(E_(38, 58, 17, 14)), D_(E_(38, 58, 13.5, 10.5)), D_(C_(35, 58, 4.2)),
    D_(P_('M30 51 Q36 48 43 51 M31 65 Q38 68 46 63')),
    D_(P_('M56 44 Q68 50 66 66 M60 40 Q75 47 72 68')),
    D_(P_('M57 46 L55 45 M62 48 L61 45 M66 54 L69 54 M65 62 L68 63 M64 41 L63 38 M70 46 L72 44 M74 54 L77 54 M72 64 L75 66')),
    D_(E_(67, 91, 12, 7)), D_(P_('M58 91 Q62 85 65 91 Q68 97 71 91 Q74 85 76 91')),
    D_(P_('M24 88 Q34 84 44 88 M25 94 Q34 90 43 94 M26 100 Q34 96 42 100')),
    D_(C_(47, 82, 2.2)), D_(C_(27, 102, 2.2)), D_(C_(62, 50, 5)),
    D_(P_('M20 44 L26 47 M22 41 L24 50')),
    B_(P_('M18 62 Q20 40 38 30'))] },
  { id: 'celula-vegetal', n: 'Célula vegetal', grp: 'bio', fig: [
    G_(E_(50, 113, 38, 4)),
    S_(R_(10, 34, 80, 74, 5)),
    D_(R_(16, 40, 68, 62, 4)),
    LIQ(R_(30, 66, 42, 28, 7)), D_(R_(30, 66, 42, 28, 7)),
    D_(E_(31, 58, 11, 9)), D_(C_(31, 58, 3.5)),
    D_(E_(62, 52, 10, 6)), D_(E_(74, 76, 8, 5)), D_(E_(44, 100, 9, 5)),
    D_(P_('M56 52 L68 52')), D_(P_('M68 74 L80 78')),
    B_(P_('M15 44 L15 96'))] },
  { id: 'bacteria', n: 'Bacteria', grp: 'bio', fig: [
    G_(E_(50, 97, 28, 4)),
    N_(R_(15, 46, 70, 50, 25)),
    S_(R_(19, 50, 62, 42, 21)),
    D_(R_(23, 54, 54, 34, 17)),
    /* Capsula, pared y membrana son tres trazos distintos porque son tres
       cosas distintas. El nucleoide es un lazo que se enrolla sobre sí mismo. */
    D_(P_('M37 63 Q27 67 31 76 Q38 84 48 80 Q58 77 54 68 Q50 60 40 62 Q34 63 36 69 Q39 74 45 72')),
    D_(P_('M27 58 L27 61 M45 55 L45 58 M62 57 L62 60 M72 60 L72 63 M31 84 L31 87 M52 84 L52 87 M25 71 L25 74')),
    D_(E_(67, 79, 6, 4)),
    M_(R_(79, 67, 5, 8, 2.5)),
    P_('M84 71 Q90 62 95 70 Q99 78 93 86'),
    N_(P_('M44 46 L43 38 M56 46 L58 38 M44 96 L43 104 M56 96 L58 103 M20 58 L13 52 M80 58 L87 52 M20 84 L13 90')),
    B_(P_('M26 60 Q27 55 34 53'))] },
  { id: 'virus', n: 'Virus', grp: 'bio', fig: [
    G_(E_(50, 105, 20, 4)),
    /* Envoltura (doble trazo, que es una bicapa) y dentro la nucleocápside con
       su genoma enrollado; las espículas llevan mango y cabeza. */
    S_(C_(50, 68, 26)), D_(C_(50, 68, 22)), D_(C_(50, 68, 14)),
    D_(P_('M40 61 Q45 56 50 63 Q55 70 60 65 M40 73 Q45 68 50 75 Q55 82 60 77')),
    B_(P_('M31 58 A22 22 0 0 1 43 47'))]
    .concat(espiculas(50, 68, 26, 33, [6, 38, 63, 97, 121, 152, 184, 211, 243, 268, 299, 331])) },
  { id: 'bacteriofago', n: 'Bacteriófago', grp: 'bio', fig: [
    G_(E_(50, 129, 26, 4)),
    S_(P_('M50 18 L69 30 L69 52 L50 64 L31 52 L31 30 Z')),
    D_(P_('M50 18 L50 40 L31 30 M50 40 L69 30 M50 40 L50 64')),
    S_(R_(44, 64, 12, 26, 2)), D_(P_('M44 72 L56 72 M44 80 L56 80')),
    M_(R_(36, 89, 28, 5, 2)),
    P_('M42 94 L34 116'), P_('M50 94 L50 118'), P_('M58 94 L66 116'),
    P_('M34 116 L27 122'), P_('M66 116 L73 122'), P_('M50 118 L50 126'),
    B_(P_('M36 32 L48 25'))] },
  { id: 'adn', n: 'ADN', grp: 'bio', fig: [
    G_(E_(50, 131, 20, 4)),
    S_(cintaQ(ADN_HEBRA, 3.4)), S_(cintaQ(espejoQ(ADN_HEBRA), 3.4)),
    /* Los pares de bases: la mitad larga es la purina y la corta la pirimidina,
       y de qué lado cae la larga lo dice esta secuencia, escrita a mano. */
    A_(P_('M48 27 L61 27 M39 33 L52 33 M41.5 47 L51 47 M48 54 L62.5 54 M48.5 61 L58.5 61 M39 75 L52 75 M48 81 L61 81 M41.5 95 L51 95 M37.5 102 L52 102 M48.5 109 L58.5 109')),
    N_(P_('M39 27 L48 27 M52 33 L61 33 M51 47 L58.5 47 M37.5 54 L48 54 M41.5 61 L48.5 61 M52 75 L61 75 M39 81 L48 81 M51 95 L58.5 95 M52 102 L62.5 102 M41.5 109 L48.5 109')),
    /* Las dos hebras son antiparalelas: los galones lo dicen sin una palabra. */
    D_(P_('M31 51 L34 55 L37 51 M63 57 L66 53 L69 57')),
    B_(P_('M38 25 Q30 30 38 35'))] },
  { id: 'cromosoma', n: 'Cromosoma', grp: 'bio', fig: [
    G_(E_(50, 130, 26, 4)),
    S_(P_('M28 24 Q28 16 36 16 Q45 16 45 24 L45 44 Q49 48 49 52 Q49 56 45 60 L45 116 Q45 124 36 124 Q28 124 28 116 L28 60 Q38 56 38 52 Q38 48 28 44 Z')),
    S_(P_('M72 24 Q72 16 64 16 Q55 16 55 24 L55 44 Q51 48 51 52 Q51 56 55 60 L55 116 Q55 124 64 124 Q72 124 72 116 L72 60 Q62 56 62 52 Q62 48 72 44 Z')),
    /* El bandeo va a la misma altura en las dos cromátidas, que para eso son
       hermanas; las dos bandas de los extremos hacen de telómero. */
    D_(P_('M30 22 L43 22 M30 30 L43 30 M30 32.5 L43 32.5 M30 40 L43 40 M30 62 L43 62 M30 71 L43 71 M30 73.5 L43 73.5 M30 84 L43 84 M30 97 L43 97 M30 99.5 L43 99.5 M30 110 L43 110 M30 118 L43 118')),
    D_(P_('M57 22 L70 22 M57 30 L70 30 M57 32.5 L70 32.5 M57 40 L70 40 M57 62 L70 62 M57 71 L70 71 M57 73.5 L70 73.5 M57 84 L70 84 M57 97 L70 97 M57 99.5 L70 99.5 M57 110 L70 110 M57 118 L70 118')),
    M_(E_(43, 52, 4, 3)), M_(E_(57, 52, 4, 3)),
    B_(P_('M33 28 L33 44 M33 62 L33 104'))] },
  { id: 'neurona', n: 'Neurona', grp: 'bio', fig: [
    G_(E_(48, 136, 26, 3.5)),
    /* Soma piramidal: la dendrita apical sale gruesa del vértice y las basales
       de la base, que es lo que distingue una neurona de una estrella. Apical y
       soma van en un solo contorno: como dos cuerpos sueltos se cruzaban en el
       vértice y la apical cerraba con una raya por dentro del soma. */
    S_(P_('M45 7 Q49 19 52 30 Q62 33 69 46 Q74 57 64 57 L53 57 L52 61 L44 61 L43 57 L31 57 Q22 58 26 48 Q33 35 43 31 Q41 19 38 8 Z')),
    P_('M40 9 Q32 5 24 4 M42 8 L43 2 M44 9 Q52 5 60 6'),
    N_(P_('M24 4 L17 2 M24 4 L20 9 M60 6 L67 3 M60 6 L65 11')),
    P_('M34 52 Q20 58 8 58 M36 46 Q22 38 12 34 M62 52 Q78 56 90 52 M60 46 Q74 42 84 40'),
    N_(P_('M8 58 L2 55 M8 58 L4 63 M12 34 L6 30 M12 34 L6 39 M90 52 L96 48 M90 52 L96 57 M84 40 L90 36 M84 40 L91 43')),
    D_(E_(45, 42, 9, 7)), D_(P_('M39 43 Q44 39 50 43')),
    /* El cono axónico: donde el soma se estrecha para dar el axón. */
    D_(P_('M43 52 Q48 55 53 52')),
    /* La vaina va a trozos y entre trozo y trozo asoma el axón: eso son los
       nódulos de Ranvier, y por eso el axón se dibuja solo en los huecos. */
    M_(R_(43.5, 60, 9, 16, 4.5)), M_(R_(43.5, 80, 9, 16, 4.5)), M_(R_(43.5, 100, 9, 16, 4.5)),
    P_('M48 56 L48 60 M48 76 L48 80 M48 96 L48 100 M48 116 L48 119'),
    D_(P_('M44 64 L52 64 M44 84 L52 84 M44 104 L52 104')),
    P_('M48 119 Q40 123 34 128 M48 119 L48 131 M48 119 Q56 123 62 128'),
    M_(C_(32, 130, 3)), M_(C_(48, 133, 3)), M_(C_(64, 130, 3)),
    /* El reflejo baja por la apical: en el soma no cabe sin comerse el núcleo. */
    B_(P_('M43.5 12 Q44.5 20 45.5 28'))] },
  { id: 'mitocondria', n: 'Mitocondria', grp: 'bio', fig: [
    G_(E_(50, 99, 30, 4)),
    S_(E_(50, 70, 40, 25)),
    /* Membrana interna: es ella la que se pliega, así que las crestas salen de
       su trazo y no flotan sueltas dentro de la elipse. Se alternan arriba y
       abajo para que ninguna se cruce con la de enfrente. */
    D_(P_('M20 62 Q20 52 29 52 Q28 74 33 80 Q38 74 37 52 L45 52 Q44 78 49 84 Q54 78 53 52 L61 52 Q60 72 65 78 Q70 72 69 52 Q80 52 80 62 L80 78 Q80 88 69 88 L61 88 Q62 66 57 60 Q52 66 53 88 L45 88 Q46 62 41 56 Q36 62 37 88 L29 88 Q20 88 20 78 Z')),
    D_(C_(25, 70, 1.8)), D_(C_(75, 72, 1.8)),
    B_(P_('M21 60 Q30 51 44 49'))] },
  { id: 'cloroplasto', n: 'Cloroplasto', grp: 'bio', fig: [
    G_(E_(50, 99, 30, 4)),
    S_(E_(50, 70, 38, 24)),
    LIQ(E_(31, 61, 8, 4.5)), LIQ(E_(31, 79, 8, 4.5)), LIQ(E_(57, 59, 8, 4.5)),
    LIQ(E_(57, 77, 8, 4.5)), LIQ(E_(72, 68, 7, 4)),
    D_(E_(31, 61, 8, 4.5)), D_(E_(31, 79, 8, 4.5)), D_(E_(57, 59, 8, 4.5)),
    D_(E_(57, 77, 8, 4.5)), D_(E_(72, 68, 7, 4)),
    D_(P_('M39 61 L49 59 M39 79 L49 77 M65 59 L72 64')),
    B_(P_('M24 60 Q36 50 54 49'))] },
  { id: 'nucleo', n: 'Núcleo celular', grp: 'bio', fig: [
    G_(E_(50, 107, 26, 4)),
    S_(C_(50, 70, 32)), D_(C_(50, 70, 24)),
    D_(E_(44, 64, 9, 7)), D_(P_('M56 78 Q62 74 64 80')),
    M_(C_(22, 61, 2.8)), M_(C_(29, 46, 2.8)), M_(C_(50, 38, 2.8)), M_(C_(71, 47, 2.8)),
    M_(C_(80, 67, 2.8)), M_(C_(72, 92, 2.8)), M_(C_(50, 102, 2.8)), M_(C_(28, 94, 2.8)),
    B_(P_('M28 58 A28 28 0 0 1 42 44'))] },
  { id: 'membrana', n: 'Bicapa lipídica', grp: 'bio', fig: [
    /* Un corte no se apoya en nada: la sombra va detrás y de lado a lado,
       marcando el interior hidrófobo. Sin bordes propios no parece una caja. */
    G_(R_(0, 53, 100, 34, 0))]
    /* La proteína va centrada y los lípidos repartidos a los dos lados: con
       cuatro a la izquierda y uno a la derecha la bicapa se caía de lado. */
    .concat(monocapa([7, 19, 31, 69, 81, 93], 48, 1), monocapa([7, 19, 31, 69, 81, 93], 92, -1), [
      /* El colesterol se mete de canto entre las colas, con el hidroxilo
         arrimado a las cabezas: por eso el bloque toca la fila de cabezas. */
      M_(R_(22.7, 55, 4.6, 12, 2.3)), N_(P_('M25 67 Q26.2 70 25.2 73')),
      M_(R_(72.7, 73, 4.6, 12, 2.3)), N_(P_('M75 73 Q73.2 70 74.2 67')),
      S_(P_('M46 40 Q40 42 40 52 Q38 70 40 88 Q40 98 46 100 L54 100 Q60 98 60 88 Q62 70 60 52 Q60 42 54 40 Z')),
      D_(P_('M50 43 Q46 57 50 70 Q54 83 50 97')),
      D_(P_('M39 54 L61 54 M39 86 L61 86')),
      N_(P_('M46 40 Q43 33 50 32 Q57 33 54 40')),
      /* El reflejo baja por la pared de la proteína, que es el único cuerpo
         con sitio: sobre una cabeza de 4,6 de radio se la comía entera. */
      B_(P_('M43.5 60 Q42.5 70 43.5 82'))]) },
  { id: 'enzima', n: 'Enzima y sustrato', grp: 'bio', fig: [
    G_(E_(50, 116, 32, 4)),
    /* El hueco es estrecho de boca (12) y ancho por dentro (24): el sustrato
       entra y queda sujeto. Eso es el ajuste inducido, y se ve sin explicarlo.
       Tiene que sobrar hueco alrededor del sustrato, o no se ve que hay hueco. */
    S_(P_('M20 92 Q14 62 30 46 Q42 36 44 52 Q38 58 38 70 Q39 82 50 82 Q61 82 62 70 Q62 58 56 52 Q58 36 70 46 Q86 62 80 92 Q70 112 50 112 Q30 112 20 92 Z')),
    LIQ(P_('M50 58 L58.5 63 L58.5 73 L50 78 L41.5 73 L41.5 63 Z')),
    N_(P_('M50 58 L58.5 63 L58.5 73 L50 78 L41.5 73 L41.5 63 Z')),
    /* Los residuos catalíticos: lo único de la pieza que va en color, porque
       son el punto donde de verdad pasa algo. */
    A_(P_('M38.5 66 L41 67 M61.5 66 L59 67')),
    D_(P_('M28 70 Q24 86 32 98 M74 74 Q78 88 70 100')),
    B_(P_('M26 88 Q20 70 25 58'))] },
  { id: 'anticuerpo', n: 'Anticuerpo', grp: 'bio', fig: [
    G_(E_(50, 130, 18, 4)),
    S_(P_('M13 25 L45 71 L45 119 Q45 126 50 126 Q55 126 55 119 L55 71 L87 25 Q86 16 77 19 L50 62 L23 19 Q14 16 13 25 Z')),
    D_(P_('M27 45 L37 38 M73 45 L63 38')),
    D_(P_('M24 21 L36 38 M76 21 L64 38')),
    D_(P_('M45 75 L55 75 M45 96 L55 96')),
    A_(P_('M46 80 L54 80 M46 85 L54 85')),
    A_(P_('M16 23 Q20 19 24 21 M84 23 Q80 19 76 21')),
    B_(P_('M24 34 L40 57'))] },
  { id: 'colonias', n: 'Placa con colonias', grp: 'bio', fig: [
    G_(E_(50, 112, 36, 5)),
    V_(C_(50, 74, 38)), D_(C_(50, 74, 33)),
    LIQ(C_(38, 62, 5.5)), LIQ(C_(59, 55, 4)), LIQ(C_(67, 77, 6.5)),
    LIQ(C_(41, 89, 4.5)), LIQ(C_(57, 91, 3)), LIQ(C_(29, 77, 3.5)), LIQ(C_(50, 72, 3)),
    N_(C_(38, 62, 5.5)), N_(C_(67, 77, 6.5)), N_(C_(41, 89, 4.5)),
    B_(P_('M27 56 A34 34 0 0 1 45 40'))] },
  { id: 'microscopio', n: 'Microscopio', grp: 'bio', area: 'Física', tags: ['microscopía', 'óptico', 'aumento', 'muestra'], fig: [
    G_(E_(50, 129, 30, 4)),
    S_(P_('M26 126 Q30 112 50 112 Q70 112 74 126 Z')),
    S_(P_('M40 112 L40 88 Q40 80 48 76 L52 76 L52 112 Z')),
    S_(R_(26, 76, 46, 11, 3)),
    M_(P_('M49 76 L49 44 Q49 33 62 30 L62 40 Q57 42 57 46 L57 76 Z')),
    S_(R_(55, 16, 16, 16, 3)), M_(R_(44, 55, 12, 20, 2)),
    M_(C_(36, 96, 6.5)), M_(C_(36, 96, 2.5)),
    D_(P_('M32 82 L66 82')), D_(P_('M60 20 L66 20')),
    B_(P_('M52 48 L52 74'))] },
  { id: 'eppendorf', n: 'Tubo Eppendorf', grp: 'bio', fig: [
    G_(E_(50, 122, 12, 3)),
    V_(P_('M38 28 L40 96 Q42 112 50 118 Q58 112 60 96 L62 28 Z')),
    LIQ(P_('M42 86 Q50 90 58 86 L58 96 Q56 110 50 116 Q44 110 42 96 Z')),
    P_('M38 28 L40 96 Q42 112 50 118 Q58 112 60 96 L62 28'),
    V_(P_('M34 18 Q50 11 66 18 L66 28 L34 28 Z')),
    P_('M34 18 Q50 11 66 18 L66 28 L34 28 Z'), P_('M66 23 L77 17'),
    D_(P_('M42 86 Q50 90 58 86')), D_(P_('M41 60 L59 60')),
    B_(P_('M44 34 L45 92'))] },
  { id: 'micropipeta', n: 'Micropipeta', grp: 'bio', fig: [
    G_(E_(50, 128, 10, 3)),
    S_(R_(40, 10, 20, 15, 4)),
    S_(R_(43, 25, 14, 47, 2)), D_(R_(45, 32, 10, 12, 1)),
    S_(R_(37, 72, 26, 13, 4)),
    M_(P_('M46 85 L48 108 L52 108 L54 85 Z')),
    V_(P_('M48 108 L49 124 L51 124 L52 108 Z')), P_('M48 108 L49 124 L51 124 L52 108'),
    M_(P_('M60 40 L71 35')), S_(R_(66, 29, 11, 13, 2)),
    D_(P_('M45 52 L55 52 M45 58 L55 58')),
    B_(P_('M45 28 L45 68'))] },
  { id: 'gradilla', n: 'Gradilla', grp: 'bio', fig: [
    G_(E_(50, 115, 40, 4)),
    V_(P_('M23 48 L23 90 Q23 100 29 100 Q35 100 35 90 L35 48 Z')),
    V_(P_('M45 48 L45 90 Q45 100 51 100 Q57 100 57 90 L57 48 Z')),
    V_(P_('M67 48 L67 90 Q67 100 73 100 Q79 100 79 90 L79 48 Z')),
    LIQ(P_('M23.5 72 Q29 76 34.5 72 L34.5 90 Q34.5 99 29 99 Q23.5 99 23.5 90 Z')),
    LIQ(P_('M45.5 66 Q51 70 56.5 66 L56.5 90 Q56.5 99 51 99 Q45.5 99 45.5 90 Z')),
    LIQ(P_('M67.5 80 Q73 84 78.5 80 L78.5 90 Q78.5 99 73 99 Q67.5 99 67.5 90 Z')),
    P_('M23 48 L23 90 Q23 100 29 100 Q35 100 35 90 L35 48'),
    P_('M45 48 L45 90 Q45 100 51 100 Q57 100 57 90 L57 48'),
    P_('M67 48 L67 90 Q67 100 73 100 Q79 100 79 90 L79 48'),
    S_(R_(12, 76, 76, 32, 3)), D_(P_('M12 88 L88 88')),
    D_(P_('M23.5 72 Q29 76 34.5 72')), D_(P_('M45.5 66 Q51 70 56.5 66')),
    B_(P_('M27 54 L27 84'))] },
  { id: 'gel', n: 'Gel de electroforesis', grp: 'bio', fig: [
    G_(E_(50, 122, 34, 4)),
    V_(R_(12, 38, 76, 80, 3)),
    D_(R_(20, 44, 14, 6, 1)), D_(R_(43, 44, 14, 6, 1)), D_(R_(66, 44, 14, 6, 1)),
    LIQ(R_(21, 62, 12, 4, 1)), LIQ(R_(44, 58, 12, 4, 1)), LIQ(R_(67, 64, 12, 4, 1)),
    LIQ(R_(21, 78, 12, 4, 1)), LIQ(R_(44, 84, 12, 4, 1)), LIQ(R_(67, 80, 12, 4, 1)),
    LIQ(R_(44, 100, 12, 4, 1)), LIQ(R_(67, 98, 12, 4, 1)),
    P_('M12 38 L88 38 L88 118 L12 118 Z'),
    N_(P_('M14 30 L20 30 M17 27 L17 33')), N_(P_('M80 30 L86 30')),
    B_(P_('M17 46 L17 110'))] },
  { id: 'pcr', n: 'Termociclador', grp: 'bio', fig: [
    G_(E_(50, 115, 42, 4)),
    S_(R_(10, 54, 80, 58, 5)),
    S_(P_('M18 54 L18 40 Q18 33 26 33 L74 33 Q82 33 82 40 L82 54 Z')),
    D_(R_(23, 60, 36, 20, 2)),
    D_(C_(30, 66, 2.6)), D_(C_(38, 66, 2.6)), D_(C_(46, 66, 2.6)), D_(C_(53, 66, 2.6)),
    D_(C_(30, 74, 2.6)), D_(C_(38, 74, 2.6)), D_(C_(46, 74, 2.6)), D_(C_(53, 74, 2.6)),
    LIQ(R_(66, 60, 17, 13, 2)), D_(R_(66, 60, 17, 13, 2)),
    D_(P_('M20 94 L46 94 M20 102 L38 102')),
    M_(C_(72, 96, 5)),
    B_(P_('M15 60 L15 104'))] },
  { id: 'flujo', n: 'Campana de flujo', grp: 'bio', fig: [
    G_(E_(50, 132, 40, 4)),
    S_(R_(10, 20, 80, 84, 3)),
    D_(R_(18, 28, 64, 18, 2)),
    A_(P_('M26 50 L26 60 M38 50 L38 60 M50 50 L50 60 M62 50 L62 60 M74 50 L74 60')),
    V_(R_(18, 64, 64, 30, 2)), P_('M18 64 L82 64 L82 94 L18 94 Z'),
    S_(R_(10, 104, 80, 14, 2)),
    M_(L_(24, 118, 24, 128)), M_(L_(76, 118, 76, 128)),
    D_(P_('M22 34 L78 34 M22 40 L60 40')),
    B_(P_('M23 68 L23 90'))] },
  { id: 'hoja', n: 'Hoja', grp: 'bio', fig: [
    G_(E_(50, 130, 16, 4)),
    /* El margen aserrado no se pinta encima: cada diente es un quiebro del
       propio contorno, un arco que sale y una recta que vuelve a entrar. El
       diente entra solo 2: más hondo deja de ser una hoja y parece una piña.
       El ápice es acuminado porque el control sale casi pegado a la punta. */
    S_(P_('M50 10 Q56 14 57.5 25 L55.5 27 Q64 32 65.5 42 L63.5 44 Q69 50 69 56 L67 58 Q68 66 66 72 L64 74 Q63 82 58.5 88 L57 89 Q55 96 50 104 Q45 96 43 89 L41.5 88 Q37 82 36 74 L34 72 Q32 66 33 58 L31 56 Q31 50 34.5 44 L36.5 42 Q36 32 44.5 27 L42.5 25 Q44 14 50 10 Z')),
    M_(P_('M47 102 L48 124 Q50 129 52 124 L53 102 Z')),
    D_(P_('M50 20 L50 104')),
    /* Las secundarias mueren en el seno de un diente, que es adonde van. */
    D_(P_('M50 50 Q56 43 61 36 M50 50 Q44 43 39 36 M50 68 Q58 60 66 54 M50 68 Q42 60 34 54 M50 86 Q57 78 63 70 M50 86 Q43 78 37 70')),
    B_(P_('M46 29 Q44.5 33 44 37'))] },
  { id: 'raiz', n: 'Raíz', grp: 'bio', fig: [
    /* Aquí no hay suelo donde apoyarse: la sombra hace de tierra y va detrás,
       con el borde de abajo redondeado para que no parezca una caja. */
    G_(P_('M2 20 L98 20 L98 114 Q50 134 2 114 Z')),
    N_(P_('M4 20 L20 20 M26 20 L40 20 M60 20 L74 20 M80 20 L96 20')),
    S_(P_('M38 20 Q42 56 42 96 Q43 116 47 126 Q51 116 52 96 Q54 56 62 20 Z')),
    /* Cada lateral arranca con sus dos extremos sobre el contorno de la
       principal, no dentro: así se sueldan en Y en vez de cruzarse. */
    S_(P_('M40.2 44 Q30 52 21 72 Q25 75 27 68 Q34 57 40.7 52 Z')),
    S_(P_('M55.3 58 Q65 67 72 88 Q68 91 65.5 84 Q59 70 54.2 68 Z')),
    S_(P_('M41.9 86 Q35 95 31 110 Q35 112 37 105 Q40 96 42 94 Z')),
    N_(P_('M41 60 L34 57 M41.5 68 L34 66 M42 76 L35 75 M55.1 60 L62 58 M54.2 68 L62 66 M53.2 78 L61 77 M42 90 L36 89 M52.4 88 L59 87 M25 66 L20 63 M24 70 L19 68 M68 79 L73 77 M70 85 L75 84 M37 95 L32 93 M34 101 L29 99')),
    /* La cofia: el casquete que protege el meristemo en la punta. */
    D_(P_('M44.2 116 Q47 122 49.8 116')),
    A_(P_('M50 20 L50 8 M50 12 Q45 4 38 6 M50 12 Q55 4 62 6')),
    B_(P_('M43.5 26 Q44 40 44.8 56'))] },

  /* ---------- circuitos ----------
     Símbolos normalizados. El cuerpo va como metal para que se rellene en los
     estilos con cuerpo, y la señal en color de acento. */
  { id: 'pila', n: 'Pila', grp: 'circuito', fig: [
    L_(8, 70, 40, 70), M_(R_(38, 52, 4, 36, 1)), M_(R_(50, 61, 4, 18, 1)), L_(54, 70, 92, 70),
    N_(P_('M28 42 L28 52 M23 47 L33 47')), N_(P_('M63 47 L73 47'))] },
  { id: 'bateria', n: 'Batería', grp: 'circuito', fig: [
    L_(6, 70, 24, 70),
    M_(R_(24, 52, 4, 36, 1)), M_(R_(34, 60, 4, 20, 1)),
    M_(R_(44, 52, 4, 36, 1)), M_(R_(54, 60, 4, 20, 1)),
    M_(R_(64, 52, 4, 36, 1)), M_(R_(74, 60, 4, 20, 1)),
    L_(28, 70, 34, 70), L_(38, 70, 44, 70), L_(48, 70, 54, 70), L_(58, 70, 64, 70), L_(68, 70, 74, 70),
    L_(78, 70, 94, 70),
    N_(P_('M14 46 L14 56 M9 51 L19 51')), N_(P_('M81 51 L91 51'))] },
  { id: 'resistencia', n: 'Resistencia', grp: 'circuito', fig: [
    L_(6, 70, 24, 70), M_(R_(24, 57, 52, 26, 3)), P_('M24 57 L76 57 L76 83 L24 83 Z'),
    L_(76, 70, 94, 70),
    D_(P_('M32 57 L32 83 M40 57 L40 83 M60 57 L60 83')),
    B_(P_('M28 62 L72 62'))] },
  { id: 'condensador', n: 'Condensador', grp: 'circuito', fig: [
    L_(6, 70, 44, 70), M_(R_(42, 48, 4, 44, 1)), M_(R_(54, 48, 4, 44, 1)), L_(58, 70, 94, 70),
    A_(P_('M48 62 L52 62 M50 60 L50 64'))] },
  { id: 'inductor', n: 'Bobina', grp: 'circuito', fig: [
    L_(6, 70, 22, 70),
    P_('M22 70 A7 7 0 0 1 36 70 A7 7 0 0 1 50 70 A7 7 0 0 1 64 70 A7 7 0 0 1 78 70'),
    L_(78, 70, 94, 70), N_(P_('M22 76 L78 76'))] },
  { id: 'diodo', n: 'Diodo', grp: 'circuito', fig: [
    L_(6, 70, 36, 70), M_(P_('M36 53 L65 70 L36 87 Z')), P_('M36 53 L65 70 L36 87 Z'),
    M_(R_(63, 51, 4, 38, 1)), L_(67, 70, 94, 70)] },
  { id: 'led', n: 'LED', grp: 'circuito', fig: [
    L_(6, 70, 36, 70), M_(P_('M36 53 L65 70 L36 87 Z')), P_('M36 53 L65 70 L36 87 Z'),
    M_(R_(63, 51, 4, 38, 1)), L_(67, 70, 94, 70),
    A_(P_('M60 44 L74 30')), A_(P_('M68 30 L74 30 L74 36')),
    A_(P_('M70 48 L84 34')), A_(P_('M78 34 L84 34 L84 40'))] },
  { id: 'interruptor', n: 'Interruptor', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), M_(C_(33, 70, 3.4)), P_('M36 68 L66 50'), M_(C_(69, 70, 3.4)),
    L_(72, 70, 94, 70), N_(P_('M52 44 A22 22 0 0 1 58 54'))] },
  { id: 'lampara', n: 'Lámpara', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), M_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    A_(P_('M37 57 L63 83')), A_(P_('M63 57 L37 83')),
    B_(P_('M40 60 A18 18 0 0 1 50 54'))] },
  { id: 'amperimetro', n: 'Amperímetro', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M44 79 L50 59 L56 79')), D_(P_('M46.4 72 L53.6 72')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'voltimetro', n: 'Voltímetro', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M44 61 L50 81 L56 61')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'fuente-ac', n: 'Fuente alterna', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M39 70 Q44.5 56 50 70 Q55.5 84 61 70')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'tierra', n: 'Tierra', grp: 'circuito', fig: [
    L_(50, 28, 50, 64), M_(R_(29, 62, 42, 4, 2)), M_(R_(36, 74, 28, 4, 2)), M_(R_(43, 86, 14, 4, 2))] },
  { id: 'transistor', n: 'Transistor', grp: 'circuito', fig: [
    S_(C_(52, 70, 25)), P_('M27 70 A25 25 0 1 1 77 70 A25 25 0 1 1 27 70'),
    L_(18, 70, 40, 70), M_(R_(38, 53, 4, 34, 1)),
    P_('M42 62 L70 45'), P_('M42 78 L70 95'),
    L_(70, 28, 70, 45), L_(70, 95, 70, 112),
    M_(P_('M59 84 L71 95 L58 96 Z')),
    B_(P_('M36 60 A25 25 0 0 1 48 50'))] },
  { id: 'motor', n: 'Motor', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M42 79 L42 61 L50 74 L58 61 L58 79')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'osciloscopio', n: 'Osciloscopio', grp: 'circuito', fig: [
    G_(E_(50, 113, 40, 4)),
    S_(R_(10, 38, 80, 64, 5)),
    V_(R_(17, 46, 46, 36, 3)), P_('M17 46 L63 46 L63 82 L17 82 Z'),
    D_(P_('M21 64 L59 64 M40 48 L40 80')),
    A_(P_('M21 66 Q27 48 33 66 Q39 84 45 66 Q51 48 57 66')),
    M_(C_(74, 55, 6.5)), M_(C_(74, 55, 2)), M_(C_(74, 74, 5.5)), M_(C_(74, 74, 1.8)),
    D_(R_(67, 87, 16, 6, 2)),
    M_(L_(20, 102, 20, 112)), M_(L_(80, 102, 80, 112)),
    B_(P_('M21 50 L21 78'))] },
  { id: 'multimetro', n: 'Multímetro', grp: 'circuito', fig: [
    G_(E_(50, 121, 32, 4)),
    S_(R_(20, 24, 60, 94, 6)),
    V_(R_(27, 34, 46, 24, 2)), P_('M27 34 L73 34 L73 58 L27 58 Z'),
    D_(P_('M33 50 L38 50 M44 42 L44 50 M52 42 L52 50 M60 42 L60 50')),
    M_(C_(50, 78, 12.5)), D_(C_(50, 78, 12.5)), D_(P_('M50 78 L50 67')),
    D_(P_('M36 70 L33 66 M64 70 L67 66 M50 92 L50 96')),
    M_(C_(33, 105, 4.2)), M_(C_(50, 105, 4.2)), M_(C_(67, 105, 4.2)),
    B_(P_('M25 38 L25 100'))] },
  { id: 'generador', n: 'Generador de funciones', grp: 'circuito', fig: [
    G_(E_(50, 111, 40, 4)),
    S_(R_(10, 44, 80, 56, 5)),
    V_(R_(17, 52, 40, 22, 2)), P_('M17 52 L57 52 L57 74 L17 74 Z'),
    A_(P_('M21 64 Q27 53 33 64 Q39 75 45 64')),
    M_(C_(74, 61, 7.5)), M_(C_(74, 61, 2.2)), D_(P_('M74 61 L79 56')),
    M_(R_(63, 82, 9, 7, 2)), M_(R_(77, 82, 9, 7, 2)),
    M_(L_(20, 100, 20, 110)), M_(L_(80, 100, 80, 110)),
    B_(P_('M21 56 L21 70'))] },

  /* ---------- óptica y mecánica ---------- */
  { id: 'lente-conv', n: 'Lente convergente', grp: 'fisica', fig: [
    V_(P_('M50 24 Q67 70 50 116 Q33 70 50 24 Z')),
    P_('M50 24 Q67 70 50 116 Q33 70 50 24 Z'),
    A_(L_(12, 70, 88, 70)),
    N_(P_('M44 30 L50 23 L56 30')), N_(P_('M44 110 L50 117 L56 110')),
    B_(P_('M45 38 Q40 62 44 86'))] },
  { id: 'lente-div', n: 'Lente divergente', grp: 'fisica', fig: [
    V_(P_('M39 24 L61 24 Q50 70 61 116 L39 116 Q50 70 39 24 Z')),
    P_('M39 24 L61 24 Q50 70 61 116 L39 116 Q50 70 39 24 Z'),
    A_(L_(12, 70, 88, 70)),
    N_(P_('M44 20 L50 27 L56 20')), N_(P_('M44 120 L50 113 L56 120')),
    B_(P_('M44 32 Q52 68 44 104'))] },
  { id: 'espejo', n: 'Espejo cóncavo', grp: 'fisica', fig: [
    M_(P_('M62 22 Q33 70 62 118 L69 118 Q40 70 69 22 Z')),
    P_('M62 22 Q33 70 62 118'), P_('M69 22 Q40 70 69 118'),
    N_(P_('M66 30 L74 25 M65 46 L73 41 M64 62 L72 57 M64 78 L72 73 M65 94 L73 89 M66 110 L74 105')),
    A_(L_(12, 70, 58, 70)),
    B_(P_('M58 34 Q44 70 58 106'))] },
  { id: 'prisma', n: 'Prisma', grp: 'fisica', fig: [
    V_(P_('M50 24 L85 106 L15 106 Z')), P_('M50 24 L85 106 L15 106 Z'),
    A_(P_('M2 72 L36 72')),
    A_(P_('M64 86 L96 74')), A_(P_('M64 90 L96 88')), A_(P_('M64 94 L96 102')),
    B_(P_('M46 36 L28 90'))] },
  { id: 'laser', n: 'Láser', grp: 'fisica', fig: [
    G_(E_(37, 88, 26, 4)),
    S_(R_(12, 56, 48, 28, 4)), P_('M12 56 L60 56 L60 84 L12 84 Z'),
    M_(R_(58, 64, 6, 12, 2)),
    A_(P_('M64 70 L96 70')), A_(P_('M88 65 L97 70 L88 75')),
    D_(C_(24, 70, 4.5)), D_(R_(34, 62, 9, 7, 1)),
    B_(P_('M17 61 L55 61'))] },
  { id: 'rendija', n: 'Rendija', grp: 'fisica', fig: [
    M_(R_(40, 12, 20, 44, 1)), P_('M40 12 L60 12 L60 56 L40 56 Z'),
    M_(R_(40, 84, 20, 44, 1)), P_('M40 84 L60 84 L60 128 L40 128 Z'),
    A_(P_('M50 56 L50 84')),
    N_(P_('M66 60 L72 60 M66 80 L72 80 M69 60 L69 80'))] },
  { id: 'pantalla', n: 'Pantalla', grp: 'fisica', fig: [
    G_(E_(50, 134, 18, 3)),
    S_(R_(38, 14, 24, 110, 2)), P_('M38 14 L62 14 L62 124 L38 124 Z'),
    M_(L_(50, 124, 50, 132)), M_(L_(37, 132, 63, 132)),
    LIQ(R_(41, 40, 18, 5, 2)), LIQ(R_(41, 58, 18, 5, 2)), LIQ(R_(41, 76, 18, 5, 2)),
    D_(P_('M41 40 L59 40 M41 58 L59 58 M41 76 L59 76')),
    B_(P_('M42 22 L42 116'))] },
  { id: 'plano-inclinado', n: 'Plano inclinado', grp: 'fisica', fig: [
    G_(E_(50, 116, 42, 4)),
    S_(P_('M12 112 L88 112 L88 42 Z')), P_('M12 112 L88 112 L88 42 Z'),
    M_(R_(57, 60, 22, 18, 2)), P_('M57 60 L79 60 L79 78 L57 78 Z'),
    A_(P_('M74 86 L88 100')), A_(P_('M80 98 L88 100 L86 92')),
    N_(P_('M24 105 A18 18 0 0 1 36 99')),
    B_(P_('M60 64 L76 64'))] },
  { id: 'polea', n: 'Polea', grp: 'fisica', fig: [
    M_(C_(50, 44, 20)), P_('M30 44 A20 20 0 1 1 70 44 A20 20 0 1 1 30 44'),
    D_(C_(50, 44, 14)), M_(C_(50, 44, 4.5)),
    M_(L_(50, 24, 50, 12)), M_(R_(37, 8, 26, 5, 2)),
    P_('M30 46 L30 100'), P_('M70 46 L70 88'),
    S_(R_(19, 100, 22, 20, 2)), P_('M19 100 L41 100 L41 120 L19 120 Z'),
    S_(R_(59, 88, 22, 20, 2)), P_('M59 88 L81 88 L81 108 L59 108 Z'),
    B_(P_('M36 34 A20 20 0 0 1 48 26'))] },
  { id: 'resorte', n: 'Resorte con masa', grp: 'fisica', fig: [
    M_(R_(28, 10, 44, 5, 2)),
    N_(P_('M30 15 L26 21 M40 15 L36 21 M50 15 L46 21 M60 15 L56 21 M70 15 L66 21')),
    L_(50, 15, 50, 26),
    P_('M50 26 L64 34 L36 46 L64 58 L36 70 L64 82 L50 90'),
    S_(R_(33, 90, 34, 28, 3)), P_('M33 90 L67 90 L67 118 L33 118 Z'),
    D_(P_('M40 104 L60 104')),
    A_(P_('M78 96 L78 122')), A_(P_('M73 116 L78 123 L83 116')),
    B_(P_('M37 95 L37 113'))] },
  { id: 'pendulo', n: 'Péndulo', grp: 'fisica', fig: [
    M_(R_(20, 12, 60, 5, 2)),
    N_(P_('M24 17 L20 23 M34 17 L30 23 M44 17 L40 23 M54 17 L50 23 M64 17 L60 23 M74 17 L70 23')),
    N_(P_('M50 17 L50 100')),
    L_(50, 17, 74, 95), S_(C_(77, 102, 10)), P_('M67 102 A10 10 0 1 1 87 102 A10 10 0 1 1 67 102'),
    A_(P_('M50 78 A28 28 0 0 0 67 92')),
    B_(P_('M71 96 A10 10 0 0 1 77 93'))] },
  { id: 'masa', n: 'Bloque con fuerzas', grp: 'fisica', fig: [
    S_(R_(31, 56, 38, 34, 3)), P_('M31 56 L69 56 L69 90 L31 90 Z'),
    M_(R_(10, 90, 80, 4, 1)),
    N_(P_('M14 94 L10 100 M26 94 L22 100 M38 94 L34 100 M50 94 L46 100 M62 94 L58 100 M74 94 L70 100 M86 94 L82 100')),
    A_(P_('M69 73 L95 73')), A_(P_('M88 68 L96 73 L88 78')),
    A_(P_('M50 56 L50 24')), A_(P_('M45 31 L50 23 L55 31')),
    D_(P_('M38 73 L62 73')),
    B_(P_('M35 61 L35 85'))] },
  { id: 'dinamometro', n: 'Dinamómetro', grp: 'fisica', fig: [
    V_(R_(38, 22, 24, 84, 4)), P_('M38 22 L62 22 L62 106 L38 106 Z'),
    M_(P_('M50 10 A8 8 0 1 1 50 22')), M_(L_(50, 106, 50, 116)),
    M_(P_('M50 116 A8 8 0 1 0 50 128')),
    D_(P_('M42 42 L58 42 M42 54 L52 54 M42 66 L58 66 M42 78 L52 78 M42 90 L58 90')),
    A_(R_(40, 68, 20, 3, 1)),
    B_(P_('M43 28 L43 100'))] },
  { id: 'iman', n: 'Imán', grp: 'fisica', area: 'Física', tags: ['magnetismo', 'imán', 'campo magnético', 'magnetización'], fig: [
    G_(E_(50, 112, 36, 4)),
    S_(P_('M28 108 L28 62 A22 22 0 0 1 72 62 L72 108 L56 108 L56 62 A6 6 0 0 0 44 62 L44 108 Z')),
    LIQ(P_('M28 108 L28 92 L44 92 L44 108 Z')),
    P_('M28 108 L28 62 A22 22 0 0 1 72 62 L72 108 L56 108 L56 62 A6 6 0 0 0 44 62 L44 108 Z'),
    D_(L_(28, 92, 44, 92)), D_(L_(56, 92, 72, 92)),
    B_(P_('M33 84 L33 62 A17 17 0 0 1 42 49'))] },
  { id: 'solenoide', n: 'Solenoide', grp: 'fisica', fig: [
    P_('M22 84 A9 13 0 0 1 22 56'), P_('M22 56 L36 56'), P_('M36 56 A9 13 0 0 1 36 84'),
    P_('M36 84 L50 84'), P_('M50 84 A9 13 0 0 1 50 56'), P_('M50 56 L64 56'),
    P_('M64 56 A9 13 0 0 1 64 84'), P_('M64 84 L78 84'),
    L_(8, 70, 22, 70), L_(78, 70, 92, 70),
    A_(P_('M18 100 L84 100')), A_(P_('M77 95 L85 100 L77 105')),
    N_(P_('M22 44 L78 44'))] },
  { id: 'onda', n: 'Onda', grp: 'fisica', fig: [
    N_(L_(6, 70, 94, 70)),
    A_(P_('M8 70 Q20 34 32 70 Q44 106 56 70 Q68 34 80 70 Q86 88 92 78')),
    N_(P_('M20 50 L20 90')),
    N_(P_('M8 40 L32 40')), N_(P_('M8 35 L8 45')), N_(P_('M32 35 L32 45')),
    N_(P_('M8 40 L14 36 M8 40 L14 44')), N_(P_('M32 40 L26 36 M32 40 L26 44'))] },
  { id: 'vector', n: 'Vector', grp: 'fisica', fig: [
    A_(P_('M18 104 L79 41')), A_(P_('M66 42 L79 41 L78 54')),
    N_(P_('M18 104 L79 104')), N_(P_('M79 41 L79 104')),
    N_(P_('M33 104 A16 16 0 0 0 29 92'))] },
  { id: 'calorimetro', n: 'Calorímetro', grp: 'fisica', area: 'Química', tags: ['calorimetría', 'entalpía', 'calor', 'termodinámica'], fig: [
    G_(E_(50, 121, 30, 4)),
    S_(P_('M22 40 L26 118 L74 118 L78 40 Z')),
    LIQ(P_('M27 78 Q50 83 73 78 L72 116 L28 116 Z')),
    P_('M22 40 L26 118 L74 118 L78 40'),
    M_(R_(17, 36, 66, 5, 2)),
    S_(R_(35, 24, 30, 13, 2)), P_('M35 24 L65 24 L65 37 L35 37 Z'),
    M_(L_(50, 24, 50, 12)),
    M_(L_(59, 14, 59, 100)), M_(C_(59, 106, 5)),
    D_(P_('M27 78 Q50 83 73 78')), D_(P_('M56 40 L62 40')),
    B_(P_('M31 48 L33 110'))] },
  { id: 'banco', n: 'Banco óptico', grp: 'fisica', fig: [
    G_(E_(50, 112, 44, 4)),
    S_(R_(8, 94, 84, 14, 2)), P_('M8 94 L92 94 L92 108 L8 108 Z'),
    D_(P_('M14 94 L14 108 M26 94 L26 108 M38 94 L38 108 M50 94 L50 108 M62 94 L62 108 M74 94 L74 108 M86 94 L86 108')),
    M_(R_(20, 58, 8, 36, 1)), M_(R_(46, 50, 8, 44, 1)), M_(R_(70, 62, 8, 32, 1)),
    V_(E_(50, 50, 9, 5)), N_(E_(50, 50, 9, 5)),
    A_(P_('M12 40 L88 40')), A_(P_('M81 35 L89 40 L81 45')),
    B_(P_('M12 98 L88 98'))] },

  /* ---------- iconos ----------
     Pictogramas simples, centrados en la caja, para acompañar una idea.
     Comparten motor con el resto: color, estilo y salida a TikZ. */
  { id: 'ic-idea', n: 'Idea', grp: 'icono', fig: [
    S_(P_('M50 32 A20 20 0 0 1 62 68 L62 80 L38 80 L38 68 A20 20 0 0 1 50 32 Z')),
    P_('M50 32 A20 20 0 0 1 62 68 L62 80 L38 80 L38 68 A20 20 0 0 1 50 32 Z'),
    M_(R_(40, 84, 20, 6, 2)), M_(R_(42, 94, 16, 5, 2)),
    A_(P_('M50 20 L50 12 M28 30 L22 24 M72 30 L78 24 M22 52 L14 52 M78 52 L86 52')),
    D_(P_('M44 80 L44 66 M56 80 L56 66'))] },
  { id: 'ic-objetivo', n: 'Objetivo', grp: 'icono', fig: [
    C_(50, 70, 34), C_(50, 70, 22), S_(C_(50, 70, 10)),
    A_(P_('M50 70 L88 32')), A_(P_('M78 32 L88 32 L88 42'))] },
  { id: 'ic-reloj', n: 'Reloj', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32),
    D_(P_('M50 50 L50 70 L66 78')), D_(P_('M50 40 L50 44 M80 70 L76 70 M50 100 L50 96 M20 70 L24 70'))] },
  { id: 'ic-calendario', n: 'Calendario', grp: 'icono', fig: [
    S_(R_(18, 44, 64, 56, 5)), R_(18, 44, 64, 56, 5),
    D_(P_('M18 60 L82 60')), M_(L_(32, 36, 32, 50)), M_(L_(68, 36, 68, 50)),
    D_(P_('M30 72 L38 72 M46 72 L54 72 M62 72 L70 72 M30 86 L38 86 M46 86 L54 86'))] },
  { id: 'ic-lupa', n: 'Lupa', grp: 'icono', fig: [
    C_(44, 62, 24), C_(44, 62, 17), M_(P_('M62 80 L84 102')), M_(R_(76, 90, 8, 20, 4))] },
  { id: 'ic-grafica', n: 'Gráfica', grp: 'icono', fig: [
    P_('M20 34 L20 100 L84 100'),
    S_(R_(30, 76, 12, 22, 2)), S_(R_(48, 60, 12, 38, 2)), S_(R_(66, 44, 12, 54, 2)),
    A_(P_('M28 66 L44 54 L60 58 L80 34')), A_(C_(80, 34, 4))] },
  { id: 'ic-engranaje', n: 'Engranaje', grp: 'icono', fig: [
    S_(P_('M44 32 L56 32 L58 42 L67 46 L76 41 L84 49 L79 58 L83 67 L93 69 L93 81 L83 83 L79 92 L84 101 L76 109 L67 104 L58 108 L56 118 L44 118 L42 108 L33 104 L24 109 L16 101 L21 92 L17 83 L7 81 L7 69 L17 67 L21 58 L16 49 L24 41 L33 46 L42 42 Z')),
    P_('M44 32 L56 32 L58 42 L67 46 L76 41 L84 49 L79 58 L83 67 L93 69 L93 81 L83 83 L79 92 L84 101 L76 109 L67 104 L58 108 L56 118 L44 118 L42 108 L33 104 L24 109 L16 101 L21 92 L17 83 L7 81 L7 69 L17 67 L21 58 L16 49 L24 41 L33 46 L42 42 Z'),
    D_(C_(50, 75, 14))] },
  { id: 'ic-candado', n: 'Candado', grp: 'icono', fig: [
    S_(R_(24, 66, 52, 42, 6)), R_(24, 66, 52, 42, 6),
    M_(P_('M34 66 L34 52 A16 16 0 0 1 66 52 L66 66')),
    D_(C_(50, 84, 6)), D_(P_('M50 90 L50 98'))] },
  { id: 'ic-nube', n: 'Nube', grp: 'icono', fig: [
    S_(P_('M30 92 A16 16 0 0 1 32 60 A22 22 0 0 1 72 56 A18 18 0 0 1 74 92 Z')),
    P_('M30 92 A16 16 0 0 1 32 60 A22 22 0 0 1 72 56 A18 18 0 0 1 74 92 Z')] },
  { id: 'ic-datos', n: 'Base de datos', grp: 'icono', fig: [
    S_(P_('M22 46 A28 10 0 0 1 78 46 L78 96 A28 10 0 0 1 22 96 Z')),
    P_('M22 46 L22 96 A28 10 0 0 0 78 96 L78 46'),
    E_(50, 46, 28, 10), D_(P_('M22 63 A28 10 0 0 0 78 63')), D_(P_('M22 80 A28 10 0 0 0 78 80'))] },
  { id: 'ic-servidor', n: 'Servidor', grp: 'icono', fig: [
    S_(R_(20, 40, 60, 22, 4)), S_(R_(20, 68, 60, 22, 4)), S_(R_(20, 96, 60, 22, 4)),
    D_(C_(30, 51, 3)), D_(C_(30, 79, 3)), D_(C_(30, 107, 3)),
    D_(P_('M42 51 L70 51 M42 79 L70 79 M42 107 L70 107'))] },
  { id: 'ic-documento', n: 'Documento', grp: 'icono', fig: [
    S_(P_('M26 34 L62 34 L78 50 L78 110 L26 110 Z')),
    P_('M26 34 L62 34 L78 50 L78 110 L26 110 Z'), P_('M62 34 L62 50 L78 50'),
    D_(P_('M36 66 L68 66 M36 78 L68 78 M36 90 L58 90'))] },
  { id: 'ic-carpeta', n: 'Carpeta', grp: 'icono', fig: [
    S_(P_('M16 42 L42 42 L50 52 L84 52 L84 102 L16 102 Z')),
    P_('M16 42 L42 42 L50 52 L84 52 L84 102 L16 102 Z'), D_(P_('M16 62 L84 62'))] },
  { id: 'ic-correo', n: 'Correo', grp: 'icono', fig: [
    S_(R_(16, 48, 68, 46, 4)), R_(16, 48, 68, 46, 4),
    D_(P_('M16 52 L50 78 L84 52')), D_(P_('M16 90 L38 70 M84 90 L62 70'))] },
  { id: 'ic-ubicacion', n: 'Ubicación', grp: 'icono', fig: [
    S_(P_('M50 30 A24 24 0 0 1 74 54 Q74 76 50 110 Q26 76 26 54 A24 24 0 0 1 50 30 Z')),
    P_('M50 30 A24 24 0 0 1 74 54 Q74 76 50 110 Q26 76 26 54 A24 24 0 0 1 50 30 Z'),
    D_(C_(50, 54, 9))] },
  { id: 'ic-usuario', n: 'Persona', grp: 'icono', fig: [
    S_(C_(50, 52, 17)), C_(50, 52, 17),
    S_(P_('M20 108 A30 30 0 0 1 80 108 Z')), P_('M20 108 A30 30 0 0 1 80 108 Z')] },
  { id: 'ic-equipo', n: 'Equipo', grp: 'icono', fig: [
    S_(C_(34, 52, 13)), C_(34, 52, 13), S_(C_(66, 52, 13)), C_(66, 52, 13),
    S_(P_('M10 100 A24 24 0 0 1 58 100 Z')), P_('M10 100 A24 24 0 0 1 58 100 Z'),
    S_(P_('M42 100 A24 24 0 0 1 90 100 Z')), P_('M42 100 A24 24 0 0 1 90 100 Z')] },
  { id: 'ic-estrella', n: 'Estrella', grp: 'icono', fig: [
    S_(P_('M50 30 L60 60 L92 60 L66 79 L76 110 L50 91 L24 110 L34 79 L8 60 L40 60 Z')),
    P_('M50 30 L60 60 L92 60 L66 79 L76 110 L50 91 L24 110 L34 79 L8 60 L40 60 Z')] },
  { id: 'ic-corazon', n: 'Corazón', grp: 'icono', fig: [
    S_(P_('M50 108 Q14 82 14 58 A20 20 0 0 1 50 46 A20 20 0 0 1 86 58 Q86 82 50 108 Z')),
    P_('M50 108 Q14 82 14 58 A20 20 0 0 1 50 46 A20 20 0 0 1 86 58 Q86 82 50 108 Z')] },
  { id: 'ic-aviso', n: 'Aviso', grp: 'icono', fig: [
    S_(P_('M50 32 L88 104 L12 104 Z')), P_('M50 32 L88 104 L12 104 Z'),
    D_(P_('M50 58 L50 82')), D_(C_(50, 92, 3.5))] },
  { id: 'ic-check', n: 'Correcto', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(P_('M32 70 L44 84 L70 54'))] },
  { id: 'ic-cruz', n: 'Incorrecto', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(P_('M36 56 L64 84 M64 56 L36 84'))] },
  { id: 'ic-pregunta', n: 'Pregunta', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34),
    D_(P_('M40 60 A10 10 0 0 1 60 62 Q60 72 50 76 L50 82')), D_(C_(50, 92, 3.5))] },
  { id: 'ic-info', n: 'Información', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(C_(50, 54, 3.5)), D_(P_('M50 64 L50 88'))] },
  { id: 'ic-papelera', n: 'Papelera', grp: 'icono', fig: [
    M_(R_(22, 44, 56, 8, 2)), M_(R_(40, 34, 20, 10, 2)),
    S_(P_('M28 52 L32 108 L68 108 L72 52 Z')), P_('M28 52 L32 108 L68 108 L72 52 Z'),
    D_(P_('M42 62 L44 98 M58 62 L56 98'))] },
  { id: 'ic-descarga', n: 'Descargar', grp: 'icono', fig: [
    A_(P_('M50 32 L50 84')), A_(P_('M34 68 L50 86 L66 68')), M_(P_('M20 96 L20 110 L80 110 L80 96'))] },
  { id: 'ic-subida', n: 'Subir', grp: 'icono', fig: [
    A_(P_('M50 96 L50 44')), A_(P_('M34 60 L50 42 L66 60')), M_(P_('M20 100 L20 112 L80 112 L80 100'))] },
  { id: 'ic-sincronizar', n: 'Sincronizar', grp: 'icono', fig: [
    A_(P_('M24 70 A26 26 0 0 1 72 56')), A_(P_('M62 52 L74 55 L71 67')),
    A_(P_('M76 70 A26 26 0 0 1 28 84')), A_(P_('M38 88 L26 85 L29 73'))] },
  { id: 'ic-enlace', n: 'Enlace', grp: 'icono', fig: [
    M_(P_('M42 54 L34 46 A16 16 0 0 0 12 68 L20 76')), M_(P_('M58 86 L66 94 A16 16 0 0 0 88 72 L80 64')),
    A_(P_('M36 84 L64 56'))] },
  { id: 'ic-etiqueta', n: 'Etiqueta', grp: 'icono', fig: [
    S_(P_('M14 70 L48 36 L86 36 L86 74 L52 108 Z')), P_('M14 70 L48 36 L86 36 L86 74 L52 108 Z'),
    D_(C_(72, 50, 6))] },
  { id: 'ic-filtro', n: 'Filtro', grp: 'icono', fig: [
    S_(P_('M16 40 L84 40 L58 74 L58 106 L42 98 L42 74 Z')), P_('M16 40 L84 40 L58 74 L58 106 L42 98 L42 74 Z')] },
  { id: 'ic-ajustes', n: 'Ajustes', grp: 'icono', fig: [
    P_('M22 50 L78 50 M22 72 L78 72 M22 94 L78 94'),
    M_(C_(38, 50, 7)), M_(C_(62, 72, 7)), M_(C_(44, 94, 7))] },
  { id: 'ic-casa', n: 'Casa', grp: 'icono', fig: [
    S_(P_('M50 30 L90 64 L82 64 L82 108 L18 108 L18 64 L10 64 Z')),
    P_('M50 30 L90 64 L82 64 L82 108 L18 108 L18 64 L10 64 Z'),
    D_(R_(40, 80, 20, 28, 2))] },
  { id: 'ic-edificio', n: 'Edificio', grp: 'icono', fig: [
    S_(R_(22, 32, 56, 78, 3)), R_(22, 32, 56, 78, 3),
    D_(P_('M32 46 L42 46 M52 46 L62 46 M32 62 L42 62 M52 62 L62 62 M32 78 L42 78 M52 78 L62 78')),
    D_(R_(42, 92, 16, 18, 2))] },
  { id: 'ic-fabrica', n: 'Fábrica', grp: 'icono', fig: [
    S_(P_('M14 108 L14 66 L38 80 L38 66 L62 80 L62 66 L86 80 L86 108 Z')),
    P_('M14 108 L14 66 L38 80 L38 66 L62 80 L62 66 L86 80 L86 108 Z'),
    M_(R_(70, 34, 12, 30, 2)), D_(P_('M28 92 L36 92 M52 92 L60 92 M74 92 L80 92'))] },
  { id: 'ic-universidad', n: 'Universidad', grp: 'icono', fig: [
    S_(P_('M50 32 L92 52 L50 72 L8 52 Z')), P_('M50 32 L92 52 L50 72 L8 52 Z'),
    P_('M24 60 L24 88 Q50 104 76 88 L76 60'), M_(P_('M88 54 L88 84')), M_(C_(88, 88, 4))] },
  { id: 'ic-libro', n: 'Libro', grp: 'icono', fig: [
    S_(P_('M50 46 Q30 34 12 40 L12 100 Q30 94 50 106 Q70 94 88 100 L88 40 Q70 34 50 46 Z')),
    P_('M50 46 Q30 34 12 40 L12 100 Q30 94 50 106 Q70 94 88 100 L88 40 Q70 34 50 46 Z'),
    D_(P_('M50 46 L50 106'))] },
  { id: 'ic-birrete', n: 'Graduación', grp: 'icono', fig: [
    S_(P_('M50 36 L94 56 L50 76 L6 56 Z')), P_('M50 36 L94 56 L50 76 L6 56 Z'),
    P_('M26 64 L26 90 Q50 104 74 90 L74 64'), M_(P_('M90 58 L90 92')), M_(R_(86, 92, 8, 8, 3))] },
  { id: 'ic-lapiz', n: 'Lápiz', grp: 'icono', fig: [
    S_(P_('M22 100 L28 78 L74 32 L88 46 L42 92 Z')), P_('M22 100 L28 78 L74 32 L88 46 L42 92 Z'),
    D_(P_('M68 38 L82 52')), D_(P_('M28 78 L42 92'))] },
  { id: 'ic-regla', n: 'Regla', grp: 'icono', fig: [
    S_(R_(14, 58, 72, 26, 3)), R_(14, 58, 72, 26, 3),
    D_(P_('M26 58 L26 70 M38 58 L38 66 M50 58 L50 70 M62 58 L62 66 M74 58 L74 70'))] },
  { id: 'ic-clip', n: 'Adjunto', grp: 'icono', fig: [
    M_(P_('M70 52 L70 96 A20 20 0 0 1 30 96 L30 46 A12 12 0 0 1 54 46 L54 92 A5 5 0 0 1 44 92 L44 54'))] },
  { id: 'ic-bandera', n: 'Bandera', grp: 'icono', fig: [
    M_(P_('M26 30 L26 112')), S_(P_('M26 36 L80 36 L70 54 L80 72 L26 72 Z')),
    P_('M26 36 L80 36 L70 54 L80 72 L26 72 Z')] },
  { id: 'ic-trofeo', n: 'Trofeo', grp: 'icono', fig: [
    S_(P_('M32 32 L68 32 L68 62 A18 18 0 0 1 32 62 Z')), P_('M32 32 L68 32 L68 62 A18 18 0 0 1 32 62 Z'),
    M_(P_('M32 40 L20 40 A12 12 0 0 0 32 56')), M_(P_('M68 40 L80 40 A12 12 0 0 1 68 56')),
    M_(P_('M50 80 L50 94')), M_(R_(34, 94, 32, 10, 2)), M_(R_(28, 104, 44, 8, 2))] },
  { id: 'ic-cohete', n: 'Cohete', grp: 'icono', fig: [
    S_(P_('M50 24 Q70 46 70 78 L62 92 L38 92 L30 78 Q30 46 50 24 Z')),
    P_('M50 24 Q70 46 70 78 L62 92 L38 92 L30 78 Q30 46 50 24 Z'),
    D_(C_(50, 54, 8)), M_(P_('M30 74 L16 94 L34 88')), M_(P_('M70 74 L84 94 L66 88')),
    A_(P_('M44 96 L44 112 M50 98 L50 118 M56 96 L56 112'))] },
  { id: 'ic-globo', n: 'Mundo', grp: 'icono', fig: [
    C_(50, 70, 34), D_(E_(50, 70, 14, 34)), D_(P_('M18 58 L82 58 M18 82 L82 82')), D_(P_('M50 36 L50 104'))] },
  { id: 'ic-mapa', n: 'Mapa', grp: 'icono', fig: [
    S_(P_('M12 44 L36 34 L64 46 L88 36 L88 100 L64 110 L36 98 L12 108 Z')),
    P_('M12 44 L36 34 L64 46 L88 36 L88 100 L64 110 L36 98 L12 108 Z'),
    D_(P_('M36 34 L36 98 M64 46 L64 110'))] },
  { id: 'ic-brujula', n: 'Brújula', grp: 'icono', fig: [
    C_(50, 70, 34), S_(P_('M66 54 L56 76 L34 86 L44 64 Z')), P_('M66 54 L56 76 L34 86 L44 64 Z'), D_(C_(50, 70, 3))] },
  { id: 'ic-bateria', n: 'Batería', grp: 'icono', fig: [
    S_(R_(16, 52, 62, 36, 5)), R_(16, 52, 62, 36, 5), M_(R_(78, 63, 8, 14, 2)),
    LIQ(R_(22, 58, 34, 24, 2)), D_(R_(22, 58, 34, 24, 2))] },
  { id: 'ic-enchufe', n: 'Energía', grp: 'icono', fig: [
    A_(P_('M54 30 L32 74 L48 74 L44 110 L68 64 L52 64 Z')),
    S_(P_('M54 30 L32 74 L48 74 L44 110 L68 64 L52 64 Z'))] },
  { id: 'ic-sol', n: 'Sol', grp: 'icono', fig: [
    S_(C_(50, 70, 18)), C_(50, 70, 18),
    A_(P_('M50 40 L50 28 M50 100 L50 112 M20 70 L8 70 M80 70 L92 70 M29 49 L20 40 M71 91 L80 100 M71 49 L80 40 M29 91 L20 100'))] },
  { id: 'ic-gota', n: 'Gota', grp: 'icono', fig: [
    S_(P_('M50 30 Q78 66 78 82 A28 28 0 0 1 22 82 Q22 66 50 30 Z')),
    P_('M50 30 Q78 66 78 82 A28 28 0 0 1 22 82 Q22 66 50 30 Z'),
    B_(P_('M36 86 A16 16 0 0 0 44 98'))] },
  { id: 'ic-fuego', n: 'Fuego', grp: 'icono', fig: [
    S_(P_('M50 26 Q76 54 74 80 A24 24 0 0 1 26 80 Q26 62 40 50 Q42 66 52 62 Q58 50 50 26 Z')),
    P_('M50 26 Q76 54 74 80 A24 24 0 0 1 26 80 Q26 62 40 50 Q42 66 52 62 Q58 50 50 26 Z'),
    D_(P_('M50 96 A12 12 0 0 1 42 78 Q52 82 50 96 Z'))] },
  { id: 'ic-hoja', n: 'Sostenible', grp: 'icono', fig: [
    S_(P_('M22 106 Q22 44 84 38 Q86 100 26 102 Z')), P_('M22 106 Q22 44 84 38 Q86 100 26 102 Z'),
    D_(P_('M30 100 Q54 74 78 46'))] },
  { id: 'ic-reciclaje', n: 'Reciclaje', grp: 'icono', fig: [
    A_(P_('M50 34 L64 58 L50 58 Z')), A_(P_('M30 96 L20 72 L34 78 Z')), A_(P_('M76 92 L52 96 L60 84 Z')),
    P_('M56 40 L74 70 L64 76'), P_('M44 40 L26 70 L36 76'), P_('M34 98 L66 98')] },
  { id: 'ic-arbol', n: 'Árbol', grp: 'icono', fig: [
    S_(C_(50, 58, 26)), C_(50, 58, 26), S_(C_(32, 76, 16)), C_(32, 76, 16), S_(C_(68, 76, 16)), C_(68, 76, 16),
    M_(R_(45, 84, 10, 28, 2))] },
  { id: 'ic-rayo', n: 'Rayo', grp: 'icono', fig: [
    A_(P_('M56 28 L30 76 L46 76 L42 112 L70 62 L54 62 Z'))] },
  { id: 'ic-escudo', n: 'Protección', grp: 'icono', fig: [
    S_(P_('M50 28 L82 42 L82 74 Q82 98 50 112 Q18 98 18 74 L18 42 Z')),
    P_('M50 28 L82 42 L82 74 Q82 98 50 112 Q18 98 18 74 L18 42 Z'),
    D_(P_('M36 70 L46 82 L66 58'))] },
  { id: 'ic-llave', n: 'Llave', grp: 'icono', fig: [
    C_(34, 62, 18), C_(34, 62, 7), M_(P_('M47 75 L84 112')), M_(P_('M70 98 L80 88 M78 106 L88 96'))] },
  { id: 'ic-huella', n: 'Identidad', grp: 'icono', fig: [
    P_('M26 82 A24 24 0 0 1 74 82'), P_('M34 90 A16 16 0 0 1 66 90'), P_('M42 98 A8 8 0 0 1 58 98'),
    P_('M18 74 A32 32 0 0 1 82 74'), C_(50, 100, 3)] },
  { id: 'ic-atomo', n: 'Átomo', grp: 'icono', area: 'Física', tags: ['átomo', 'orbital', 'electrón', 'núcleo'], fig: [
    S_(C_(50, 70, 7)), E_(50, 70, 34, 13),
    P_('M31 44 A34 13 60 0 1 69 96'), P_('M69 44 A34 13 120 0 1 31 96')] },
  { id: 'ic-molecula', n: 'Molécula', grp: 'icono', area: 'Química', tags: ['molécula', 'enlace', 'estructura'], fig: [
    P_('M34 50 L50 74 L34 96 M50 74 L78 62 M50 74 L76 96'),
    S_(C_(34, 50, 9)), C_(34, 50, 9), S_(C_(50, 74, 10)), C_(50, 74, 10),
    S_(C_(34, 96, 8)), C_(34, 96, 8), S_(C_(78, 62, 8)), C_(78, 62, 8), S_(C_(76, 96, 8)), C_(76, 96, 8)] },
  { id: 'ic-cristal', n: 'Celda unitaria', grp: 'icono', area: 'Materiales', tags: ['celda unitaria', 'cristal', 'red', 'estructura', 'sólido'], fig: [
    P_('M28 52 L28 96 L64 112 L64 68 Z'), P_('M28 52 L58 38 L94 54 L64 68'),
    P_('M94 54 L94 98 L64 112'),
    M_(C_(28, 52, 3.5)), M_(C_(58, 38, 3.5)), M_(C_(94, 54, 3.5)), M_(C_(64, 68, 3.5)),
    M_(C_(28, 96, 3.5)), M_(C_(64, 112, 3.5)), M_(C_(94, 98, 3.5))] },
  { id: 'ic-microscopio', n: 'Análisis', grp: 'icono', fig: [
    M_(P_('M44 106 L44 74 A16 16 0 0 1 62 46')), S_(R_(56, 32, 16, 16, 3)), R_(56, 32, 16, 16, 3),
    M_(R_(26, 70, 30, 8, 2)), S_(P_('M24 112 Q50 102 76 112 Z')), P_('M24 112 Q50 102 76 112 Z'),
    D_(C_(36, 88, 6))] },
  { id: 'ic-muestra', n: 'Muestra', grp: 'icono', fig: [
    V_(P_('M38 32 L38 92 Q38 108 50 108 Q62 108 62 92 L62 32 Z')),
    LIQ(P_('M38.5 76 Q50 80 61.5 76 L61.5 92 Q61.5 107 50 107 Q38.5 107 38.5 92 Z')),
    P_('M38 32 L38 92 Q38 108 50 108 Q62 108 62 92 L62 32'), P_('M32 30 Q50 24 68 30'),
    D_(P_('M38.5 76 Q50 80 61.5 76')), B_(P_('M43 40 L43 84'))] },
  { id: 'ic-balanza', n: 'Equilibrio', grp: 'icono', fig: [
    M_(P_('M50 34 L50 104')), M_(R_(30, 104, 40, 8, 2)), P_('M16 50 L84 50'),
    P_('M16 50 L6 74 A11 11 0 0 0 26 74 Z'), P_('M84 50 L74 74 A11 11 0 0 0 94 74 Z'),
    S_(C_(50, 40, 5))] },
  { id: 'ic-crecimiento', n: 'Crecimiento', grp: 'icono', fig: [
    P_('M18 34 L18 102 L86 102'),
    A_(P_('M26 92 L44 70 L60 80 L82 44')), A_(P_('M70 44 L82 44 L82 56')),
    S_(R_(28, 88, 10, 12, 2)), S_(R_(46, 76, 10, 24, 2)), S_(R_(64, 60, 10, 40, 2))] },
  { id: 'ic-tiempo', n: 'Cronología', grp: 'icono', fig: [
    P_('M12 74 L88 74'), S_(C_(26, 74, 8)), C_(26, 74, 8), S_(C_(50, 74, 8)), C_(50, 74, 8), S_(C_(74, 74, 8)), C_(74, 74, 8),
    D_(P_('M26 52 L26 62 M50 52 L50 62 M74 52 L74 62'))] },
  { id: 'ic-proceso', n: 'Proceso', grp: 'icono', fig: [
    S_(R_(10, 58, 26, 26, 4)), R_(10, 58, 26, 26, 4),
    S_(R_(64, 58, 26, 26, 4)), R_(64, 58, 26, 26, 4),
    A_(P_('M40 71 L60 71')), A_(P_('M53 65 L61 71 L53 77'))] },
  { id: 'ic-red', n: 'Red', grp: 'icono', fig: [
    P_('M50 46 L24 92 M50 46 L76 92 M24 92 L76 92'),
    S_(C_(50, 40, 10)), C_(50, 40, 10), S_(C_(22, 96, 10)), C_(22, 96, 10), S_(C_(78, 96, 10)), C_(78, 96, 10)] },
  { id: 'ic-jerarquia', n: 'Jerarquía', grp: 'icono', fig: [
    S_(R_(38, 32, 24, 18, 3)), R_(38, 32, 24, 18, 3),
    P_('M50 50 L50 62 M20 62 L80 62 M20 62 L20 76 M50 62 L50 76 M80 62 L80 76'),
    S_(R_(8, 76, 24, 18, 3)), R_(8, 76, 24, 18, 3),
    S_(R_(38, 76, 24, 18, 3)), R_(38, 76, 24, 18, 3),
    S_(R_(68, 76, 24, 18, 3)), R_(68, 76, 24, 18, 3)] },
  { id: 'ic-presentacion', n: 'Presentación', grp: 'icono', fig: [
    S_(R_(14, 34, 72, 50, 4)), R_(14, 34, 72, 50, 4),
    M_(P_('M50 84 L50 98')), M_(P_('M34 112 L50 98 L66 112')),
    D_(P_('M26 68 L36 56 L48 64 L68 44'))] },
  { id: 'ic-megafono', n: 'Difusión', grp: 'icono', fig: [
    S_(P_('M18 60 L18 84 L38 84 L74 106 L74 38 L38 60 Z')), P_('M18 60 L18 84 L38 84 L74 106 L74 38 L38 60 Z'),
    A_(P_('M82 60 A18 18 0 0 1 82 84')), A_(P_('M90 50 A30 30 0 0 1 90 94')),
    M_(P_('M28 84 L32 108 L44 108 L40 88'))] },
  { id: 'ic-chat', n: 'Conversación', grp: 'icono', fig: [
    S_(P_('M14 44 L74 44 L74 88 L38 88 L22 102 L22 88 L14 88 Z')),
    P_('M14 44 L74 44 L74 88 L38 88 L22 102 L22 88 L14 88 Z'),
    D_(P_('M26 58 L62 58 M26 72 L52 72'))] },
  { id: 'ic-tiempo-arena', n: 'Reloj de arena', grp: 'icono', fig: [
    M_(R_(26, 30, 48, 7, 2)), M_(R_(26, 104, 48, 7, 2)),
    V_(P_('M32 37 L68 37 L52 70 L68 104 L32 104 L48 70 Z')),
    LIQ(P_('M40 90 L60 90 L64 103 L36 103 Z')),
    P_('M32 37 L68 37 L52 70 L68 104 L32 104 L48 70 Z')] },
  { id: 'ic-medalla', n: 'Reconocimiento', grp: 'icono', fig: [
    M_(P_('M34 26 L46 62 M66 26 L54 62')),
    S_(C_(50, 84, 26)), C_(50, 84, 26), D_(C_(50, 84, 17)),
    D_(P_('M50 74 L53 82 L61 82 L55 87 L57 95 L50 90 L43 95 L45 87 L39 82 L47 82 Z'))] },
  { id: 'ic-nota', n: 'Nota', grp: 'icono', fig: [
    S_(P_('M20 32 L80 32 L80 92 L60 112 L20 112 Z')), P_('M20 32 L80 32 L80 92 L60 112 L20 112 Z'),
    P_('M80 92 L60 92 L60 112'), D_(P_('M32 54 L68 54 M32 68 L68 68 M32 82 L52 82'))] },
  { id: 'ic-buscar-doc', n: 'Revisión', grp: 'icono', fig: [
    S_(P_('M22 28 L58 28 L74 44 L74 84 L22 84 Z')), P_('M22 28 L58 28 L74 44 L74 84 L22 84 Z'),
    D_(P_('M32 50 L60 50 M32 62 L52 62')),
    C_(62, 88, 18), M_(P_('M75 101 L90 116'))] },
  { id: 'ic-dinero', n: 'Costo', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32),
    D_(P_('M50 46 L50 94')), D_(P_('M62 56 A12 10 0 0 0 40 62 Q40 70 50 71 Q60 72 60 80 A12 10 0 0 1 38 84'))] },
  { id: 'ic-tiempo-rapido', n: 'Rapidez', grp: 'icono', fig: [
    A_(P_('M54 30 L34 68 L48 68 L44 110 L66 66 L52 66 Z')),
    P_('M12 48 L30 48 M8 66 L26 66 M14 84 L28 84')] },
  { id: 'ic-piezas', n: 'Encaje', grp: 'icono', fig: [
    S_(P_('M18 40 L54 40 L54 52 A8 8 0 0 1 54 68 L54 80 L18 80 Z')),
    P_('M18 40 L54 40 L54 52 A8 8 0 0 1 54 68 L54 80 L18 80 Z'),
    S_(P_('M58 62 L94 62 L94 102 L58 102 L58 90 A8 8 0 0 0 58 74 Z')),
    P_('M58 62 L94 62 L94 102 L58 102 L58 90 A8 8 0 0 0 58 74 Z')] },
  { id: 'ic-lista', n: 'Lista de tareas', grp: 'icono', fig: [
    S_(R_(20, 34, 60, 76, 4)), R_(20, 34, 60, 76, 4),
    D_(P_('M30 52 L36 58 L46 46 M52 54 L70 54')),
    D_(P_('M30 74 L36 80 L46 68 M52 76 L70 76')),
    D_(P_('M30 96 L36 102 M52 98 L70 98'))] },
  { id: 'ic-candado-abierto', n: 'Acceso abierto', grp: 'icono', fig: [
    S_(R_(24, 66, 52, 42, 6)), R_(24, 66, 52, 42, 6),
    M_(P_('M34 66 L34 52 A16 16 0 0 1 66 52')),
    D_(C_(50, 84, 6)), D_(P_('M50 90 L50 98'))] },
  { id: 'ic-camara', n: 'Imagen', grp: 'icono', fig: [
    S_(R_(12, 48, 76, 52, 5)), R_(12, 48, 76, 52, 5),
    M_(P_('M36 48 L42 38 L58 38 L64 48')), D_(C_(50, 74, 15)), D_(C_(50, 74, 8)), M_(C_(76, 58, 3))] },
  { id: 'ic-video', n: 'Video', grp: 'icono', fig: [
    S_(R_(12, 48, 54, 44, 5)), R_(12, 48, 54, 44, 5),
    S_(P_('M66 62 L88 50 L88 90 L66 78 Z')), P_('M66 62 L88 50 L88 90 L66 78 Z'),
    D_(P_('M28 70 L44 70'))] },
  { id: 'ic-calculadora', n: 'Cálculo', grp: 'icono', fig: [
    S_(R_(22, 30, 56, 82, 5)), R_(22, 30, 56, 82, 5),
    D_(R_(30, 38, 40, 16, 2)),
    D_(C_(36, 66, 3.5)), D_(C_(50, 66, 3.5)), D_(C_(64, 66, 3.5)),
    D_(C_(36, 82, 3.5)), D_(C_(50, 82, 3.5)), D_(C_(64, 82, 3.5)),
    D_(C_(36, 98, 3.5)), D_(C_(50, 98, 3.5)), D_(C_(64, 98, 3.5))] },
  { id: 'ic-termometro', n: 'Temperatura', grp: 'icono', fig: [
    V_(P_('M42 34 A8 8 0 0 1 58 34 L58 82 A14 14 0 1 1 42 82 Z')),
    LIQ(P_('M46 66 L54 66 L54 84 A10 10 0 1 1 46 84 Z')),
    P_('M42 34 A8 8 0 0 1 58 34 L58 82 A14 14 0 1 1 42 82 Z'),
    D_(P_('M58 46 L66 46 M58 56 L64 56 M58 66 L66 66'))] },
  { id: 'ic-alerta-triangulo', n: 'Riesgo', grp: 'icono', fig: [
    S_(P_('M50 30 L90 106 L10 106 Z')), P_('M50 30 L90 106 L10 106 Z'),
    D_(P_('M50 56 L50 80')), D_(C_(50, 92, 4))] },
  { id: 'ic-mano', n: 'Aporte', grp: 'icono', fig: [
    S_(P_('M36 108 L36 66 A6 6 0 0 1 48 66 L48 40 A6 6 0 0 1 60 40 L60 66 L70 66 A8 8 0 0 1 78 74 L78 96 A14 14 0 0 1 64 110 L44 110 Z')),
    P_('M36 108 L36 66 A6 6 0 0 1 48 66 L48 40 A6 6 0 0 1 60 40 L60 66 L70 66 A8 8 0 0 1 78 74 L78 96 A14 14 0 0 1 64 110 L44 110 Z'),
    M_(P_('M28 96 L36 96'))] },
  { id: 'ic-avion', n: 'Viaje', grp: 'icono', fig: [
    S_(P_('M50 26 Q58 42 58 62 L88 82 L88 92 L58 82 L56 100 L68 110 L68 116 L50 110 L32 116 L32 110 L44 100 L42 82 L12 92 L12 82 L42 62 Q42 42 50 26 Z')),
    P_('M50 26 Q58 42 58 62 L88 82 L88 92 L58 82 L56 100 L68 110 L68 116 L50 110 L32 116 L32 110 L44 100 L42 82 L12 92 L12 82 L42 62 Q42 42 50 26 Z')] },
  { id: 'ic-camion', n: 'Envío', grp: 'icono', fig: [
    S_(R_(10, 52, 46, 38, 3)), R_(10, 52, 46, 38, 3),
    S_(P_('M56 62 L76 62 L88 76 L88 90 L56 90 Z')), P_('M56 62 L76 62 L88 76 L88 90 L56 90 Z'),
    M_(C_(28, 96, 9)), M_(C_(74, 96, 9)), D_(C_(28, 96, 3.5)), D_(C_(74, 96, 3.5))] },
  { id: 'ic-mensaje', n: 'Notificación', grp: 'icono', fig: [
    S_(P_('M50 28 A22 22 0 0 1 72 50 Q72 76 82 92 L18 92 Q28 76 28 50 A22 22 0 0 1 50 28 Z')),
    P_('M50 28 A22 22 0 0 1 72 50 Q72 76 82 92 L18 92 Q28 76 28 50 A22 22 0 0 1 50 28 Z'),
    M_(P_('M40 100 A10 10 0 0 0 60 100'))] },
  { id: 'ic-mas', n: 'Añadir', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M50 52 L50 88 M32 70 L68 70'))] },
  { id: 'ic-menos', n: 'Quitar', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M32 70 L68 70'))] },
  { id: 'ic-pausa', n: 'Pausa', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(R_(39, 54, 8, 32, 2)), D_(R_(53, 54, 8, 32, 2))] },
  { id: 'ic-play', n: 'Reproducir', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M42 54 L70 70 L42 86 Z'))] },
  /* ---------- formas y llamadas ----------
     Se usan para señalar una zona de una figura o para poner una frase corta
     dentro. Admiten texto propio (el campo «texto dentro» del editor). */
  { id: 'fo-rect', n: 'Rectángulo', grp: 'forma', txt: 1, fig: [S_(R_(8, 40, 84, 60, 0)), R_(8, 40, 84, 60, 0)] },
  { id: 'fo-rect-r', n: 'Rectángulo suave', grp: 'forma', txt: 1, fig: [S_(R_(8, 40, 84, 60, 10)), R_(8, 40, 84, 60, 10)] },
  { id: 'fo-circulo', n: 'Círculo', grp: 'forma', txt: 1, fig: [S_(C_(50, 70, 40)), C_(50, 70, 40)] },
  { id: 'fo-ovalo', n: 'Óvalo', grp: 'forma', txt: 1, fig: [S_(E_(50, 70, 44, 30)), E_(50, 70, 44, 30)] },
  { id: 'fo-triangulo', n: 'Triángulo', grp: 'forma', txt: 1, fig: [S_(P_('M50 28 L92 108 L8 108 Z')), P_('M50 28 L92 108 L8 108 Z')] },
  { id: 'fo-rombo', n: 'Rombo', grp: 'forma', txt: 1, fig: [S_(P_('M50 26 L92 70 L50 114 L8 70 Z')), P_('M50 26 L92 70 L50 114 L8 70 Z')] },
  { id: 'fo-pentagono', n: 'Pentágono', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 26 L92 57 L76 108 L24 108 L8 57 Z')), P_('M50 26 L92 57 L76 108 L24 108 L8 57 Z')] },
  { id: 'fo-hexagono', n: 'Hexágono', grp: 'forma', txt: 1, fig: [
    S_(P_('M28 32 L72 32 L94 70 L72 108 L28 108 L6 70 Z')), P_('M28 32 L72 32 L94 70 L72 108 L28 108 L6 70 Z')] },
  { id: 'fo-estrella5', n: 'Estrella de cinco', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 24 L62 58 L98 58 L69 79 L80 114 L50 93 L20 114 L31 79 L2 58 L38 58 Z')),
    P_('M50 24 L62 58 L98 58 L69 79 L80 114 L50 93 L20 114 L31 79 L2 58 L38 58 Z')] },
  { id: 'fo-estrella6', n: 'Estrella de seis', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 24 L64 50 L92 50 L78 74 L92 98 L64 98 L50 124 L36 98 L8 98 L22 74 L8 50 L36 50 Z')),
    P_('M50 24 L64 50 L92 50 L78 74 L92 98 L64 98 L50 124 L36 98 L8 98 L22 74 L8 50 L36 50 Z')] },
  { id: 'fo-flecha', n: 'Flecha ancha', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 54 L60 54 L60 34 L96 70 L60 106 L60 86 L4 86 Z')),
    P_('M4 54 L60 54 L60 34 L96 70 L60 106 L60 86 L4 86 Z')] },
  { id: 'fo-flecha-doble', n: 'Flecha doble', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 70 L28 44 L28 58 L72 58 L72 44 L96 70 L72 96 L72 82 L28 82 L28 96 Z')),
    P_('M4 70 L28 44 L28 58 L72 58 L72 44 L96 70 L72 96 L72 82 L28 82 L28 96 Z')] },
  { id: 'fo-flecha-curva', n: 'Flecha curva', grp: 'forma', txt: 0, fig: [
    A_(P_('M12 100 Q12 42 74 42')), A_(P_('M62 30 L78 42 L62 54'))] },
  { id: 'fo-flecha-vuelta', n: 'Flecha de retorno', grp: 'forma', txt: 0, fig: [
    A_(P_('M14 56 Q50 20 86 56 Q50 96 20 74')), A_(P_('M20 62 L18 76 L32 76'))] },
  { id: 'fo-chevron', n: 'Galón', grp: 'forma', txt: 1, fig: [
    S_(P_('M6 40 L64 40 L94 70 L64 100 L6 100 L36 70 Z')), P_('M6 40 L64 40 L94 70 L64 100 L6 100 L36 70 Z')] },
  { id: 'fo-cinta', n: 'Cinta', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 46 L96 46 L96 94 L4 94 Z')), P_('M4 46 L96 46 L96 94 L4 94 Z'),
    M_(P_('M4 46 L4 106 L20 92 L36 106 L36 94')), M_(P_('M96 46 L96 106 L80 92 L64 106 L64 94'))] },
  { id: 'fo-bocadillo', n: 'Bocadillo', grp: 'forma', txt: 1, fig: [
    S_(P_('M8 34 L92 34 L92 92 L44 92 L26 112 L28 92 L8 92 Z')),
    P_('M8 34 L92 34 L92 92 L44 92 L26 112 L28 92 L8 92 Z')] },
  { id: 'fo-bocadillo-r', n: 'Bocadillo redondo', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 32 A42 28 0 0 1 50 88 L34 88 L22 108 L26 87 A42 28 0 0 1 50 32 Z')),
    P_('M50 32 A42 28 0 0 1 50 88 L34 88 L22 108 L26 87 A42 28 0 0 1 50 32 Z')] },
  { id: 'fo-pensamiento', n: 'Nube de pensamiento', grp: 'forma', txt: 1, fig: [
    S_(P_('M28 88 A16 16 0 0 1 30 54 A22 22 0 0 1 70 50 A18 18 0 0 1 72 88 Z')),
    P_('M28 88 A16 16 0 0 1 30 54 A22 22 0 0 1 70 50 A18 18 0 0 1 72 88 Z'),
    S_(C_(30, 98, 6)), C_(30, 98, 6), S_(C_(20, 110, 4)), C_(20, 110, 4)] },
  { id: 'fo-marco', n: 'Marco para señalar', grp: 'forma', txt: 0, fig: [
    A_(P_('M14 40 L14 100 L86 100 L86 40 Z')),
    A_(P_('M14 52 L14 40 L26 40 M74 40 L86 40 L86 52 M86 88 L86 100 L74 100 M26 100 L14 100 L14 88'))] },
  { id: 'fo-marco-esq', n: 'Esquinas de encuadre', grp: 'forma', txt: 0, fig: [
    A_(P_('M10 54 L10 36 L28 36')), A_(P_('M72 36 L90 36 L90 54')),
    A_(P_('M90 86 L90 104 L72 104')), A_(P_('M28 104 L10 104 L10 86'))] },
  { id: 'fo-circulo-senal', n: 'Círculo de señalización', grp: 'forma', txt: 0, fig: [
    A_(C_(50, 70, 36)), A_(P_('M76 96 L94 114'))] },
  { id: 'fo-llave', n: 'Llave', grp: 'forma', txt: 0, fig: [
    P_('M64 30 Q46 30 46 46 L46 62 Q46 70 34 70 Q46 70 46 78 L46 94 Q46 110 64 110')] },
  { id: 'fo-corchete', n: 'Corchete', grp: 'forma', txt: 0, fig: [P_('M64 30 L44 30 L44 110 L64 110')] },
  { id: 'fo-parentesis', n: 'Paréntesis', grp: 'forma', txt: 0, fig: [
    P_('M62 30 Q40 70 62 110'), P_('M84 30 Q62 70 84 110')] },
  { id: 'fo-cruz', n: 'Cruz', grp: 'forma', txt: 0, fig: [
    S_(P_('M38 30 L62 30 L62 58 L90 58 L90 82 L62 82 L62 110 L38 110 L38 82 L10 82 L10 58 L38 58 Z')),
    P_('M38 30 L62 30 L62 58 L90 58 L90 82 L62 82 L62 110 L38 110 L38 82 L10 82 L10 58 L38 58 Z')] },
  { id: 'fo-explosion', n: 'Explosión', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 22 L58 46 L78 32 L72 56 L96 58 L76 72 L94 90 L70 88 L72 112 L54 96 L44 118 L38 94 L16 104 L24 82 L4 74 L26 62 L12 42 L36 46 Z')),
    P_('M50 22 L58 46 L78 32 L72 56 L96 58 L76 72 L94 90 L70 88 L72 112 L54 96 L44 118 L38 94 L16 104 L24 82 L4 74 L26 62 L12 42 L36 46 Z')] },
  { id: 'fo-banda', n: 'Banda con título', grp: 'forma', txt: 1, fig: [
    S_(R_(2, 54, 96, 32, 0)), R_(2, 54, 96, 32, 0),
    A_(P_('M2 54 L98 54')), A_(P_('M2 86 L98 86'))] },
  { id: 'fo-nota-adhesiva', n: 'Nota adhesiva', grp: 'forma', txt: 1, fig: [
    S_(P_('M12 36 L88 36 L88 88 L66 110 L12 110 Z')), P_('M12 36 L88 36 L88 88 L66 110 L12 110 Z'),
    D_(P_('M88 88 L66 88 L66 110'))] },
  { id: 'fo-numero', n: 'Número en círculo', grp: 'forma', txt: 1, fig: [
    S_(C_(50, 70, 26)), C_(50, 70, 26)] },
  /* ---------- áreas más allá del laboratorio ----------
     Ecología y ambiente, ciencias de la Tierra, computación y datos, ciencias
     sociales, ingeniería y astronomía: lo que un investigador de esas áreas
     necesita para contar su método en una figura. Mismo sistema de papeles que
     el vidrio: LIQ lleva el color que elige la figura (follaje, agua, lava,
     estrato), S_ es el cuerpo y D_ el detalle. Son esquemas didácticos. */
  { id: 'arbol', n: 'Árbol', grp: 'ecologia', area: 'Ecología',
    tags: ['árbol', 'bosque', 'vegetación', 'planta', 'dosel', 'biomasa', 'ecosistema', 'carbono'], fig: [
    G_(E_(50, 128, 26, 3)),
    S_(P_('M44 128 L46 88 Q40 84 34 80 L36 77 Q42 80 47 83 L48 76 L53 76 L53 83 Q58 80 64 77 L66 80 Q60 84 55 88 L57 128 Z')),
    LIQ(P_('M30 72 Q12 68 17 50 Q14 32 32 30 Q36 13 52 15 Q69 13 72 30 Q89 32 84 50 Q89 69 70 72 Q60 79 50 74 Q40 79 30 72 Z')),
    P_('M30 72 Q12 68 17 50 Q14 32 32 30 Q36 13 52 15 Q69 13 72 30 Q89 32 84 50 Q89 69 70 72 Q60 79 50 74 Q40 79 30 72 Z'),
    D_(P_('M32 44 Q38 38 44 42 M56 30 Q62 26 68 32 M58 54 Q64 50 72 54 M26 58 Q32 54 38 58')),
    N_(P_('M46 126 Q38 128 30 132 M55 126 Q64 128 72 132')),
    B_(P_('M26 44 Q28 36 36 34'))] },

  { id: 'pez', n: 'Pez', grp: 'ecologia', area: 'Ecología',
    tags: ['pez', 'fauna acuática', 'ictiología', 'pesca', 'río', 'lago', 'bioindicador', 'vertebrado'], fig: [
    G_(E_(50, 104, 30, 3)),
    S_(P_('M14 70 Q30 46 60 54 L82 40 L78 70 L82 100 L60 86 Q30 94 14 70 Z')),
    LIQ(P_('M22 74 Q40 86 60 82 Q44 76 22 74 Z')),
    D_(P_('M58 56 Q52 70 58 84 M40 58 Q46 50 54 56')),
    D_(P_('M36 66 Q40 62 44 66 M44 72 Q48 68 52 72 M36 76 Q40 72 44 76')),
    M_(C_(26, 66, 3.2)),
    N_(P_('M14 70 L20 72')),
    B_(P_('M24 60 Q32 54 42 54'))] },

  { id: 'ave', n: 'Ave', grp: 'ecologia', area: 'Ecología',
    tags: ['ave', 'pájaro', 'ornitología', 'fauna', 'censo', 'biodiversidad', 'vertebrado'], fig: [
    M_(P_('M8 100 L92 102 L92 107 L8 105 Z')),
    S_(P_('M26 70 L8 60 L12 76 L28 80 Z')),
    S_(E_(48, 74, 25, 16)),
    S_(C_(69, 52, 11)),
    LIQ(P_('M34 68 Q48 58 62 70 Q50 84 34 76 Z')),
    D_(P_('M34 68 Q48 58 62 70 Q50 84 34 76 Z M42 70 L54 72')),
    A_(P_('M78 49 L90 53 L78 57')),
    M_(C_(72, 50, 2.2)),
    N_(P_('M44 89 L42 101 M54 89 L56 101')),
    B_(P_('M30 66 Q36 60 44 60'))] },

  { id: 'insecto', n: 'Insecto', grp: 'ecologia', area: 'Ecología',
    tags: ['insecto', 'escarabajo', 'entomología', 'polinizador', 'artrópodo', 'biodiversidad', 'plaga'], fig: [
    G_(E_(50, 124, 22, 3)),
    N_(P_('M38 56 L22 46 L16 34 M62 56 L78 46 L84 34 M36 74 L18 74 L10 86 M64 74 L82 74 L90 86 M38 92 L24 104 L22 118 M62 92 L76 104 L78 118')),
    N_(P_('M45 30 Q40 20 32 16 M55 30 Q60 20 68 16')),
    S_(C_(50, 34, 8)),
    S_(E_(50, 52, 13, 9)),
    LIQ(P_('M50 60 Q30 62 32 86 Q34 110 50 114 Q66 110 68 86 Q70 62 50 60 Z')),
    P_('M50 60 Q30 62 32 86 Q34 110 50 114 Q66 110 68 86 Q70 62 50 60 Z'),
    D_(P_('M50 60 L50 114 M40 76 Q42 80 40 84 M60 92 Q58 96 60 100')),
    B_(P_('M38 72 Q37 84 40 94'))] },

  { id: 'cuadrante', n: 'Cuadrante de muestreo', grp: 'ecologia', area: 'Ecología',
    tags: ['cuadrante', 'muestreo', 'trabajo de campo', 'cobertura vegetal', 'parcela', 'transecto', 'ecología'], fig: [
    LIQ(P_('M4 96 L66 96 L96 124 L34 124 Z')),
    P_('M4 96 L66 96 L96 124 L34 124 Z'),
    M_(P_('M18 100 L62 100 L82 120 L38 120 Z M22 102 L60 102 L77 118 L41 118 Z')),
    D_(P_('M40 100 L60 120 M28 110 L72 110')),
    N_(P_('M30 106 L28 100 M31 106 L33 101 M52 114 L50 108 M53 114 L55 109 M64 106 L63 101 M44 104 L46 99')),
    M_(R_(80, 60, 4, 40, 1)), A_(P_('M84 62 L96 66 L84 70'))] },

  { id: 'lago', n: 'Lago en corte', grp: 'ecologia', area: 'Ecología',
    tags: ['lago', 'cuerpo de agua', 'limnología', 'termoclina', 'estratificación', 'sedimento', 'hidrología'], fig: [
    S_(P_('M4 60 L20 60 Q30 112 50 116 Q72 112 80 60 L96 60 L96 128 L4 128 Z')),
    LIQ(P_('M20 60 L80 60 Q72 112 50 116 Q30 112 20 60 Z')),
    D_(P_('M24 76 L30 76 M36 76 L42 76 M48 76 L54 76 M60 76 L66 76 M72 76 L76 76')),
    D_(P_('M30 104 Q50 110 70 104 M12 90 L16 94 M84 88 L88 94 M10 112 L14 108 M86 116 L90 110')),
    A_(C_(20, 28, 7)), A_(P_('M20 14 L20 18 M8 28 L12 28 M28 28 L32 28 M12 20 L14 22 M28 20 L26 22')),
    P_('M4 60 L20 60 M80 60 L96 60'),
    B_(P_('M26 66 L44 66'))] },

  { id: 'estacion-meteo', n: 'Estación meteorológica', grp: 'ecologia', area: 'Ecología',
    tags: ['estación meteorológica', 'clima', 'anemómetro', 'temperatura', 'precipitación', 'sensor', 'monitoreo'], fig: [
    G_(E_(50, 128, 30, 3)),
    M_(R_(47, 22, 6, 106, 1)),
    M_(P_('M50 22 L34 16 M50 22 L66 16 M50 22 L50 10')),
    S_(C_(32, 16, 4.5)), S_(C_(68, 16, 4.5)), S_(C_(50, 8, 4.5)),
    A_(P_('M50 36 L78 36 M72 30 L80 36 L72 42')),
    S_(R_(18, 58, 26, 30, 2)),
    D_(P_('M22 64 L40 64 M22 70 L40 70 M22 76 L40 76 M22 82 L40 82')),
    V_(P_('M58 64 L86 58 L90 76 L62 82 Z')),
    D_(P_('M65 63 L69 81 M72 62 L76 80 M79 60 L83 78')),
    N_(P_('M40 128 L50 110 L60 128')),
    B_(P_('M21 61 L21 85'))] },

  { id: 'estratos', n: 'Estratos geológicos', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['estratos', 'geología', 'estratigrafía', 'sedimento', 'capa', 'roca', 'bloque diagrama', 'falla'], fig: [
    G_(E_(48, 126, 40, 3)),
    S_(P_('M8 36 L22 22 L92 22 L78 36 Z')),
    S_(R_(8, 36, 70, 20, 0)), LIQ(R_(8, 56, 70, 22, 0)), M_(R_(8, 78, 70, 18, 0)), S_(R_(8, 96, 70, 24, 0)),
    S_(P_('M78 36 L92 22 L92 106 L78 120 Z')),
    P_('M8 36 L78 36 L78 120 L8 120 Z M78 36 L92 22 L92 106 L78 120'),
    D_(P_('M78 56 L92 42 M78 78 L92 64 M78 96 L92 82')),
    D_(P_('M8 56 L78 56 M8 78 L78 78 M8 96 L78 96')),
    D_(P_('M16 44 L18 44 M30 48 L32 48 M46 42 L48 42 M62 46 L64 46 M20 104 Q24 100 28 104 M44 110 Q48 106 52 110 M60 102 Q64 98 68 102')),
    B_(P_('M12 40 L34 40'))] },

  { id: 'volcan', n: 'Volcán', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['volcán', 'vulcanología', 'erupción', 'lava', 'magma', 'ceniza', 'geología', 'riesgo'], fig: [
    G_(E_(50, 124, 44, 3)),
    S_(P_('M6 120 L38 54 L46 50 L54 50 L62 54 L94 120 Z')),
    P_('M6 120 L38 54 L46 50 L54 50 L62 54 L94 120 Z'),
    LIQ(P_('M44 52 Q46 70 38 86 Q46 82 48 70 Q52 90 58 98 Q56 76 56 52 Z')),
    D_(P_('M24 100 L32 96 M66 94 L74 100 M30 110 L36 108')),
    N_(P_('M46 44 Q38 38 44 32 Q40 24 48 20 Q52 12 60 16 Q68 14 68 24 Q76 28 70 36 Q66 42 56 40')),
    A_(P_('M40 40 L34 32 M60 40 L68 34 M50 38 L50 30')),
    B_(P_('M34 70 L24 94'))] },

  { id: 'perfil-suelo', n: 'Perfil de suelo', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['suelo', 'edafología', 'horizonte', 'perfil', 'materia orgánica', 'raíces', 'agronomía'], fig: [
    G_(E_(50, 128, 30, 3)),
    M_(R_(24, 26, 52, 12, 0)), S_(R_(24, 38, 52, 26, 0)), LIQ(R_(24, 64, 52, 30, 0)), S_(R_(24, 94, 52, 32, 0)),
    P_('M24 26 L76 26 L76 126 L24 126 Z M24 38 L76 38 M24 64 L76 64 M24 94 L76 94'),
    N_(P_('M30 26 L28 18 M32 26 L34 19 M46 26 L44 17 M48 26 L50 18 M64 26 L62 19 M66 26 L68 17')),
    N_(P_('M40 38 Q38 50 42 60 M58 38 Q62 52 56 70 M42 50 L36 56')),
    D_(P_('M32 104 Q36 100 40 104 Q36 108 32 104 Z M52 112 Q58 106 64 112 Q58 118 52 112 Z M60 100 Q63 97 66 100 Q63 103 60 100 Z')),
    D_(P_('M30 48 L32 48 M48 52 L50 52 M64 44 L66 44 M34 74 L36 74 M56 80 L58 80')),
    N_(P_('M80 32 L88 32 M80 50 L88 50 M80 78 L88 78 M80 110 L88 110'))] },

  { id: 'sismograma', n: 'Sismograma', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['sismograma', 'sismología', 'terremoto', 'onda P', 'onda S', 'señal', 'geofísica'], fig: [
    D_(R_(10, 22, 82, 94, 3)),
    N_(P_('M18 30 L18 104 L88 104')),
    A_(P_('M18 70 L32 70 L33 66 L34 74 L35 67 L36 72 L38 70 L46 70 L47 58 L48 84 L49 52 L50 90 L52 56 L54 82 L56 62 L58 76 L60 66 L63 73 L66 68 L70 71 L76 69 L88 70')),
    D_(P_('M32 40 L32 46 M46 40 L46 46')),
    N_(P_('M14 50 L18 50 M14 70 L18 70 M14 90 L18 90')),
    N_(P_('M30 104 L30 108 M46 104 L46 108 M62 104 L62 108 M78 104 L78 108'))] },

  { id: 'mineral', n: 'Cristal mineral', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['mineral', 'cristal', 'cuarzo', 'mineralogía', 'roca', 'drusa', 'geología'], fig: [
    G_(E_(50, 122, 36, 4)),
    S_(P_('M12 120 Q14 106 30 104 L70 104 Q86 106 88 120 Z')),
    V_(P_('M40 104 L40 44 L50 26 L60 44 L60 104 Z')),
    V_(P_('M22 106 L18 64 L26 50 L34 62 L38 104 Z')),
    V_(P_('M62 104 L66 70 L74 58 L82 70 L78 106 Z')),
    D_(P_('M50 26 L50 104 M40 44 L60 44 M26 50 L26 104 M18 64 L34 62 M74 58 L72 104 M66 70 L82 70')),
    D_(P_('M22 112 L26 112 M48 114 L54 114 M70 112 L74 112')),
    B_(P_('M44 50 L44 96'))] },

  { id: 'testigo', n: 'Testigo de perforación', grp: 'tierra', area: 'Ciencias de la Tierra',
    tags: ['testigo', 'núcleo', 'sondeo', 'perforación', 'sedimento', 'hielo', 'paleoclima', 'muestra'], fig: [
    G_(E_(50, 126, 20, 3)),
    S_(P_('M34 22 L34 118 Q34 124 50 124 Q66 124 66 118 L66 22 Z')),
    LIQ(P_('M34 48 L66 48 L66 64 L34 64 Z')), M_(P_('M34 84 L66 84 L66 96 L34 96 Z')),
    P_('M34 22 L34 118 Q34 124 50 124 Q66 124 66 118 L66 22'),
    S_(E_(50, 22, 16, 5)),
    D_(P_('M34 36 Q50 40 66 36 M34 48 Q50 52 66 48 M34 64 Q50 68 66 64 M34 76 Q50 80 66 76 M34 84 Q50 88 66 84 M34 96 Q50 100 66 96 M34 108 Q50 112 66 108')),
    N_(P_('M72 36 L80 36 M72 56 L80 56 M72 76 L80 76 M72 96 L80 96 M72 116 L80 116 M76 26 L76 120')),
    B_(P_('M39 28 L39 112'))] },

  { id: 'base-datos', n: 'Base de datos', grp: 'datos', area: 'Computación y datos',
    tags: ['base de datos', 'almacenamiento', 'datos', 'repositorio', 'SQL', 'registro', 'computación'], fig: [
    G_(E_(50, 124, 30, 3)),
    S_(P_('M22 30 L22 110 Q22 120 50 120 Q78 120 78 110 L78 30 Z')),
    S_(E_(50, 30, 28, 9)),
    D_(P_('M22 56 Q22 66 50 66 Q78 66 78 56 M22 84 Q22 94 50 94 Q78 94 78 84')),
    LIQ(C_(68, 50, 2.6)), LIQ(C_(68, 78, 2.6)), LIQ(C_(68, 106, 2.6)),
    P_('M22 30 L22 110 Q22 120 50 120 Q78 120 78 110 L78 30'),
    B_(P_('M28 38 L28 108'))] },

  { id: 'red-neuronal', n: 'Red neuronal', grp: 'datos', area: 'Computación y datos',
    tags: ['red neuronal', 'aprendizaje automático', 'inteligencia artificial', 'modelo', 'capa', 'perceptrón', 'datos'], fig: [
    N_(P_('M20 40 L50 30 M20 40 L50 56 M20 40 L50 82 M20 40 L50 108 M20 70 L50 30 M20 70 L50 56 M20 70 L50 82 M20 70 L50 108 M20 100 L50 30 M20 100 L50 56 M20 100 L50 82 M20 100 L50 108')),
    N_(P_('M50 30 L80 56 M50 30 L80 84 M50 56 L80 56 M50 56 L80 84 M50 82 L80 56 M50 82 L80 84 M50 108 L80 56 M50 108 L80 84')),
    S_(C_(20, 40, 7)), S_(C_(20, 70, 7)), S_(C_(20, 100, 7)),
    M_(C_(50, 30, 7)), M_(C_(50, 56, 7)), M_(C_(50, 82, 7)), M_(C_(50, 108, 7)),
    LIQ(C_(80, 56, 7)), LIQ(C_(80, 84, 7)), C_(80, 56, 7), C_(80, 84, 7),
    D_(P_('M17 37 Q20 35 23 37 M47 27 Q50 25 53 27'))] },

  { id: 'portatil', n: 'Ordenador portátil', grp: 'datos', area: 'Computación y datos',
    tags: ['ordenador', 'portátil', 'computación', 'análisis', 'software', 'simulación', 'programación'], fig: [
    G_(E_(50, 110, 44, 3)),
    S_(R_(18, 36, 64, 46, 3)),
    V_(R_(23, 41, 54, 36, 1)),
    A_(P_('M28 70 L36 60 L44 64 L54 50 L62 56 L72 46')),
    D_(P_('M28 48 L44 48 M28 53 L38 53')),
    S_(P_('M10 84 L90 84 L96 104 L4 104 Z')),
    D_(P_('M18 90 L82 90 M16 95 L84 95 M40 100 L60 100')),
    B_(P_('M26 44 L26 74'))] },

  { id: 'servidor', n: 'Servidor', grp: 'datos', area: 'Computación y datos',
    tags: ['servidor', 'clúster', 'computación de alto rendimiento', 'HPC', 'rack', 'nube', 'datos'], fig: [
    G_(E_(50, 128, 28, 3)),
    S_(R_(24, 14, 52, 112, 3)),
    S_(R_(28, 20, 44, 22, 2)), S_(R_(28, 48, 44, 22, 2)), S_(R_(28, 76, 44, 22, 2)), S_(R_(28, 104, 44, 16, 2)),
    D_(P_('M34 31 L54 31 M34 59 L54 59 M34 87 L54 87 M34 112 L54 112')),
    LIQ(C_(64, 31, 2.4)), LIQ(C_(64, 59, 2.4)), A_(C_(64, 87, 2.4)), LIQ(C_(64, 112, 2.4)),
    B_(P_('M26 18 L26 120'))] },

  { id: 'nube-computo', n: 'Nube de cómputo', grp: 'datos', area: 'Computación y datos',
    tags: ['nube', 'computación en la nube', 'sincronización', 'datos', 'servicio', 'almacenamiento', 'red'], fig: [
    S_(P_('M26 88 Q8 88 10 70 Q10 54 28 54 Q30 34 50 34 Q66 34 72 50 Q92 50 90 70 Q90 88 72 88 Z')),
    P_('M26 88 Q8 88 10 70 Q10 54 28 54 Q30 34 50 34 Q66 34 72 50 Q92 50 90 70 Q90 88 72 88 Z'),
    A_(P_('M40 120 L40 96 M34 102 L40 96 L46 102 M60 96 L60 120 M54 114 L60 120 L66 114')),
    D_(P_('M34 70 L66 70 M38 76 L62 76')),
    B_(P_('M20 64 Q22 58 28 58'))] },

  { id: 'diagrama-flujo', n: 'Diagrama de flujo', grp: 'datos', area: 'Computación y datos',
    tags: ['diagrama de flujo', 'algoritmo', 'proceso', 'decisión', 'protocolo', 'metodología', 'pasos'], fig: [
    S_(R_(30, 10, 40, 16, 8)),
    S_(P_('M50 38 L72 56 L50 74 L28 56 Z')),
    S_(R_(30, 86, 40, 18, 2)), S_(R_(4, 48, 20, 16, 2)),
    LIQ(R_(30, 116, 40, 16, 8)),
    P_('M30 116 L70 116 M30 132 L70 132'),
    N_(P_('M50 26 L50 38 M47 34 L50 38 L53 34 M50 74 L50 86 M47 82 L50 86 L53 82 M50 104 L50 116 M47 112 L50 116 L53 112 M28 56 L24 56 M72 56 L84 56 L84 95 L70 95 M74 92 L70 95 L74 98'))] },

  { id: 'persona', n: 'Persona', grp: 'social', area: 'Ciencias sociales',
    tags: ['persona', 'participante', 'sujeto', 'paciente', 'usuario', 'encuestado', 'individuo'], fig: [
    G_(E_(50, 128, 24, 3)),
    S_(C_(50, 30, 14)),
    S_(P_('M24 128 L24 74 Q24 52 50 52 Q76 52 76 74 L76 128 Z')),
    LIQ(P_('M38 54 L50 70 L62 54 Q56 52 50 52 Q44 52 38 54 Z')),
    D_(P_('M36 128 L36 88 M64 128 L64 88')),
    P_('M24 128 L24 74 Q24 52 50 52 Q76 52 76 74 L76 128'),
    B_(P_('M30 76 L30 120'))] },

  { id: 'grupo', n: 'Grupo de personas', grp: 'social', area: 'Ciencias sociales',
    tags: ['grupo', 'población', 'muestra', 'cohorte', 'comunidad', 'participantes', 'equipo'], fig: [
    G_(E_(50, 126, 44, 3)),
    S_(C_(24, 50, 10)), S_(P_('M6 124 L6 88 Q6 70 24 70 Q42 70 42 88 L42 124 Z')),
    S_(C_(76, 50, 10)), S_(P_('M58 124 L58 88 Q58 70 76 70 Q94 70 94 88 L94 124 Z')),
    LIQ(C_(50, 40, 12)), LIQ(P_('M28 126 L28 82 Q28 62 50 62 Q72 62 72 82 L72 126 Z')),
    C_(50, 40, 12), P_('M28 126 L28 82 Q28 62 50 62 Q72 62 72 82 L72 126'),
    B_(P_('M34 84 L34 118'))] },

  { id: 'cuestionario', n: 'Cuestionario', grp: 'social', area: 'Ciencias sociales',
    tags: ['cuestionario', 'encuesta', 'escala Likert', 'instrumento', 'formulario', 'respuestas', 'evaluación'], fig: [
    G_(E_(50, 128, 32, 3)),
    M_(R_(18, 18, 64, 106, 4)),
    S_(R_(24, 28, 52, 92, 1)),
    M_(R_(38, 12, 24, 12, 3)),
    D_(P_('M42 40 L70 40 M42 62 L70 62 M42 84 L66 84 M42 106 L68 106')),
    D_(R_(30, 35, 8, 8, 1)), D_(R_(30, 57, 8, 8, 1)), D_(R_(30, 79, 8, 8, 1)), D_(R_(30, 101, 8, 8, 1)),
    A_(P_('M31 39 L34 42 L40 34 M31 83 L34 86 L40 78')),
    B_(P_('M21 24 L21 118'))] },

  { id: 'entrevista', n: 'Entrevista', grp: 'social', area: 'Ciencias sociales',
    tags: ['entrevista', 'diálogo', 'cualitativo', 'grupo focal', 'conversación', 'testimonio', 'etnografía'], fig: [
    G_(E_(50, 128, 44, 3)),
    S_(C_(22, 70, 10)), S_(P_('M4 128 L4 104 Q4 86 22 86 Q40 86 40 104 L40 128 Z')),
    S_(C_(78, 70, 10)), LIQ(P_('M60 128 L60 104 Q60 86 78 86 Q96 86 96 104 L96 128 Z')),
    P_('M60 128 L60 104 Q60 86 78 86 Q96 86 96 104 L96 128'),
    S_(P_('M8 16 L50 16 Q54 16 54 20 L54 40 Q54 44 50 44 L26 44 L18 54 L20 44 L8 44 Q4 44 4 40 L4 20 Q4 16 8 16 Z')),
    S_(P_('M50 50 L92 50 Q96 50 96 54 L96 70 Q96 74 92 74 L82 74 L84 84 L74 74 L50 74 Q46 74 46 70 L46 54 Q46 50 50 50 Z')),
    D_(P_('M12 26 L46 26 M12 34 L36 34 M54 58 L88 58 M54 66 L78 66'))] },

  { id: 'engranaje', n: 'Engranajes', grp: 'ingenieria', area: 'Ingeniería',
    tags: ['engranaje', 'transmisión', 'mecánica', 'máquina', 'mecanismo', 'rueda dentada', 'ingeniería mecánica'], fig: [
    G_(E_(50, 126, 36, 3)),
    S_(engrane(38, 58, 22, 12, 7, 0)),
    M_(engrane(70, 94, 15, 9, 6, 0.2)),
    D_(C_(38, 58, 12)), LIQ(C_(38, 58, 5)), C_(38, 58, 5),
    D_(C_(70, 94, 8)), M_(C_(70, 94, 3.5)),
    A_(P_('M8 40 Q6 26 18 20 M14 18 L18 20 L16 25')),
    B_(P_('M24 50 Q26 44 32 42'))] },

  { id: 'viga', n: 'Viga con carga', grp: 'ingenieria', area: 'Ingeniería',
    tags: ['viga', 'carga distribuida', 'estructura', 'resistencia de materiales', 'apoyo', 'flexión', 'ingeniería civil'], fig: [
    A_(P_('M14 36 L86 36 M14 36 L14 58 M11 53 L14 58 L17 53 M32 36 L32 58 M29 53 L32 58 L35 53 M50 36 L50 58 M47 53 L50 58 L53 53 M68 36 L68 58 M65 53 L68 58 L71 53 M86 36 L86 58 M83 53 L86 58 L89 53')),
    S_(R_(8, 60, 84, 12, 1)),
    D_(P_('M8 66 L92 66')),
    M_(P_('M16 72 L8 88 L24 88 Z')),
    M_(P_('M84 72 L76 84 L92 84 Z')), M_(C_(79, 88, 3)), M_(C_(89, 88, 3)),
    D_(P_('M4 88 L28 88 M4 92 L8 88 M10 92 L14 88 M16 92 L20 88 M72 92 L96 92 M72 96 L76 92 M80 96 L84 92 M88 96 L92 92')),
    N_(P_('M8 104 L92 104 M8 100 L8 108 M92 100 L92 108'))] },

  { id: 'valvula', n: 'Tubería con válvula', grp: 'ingenieria', area: 'Ingeniería',
    tags: ['válvula', 'tubería', 'flujo', 'caudal', 'fluidos', 'ingeniería química', 'proceso'], fig: [
    G_(E_(50, 104, 44, 3)),
    M_(R_(4, 70, 30, 16, 1)), M_(R_(66, 70, 30, 16, 1)),
    M_(R_(30, 66, 6, 24, 1)), M_(R_(64, 66, 6, 24, 1)),
    S_(P_('M36 64 L50 78 L64 64 L64 92 L50 78 L36 92 Z')),
    M_(R_(47, 36, 6, 34, 1)),
    S_(E_(50, 32, 20, 5)), D_(P_('M34 32 L66 32 M50 27 L50 37')),
    A_(P_('M8 58 L26 58 M20 53 L26 58 L20 63 M74 58 L92 58 M86 53 L92 58 L86 63')),
    B_(P_('M8 73 L28 73'))] },

  { id: 'intercambiador', n: 'Intercambiador de calor', grp: 'ingenieria', area: 'Ingeniería',
    tags: ['intercambiador de calor', 'carcasa y tubos', 'transferencia de calor', 'fluidos', 'ingeniería química', 'térmica'], fig: [
    G_(E_(50, 104, 44, 3)),
    S_(P_('M18 56 L82 56 Q94 56 94 74 Q94 92 82 92 L18 92 Q6 92 6 74 Q6 56 18 56 Z')),
    D_(P_('M18 64 L82 64 M18 70 L82 70 M18 78 L82 78 M18 84 L82 84 M18 56 L18 92 M82 56 L82 92')),
    M_(R_(26, 44, 8, 12, 1)), M_(R_(66, 92, 8, 12, 1)),
    LIQ(R_(26, 38, 8, 6, 1)),
    A_(P_('M30 26 L30 40 M26 34 L30 40 L34 34 M70 108 L70 122 M66 116 L70 122 L74 116')),
    A_(P_('M2 74 L6 74 M94 74 L98 74')),
    B_(P_('M16 60 L40 60'))] },

  { id: 'impresora-3d', n: 'Impresora 3D', grp: 'ingenieria', area: 'Ingeniería',
    tags: ['impresora 3D', 'fabricación aditiva', 'prototipo', 'manufactura', 'filamento', 'diseño', 'ingeniería'], fig: [
    G_(E_(50, 126, 40, 3)),
    S_(R_(10, 14, 80, 110, 3)),
    V_(R_(18, 22, 64, 94, 1)),
    M_(R_(18, 40, 64, 6, 1)),
    S_(P_('M42 46 L58 46 L56 58 L44 58 Z')), M_(P_('M48 58 L52 58 L50 64 Z')),
    LIQ(P_('M36 104 L64 104 L60 80 L40 80 Z')), P_('M36 104 L64 104 L60 80 L40 80 Z'),
    D_(P_('M40 86 L60 86 M38 92 L62 92 M37 98 L63 98')),
    M_(R_(24, 104, 52, 6, 1)),
    B_(P_('M22 26 L22 110'))] },

  { id: 'telescopio', n: 'Telescopio', grp: 'astro', area: 'Astronomía',
    tags: ['telescopio', 'astronomía', 'observación', 'óptica', 'refractor', 'cielo', 'astrofísica'], fig: [
    G_(E_(50, 128, 30, 3)),
    S_(P_('M14 46 L76 22 L82 36 L20 60 Z')),
    V_(P_('M76 22 L86 18 L92 32 L82 36 Z')),
    M_(P_('M14 46 L8 48 L12 58 L20 60 Z')),
    D_(P_('M30 42 L36 54 M56 32 L62 44')),
    M_(C_(46, 48, 5)),
    N_(P_('M46 52 L46 76 M46 76 L26 126 M46 76 L66 126 M46 76 L48 124')),
    A_(P_('M88 8 L90 12 L94 12 L91 15 L92 19 L88 17 L84 19 L85 15 L82 12 L86 12 Z')),
    B_(P_('M24 50 L60 36'))] },

  { id: 'planeta-orbita', n: 'Planeta y órbita', grp: 'astro', area: 'Astronomía',
    tags: ['planeta', 'órbita', 'estrella', 'sistema solar', 'exoplaneta', 'astronomía', 'gravitación'], fig: [
    D_(E_(50, 72, 44, 20)),
    LIQ(C_(50, 72, 12)), C_(50, 72, 12),
    A_(P_('M50 52 L50 46 M50 92 L50 98 M30 72 L24 72 M70 72 L76 72 M36 58 L32 54 M64 58 L68 54 M36 86 L32 90 M64 86 L68 90')),
    S_(C_(88, 78, 7)), D_(P_('M84 74 Q90 78 86 84')),
    S_(C_(16, 62, 5)),
    N_(P_('M78 58 Q86 60 90 66 M87 62 L90 66 L85 67')),
    B_(P_('M44 66 Q46 62 50 62'))] },

  { id: 'satelite', n: 'Satélite', grp: 'astro', area: 'Astronomía',
    tags: ['satélite', 'teledetección', 'órbita', 'espacio', 'observación de la Tierra', 'comunicaciones', 'sensor remoto'], fig: [
    V_(P_('M4 58 L34 58 L34 82 L4 82 Z')), V_(P_('M66 58 L96 58 L96 82 L66 82 Z')),
    D_(P_('M14 58 L14 82 M24 58 L24 82 M4 70 L34 70 M76 58 L76 82 M86 58 L86 82 M66 70 L96 70')),
    M_(P_('M34 69 L40 69 M60 69 L66 69')),
    S_(R_(40, 52, 20, 34, 2)),
    LIQ(R_(44, 58, 12, 8, 1)),
    M_(P_('M42 96 Q50 88 58 96 Z')), P_('M50 86 L50 92'),
    A_(P_('M42 104 Q50 110 58 104 M36 112 Q50 122 64 112 M30 120 Q50 134 70 120')),
    B_(P_('M43 56 L43 82'))] }
];
const LABK = {}; LAB.forEach(x => LABK[x.id] = x);
const LAB_GRUPOS = { vidrio: 'Vidrio', montaje: 'Montaje y calor', equipo: 'Equipo', sintesis: 'Síntesis y preparación', caracter: 'Caracterización', materiales: 'Materiales y estructura', bio: 'Biología', circuito: 'Circuitos', fisica: 'Óptica y mecánica', icono: 'Iconos', forma: 'Formas y llamadas', ecologia: 'Ecología y ambiente', tierra: 'Ciencias de la Tierra', datos: 'Computación y datos', social: 'Ciencias sociales', ingenieria: 'Ingeniería', astro: 'Astronomía' };
/* Las formas admiten una frase corta dentro; las demás piezas, no. */
const formaConTexto = k => !!(LABK[k] && LABK[k].txt);

/* ---------- rótulos que van a LaTeX ----------
   Las letras griegas y los símbolos matemáticos que se escriben en un rótulo
   no existen en el codificado de LaTeX: hay que pasarlos a modo matemático o
   el documento no compila. */
const UNI_TEX = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon',
  'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi',
  'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
  'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '∫': '\\int', '∑': '\\sum', '∏': '\\prod', '√': '\\sqrt{\\;}', '∞': '\\infty',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx', '±': '\\pm',
  '×': '\\times', '·': '\\cdot', '→': '\\rightarrow', '←': '\\leftarrow',
  '⇌': '\\rightleftharpoons', '°': '^\\circ', '−': '-', '′': "'", '″': "''",
  '∈': '\\in', '∀': '\\forall', '∃': '\\exists', '∩': '\\cap', '∪': '\\cup',
  '⊂': '\\subset', '∅': '\\emptyset', '□': '\\square', 'Å': '\\text{\\AA}'
};
const RE_UNI = new RegExp('[' + Object.keys(UNI_TEX).join('') + ']', 'g');
/* Los diez caracteres que LaTeX se reserva. rotuloTex() lo llamaba desde el principio y nunca
   llegó a portarse de Slides: el catálogo heredó la llamada sin la función, así que rotuloTex
   lanzaba ReferenceError en cuanto alguien lo usara. Nadie lo usó hasta la exportación a TikZ. */
const TEX_ESCAPE = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&',
  '#': '\\#', '^': '\\textasciicircum{}', '_': '\\_', '%': '\\%', '~': '\\textasciitilde{}' };
function texEscape(t) {
  return String(t == null ? '' : t).replace(/[\\{}$&#^_%~]/g, c => TEX_ESCAPE[c]);
}
function rotuloTex(t) {
  const s = String(t == null ? '' : t);
  if (!RE_UNI.test(s)) { RE_UNI.lastIndex = 0; return texEscape(s); }
  RE_UNI.lastIndex = 0;
  const trozos = [];
  const con = s.replace(RE_UNI, c => { trozos.push(UNI_TEX[c]); return '\u0002' + (trozos.length - 1) + '\u0002'; });
  return texEscape(con).replace(/\u0002(\d+)\u0002/g, (_, i) => '$' + trozos[+i] + '$');
}

/* ================= estilos de dibujo =================
   El mismo dibujo se pinta de cuatro maneras. Cada papel decide su relleno,
   su grosor y su opacidad; el estilo decide qué papeles se ven. */
const ESTILOS_LAB = [
  { id: 'suave', n: 'Con cuerpo', d: 'Vidrio tintado, líquido y un reflejo. Es el que más se parece a un dibujo de manual.' },
  { id: 'linea', n: 'Línea', d: 'Solo contorno y líquido, sin rellenos. Limpio para un proyector con poco contraste.' },
  { id: 'solido', n: 'Sólido', d: 'Siluetas rellenas con los detalles en negativo. Se lee desde el fondo del aula.' },
  { id: 'tecnico', n: 'Técnico', d: 'Trazo fino y uniforme, sin rellenos, como un plano.' },
  /* Adaptación Erlen Figures: mismo trazado, pero vidrio cilíndrico, líquido con
     profundidad, metal a dos tonos y sombra doble. Solo gradientes lineales y
     elipses: nada que el conversor PDF no conserve como vector. */
  { id: 'relieve', n: 'Relieve', d: 'Degradados en vidrio, líquido y metal, con sombra suave. Para figuras de publicación.' }
];
const EK_LAB = {}; ESTILOS_LAB.forEach(x => EK_LAB[x.id] = x);

/* Paleta de líquidos con nombre, para no tener que pensar el hex. */
const LIQ_COLORES = [
  ['auto', 'El del tema'], ['#3E86D6', 'Azul'], ['#E8892B', 'Ámbar'], ['#2FA36B', 'Verde'],
  ['#C7443C', 'Rojo'], ['#8E5BC6', 'Violeta'], ['#D8C33A', 'Amarillo'], ['#3FB0B8', 'Turquesa'],
  ['#C96BA0', 'Rosa'], ['#7B6A58', 'Pardo'], ['#9AA5B1', 'Incoloro']
];

/* Mezcla y aclarado, para tintar vidrio y sacar el reflejo. */
const ES_HEX = x => /^#[0-9a-f]{6}$/i.test(String(x || ''));
function labMezcla(a, b, t) {
  if (!ES_HEX(a) || !ES_HEX(b)) return ES_HEX(b) ? b : (ES_HEX(a) ? a : '#888888');
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t));
}
/* Cómo se pinta cada papel en cada estilo. En «relieve», C.grad lleva el prefijo
   de los gradientes definidos por piezaSvg para esta instancia. */
function pinturaLab(pap, C, estilo) {
  const g = C.traza, fondo = C.fondo || '#ffffff', relieve = estilo === 'relieve', grad = relieve && C.grad;
  const anchoBase = estilo === 'tecnico' ? 1.3 : estilo === 'solido' ? 2.6 : relieve ? 2.5 : 2.4;
  const P = { fill: 'none', stroke: g, 'stroke-width': anchoBase, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (pap === 'sombra') {
    if (estilo === 'tecnico' || estilo === 'linea') return null;
    return { fill: g, stroke: 'none', opacity: relieve ? .16 : .13 };
  }
  if (pap === 'brillo') {
    if (estilo !== 'suave' && !relieve) return null;
    return { fill: 'none', stroke: fondo, 'stroke-width': relieve ? 3.8 : 3.4, 'stroke-linecap': 'round', opacity: relieve ? .85 : .72 };
  }
  if (pap === 'liq') {
    if (estilo === 'tecnico') return { fill: C.liq, stroke: 'none', opacity: .22 };
    if (estilo === 'solido') return { fill: C.liq, stroke: 'none', opacity: .95 };
    if (grad) return { fill: 'url(#' + grad + 'liq)', stroke: 'none', opacity: .9 };
    return { fill: C.liq, stroke: 'none', opacity: estilo === 'linea' ? .7 : .82 };
  }
  if (pap === 'vidrio') {
    if (estilo === 'linea' || estilo === 'tecnico') return P;
    if (estilo === 'solido') return Object.assign({}, P, { fill: labMezcla(fondo, g, .16) });
    if (grad) return Object.assign({}, P, { fill: 'url(#' + grad + 'vidrio)' });
    return Object.assign({}, P, { fill: labMezcla(fondo, C.vidrio || '#6E8FA8', .13) });
  }
  if (pap === 'solido' || pap === 'metal') {
    if (estilo === 'linea' || estilo === 'tecnico') return P;
    if (estilo === 'solido') return Object.assign({}, P, { fill: pap === 'metal' ? labMezcla(fondo, g, .3) : g, stroke: g });
    if (grad) return Object.assign({}, P, { fill: 'url(#' + grad + pap + ')' });
    return Object.assign({}, P, { fill: labMezcla(fondo, g, pap === 'metal' ? .12 : .07) });
  }
  if (pap === 'acento') {
    const w = estilo === 'tecnico' ? 1.4 : estilo === 'solido' ? 3.2 : 2.6;
    return { fill: 'none', stroke: C.liq, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  }
  if (pap === 'fina') {
    return { fill: 'none', stroke: g, 'stroke-width': estilo === 'tecnico' ? 0.9 : 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .8 };
  }
  if (pap === 'detalle') {
    const w = estilo === 'tecnico' ? 0.9 : 1.5;
    const col = estilo === 'solido' ? fondo : g;
    return { fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: estilo === 'solido' ? .95 : .78 };
  }
  return P;   /* traza: el contorno principal */
}

/* ---------- de figura a SVG ---------- */
function figuraASvg(f, C, estilo) {
  /* Compatibilidad: antes se llamaba con (fig, tinta, liq). */
  if (typeof C === 'string') C = { traza: C, liq: estilo || C, fondo: '#ffffff' };
  const est = estilo && EK_LAB[estilo] ? estilo : (C.estilo || 'suave');
  const pap = f.pap || (f.liq ? 'liq' : f.fill ? 'solidoRelleno' : 'traza');
  if (pap === 'solidoRelleno') {
    const base = { fill: C.traza, stroke: 'none' };
    return figuraNodo(f, base);
  }
  const base = pinturaLab(pap, C, est);
  if (!base) return null;
  return figuraNodo(f, base);
}
function figuraNodo(f, base) {
  if (f.t === 'p') return sv('path', Object.assign({ d: f.d }, base));
  if (f.t === 'l') return sv('line', Object.assign({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2 }, base));
  if (f.t === 'c') return sv('circle', Object.assign({ cx: f.cx, cy: f.cy, r: f.r }, base));
  if (f.t === 'e') return sv('ellipse', Object.assign({ cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry }, base));
  if (f.t === 'r') return sv('rect', Object.assign({ x: f.x, y: f.y, width: f.w, height: f.h, rx: f.rx }, base));
  return null;
}

/* Orden de pintado: primero lo que va detrás. */
const ORDEN_PAP = { sombra: 0, vidrio: 1, solido: 1, metal: 1, liq: 2, traza: 3, acento: 4, fina: 4, detalle: 5, brillo: 6 };
const papDe = f => f.pap || (f.liq ? 'liq' : f.fill ? 'traza' : 'traza');

/* Gradientes del estilo «relieve», uno por instancia y por papel. Usan la caja
   de cada forma (objectBoundingBox), así el líquido aclara por arriba y el
   vidrio se curva de borde a borde sea cual sea la pieza. */
function gradientesRelieve(prefix, C) {
  const g = C.traza, fondo = C.fondo || '#ffffff', vidrio = C.vidrio || '#6E8FA8', liq = ES_HEX(C.liq) ? C.liq : '#4d8b76';
  const lin = (id, x2, y2, stops) => {
    const el = sv('linearGradient', { id: prefix + id, x1: 0, y1: 0, x2, y2 });
    stops.forEach(([o, c, a]) => el.append(sv('stop', Object.assign({ offset: o, 'stop-color': c }, a == null ? {} : { 'stop-opacity': a }))));
    return el;
  };
  const defs = sv('defs');
  defs.append(
    lin('vidrio', 1, 0, [[0, labMezcla(fondo, vidrio, .3)], [.38, labMezcla(fondo, vidrio, .04)], [.7, labMezcla(fondo, vidrio, .12)], [1, labMezcla(fondo, vidrio, .36)]]),
    lin('liq', 0, 1, [[0, labMezcla(liq, fondo, .38)], [.18, labMezcla(liq, fondo, .1)], [1, labMezcla(liq, g, .3)]]),
    lin('metal', 0, 1, [[0, labMezcla(fondo, g, .04)], [.5, labMezcla(fondo, g, .22)], [1, labMezcla(fondo, g, .4)]]),
    lin('solido', 0, 1, [[0, labMezcla(fondo, g, .03)], [1, labMezcla(fondo, g, .17)]]));
  return defs;
}

/* Dibuja una pieza suelta, para la galería y para el lienzo.
   nivel recorta el líquido para poder subirlo o bajarlo. */
let _clipN = 0;
function piezaSvg(id, C, estilo, nivel) {
  const def = LABK[id];
  const g = sv('g');
  if (!def) return g;
  if (typeof C === 'string') C = { traza: C, liq: estilo || C, fondo: '#ffffff' };
  const est = estilo && EK_LAB[estilo] ? estilo : (C.estilo || 'suave');
  const figs = def.fig.slice().sort((a, b) => (ORDEN_PAP[papDe(a)] ?? 3) - (ORDEN_PAP[papDe(b)] ?? 3));
  let clipId = null;
  if (nivel != null && nivel < 0.999) {
    clipId = 'liqclip' + (++_clipN);
    const defs = sv('defs');
    const cp = sv('clipPath', { id: clipId });
    /* La caja de la pieza es 100 × 140; el líquido se recorta desde abajo. */
    cp.append(sv('rect', { x: -20, y: 140 - 140 * clamp(nivel, 0, 1), width: 140, height: 200 }));
    defs.append(cp); g.append(defs);
  }
  if (est === 'relieve') {
    /* Ids únicos por instancia: duplicar o reordenar piezas nunca cruza gradientes. */
    C = Object.assign({}, C, { grad: 'erlen-relieve-' + (++_clipN) + '-' });
    g.append(gradientesRelieve(C.grad, C));
  }
  figs.forEach(f => {
    const n = figuraASvg(f, C, est);
    if (!n) return;
    if (clipId && papDe(f) === 'liq') n.setAttribute('clip-path', 'url(#' + clipId + ')');
    if (est === 'relieve' && papDe(f) === 'sombra' && f.t === 'e') {
      /* Sombra doble: un halo ancho y tenue bajo la sombra de apoyo. */
      g.append(sv('ellipse', { cx: f.cx, cy: f.cy, rx: f.rx * 1.35, ry: f.ry * 1.9, fill: C.traza, stroke: 'none', opacity: .06 }));
    }
    g.append(n);
  });
  return g;
}

export {LAB,LABK,piezaSvg,ESTILOS_LAB,LIQ_COLORES,rotuloTex,texEscape,pinturaLab,labMezcla,LAB_GRUPOS};
