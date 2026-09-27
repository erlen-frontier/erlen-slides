/* ==== 21-robustez.js ==== */
'use strict';
/* ================= validación y migración del proyecto =================
   Un .json puede venir de una versión anterior, de otra máquina o editado a
   mano. Antes de cargarlo se revisa y se repara, y lo que no se reconoce se
   reporta en vez de dejar el editor a medias. */

/* Rutas de imagen/vídeo. Se admite lo incrustado (data:) y lo remoto, pero un
   recurso remoto de un proyecto ajeno avisa a su servidor de que lo abriste:
   se anotan los dominios para poder decirlo antes de dibujar nada. */
let SANEA_REMOTOS = [];
function srcSeguro(v, avisos) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (!/^data:|^https?:/i.test(s)) { avisos.push('una imagen traía una ruta que no se puede abrir'); return ''; }
  if (/^https?:/i.test(s)) { try { SANEA_REMOTOS.push(new URL(s).host); } catch (e) { SANEA_REMOTOS.push('otro servidor'); } }
  return s;
}

function saneaBloque(b, avisos, deck) {
  if (!b || typeof b !== 'object') return null;
  const tipos = BLOCK_DEFS.map(x => x.id);
  if (tipos.indexOf(b.type) < 0) { avisos.push('bloque de tipo «' + String(b.type) + '» desconocido'); return null; }
  if (!b.id) b.id = uid();
  if (b.type === 'bullets') {
    if (!Array.isArray(b.items)) b.items = [];
    b.items = b.items.map(it => typeof it === 'string' ? { t: it, lvl: 0 } : { t: String((it || {}).t || ''), lvl: clamp(+(it || {}).lvl || 0, 0, 2) });
    if (!b.items.length) b.items = [{ t: '', lvl: 0 }];
  }
  if (b.type === 'table') {
    if (!Array.isArray(b.rows) || !b.rows.length) b.rows = [['', ''], ['', '']];
    const nc = Math.max(1, ...b.rows.map(r => Array.isArray(r) ? r.length : 0));
    b.rows = b.rows.map(r => { const f = Array.isArray(r) ? r.map(c => String(c == null ? '' : c)) : []; while (f.length < nc) f.push(''); return f; });
  }
  if (b.type === 'teorema') {
    if (!TK[b.kind]) b.kind = 'teorema';
    b.titulo = String(b.titulo == null ? '' : b.titulo).slice(0, 120);
    b.num = String(b.num == null ? '' : b.num).slice(0, 12);
    b.body = String(b.body == null ? '' : b.body);
  }
  if (b.type === 'geo') {
    const g = b.geo;
    if (!g || typeof g !== 'object' || !GK[g.kind]) b.geo = geoPorOmision('triangulo');
    else {
      const rot = {};
      Object.keys(g.rot || {}).forEach(k => { rot[k] = String((g.rot || {})[k] || '').slice(0, 40); });
      b.geo = { kind: g.kind, rot, abierto: g.abierto && typeof g.abierto === 'object' ? { a: !!g.abierto.a, b: !!g.abierto.b } : undefined };
    }
  }
  if (b.type === 'estruct') {
    const e = b.est;
    if (!e || typeof e !== 'object' || !Array.isArray(e.atomos) || !Array.isArray(e.enlaces)) b.est = null;
    else {
      e.atomos = e.atomos.filter(a => a && a.id && isFinite(+a.x) && isFinite(+a.y))
        .map(a => ({ id: a.id, x: +a.x, y: +a.y, el: String(a.el || 'C').slice(0, 3), carga: clamp(+a.carga || 0, -3, 3), h: a.h == null ? null : clamp(+a.h, 0, 4) }));
      const ids = new Set(e.atomos.map(a => a.id));
      e.enlaces = e.enlaces.filter(x => x && ids.has(x.a) && ids.has(x.b))
        .map(x => ({ id: x.id || uid(), a: x.a, b: x.b, orden: clamp(+x.orden || 1, 1, 3), tipo: ['normal', 'cuna', 'raya'].indexOf(x.tipo) >= 0 ? x.tipo : 'normal' }));
    }
  }
  if (b.anim != null && !AK_ANIM[b.anim]) b.anim = 'fade';
  if (b.animVel != null && !ANIM_VEL.some(v => v.id === b.animVel)) b.animVel = 'normal';
  if (b.animRet != null) b.animRet = clamp(+b.animRet || 0, 0, 2000);
  if (b.type === 'galeria') {
    const g = b.gal && typeof b.gal === 'object' ? b.gal : {};
    b.gal = {
      imgs: (Array.isArray(g.imgs) ? g.imgs : []).filter(x => x && typeof x.src === 'string' && x.src)
        .slice(0, 8).map(x => ({ src: srcSeguro(x.src, avisos), cap: String(x.cap || '').slice(0, 90), alt: String(x.alt || '').slice(0, 160) }))
        .filter(x => x.src),
      modo: GK_MODO[g.modo] ? g.modo : 'rejilla',
      cols: clamp(+g.cols || 2, 1, 4), letras: g.letras !== false, hueco: clamp(+g.hueco || 8, 0, 30)
    };
  }
  if (b.type === 'image') {
    const cajita = o => o && isFinite(+o.x) && isFinite(+o.y) && isFinite(+o.w) && isFinite(+o.h);
    const fr = v => clamp(+v, -1, 2);
    if (Array.isArray(b.tapas)) {
      b.tapas = b.tapas.filter(cajita).slice(0, 20).map(t => ({ x: fr(t.x), y: fr(t.y), w: fr(t.w), h: fr(t.h) }));
      if (!b.tapas.length) delete b.tapas;
    } else if (b.tapas != null) delete b.tapas;
    if (Array.isArray(b.marcas)) {
      b.marcas = b.marcas.filter(cajita).slice(0, 20)
        .map(m => ({ t: MK_MARCA[m.t] ? m.t : 'flecha', x: fr(m.x), y: fr(m.y), w: fr(m.w), h: fr(m.h) }));
      if (!b.marcas.length) delete b.marcas;
    } else if (b.marcas != null) delete b.marcas;
    delete b._paneles;
    /* Sin mazo no hay lista de referencias contra la que comprobar: se deja la cita
       como está, que es menos malo que tirarla. */
    if (b.cita && deck && !((deck.meta && deck.meta.refs) || []).some(r => r.id === b.cita)) delete b.cita;
  }
  if (b.type === 'chart' || b.type === 'image') {
    if (b.despues && typeof b.despues === 'object') {
      b.despues = b.type === 'chart' ? { data: String(b.despues.data || '') } : { src: srcSeguro(b.despues.src, avisos) };
      if (!(b.despues.data || b.despues.src)) delete b.despues;
    } else delete b.despues;
  }
  if (b.type === 'chart') {
    b.capas = !!b.capas;
    if (b.destaca && typeof b.destaca === 'object' && isFinite(+b.destaca.serie) && isFinite(+b.destaca.i))
      b.destaca = { serie: Math.max(0, Math.floor(+b.destaca.serie)), i: Math.max(0, Math.floor(+b.destaca.i)), txt: String(b.destaca.txt || '').slice(0, 80) };
    else delete b.destaca;
    if (Array.isArray(b.capasTxt)) b.capasTxt = b.capasTxt.map(x => String(x || '').slice(0, 300)); else delete b.capasTxt;
    /* Rótulos de picos: un punto de una serie (x, y en las unidades de los
       datos) y un texto corto. Sin coordenadas finitas no hay dónde ponerlo. */
    if (Array.isArray(b.picos)) {
      b.picos = b.picos.filter(p => p && typeof p === 'object' && isFinite(+p.x) && isFinite(+p.y)).slice(0, 60).map(p => {
        const o = { x: +p.x, y: +p.y, serie: Math.max(0, Math.floor(+p.serie || 0)), txt: String(p.txt == null ? '' : p.txt).slice(0, 40) };
        if (p.abajo) o.abajo = true;
        return o;
      });
      if (!b.picos.length) delete b.picos;
    } else delete b.picos;
    if (b.fuente && typeof b.fuente === 'object') b.fuente = { nombre: String(b.fuente.nombre || 'pegado').slice(0, 120), cuando: String(b.fuente.cuando || '').slice(0, 20), n: Math.max(0, Math.floor(+b.fuente.n || 0)), huella: String(b.fuente.huella || '').slice(0, 16), instrumento: b.fuente.instrumento ? String(b.fuente.instrumento).slice(0, 40) : undefined };
    else delete b.fuente;
    b.sello = !!(b.sello && b.fuente);
  }
  if (b.type === 'math') {
    if (Array.isArray(b.pasos)) b.pasos = b.pasos.filter(x => x && typeof x === 'object').map(x => ({ tex: String(x.tex || '').slice(0, 2000), por: String(x.por || '').slice(0, 300) }));
    else delete b.pasos;
    b.derivacion = !!(b.derivacion && b.pasos && b.pasos.length);
  }
  if (b.type === 'smart') {
    if (!SK[b.kind]) b.kind = 'proceso';
    if (!SA[b.acab]) delete b.acab;
    if (Array.isArray(b.items)) b.items = b.items.map(x => {
      const o = { t: String((x && x.t) || '').slice(0, 200) };
      if (x && x.d) o.d = String(x.d).slice(0, 200);
      if (x && +x.lvl > 0) o.lvl = 1;
      return o;
    });
  }
  if (b.nivel != null) { if (b.nivel !== 'comite' && b.nivel !== 'divulgacion') delete b.nivel; }
  if (b.type === 'refs') {
    const n = Math.max(1, Math.floor(+b.partes || 1));
    b.partes = n;
    b.parte = clamp(Math.floor(+b.parte || 1), 1, n);
  }
  if (b.type === 'image' && b.est) {
    const e = b.est;
    b.est = { forma: FK_FORMA[e.forma] ? e.forma : 'recta', marco: FK_MARCO[e.marco] ? e.marco : 'none',
      sombra: !!e.sombra, filtro: FK_FILTRO[e.filtro] ? e.filtro : 'none' };
  }
  if (b.type === 'montaje') {
    const m = b.mont;
    if (!m || typeof m !== 'object' || !Array.isArray(m.piezas)) b.mont = null;
    else {
      const colOk = c => (c === 'auto' || /^#[0-9a-f]{6}$/i.test(String(c || ''))) ? c : null;
      m.estilo = EK_LAB[m.estilo] ? m.estilo : 'suave';
      m.col = colOk(m.col) || 'auto';
      m.borde = colOk(m.borde) || null;
      m.piezas = m.piezas.filter(p => p && LABK[p.k] && isFinite(+p.x) && isFinite(+p.y))
        .map(p => ({ id: p.id || uid(), k: p.k, x: +p.x, y: +p.y, esc: clamp(+p.esc || 1, 0.3, 3),
          rot: clamp(+p.rot || 0, -180, 180), espejo: !!p.espejo, et: String(p.et || '').slice(0, 60),
          col: colOk(p.col) || 'auto', est: EK_LAB[p.est] ? p.est : null, txt: String(p.txt || '').slice(0, 60),
          nivel: (p.nivel == null || !isFinite(+p.nivel)) ? null : clamp(+p.nivel, 0, 1) }));
      m.flechas = (Array.isArray(m.flechas) ? m.flechas : []).filter(f => f && isFinite(+f.x1))
        .map(f => ({ id: f.id || uid(), x1: +f.x1, y1: +f.y1, x2: +f.x2, y2: +f.y2,
          tipo: ['flecha', 'cable', 'cableL'].indexOf(f.tipo) >= 0 ? f.tipo : 'flecha',
          texto: String(f.texto || '').slice(0, 60) }));
      if (!m.piezas.length && !m.flechas.length) b.mont = null;
    }
  }
  if (b.type === 'smart') {
    if (!SK[b.kind]) { avisos.push('diagrama «' + String(b.kind) + '» desconocido, se usa proceso'); b.kind = 'proceso'; }
    if (!Array.isArray(b.items) || !b.items.length) b.items = [{ t: 'Elemento', d: '' }];
  }
  if ((b.type === 'chart' || b.type === 'func') && b.ar != null) b.ar = clamp(+b.ar || 0.62, 0.2, 1.4);
  if (b.w != null) b.w = clamp(+b.w || 70, 10, 100);
  if (b.src != null) { const v = srcSeguro(b.src, avisos); if (v) b.src = v; else delete b.src; }
  if (b.poster != null) { const v = srcSeguro(b.poster, avisos); if (v) b.poster = v; else delete b.poster; }
  return b;
}

/* Revisa el mazo entero. Devuelve {deck, avisos} o {error}. */
function saneaDeck(bruto) {
  const avisos = [];
  SANEA_REMOTOS = [];
  if (!bruto || typeof bruto !== 'object') return { error: 'El archivo no contiene un proyecto de Erlen.' };
  const d = deepCopy(bruto);
  if (!Array.isArray(d.slides) || !d.slides.length) return { error: 'El archivo no trae diapositivas.' };
  d.meta = Object.assign({ theme: 'metropolis', aspect: '169', numbers: true, footline: true, title: '' }, d.meta || {});
  if (!EK_CITA[d.meta.citEstilo]) d.meta.citEstilo = 'num';
  if (!NK[d.meta.nivel]) d.meta.nivel = 'congreso';
  d.meta.glosas = (Array.isArray(d.meta.glosas) ? d.meta.glosas : []).filter(g => g && typeof g === 'object').map(g => ({ termino: String(g.termino || '').slice(0, 80), breve: String(g.breve || '').slice(0, 300), alias: g.alias ? String(g.alias).slice(0, 200) : undefined }));
  d.meta.preguntas = (Array.isArray(d.meta.preguntas) ? d.meta.preguntas : []).filter(q => q && typeof q === 'object' && q.texto).map(q => ({ id: String(q.id || uid()), texto: String(q.texto).slice(0, 300), sl: Math.max(0, Math.floor(+q.sl || 0)), estado: ['abierta', 'respondida', 'descartada'].includes(q.estado) ? q.estado : 'abierta', respaldo: q.respaldo ? String(q.respaldo) : null, propia: !!q.propia }));
  d.meta.ramas = (Array.isArray(d.meta.ramas) ? d.meta.ramas : []).filter(r => r && typeof r === 'object').map(r => ({ id: String(r.id || uid()), n: String(r.n || 'Rama').slice(0, 60), fuera: Array.isArray(r.fuera) ? r.fuera.map(String) : [], nivel: NK[r.nivel] ? r.nivel : null, titulo: String(r.titulo || '').slice(0, 200) }));
  if (d.meta.rama && !d.meta.ramas.some(r => r.id === d.meta.rama)) d.meta.rama = null;
  if (d.meta.ensayo && typeof d.meta.ensayo === 'object' && d.meta.ensayo.tiempos && typeof d.meta.ensayo.tiempos === 'object') { const t = {}; Object.keys(d.meta.ensayo.tiempos).forEach(k => { const v = +d.meta.ensayo.tiempos[k]; if (isFinite(v) && v > 0) t[k] = v; }); d.meta.ensayo = { cuando: String(d.meta.ensayo.cuando || ''), tiempos: t }; } else delete d.meta.ensayo;
  d.meta.bibAuto = d.meta.bibAuto !== false;
  if (!THEMES[d.meta.theme]) { avisos.push('el tema «' + d.meta.theme + '» no existe; se usa Metropolis'); d.meta.theme = 'metropolis'; }
  if (d.meta.aspect !== '43') d.meta.aspect = '169';
  if (d.meta.fuente && !FU[d.meta.fuente]) { avisos.push('la tipografía «' + d.meta.fuente + '» no existe'); delete d.meta.fuente; }
  if (d.meta.acento && !/^#[0-9a-fA-F]{6}$/.test(d.meta.acento)) { avisos.push('el color de acento no era válido'); delete d.meta.acento; }
  if (d.meta.logo != null) { const v = srcSeguro(d.meta.logo, avisos); if (v) d.meta.logo = v; else delete d.meta.logo; }
  d.meta.pie = pieDe(d.meta);
  d.meta.notas = notasDe(d.meta);
  /* Referencias: solo las que tienen algo dentro, y sin identificadores repetidos. */
  {
    const vistas = new Set();
    d.meta.refs = (Array.isArray(d.meta.refs) ? d.meta.refs : [])
      .filter(r => r && typeof r === 'object')
      .map(r => ({ id: String(r.id || uid()), autores: String(r.autores || '').slice(0, 400),
        titulo: String(r.titulo || '').slice(0, 400), revista: String(r.revista || '').slice(0, 200),
        anio: String(r.anio || '').slice(0, 10), vol: String(r.vol || '').slice(0, 20),
        pag: String(r.pag || '').slice(0, 40), doi: String(r.doi || '').slice(0, 200),
        url: String(r.url || '').slice(0, 400),
        zot: String(r.zot || '').slice(0, 24),
        clave: (String(r.clave || '').match(/^[A-Za-z0-9]{1,40}$/) || [''])[0] }))
      .filter(r => (r.autores || r.titulo || r.doi) && !vistas.has(r.id) && vistas.add(r.id));
  }
  /* Fix the sanitiser's search for the deck object name used below. */
  const deck = d;

  const vistos = new Set();
  const limpias = [];
  d.slides.forEach((sl, i) => {
    if (!sl || typeof sl !== 'object') { avisos.push('se descartó la diapositiva ' + (i + 1) + ', que estaba vacía'); return; }
    if (sl.respaldo) sl.respaldo = true; else delete sl.respaldo;
    if (sl.clave) sl.clave = true; else delete sl.clave;
    if (Array.isArray(sl.citas)) {
      const ids = new Set((deck.meta.refs || []).map(r => r.id));
      sl.citas = sl.citas.filter(x => ids.has(x));
      if (!sl.citas.length) delete sl.citas;
    } else if (sl.citas != null) delete sl.citas;
    if (!LAY[sl.layout]) { avisos.push('la diapositiva ' + (i + 1) + ' usaba el diseño «' + String(sl.layout) + '»; se cambió a contenido'); sl.layout = 'content'; }
    if (!sl.id || vistos.has(sl.id)) sl.id = uid();
    if (sl.bibAuto) sl.bibAuto = true; else delete sl.bibAuto;
    if (sl.subt2 != null) { sl.subt2 = String(sl.subt2).slice(0, 4000); if (!sl.subt2) delete sl.subt2; }
    vistos.add(sl.id);
    sl.title = String(sl.title == null ? '' : sl.title);
    if (sl.min != null) { const v = +sl.min; if (v > 0) sl.min = v; else delete sl.min; }
    if (sl.scale != null) sl.scale = clamp(+sl.scale || 1, 0.7, 1.4);
    if (sl.zt != null && !Array.isArray(sl.zt)) delete sl.zt;
    if (sl.todo != null) {
      if (!Array.isArray(sl.todo)) delete sl.todo;
      else {
        sl.todo = sl.todo.map(t => (t && typeof t === 'object' && t.t)
          ? { id: t.id || uid(), t: String(t.t).slice(0, 300), ok: !!t.ok, when: +t.when || Date.now() } : null).filter(Boolean);
        if (!sl.todo.length) delete sl.todo;
      }
    }
    CLAVES_ZONA.forEach(k => {
      if (sl[k] == null) return;
      if (!Array.isArray(sl[k])) { sl[k] = []; return; }
      sl[k] = sl[k].map(b => saneaBloque(b, avisos, deck)).filter(Boolean);
      sl[k].forEach(b => { if (vistos.has(b.id)) b.id = uid(); vistos.add(b.id); });
    });
    prepararZonas(sl, sl.layout);
    limpias.push(sl);
  });
  if (!limpias.length) return { error: 'Ninguna diapositiva del archivo se pudo leer.' };
  d.slides = limpias;
  d.v = 1;
  if (SANEA_REMOTOS.length) {
    const hosts = Array.from(new Set(SANEA_REMOTOS));
    avisos.push('el proyecto carga ' + SANEA_REMOTOS.length + ' imagen(es) desde ' +
      hosts.slice(0, 3).join(', ') + (hosts.length > 3 ? ' y otros' : '') +
      ': ese servidor sabrá cuándo lo abres. Descarga esas figuras e insértalas si no quieres avisarle.');
  }
  return { deck: d, avisos };
}

/* Carga con red de seguridad: si algo revienta al dibujar, se vuelve atrás. */
function cargaSegura(bruto, nombre) {
  const r = saneaDeck(bruto);
  if (r.error) { toast(r.error, 'warn'); return false; }
  const respaldo = S.deck, respName = S.deckName;
  try {
    loadDeck(r.deck, nombre || null);
  } catch (e) {
    S.deck = respaldo; S.deckName = respName; snapNow();
    try { renderAll(); } catch (e2) {}
    toast('El archivo no se pudo abrir sin errores; se dejó la presentación anterior.', 'warn');
    return false;
  }
  if (r.avisos.length) openAvisosImport(r.avisos);
  else toast('Proyecto abierto');
  return true;
}
function openAvisosImport(avisos) {
  const lista = h('ul', { class: 'av-lista' });
  const unicos = Array.from(new Set(avisos));
  unicos.slice(0, 14).forEach(a => lista.append(h('li', null, a)));
  if (unicos.length > 14) lista.append(h('li', null, 'y ' + (unicos.length - 14) + ' más'));
  openModal({
    title: 'El proyecto se abrió con ajustes', size: 'modal-sm',
    body: h('div', null,
      h('p', { style: 'margin:0 0 10px;font-size:13.5px;line-height:1.55' },
        'El archivo venía de otra versión o traía datos que Erlen no reconoce. Se abrió igualmente y esto es lo que se ajustó:'),
      lista,
      h('p', { class: 'hint', style: 'margin-top:10px' }, 'Nada se perdió de lo que sí se pudo leer. Si algo no quedó como esperabas, deshaz con Ctrl+Z y vuelve a exportar el proyecto desde donde salió.')),
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Entendido')]
  });
}


