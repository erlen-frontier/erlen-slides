import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {join,resolve} from 'node:path';import vm from 'node:vm';
/* Límites de informe-v1 (docs/desarrollo.md): una sola fuente en la app,
   src/contratos/informe-v1-limites.json, copia literal de
   erlen-contratos/contratos/informe-v1/limites.json. El build la convierte en
   INFORME_LIMITES; 88e-informe.js ya no copia números a mano. */
const leer=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const valores=json=>Object.fromEntries(Object.entries(JSON.parse(json)).filter(([k])=>!k.startsWith('$')));
const copia=valores(leer('src/contratos/informe-v1-limites.json'));

test('INFORME_LIMITES in the build is exactly the vendored informe-v1 limits and 88e-informe.js keeps no hand copy',()=>{
 const html=leer('public/index.html');
 const m=html.match(/const INFORME_LIMITES=Object\.freeze\((\{[^)]*\})\);/);
 assert.ok(m,'El build define INFORME_LIMITES desde src/contratos/informe-v1-limites.json');
 assert.equal(html.split('const INFORME_LIMITES=').length,2,'Una sola definición en el HTML');
 const enBuild=vm.runInNewContext('('+m[1]+')');
 assert.deepEqual({...enBuild},copia);
 for(const k of ['secciones','bloques','bytes','columnas','filas','series','puntos','marcas','regiones'])assert.ok(Number.isInteger(copia[k])&&copia[k]>0,'Límite '+k+' presente');
 const modulo=leer('src/js/88e-informe.js');
 assert.doesNotMatch(modulo,/INFORME_LIMITES\s*=/,'88e-informe.js no define los límites');
 assert.doesNotMatch(modulo,/\b(secciones|bloques|columnas|filas|series|puntos|marcas|regiones)\s*:\s*\d/,'Sin números de límites copiados a mano');
 const orden=leer('src/js/_orden.txt').trim().split('\n');
 assert.ok(orden.indexOf('_informe-limites-gen.js')>=0&&orden.indexOf('_informe-limites-gen.js')<orden.indexOf('88e-informe.js'),'La constante se carga antes de 88e-informe.js');
});

/* El repo de contratos es privado: la CI de Slides no lo ve y esta parte se omite allí.
   En local: ERLEN_CONTRATOS_DIR=<checkout de erlen-contratos> npm test (o un ../erlen-contratos
   al lado). La puerta de contratos de erlen-suite compara además la constante del build. */
const dirContratos=[process.env.ERLEN_CONTRATOS_DIR,resolve(new URL('..',import.meta.url).pathname,'../erlen-contratos')].filter(Boolean).find(d=>existsSync(join(d,'contratos/informe-v1/limites.json')));
test('The vendored informe-v1 limits match the contract in erlen-contratos',{skip:dirContratos?false:'sin checkout de erlen-contratos (ERLEN_CONTRATOS_DIR)'},()=>{
 const contrato=valores(readFileSync(join(dirContratos,'contratos/informe-v1/limites.json'),'utf8'));
 assert.deepEqual(copia,contrato,'Vuelve a copiar contratos/informe-v1/limites.json en src/contratos/informe-v1-limites.json');
});
