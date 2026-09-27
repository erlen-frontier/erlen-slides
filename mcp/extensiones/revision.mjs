/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «revision»: reglas de rigor que miran unidades, cifras, notación,
   siglas, notas del orador y referencias a figuras. Viven en la página
   (revision.pagina.js) y salen en «adicional» de revisar_presentacion; aquí se
   declara además revisar_convenciones, que las pasa solas y en milisegundos
   para iterar mientras se escribe, y la convención para guia_formato, para
   que el asistente escriba bien desde el principio. */
import {lee, op, visible} from '../motor.mjs';

const CATEGORIAS = ['unidades', 'cifras', 'notacion', 'acronimos', 'orador', 'figuras'];

export default {
  herramientas: [{
    name: 'revisar_convenciones', title: 'Revisar unidades, cifras y siglas',
    description: 'Solo las reglas de rigor de revisar_presentacion, sin dibujar las diapositivas: unidades (símbolos del SI, espacio, la misma magnitud con dos unidades), cifras (significativas de más, decimales dispares en una columna, punto y coma decimal mezclados), notación (fórmulas sin subíndices, DRX y XRD en la misma charla), siglas sin definir, notas del orador (faltan, sin minutos, más largas que el tiempo) y referencias a figuras o tablas que no existen. Rápida: úsala tras cada lote de cambios y revisar_presentacion al final.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo: {type: 'string', description: 'Proyecto de la carpeta de trabajo.'},
      categorias: {type: 'array', items: {type: 'string', enum: CATEGORIAS}, description: 'Solo estas categorías; por omisión, todas.'}}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const {ruta, deck} = lee(a.archivo);
      return {archivo: visible(ruta), ...(await op('revisionConvenciones', {deck, categorias: a.categorias || []}))};
    }
  }],
  convenciones: {
    revision: 'revisar_presentacion (en «adicional») y revisar_convenciones aplican reglas por categoría (unidades, cifras, notacion, acronimos, orador, figuras), cada hallazgo con «regla», «diapositiva», «problema» y «arreglo». Para no activarlas: símbolos del SI con espacio («25 °C», «10 mL», «24 h», «7.6 Å»; sin espacio solo % y el grado de ángulo), una sola unidad por magnitud y un solo separador decimal en toda la charla, las cifras que sostenga la medida, un solo nombre por técnica (DRX o XRD), cada sigla desarrollada la primera vez («difracción de rayos X (DRX)») o en meta.glosas, notas en cada diapositiva de contenido (≈130 palabras por minuto) y «Figura N» solo si existe.'
  }
};
