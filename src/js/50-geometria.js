/* ==== 50-geometria.js ==== */
'use strict';
/* ================= figuras geométricas =================
   Las seis construcciones que más aparecen en una clase o en una tesis de
   matemáticas, con rótulos editables. En SVG y en TikZ exacto. */

const GEO = [
  { id: 'triangulo', n: 'Triángulo', d: 'Con vértices, lados y el ángulo marcado.' },
  { id: 'circulo', n: 'Circunferencia', d: 'Radio, cuerda, tangente y ángulo central.' },
  { id: 'integral', n: 'Área bajo la curva', d: 'Ejes con la región sombreada entre a y b.' },
  { id: 'recta', n: 'Recta numérica', d: 'Un intervalo con extremos abierto o cerrado.' },
  { id: 'vectores', n: 'Suma de vectores', d: 'Regla del paralelogramo con la resultante.' },
  { id: 'paralelas', n: 'Paralelas y transversal', d: 'Los ángulos que se forman, rotulados.' }
];
const GK = {}; GEO.forEach(x => GK[x.id] = x);

function geoPorOmision(kind) {
  const c = { kind: kind || 'triangulo', rot: {} };
  if (c.kind === 'triangulo') c.rot = { A: 'A', B: 'B', C: 'C', a: 'a', b: 'b', c: 'c', ang: 'θ' };
  if (c.kind === 'circulo') c.rot = { O: 'O', r: 'r', ang: 'α' };
  if (c.kind === 'integral') c.rot = { f: 'f(x)', a: 'a', b: 'b', area: '∫ f dx' };
  if (c.kind === 'recta') { c.rot = { a: '−2', b: '3' }; c.abierto = { a: false, b: true }; }
  if (c.kind === 'vectores') c.rot = { u: 'u', v: 'v', s: 'u + v' };
  if (c.kind === 'paralelas') c.rot = { a1: 'α', a2: 'β' };
  return c;
}

