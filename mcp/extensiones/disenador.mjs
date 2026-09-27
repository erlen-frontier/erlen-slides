/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «disenador»: las ideas de diseño del editor como herramientas.
   sugerir_disenos lista los acomodos que el Diseñador propone para una
   diapositiva según lo que contiene —texto largo, una gráfica con su
   explicación, varias figuras, una lista corta que puede ser SmartArt, una
   cifra, una cita, una ecuación— y, si hay Chromium, los enseña en un mosaico.
   aplicar_diseno aplica una por su id y entra en el historial. Ninguna
   propuesta escribe texto nuevo: solo reordena o convierte lo que ya está. */
import {lee, op, modifica, visible} from '../motor.mjs';
import {sesion} from '../navegador.mjs';

const archivo = {type: 'string', description: 'Proyecto de la carpeta de trabajo.'};
const diapositiva = {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}], description: 'Número (desde 1) o id de la diapositiva.'};

/* La diapositiva actual y cada propuesta en una sola imagen, con su rótulo
   en la esquina. Se pinta con la misma versión imprimible que vista_previa. */
async function mosaico({deck, etiquetas}) {
  const s = await sesion();
  const info = await s.pagina.evaluate(d => { loadDeck(d, null); const [W, H] = slideDims(d); return {html: buildPrintableHTML(false), W, H}; }, deck);
  const p = await s.contexto.newPage({viewport: {width: info.W, height: info.H}});
  try {
    await p.setContent(info.html, {waitUntil: 'load'});
    await p.evaluate(() => document.fonts && document.fonts.ready);
    const cols = etiquetas.length <= 4 ? 2 : 3, z = cols === 2 ? 0.45 : 0.32;
    await p.addStyleTag({content: `.tip{display:none}body{background:#fff}
      #printArea{display:grid;grid-template-columns:repeat(${cols},${Math.round(info.W * z)}px);gap:14px;padding:14px;width:max-content;background:#E6E9EF}
      .pr-page{margin:0;zoom:${z};position:relative;box-shadow:0 0 0 2px #9AA3B2}
      .pr-page:first-child{box-shadow:0 0 0 6px #161A26}
      .pr-page::after{content:attr(data-n);position:absolute;right:0;top:0;padding:2px 16px;font:700 40px system-ui;background:#161A26;color:#fff;opacity:.88;border-bottom-left-radius:10px;z-index:9}`});
    await p.evaluate(et => { [...document.getElementById('printArea').children].forEach((el, i) => el.setAttribute('data-n', et[i] || '')); }, etiquetas);
    return (await p.locator('#printArea').screenshot({type: 'png'})).toString('base64');
  } finally { await p.close(); }
}

export default {
  herramientas: [{
    name: 'sugerir_disenos', title: 'Sugerir diseños',
    description: 'Ideas de diseño para una diapositiva, como el Diseñador del editor: acomodos completos según lo que contiene (texto largo → texto fluido o partido en dos; figura y texto → dos columnas o pie ancho; 2–4 figuras → lado a lado, zigzag, tres columnas o cuadrícula; lista corta → SmartArt de proceso, lista, ciclo, cronología o jerarquía; una cifra → «dato»; una cita → «cita»; una ecuación o estructura → al centro). Cada propuesta trae id, razón, diseño resultante y bloques por zona; con Chromium, además un mosaico PNG: «Actual» y luego cada propuesta numerada. Nunca inventa contenido: solo reordena o convierte lo que hay. Aplica una con aplicar_diseno.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva,
      imagen: {type: 'boolean', description: 'false para no pintar el mosaico (más rápido). Por omisión se pinta si hay Chromium.'}}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const {ruta, deck} = lee(a.archivo);
      const {mosaico: datosMosaico, ...r} = await op('sugiereDisenos', {deck, diapositiva: a.diapositiva, mosaico: a.imagen !== false});
      const out = {archivo: visible(ruta), ...r};
      if (!datosMosaico) return out;
      let png = null;
      try {
        png = await mosaico(datosMosaico);
        out.imagen = 'Mosaico: «Actual» (con marco oscuro) y luego cada propuesta con su número e id, en el orden de la lista.';
      } catch (e) {
        /* Sin Chromium las propuestas siguen valiendo: se dice por qué no hay imagen. */
        out.imagen = 'Sin mosaico: ' + String(e && e.message || e).split('\n')[0];
      }
      if (!png) return out;
      return {content: [{type: 'text', text: JSON.stringify(out, null, 2)}, {type: 'image', data: png, mimeType: 'image/png'}], structuredContent: out};
    }
  }, {
    name: 'aplicar_diseno', title: 'Aplicar diseño',
    description: 'Aplica a una diapositiva una de las propuestas de sugerir_disenos, por su id («flujo», «smart-proceso», «dato»…). Se recalculan sobre el archivo actual: si la diapositiva cambió y la propuesta ya no existe, el error dice cuáles hay. Entra en el historial: deshacer la revierte.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'propuesta'], properties: {archivo, diapositiva,
      propuesta: {type: 'string', description: 'El id de la propuesta, tal como lo dio sugerir_disenos.'}}},
    annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
    run: a => modifica(a.archivo, 'aplicaDiseno', {diapositiva: a.diapositiva, propuesta: a.propuesta}, 'aplicar_diseno')
  }],
  convenciones: {
    disenador: 'Para acomodar una diapositiva que ya tiene contenido, sugerir_disenos propone arreglos completos con su razón (y un mosaico si hay Chromium); aplicar_diseno aplica uno por su id. No escriben texto: una lista corta puede pasar a SmartArt, una cifra sola a «dato» y una cita a «cita» con su autor, o vacío si no lo tenía.'
  }
};
