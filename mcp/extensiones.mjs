/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensiones del servidor MCP.

   Cada herramienta nueva vive en su propio archivo en vez de alargar el
   catálogo común, para que varias personas (o agentes) puedan añadir cosas a
   la vez sin pisarse:

     mcp/extensiones/<id>.mjs        (Node) export default {
                                        herramientas: [{name, title, description, inputSchema, annotations, run}],
                                        prompts: [{name, title, description, arguments, texto(args)}],
                                        convenciones: {clave: 'texto para guia_formato'},
                                        formatos: {nombre: async args => resultado},   // exportar_presentacion
                                        transformaBloque: async (bloque, {esImagen}) => bloque
                                      }
     mcp/extensiones/<id>.pagina.js  (página del editor) se evalúa tras operaciones.js:
                                      ERLEN_MCP.registra('miOperacion', args => {...});
                                      ERLEN_MCP.registraRevision(deck => [{categoria, diapositiva, problema, arreglo}]);
                                      ERLEN_MCP.util.{valida, bloqueDesde, diapositivaNueva, ...}

   Se cargan en orden alfabético. ERLEN_MCP_EXTENSIONES añade otra carpeta
   (separadas por el delimitador de rutas del sistema); lo usan las pruebas. */
import {readdirSync, existsSync} from 'node:fs';
import {resolve, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

export const CARPETAS = [fileURLToPath(new URL('./extensiones/', import.meta.url)),
  ...String(process.env.ERLEN_MCP_EXTENSIONES || '').split(delimiter).filter(Boolean).map(d => resolve(d))];

/* Rutas de los archivos de un tipo, en orden estable. */
export function archivos(sufijo) {
  const out = [];
  for (const dir of CARPETAS) {
    if (!existsSync(dir)) continue;
    readdirSync(dir).filter(n => n.endsWith(sufijo) && !(sufijo === '.mjs' && n.endsWith('.pagina.mjs'))).sort()
      .forEach(n => out.push(resolve(dir, n)));
  }
  return out;
}
