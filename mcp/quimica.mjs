/* SPDX-License-Identifier: AGPL-3.0-only */
/* De SMILES o de un archivo MOL a la estructura nativa de Erlen Slides
   ({atomos, enlaces, estilo}, 45-estructura.js): un dibujo vectorial que se
   sigue editando en el lienzo de estructuras y sale como TikZ en el .tex, no
   una imagen.

   RDKit (@rdkit/rdkit, la misma biblioteca que usa el editor en
   web/quimica-worker.js) interpreta la entrada, calcula coordenadas 2D,
   escribe los aromáticos en forma de Kekulé, que es como los dibuja la app,
   coloca las cuñas de los estereocentros y dice cuántos hidrógenos lleva cada
   átomo. Aquí solo se traduce: ninguna decisión química se toma a mano. */
import {ErrorUso} from './motor.mjs';

const EN_L = 40;            // longitud de enlace del dibujo (EN_L en 45-estructura.js)
const MAX_ATOMOS = 250;     // más que eso no se lee en una diapositiva

let rdkit = null;
async function RDKit() {
  rdkit ||= import('@rdkit/rdkit').then(m => m.default()).catch(e => {
    rdkit = null;
    throw new ErrorUso('No se pudo cargar RDKit (@rdkit/rdkit). Ejecuta «npm ci». Detalle: ' + String(e && e.message || e).split('\n')[0]);
  });
  return rdkit;
}

/* V2000: bloque de átomos, bloque de enlaces y las cargas de «M  CHG». La
   carga también puede venir codificada en la columna de la línea del átomo. */
const CARGA_COLUMNA = {1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3};
function leeMolV2000(mb) {
  const l = mb.split(/\r?\n/);
  const cab = l[3] || '';
  if (/V3000/.test(cab)) throw new ErrorUso('La molécula es demasiado grande para dibujarla en una diapositiva (formato V3000).');
  const na = parseInt(cab.slice(0, 3), 10), nb = parseInt(cab.slice(3, 6), 10);
  if (!(na >= 0) || !(nb >= 0)) throw new ErrorUso('El bloque MOL no tiene la cabecera V2000 esperada.');
  const atomos = [], enlaces = [];
  for (let i = 0; i < na; i++) {
    const s = l[4 + i];
    const c = CARGA_COLUMNA[parseInt(s.slice(36, 39), 10)] || 0;
    atomos.push({x: parseFloat(s.slice(0, 10)), y: parseFloat(s.slice(10, 20)), el: s.slice(31, 34).trim(), carga: c});
  }
  for (let i = 0; i < nb; i++) {
    const s = l[4 + na + i];
    enlaces.push({a: parseInt(s.slice(0, 3), 10) - 1, b: parseInt(s.slice(3, 6), 10) - 1, orden: parseInt(s.slice(6, 9), 10), estereo: parseInt(s.slice(9, 12), 10) || 0});
  }
  /* «M  CHG» manda sobre la columna cuando está. */
  let hayChg = false;
  for (const s of l.slice(4 + na + nb)) {
    if (!s.startsWith('M  CHG')) continue;
    if (!hayChg) { atomos.forEach(a => { a.carga = 0; }); hayChg = true; }
    const n = parseInt(s.slice(6, 9), 10);
    for (let k = 0; k < n; k++) {
      const i = parseInt(s.slice(9 + 8 * k, 13 + 8 * k), 10) - 1, q = parseInt(s.slice(13 + 8 * k, 17 + 8 * k), 10);
      if (atomos[i]) atomos[i].carga = q;
    }
  }
  return {atomos, enlaces};
}

/* Entrada: {smiles} o {mol}. Salida: la estructura en unidades del dibujo,
   con el recuento de hidrógenos de RDKit en `_h` para que la app decida si
   hace falta fijarlo, y lo que conviene contarle al modelo. */
