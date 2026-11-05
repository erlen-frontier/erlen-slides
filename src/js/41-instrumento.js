/* ==== 41-instrumento.js ==== */
'use strict';
/* ================= datos de instrumento =================
   Arrastras el archivo que escupe el equipo y la gráfica sale con los ejes y
   las unidades correctas. Es donde más esfuerzo no recompensado se pierde:
   copiar columnas y volver a escribir unidades que ya venían en el archivo. */

const TECNICAS = [
  { id: 'xrd', n: 'Difracción de rayos X',
    x: '2θ (°)', y: 'Intensidad (u. a.)', kind: 'linea',
    prueba: (x0, x1, ys) => x0 >= 2 && x1 <= 160 && x1 - x0 > 12 && ys.max > 20 },
  { id: 'ftir', n: 'FTIR',
    x: 'Número de onda (cm⁻¹)', y: 'Transmitancia (%)', kind: 'linea', invertirX: true,
    prueba: (x0, x1) => x0 >= 350 && x1 <= 4600 && x1 - x0 > 900 },
  { id: 'tga', n: 'TGA',
    x: 'Temperatura (°C)', y: 'Masa (%)', kind: 'linea',
    prueba: (x0, x1, ys) => x0 >= 15 && x1 <= 1200 && x1 - x0 > 100 && ys.max <= 105 && ys.min >= -5 && ys.max > 60 },
  { id: 'cv', n: 'Voltamperometría',
    x: 'Potencial (V)', y: 'Corriente (µA)', kind: 'linea',
    prueba: (x0, x1) => x0 >= -3 && x1 <= 3 && x1 - x0 > 0.4 },
  { id: 'uvvis', n: 'UV-Vis',
    x: 'Longitud de onda (nm)', y: 'Absorbancia (u. a.)', kind: 'linea',
    prueba: (x0, x1) => x0 >= 180 && x1 <= 1400 && x1 - x0 > 120 },
  { id: 'uvvis-dr', n: 'UV-Vis · reflectancia difusa',
    x: 'Longitud de onda (nm)', y: 'Reflectancia (%)', kind: 'linea',
    prueba: () => false },   /* se reconoce por el nombre («reflectancia», «DRS»): el contenido no basta */
  { id: 'raman', n: 'Raman',
    x: 'Desplazamiento Raman (cm⁻¹)', y: 'Intensidad (u. a.)', kind: 'linea',
    prueba: (x0, x1) => x0 >= 0 && x0 < 300 && x1 > 900 && x1 <= 4000 },
  { id: 'pl', n: 'Fotoluminiscencia',
    x: 'Longitud de onda (nm)', y: 'Intensidad PL (u. a.)', kind: 'linea',
    prueba: () => false },   /* se confunde con UV-Vis: se elige por el nombre o a mano */
  { id: 'generico', n: 'Datos sin identificar', x: 'x', y: 'y', kind: 'linea', prueba: () => false }
];

/* Nombre del archivo, primero; el contenido, después. */
const POR_EXTENSION = { xy: 'xrd', uxd: 'xrd', raw: 'xrd', xrdml: 'xrd', dif: 'xrd', spc: 'ftir' };
function tecnicaPorNombre(nombre) {
  const n = String(nombre || '').toLowerCase();
  const ext = (n.split('.').pop() || '');
  if (POR_EXTENSION[ext]) return POR_EXTENSION[ext];
  if (/xrd|drx|difract/.test(n)) return 'xrd';
  if (/ftir|irtf|infrarro/.test(n)) return 'ftir';
  if (/raman/.test(n)) return 'raman';
  if (/reflect|(^|[^a-z])drs([^a-z]|$)/.test(n)) return 'uvvis-dr';
  if (/uv[-_ ]?vis|absorb/.test(n)) return 'uvvis';
  if (/(^|[^a-z])pl([^a-z]|$)|fotolum|photolum/.test(n)) return 'pl';
  if (/tga|termograv/.test(n)) return 'tga';
  if (/(^|[^a-z])cv([^a-z]|$)|voltamp/.test(n)) return 'cv';
  return null;
}

/* Reconoce el tipo de medida por el intervalo de los datos. */
function detectaTecnica(texto, nombre) {
  const porNombre = tecnicaPorNombre(nombre);
  const t = parseTable(texto);
  if (!t.rows.length || t.rows[0].length < 2) return null;
  const xs = t.rows.map(r => r[0]).filter(isFinite);
  const ys = t.rows.map(r => r[1]).filter(isFinite);
  if (xs.length < 8) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const info = { min: Math.min(...ys), max: Math.max(...ys) };
  const descendente = xs[0] > xs[xs.length - 1];
  let elegida = porNombre ? TECNICAS.find(x => x.id === porNombre) : null;
  if (!elegida) {
    /* El FTIR casi siempre viene de mayor a menor número de onda. */
    if (descendente && x0 >= 350 && x1 <= 4600) elegida = TECNICAS.find(x => x.id === 'ftir');
    else elegida = TECNICAS.find(x => x.prueba(x0, x1, info));
  }
  if (!elegida) return null;
  return { tec: elegida, filas: t.rows.length, x0, x1, cols: t.rows[0].length, porNombre: !!porNombre };
}

/* Crea el bloque de gráfica ya rotulado. */
function bloqueInstrumento(texto, det, nombre) {
  const b = nuevoBloqueEn('chart', {});
  if (!b) return null;
  b.data = texto;
  /* Procedencia: el archivo y su huella, para poder actualizar la gráfica
     cuando el archivo vuelva a llegar con datos nuevos. */
  if (typeof marcaFuente === 'function') marcaFuente(b, nombre || det.tec.n, { instrumento: det.tec.n }).then(() => renderInspector());
  b.kind = det.tec.kind;
  b.xlabel = det.tec.x;
  b.ylabel = det.tec.y;
  b.tecnica = det.tec.id;
  if (det.tec.invertirX) b.invertirX = true;
  if (!b.title) b.title = '';
  commit();
  return b;
}

/* Aviso con salida: identifica, pero deja cambiar de opinión. */
function avisaInstrumento(det, b) {
  toast(det.tec.n + ' · ' + det.filas + ' puntos, de ' + sigFig(det.x0, 4) + ' a ' + sigFig(det.x1, 4),
    null, { t: 'No es eso', fn: () => openTecnica(b) });
}
function openTecnica(b) {
  const cuerpo = h('div');
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
    'Elige la técnica y los ejes se rotulan solos, con la unidad entre paréntesis como piden las revistas.'));
  const rej = h('div', { class: 'lay-grid', style: 'grid-template-columns:repeat(2,1fr)' });
  TECNICAS.forEach(t => rej.append(h('button', {
    class: 'lay-opt' + (b.tecnica === t.id ? ' on' : ''),
    onclick: () => {
      b.tecnica = t.id; b.xlabel = t.x; b.ylabel = t.y;
      if (t.invertirX) b.invertirX = true; else delete b.invertirX;
      commit(); closeModal(); toast('Ejes de ' + t.n);
    }
  }, h('span', { class: 'lb' }, t.n), h('span', { class: 'tec-ejes' }, t.x + ' · ' + t.y))));
  cuerpo.append(rej);
  openModal({ title: 'Tipo de medida', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn', onclick: closeModal }, 'Dejarlo como está')] });
}


