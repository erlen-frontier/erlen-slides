/* ==== 51-asistente.js ==== */
'use strict';
/* ================= el asistente =================
   Un ayudante que vive dentro de la app. No adivina: conoce el catálogo de
   cosas que la app sabe hacer —cada una con su nombre, su explicación, dónde
   está el control y cómo ejecutarla— y empareja lo que escribes contra ese
   catálogo. Por eso responde al instante, sin descargar nada y sin internet.

   El catálogo está escrito con la misma forma que usan las herramientas de un
   modelo de lenguaje (nombre, descripción, argumento con sus opciones), así
   que el día que se le enchufe un modelo local no hay que reescribirlo: el
   modelo elige la herramienta y esta misma capa la ejecuta. */

/* ---------- palabras ---------- */
const ASIS_VACIAS = new Set(('el la los las un una unos unas de del a al en y o u que me mi mis por para con se lo le les su sus es esta este esto estos estas como porfavor puedes podrias quiero necesito hazme haz pon ponme dame muestra muestrame ensename ayudame ayuda favor tu yo mas muy ya aqui ahi alli ahora tambien hay va van sobre desde hasta cuando donde cual cuales quien todo toda todos todas otra otro cosa cosas hacer hago hace')
  .split(' '));
function asisPal(t) {
  return sinAcentos(String(t || '').toLowerCase())
    .replace(/[^a-z0-9%+\-.]+/g, ' ').split(/\s+/)
    .filter(w => w && !ASIS_VACIAS.has(w));
}
/* Coincidencia tolerante: exacta, o por raíz de cinco letras (plurales y
   conjugaciones), o por número escrito. */
