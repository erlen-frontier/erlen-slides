/* Extensión de prueba (tests/mcp-extensiones.test.mjs): usa cada gancho. */
import {modifica, op, lee} from '../../../mcp/motor.mjs';
export default {
  herramientas: [{
    name: 'prueba_poner_titulo', title: 'Prueba', description: 'Pone el mismo título a todas las diapositivas.',
    inputSchema: {type: 'object', required: ['archivo', 'titulo'], properties: {archivo: {type: 'string'}, titulo: {type: 'string'}}},
    run: a => modifica(a.archivo, 'pruebaTitulos', a, 'prueba_poner_titulo')
  }],
  prompts: [{name: 'prueba_prompt', title: 'Prueba', description: 'Prompt de prueba', arguments: [{name: 'x', required: true}], texto: a => 'hola ' + a.x}],
  convenciones: {prueba: 'convención de prueba'},
  formatos: {
    prueba: async a => { const {deck} = lee(a.archivo); return {diapositivas: (await op('sanea', {deck})).deck.slides.length}; }
  },
  /* {tipo:'text', gritar:'hola'} → texto en mayúsculas. */
  transformaBloque: async b => {
    if (b.gritar == null) return b;
    const out = {...b, text: String(b.gritar).toUpperCase()};
    delete out.gritar;
    return out;
  }
};
