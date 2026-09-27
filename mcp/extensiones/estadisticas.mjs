/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión de referencia: el patrón mínimo de una herramienta nueva.
   La parte de Node declara la herramienta y lee el proyecto; la cuenta se
   hace en la página (estadisticas.pagina.js), con las funciones de la app. */
import {lee, op, visible} from '../motor.mjs';

export default {
  herramientas: [{
    name: 'estadisticas_presentacion', title: 'Estadísticas de la presentación',
    description: 'Cifras de la charla por diapositiva: palabras, bloques, figuras, tablas, ecuaciones, minutos y si tiene notas. Útil para ver de un vistazo dónde sobra texto o faltan tiempos.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo: {type: 'string', description: 'Proyecto de la carpeta de trabajo.'}}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const {ruta, deck} = lee(a.archivo);
      return {archivo: visible(ruta), ...(await op('estadisticas', {deck}))};
    }
  }]
};
