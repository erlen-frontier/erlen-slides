/* ==== 69-derivacion.js ==== */
'use strict';
/* ================= derivación guiada =================
   Pegas la ecuación final y la muestras paso a paso: cada renglón entra como
   un paso de la presentación y lo que cambió respecto al anterior se pinta del
   color de acento, con el porqué al lado. Segmentar y señalar son dos de los
   principios con más evidencia en Mayer; aquí son un gesto de dos clics.
   En el PDF sale como un align con \onslide, así que también se revela ahí. */

/* Corta el LaTeX en átomos: un comando, un grupo {…} completo o un carácter.
   Así lo que se pinta siempre está balanceado y no rompe la ecuación. */
function atomosTex(tex) {
  const s = String(tex || ''), out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      let j = i + 1;
      if (j < s.length && /[A-Za-z]/.test(s[j])) { while (j < s.length && /[A-Za-z]/.test(s[j])) j++; }
      else j++;
      out.push(s.slice(i, j)); i = j; continue;
    }
    if (c === '{') {
      let n = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '{') n++; else if (s[j] === '}') { n--; if (!n) { j++; break; } } }
      if (n) { out.push(s.slice(i)); break; }
      out.push(s.slice(i, j)); i = j; continue;
    }
    if (/\s/.test(c)) { let j = i; while (j < s.length && /\s/.test(s[j])) j++; out.push(s.slice(i, j)); i = j; continue; }
    out.push(c); i++;
  }
  return out;
}
/* Un comando con sus argumentos es una sola unidad: \frac{a}{b}, x^{2}, \sqrt{y}.
   Si se pintara solo el argumento, \frac se quedaría sin él y la ecuación se
   rompería; pintando la unidad entera siempre queda LaTeX válido. */
const CMD_CON_ARGS = { '\\frac': 2, '\\dfrac': 2, '\\tfrac': 2, '\\binom': 2, '\\sqrt': 1, '\\hat': 1, '\\bar': 1, '\\vec': 1,
  '\\dot': 1, '\\ddot': 1, '\\tilde': 1, '\\overline': 1, '\\underline': 1, '\\mathrm': 1, '\\mathbf': 1, '\\text': 1,
  '\\textbf': 1, '\\mathcal': 1, '\\operatorname': 1, '\\boldsymbol': 1, '\\overset': 2, '\\underset': 2, '\\textcolor': 2 };
