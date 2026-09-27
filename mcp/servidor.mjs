#!/usr/bin/env node
/* SPDX-License-Identifier: AGPL-3.0-only */
/* Servidor MCP de Erlen Slides: deja que un asistente de IA cree, edite,
   revise y exporte presentaciones con el mismo motor que el editor.

     npm ci && npm run build
     node mcp/servidor.mjs          (lo arranca el cliente MCP, por stdio)

   Habla MCP sobre stdio (JSON-RPC 2.0, un mensaje por línea) sin dependencias
   nuevas: el protocolo que hace falta aquí son cinco métodos. Nada se escribe
   en stdout salvo los mensajes del protocolo; los diagnósticos van a stderr.
   Documentación: docs/mcp.md. */
import {createInterface} from 'node:readline';
import * as M from './motor.mjs';
import * as N from './navegador.mjs';

const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCCIONES = `Erlen Slides es un editor de presentaciones científicas (acabado LaTeX/Beamer).
Flujo recomendado: guia_formato (una vez) → crear_presentacion → agregar_diapositiva (con sus bloques) → revisar_presentacion → vista_previa → exportar_presentacion.
Reglas: no inventes datos, cifras ni referencias. Si el usuario no da datos, deja la gráfica o la tabla con una nota de que son ilustrativos o pide los datos.
Las referencias solo se añaden si el usuario las da o están verificadas. Matemáticas en línea con $...$ en texto y viñetas; los bloques math y chem llevan TeX sin delimitadores.
Las diapositivas se numeran desde 1. Los bloques se identifican por su id (ver_presentacion lo muestra).`;

const archivo = {type: 'string', description: 'Proyecto JSON dentro de la carpeta de trabajo, p. ej. «tesis.json» o «grupo/avance»; «.json» es opcional.'};
const diapositiva = {type: ['integer', 'string'], description: 'Número de diapositiva (desde 1) o su id.'};
const bloque = {type: 'object', description: 'Bloque: {"tipo": "<tipo>", ...propiedades}. Ver guia_formato para tipos y propiedades. Para una imagen local usa {"tipo":"image","archivo":"figs/xrd.png","caption":"…"}.', additionalProperties: true};
const zonas = {type: 'array', items: {type: 'array', items: bloque}, description: 'Una lista de bloques por zona, en orden (el diseño «twocol» tiene 2 zonas, «cuadricula» 4…). Reemplaza el contenido de esas zonas.'};
const encabezados = {type: 'array', items: {type: 'string'}, description: 'Encabezados de zona en los diseños que los usan: comparacion, partida, filas, rejilla6; en «dato» son [cifra, rótulo] y en «cita» [autor o fuente].'};