const ASIS_NUM = { una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
function asisCasa(q, t) {
  if (q === t) return 1;
  if (ASIS_NUM[q] && String(ASIS_NUM[q]) === t) return 1;
  if (q.length > 3 && t.length > 3) {
    const n = Math.min(5, q.length, t.length);
    if (q.slice(0, n) === t.slice(0, n)) return 0.72;
  }
  return 0;
}
/* Puntúa una frase contra varios campos de texto con distinto peso. */
function asisPuntua(qtok, campos) {
  let s = 0; const cubre = new Set();
  campos.forEach(([txt, peso]) => {
    const set = asisPal(txt);
    qtok.forEach(q => {
      let mejor = 0;
      set.forEach(t => { const v = asisCasa(q, t); if (v > mejor) mejor = v; });
      if (mejor) { s += mejor * peso; cubre.add(q); }
    });
  });
  return { s, cubre: qtok.length ? cubre.size / qtok.length : 0 };
}
/* Elige la opción de un argumento a partir de la frase. */
function asisOpcion(qtok, ops) {
  let mejor = null;
  ops.forEach(o => {
    const al = Array.isArray(o.alias) ? o.alias.join(' ') : String(o.alias || '');
    const r = asisPuntua(qtok, [[o.n, 3], [al, 3], [o.d || '', 0.6]]);
    if (r.s > 0 && (!mejor || r.s > mejor.s)) mejor = { op: o, s: r.s };
  });
  return mejor && mejor.s >= 2 ? mejor.op : null;
}

/* ---------- catálogo de opciones, tomado de la propia app ---------- */
const opLayouts = () => LAYOUTS.map(l => ({ v: l.id, n: l.name, d: l.d, alias: l.id }));
const opBloques = () => BLOCK_DEFS.map(b => ({ v: b.id, n: b.name, d: b.desc || '', alias: b.id }));
const ALIAS_TEMA = { nocturno: 'nocturno oscuro noche negro', metropolis: 'metropolis moderno minimalista congreso',
  madrid: 'madrid clasico azul', cambridge: 'cambridge granate vino academia', sobrio: 'sobrio serifa articulo tesis formal' };
const opTemas = () => Object.keys(THEMES).map(k => ({ v: k, n: THEMES[k].name, d: THEMES[k].desc, alias: ALIAS_TEMA[k] || k }));
/* Colores por nombre, para «ponlo morado» sin tener que dar el hex. */
const COLOR_NOMBRE = { rojo: '#C0392B', azul: '#2C6BB0', verde: '#2E8B57', morado: '#7A4FBF', violeta: '#7A4FBF',
  lila: '#8E5BC6', naranja: '#D9782D', anaranjado: '#D9782D', amarillo: '#C9A227', dorado: '#B8860B',
  guinda: '#87201F', vino: '#87201F', granate: '#87201F', negro: '#1B1F24', gris: '#5A6470',
  turquesa: '#2E8E96', cyan: '#2E8E96', rosa: '#B5487F', cafe: '#6B4E36', marron: '#6B4E36' };
const opFuentes = () => FUENTES.filter(f => f.id !== 'auto').map(f => ({ v: f.id, n: f.n, d: f.esp || '', alias: f.id }));
const opTrans = () => TRANS.map(t => ({ v: t.id, n: t.n, d: t.d, alias: t.id }));
const opPiezas = () => LAB.map(p => ({ v: p.id, n: p.n, d: LAB_GRUPOS[p.grp] || '', alias: p.id.replace(/-/g, ' ') }));
const opEstiloLab = () => ESTILOS_LAB.map(e => ({ v: e.id, n: e.n, d: e.d, alias: e.id }));
const opColores = () => LIQ_COLORES.map(([v, n]) => ({ v, n, alias: n }));

/* ---------- el catálogo de acciones ---------- */
/* Cada entrada: qué es, cómo se dice, dónde vive el control y qué ejecuta.
   'corre' devuelve un texto de confirmación, o null si no pudo. */
const ACC = [];
function accion(o) { ACC.push(o); return o; }

function asisHayBloque() { return !!(S.selBlock && findBlock(S.selBlock)); }
function asisMontajeActual() {
  /* solo cuenta lo que hay en la diapositiva que estás viendo */
  const en = zonas(curSlide()).flat().filter(b => b.type === 'montaje');
  if (!en.length) return null;
  const sel = en.find(b => b.id === S.selBlock);
  return sel || en[en.length - 1];
}

/* --- navegar --- */
accion({ id: 'ir', grp: 'Moverte', n: 'Ir a una diapositiva',
  d: 'Salta a la diapositiva que le digas por número.',
  clave: 'ir salta llevame vete numero',
  frases: 'ir a la diapositiva numero llevame salta ve a pasa a abre la diapositiva',
  arg: { n: 'número', tipo: 'numero', min: 1 },
  corre: v => {
    const i = clamp((v | 0) - 1, 0, S.deck.slides.length - 1);
    S.cur = i; S.selBlock = null; renderAll();
    return 'Estás en la diapositiva ' + (i + 1) + ' de ' + S.deck.slides.length + '.';
  } });
accion({ id: 'siguiente', grp: 'Moverte', n: 'Ir a la siguiente', d: 'Avanza una diapositiva.',
  clave: 'siguiente avanza adelante',
  frases: 'siguiente adelante avanza proxima continua',
  corre: () => { S.cur = clamp(S.cur + 1, 0, S.deck.slides.length - 1); S.selBlock = null; renderAll(); return 'Diapositiva ' + (S.cur + 1) + '.'; } });
accion({ id: 'anterior', grp: 'Moverte', n: 'Ir a la anterior', d: 'Retrocede una diapositiva.',
  clave: 'anterior atras regresa',
  frases: 'anterior atras regresa retrocede previa',
  corre: () => { S.cur = clamp(S.cur - 1, 0, S.deck.slides.length - 1); S.selBlock = null; renderAll(); return 'Diapositiva ' + (S.cur + 1) + '.'; } });
accion({ id: 'clasificador', grp: 'Moverte', n: 'Ver todas las diapositivas',
  d: 'Abre la vista de clasificador, donde se ven todas juntas y se reordenan arrastrando.',
  donde: 'Botón ⊞ abajo a la derecha, o Ctrl+G', foco: '#sorterBtn',
  clave: 'clasificador todas mosaico reordenar',
  frases: 'ver todas las diapositivas clasificador panorama reordenar mover diapositivas mosaico',
  corre: () => { alternaClasificador(); return 'Ahí las tienes todas. Arrástralas para reordenarlas.'; } });

/* --- diapositivas --- */
accion({ id: 'nueva', grp: 'Diapositivas', n: 'Nueva diapositiva',
  d: 'Añade una diapositiva con el diseño que elijas; nace con contenido de arranque para no ver una hoja en blanco.',
  donde: 'Panel derecho → Insertar → Nueva diapositiva', foco: '#addSlideBtn',
  clave: 'nueva agregar anadir crear otra',
  frases: 'nueva diapositiva agrega anade crea otra diapositiva slide lamina',
  arg: { n: 'diseño', tipo: 'opcion', ops: opLayouts, pred: 'content' },
  corre: v => { addSlide(v || 'content'); return 'Lista: diapositiva ' + (S.cur + 1) + ' con el diseño «' + (LAY[v || 'content'] || {}).name + '».'; } });
accion({ id: 'diseno', grp: 'Diapositivas', n: 'Cambiar el diseño de esta diapositiva',
  d: 'Reacomoda la diapositiva actual sin perder nada: los bloques de las zonas que desaparecen se juntan en la última que queda.',
  donde: 'Panel derecho → Diapositiva → Acomodo del texto',
  clave: 'diseno acomodo layout columnas comparacion cuadricula pasos enunciado',
  frases: 'cambiar diseno acomodo layout pasar a dos columnas comparacion cuadricula pasos enunciado ancho barra',
  arg: { n: 'diseño', tipo: 'opcion', ops: opLayouts },
  corre: v => { if (!v) return null; changeLayout(curSlide(), v); return 'Esta diapositiva ahora usa «' + (LAY[v] || {}).name + '».'; } });
accion({ id: 'duplicar', grp: 'Diapositivas', n: 'Duplicar esta diapositiva', d: 'Hace una copia justo después.',
  clave: 'duplicar copiar clonar',
  frases: 'duplicar copiar clonar repetir diapositiva',
  corre: () => { const c = deepCopy(curSlide()); c.id = uid(); zonas(c).forEach(z => z.forEach(b => { b.id = uid(); })); S.deck.slides.splice(S.cur + 1, 0, c); S.cur++; commit(); return 'Copiada como diapositiva ' + (S.cur + 1) + '.'; } });
accion({ id: 'borrar-diap', grp: 'Diapositivas', n: 'Quitar esta diapositiva',
  d: 'La elimina. Sale un aviso con «Deshacer» por si te arrepientes.',
  clave: 'borrar eliminar quitar',
  frases: 'borrar eliminar quitar esta diapositiva',
  corre: () => { if (S.deck.slides.length < 2) return null; const n = S.cur + 1; delSlide(S.cur); return 'Quitada la diapositiva ' + n + '. Puedes deshacerlo con Ctrl+Z.'; } });
accion({ id: 'titulo', grp: 'Diapositivas', n: 'Poner título a esta diapositiva',
  d: 'Escribe el título de la diapositiva actual. También alimenta el índice.',
  clave: 'titulo encabezado',
  frases: 'titulo encabezado nombre de la diapositiva titular',
  arg: { n: 'texto', tipo: 'texto' },
  corre: v => { if (!v) return null; curSlide().title = v; commit(); return 'Título puesto: «' + v + '».'; } });
accion({ id: 'ajustar', grp: 'Diapositivas', n: 'Ajustar el texto al espacio',
  d: 'Busca el mayor tamaño de letra con el que todo cabe sin desbordarse.',
  donde: 'Panel derecho → Diapositiva → Tamaño del texto',
  clave: 'ajustar cabe desborda encoge letra',
  frases: 'ajustar texto que quepa no cabe se desborda achicar agrandar letra tamano',
  corre: () => { ajustarTexto(curSlide()); commit(); return 'Ajustado al ' + Math.round((curSlide().scale || 1) * 100) + ' %.'; } });
accion({ id: 'notas', grp: 'Diapositivas', n: 'Escribir las notas del orador',
  d: 'Abre el editor de notas con vista previa. Las notas salen en la vista de presentador, en el guion y como \\note en el .tex.',
  clave: 'notas',
  frases: 'notas guion apuntes que voy a decir recordatorio orador',
  corre: () => { openNotasEditor(S.cur); return 'Ahí tienes las notas de esta diapositiva.'; } });
accion({ id: 'notas-todas', grp: 'Diapositivas', n: 'Ver todas las notas de corrido',
  d: 'Todas las notas del mazo en una sola pantalla, para escribir el guion de una sentada.',
  clave: 'todas notas corrido',
  frases: 'todas las notas guion completo de corrido seguido',
  corre: () => { openNotasEditor(S.cur, 'todas'); return 'Todas las notas, una tras otra.'; } });

/* --- insertar --- */
accion({ id: 'insertar', grp: 'Insertar', n: 'Insertar un bloque',
  d: 'Mete en la diapositiva actual el tipo de contenido que le pidas: texto, viñetas, ecuación, reacción, figura, gráfica, tabla, cita, código, video, diagrama, estructura química, montaje, teorema o figura geométrica.',
  donde: 'Panel derecho → Insertar',
  clave: 'insertar bloque contenido',
  frases: 'insertar anadir agregar meter poner bloque contenido',
  arg: { n: 'tipo', tipo: 'opcion', ops: opBloques },
  corre: v => { if (!v) return null; addBlockToSlide(v, S.insCol || 1); const d = BLOCK_DEFS.find(x => x.id === v); return 'Añadido: ' + (d ? d.name.toLowerCase() : v) + '.'; } });
accion({ id: 'ecuacion', grp: 'Insertar', n: 'Insertar una ecuación',
  d: 'Abre la paleta con 101 plantillas de matemáticas, física, química y biología. Escribir LaTeX a mano siempre es opcional.',
  clave: 'ecuacion formula matematica',
  frases: 'ecuacion formula matematicas latex integral derivada sumatoria katex',
  corre: () => { addBlockToSlide('math', S.insCol || 1); return 'Elige una plantilla de la paleta o escribe la tuya.'; } });
accion({ id: 'reaccion', grp: 'Insertar', n: 'Insertar una reacción química',
  d: 'Reacciones con flechas, estados de agregación y subíndices; sale como \\ce de mhchem en el .tex.',
  clave: 'reaccion quimica mhchem',
  frases: 'reaccion quimica ecuacion quimica mhchem flecha equilibrio',
  corre: () => { addBlockToSlide('chem', S.insCol || 1); return 'Arma la reacción con la paleta: flechas y estados con un clic.'; } });
accion({ id: 'montaje-nuevo', grp: 'Insertar', n: 'Insertar un montaje de laboratorio',
  d: 'El lienzo con 96 piezas de vidrio, equipo, biología, circuitos y óptica, con cuatro estilos de dibujo y color por pieza.',
  clave: 'montaje laboratorio material vidrio',
  frases: 'montaje laboratorio vidrio material equipo esquema experimental diagrama circuito optica',
  corre: () => { addBlockToSlide('montaje', S.insCol || 1); return 'Ahí está el editor: elige piezas de la galería y únelas con flechas o cables.'; } });
accion({ id: 'estructura', grp: 'Insertar', n: 'Insertar una estructura química',
  d: 'El lienzo tipo ChemDraw: ángulos de 30°, carbonos implícitos, hidrógenos por valencia, anillos que se fusionan.',
  clave: 'estructura molecula chemdraw',
  frases: 'estructura molecula chemdraw anillo benceno enlace esqueleto',
  corre: () => { addBlockToSlide('estruct', S.insCol || 1); return 'Dibuja la molécula; la fórmula aparece en orden de Hill mientras la armas.'; } });
accion({ id: 'datos-instrumento', grp: 'Insertar', n: 'Traer datos de un instrumento',
  d: 'Pega o suelta un archivo de DRX, FTIR, UV-Vis, TGA, Raman o voltamperometría y la app reconoce la técnica y pone los ejes correctos.',
  donde: 'Panel derecho → Insertar → Gráfica de datos',
  clave: 'datos instrumento drx ftir tga raman uv',
  frases: 'datos instrumento drx dxr difraccion ftir infrarrojo uv vis tga raman voltamperometria csv importar medicion',
  corre: () => { const b = nuevoBloqueEn('chart', {}); if (!b) return null; commit(); openChartEditor(b); return 'Pega los datos o suelta el archivo: reconozco la técnica y pongo los ejes.'; } });
accion({ id: 'escala', grp: 'Insertar', n: 'Poner barra de escala a una micrografía',
  d: 'Añade la barra de escala calibrada sobre una imagen de microscopía.',
  clave: 'escala micrografia',
  frases: 'barra escala micrografia sem tem micras nanometros calibrar',
  corre: () => { addBlockToSlide('image', S.insCol || 1); return 'Elige la imagen y luego activa la barra de escala en la pestaña Bloque.'; } });

/* --- el montaje --- */
accion({ id: 'pieza', grp: 'Montaje', n: 'Añadir una pieza al montaje',
  d: 'Mete una pieza concreta —un matraz, un transistor, una lente, una célula— en el montaje de esta diapositiva.',
  clave: 'pieza matraz vaso probeta tubo pipeta lente resistencia celula imane polea bureta crisol',
  frases: 'anade pieza matraz vaso probeta tubo lente resistencia celula bacteria imane polea al montaje',
  arg: { n: 'pieza', tipo: 'opcion', ops: opPiezas },
  corre: v => {
    if (!v || !LABK[v]) return null;
    let b = asisMontajeActual(), nuevo = false;
    if (!b) { b = nuevoBloqueEn('montaje', {}); if (!b) return null; b.mont = montajeVacio(); nuevo = true; }
    if (!b.mont) b.mont = montajeVacio();
    const n = b.mont.piezas.length;
    b.mont.piezas.push({ id: uid(), k: v, x: 120 + (n % 5) * 130, y: 120 + Math.floor(n / 5) * 150, esc: 1.1, et: '' });
    commit();
    return LABK[v].n + (nuevo ? ' colocada en un montaje nuevo.' : ' colocada en el montaje.') + ' Ábrelo con doble clic para moverla.';
  } });
accion({ id: 'estilo-lab', grp: 'Montaje', n: 'Cambiar el estilo del montaje',
  d: 'Los cuatro modos de dibujo: Con cuerpo (vidrio tintado y reflejo), Línea, Sólido (siluetas rellenas, para el fondo del aula) y Técnico (trazo fino, como un plano).',
  clave: 'estilo dibujo montaje silueta plano tecnico',
  frases: 'estilo dibujo montaje linea solido tecnico cuerpo silueta plano',
  arg: { n: 'estilo', tipo: 'opcion', ops: opEstiloLab },
  siNo: 'Primero necesitas un montaje en esta diapositiva. Pídeme «inserta un montaje de laboratorio» y luego le cambiamos el estilo.',
  corre: v => { const b = asisMontajeActual(); if (!b || !b.mont || !v) return null; b.mont.estilo = v; commit(); return 'Montaje en estilo «' + EK_LAB[v].n + '». ' + EK_LAB[v].d; } });
accion({ id: 'color-lab', grp: 'Montaje', n: 'Cambiar el color del líquido del montaje',
  d: 'El color de los líquidos y los rayos de todas las piezas del montaje. Cada pieza puede además llevar el suyo.',
  clave: 'color liquido montaje',
  frases: 'color liquido montaje azul rojo verde amarillo violeta ambar turquesa',
  arg: { n: 'color', tipo: 'opcion', ops: opColores },
  siNo: 'Primero necesitas un montaje en esta diapositiva. Pídeme «inserta un montaje de laboratorio» y después le damos color.',
  corre: v => { const b = asisMontajeActual(); if (!b || !b.mont || !v) return null; b.mont.col = v; commit(); const n = (LIQ_COLORES.find(c => c[0] === v) || [])[1]; return 'Líquidos en ' + (n || v).toLowerCase() + '.'; } });

/* --- diseño --- */
accion({ id: 'tema', grp: 'Diseño', n: 'Cambiar el tema',
  d: 'Los temas Beamer intercambiables. Cambia colores, tipografía y pie de página de toda la presentación.',
  donde: 'Panel derecho → Diseño → Tema',
  clave: 'tema',
  frases: 'tema estilo apariencia presentacion metropolis madrid cambridge nocturno oscuro sobrio',
  arg: { n: 'tema', tipo: 'opcion', ops: opTemas },
  corre: v => { if (!v) return null; S.deck.meta.theme = v; commit(); return 'Tema ' + THEMES[v].name + ' · ' + THEMES[v].desc + '.'; } });
accion({ id: 'acento', grp: 'Diseño', n: 'Cambiar el color de acento',
  d: 'El color propio de la presentación. Se aplica a títulos, viñetas, cajas y pie, y sale al .tex como \\definecolor + \\setbeamercolor{structure}.',
  donde: 'Panel derecho → Diseño → Color de acento',
  clave: 'acento',
  frases: 'color acento institucional destacado universidad marca',
  arg: { n: 'color', tipo: 'color' },
  corre: v => { if (!v) return null; S.deck.meta.acento = v; commit(); return 'Acento en ' + v + '. Las series de las gráficas no cambian: su paleta está comprobada para contraste y daltonismo.'; } });
accion({ id: 'fuente', grp: 'Diseño', n: 'Cambiar la tipografía',
  d: 'Diez tipografías; seis son las de LaTeX, incrustadas en la app, así que la pantalla muestra la letra exacta del PDF.',
  donde: 'Panel derecho → Diseño → Tipografía',
  clave: 'tipografia fuente letra',
  frases: 'tipografia letra fuente serif palatino times termes latin modern fira',
  arg: { n: 'tipografía', tipo: 'opcion', ops: opFuentes },
  corre: v => { if (!v) return null; S.deck.meta.fuente = v; commit(); const f = FUENTES.find(x => x.id === v); return 'Tipografía ' + f.n + '.'; } });
accion({ id: 'transicion', grp: 'Diseño', n: 'Cambiar la transición',
  d: 'El efecto al pasar de diapositiva. Respeta «reducir movimiento» del sistema y viaja al PDF como \\transdissolve o \\transwipe reales.',
  clave: 'transicion',
  frases: 'transicion efecto pasar cambio fundido desplazamiento animacion',
  arg: { n: 'transición', tipo: 'opcion', ops: opTrans },
  corre: v => { if (!v) return null; S.deck.meta.trans = v; commit(); const t = TRANS.find(x => x.id === v); return 'Transición ' + t.n.toLowerCase() + '.'; } });
accion({ id: 'pie', grp: 'Diseño', n: 'Configurar el pie de página',
  d: 'Plantillas al estilo Beamer: solo el número, una línea de texto, dos o tres celdas tipo split o infolines. Con piezas entre llaves como {autor} o {n}/{N}.',
  clave: 'pie footline',
  frases: 'pie pagina footline numero de pagina abajo franja',
  corre: () => { openPieEditor(); return 'Elige la plantilla y las celdas; se exporta como \\setbeamertemplate{footline} real.'; } });
accion({ id: 'logo', grp: 'Diseño', n: 'Poner el escudo institucional',
  d: 'El logo en la portada y en el pie de cada diapositiva; se exporta al .tex y se descarga junto con las figuras.',
  donde: 'Panel derecho → Diseño → Escudo institucional',
  clave: 'logo escudo institucional',
  frases: 'logo escudo institucion universidad udg cucei imagen institucional',
  corre: () => { S.tab = 'design'; renderInspector(); openDrawer(true); return 'Está en Diseño → Escudo institucional: súbelo y elige si va centrado o en la esquina.'; } });

/* --- revisar --- */
accion({ id: 'revisar', grp: 'Revisar', n: 'Revisar antes de presentar',
  d: 'Recorre todo el mazo buscando desbordes, texto muy pequeño, contraste bajo, figuras sin pie y secciones vacías.',
  clave: 'revisar revision comprobar errores falta faltan problemas',
  frases: 'revisar revision comprobar errores problemas antes de presentar checar validar esta lista que falta',
  corre: () => { openRevision(); return 'Ahí va la revisión completa, ordenada por gravedad.'; } });
accion({ id: 'sala', grp: 'Revisar', n: 'Simulacro de sala',
  d: 'Muestra cómo se verá en un proyector desgastado, desde el fondo del aula y con visión daltónica.',
  clave: 'simulacro sala proyector aula daltonismo',
  frases: 'simulacro sala proyector aula distancia daltonismo como se vera fondo',
  corre: () => { openSala(); return 'Prueba las tres vistas: proyector, distancia y daltonismo.'; } });
accion({ id: 'archivo-final', grp: 'Revisar', n: 'Comprobar el archivo final',
  d: 'Resolución de las imágenes, tipografías, número de páginas y peso del PDF antes de entregarlo.',
  clave: 'archivo final resolucion peso',
  frases: 'comprobar archivo final resolucion peso paginas entregar pdf listo',
  corre: () => { openComprobacion(); return 'Ahí tienes el estado del archivo final.'; } });
accion({ id: 'pendientes', grp: 'Revisar', n: 'Ver los pendientes',
  d: 'La lista de cosas que anotaste dentro de la presentación, cada una anclada a su diapositiva.',
  clave: 'pendientes tareas',
  frases: 'pendientes tareas faltantes recordatorios apuntes por hacer',
  corre: () => { openPendientes(); return 'Estos son tus pendientes.'; } });

/* --- presentar --- */
accion({ id: 'presentar', grp: 'Presentar', n: 'Presentar', d: 'Pantalla completa desde la primera diapositiva.',
  clave: 'presentar proyectar exponer',
  frases: 'presentar proyectar pantalla completa empezar exponer',
  corre: () => { startPresent(false); return 'A presentar. O para volver, P abre la vista de presentador.'; } });
accion({ id: 'presentador', grp: 'Presentar', n: 'Presentar con vista de presentador',
  d: 'Segunda ventana con cronómetro, la diapositiva siguiente y tus notas.',
  clave: 'presentador segunda pantalla',
  frases: 'vista presentador segunda pantalla cronometro notas monitor',
  corre: () => { startPresent(false); alternaPresentador(); return 'Vista de presentador abierta en la segunda ventana.'; } });
accion({ id: 'ensayo', grp: 'Presentar', n: 'Ensayar con cronómetro',
  d: 'Mide tu tiempo real por diapositiva, avisa cuando te pasas y al salir compara previsto contra real.',
  clave: 'ensayar ensayo cronometro practicar',
  frases: 'ensayar ensayo cronometro practicar tiempo minutos medir',
  corre: () => { presentaEnsayo(); return 'Ensayo en marcha: al salir te muestro previsto contra real.'; } });

/* --- exportar --- */
accion({ id: 'pdf', grp: 'Exportar', n: 'Exportar a PDF', d: 'El PDF con acabado Beamer.',
  clave: 'pdf',
  frases: 'pdf exportar imprimir descargar documento',
  corre: () => { openPdfHelp(); return 'Ahí tienes las dos maneras de sacar el PDF.'; } });
accion({ id: 'tex', grp: 'Exportar', n: 'Ver el código Beamer',
  d: 'El .tex completo, listo para Overleaf o para compilar con dos pasadas de pdflatex.',
  clave: 'tex latex beamer overleaf codigo',
  frases: 'codigo latex tex beamer overleaf fuente compilar',
  corre: () => { openTexView(); return 'Este es el .tex que produce tu presentación.'; } });
accion({ id: 'pptx', grp: 'Exportar', n: 'Exportar a PowerPoint',
  d: 'Un .pptx real, con los textos y las tablas editables.',
  clave: 'powerpoint pptx',
  frases: 'powerpoint pptx office ppt exportar',
  corre: () => { exportPPTX(); return 'Descargando el .pptx.'; } });
accion({ id: 'kit', grp: 'Exportar', n: 'Kit de defensa (.zip)',
  d: 'Todo lo del día de la presentación en un .zip: PDF, guion, folleto, respaldo y figuras.',
  clave: 'kit defensa zip',
  frases: 'kit defensa zip todo junto respaldo dia de la presentacion',
  corre: () => { kitDefensa(); return 'Armando el .zip con todo.'; } });
accion({ id: 'folleto', grp: 'Exportar', n: 'Folleto para repartir', d: 'Dos, tres o seis diapositivas por hoja.',
  clave: 'folleto handout',
  frases: 'folleto handout repartir imprimir hojas por pagina',
  corre: () => { openFolleto(); return 'Elige cuántas por hoja.'; } });
accion({ id: 'respaldo', grp: 'Exportar', n: 'Descargar el proyecto (.json)',
  d: 'Un respaldo completo del proyecto que se puede volver a abrir aquí.',
  clave: 'respaldo json backup',
  frases: 'respaldo copia json guardar proyecto backup descargar',
  corre: () => { exportJSON(); return 'Respaldo descargado.'; } });

/* --- la app --- */
accion({ id: 'concentracion', grp: 'La app', n: 'Modo concentración',
  d: 'Esconde los paneles y deja solo la diapositiva. F9 lo enciende y lo apaga.',
  clave: 'concentracion enfoque distracciones',
  frases: 'concentracion enfoque sin distracciones esconder paneles limpio',
  corre: () => { alternaConcentracion(); return 'Modo concentración. F9 para volver.'; } });
accion({ id: 'apariencia', grp: 'La app', n: 'Cambiar la apariencia del editor',
  d: 'Claro, oscuro o el del sistema. Es solo el editor: no toca el tema de la presentación.',
  clave: 'apariencia editor interfaz',
  frases: 'apariencia editor claro oscuro modo noche sistema interfaz',
  arg: { n: 'apariencia', tipo: 'opcion', ops: () => [
    { v: 'claro', n: 'Clara', alias: 'claro dia blanco' },
    { v: 'oscuro', n: 'Oscura', alias: 'oscuro noche negro' },
    { v: 'auto', n: 'La del sistema', alias: 'auto automatica sistema' }] },
  corre: v => { if (!v) return null; cambiaTemaApp(v); return 'Apariencia ' + v + '.'; } });
accion({ id: 'codigo', grp: 'La app', n: 'Ver el código de esta diapositiva',
  d: 'Un panel con el LaTeX de la diapositiva actual, que se actualiza mientras editas. F7.',
  clave: 'codigo panel',
  frases: 'codigo de esta diapositiva ver latex panel f7',
  corre: () => { alternaCodigo(true); return 'Ahí está el código, y se actualiza mientras editas.'; } });
accion({ id: 'bitacora', grp: 'La app', n: 'Bitácora del documento',
  d: 'El historial por días: qué hiciste y cuándo, con el estado de cada jornada.',
  clave: 'bitacora historial dias',
  frases: 'bitacora historial dias que hice avance registro',
  corre: () => { openBitacora(); return 'Este es el historial por días.'; } });
accion({ id: 'atajos', grp: 'La app', n: 'Ayuda y atajos', d: 'La ayuda con pestañas: cómo se usa, glosario y atajos de teclado.',
  clave: 'ayuda atajos manual glosario',
  frases: 'ayuda atajos teclado manual glosario documentacion como se usa',
  corre: () => { openHelp(); return 'Ahí está la ayuda completa.'; } });

accion({ id: 'disposicion', grp: 'La app', n: 'Mover las herramientas',
  d: 'Elige dónde viven los controles: en una cinta de pestañas arriba, como en las apps de oficina (la de fábrica), o siempre a la vista en el panel de la derecha.',
  clave: 'herramientas cinta arriba panel derecha disposicion barra',
  frases: 'pon las herramientas arriba cinta como powerpoint barra superior panel de la derecha mover controles',
  arg: { n: 'sitio', tipo: 'opcion', ops: () => SITIOS_BARRA.map(x => ({ v: x.id, n: x.n, d: x.d,
    alias: x.id === 'arriba' ? 'arriba cinta powerpoint superior' : 'lado derecha panel lateral' })) },
  corre: v => { if (!v) return null; ponDisposicion(v); return v === 'arriba' ? 'Herramientas arriba, en una cinta con pestañas.' : 'Herramientas otra vez en el panel de la derecha.'; } });
accion({ id: 'animacion', grp: 'Diapositivas', n: 'Poner un efecto de entrada al bloque',
  d: 'Quince efectos de aparición para el bloque seleccionado, con su velocidad. Solo actúan al presentar y respetan «reducir movimiento».',
  clave: 'animacion efecto entrada aparicion rebote barrido cortina voltear destacar',
  frases: 'animacion efecto de entrada que aparezca animado rebote barrido cortina voltear destacar surgir',
  arg: { n: 'efecto', tipo: 'opcion', ops: () => ANIMS.map(a => ({ v: a.id, n: a.name, d: a.d || '' })) },
  siNo: 'Selecciona primero el bloque al que quieres ponerle el efecto.',
  corre: v => {
    const f = S.selBlock && findBlock(S.selBlock);
    if (!f || !v || !AK_ANIM[v]) return null;
    f.block.anim = v; f.block.step = v !== 'none';
    commit();
    return 'Ese bloque entra con «' + AK_ANIM[v].name + '». ' + (AK_ANIM[v].d || '');
  } });
accion({ id: 'transicion-lista', grp: 'Diseño', n: 'Ver todas las transiciones',
  d: 'Las once transiciones entre diapositivas, cada una con su equivalente real en el PDF.',
  clave: 'transiciones lista todas persiana destello caja empuje',
  frases: 'que transiciones hay lista de transiciones persiana destello caja empuje abrir cerrar',
  corre: () => { S.tab = 'design'; renderInspector(); openDrawer(true); return 'Están en Diseño → Transición. Todas viajan al PDF como orden de transición de página de verdad.'; } });

/* --- lo nuevo: diseñador, estilos, iconos y galería --- */
accion({ id: 'ideas', grp: 'Insertar', n: 'Ideas de diseño para esta figura',
  d: 'Mira la figura —forma, colores, dónde está el motivo y cuánto ruido tiene— y propone acomodos completos de la diapositiva, en miniatura y de verdad.',
  clave: 'ideas diseno disenador propuestas acomodo figura',
  frases: 'ideas de diseno disenador proponme acomodo para esta imagen figura que hago con esta foto',
  siNo: 'Necesito una figura en esta diapositiva. Pídeme «insertar figura» y en cuanto elijas la imagen te propongo acomodos.',
  corre: () => {
    const im = zonas(curSlide()).flat().find(x => (x.type === 'image' && x.src) || x.type === 'galeria');
    if (!im) return null;
    abreDisenador(im);
    return 'Ahí van las ideas: cada miniatura es tu diapositiva ya cambiada. Toca la que te guste.';
  } });
accion({ id: 'estilo-fig', grp: 'Insertar', n: 'Cambiar el estilo de la figura',
  d: 'Forma (esquinas suaves, círculo, hexágono, bordes difuminados), marco, sombra y filtro de color; el estilo se cuece en el archivo al exportar.',
  clave: 'estilo figura marco sombra filtro duotono redondeada circulo hexagono',
  frases: 'estilo de la figura marco sombra filtro blanco y negro duotono redondear recortar imagen',
  arg: { n: 'estilo', tipo: 'opcion', ops: () => [].concat(
    IMG_FORMAS.filter(x => x.id !== 'recta').map(x => ({ v: 'f:' + x.id, n: x.n, d: x.d })),
    IMG_MARCOS.filter(x => x.id !== 'none').map(x => ({ v: 'm:' + x.id, n: 'Marco ' + x.n.toLowerCase(), d: x.d })),
    IMG_FILTROS.filter(x => x.id !== 'none').map(x => ({ v: 'l:' + x.id, n: x.n, d: x.d })),
    [{ v: 's:1', n: 'Sombra', alias: 'sombra' }]) },
  siNo: 'Necesito una figura en esta diapositiva para poder cambiarle el estilo.',
  corre: v => {
    if (!v) return null;
    const im = zonas(curSlide()).flat().find(x => x.type === 'image' && x.src);
    if (!im) return null;
    if (!im.est) im.est = estiloImgPorOmision();
    const [k, val] = v.split(':');
    if (k === 'f') im.est.forma = val;
    else if (k === 'm') im.est.marco = val;
    else if (k === 'l') im.est.filtro = val;
    else im.est.sombra = !im.est.sombra;
    commit();
    return 'Figura con ' + (k === 'f' ? 'forma ' + FK_FORMA[val].n.toLowerCase() : k === 'm' ? 'marco ' + FK_MARCO[val].n.toLowerCase()
      : k === 'l' ? 'filtro ' + FK_FILTRO[val].n.toLowerCase() : (im.est.sombra ? 'sombra' : 'la sombra quitada')) + '.';
  } });
accion({ id: 'galeria-nueva', grp: 'Insertar', n: 'Insertar una galería de figuras',
  d: 'De dos a seis figuras con su letra (a), (b), (c) y un pie común, en cuadrícula, tira o mosaico. En el .tex sale como una figura con minipages.',
  clave: 'galeria collage varias figuras mosaico cuadricula subfiguras',
  frases: 'galeria de figuras collage varias imagenes juntas mosaico subfiguras a b c',
  corre: () => { addBlockToSlide('galeria', S.insCol || 1); return 'Suelta ahí las figuras: se numeran solas y comparten un pie.'; } });
accion({ id: 'icono', grp: 'Insertar', n: 'Insertar un icono',
  d: 'Uno de los 95 iconos vectoriales de la biblioteca, colocado solo en la diapositiva. Toma el color del tema y sale a TikZ.',
  clave: 'icono pictograma simbolo',
  frases: 'icono pictograma simbolo idea objetivo reloj candado nube cohete atomo',
  arg: { n: 'icono', tipo: 'opcion', ops: () => LAB.filter(x => x.grp === 'icono').map(x => ({ v: x.id, n: x.n, alias: x.id.replace(/-/g, ' ') })) },
  corre: v => {
    if (!v || !LABK[v]) return null;
    const b = nuevoBloqueEn('montaje', {}); if (!b) return null;
    b.mont = { piezas: [{ id: uid(), k: v, x: 400, y: 230, esc: 2.2, et: '' }], flechas: [], estilo: 'suave', col: 'auto' };
    b.w = 40;
    commit();
    return LABK[v].n + ' puesto. Con doble clic puedes cambiarle el tamaño, el color o añadirle más.';
  } });
accion({ id: 'forma', grp: 'Insertar', n: 'Insertar una forma o una llamada',
  d: 'Flechas, bocadillos, cintas, corchetes, marcos de encuadre y estrellas; muchas admiten una frase corta dentro.',
  clave: 'forma llamada flecha bocadillo cinta corchete marco estrella globo',
  frases: 'forma llamada flecha bocadillo globo de texto cinta corchete marco para senalar estrella explosion',
  arg: { n: 'forma', tipo: 'opcion', ops: () => LAB.filter(x => x.grp === 'forma').map(x => ({ v: x.id, n: x.n, alias: x.id.replace(/-/g, ' ') })) },
  corre: v => {
    if (!v || !LABK[v]) return null;
    let b = asisMontajeActual(), nuevo = false;
    if (!b) { b = nuevoBloqueEn('montaje', {}); if (!b) return null; b.mont = montajeVacio(); nuevo = true; }
    if (!b.mont) b.mont = montajeVacio();
    const n = b.mont.piezas.length;
    b.mont.piezas.push({ id: uid(), k: v, x: 200 + (n % 4) * 150, y: 160 + Math.floor(n / 4) * 160, esc: 1.6, et: '', txt: '' });
    commit();
    return LABK[v].n + (nuevo ? ' puesta.' : ' añadida al montaje.') + (formaConTexto(v) ? ' Con doble clic puedes escribirle texto dentro.' : '');
  } });

accion({ id: 'referencias', grp: 'Diapositivas', n: 'Referencias y citas',
  d: 'Pegas un DOI o un BibTeX y queda la referencia guardada, la cita corta al pie de la diapositiva y la bibliografía completa al exportar.',
  clave: 'referencia referencias cita citas bibliografia doi bibtex fuente acreditar',
  frases: 'referencias citar cita bibliografia doi bibtex de donde salio acreditar la figura fuente',
  corre: () => { openReferencias(); return 'Pega ahí el DOI o el BibTeX. La cita queda al pie de esta diapositiva y numerada por orden de aparición.'; } });
accion({ id: 'argumento', grp: 'Estructura', n: 'Ver el argumento',
  d: 'La charla como cadena de afirmaciones de una línea con la evidencia que sostiene a cada una; los huecos se ven como huecos.',
  clave: 'argumento afirmaciones afirmacion evidencia hilo estructura cadena',
  frases: 'ver el argumento la estructura de la charla las afirmaciones cadena de afirmaciones que se sostenga',
  corre: () => { abreArgumento(); return 'Cada renglón es una afirmación con verbo y su evidencia. Lo que esté en rojo o en naranja es lo que falta.'; } });
accion({ id: 'esqueleto', grp: 'Estructura', n: 'Empezar por el argumento',
  d: 'Charla nueva con el lienzo cerrado: primero se escriben las afirmaciones y solo cuando se sostienen se abre el diseño.',
  clave: 'esqueleto empezar por el argumento charla nueva desde cero',
  frases: 'empezar por el argumento charla nueva desde el argumento modo esqueleto',
  corre: () => { empiezaPorElArgumento(); return 'Escribe al menos tres afirmaciones con verbo. Cuando se sostengan, el lienzo se abre.'; } });
accion({ id: 'carga', grp: 'Revisar', n: 'Carga cognitiva de esta diapositiva',
  d: 'Tres indicadores explicados —redundancia, atención dividida, señalización— con el arreglo concreto de cada uno.',
  clave: 'carga cognitiva redundancia atencion dividida senalizacion mayer sobrecarga',
  frases: 'carga cognitiva esta muy cargada demasiado texto se entiende sobrecargada redundante',
  corre: () => { openCarga(); return 'Cada indicador trae qué pasa y cómo arreglarlo; la tira de arriba muestra toda la charla.'; } });
accion({ id: 'mirada', grp: 'Revisar', n: 'Recorrido del ojo',
  d: 'Estima dónde cae primero la mirada y dibuja el camino sobre la diapositiva. Si lo importante se mira de cuarto, lo ves antes que el público.',
  clave: 'mirada ojo recorrido donde se mira primero atencion visual jerarquia',
  frases: 'donde se mira primero recorrido del ojo la mirada jerarquia visual que se ve primero',
  corre: () => { if (!MIRADA.on) alternaMirada(); return 'Los círculos numerados son el orden estimado; la leyenda de abajo te dice si lo importante llega tarde.'; } });
accion({ id: 'tutor', grp: 'La app', n: 'Tutor de diseño',
  d: 'Las seis reglas que te explica cuando acomoda algo, y cuáles ya aplicas tú solo. Cuando una la haces tres veces, deja de explicártela.',
  clave: 'tutor reglas explicame por que aprender diseño lecciones',
  frases: 'tutor de diseño por que lo acomodo asi explicame las reglas no me expliques mas',
  corre: () => { openTutor(); return 'Ahí ves cuáles ya son tuyas. Si una te sobra, «Ya la sé» y no vuelve.'; } });
accion({ id: 'acabado-smart', grp: 'Figuras', n: 'Acabado del diagrama',
  d: 'Relleno, contorno, editorial o relieve: el mismo SmartArt con cuatro pieles. Vale igual en pantalla, en el PDF y en el PowerPoint.',
  clave: 'acabado diagrama smartart relleno contorno editorial relieve piel estilo del diagrama',
  frases: 'acabado del diagrama que el smartart se vea distinto estilo del diagrama contorno editorial relieve',
  req: () => { const f = S.selBlock && findBlock(S.selBlock); return !!(f && f.block.type === 'smart'); },
  arg: { n: 'acabado', tipo: 'opcion', ops: () => SMART_ACABADOS.map(x => ({ v: x.id, n: x.n })) },
  corre: v => { findBlock(S.selBlock).block.acab = v; commit(); return 'Acabado ' + SA[v].n + '. ' + SA[v].d; } });
accion({ id: 'diagrama', grp: 'Figuras', n: 'Insertar un diagrama',
  d: 'Dieciséis tipos: proceso, ciclo, jerarquía, espina de pescado, pila de capas, cronograma, mapa lateral, matrices y contraste, entre otros.',
  clave: 'diagrama smartart esquema espina ishikawa capas cronograma gantt mapa mental matriz contraste',
  frases: 'inserta un diagrama espina de pescado pila de capas cronograma mapa mental matriz 3x3 contraste ventajas limitaciones',
  arg: { n: 'tipo', tipo: 'opcion', ops: () => SMART_KINDS.map(k => ({ v: k.id, n: k.n })) },
  corre: v => {
    const b = nuevoBloqueEn('smart', { kind: v, items: deepCopy(SMART_EJEMPLOS[v] || []) });
    if (!b) return 'Esta diapositiva no admite bloques.';
    commit(); openSmartEditor(b);
    return SK[v].n + ': ' + SK[v].d;
  } });
accion({ id: 'acomodo', grp: 'Diapositivas', n: 'Cambiar el acomodo de la página',
  d: 'Veintidós plantillas de página: además de las de siempre, figura a sangre, dato grande, cita destacada, pantalla partida, cuadrícula 3×2, tres filas, figura con pie ancho y zigzag.',
  clave: 'acomodo plantilla de pagina distribucion sangre dato cita partida rejilla filas zigzag pie ancho',
  frases: 'cambiar el acomodo plantilla de pagina figura a sangre dato grande cita destacada pantalla partida zigzag',
  arg: { n: 'acomodo', tipo: 'opcion', ops: () => LAYOUTS.filter(l => l.z > 0).map(l => ({ v: l.id, n: l.name })) },
  corre: v => { changeLayout(curSlide(), v); return LAY[v].name + ': ' + LAY[v].d; } });
accion({ id: 'articulo', grp: 'Exportar', n: 'Esqueleto de artículo',
  d: 'Las afirmaciones son secciones, las notas son la prosa, las figuras van con pie y las referencias numeradas: un .tex de artículo desde la charla.',
  clave: 'articulo paper manuscrito esqueleto de articulo exportar articulo',
  frases: 'sacar el articulo de la charla esqueleto del paper convertir la charla en articulo',
  corre: () => { exportArticulo(); return 'Se descargó el .tex; compila con el mismo preámbulo que la charla.'; } });
accion({ id: 'ramas', grp: 'Estructura', n: 'Ramas de la charla',
  d: 'La del comité, la de diez minutos, la del congreso: ramas de la misma charla que comparten figuras y referencias.',
  clave: 'rama ramas version versiones variante la del comite la corta',
  frases: 'hacer una version corta rama para el comite versiones de la charla otra variante',
  corre: () => { openRamas(); return 'Crea una rama, quita lo que no va y actívala: presentar y exportar respetan la rama.'; } });
accion({ id: 'memoria', grp: 'Estructura', n: 'Buscar en todas mis charlas',
  d: 'Busca por título, texto y notas en la charla abierta y en las guardadas; trae la diapositiva con sus referencias y glosas.',
  clave: 'memoria buscar en mis charlas donde explique reutilizar diapositiva anterior',
  frases: 'donde explique buscar en mis otras charlas reutilizar una diapositiva de otra presentacion',
  arg: { n: 'qué', tipo: 'texto' },
  corre: v => { openMemoria(v || ''); return 'Escribe qué buscas; «Traer» la copia con lo que necesita.'; } });
accion({ id: 'linea-tiempo', grp: 'Presentar', n: 'La charla en el tiempo',
  d: 'Línea horizontal donde cada diapositiva es tan ancha como sus minutos; se arrastra para reequilibrar y muestra lo medido en el ensayo.',
  clave: 'linea de tiempo tiempo ritmo minutos por diapositiva reequilibrar',
  frases: 'ver la charla en el tiempo linea de tiempo donde se me va el tiempo ritmo de la charla',
  corre: () => { abreLineaTiempo(); return 'Arrastra el borde derecho de una diapositiva para darle más o menos minutos.'; } });
accion({ id: 'accesibilidad', grp: 'Revisar', n: 'Accesibilidad',
  d: 'Paleta segura para daltonismo, texto alterno desde el pie, contraste y MathML: qué cumple el archivo y qué le falta.',
  clave: 'accesibilidad accesible daltonismo alt texto alterno lector de pantalla contraste',
  frases: 'accesibilidad daltonicos texto alterno lector de pantalla que sea accesible',
  corre: () => { openAccesibilidad(); return 'Lo que esté en rojo se arregla desde ahí mismo.'; } });
accion({ id: 'nivel', grp: 'Público', n: 'Nivel de la charla',
  d: 'Comité, congreso o divulgación: la misma charla con distinta profundidad. Las glosas y los bloques marcados por nivel se muestran o se esconden.',
  clave: 'nivel publico comite congreso divulgacion sinodales general profundidad',
  frases: 'es para el comite es para divulgacion nivel de la charla publico general cambiar el nivel version para el congreso',
  arg: { n: 'nivel', tipo: 'opcion', ops: () => NIVELES.map(x => ({ v: x.id, n: x.n })) },
  corre: v => { ponNivel(v); return 'Nivel ' + NK[v].n + '. ' + NK[v].d; } });
accion({ id: 'glosario', grp: 'Público', n: 'Glosario en una frase',
  d: 'Marca un término como {{perovskita}} y escribe qué es en una frase; en divulgación sale al pie de la diapositiva.',
  clave: 'glosario glosa termino explicar en una frase definicion',
  frases: 'glosario explicar un termino en una frase definiciones para el publico general',
  corre: () => { openGlosas(); return 'Marca el término en el texto como {{así}} y escribe aquí la frase.'; } });
accion({ id: 'preguntas', grp: 'Presentar', n: 'Las preguntas que te van a hacer',
  d: 'Propone las preguntas de un sinodal a partir de tus diapositivas; cada respuesta se vuelve una diapositiva de respaldo enlazada.',
  clave: 'preguntas sinodal comite que me van a preguntar defensa respuesta preparar',
  frases: 'que me van a preguntar preguntas del comite preparar las respuestas ensayar preguntas defensa',
  corre: () => { openPreguntas(); return 'Prepara la respuesta de las que estén en rojo; cada una se vuelve un respaldo que sale con la tecla Q.'; } });
accion({ id: 'aprendido', grp: 'Presentar', n: 'Lo que aprendiste de tus charlas',
  d: 'Después de presentar marcas dónde preguntaron; con varias charlas se ve qué explicación confunde siempre.',
  clave: 'aprendido aprendizaje historial charlas retroalimentacion donde preguntaron confunde',
  frases: 'que aprendi de mis charlas donde me preguntan siempre retroalimentacion de las charlas',
  corre: () => { openAprendizaje(); return 'Se arma con lo que marcas al terminar de presentar.'; } });
accion({ id: 'subtitulos', grp: 'Presentar', n: 'Subtítulos al presentar',
  d: 'La tecla S al presentar muestra tus notas como subtítulos; otra vez, el texto en otro idioma que escribas en el panel de la diapositiva.',
  clave: 'subtitulos subtitulo bilingue ingles otro idioma accesibilidad sordos',
  frases: 'subtitulos al presentar poner subtitulos en ingles charla bilingue',
  corre: () => 'Al presentar, pulsa S: primero tus notas, luego el otro idioma (se escribe en Diapositiva → Subtítulos).' });
accion({ id: 'cuentamelo', grp: 'Estructura', n: 'Cuéntamelo primero',
  d: 'Hablas o pegas lo que dirías y la app saca las afirmaciones; cada una se vuelve una diapositiva y lo que dijiste alrededor, sus notas.',
  clave: 'cuentamelo contar hablar dictar voz microfono transcripcion',
  frases: 'te lo cuento hablar la charla dictar la charla desde lo que digo microfono',
  corre: () => { openCuentamelo(); return 'Habla o pega el texto y pulsa «Sacar las afirmaciones».'; } });
accion({ id: 'capas', grp: 'Figuras', n: 'Revelar la gráfica por capas',
  d: 'La gráfica seleccionada se construye al presentar: ejes, luego cada serie, el ajuste y el punto que importa. En el PDF salen como overlays.',
  clave: 'capas revelar por capas construir la grafica poco a poco overlay',
  frases: 'revelar la grafica por capas que la grafica se construya poco a poco mostrar las series una por una',
  req: () => { const f = S.selBlock && findBlock(S.selBlock); return !!(f && f.block.type === 'chart'); },
  corre: () => { const b = findBlock(S.selBlock).block; b.capas = true; commit(); return 'Listo: ' + nombresCapas(b).length + ' capas. En el panel del bloque puedes destacar un punto y escribir qué dices en cada una.'; } });
accion({ id: 'antes-despues', grp: 'Figuras', n: 'Antes y después',
  d: 'Un segundo estado de la figura seleccionada que entra como paso: el público ve exactamente qué se movió.',
  clave: 'antes despues comparar morph cambio segundo estado',
  frases: 'antes y despues comparar la misma figura que se vea el cambio segundo estado de la grafica',
  req: () => { const f = S.selBlock && findBlock(S.selBlock); return !!(f && (f.block.type === 'chart' || f.block.type === 'image')); },
  corre: () => { const b = findBlock(S.selBlock).block; b.despues = b.type === 'chart' ? { data: b.data || '' } : { src: '' }; commit(); S.tab = 'bloque'; renderInspector(); return b.type === 'chart' ? 'Pega en el panel los datos del «después»; los ejes ya abarcan los dos.' : 'Elige en el panel la imagen del «después».'; } });
accion({ id: 'derivacion', grp: 'Figuras', n: 'Mostrar la ecuación paso a paso',
  d: 'La ecuación seleccionada se parte en pasos; lo que cambia en cada uno se pinta del color de acento y el porqué va al lado.',
  clave: 'derivacion paso a paso derivar pasos de la ecuacion desarrollar',
  frases: 'mostrar la ecuacion paso a paso derivacion guiada desarrollar la ecuacion por pasos',
  req: () => { const f = S.selBlock && findBlock(S.selBlock); return !!(f && f.block.type === 'math'); },
  corre: () => { openDerivacion(findBlock(S.selBlock).block); return 'Escribe cada paso tal como queda; lo que cambió se pinta solo.'; } });
accion({ id: 'paquete', grp: 'Figuras', n: 'Paquete reproducible de la figura',
  d: 'Un .zip con los datos en CSV, la figura en pgfplots y un PNG, para que cualquiera la regenere.',
  clave: 'paquete reproducible reproducibilidad csv pgfplots regenerar figura',
  frases: 'paquete reproducible de la figura exportar los datos de la grafica csv y pgfplots',
  req: () => { const f = S.selBlock && findBlock(S.selBlock); return !!(f && f.block.type === 'chart'); },
  corre: () => { paqueteFigura(findBlock(S.selBlock).block); return 'Se está descargando: LEEME, datos.csv, figura.tex y figura.png.'; } });
accion({ id: 'citar', grp: 'Diapositivas', n: 'Citar aquí',
  d: 'Mete la cita donde estabas escribiendo. La marca —[1], el volado o (Autor, año)— se calcula sola y se renumera si luego citas algo antes.',
  clave: 'citar cita marca numerito superindice acreditar',
  frases: 'citar aqui poner una cita meter la cita numerito de la cita acreditar esta frase',
  corre: () => { openReferencias(); return 'Elige cuál y pulsa «+ Citar»: entra en la frase donde tenías el cursor.'; } });
accion({ id: 'estilo-cita', grp: 'Diapositivas', n: 'Estilo de cita',
  d: 'Numérico [1], superíndice de la ACS, autor-año o autor-número. Al cambiarlo se reescribe toda la presentación.',
  clave: 'estilo cita numerico superindice autor ano apa harvard acs ieee bibliografia estilo',
  frases: 'estilo de cita citas numericas superindice acs autor ano apa harvard cambiar el estilo de las citas',
  arg: { n: 'estilo', tipo: 'opcion', ops: () => ESTILOS_CITA.map(e => ({ v: e.id, n: e.n + '  ' + e.ej })) },
  corre: v => { S.deck.meta.citEstilo = v; invalidaCitas(); commit(); return 'Listo: ahora las citas salen como ' + EK_CITA[v].ej + ' y la presentación entera se renumeró sola.'; } });
accion({ id: 'zotero', grp: 'Diapositivas', n: 'Traer referencias de Zotero',
  d: 'Se conecta a tu biblioteca de Zotero —en la nube o la de esta computadora— y trae las referencias ya formateadas. También lee lo que exportes en CSL JSON, BibTeX o RIS.',
  clave: 'zotero biblioteca gestor referencias mendeley importar bib ris csl',
  frases: 'zotero mi biblioteca de zotero traer de zotero importar referencias gestor de referencias bibtex ris csl json',
  corre: () => { openZotero(); return 'Si es la primera vez, ahí mismo vienen los dos pasos para crear la clave. Y si no puedes conectar, abajo se pueden soltar los archivos que exportes de Zotero.'; } });
accion({ id: 'ajustar-tiempo', grp: 'Presentar', n: 'Ajustar la charla a un tiempo',
  d: 'Le dices cuántos minutos te dan y propone qué mandar al respaldo para que quepa, sin borrar nada.',
  clave: 'ajustar tiempo minutos recortar acortar cuadrar charla dura',
  frases: 'me dan doce minutos acortar la charla recortar cuadrar el tiempo dura demasiado hacerla mas corta',
  corre: () => { openAjustarTiempo(); return 'Mueve el deslizador al tiempo que te dan y te digo qué se iría al respaldo.'; } });
accion({ id: 'diapo-respaldo', grp: 'Diapositivas', n: 'Guardar esta diapositiva como respaldo',
  d: 'La manda al apéndice: deja de contar en la numeración y en el tiempo, y se llega a ella desde el índice de preguntas (tecla Q al presentar).',
  clave: 'respaldo apendice preguntas backup guardar para preguntas',
  frases: 'respaldo apendice para preguntas backup por si preguntan quitarla de la charla sin borrarla',
  corre: () => { const era = esRespaldo(curSlide()); alternaRespaldo(S.cur); return era ? 'De vuelta a la charla.' : 'Al respaldo. Al presentar, la tecla Q abre el índice para saltar a ella.'; } });
accion({ id: 'despiece', grp: 'Insertar', n: 'Adaptar una figura de artículo',
  d: 'Parte una figura multipanel en un panel por diapositiva, tapa la leyenda que no comentas, señala con flecha y deja puesto el «modificado de».',
  clave: 'adaptar figura articulo panel paneles multipanel tapar senalar despiece',
  frases: 'partir la figura del paper multipanel un panel por diapositiva tapar la leyenda senalar con flecha adaptar figura',
  siNo: 'Necesito una figura en esta diapositiva. Pídeme «insertar figura» y en cuanto elijas la imagen la adaptamos.',
  corre: () => {
    const im = zonas(curSlide()).flat().find(x => x.type === 'image' && x.src);
    if (!im) return null;
    openDespiece(im);
    return 'Arrastra sobre la figura o usa una rejilla; luego «un panel por diapositiva».';
  } });

/* ---------- el saber: para las preguntas de «¿qué es…?» ---------- */
function asisSaber() {
  const out = [];
  GLOSARIO.forEach(g => (g.items || []).forEach(it => out.push({ t: it.t, g: g.g, d: it.d, ej: it.ej })));
  return out;
}

/* ---------- entender una frase ---------- */
/* Devuelve { tipo, ... }:
     'accion'   una acción clara, con su argumento si lo lleva
     'opciones' varias candidatas, para que elijas
     'saber'    una explicación del glosario
     'nada'     no encontré nada                                     */
const RE_HEX = /#[0-9a-f]{6}\b/i;
const RE_ENT = /(-?\d+(?:[.,]\d+)?)/;
const ASIS_PREGUNTA = /^(que|cual|cuales|como|donde|cuando|por que|porque|para que|se puede|puedo|existe|hay)\b/;
/* «¿qué es…?» pide una explicación; «¿cómo…?» pide que se lo hagan. */
const ASIS_QUE_ES = /^(que|cual|cuales)\s+(es|son|significa|significan|quiere decir|seria)\b|^(que|cual)\s+\w+\s+(es|son)\b|^en que consiste\b|^que tal es\b/;

function asisEntiende(txt) {
  const crudo = String(txt || '').trim();
  const qtok = asisPal(crudo);
  if (!qtok.length) return { tipo: 'nada' };
  const nq = sinAcentos(crudo.toLowerCase());
  const pregunta = ASIS_PREGUNTA.test(nq);
  const defincion = ASIS_QUE_ES.test(nq);

  /* candidatas del catálogo */
  const cands = [];
  ACC.forEach(a => {
    if (a.req && !a.req()) return;
    const r = asisPuntua(qtok, [[a.clave || '', 5.5], [a.frases, 3], [a.n, 2.4], [a.d, 0.7], [a.donde || '', 0.5]]);
    let s = r.s;
    /* si la acción tiene argumento y la frase nombra una opción, sube mucho */
    let val = null;
    if (a.arg && a.arg.tipo === 'opcion') {
      const op = asisOpcion(qtok, a.arg.ops());
      if (op) { val = op.v; s += 4.5; }
    } else if (a.arg && a.arg.tipo === 'numero') {
      const m = crudo.match(RE_ENT); if (m) { val = parseFloat(m[1].replace(',', '.')); s += 3; }
      else { const w = qtok.find(q => ASIS_NUM[q]); if (w) { val = ASIS_NUM[w]; s += 3; } }
    } else if (a.arg && a.arg.tipo === 'color') {
      const m = crudo.match(RE_HEX);
      if (m) { val = m[0]; s += 4; }
      else { const w = qtok.find(q => COLOR_NOMBRE[q]); if (w) { val = COLOR_NOMBRE[w]; s += 4; } }
    } else if (a.arg && a.arg.tipo === 'texto') {
      const m = crudo.match(/[«"'](.+?)[»"']/); if (m) { val = m[1]; s += 4; }
    }
    if (s > 0) cands.push({ a, s, val, cubre: r.cubre });
  });
  /* la cola larga: la paleta de comandos, por nombre */
  try {
    comandos().forEach(c => {
      const r = asisPuntua(qtok, [[c.n, 2.2], [c.sub || '', 0.9]]);
      if (r.s >= 4) cands.push({ a: { id: 'cmd:' + c.n, grp: c.grupo || 'Acciones', n: c.n, d: c.sub || '', corre: () => { c.fn(); return 'Hecho: ' + c.n.replace(/…$/, '') + '.'; } }, s: r.s * 0.92, val: null, cubre: r.cubre });
    });
  } catch (e) { /* si la paleta no está lista, seguimos con el catálogo */ }

  cands.sort((x, y) => y.s - x.s);

  /* explicaciones del glosario */
  const sab = [];
  asisSaber().forEach(k => {
    const r = asisPuntua(qtok, [[k.t, 3.2], [k.d, 0.5], [k.g, 0.8]]);
    if (r.s > 0) sab.push({ k, s: r.s });
  });
  sab.sort((x, y) => y.s - x.s);

  const top = cands[0], seg = cands[1];
  const mejorSaber = sab[0];

  /* una pregunta con un término del glosario claro: primero explico */
  if (defincion && mejorSaber && mejorSaber.s >= 3.2) {
    return { tipo: 'saber', saber: mejorSaber.k, accion: top && top.s >= 5 ? top : null };
  }
  if (pregunta && mejorSaber && mejorSaber.s >= 4.5 && (!top || mejorSaber.s > top.s * 0.75)) {
    return { tipo: 'saber', saber: mejorSaber.k, accion: top && top.s >= 5 ? top : null };
  }
  if (top && top.cubre < 0.34 && top.s < 8) top.s *= 0.55;
  cands.sort((x, y) => y.s - x.s);
  if (!top || cands[0].s < 4.2) {
    if (mejorSaber && mejorSaber.s >= 3.5) return { tipo: 'saber', saber: mejorSaber.k, accion: null };
    return { tipo: 'nada', cerca: cands.slice(0, 3), saber: sab.slice(0, 2).map(x => x.k) };
  }
  /* claramente una acción */
  const t0 = cands[0], t1 = cands[1];
  const claro = t0.s >= 6 && (!t1 || t0.s >= t1.s * 1.35);
  if (claro) return { tipo: 'accion', cand: t0, alternativas: cands.slice(1, 3), saber: mejorSaber && mejorSaber.s >= 5 ? mejorSaber.k : null };
  return { tipo: 'opciones', cands: cands.slice(0, 4), saber: mejorSaber && mejorSaber.s >= 5 ? mejorSaber.k : null };
}

/* ---------- el hueco del modelo ----------
   Cuando haya un modelo local, recibirá este catálogo tal cual y solo tendrá
   que devolver { herramienta, argumento }. La ejecución no cambia. */
const MODELO = { estado: 'ausente', nombre: null, motor: null };
function herramientasJSON() {
  return ACC.filter(a => !a.req || a.req()).map(a => ({
    name: a.id,
    description: a.d,
    parameters: !a.arg ? { type: 'object', properties: {} } : {
      type: 'object',
      properties: { [a.arg.n]: a.arg.tipo === 'opcion'
        ? { type: 'string', enum: a.arg.ops().map(o => o.v), description: a.arg.n }
        : { type: a.arg.tipo === 'numero' ? 'number' : 'string', description: a.arg.n } },
      required: [a.arg.n]
    }
  }));
}
function correAccion(id, val) { const a = ACC.find(x => x.id === id); return a ? a.corre(val) : null; }


