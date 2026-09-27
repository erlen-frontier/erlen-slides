/* ==== 39-notacion.js ==== */
'use strict';
/* ================= notación científica automática =================
   Cien decisiones tipográficas por presentación que nadie quiere tomar y que
   separan una diapositiva de posgrado de una de licenciatura. Solo se aplica
   al texto plano: nunca dentro de una ecuación entre $…$ ni en el código. */

const ELEMENTOS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re ' +
  'Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh ' +
  'Fl Mc Lv Ts Og').split(' ');
/* Abreviaturas orgánicas de uso corriente en materiales híbridos. */
const GRUPOS_ORG = ['MA', 'FA', 'EA', 'Me', 'Et', 'Pr', 'Bu', 'Ph', 'Ac', 'Cp', 'Bn'];
const SIMBOLOS = new Set(ELEMENTOS.concat(GRUPOS_ORG));

const UNIDADES = ('nm|µm|um|mm|cm|dm|km|m|Å|pm|mg|µg|ug|kg|g|ng|mL|ml|µL|uL|L|l|mol|mmol|µmol|M|mM|µM|nM|' +
  'kHz|MHz|GHz|THz|Hz|meV|keV|MeV|eV|kJ|J|mJ|kW|mW|W|kV|mV|V|mA|µA|uA|A|nA|MPa|kPa|GPa|Pa|bar|atm|Torr|' +
  'K|°C|°|min|ms|µs|us|ns|ps|fs|s|h|d|rpm|ppm|ppb|%|wt%|at%|cps|counts|u\\.a\\.|a\\.u\\.').split('|');
const RE_UNIDAD = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*(' + UNIDADES.join('|') + ')(?![\\w°])', 'g');
const SUP = { '-': '⁻', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '0': '⁰' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const aSup = s => String(s).split('').map(c => SUP[c] || c).join('');
const aSub = s => String(s).split('').map(c => SUB[c] || c).join('');
const ESPACIO_FINO = ' ';    // espacio fino entre número y unidad
const MENOS = '−';

/* ¿Es una fórmula química de verdad? Se exige que TODOS los símbolos existan,
   que haya al menos dos y algún número: así «DRX», «R2» o «SEM» no se tocan. */
const RE_SIMBOLO = new RegExp('(?:' + GRUPOS_ORG.join('|') + '|[A-Z][a-z]?)\\d*', 'g');
function esFormula(tok) {
  if (!/\d/.test(tok)) return false;
  if (!/^[A-Za-z0-9()·]+$/.test(tok)) return false;
  const limpio = tok.replace(/[()·]/g, '');
  const partes = limpio.match(RE_SIMBOLO);
  if (!partes || partes.length < 2) return false;
  if (partes.join('') !== limpio) return false;
  return partes.every(p => SIMBOLOS.has(p.replace(/\d+$/, '')));
}
function formulaUnicode(tok) {
  return tok.replace(/([A-Za-z)\]])(\d+)/g, (_, a, d) => a + aSub(d));
}

/* Divide «mg/L» o «g cm-3» en unidad con exponentes negativos. */
function unidadBonita(u) {
  const partes = u.split('/');
  if (partes.length === 2) return partes[0] + ESPACIO_FINO + partes[1].replace(/(\d+)$/, '') + aSup('-' + (/(\d+)$/.exec(partes[1]) ? RegExp.$1 : '1'));
  return u;
}

/* Índices de Miller: (00l), (hk0), (1-10), {100}, [001], <110>. Sin
   protegerlos, «(00l)» se leía como cero litros y «(10l)» como 10 l. Se
   apartan antes de tocar el texto y se devuelven intactos al final. */
const RE_MILLER = /[({[<](?:[-−]?[0-9hkliℓ]){3,4}[)}\]>]/g;
function sinMiller(txt, fn) {
  const guardados = [];
  const s = fn(String(txt).replace(RE_MILLER, m => '\u0000' + (guardados.push(m) - 1) + '\u0000'));
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[+i]);
}

/* Transforma un trozo de texto plano. Nunca recibe matemáticas ni código. */
function notacion(txt) {
  return sinMiller(txt == null ? '' : txt, notacionSinMiller);
}
function notacionSinMiller(txt) {
  let s = txt;
  /* 1 · unidades compuestas con barra: 10 mg/L, 4000 rpm, 5 mL/min */
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*([A-Za-zµÅ°%]+)\/([A-Za-zµÅ°]+)(\d?)/g, (m0, n, a, b, e) => {
    if (UNIDADES.indexOf(a) < 0 || UNIDADES.indexOf(b) < 0) return m0;
    return n + ESPACIO_FINO + a + ESPACIO_FINO + b + aSup('-' + (e || '1'));
  });
  /* 2 · número + unidad simple, con espacio fino */
  s = s.replace(RE_UNIDAD, (m0, n, u) => n + (u === '°' ? '' : ESPACIO_FINO) + u);
  /* 3 · 2theta y las letras griegas escritas con palabras */
  s = s.replace(/\b2\s*theta\b/gi, '2θ');
  s = s.replace(/\b(alpha|beta|gamma|delta|lambda|mu|nu|sigma|omega|theta|phi|chi|tau|rho|epsilon)\b/g,
    w => ({ alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', lambda: 'λ', mu: 'μ',
      nu: 'ν', sigma: 'σ', omega: 'ω', theta: 'θ', phi: 'φ', chi: 'χ',
      tau: 'τ', rho: 'ρ', epsilon: 'ε' }[w]));
  /* 4 · fórmulas químicas */
  s = s.replace(/[A-Za-z0-9()·]+/g, tok => esFormula(tok) ? formulaUnicode(tok) : tok);
  /* 5 · menos de verdad delante de un número */
  s = s.replace(/(^|[\s(:=~])-(\d)/g, (m0, a, d) => a + MENOS + d);
  /* 6 · exponentes escritos como ^2 */
  s = s.replace(/\^(-?\d+)(?![\d])/g, (m0, e) => aSup(e.replace('-', '-')));
  return s;
}
const notacionOn = m => (m || S.deck.meta).notacion !== false;
/* Punto de entrada usado por el render: respeta el ajuste del proyecto. */
function conNotacion(txt) { return notacionOn() ? notacion(txt) : txt; }

