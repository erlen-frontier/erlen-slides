/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «guion»: el tiempo de la charla y el guion del orador.
   Los cálculos se hacen en la página (guion.pagina.js) con las funciones del
   editor —planTiempo, intocable, guionHTML—, para que lo que propone el
   asistente sea lo mismo que harían «Ajustar la charla a un tiempo» y
   «Guion del orador». */
import {mkdirSync, writeFileSync, statSync} from 'node:fs';
import {basename, dirname, extname} from 'node:path';
import {lee, op, modifica, rutaSegura, visible, ErrorUso} from '../motor.mjs';

const archivo = {type: 'string', description: 'Proyecto de la carpeta de trabajo.'};

export default {
  herramientas: [{
    name: 'ajustar_tiempos', title: 'Ajustar los minutos a un tiempo',
    description: 'Reparte los minutos previstos de cada diapositiva para que la charla sume minutos_objetivo. Devuelve el plan (antes y después por diapositiva, cuáles no se tocan y por qué) y solo lo guarda con aplicar: true (queda en el historial: deshacer lo revierte). Con al_respaldo: true, antes manda al respaldo las diapositivas de menor peso, como «Ajustar la charla a un tiempo» del editor.',
    inputSchema: {type: 'object', required: ['archivo', 'minutos_objetivo'], properties: {
      archivo,
      minutos_objetivo: {type: 'number', exclusiveMinimum: 0, description: 'Duración que te dan, en minutos.'},
      aplicar: {type: 'boolean', description: 'false (por omisión): solo propone. true: escribe los minutos (y el respaldo) en el proyecto.'},
      al_respaldo: {type: 'boolean', description: 'Si sobra tiempo que no cabe, mover al respaldo (no se borran) las diapositivas de menor peso antes de repartir.'},
      imprescindibles: {type: 'array', items: {anyOf: [{type: 'integer', minimum: 1}, {type: 'string'}]}, description: 'Diapositivas (número o id) que se marcan con la ★ del editor: ni van al respaldo ni cambian sus minutos.'}}},
    annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
    run: async a => {
      const args = {minutos_objetivo: a.minutos_objetivo, al_respaldo: !!a.al_respaldo, aplicar: !!a.aplicar, imprescindibles: a.imprescindibles || []};
      if (a.aplicar) return {aplicado: true, ...(await modifica(a.archivo, 'ajustaTiempos', args, 'ajustar_tiempos'))};
      const {ruta, deck} = lee(a.archivo);
      const r = await op('ajustaTiempos', {...args, deck});
      return {archivo: visible(ruta), aplicado: false, ...r.resultado,
        ...(r.resultado.imposible ? {} : {nota: 'Es una propuesta: repite con aplicar: true para guardarla.'})};
    }
  }, {
    name: 'ensayo_resumen', title: 'Resumen del último ensayo',
    description: 'Compara los tiempos del último ensayo cronometrado que se guardó en el editor (Presentar → Ensayar con cronómetro) con los minutos previstos, y señala las diapositivas que se alargan, de la que más a la que menos.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo}},
    annotations: {readOnlyHint: true, openWorldHint: false},
    run: async a => {
      const {ruta, deck} = lee(a.archivo);
      return {archivo: visible(ruta), ...(await op('resumenEnsayo', {deck}))};
    }
  }],
  convenciones: {
    guion: 'exportar_presentacion con formato «guion» da el guion del orador: por diapositiva, número, título, minutos, reloj acumulado (mm:ss), lo que hay en pantalla y las notas. En Markdown (.md) por omisión; con un destino que acabe en .html, la hoja imprimible del editor, con miniaturas. Antes, ajustar_tiempos cuadra los minutos con la duración.'
  },
  formatos: {
    guion: async a => {
      const {ruta, deck} = lee(a.archivo);
      const pedido = a.destino ? extname(a.destino).toLowerCase() : '';
      if (pedido && pedido !== '.md' && pedido !== '.html') throw new ErrorUso('El guion sale en Markdown (.md) o HTML imprimible (.html); «' + a.destino + '» no es ninguno de los dos.');
      const html = pedido === '.html';
      const destino = rutaSegura(a.destino || basename(ruta, '.json') + '-guion.md', html ? '.html' : '.md');
      const r = await op('guion', {deck, html});
      mkdirSync(dirname(destino), {recursive: true});
      writeFileSync(destino, html ? r.html : r.md);
      const out = {archivo: visible(destino), bytes: statSync(destino).size, formato: html ? 'html' : 'markdown'};
      if (html) return {...out, nota: 'Es el mismo «Guion del orador» del editor: ábrelo en un navegador e imprímelo (Ctrl+P) como PDF.'};
      return {...out, total_min: r.total_min, sin_minutos: r.sin_minutos, diapositivas: r.diapositivas,
        nota: 'Con un destino .html sale la hoja imprimible con miniaturas.' + (r.sin_minutos ? ' Hay diapositivas sin minutos previstos: ajustar_tiempos se los asigna.' : '')};
    }
  }
};