export async function estructuraDesde({smiles, mol, nombre}) {
  const RD = await RDKit();
  const entrada = smiles != null ? String(smiles).trim() : String(mol || '');
  if (!entrada) throw new ErrorUso('Falta el SMILES o el bloque MOL.');
  if (entrada.length > 20000) throw new ErrorUso('La entrada química es demasiado larga.');
  const m = RD.get_mol(entrada);
  if (!m || (m.is_valid && !m.is_valid())) {
    m && m.delete && m.delete();
    throw new ErrorUso((smiles != null ? 'RDKit no reconoce el SMILES «' + entrada.slice(0, 120) + '»' : 'RDKit no pudo leer el bloque MOL' + (nombre ? ' de «' + nombre + '»' : '')) +
      '. Revisa paréntesis, cierres de anillo, corchetes de cargas y aromáticos.');
  }
  try {
    /* Un MOL que ya trae su dibujo se respeta; un SMILES o un MOL sin
       coordenadas se dibujan con RDKit. */
    const traeDibujo = smiles == null && /^\s*-?\d/m.test(entrada) && leeMolV2000Seguro(entrada);
    if (!traeDibujo) m.set_new_coords();
    const {atomos, enlaces} = leeMolV2000(m.get_molblock());
    if (!atomos.length) throw new ErrorUso('La molécula no tiene átomos.');
    if (atomos.length > MAX_ATOMOS) throw new ErrorUso('La molécula tiene ' + atomos.length + ' átomos pesados; en una diapositiva se leen bien hasta ' + MAX_ATOMOS + '. Muestra un fragmento o usa una imagen.');
    const hs = JSON.parse(m.get_json()).molecules[0].atoms.map(a => a.impHs || 0);
    /* La escala se toma de la mediana de las longitudes de enlace: así un MOL
       dibujado con otra unidad queda igual que uno de RDKit. */
    const L = enlaces.map(e => Math.hypot(atomos[e.a].x - atomos[e.b].x, atomos[e.a].y - atomos[e.b].y)).filter(x => x > 1e-6).sort((p, q) => p - q);
    const f = EN_L / (L.length ? L[Math.floor(L.length / 2)] : 1.5);
    separaFragmentos(atomos, enlaces, 1.5 * EN_L / f);
    const cx = atomos.reduce((s, a) => s + a.x, 0) / atomos.length, cy = atomos.reduce((s, a) => s + a.y, 0) / atomos.length;
    const ids = atomos.map((_, i) => 'a' + (i + 1));
    const est = {
      /* El eje y del MOL crece hacia arriba y el del dibujo hacia abajo. */
      atomos: atomos.map((a, i) => ({id: ids[i], x: Math.round((a.x - cx) * f * 100) / 100, y: Math.round(-(a.y - cy) * f * 100) / 100, el: a.el, carga: a.carga, _h: hs[i]})),
      enlaces: enlaces.map((e, i) => ({id: 'e' + (i + 1), a: ids[e.a], b: ids[e.b], orden: Math.min(3, Math.max(1, e.orden)),
        /* V2000: 1 = cuña (hacia el lector), 6 = rayas (hacia atrás); la punta
           estrecha está en el primer átomo, como en el dibujo de la app. */
        tipo: e.estereo === 1 ? 'cuna' : e.estereo === 6 ? 'raya' : 'normal'})),
      estilo: 'diapo'
    };
    const avisos = [];
    if (enlaces.some(e => e.orden > 3)) avisos.push('La molécula tenía enlaces aromáticos o especiales sin forma de Kekulé; se dibujaron como sencillos. Revísala en el editor.');
    const d = JSON.parse(m.get_descriptors());
    return {est, info: {smiles: m.get_smiles(), masa_molar: Math.round(d.amw * 1000) / 1000, atomos_pesados: atomos.length,
      estereocentros: d.NumAtomStereoCenters || 0, sin_asignar: d.NumUnspecifiedAtomStereoCenters || 0, motor: 'RDKit ' + RD.version(), avisos}};
  } finally { m.delete(); }
}
/* Una sal o varios iones son fragmentos sin enlace entre sí, y RDKit los deja
   casi encima unos de otros (el Na⁺ junto al NH₂, dos OH⁻ superpuestos). Se
   ponen en fila, en el orden en que llegan, centrados en altura y separados
   por un hueco; la geometría de cada fragmento no se toca. Unidades del MOL. */
function separaFragmentos(atomos, enlaces, hueco) {
  const grupo = atomos.map((_, i) => i);
  const raiz = i => { while (grupo[i] !== i) i = grupo[i] = grupo[grupo[i]]; return i; };
  enlaces.forEach(e => { grupo[raiz(e.a)] = raiz(e.b); });
  const orden = [], miembros = new Map();
  atomos.forEach((_, i) => { const r = raiz(i); if (!miembros.has(r)) { miembros.set(r, []); orden.push(r); } miembros.get(r).push(i); });
  if (orden.length < 2) return;
  let x = 0;
  for (const r of orden) {
    const m = miembros.get(r);
    const xs = m.map(i => atomos[i].x), ys = m.map(i => atomos[i].y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), yc = (Math.min(...ys) + Math.max(...ys)) / 2;
    m.forEach(i => { atomos[i].x += x - x0; atomos[i].y -= yc; });
    x += (x1 - x0) + hueco;
  }
}
function leeMolV2000Seguro(t) {
  try { const {atomos} = leeMolV2000(t); return atomos.some(a => Math.abs(a.x) > 1e-4 || Math.abs(a.y) > 1e-4); } catch { return false; }
}