/* ---------- versión para LaTeX ----------
   En el .tex sale como siunitx y mhchem, que es lo correcto, no como texto. */
function notacionTex(txt) {
  return sinMiller(txt == null ? '' : txt, notacionTexSinMiller);
}
function notacionTexSinMiller(txt) {
  let s = txt;
  /* Solo se convierten las unidades que siunitx conoce de verdad; las demás
     (u. a., counts…) se quedan como texto: mejor eso que un PDF que no compila. */
  const conocida = u => Object.prototype.hasOwnProperty.call(SI_MAP, u);
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*([A-Za-zµÅ°%]+)\/([A-Za-zµÅ°]+)(\d?)/g, (m0, n, a, b, e) => {
    if (!conocida(a) || !conocida(b)) return m0;
    return '\\SI{' + n.replace(',', '.') + '}{\\' + siUnidad(a) + '\\per\\' + siUnidad(b) + (e && e !== '1' ? '\\tothe{' + e + '}' : '') + '}';
  });
  s = s.replace(RE_UNIDAD, (m0, n, u) => conocida(u) ? '\\SI{' + n.replace(',', '.') + '}{\\' + siUnidad(u) + '}' : m0);
  s = s.replace(/[A-Za-z0-9()·]+/g, tok => esFormula(tok) ? '\\ce{' + tok + '}' : tok);
  return s;
}
const SI_MAP = { nm: 'nano\\meter', 'µm': 'micro\\meter', um: 'micro\\meter', mm: 'milli\\meter', cm: 'centi\\meter',
  m: 'meter', km: 'kilo\\meter', mg: 'milli\\gram', g: 'gram', kg: 'kilo\\gram', 'µg': 'micro\\gram',
  L: 'liter', l: 'liter', mL: 'milli\\liter', ml: 'milli\\liter', mol: 'mole', mmol: 'milli\\mole',
  s: 'second', ms: 'milli\\second', min: 'minute', h: 'hour', K: 'kelvin', '°C': 'celsius', '°': 'degree',
  eV: 'electronvolt', meV: 'milli\\electronvolt', keV: 'kilo\\electronvolt', J: 'joule', W: 'watt',
  V: 'volt', mV: 'milli\\volt', A: 'ampere', mA: 'milli\\ampere', Hz: 'hertz', kHz: 'kilo\\hertz',
  MHz: 'mega\\hertz', GHz: 'giga\\hertz', Pa: 'pascal', kPa: 'kilo\\pascal', MPa: 'mega\\pascal',
  '%': 'percent', rpm: 'rpm', ppm: 'ppm', ppb: 'ppb', bar: 'bar', 'Å': 'angstrom',
  ns: 'nano\\second', 'µs': 'micro\\second', us: 'micro\\second', ps: 'pico\\second',
  nA: 'nano\\ampere', 'µA': 'micro\\ampere', uA: 'micro\\ampere', mJ: 'milli\\joule',
  kJ: 'kilo\\joule', mW: 'milli\\watt', kW: 'kilo\\watt', kV: 'kilo\\volt',
  GPa: 'giga\\pascal', THz: 'tera\\hertz', MeV: 'mega\\electronvolt',
  mM: 'milli\\molar', 'µM': 'micro\\molar', nM: 'nano\\molar', M: 'molar',
  'µL': 'micro\\liter', uL: 'micro\\liter', 'µmol': 'micro\\mole', pm: 'pico\\meter',
  dm: 'deci\\meter', ng: 'nano\\gram', d: 'day' };
function siUnidad(u) { return SI_MAP[u] || u.replace(/[^A-Za-z]/g, ''); }
/* Unidades que siunitx no trae de fábrica y hay que declarar en el preámbulo. */
const SI_EXTRA = { rpm: 'rpm', ppm: 'ppm', ppb: 'ppb', molar: 'M' };
function declaraUnidades(tex) {
  const out = [];
  Object.keys(SI_EXTRA).forEach(k => {
    if (tex.indexOf('\\' + k) >= 0) out.push('\\DeclareSIUnit\\' + k + '{' + SI_EXTRA[k] + '}');
  });
  return out;
}


