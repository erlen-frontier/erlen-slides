/* SPDX-License-Identifier: AGPL-3.0-only */
/* Página de la extensión «masiva»: estilo_global. Se hace aquí porque los
   valores válidos son los de la app (ANIMS, ANIM_VEL, newBlock) y no una
   copia que con el tiempo se aparte de ellos. */
(function () {
  'use strict';
  const { valida, falla } = ERLEN_MCP.util;
  const omision = t => newBlock(t) || {};
  const conW = t => 'w' in omision(t);
  const sinoDe = (v, prop) => {
    if (typeof v !== 'boolean') falla('«' + prop + '» debe ser true o false.');
    return v;
  };

  /* Cada propiedad: nombres que acepta, a qué bloques se aplica y cómo se
     traduce el valor para cada tipo (las tablas guardan «l»/«c» donde el
     texto guarda «left»/«center»). aplica(tipo, valor) devuelve {v} con el
     valor a guardar, {motivo} si ese bloque no lo admite y conviene decirlo,
     o null si la propiedad no tiene sentido en ese tipo. */
  const PROPS = {
    size: {
      alias: ['tamano', 'tamaño', 'tamanio'],
      valor: v => ({ s: 's', n: 'n', l: 'l', pequeno: 's', 'pequeño': 's', normal: 'n', grande: 'l' })[String(v).toLowerCase()] || falla('«size» debe ser s, n o l (pequeño, normal, grande); llegó «' + v + '».'),
      aplica: (t, v) => t === 'text' ? { v } : t === 'math' ? (v === 's' ? { motivo: 'las ecuaciones solo tienen tamaño normal y grande' } : { v }) : null,
      pordefecto: () => 'n'
    },
    align: {
      alias: ['alineacion', 'alineación'],
      valor: v => ({ left: 'left', l: 'left', izquierda: 'left', center: 'center', c: 'center', centro: 'center', centrado: 'center', centrada: 'center' })[String(v).toLowerCase()] || falla('«align» debe ser left o center; llegó «' + v + '».'),
      aplica: (t, v) => t === 'text' ? { v } : t === 'table' ? { v: v === 'left' ? 'l' : 'c' } : null,
      pordefecto: t => t === 'table' ? 'c' : 'left'
    },
    anim: {
      alias: ['animacion', 'animación', 'efecto'],
      valor: v => AK_ANIM[v] ? v : falla('Animación desconocida: «' + v + '». Válidas: ' + ANIMS.map(a => a.id).join(', ') + '.'),
      aplica: (t, v) => t === 'spacer' ? null : v === 'draw' && !['chart', 'func', 'smart', 'geo'].includes(t) ? { motivo: '«draw» solo tiene efecto en gráficas y diagramas' } : { v },
      pordefecto: () => 'fade'
    },
    animVel: {
      alias: ['velocidad', 'vel'],
      valor: v => ANIM_VEL.some(x => x.id === v) ? v : falla('Velocidad desconocida: «' + v + '». Válidas: ' + ANIM_VEL.map(x => x.id).join(', ') + '.'),
      aplica: (t, v) => t === 'spacer' ? null : { v },
      pordefecto: () => 'normal'
    },
    animRet: {
      alias: ['retardo'],
      valor: v => (typeof v === 'number' && v >= 0 && v <= 2000) ? Math.round(v) : falla('«animRet» es un retardo en ms entre 0 y 2000; llegó «' + v + '».'),
      aplica: (t, v) => t === 'spacer' ? null : { v },
      pordefecto: () => 0
    },
    step: {
      alias: ['por_pasos', 'pasos', 'paso'],
      valor: v => sinoDe(v, 'step'),
      aplica: (t, v) => t === 'spacer' ? null : { v },
      pordefecto: () => false
    },
    w: {
      alias: ['ancho', 'anchura'],
      valor: v => (typeof v === 'number' && v >= 10 && v <= 100) ? Math.round(v) : falla('«w» es una anchura en % entre 10 y 100; llegó «' + v + '».'),
      aplica: (t, v) => conW(t) ? { v } : null,
      pordefecto: t => omision(t).w
    },
    grid: {
      alias: ['cuadricula', 'cuadrícula', 'rejilla'],
      valor: v => sinoDe(v, 'grid'),
      aplica: (t, v) => t === 'chart' || t === 'func' ? { v } : null,
      pordefecto: () => true
    },
    legend: {
      alias: ['leyenda'],
      valor: v => sinoDe(v, 'legend'),
      aplica: (t, v) => t === 'chart' || t === 'func' ? { v } : null,
      pordefecto: () => true
    }
  };
  const ALIAS = {};
  Object.keys(PROPS).forEach(k => { ALIAS[k] = k; PROPS[k].alias.forEach(a => { ALIAS[a] = k; }); });

  ERLEN_MCP.registra('masivaEstilo', a => {
    const d = a.deck;
    /* Primero todo lo que puede estar mal en la petición, antes de tocar nada. */
    const props = [];
    Object.keys(a.propiedades || {}).forEach(k0 => {
      const k = ALIAS[k0];
      if (!k) falla('Propiedad no admitida en estilo_global: «' + k0 + '». Válidas: ' + Object.keys(PROPS).join(', ') + '. Para otras, usa editar_bloque.');
      if (props.some(p => p.k === k)) falla('«' + k0 + '» repite la propiedad «' + k + '».');
      props.push({ k, v: PROPS[k].valor(a.propiedades[k0]) });
    });
    let tipos = null;
    if (a.tipo_bloque != null) {
      tipos = Array.isArray(a.tipo_bloque) ? a.tipo_bloque : [a.tipo_bloque];
      tipos.forEach(t => { if (!BLOCK_DEFS.some(x => x.id === t)) falla('Tipo de bloque desconocido: «' + t + '». Tipos: ' + BLOCK_DEFS.map(x => x.id).join(', ') + '.'); });
      /* Si se pidió un tipo concreto y la propiedad no le va a ninguno, es un
         error de la petición, no algo que omitir en silencio. */
      props.forEach(p => {
        if (!tipos.some(t => { const x = PROPS[p.k].aplica(t, p.v); return x && 'v' in x; }))
          falla('«' + p.k + '» no se aplica a ' + tipos.map(t => '«' + t + '»').join(', ') + '.');
      });
    }
    const indices = Array.isArray(a.indices) ? new Set(a.indices) : null;
    const cambios = [], omitidos = {};
    d.slides.forEach((sl, i) => {
      if (indices && !indices.has(i)) return;
      zonas(sl).forEach(arr => arr.forEach(b => {
        if (!b || (tipos && !tipos.includes(b.type))) return;
        props.forEach(({ k, v }) => {
          const x = PROPS[k].aplica(b.type, v);
          if (!x) return;
          if (x.motivo) {
            const clave = k + '|' + b.type;
            (omitidos[clave] = omitidos[clave] || { propiedad: k, tipo: b.type, motivo: x.motivo, bloques: 0 }).bloques++;
            return;
          }
          const nuevo = x.v;
          /* Sin la propiedad, el bloque usa el valor por omisión: pedir ese
             mismo valor no es un cambio. */
          const antes = b[k] !== undefined ? b[k] : PROPS[k].pordefecto(b.type);
          if (antes === nuevo) return;
          cambios.push({ diapositiva: i + 1, bloque: b.id, tipo: b.type, propiedad: k, antes: antes === undefined ? null : antes, despues: nuevo });
          b[k] = nuevo;
        });
      }));
    });
    const r = valida(d);
    r.resultado = { cambios, total: cambios.length, omitidos: Object.keys(omitidos).map(c => omitidos[c]) };
    return r;
  });
})();
