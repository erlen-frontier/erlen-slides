/* ==== 11-expr.js ==== */
'use strict';
/* ================= evaluador de fórmulas =================
   Analizador propio (sin eval) para expresiones tipo A*exp(-Ea/(R*T)).
   Compila a un árbol de funciones, así que redibujar con deslizadores es
   instantáneo. Funciona dentro de visores con CSP estricta. */

const EXPR_CONST = {
  pi: Math.PI, PI: Math.PI, e: Math.E,
  R: 8.314462618,          // J/(mol·K)
  NA: 6.02214076e23,       // 1/mol
  h: 6.62607015e-34,       // J·s
  hbar: 1.054571817e-34,
  c: 299792458,            // m/s
  kB: 1.380649e-23,        // J/K
  F: 96485.33212,          // C/mol
  eV: 1.602176634e-19,     // J
  me: 9.1093837015e-31
};
const EXPR_FN = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: Math.log, log10: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, pow: Math.pow,
  mod: (a, b) => a % b,
  erf: x => { // aproximación de Abramowitz–Stegun (error < 1.5e-7)
    const s = x < 0 ? -1 : 1;
    const a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return s * (1 - poly * Math.exp(-a * a));
  },
  gauss: (x, mu, sigma) => Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma)),
  lorentz: (x, x0, g) => (g * g) / ((x - x0) * (x - x0) + g * g),
  step: x => x >= 0 ? 1 : 0,
  if: (c, a, b) => c ? a : b
};
const EXPR_ARITY = { atan2: 2, pow: 2, mod: 2, gauss: 3, lorentz: 3, if: 3 };

/* Un error que sabe dónde está: con la posición, el editor y el MCP pueden
   señalar el carácter en vez de dejar al usuario buscándolo. */
function exprError(msg, pos) {
  const e = new Error(msg);
  e.pos = pos;
  return e;
}

function exprTokenize(src) {
  const t = [];
  let i = 0;
  const s = String(src);
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (s[j] === 'e' || s[j] === 'E') {
        let k = j + 1;
        if (s[k] === '+' || s[k] === '-') k++;
        if (/[0-9]/.test(s[k] || '')) { k++; while (k < s.length && /[0-9]/.test(s[k])) k++; j = k; }
      }
      const num = parseFloat(s.slice(i, j));
      if (!isFinite(num)) throw exprError('número no válido: ' + s.slice(i, j), i);
      t.push({ k: 'num', v: num, i }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z_0-9]/.test(s[j])) j++;
      t.push({ k: 'id', v: s.slice(i, j), i }); i = j; continue;
    }
    const two = s.substr(i, 2);
    if (['<=', '>=', '==', '!=', '&&', '||', '**'].includes(two)) {
      t.push({ k: 'op', v: two === '**' ? '^' : two, i }); i += 2; continue;
    }
    if ('+-*/^%(),<>'.includes(c)) { t.push({ k: 'op', v: c, i }); i++; continue; }
    throw exprError('carácter no reconocido: ' + c, i);
  }
  return t;
}