const HERRAMIENTAS = [
  {name: 'guia_formato', title: 'Guía del formato',
    description: 'Devuelve los diseños de diapositiva, temas, tipos de bloque con sus propiedades por omisión y las clases de gráficas, SmartArt y teoremas. Consúltala antes de construir diapositivas.',
    inputSchema: {type: 'object', properties: {}}, annotations: {readOnlyHint: true},
    run: async () => ({...(await M.guia()), convenciones: CONVENCIONES})},
  {name: 'listar_presentaciones', title: 'Listar presentaciones',
    description: 'Lista los proyectos JSON de Erlen Slides de la carpeta de trabajo.',
    inputSchema: {type: 'object', properties: {}}, annotations: {readOnlyHint: true},
    run: async () => M.listar()},
  {name: 'listar_ejemplos', title: 'Listar ejemplos',
    description: 'Lista los doce ejemplos editables (datos ilustrativos) que sirven de punto de partida: calibración, cinética, defensa de tesis, journal club…',
    inputSchema: {type: 'object', properties: {}}, annotations: {readOnlyHint: true},
    run: async () => M.ejemplos()},
  {name: 'crear_presentacion', title: 'Crear presentación',
    description: 'Crea un proyecto nuevo con portada, o una copia de un ejemplo (desde_ejemplo). No sobrescribe salvo que se pida.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo, titulo: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string', description: 'Id de tema (guia_formato), p. ej. metropolis, revista, catedra, nocturno.'},
      aspecto: {type: 'string', enum: ['169', '43']}, acento: {type: 'string', description: 'Color #RRGGBB opcional.'},
      desde_ejemplo: {type: 'string', description: 'Id de un ejemplo de listar_ejemplos.'}, sobrescribir: {type: 'boolean'}}},
    run: M.crear},
  {name: 'ver_presentacion', title: 'Ver presentación',
    description: 'Esquema de la presentación: metadatos, diapositivas con su diseño, título, zonas y un resumen de cada bloque con su id. Con completo=true devuelve el JSON entero.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, completo: {type: 'boolean'}}}, annotations: {readOnlyHint: true},
    run: M.ver},
  {name: 'editar_metadatos', title: 'Editar metadatos',
    description: 'Cambia título, subtítulo, autores, institución, fecha, tema, aspecto, acento, tipografía, numeración o pie. null borra un campo opcional.',
    inputSchema: {type: 'object', required: ['archivo', 'cambios'], properties: {archivo, cambios: {type: 'object', properties: {
      titulo: {type: 'string'}, titulo_corto: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
      tema: {type: 'string'}, aspecto: {type: 'string', enum: ['169', '43']}, acento: {type: ['string', 'null']}, tipografia: {type: ['string', 'null']}, numeros: {type: 'boolean'}, pie: {type: 'boolean'}}}}},
    run: M.metadatos},
  {name: 'agregar_diapositiva', title: 'Agregar diapositiva',
    description: 'Añade una diapositiva con su diseño, título, notas del orador, duración y, opcionalmente, todos sus bloques de una vez (zonas). Por omisión va al final.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {
      archivo, diseno: {type: 'string', description: 'Id de diseño (guia_formato): content, twocol, section, enunciado, dato, cuadricula…', default: 'content'},
      titulo: {type: 'string'}, notas: {type: 'string', description: 'Notas del orador.'}, minutos: {type: 'number', description: 'Tiempo previsto para esta diapositiva.'},
      posicion: {type: 'integer', description: 'Posición (desde 1) donde insertarla.'}, zonas, encabezados,
      division: {type: 'number', description: 'Solo twocol/barra: % de anchura de la primera columna.'}, columnas: {type: 'integer', description: 'Solo flujo: 2 o 3 columnas.'}}},
    run: M.agregaDiapositiva},
  {name: 'editar_diapositiva', title: 'Editar diapositiva',
    description: 'Cambia título, notas, duración, diseño (reparte los bloques como el editor), encabezados o reemplaza las zonas de una diapositiva.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva, diseno: {type: 'string'}, titulo: {type: 'string'}, notas: {type: 'string'}, minutos: {type: 'number'}, zonas, encabezados, division: {type: 'number'}, columnas: {type: 'integer'}}},
    run: M.editaDiapositiva},
  {name: 'eliminar_diapositiva', title: 'Eliminar diapositiva',
    description: 'Elimina una diapositiva.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva'], properties: {archivo, diapositiva}}, annotations: {destructiveHint: true},
    run: M.eliminaDiapositiva},
  {name: 'mover_diapositiva', title: 'Mover diapositiva',
    description: 'Mueve una diapositiva a otra posición (desde 1).',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'a'], properties: {archivo, diapositiva, a: {type: 'integer'}}},
    run: M.mueveDiapositiva},
  {name: 'agregar_bloque', title: 'Agregar bloque',
    description: 'Añade un bloque (texto, viñetas, ecuación, reacción, tabla, gráfica, SmartArt, caja, teorema, código, cita, imagen…) a una zona de una diapositiva.',
    inputSchema: {type: 'object', required: ['archivo', 'diapositiva', 'bloque'], properties: {archivo, diapositiva, bloque, zona: {type: 'integer', description: 'Zona desde 1 (por omisión 1).'}, posicion: {type: 'integer', description: 'Posición dentro de la zona, desde 1 (por omisión al final).'}}},
    run: M.agregaBloque},
  {name: 'editar_bloque', title: 'Editar bloque',
    description: 'Cambia propiedades de un bloque por su id. Solo se tocan las propiedades enviadas; null borra una. En una imagen, «archivo» reemplaza la figura.',
    inputSchema: {type: 'object', required: ['archivo', 'bloque', 'cambios'], properties: {archivo, bloque: {type: 'string', description: 'Id del bloque.'}, cambios: {type: 'object', additionalProperties: true}}},
    run: M.editaBloque},
  {name: 'eliminar_bloque', title: 'Eliminar bloque',
    description: 'Elimina un bloque por su id.',
    inputSchema: {type: 'object', required: ['archivo', 'bloque'], properties: {archivo, bloque: {type: 'string'}}}, annotations: {destructiveHint: true},
    run: M.eliminaBloque},
  {name: 'agregar_referencia', title: 'Agregar referencia',
    description: 'Añade una referencia bibliográfica real y la cita en las diapositivas indicadas. Úsala solo con referencias que dio el usuario o que verificaste; nunca inventes autores, títulos ni DOI.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, autores: {type: 'string'}, titulo: {type: 'string'}, revista: {type: 'string'}, anio: {type: 'string'}, vol: {type: 'string'}, pag: {type: 'string'}, doi: {type: 'string'}, url: {type: 'string'}, clave: {type: 'string', description: 'Clave alfanumérica para citar en línea con [@clave], p. ej. «Kojima2009».'},
      diapositivas: {type: 'array', items: diapositiva, description: 'Diapositivas donde se cita.'}}},
    run: M.agregaReferencia},
  {name: 'revisar_presentacion', title: 'Revisar presentación',
    description: 'Auditoría del editor: calidad científica de figuras (ejes, unidades, pies, procedencia, escalas log), accesibilidad, estructura (títulos, diapositivas vacías, exceso de texto) y avisos por formato de exportación.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo}}, annotations: {readOnlyHint: true},
    run: M.revisar},
  {name: 'vista_previa', title: 'Vista previa',
    description: 'Renderiza diapositivas en Chromium y las devuelve como imágenes PNG, indicando si algo se desborda. Por omisión, las seis primeras; máximo ocho por llamada. Requiere Chromium.',
    inputSchema: {type: 'object', required: ['archivo'], properties: {archivo, diapositiva: {anyOf: [diapositiva, {type: 'array', items: diapositiva}]}}}, annotations: {readOnlyHint: true},
    run: async a => {
      const r = await N.vistaPrevia(a);
      const texto = {total: r.total, diapositivas: r.imagenes.map(x => ({n: x.n, desborda: x.desborda}))};
      return {content: [{type: 'text', text: JSON.stringify(texto, null, 2)}, ...r.imagenes.map(x => ({type: 'image', data: x.png, mimeType: 'image/png'}))]};
    }},
  {name: 'exportar_presentacion', title: 'Exportar presentación',
    description: 'Exporta a la carpeta de trabajo: beamer (.tex para Overleaf), html (imprimible, autónomo), pdf o pptx (estos dos requieren Chromium).',
    inputSchema: {type: 'object', required: ['archivo', 'formato'], properties: {archivo, formato: {type: 'string', enum: ['beamer', 'html', 'pdf', 'pptx']}, destino: {type: 'string', description: 'Nombre del archivo de salida (opcional).'}}},
    run: async a => {
      if (a.formato === 'beamer' || a.formato === 'html') return M.exportaTexto(a, a.formato);
      if (a.formato === 'pdf') return N.exportaPdf(a);
      if (a.formato === 'pptx') return N.exportaPptx(a);
      throw new M.ErrorUso('Formato desconocido: ' + a.formato);
    }}
];