/* Cada figura devuelve {w, h, fig[], txt[]} en su propio sistema. */
function geoFiguras(g) {
  const r = (g && g.rot) || {};
  const T = (x, y, t, opt) => Object.assign({ x, y, t }, opt || {});
  if (g.kind === 'triangulo') {
    const A = [40, 30], B = [40, 170], C = [250, 170];
    return { w: 322, h: 210, fig: [
      P_(`M${A[0]} ${A[1]} L${B[0]} ${B[1]} L${C[0]} ${C[1]} Z`),
      P_('M40 152 L58 152 L58 170'),
      P_(`M${C[0] - 34} ${C[1]} A34 34 0 0 0 ${C[0] - 30} ${C[1] - 16}`)
    ], txt: [
      T(30, 24, r.A || 'A', { an: 'end' }), T(30, 182, r.B || 'B', { an: 'end' }),
      T(260, 182, r.C || 'C', { an: 'start' }),
      T(28, 100, r.c || 'c', { an: 'end' }), T(145, 186, r.a || 'a'),
      T(152, 92, r.b || 'b'), T(206, 162, r.ang || 'θ', { chico: true })
    ] };
  }
  if (g.kind === 'circulo') {
    return { w: 300, h: 260, fig: [
      C_(140, 130, 90), C_(140, 130, 3),
      L_(140, 130, 230, 130), L_(140, 130, 76, 194),
      L_(230, 130, 76, 194),
      P_('M50 40 L280 40'),
      P_('M164 130 A24 24 0 0 0 155 148')
    ], txt: [
      T(134, 122, r.O || 'O', { an: 'end' }), T(186, 122, r.r || 'r'),
      T(178, 152, r.ang || 'α', { chico: true }),
      T(272, 32, 'tangente', { an: 'end', chico: true }),
      T(150, 176, 'cuerda', { an: 'start', chico: true })
    ] };
  }
  if (g.kind === 'integral') {
    const pts = [];
    for (let x = 30; x <= 280; x += 5) pts.push([x, 190 - 70 * Math.sin((x - 20) / 90) - 25]);
    const curva = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const xa = 90, xb = 220;
    const dentro = pts.filter(p => p[0] >= xa && p[0] <= xb);
    const area = 'M' + xa + ' 190 L' + dentro.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' L' + xb + ' 190 Z';
    return { w: 300, h: 220, fig: [
      LIQ(P_(area)),
      P_('M20 190 L290 190'), P_('M284 185 L290 190 L284 195'),
      P_('M30 200 L30 20'), P_('M25 26 L30 20 L35 26'),
      P_(curva),
      L_(xa, 190, xa, 128), L_(xb, 190, xb, 118)
    ], txt: [
      T(xa, 206, r.a || 'a'), T(xb, 206, r.b || 'b'),
      T(276, 40, r.f || 'f(x)', { an: 'end' }),
      T(155, 172, r.area || '∫ f dx', { chico: true })
    ] };
  }
  if (g.kind === 'recta') {
    const ab = (g.abierto || {});
    return { w: 300, h: 110, fig: [
      P_('M20 60 L280 60'), P_('M274 55 L280 60 L274 65'), P_('M26 55 L20 60 L26 65'),
      L_(90, 52, 90, 68), L_(220, 52, 220, 68),
      F_(R_(90, 55, 130, 10)),
      ab.a ? C_(90, 60, 7) : F_(C_(90, 60, 7)),
      ab.b ? C_(220, 60, 7) : F_(C_(220, 60, 7))
    ], txt: [T(90, 88, r.a || 'a'), T(220, 88, r.b || 'b')] };
  }
  if (g.kind === 'vectores') {
    return { w: 300, h: 220, fig: [
      P_('M40 180 L200 180'), P_('M188 174 L200 180 L188 186'),
      P_('M40 180 L130 60'), P_('M126 72 L130 60 L138 70'),
      P_('M40 180 L290 60'), P_('M278 60 L290 60 L284 71'),
      L_(200, 180, 290, 60), L_(130, 60, 290, 60)
    ], txt: [
      T(120, 198, r.u || 'u'), T(74, 106, r.v || 'v'),
      T(196, 104, r.s || 'u + v', { an: 'start' })
    ] };
  }
  return { w: 300, h: 220, fig: [
    P_('M20 70 L280 70'), P_('M20 160 L280 160'),
    P_('M60 200 L240 30'),
    P_('M110 70 A26 26 0 0 0 130 88'), P_('M150 160 A26 26 0 0 0 170 178')
  ], txt: [
    T(292, 66, 'r', { an: 'end', chico: true }), T(292, 156, 's', { an: 'end', chico: true }),
    T(132, 96, r.a1 || 'α', { chico: true }), T(172, 186, r.a2 || 'β', { chico: true })
  ] };
}

function renderGeometria(b, deck) {
  const g = b.geo || geoPorOmision('triangulo');
  const d = geoFiguras(g);
  const th = temaDe(deck || S.deck);
  const wrap = h('div', { class: 'geo-wrap', style: `width:${b.w || 58}%` });
  const svg = sv('svg', { class: 'geo-svg', viewBox: `0 0 ${d.w} ${d.h}`, preserveAspectRatio: 'xMidYMid meet',
    style: `aspect-ratio:${(d.w / d.h).toFixed(3)}` });
  d.fig.forEach(f => { const n = figuraASvg(f, 'currentColor', th.acc); if (n) svg.append(n); });
  d.txt.forEach(t => {
    if (!t.t) return;
    const n = sv('text', { x: t.x, y: t.y, 'text-anchor': t.an || 'middle', 'font-size': t.chico ? 15 : 18,
      fill: 'currentColor', 'font-family': 'inherit', 'font-style': 'italic' });
    n.textContent = t.t;
    svg.append(n);
  });
  wrap.append(svg);
  return wrap;
}

