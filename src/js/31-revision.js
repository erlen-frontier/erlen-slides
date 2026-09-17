/* ==== 31-revision.js ==== */
'use strict';
/* ================= revisión antes de presentar =================
   Una sola pasada por todo el mazo que junta lo que conviene arreglar antes
   de proyectar: desbordes, contraste, figuras sin pie, imágenes con poca
   resolución, diapositivas huecas y tiempos. */

const lumRel = hex => {
  const v = leeColor(hex) || { r: 0, g: 0, b: 0 };
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(v.r) + 0.7152 * f(v.g) + 0.0722 * f(v.b);
};
const contraste = (a, b) => {
  const l1 = lumRel(a), l2 = lumRel(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* El fondo que de verdad hay detrás de un elemento: se sube por los padres
   hasta encontrar uno con relleno opaco. */
function fondoEfectivo(el, raiz) {
  let n = el;
  while (n) {
    const v = leeColor(getComputedStyle(n).backgroundColor);
    if (v && v.a > 0.85) return getComputedStyle(n).backgroundColor;
    if (n === raiz) break;
    n = n.parentElement;
  }
  return getComputedStyle(raiz).backgroundColor;
}

/* Títulos que solo nombran la sección en vez de decir el hallazgo.
   Solo los que de verdad no dicen nada sobre lo que se está enseñando.
   «Motivación», «Conclusiones» o «Referencias» son encabezados legítimos de una
   charla y señalarlos sería ruido: una revisión que grita de más se ignora. */
const TITULOS_VACIOS = ['resultados', 'resultados y discusion', 'discusion', 'datos',
  'graficas', 'grafica', 'analisis', 'caracterizacion', 'experimental',
  'metodologia', 'metodos', 'materiales y metodos', 'introduccion', 'antecedentes'];
/* Y solo importa en la diapositiva que enseña algo: si hay una gráfica, una
   figura, una tabla o una ecuación, el título debería decir qué se ve ahí. */
const MUESTRA_ALGO = new Set(['chart', 'func', 'image', 'galeria', 'table', 'math',
  'montaje', 'smart', 'estruct', 'geo', 'video', 'chem']);
function tituloGenerico(t) {
  const n = sinAcentos(String(t || '').toLowerCase().trim()).replace(/[.:;·]+$/, '');
  if (!n || n.split(/\s+/).length > 5) return false;
  return TITULOS_VACIOS.includes(n) || /^(resultados|metodos?|figura|tabla|grafica|imagen|esquema)\s*\d*$/.test(n);
}
function revisaMazo() {
  const deck = S.deck, m = deck.meta;
  const fallos = [];
  const add = (grado, i, qué, cómo) => fallos.push({ grado, i, qué, cómo });
  const wb = $('#workbench');
  const antes = wb.innerHTML;
  wb.innerHTML = '';

  if (!(m.title || '').trim()) add('aviso', 0, 'La presentación no tiene título', 'Diseño → Datos de la portada.');
  if (!(m.authors || '').trim()) add('sugerencia', 0, 'No hay autores en la portada', 'Diseño → Datos de la portada.');

  const secs = [];
  deck.slides.forEach((sl, i) => { if (sl.layout === 'section') secs.push(i); });
  secs.forEach(i => {
    const sig = deck.slides[i + 1];
    if (!sig || sig.layout === 'section') add('aviso', i, 'La sección «' + (deck.slides[i].title || '') + '» no tiene diapositivas', 'Añade contenido o quita la sección.');
  });

  deck.slides.forEach((sl, i) => {
    const raiz = renderSlide(deck, i, 'export', 99);
    raiz.style.position = 'relative';
    wb.innerHTML = ''; wb.append(raiz);
    const zonasN = zonasDe(sl.layout);
    const bloques = zonas(sl).flat();

    if (zonasN > 0 && sl.layout !== 'toc') {
      if (!(sl.title || '').trim()) add('aviso', i, 'Diapositiva sin título', 'Un título ayuda al público a ubicarse y alimenta el índice.');
      else if (tituloGenerico(sl.title) && bloques.some(b => MUESTRA_ALGO.has(b.type)))
        add('sugerencia', i, 'El título «' + sl.title.trim() + '» no dice nada',
        'Escribe en el título el mensaje de la diapositiva: «La banda prohibida baja con el yodo» en vez de «Resultados». Es lo que más sube la retención según la regla 3 de las diez de PLOS.');
      if (!bloques.length) add('error', i, 'Diapositiva vacía', 'Añade contenido o quítala antes de presentar.');
    }
    /* desborde del cuerpo */
    const cuerpo = raiz.querySelector('.fbody');
    if (cuerpo && cuerpo.scrollHeight > cuerpo.clientHeight + 3) {
      add('error', i, 'El contenido no cabe (' + (cuerpo.scrollHeight - cuerpo.clientHeight) + ' px de más)',
        'Baja el tamaño del texto, estrecha los márgenes o pasa a un diseño de columnas.');
    }
    /* Contraste de cada texto contra el fondo que de verdad tiene detrás:
       el título del marco va sobre su barra, no sobre el fondo del papel. */
    const vistos = new Set();
    Array.from(raiz.querySelectorAll('.blk, .ft-t, .ft-s, .tp-title, .sec-name, .bb-title, .footline')).forEach(el => {
      if (!(el.textContent || '').trim()) return;          /* sin texto no hay nada que leer */
      const c = getComputedStyle(el).color;
      const cv = leeColor(c);
      if (!cv || cv.a < 0.5) return;                        /* texto invisible: no es un problema de contraste */
      const fondo = fondoEfectivo(el, raiz);
      const clave = c + '|' + fondo;
      if (vistos.has(clave)) return;
      vistos.add(clave);
      const r = contraste(hex6(c, fondo), hex6(fondo));
      if (r < 3) add('error', i, 'Texto con poco contraste (' + r.toFixed(1) + ':1)', 'Por debajo de 3:1 no se lee en un proyector con luz de sala. Cambia el color o el tema.');
      else if (r < 4.5) add('sugerencia', i, 'Contraste justo (' + r.toFixed(1) + ':1)', 'Sube a 4.5:1 si la sala tiene luz.');
    });
    /* figuras */
    bloques.forEach(b => {
      if (['image', 'chart', 'func', 'smart', 'video'].indexOf(b.type) >= 0 && !(b.caption || '').trim())
        add('sugerencia', i, 'Figura sin pie', 'Un pie de una línea dice qué hay que mirar; además numera la figura.');
      if (b.type === 'image' && !b.src) add('error', i, 'Hay un bloque de figura sin imagen', 'Elige una imagen o quita el bloque.');
      if (b.type === 'image' && b.src && !(b.alt || '').trim() && !(b.caption || '').trim())
        add('sugerencia', i, 'Imagen sin texto alterno ni pie', 'Sirve para lectores de pantalla y para el PowerPoint.');
    });
    Array.from(raiz.querySelectorAll('.b-image img')).forEach(im => {
      if (/^data:image\/svg|\.svg(\?|$)/i.test(im.src || '')) return;   /* el vector no pierde nitidez */
      const anchoPx = im.getBoundingClientRect().width;
      const nat = im.naturalWidth || 0;
      if (nat && anchoPx > 20 && nat < anchoPx * 0.85)
        add('aviso', i, 'Imagen de poca resolución (' + nat + ' px para ' + Math.round(anchoPx) + ' px)',
          'Al proyectar se verá borrosa. Busca una versión más grande o redúcela en la diapositiva.');
    });
    /* carga cognitiva alta */
    if (typeof cargaDe === 'function' && zonasN > 0 && sl.layout !== 'toc') {
      const c = cargaDe(sl, deck);
      if (c.nivel === 'alta') {
        const peor = ['redundancia', 'atencion', 'senal'].map(k => c[k]).find(x => x.g === 'alta');
        add('sugerencia', i, 'Carga cognitiva alta: ' + peor.txt, peor.fix || 'Abre «Carga» en el panel de la diapositiva.');
      }
    }
    /* citas que apuntan a una referencia que ya no está */
    if (typeof clavesEnTexto === 'function') {
      const perdidas = new Set();
      const mira = t => clavesEnTexto(t).forEach(c => { if (!refPorClave(c, deck)) perdidas.add(c); });
      mira(sl.title); mira(sl.subtitle);
      bloques.forEach(b => textosCitables(b).forEach(mira));
      if (perdidas.size) add('error', i, 'Hay ' + perdidas.size + (perdidas.size === 1 ? ' cita que apunta a una referencia que ya no existe' : ' citas que apuntan a referencias que ya no existen'),
        'Se ven como «[cita perdida]». Vuelve a añadir la referencia o borra la marca: ' + Array.from(perdidas).map(c => '[@' + c + ']').join(' '));
    }
    /* dólares desparejados */
    [sl.title, sl.subtitle].concat(bloques.map(b => b.text || b.body || '')).forEach(t => {
      if (!t) return;
      const n = (String(t).match(/(^|[^\\])\$/g) || []).length;
      if (n % 2) add('aviso', i, 'Hay un signo $ sin pareja', 'Las matemáticas van entre $ y $; para un dólar literal, escribe \\$.');
    });
  });
  if (typeof calidadCientifica === 'function') fallos.push(...calidadCientifica(deck));
  wb.innerHTML = antes;

  const conTiempo = deck.slides.filter(sl => minutosDe(sl)).length;
  const total = minutosTotales(deck);
  if (conTiempo && conTiempo < deck.slides.length * 0.6)
    add('sugerencia', 0, 'Solo ' + conTiempo + ' de ' + deck.slides.length + ' diapositivas tienen tiempo previsto', 'Con todas cronometradas, la vista de presentador te avisa si te atrasas.');
  return { fallos, total, conTiempo };
}

const GRADO = { error: ['Hay que arreglarlo', '●'], aviso: ['Conviene revisarlo', '●'], sugerencia: ['Se puede mejorar', '●'] };

function openRevision() {
  const cuerpo = h('div');
  cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 12px' }, 'Revisando todas las diapositivas…'));
  const caja = openModal({ title: 'Revisión', size: 'modal-lg', body: cuerpo, foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')] });
  setTimeout(() => {
    const r = revisaMazo();
    cuerpo.innerHTML = '';
    const n = r.fallos.length;
    const cuenta = g => r.fallos.filter(x => x.grado === g).length;
    cuerpo.append(h('div', { class: 'rv-marcador' },
      h('div', { class: 'rv-m rv-error' }, h('b', null, String(cuenta('error'))), h('span', null, 'que arreglar')),
      h('div', { class: 'rv-m rv-aviso' }, h('b', null, String(cuenta('aviso'))), h('span', null, 'que revisar')),
      h('div', { class: 'rv-m rv-sug' }, h('b', null, String(cuenta('sugerencia'))), h('span', null, 'que mejorar')),
      h('div', { class: 'rv-m' }, h('b', null, r.total ? mmss(r.total) : '—'), h('span', null, 'min previstos'))));
    if (!n) {
      cuerpo.append(h('p', { style: 'margin:14px 0 0;font-size:14px;line-height:1.6' },
        'No encontré nada que arreglar: ninguna diapositiva se desborda, el contraste alcanza, las figuras llevan pie y no hay huecos. Puedes presentar con tranquilidad.'));
      return;
    }
    ['error', 'aviso', 'sugerencia'].forEach(g => {
      const lista = r.fallos.filter(x => x.grado === g);
      if (!lista.length) return;
      cuerpo.append(h('span', { class: 'sublabel', style: 'margin:16px 0 6px' }, GRADO[g][0]));
      lista.forEach(f => cuerpo.append(h('button', { class: 'rv-fila g-' + g,
        onclick: () => { closeModal(); S.cur = clamp(f.i, 0, S.deck.slides.length - 1); S.selBlock = null; renderAll(); } },
        h('span', { class: 'rv-i' }, String(f.i + 1)),
        h('span', { class: 'rv-tx' }, h('b', null, f.qué), h('span', null, f.cómo)))));
    });
  }, 60);
  return caja;
}