const CONVENCIONES = {
  texto: 'Los bloques text, bullets, bblock y teorema admiten $matemáticas en línea$ (\\$ para un dólar literal) y citas en línea [@clave] de referencias añadidas con agregar_referencia. No hay marcado de negrita: el texto es literal.',
  math: 'Bloque «math»: tex sin $, p. ej. "E = mc^2" o "\\\\frac{d[A]}{dt} = -k[A]".',
  chem: 'Bloque «chem»: sintaxis mhchem sin \\ce{}, p. ej. "2 H2 + O2 -> 2 H2O" o "Zn^2+ + 2 OH- <=> Zn(OH)2 v".',
  chart: 'Bloque «chart»: data es una tabla (lista de filas o texto separado por tabuladores) con encabezado; la primera columna es x y las demás son series. Una columna «±» tras una serie es su barra de error. kind: linea, dispersion, ajuste o barras. Pon unidades en xlabel/ylabel y un caption.',
  table: 'Bloque «table»: rows es una lista de filas; header=true marca la primera como encabezado.',
  smart: 'Bloque «smart»: items puede ser una lista de textos o de {t, d} (d = detalle).',
  image: 'Bloque «image»: {"tipo":"image","archivo":"ruta/en/la/carpeta.png","caption":"…","w":70}. También acepta src con https o data:.',
  refs: 'Bloque «refs»: lista automáticamente las referencias citadas (agregar_referencia).',
  honestidad: 'Datos que no vengan del usuario se marcan como ilustrativos en el pie y en las notas. No inventes referencias.'
};