/* Devuelve { fn(vars) , vars:Set } o lanza Error con mensaje en español. */
function exprCompile(src) {
  const T = exprTokenize(src);
  const fin = String(src).length;
  let p = 0;
  /* La posición del token actual, o el final si ya no quedan. */
  const aqui = () => T[p] ? T[p].i : fin;
  const used = new Set();
  const peek = () => T[p];
  const isOp = v => T[p] && T[p].k === 'op' && T[p].v === v;
  const eat = v => { if (!isOp(v)) throw exprError('falta «' + v + '»', aqui()); p++; };

  function parseExpr() { return parseOr(); }
  function parseOr() {
    let a = parseAnd();
    while (isOp('||')) { p++; const b = parseAnd(), l = a; a = v => (l(v) || b(v)) ? 1 : 0; }
    return a;
  }
  function parseAnd() {
    let a = parseCmp();
    while (isOp('&&')) { p++; const b = parseCmp(), l = a; a = v => (l(v) && b(v)) ? 1 : 0; }
    return a;
  }
  function parseCmp() {
    let a = parseAdd();
    const ops = { '<': (x, y) => x < y, '>': (x, y) => x > y, '<=': (x, y) => x <= y, '>=': (x, y) => x >= y, '==': (x, y) => x === y, '!=': (x, y) => x !== y };
    while (T[p] && T[p].k === 'op' && ops[T[p].v]) {
      const f = ops[T[p].v]; p++;
      const b = parseAdd(), l = a;
      a = v => f(l(v), b(v)) ? 1 : 0;
    }
    return a;
  }
  function parseAdd() {
    let a = parseMul();
    while (isOp('+') || isOp('-')) {
      const neg = T[p].v === '-'; p++;
      const b = parseMul(), l = a;
      a = neg ? (v => l(v) - b(v)) : (v => l(v) + b(v));
    }
    return a;
  }
  function startsAtom() {
    const t = peek();
    return !!t && (t.k === 'num' || t.k === 'id' || (t.k === 'op' && t.v === '('));
  }
  function parseMul() {
    let a = parseUnary();
    for (;;) {
      if (isOp('*') || isOp('/') || isOp('%')) {
        const op = T[p].v; p++;
        const b = parseUnary(), l = a;
        a = op === '*' ? (v => l(v) * b(v)) : op === '/' ? (v => l(v) / b(v)) : (v => l(v) % b(v));
      } else if (startsAtom()) {           // multiplicación implícita: 2x, 3sin(x)
        const b = parseUnary(), l = a;
        a = v => l(v) * b(v);
      } else break;
    }
    return a;
  }
  function parseUnary() {
    if (isOp('-')) { p++; const b = parseUnary(); return v => -b(v); }
    if (isOp('+')) { p++; return parseUnary(); }
    return parsePow();
  }
  function parsePow() {
    const a = parseAtom();
    if (isOp('^')) { p++; const b = parseUnary(); return v => Math.pow(a(v), b(v)); }
    return a;
  }
  function parseAtom() {
    const t = peek();
    if (!t) throw exprError('la fórmula termina antes de tiempo', fin);
    if (t.k === 'num') { p++; const n = t.v; return () => n; }
    if (t.k === 'op' && t.v === '(') { p++; const e = parseExpr(); eat(')'); return e; }
    if (t.k === 'id') {
      p++;
      const name = t.v, pos = t.i;
      if (isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) { args.push(parseExpr()); while (isOp(',')) { p++; args.push(parseExpr()); } }
        eat(')');
        const f = EXPR_FN[name];
        if (!f) throw exprError('función desconocida: ' + name + '()', pos);
        const want = EXPR_ARITY[name];
        if (want && args.length !== want) throw exprError(name + '() necesita ' + want + ' argumentos', pos);
        if (name === 'if') return v => args[0](v) ? args[1](v) : args[2](v);
        if (args.length === 1) { const a0 = args[0]; return v => f(a0(v)); }
        if (args.length === 2) { const a0 = args[0], a1 = args[1]; return v => f(a0(v), a1(v)); }
        return v => f.apply(null, args.map(a => a(v)));
      }
      if (Object.prototype.hasOwnProperty.call(EXPR_CONST, name)) { const k = EXPR_CONST[name]; return () => k; }
      used.add(name);
      return v => { const n = v[name]; return n == null ? NaN : n; };
    }
    throw exprError('no esperaba «' + (t.v) + '»', t.i);
  }

  const fn = parseExpr();
  if (p < T.length) throw exprError('sobra «' + T[p].v + '» al final', T[p].i);
  return { fn, vars: used };
}

/* Compila y avisa con mensaje amable; devuelve null si la fórmula está vacía
   y { error, pos } si no se entiende (pos: el carácter, desde 0). */
function exprTry(src) {
  try {
    if (!String(src || '').trim()) return null;
    return exprCompile(src);
  } catch (e) { return { error: e.message || String(e), pos: e.pos }; }
}


