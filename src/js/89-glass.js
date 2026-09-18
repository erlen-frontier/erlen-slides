/* ==== 89-glass.js ==== */
'use strict';
/* ===== Liquid Glass, Tier 2: refracción real en controles pequeños =====
   Técnica del displacement map (SDF + Snell): shuding/liquid-glass (MIT)
   y kube.io; el PNG lo genera el build (herramientas/glass-map.mjs) y
   llega como ERLEN_GLASS_MAP en _glass-map-gen.js.
   Limitación aceptada: en Firefox/Safari el valor url() del backdrop se
   descarta y se cae al Tier 1 (.vidrio con blur+saturate); @supports no
   puede gatearlo (Blink no lo estandariza), así que la detección es aquí,
   en tiempo de carga, y su fallo degrada sin romper nada.
   El glass es cosmético: TODO el módulo falla en silencio (sin errores
   en consola) para que un navegador raro no rompa la aplicación. */
(() => {
  const call = fn => { try { fn(); } catch { /* silencio */ } };

  const ensambla = () => call(() => {
    /* Red de seguridad 1: sin mapa generado no hay nada que refractar. */
    if (typeof ERLEN_GLASS_MAP === 'undefined' || !ERLEN_GLASS_MAP) return;
    /* Red de seguridad 2: sin la interfaz feDisplacementMap no hay filtro. */
    if (typeof SVGFEDisplacementMapElement === 'undefined') return;

    /* Sonda Blink: backdrop-filter:url(#…) solo sobrevive en el valor
       computado donde el motor lo acepta; en Firefox/Safari (y en jsdom,
       donde la propiedad no existe) se descarta o vuelve vacía. */
    const sonda = document.createElement('div');
    sonda.style.backdropFilter = 'url(#erlen-lg-probe)';
    document.documentElement.append(sonda);
    const estilo = typeof getComputedStyle === 'function' ? getComputedStyle(sonda) : null;
    const valor = estilo ? (estilo.backdropFilter || estilo.webkitBackdropFilter || '') : '';
    sonda.remove();
    if (!valor.includes('url(')) return;

    /* Filtro compartido: el mapa estira su 128×128 a la caja de cada
       control, así que un único filtro sirve para todos. */
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    const filtro = document.createElementNS(NS, 'filter');
    filtro.id = 'erlen-lg';
    filtro.setAttribute('x', '0');
    filtro.setAttribute('y', '0');
    filtro.setAttribute('width', '100%');
    filtro.setAttribute('height', '100%');
    const mapa = document.createElementNS(NS, 'feImage');
    mapa.setAttribute('href', ERLEN_GLASS_MAP);
    mapa.setAttribute('result', 'm');
    const desp = document.createElementNS(NS, 'feDisplacementMap');
    desp.setAttribute('in', 'SourceGraphic');
    desp.setAttribute('in2', 'm');
    desp.setAttribute('scale', '24'); /* maxDisplacement 12 px × 2 */
    desp.setAttribute('xChannelSelector', 'R');
    desp.setAttribute('yChannelSelector', 'G');
    filtro.append(mapa, desp);
    svg.append(filtro);
    document.body.append(svg);

    /* La regla lleva !important para ganar a los fondos ya escritos de
       .pop/.zoombox/…, pero se retira si el usuario pide menos
       transparencia o más contraste: ahí el material .vidrio ya es opaco. */
    const regla = document.createElement('style');
    regla.textContent =
      '.erlen-refract{backdrop-filter:var(--glass-blur) url(#erlen-lg)!important;' +
      '-webkit-backdrop-filter:var(--glass-blur) url(#erlen-lg)!important}' +
      '@media (prefers-reduced-transparency:reduce),(prefers-contrast:more){' +
      '.erlen-refract{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}';
    document.head.append(regla);

    const sella = el => el.classList.add('erlen-refract');
    /* Los que ya existen al cargar: zoombox, slide-pos y cualquier .pop. */
    $$('.zoombox,.slide-pos,.pop').forEach(sella);

    /* Los que nacen después: los toasts entran en #toasts y los .pop los
       cuelga showMenu del body; un solo observador (childList + subtree)
       cubre los dos caminos. Su callback también va blindado. */
    const nace = nodos => {
      for (const n of nodos) {
        if (n.nodeType !== 1) continue;
        if (n.matches('.pop,.toast')) sella(n);
        n.querySelectorAll('.pop,.toast').forEach(sella);
      }
    };
    new MutationObserver(muts => call(() => {
      for (const m of muts) nace(m.addedNodes);
    })).observe(document.body, { childList: true, subtree: true });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensambla);
  } else {
    call(ensambla);
  }
})();
