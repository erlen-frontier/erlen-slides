/* ==== 74-cuentamelo.js ==== */
'use strict';
/* ================= cuéntamelo primero =================
   Le cuentas tu trabajo a la app como se lo contarías a un colega en el
   pasillo —hablando, o pegando lo que dictaste— y ella lo parte en
   afirmaciones y te las propone como esqueleto de la charla. Invierte el
   orden habitual: lo que dices en voz alta suele ser mejor que lo que
   escribes en una caja de texto.
   El reconocimiento de voz es el del navegador (Chrome y Edge lo tienen; en
   algunos, el audio pasa por los servidores del fabricante); si no está,
   pegas el texto y todo lo demás ocurre aquí. */

const MULETILLAS = /\b(este|esto es|o sea|bueno|pues|entonces|digamos|eh+|mm+|ok|vale|como que|la verdad|básicamente|basicamente)\b[,\s]*/gi;
function oraciones(txt) {
  return String(txt || '').replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+|\n+/).map(x => x.trim()).filter(x => x.length > 2);
}
/* De cada oración, si afirma algo, sale una afirmación corta. */
function afirmacionesDe(txt) {
  const out = [];
  oraciones(txt).forEach(o => {
    const limpia = o.replace(MULETILLAS, '').replace(/\s+/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim();
    const n = cuentaPalabras(limpia);
    if (n < 4 || n > 28) return;
    if (!tieneVerbo(limpia) && !/\d/.test(limpia)) return;
    if (/^(hola|gracias|buenos|buenas|voy a|les voy|vamos a ver|en esta|en la siguiente)/i.test(limpia)) return;
    let af = limpia.replace(/^(y|pero|además|también|luego|después|así que|por eso|porque)\s+/i, '');
    af = af.charAt(0).toUpperCase() + af.slice(1).replace(/[\s,;:.!?…]+$/, '');
    out.push({ texto: af, contexto: o, usar: true });
  });
  return out;
}
function openCuentamelo() {
  const area = h('textarea', { class: 'field', rows: 7, placeholder: 'Cuéntalo aquí como se lo contarías a alguien del laboratorio: qué hiciste, qué encontraste, por qué importa. O pulsa «Hablar».' });
  const aviso = h('p', { class: 'hint', style: 'margin:6px 0 0' });
  const lista = h('div', { class: 'cm-lista' });
  let props = [];
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, oyendo = false;
  const bHablar = h('button', { class: 'btn btn-sm' + (Rec ? ' btn-pri' : ''), disabled: !Rec, title: Rec ? 'Reconocimiento de voz del navegador' : 'Este navegador no tiene reconocimiento de voz: pega el texto',
    onclick: () => {
      if (oyendo) { rec.stop(); return; }
      rec = new Rec(); rec.lang = 'es-MX'; rec.continuous = true; rec.interimResults = true;
      let fijo = area.value;
      rec.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) fijo += (fijo && !/\s$/.test(fijo) ? ' ' : '') + t.trim() + '. ';
          else interim += t;
        }
        area.value = fijo + interim;
      };
      rec.onerror = ev => { aviso.textContent = 'El micrófono no respondió (' + ev.error + '). Puedes pegar el texto.'; para(); };
      rec.onend = () => para();
      const para = () => { oyendo = false; bHablar.textContent = '◉ Hablar'; bHablar.classList.remove('grabando'); };
      rec.start(); oyendo = true; bHablar.textContent = '■ Parar'; bHablar.classList.add('grabando');
      aviso.textContent = 'Escuchando… habla con naturalidad; las muletillas se quitan solas.';
    } }, '◉ Hablar');
  const parte = () => {
    props = afirmacionesDe(area.value);
    lista.innerHTML = '';
    if (!props.length) { lista.append(h('p', { class: 'hint' }, 'No encontré afirmaciones todavía. Cuenta qué encontraste: «la banda prohibida bajó con el yodo», «el método funciona hasta 400 grados»…')); return; }
    props.forEach((pz, k) => lista.append(h('label', { class: 'cm-fila' },
      h('input', { type: 'checkbox', checked: pz.usar, onchange: e => { pz.usar = e.target.checked; } }),
      h('div', { class: 'cm-txt' },
        h('div', { class: 'cm-af', contenteditable: 'plaintext-only', spellcheck: 'true', onblur: e => { pz.texto = e.currentTarget.innerText.trim(); } }, pz.texto),
        h('em', null, pz.contexto)))));
    aviso.textContent = props.length + (props.length === 1 ? ' afirmación encontrada' : ' afirmaciones encontradas') + '. Edita, quita las que sobren y crea la charla.';
  };
  const crea = (enLaActual) => {
    const usar = props.filter(p => p.usar && p.texto.trim());
    if (!usar.length) { aviso.textContent = 'Marca al menos una afirmación.'; return; }
    if (!enLaActual) { const d = demoDeck(); d.slides = [d.slides[0]]; d.meta.title = ''; d.meta.subtitle = ''; d.meta.refs = []; loadDeck(d, null); }
    if (rec && oyendo) rec.stop();
    let at = enLaActual ? posBib(S.deck) : S.deck.slides.length;
    usar.forEach(pz => {
      const sl = { id: uid(), layout: 'content', title: pz.texto, blocks: [], notes: pz.contexto };
      prepararZonas(sl, 'content');
      S.deck.slides.splice(at++, 0, sl);
    });
    S.cur = Math.max(1, at - usar.length);
    closeModal(); commit();
    toast(usar.length + ' afirmaciones convertidas en diapositivas; lo que dijiste alrededor quedó en las notas');
    setTimeout(abreArgumento, 200);
  };
  openModal({ title: 'Cuéntamelo primero', size: 'modal-lg',
    onclose: () => { if (rec && oyendo) rec.stop(); },
    body: h('div', null,
      h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Habla o escribe como si le contaras tu trabajo a alguien del laboratorio. La app saca las afirmaciones —lo que tiene verbo y dice qué pasa— y cada una se vuelve el título de una diapositiva; lo que dijiste alrededor queda en las notas. ' +
        (Rec ? 'La voz la reconoce el navegador; en Chrome el audio pasa por Google.' : 'Este navegador no tiene reconocimiento de voz: pega aquí el texto.')),
      area,
      h('div', { style: 'display:flex;gap:7px;margin-top:7px;flex-wrap:wrap' }, bHablar,
        h('button', { class: 'btn btn-sm btn-pri', onclick: parte }, '¶ Sacar las afirmaciones')),
      aviso,
      lista),
    foot: [
      h('button', { class: 'btn', onclick: () => crea(true) }, 'Añadir a esta charla'),
      h('button', { class: 'btn btn-pri', onclick: () => crea(false) }, 'Crear una charla nueva')
    ] });
}