/* ---------- protocolo ---------- */
const escribe = m => process.stdout.write(JSON.stringify(m) + '\n');
const responde = (id, result) => escribe({jsonrpc: '2.0', id, result});
const error = (id, code, message) => escribe({jsonrpc: '2.0', id, error: {code, message}});
const log = (...x) => process.stderr.write('[erlen-slides-mcp] ' + x.join(' ') + '\n');

async function llamaHerramienta(nombre, args) {
  const h = HERRAMIENTAS.find(x => x.name === nombre);
  if (!h) return {content: [{type: 'text', text: 'Herramienta desconocida: ' + nombre}], isError: true};
  try {
    const r = await h.run(args || {});
    if (r && Array.isArray(r.content)) return r;
    return {content: [{type: 'text', text: JSON.stringify(r, null, 2)}]};
  } catch (e) {
    if (!(e instanceof M.ErrorUso)) log(nombre, e && e.stack || e);
    return {content: [{type: 'text', text: e instanceof M.ErrorUso ? e.message : 'Error interno: ' + (e && e.message || e)}], isError: true};
  }
}

const RECURSO_GUIA = 'erlen-slides://guia';
async function atiende(m) {
  const {id, method, params} = m;
  switch (method) {
    case 'initialize': {
      const pedida = params && params.protocolVersion;
      return responde(id, {
        protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
        capabilities: {tools: {}, resources: {}},
        serverInfo: {name: 'erlen-slides', title: 'Erlen Slides', version: M.version()},
        instructions: INSTRUCCIONES
      });
    }
    case 'ping': return responde(id, {});
    case 'tools/list':
      return responde(id, {tools: HERRAMIENTAS.map(({run, ...h}) => h)});
    case 'tools/call':
      return responde(id, await llamaHerramienta(params && params.name, params && params.arguments));
    case 'resources/list':
      return responde(id, {resources: [{uri: RECURSO_GUIA, name: 'guia', title: 'Guía del formato de Erlen Slides', mimeType: 'application/json'}]});
    case 'resources/read':
      if (!params || params.uri !== RECURSO_GUIA) return error(id, -32002, 'Recurso desconocido');
      return responde(id, {contents: [{uri: RECURSO_GUIA, mimeType: 'application/json', text: JSON.stringify({...(await M.guia()), convenciones: CONVENCIONES}, null, 2)}]});
    case 'prompts/list': return responde(id, {prompts: []});
    default:
      if (id !== undefined) error(id, -32601, 'Método no disponible: ' + method);
  }
}

/* Los mensajes se atienden en orden: dos cambios seguidos sobre el mismo
   archivo no deben pisarse. */
let cola = Promise.resolve();
const rl = createInterface({input: process.stdin});
rl.on('line', linea => {
  if (!linea.trim()) return;
  let m;
  try { m = JSON.parse(linea); } catch { return error(null, -32700, 'JSON no válido'); }
  if (Array.isArray(m)) return error(null, -32600, 'Los lotes JSON-RPC no se admiten');
  cola = cola.then(() => atiende(m)).catch(e => { log(e && e.stack || e); if (m.id !== undefined) error(m.id, -32603, 'Error interno'); });
});
rl.on('close', () => { cola.then(() => N.cierra()).finally(() => process.exit(0)); });
log('listo; carpeta de trabajo:', M.carpetaTrabajo());