function geometriaTikz(b, p) {
  const g = b.geo || geoPorOmision('triangulo');
  const d = geoFiguras(g);
  const k = 0.028;
  const X = v => ((v - d.w / 2) * k).toFixed(3);
  const Y = v => (-(v - d.h / 2) * k).toFixed(3);
  const L = [];
  L.push(p + '\\begin{tikzpicture}[x=1cm, y=1cm, line width=0.9pt, line cap=round, line join=round]');
  d.fig.forEach(f => {
    const est = f.liq ? '[fill=tabulaliq!25, draw=none]' : f.fill ? '[fill]' : '';
    if (f.t === 'l') L.push(p + `  \\draw${est} (${X(f.x1)},${Y(f.y1)}) -- (${X(f.x2)},${Y(f.y2)});`);
    else if (f.t === 'c') L.push(p + `  \\draw${est} (${X(f.cx)},${Y(f.cy)}) circle[radius=${(f.r * k).toFixed(3)}];`);
    else if (f.t === 'e') L.push(p + `  \\draw${est} (${X(f.cx)},${Y(f.cy)}) ellipse[x radius=${(f.rx * k).toFixed(3)}, y radius=${(f.ry * k).toFixed(3)}];`);
    else if (f.t === 'r') L.push(p + `  \\draw${est} (${X(f.x)},${Y(f.y + f.h)}) rectangle (${X(f.x + f.w)},${Y(f.y)});`);
    else if (f.t === 'p') L.push(p + '  ' + pathATikz(f.d, X, Y, est));
  });
  d.txt.forEach(t => {
    if (!t.t) return;
    const an = t.an === 'end' ? 'east' : t.an === 'start' ? 'west' : 'center';
    L.push(p + `  \\node[anchor=${an}, font=${t.chico ? '\\scriptsize' : '\\small'}\\itshape] at (${X(t.x)},${Y(t.y - 5)}) {${rotuloTex(t.t)}};`);
  });
  L.push(p + '\\end{tikzpicture}');
  return L.join('\n');
}

function openGeometria(b) {
  if (!b.geo) b.geo = geoPorOmision('triangulo');
  const g = deepCopy(b.geo);
  const cuerpo = h('div');
  const vista = h('div', { class: 'geo-vista' });
  const campos = h('div', { class: 'geo-campos' });

  const pinta = () => {
    vista.innerHTML = '';
    vista.append(renderGeometria({ geo: g, w: 100 }, S.deck));
    campos.innerHTML = '';
    const claves = Object.keys(g.rot || {});
    if (!claves.length) { campos.append(h('p', { class: 'hint', style: 'margin:0' }, 'Esta figura no lleva rótulos.')); return; }
    campos.append(h('span', { class: 'sublabel' }, 'Rótulos'));
    const rej = h('div', { class: 'geo-rej' });
    claves.forEach(k => rej.append(h('label', { class: 'geo-campo' },
      h('span', null, k),
      h('input', { class: 'field', value: g.rot[k] || '', oninput: e => { g.rot[k] = e.target.value; vista.innerHTML = ''; vista.append(renderGeometria({ geo: g, w: 100 }, S.deck)); } }))));
    campos.append(rej);
    if (g.kind === 'recta') {
      g.abierto = g.abierto || {};
      campos.append(h('div', { style: 'display:flex;gap:12px;margin-top:8px;flex-wrap:wrap' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!g.abierto.a, onchange: e => { g.abierto.a = e.target.checked; pinta(); } }), 'Extremo izquierdo abierto'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!g.abierto.b, onchange: e => { g.abierto.b = e.target.checked; pinta(); } }), 'Extremo derecho abierto')));
    }
  };

  const rejT = h('div', { class: 'lay-grid', style: 'grid-template-columns:repeat(3,1fr);margin-bottom:12px' });
  GEO.forEach(x => rejT.append(h('button', { class: 'lay-opt' + (g.kind === x.id ? ' on' : ''), title: x.d,
    onclick: ev => {
      const nuevo = geoPorOmision(x.id);
      g.kind = nuevo.kind; g.rot = nuevo.rot; g.abierto = nuevo.abierto;
      $$('button', rejT).forEach(y => y.classList.remove('on')); ev.currentTarget.classList.add('on');
      pinta();
    } }, h('span', { class: 'lb' }, x.n))));

  cuerpo.append(rejT, vista, campos);
  pinta();
  openModal({ title: 'Figura geométrica', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => { b.geo = g; commit(); closeModal(); } }, 'Listo')] });
}