function unidadesTex(tex) {
  const at = atomosTex(tex), out = [];
  for (let i = 0; i < at.length; i++) {
    let u = at[i];
    const n = CMD_CON_ARGS[u];
    if (n) { let k = 0, j = i + 1; while (k < n && j < at.length) { if (!at[j].trim()) { u += at[j]; j++; continue; } if (at[j][0] !== '{' && at[j][0] !== '[') break; u += at[j]; j++; k++; } i = j - 1; }
    else if (u === '^' || u === '_') { let j = i + 1; while (j < at.length && !at[j].trim()) { u += at[j]; j++; } if (j < at.length) { u += at[j]; i = j; } }
    out.push(u);
  }
  return out;
}
/* Qué unidades del paso nuevo no estaban en el anterior (subsecuencia común más larga). */
function cambiosEntre(antes, ahora) {
  const A = unidadesTex(antes).filter(x => x.trim()), B = unidadesTex(ahora);
  const Bn = B.filter(x => x.trim());
  const n = A.length, m = Bn.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === Bn[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const nuevo = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === Bn[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else { nuevo.add(j); j++; }
  }
  while (j < m) { nuevo.add(j); j++; }
  /* de vuelta a los índices con espacios */
  const marca = [];
  let k = 0;
  B.forEach((x, idx) => { if (x.trim()) { if (nuevo.has(k)) marca.push(idx); k++; } });
  return { atomos: B, nuevos: new Set(marca) };
}
/* El paso con lo nuevo pintado. El color va en hex para KaTeX y como nombre
   para LaTeX; \textcolor entiende los dos. */
function pasoResaltado(antes, ahora, color) {
  if (!antes) return String(ahora || '');
  const { atomos, nuevos } = cambiosEntre(antes, ahora);
  if (!nuevos.size || nuevos.size === atomos.filter(x => x.trim()).length) return String(ahora || '');
  const out = [];
  let abierto = false;
  atomos.forEach((a, i) => {
    const es = nuevos.has(i) || (abierto && !a.trim() && nuevos.has(i + 1));
    if (es && !abierto) { out.push('\\textcolor{' + color + '}{'); abierto = true; }
    if (!es && abierto) { out.push('}'); abierto = false; }
    out.push(a);
  });
  if (abierto) out.push('}');
  return out.join('');
}
const pasosDe = b => (Array.isArray(b.pasos) ? b.pasos : []).filter(x => x && typeof x === 'object');
const conDerivacion = b => b.type === 'math' && !!b.derivacion && pasosDe(b).length > 0;

/* Corta un paso en «izquierda = derecha» por el primer igual de nivel cero. */
function ladosDe(tex) {
  const s = String(tex || '');
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') n++; else if (c === '}') n--;
    else if (n === 0 && (c === '=' || (c === '\\' && /^\\(approx|equiv|le|ge|neq|propto|sim|simeq|to|rightarrow|Rightarrow)\b/.test(s.slice(i))))) {
      const m = c === '=' ? '=' : s.slice(i).match(/^\\[a-zA-Z]+/)[0];
      return { izq: s.slice(0, i).trim(), rel: m, der: s.slice(i + m.length).trim() };
    }
  }
  return { izq: '', rel: '', der: s.trim() };
}

/* ---------- en pantalla ---------- */
function renderDerivacion(b, deck, mode, edit, frag) {
  const acc = (temaDe(deck).acc || '#3B44B6');
  const el = h('div', { class: 'blk b-math b-deriv sz-' + (b.size || 'n') });
  const pasos = pasosDe(b);
  pasos.forEach((ps, k) => {
    const tex = k ? pasoResaltado(pasos[k - 1].tex, ps.tex, acc) : ps.tex;
    const fila = h('div', { class: 'deriv-paso' },
      h('div', { class: 'deriv-eq', html: kStr(tex, true) }),
      ps.por ? h('div', { class: 'deriv-por' }, ps.por) : null);
    if (k > 0) {
      if (mode === 'present') {
        fila.classList.add('frag', 'an-fade');
        fila.dataset.frag = frag.n;
        if (frag.n < frag.mostrados) fila.classList.add('on');
        frag.n++;
      } else if (edit) { frag.n++; fila.append(h('span', { class: 'step-badge' }, 'paso ' + (k + 1))); }
    }
    el.append(fila);
  });
  return el;
}
/* ---------- en LaTeX ---------- */
function derivacionTex(b, p) {
  const pasos = pasosDe(b);
  const L = [p + '\\begin{align*}'];
  pasos.forEach((ps, k) => {
    const tex = k ? pasoResaltado(pasos[k - 1].tex, ps.tex, 'tabulaacento') : ps.tex;
    const { izq, rel, der } = ladosDe(tex);
    /* Cada celda va en su \visible<k->: amsmath compone el align dos veces y
       un \onslide<+-> se desordena; con número explícito por celda no falla y
       el renglón conserva su sitio, así que nada salta al revelarse. */
    const v = x => (k && !(typeof TEX_PLANO !== 'undefined' && TEX_PLANO)) ? '\\visible<' + (k + 1) + '->{' + x + '}' : x;
    const fila = (izq ? v(izq) + ' &' + v(rel + ' ' + der) : '& ' + v(der)) +
      (ps.por ? ' && ' + v('\\text{\\footnotesize\\color{gray} ' + texInline(ps.por) + '}') : '') +
      (k < pasos.length - 1 ? ' \\\\' : '');
    L.push(p + '  ' + fila);
  });
  L.push(p + '\\end{align*}');
  return L.join('\n');
}

