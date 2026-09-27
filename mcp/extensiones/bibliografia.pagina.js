/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «bibliografia»: se evalúa tras operaciones.js.

   Los lectores son los de la app (partesBibtex, camposBibtex, refDeCamposBibtex
   y risRef en 57-citas.js y 61-zotero.js), para que un .bib se lea igual en el
   editor que aquí. Lo que se añade es lo que un archivo entero pide y un pegado
   suelto no: informar entrada por entrada, conservar la clave de BibTeX y no
   duplicar lo que ya estaba en la presentación. */
(function () {
  'use strict';
  const U = ERLEN_MCP.util;
  const CLAVE_OK = /^[A-Za-z0-9]{1,40}$/;
  const CAMPOS = ['autores', 'titulo', 'revista', 'anio', 'vol', 'pag', 'doi', 'url'];
  const MAX_AUTORES = 400;          /* lo que conserva saneaDeck */

  /* ---------- leer ---------- */
  function entradasBib(txt) {
    const macros = {}, out = [];
    partesBibtex(txt).forEach(t => {
      let e;
      try { e = camposBibtex(t, macros); } catch (err) { out.push({ error: err.message, clave: '' }); return; }
      if (e.tipo === 'string') { Object.keys(e.campos).forEach(k => { macros[k] = e.campos[k]; }); return; }
      if (e.tipo === 'comment' || e.tipo === 'preamble') return;
      out.push({ tipo: e.tipo, clave: e.clave, ref: refDeCamposBibtex(e) });
    });
    return out;
  }
  /* RIS: una etiqueta de dos caracteres, «  - » y el valor; TY abre la entrada
     y ER la cierra. Las líneas sin etiqueta continúan el valor anterior. */
  function entradasRIS(txt) {
    const s = String(txt).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const out = [];
    let cur = null, ult = null;
    const cierra = () => {
      if (!cur) return;
      const r = risRef(cur);
      r.pag = String(r.pag || '').replace(/(\d)\s*[-–]+\s*(\d)/g, '$1–$2');
      out.push({ tipo: (cur.TY || [''])[0], clave: ((cur.ID || [''])[0] || '').trim(), ref: r });
      cur = null; ult = null;
    };
    s.split('\n').forEach(ln => {
      const m = ln.match(/^([A-Z][A-Z0-9])\s+-(?:\s(.*))?$/);
      if (m) {
        const tag = m[1], val = String(m[2] || '').trim();
        if (tag === 'TY') { cierra(); cur = { TY: [val] }; return; }
        if (tag === 'ER') { cierra(); return; }
        if (!cur) return;
        (cur[tag] = cur[tag] || []).push(val);
        ult = tag;
      } else if (cur && ult && ln.trim()) {
        const a = cur[ult];
        a[a.length - 1] += ' ' + ln.trim();
      }
    });
    cierra();
    return out;
  }

  /* ---------- no repetir ----------
     Una referencia ya está si coincide el DOI (sin distinguir mayúsculas) o el
     título normalizado con el mismo año; si a una de las dos le falta el año,
     basta el título. Sin título ni DOI solo quedan los autores (y el año). */
  const doiDe = r => limpiaDOI(r.doi).toLowerCase();
  const tituloDe = r => zotLlano(r.titulo);
  const autoresDe = r => zotLlano(r.autores);
  const mismoAnio = (x, r) => !x.anio || !r.anio || String(x.anio) === String(r.anio);
  function indice(refs) {
    const porDoi = new Map(), porTitulo = new Map(), sinTitulo = [];
    const mete = r => {
      if (doiDe(r) && !porDoi.has(doiDe(r))) porDoi.set(doiDe(r), r);
      const t = tituloDe(r);
      if (t) (porTitulo.get(t) || porTitulo.set(t, []).get(t)).push(r);
      else if (!doiDe(r)) sinTitulo.push(r);
    };
    refs.forEach(mete);
    const busca = r => {
      const d = doiDe(r);
      if (d && porDoi.has(d)) return { ref: porDoi.get(d), por: 'doi' };
      const t = tituloDe(r);
      const y = t && (porTitulo.get(t) || []).find(x => mismoAnio(x, r));
      /* Dos DOI distintos son dos trabajos aunque se titulen igual (una
         corrección, un comentario). */
      if (y && !(d && doiDe(y) && doiDe(y) !== d)) return { ref: y, por: 'titulo+anio' };
      if (!t && !d && autoresDe(r)) {
        const z = sinTitulo.find(x => autoresDe(x) === autoresDe(r) && mismoAnio(x, r));
        if (z) return { ref: z, por: 'autores+anio' };
      }
      return null;
    };
    return { mete, busca };
  }

  /* ---------- claves ---------- */
  const saneaClave = c => String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '');
  function claveLibre(base, usadas) {
    let c = base.slice(0, 40), i = 0;
    while (usadas.has(c)) {
      const suf = i < 25 ? String.fromCharCode(98 + i) : String(i + 2);   /* b, c, d… */
      c = base.slice(0, 40 - suf.length) + suf; i++;
    }
    return c;
  }
  /* La clave de BibTeX se respeta si el editor la acepta; si no, se limpia (o
     se deriva de autor y año) y se dice. */
  function eligeClave(original, r, usadas) {
    let base = original, motivo = null;
    if (!original) { base = claveBase(r); motivo = 'la entrada no traía clave'; }
    else if (!CLAVE_OK.test(original)) {
      base = saneaClave(original);
      motivo = original.length > 40 && CLAVE_OK.test(base.slice(0, 40)) && base === original ? 'pasaba de 40 caracteres'
        : 'solo se admiten letras y cifras sin acentos (A-Z, a-z, 0-9)';
      if (!base) base = claveBase(r);
    }
    const c = claveLibre(base, usadas);
    if (c !== base.slice(0, 40) && !motivo) motivo = 'ya había otra referencia con esa clave';
    else if (c !== base.slice(0, 40)) motivo += '; además ya estaba usada';
    return { clave: c, motivo };
  }
  /* saneaDeck corta los autores a 400 caracteres, a media palabra si hace falta.
     Antes de eso se quitan nombres enteros del final y se pone «et al.». */
  function recortaAutores(r) {
    if (String(r.autores).length <= MAX_AUTORES) return 0;
    const l = r.autores.split('; ');
    let n = l.length;
    while (n > 1 && (l.slice(0, n).join('; ') + '; {et al.}').length > MAX_AUTORES) n--;
    r.autores = l.slice(0, n).join('; ') + '; {et al.}';
    return l.length;
  }

  ERLEN_MCP.registra('importaBibliografia', a => {
    const d = a.deck;
    aseguraClaves(d);
    const entradas = a.formato === 'ris' ? entradasRIS(a.texto) : entradasBib(a.texto);
    if (!entradas.length) {
      U.falla(a.formato === 'ris'
        ? 'No encontré ninguna entrada RIS (líneas «TY  - JOUR» … «ER  -»).'
        : 'No encontré ninguna entrada BibTeX (algo como @article{clave, …}).');
    }
    const refs = refsDe(d);
    const usadas = new Set(refs.map(r => r.clave).filter(Boolean));
    const ind = indice(refs);
    const agregadas = [], duplicadas = [], problemas = [], claves_cambiadas = [], descartadas = [];
    entradas.forEach((e, k) => {
      const n = k + 1, r = e.ref;
      if (e.error) { descartadas.push({ entrada: n, motivo: e.error }); return; }
      if (!r.autores && !r.titulo && !r.doi) {
        descartadas.push({ entrada: n, clave_original: e.clave || null, motivo: 'No trae autores, título ni DOI.' });
        return;
      }
      const ya = ind.busca(r);
      if (ya) {
        duplicadas.push({ entrada: n, clave_original: e.clave || null, por: ya.por,
          ya_estaba: { id: ya.ref.id, clave: ya.ref.clave, cita: citaCorta(ya.ref) } });
        return;
      }
      const { clave, motivo } = eligeClave(e.clave, r, usadas);
      r.clave = clave;
      usadas.add(clave);
      if (motivo && e.clave) claves_cambiadas.push({ entrada: n, clave_original: e.clave, clave, motivo });
      const total = recortaAutores(r);
      const falta = [!r.autores && 'autores', !r.titulo && 'titulo', !r.anio && 'anio'].filter(Boolean);
      if (falta.length || total) {
        problemas.push(Object.assign({ entrada: n, clave }, falta.length ? { falta } : {},
          total ? { aviso: 'Tenía ' + total + ' autores: se guardan los primeros y «et al.».' } : {}));
      }
      refs.push(r);
      ind.mete(r);
      agregadas.push({ entrada: n, clave, id: r.id, cita: citaCorta(r) });
    });
    const res = U.valida(d);
    res.resultado = {
      entradas: entradas.length,
      agregadas, duplicadas, problemas, claves_cambiadas, descartadas,
      como_citar: 'Con citar {diapositiva, claves} van al pie de la diapositiva; en un texto, escribe [@clave] o [@una; @otra].'
    };
    return res;
  });

  /* ---------- citar ---------- */
  const limpiaClaveCita = c => String(c == null ? '' : c).trim().replace(/^\[?\s*@/, '').replace(/\]$/, '').trim();
  /* Si no hay bloque de referencias, se pone. Con la bibliografía automática
     (lo normal) la diapositiva la mantiene la app: se parte en varias si no
     cabe y se va si dejan de citarse. Si está apagada, se añade una propia. */
  function aseguraBloqueRefs(d) {
    const propia = d.slides.findIndex(sl => !sl.bibAuto && zonas(sl).flat().some(b => b.type === 'refs'));
    if (propia >= 0) return { estado: 'ya_existia', diapositiva: propia + 1 };
    if (bibAutoOn(d)) {
      sincronizaBib(d);
      const j = d.slides.findIndex(sl => sl.bibAuto);
      if (j >= 0) return { estado: 'automatica', diapositiva: j + 1,
        nota: 'La mantiene el editor: crece, se parte en varias y desaparece según lo que se cite.' };
    }
    const sl = laminaBib(1, 1);
    delete sl.bibAuto;
    const pos = posBib(d);
    d.slides.splice(pos, 0, sl);
    return { estado: 'agregada', diapositiva: pos + 1 };
  }

  ERLEN_MCP.registra('citaClaves', a => {
    const d = a.deck;
    aseguraClaves(d);
    const sl = d.slides[U.indiceDiapositiva(d, a.diapositiva)];
    const claves = (Array.isArray(a.claves) ? a.claves : [a.claves]).map(limpiaClaveCita).filter(Boolean);
    if (!claves.length) U.falla('«claves» debe traer al menos una clave de referencia.');
    const refs = refsDe(d);
    const faltan = claves.filter(c => !refPorClave(c, d));
    if (faltan.length) {
      const casi = faltan.map(c => { const r = refs.find(x => x.clave.toLowerCase() === c.toLowerCase()); return r ? '«' + c + '» → ¿«' + r.clave + '»?' : ''; }).filter(Boolean);
      const hay = refs.map(r => r.clave);
      U.falla('No hay ninguna referencia con la clave ' + faltan.map(c => '«' + c + '»').join(', ') + '. ' +
        (casi.length ? 'Las claves distinguen mayúsculas: ' + casi.join(', ') + '. ' : '') +
        (hay.length ? 'Claves de esta presentación: ' + hay.slice(0, 30).join(', ') + (hay.length > 30 ? '… (' + hay.length + ')' : '') + '.'
          : 'La presentación no tiene referencias: impórtalas con importar_bibliografia o agregar_referencia.'));
    }
    if (!Array.isArray(sl.citas)) sl.citas = [];
    const citadas = [], ya_estaban = [];
    claves.forEach(c => {
      const r = refPorClave(c, d);
      if (sl.citas.includes(r.id)) { if (!ya_estaban.includes(c)) ya_estaban.push(c); }
      else { sl.citas.push(r.id); citadas.push(c); }
    });
    const bib = a.bloque_referencias ? aseguraBloqueRefs(d) : null;
    const res = U.valida(d);
    const v = res.deck;
    invalidaCitas();
    const pos = v.slides.findIndex(x => x.id === sl.id);
    res.resultado = {
      diapositiva: pos + 1, citadas, ya_estaban,
      al_pie: (v.slides[pos].citas || []).map(id => {
        const r = refPorId(id, v);
        return { clave: r.clave, numero: numeroRef(id, v), cita: citaCorta(r) };
      }),
      estilo: estiloCita(v)
    };
    if (bib) res.resultado.bloque_referencias = bib;
    invalidaCitas();
    return res;
  });

  /* ---------- completar con Crossref ----------
     La consulta la hace Node (bibliografia.mjs); aquí llega el «message» de
     Crossref y se traduce con refDesdeCrossref, el mismo de la app. Nunca se
     sobrescribe lo que ya tenía la referencia: solo se rellenan los huecos, y
     las diferencias se enseñan para que las decida la persona. */
  const compara = s => zotLlano(s);
  ERLEN_MCP.registra('completaDOI', a => {
    const d = a.deck;
    aseguraClaves(d);
    const refs = refsDe(d);
    const nueva = refDesdeCrossref(a.mensaje || {}, a.doi);
    const doi = limpiaDOI(a.doi).toLowerCase();
    let ref = refs.find(r => limpiaDOI(r.doi).toLowerCase() === doi), por = ref ? 'doi' : null;
    /* Con «clave» de una referencia que ya existe, se completa esa; si la clave
       no existe, es la que llevará la nueva. */
    const conClave = !ref && a.clave ? refPorClave(limpiaClaveCita(a.clave), d) : null;
    if (conClave) {
      ref = conClave; por = 'clave';
      if (ref.doi && limpiaDOI(ref.doi).toLowerCase() !== doi) U.falla('La referencia «' + ref.clave + '» ya tiene otro DOI (' + ref.doi + '); no se cambia.');
      if (ref.titulo && nueva.titulo && compara(ref.titulo) !== compara(nueva.titulo)) {
        U.falla('El título de «' + ref.clave + '» («' + ref.titulo + '») no coincide con el que Crossref da para ese DOI («' + nueva.titulo + '»). No se aplicó nada: comprueba que el DOI sea el de esa referencia.');
      }
    }
    /* La misma que ya estaba sin DOI (importada de un .bib sin él): por título
       y año, como al importar, en vez de duplicarla. */
    if (!ref) {
      const ya = indice(refs).busca(nueva);
      if (ya && !limpiaDOI(ya.ref.doi)) { ref = ya.ref; por = ya.por; }
    }
    const faltantes = r => CAMPOS.filter(k => !r[k]);
    let res;
    if (ref) {
      const rellenados = [], discrepancias = [];
      CAMPOS.forEach(k => {
        if (!nueva[k]) return;
        if (!ref[k]) { ref[k] = nueva[k]; rellenados.push(k); }
        else if (k === 'doi' ? limpiaDOI(ref[k]).toLowerCase() !== doi : compara(ref[k]) !== compara(nueva[k])) {
          discrepancias.push({ campo: k, en_el_proyecto: ref[k], en_crossref: nueva[k] });
        }
      });
      recortaAutores(ref);
      res = U.valida(d);
      res.resultado = { accion: 'completada', id: ref.id, clave: ref.clave, por, rellenados, discrepancias,
        siguen_vacios: faltantes(ref),
        ...(discrepancias.length ? { nota: 'Lo que ya tenía la referencia no se tocó. Si Crossref tiene razón, corrígelo tras confirmarlo con el usuario.' } : {}) };
    } else {
      if (!nueva.autores && !nueva.titulo) U.falla('Crossref no trae ni autores ni título para ese DOI; no se añadió nada.');
      const usadas = new Set(refs.map(r => r.clave).filter(Boolean));
      const pedida = limpiaClaveCita(a.clave);
      if (pedida && !CLAVE_OK.test(pedida)) U.falla('La clave «' + a.clave + '» no vale: solo letras y cifras sin acentos, hasta 40.');
      if (pedida && usadas.has(pedida)) U.falla('Ya hay una referencia con la clave «' + pedida + '».');
      nueva.clave = pedida || claveLibre(claveBase(nueva), usadas);
      recortaAutores(nueva);
      refs.push(nueva);
      res = U.valida(d);
      res.resultado = { accion: 'agregada', id: nueva.id, clave: nueva.clave, cita: citaCorta(nueva), siguen_vacios: faltantes(nueva) };
    }
    return res;
  });

  /* ---------- revisión ----------
     Lo que se escapa al citar a mano: una [@clave] que no existe (en pantalla
     sale «[cita perdida]») y referencias citadas a las que les falta lo mínimo
     para encontrarlas. */
  ERLEN_MCP.registraRevision('bibliografia', deck => {
    const d = JSON.parse(JSON.stringify(deck));
    aseguraClaves(d);
    const hallazgos = [], avisadas = new Set();
    d.slides.forEach((sl, i) => {
      const textos = [sl.title, sl.subtitle];
      zonas(sl).flat().forEach(b => textos.push(...textosCitables(b)));
      textos.forEach(t => clavesEnTexto(t).forEach(c => {
        if (refPorClave(c, d) || avisadas.has(i + '|' + c)) return;
        avisadas.add(i + '|' + c);
        hallazgos.push({ categoria: 'referencias', diapositiva: i + 1, problema: 'Cita [@' + c + '] a una clave que no existe: se verá «[cita perdida]».',
          arreglo: 'Corrige la clave o importa la referencia (importar_bibliografia).' });
      }));
    });
    invalidaCitas();
    ordenRefs(d).forEach(id => {
      const r = refPorId(id, d);
      const falta = [!r.autores && 'autores', !r.titulo && 'título', !r.anio && 'año', !(r.doi || r.url || r.revista) && 'revista, DOI o enlace'].filter(Boolean);
      if (!falta.length) return;
      const donde = d.slides.findIndex(sl => (sl.citas || []).includes(id) ||
        [sl.title, sl.subtitle].concat(...zonas(sl).flat().map(textosCitables)).some(t => clavesEnTexto(t).includes(r.clave)));
      hallazgos.push({ categoria: 'referencias', diapositiva: donde >= 0 ? donde + 1 : null,
        problema: 'La referencia «' + r.clave + '» está citada pero le falta ' + falta.join(', ') + '.',
        arreglo: r.doi ? 'completar_por_doi puede rellenar los huecos desde Crossref.' : 'Pide los datos al usuario; no los supongas.' });
    });
    invalidaCitas();
    return hallazgos;
  });
})();