/* ---------- el editor ---------- */
function openDerivacion(b) {
  if (!Array.isArray(b.pasos) || !b.pasos.length) b.pasos = [{ tex: b.tex || '', por: '' }];
  const lista = h('div', { class: 'deriv-lista' });
  const prev = h('div', { class: 'deriv-prev' });
  const acc = temaDe(S.deck).acc || '#3B44B6';
  const pinta = () => {
    lista.innerHTML = ''; prev.innerHTML = '';
    b.pasos.forEach((ps, k) => {
      const ta = h('textarea', { class: 'field field-mono', rows: 2, spellcheck: 'false', placeholder: k ? 'El siguiente paso' : 'La ecuación de partida',
        oninput: e => { ps.tex = e.target.value; pintaPrev(); } }, ps.tex || '');
      const por = h('input', { class: 'field', value: ps.por || '', placeholder: 'Por qué (p. ej. «sustituyendo la ley de Beer»)', oninput: e => { ps.por = e.target.value; pintaPrev(); } });
      lista.append(h('div', { class: 'deriv-fila' },
        h('span', { class: 'ref-n' }, String(k + 1)),
        h('div', { style: 'flex:1;min-width:0' }, ta, por),
        h('div', { class: 'ar-acc' },
          h('button', { class: 'icon-btn', title: 'Subir', onclick: () => { if (k) { [b.pasos[k - 1], b.pasos[k]] = [b.pasos[k], b.pasos[k - 1]]; pinta(); } } }, '↑'),
          h('button', { class: 'icon-btn', title: 'Bajar', onclick: () => { if (k < b.pasos.length - 1) { [b.pasos[k + 1], b.pasos[k]] = [b.pasos[k], b.pasos[k + 1]]; pinta(); } } }, '↓'),
          h('button', { class: 'icon-btn', title: 'Duplicar como siguiente paso', onclick: () => { b.pasos.splice(k + 1, 0, { tex: ps.tex, por: '' }); pinta(); } }, '⧉'),
          h('button', { class: 'icon-btn', title: 'Quitar', onclick: () => { if (b.pasos.length > 1) { b.pasos.splice(k, 1); pinta(); } } }, '✕'))));
    });
    pintaPrev();
  };
  const pintaPrev = () => {
    prev.innerHTML = '';
    b.pasos.forEach((ps, k) => {
      const tex = k ? pasoResaltado(b.pasos[k - 1].tex, ps.tex, acc) : ps.tex;
      prev.append(h('div', { class: 'deriv-paso' }, h('div', { class: 'deriv-eq', html: kStr(tex, true) }), ps.por ? h('div', { class: 'deriv-por' }, ps.por) : null));
    });
  };
  pinta();
  openModal({ title: 'Derivación paso a paso', size: 'modal-lg',
    onclose: () => { b.tex = (b.pasos[b.pasos.length - 1] || {}).tex || b.tex; commit(); },
    body: h('div', null,
      h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'Cada renglón es un paso: escribe la ecuación tal como queda. Lo que cambió respecto al anterior se pinta solo, y el «por qué» sale al lado. Al presentar, cada paso entra con la flecha; en el PDF sale como align con overlays.'),
      h('div', { class: 'data-grid' },
        h('div', null, lista, h('button', { class: 'btn btn-sm', style: 'margin-top:6px', onclick: () => { b.pasos.push({ tex: b.pasos[b.pasos.length - 1].tex, por: '' }); pinta(); } }, '+ Paso')),
        h('div', null, h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Cómo se verá'), prev))),
    foot: [h('button', { class: 'btn btn-pri', onclick: () => { b.derivacion = true; b.tex = (b.pasos[b.pasos.length - 1] || {}).tex || b.tex; closeModal(); commit(); } }, 'Listo')] });
}


