/* SPDX-License-Identifier: AGPL-3.0-only */
import {readFileSync as read,writeFileSync as write,mkdirSync,cpSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {icons} from 'lucide';
import {minify} from 'terser';
import {build as bundle} from 'esbuild';
import {generateGlassMap} from './glass-map.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const get=p=>read(join(root,p),'utf8');
const version=JSON.parse(get('package.json')).version;
const order=get('src/js/_orden.txt').trim().split('\n');
/* Compact new editor modules without renaming globals used by MCP and lazy
   adapters. Shared design copies and their license notices remain intact. */
const compactos=new Set(['05b-barra-contextual.js','07-modals.js','31-revision.js','56-cinta.js','79-accesible.js','85-edicion-lote.js','85-flujos.js']);
/* Mapa de refracción del vidrio (Tier 2, solo-Chromium): se genera en cada
   build y se escribe como módulo ANTES de unir los de src/js, para que
   _orden.txt siempre lo encuentre aunque el repositorio esté limpio.
   El data-URL es base64 (sin comillas); el replace es solo preventivo. */
/* Límites del tipo informe-v1: fuente única, la copia literal del contrato
   (erlen-contratos, contratos/informe-v1/limites.json) en src/contratos/. El
   build la convierte en la constante INFORME_LIMITES que usa 88e-informe.js;
   tests/informe-limites.test.mjs comprueba que coinciden (docs/desarrollo.md). */
const limitesInforme=Object.fromEntries(Object.entries(JSON.parse(get('src/contratos/informe-v1-limites.json'))).filter(([k])=>!k.startsWith('$')));
if(!Object.keys(limitesInforme).length||Object.values(limitesInforme).some(v=>!Number.isInteger(v)||v<1))throw new Error('src/contratos/informe-v1-limites.json no trae límites enteros positivos');
write(join(root,'src/js/_informe-limites-gen.js'),'// Generado por herramientas/build.mjs desde src/contratos/informe-v1-limites.json — no editar a mano.\nconst INFORME_LIMITES=Object.freeze('+JSON.stringify(limitesInforme)+');\n');
write(join(root,'src/js/_glass-map-gen.js'),'// Generado por herramientas/glass-map.mjs — no editar a mano.\nconst ERLEN_GLASS_MAP=\''+generateGlassMap().replace(/'/g,"\\'")+'\';\n');
/* Build the unmodified shared home/frame modules without bundling Mey. Tabula
   explicitly opts out of that optional interface in both component configs. */
const sinMey={name:'tabula-sin-mey',setup(b){
 b.onResolve({filter:/^\.\/mey\.mjs$/},()=>({path:'mey',namespace:'tabula-sin-mey'}));
 b.onResolve({filter:/^\.\/suite-mey-ayuda\.mjs$/},()=>({path:'ayuda',namespace:'tabula-sin-mey'}));
 b.onLoad({filter:/.*/,namespace:'tabula-sin-mey'},({path})=>({loader:'js',contents:path==='mey'
  ? "const ausente=()=>{throw Error('Mey no está disponible en Tabula')};export const mey=Object.assign(ausente,{definir:ausente,montar:ausente,recorrerPagina:ausente,recorridoActual:ausente});"
  : "export const TEXTOS_AYUDA_MEY={es:{},en:{}};export function crearAyudaMey(){throw Error('Mey no está disponible en Tabula')}"}));
}};
const licenciaDiseno='/* SPDX-License-Identifier: MIT\n'+get('src/diseno/licencias/MIT.txt').replace(/\*\//g,'* /')+'\n*/\n';
async function componenteSinMey(archivo,exportado,global){
 const out=await bundle({stdin:{contents:`export {${exportado}} from './src/diseno/${archivo}.mjs';`,resolveDir:root},
  bundle:true,format:'iife',globalName:'componente',platform:'browser',write:false,plugins:[sinMey]});
 return licenciaDiseno+`const ${global}=(()=>{`+out.outputFiles[0].text+`return componente.${exportado};})();`;
}
const modulos=await Promise.all(order.map(async n=>{
 if(n==='../diseno/suite-inicio.js')return componenteSinMey('suite-inicio','mountInicio','erlenInicio');
 if(n==='../diseno/suite-marco.js')return componenteSinMey('suite-marco','mountMarco','erlenMarco');
 const s=get('src/js/'+n);return compactos.has(n)?(await minify(s,{compress:{unused:false},mangle:false,format:{comments:/SPDX/}})).code:s;
}));
/* Paquete de diseño de la suite (src/diseno, sincronizado por diseno-sync del
   portal): tokens --erlen-* y, del paquete de fuentes, solo las caras que usa
   el cromo, incrustadas para que el archivo suelto siga funcionando y el HTML
   quede bajo el presupuesto de 3,6 MiB con la tipografía original de Erlen. CMU Concrete (texto de lectura largo) no
   se incrusta: el cromo de Slides no tiene lectura larga. base.css y
   motion.css no se cargan: sus reglas de elemento tocarían las diapositivas. */
const CARAS_CROMO=['lm-roman-400-normal','lm-roman-700-normal','lm-sans-400-normal','lm-sans-700-normal','cmu-typewriter-400-normal'];
const fuentesSuite=get('src/diseno/fuentes.css').split('\n').filter(l=>l.startsWith('@font-face')&&CARAS_CROMO.some(c=>l.includes('fuentes/'+c+'.')))
 .map(l=>l.replace(/url\((fuentes\/[^)]+\.woff2)\)/,(_,f)=>'url(data:font/woff2;base64,'+read(join(root,'src/diseno',f)).toString('base64')+')')).join('\n');
if(fuentesSuite.split('\n').length!==CARAS_CROMO.length)throw new Error('src/diseno/fuentes.css no declara todas las caras del cromo: vuelve a sincronizar el paquete');
const tokensSuite=get('src/diseno/tokens.css');
const token=n=>{const m=tokensSuite.match(new RegExp('--erlen-'+n+':(#[0-9a-fA-F]{3,8})'));if(!m)throw new Error('falta --erlen-'+n+' en src/diseno/tokens.css');return m[1];};
/* La cinta común de la suite (diseno/cinta.css) va justo tras los tokens: solo
   usa --erlen-* y sus reglas van con prefijo .erlen-cinta, así que no toca las
   diapositivas. Su JS se carga de src/diseno/suite-cinta.js (en src/js/_orden.txt).
   La pantalla de inicio común (diseno/inicio.css) va tras la cinta, con la misma regla:
   solo --erlen-* y prefijo .erlen-inicio. Su JS se carga de
   src/diseno/suite-inicio.js (en src/js/_orden.txt). Le siguen la base del cromo
   (diseno/base.css, prerrequisito del marco) y el marco común (diseno/marco.css, prefijo
   .erlen-marco): sus slots reciben los nodos del editor y su JS se carga de
   src/diseno/suite-marco.js (en src/js/_orden.txt). motion.css no se carga: sus
   animaciones se dejarían sentir en las diapositivas. */
/* These synced styles start with a Mey-only prelude. Require the expected
   boundaries so a future shared update cannot silently drop unrelated CSS. */
function cssSinMey(path){
 const css=get(path),inicio=css.indexOf('/* Erlen Suite · paquete de diseño');
 if(!css.startsWith('/* Mey vive encima')||inicio<0)throw new Error('No se encontró el límite del CSS de Mey en '+path);
 return css.slice(inicio);
}
const css=tokensSuite+'\n'+get('src/diseno/cinta.css')+'\n'+cssSinMey('src/diseno/inicio.css')+'\n'+get('src/diseno/base.css')+'\n'+cssSinMey('src/diseno/marco.css')+'\n'+fuentesSuite+'\n'+get('src/css/_preludio.css')+get('src/css/_orden.txt').trim().split('\n').map(n=>get('src/css/'+n)).join('\n');
const lib=p=>get('node_modules/'+p);
const names=['Undo2','Redo2','Search','Expand','Minimize2','ZoomIn','ZoomOut','Plus','HelpCircle','FlaskConical','Atom','ChartLine','FolderOpen','Download','Play','Settings2','House','Presentation','ArrowUpRight','ArrowRight','Archive','ChevronRight',
 /* Formato y acciones de la barra contextual. */
 'Bold','Italic','AlignLeft','AlignCenter','AlignRight','Lock',
 /* Iconos de la cinta (src/js/56-cinta.js): uno por significado, sin repetir. */
 'SquarePlus','Copy','Trash2','ListTree','Command','Route','Mic','ChartGantt','Library','GraduationCap','Columns3','Type','List','Sigma','ArrowRightLeft','Image','Images','Table','Blocks','Pi','BookMarked','LibraryBig','Superscript','BookOpen','Palette','Droplet','CaseSensitive','Sparkles','MoveRight','Users','BookA','PanelBottom','Shield','Bookmark','PanelRight','LayoutDashboard','ALargeSmall','Scaling','NotebookPen','ScrollText','Clock','MessageCircleQuestion','Lightbulb','GitBranch','SquareCheck','ListTodo','StickyNote','Brain','Eye','StepForward','Timer','Hourglass','CircleCheckBig','Projector','Accessibility','FileCheck','Microscope','LayoutGrid','Code','SunMoon','Rows3','PanelTop','Pencil','ImageUp','SlidersHorizontal','Scissors','Crop','Ruler','Footprints','WandSparkles','Gauge','ArrowUp','ArrowDown','CopyPlus','Delete','ArrowRightToLine','FilePlus','Save','HardDrive','Upload','History','CalendarDays','FileText','FileSliders','FileCode','FilePen','Printer','NotebookText','FileJson','Package','FileImage','PenTool','ClipboardList','Info','Group','Layers3','Layers2','Workflow','Video','GalleryHorizontalEnd','FileInput','LockOpen'];
if(names.some(n=>!icons[n]))throw new Error('Icono de lucide inexistente: '+names.filter(n=>!icons[n]).join(', '));
const licenses=['@floating-ui/core','@floating-ui/dom','lucide'];
const ui='/*\n'+licenses.map(p=>lib(p+'/LICENSE')).join('\n').replace(/\*\//g,'* /')+'\n*/\n'+lib('@floating-ui/core/dist/floating-ui.core.umd.min.js')+'\n'+lib('@floating-ui/dom/dist/floating-ui.dom.umd.min.js')+'\nwindow.ERLEN_ICONOS='+JSON.stringify(Object.fromEntries(names.map(n=>[n,icons[n]])))+';';
/* The app-owned mark is shared by the home screen, editor and favicon. */
const FAVICON=get('src/identidad/marca.svg').trim();
const ICONO='<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(FAVICON).replace(/'/g,'%27')+'">';
/* Catálogo de despliegue de la suite (ERLEN_SUITE_CATALOG): el JSON {items, home} viaja en
   un bloque <script type="application/json"> del <head> y lo lee
   erlenSuiteNavigation.catalogoDe(document) al arrancar. Sin la variable no se embebe nada
   y el menú conserva su detección standalone: cero peticiones y cero enlaces inventados. */
let catalogoHtml='';
if(process.env.ERLEN_SUITE_CATALOG){
 const catalogo=JSON.parse(read(process.env.ERLEN_SUITE_CATALOG,'utf8'));
 const itemOk=i=>i&&typeof i.id==='string'&&/^[a-z][a-z0-9-]*$/.test(i.id)&&typeof i.label==='string'&&i.label&&typeof i.href==='string'&&i.href;
 if(!catalogo||!Array.isArray(catalogo.items)||!catalogo.items.length||!catalogo.items.every(itemOk)||!catalogo.home||typeof catalogo.home.href!=='string')
  throw new Error('ERLEN_SUITE_CATALOG debe ser {items:[{id,label,href}], home:{href}}');
 catalogoHtml='<script type="application/json" id="erlen-suite-catalog">'+JSON.stringify(catalogo).replace(/</g,'\\u003c')+'</script>';
}
const script=s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>';
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tabula · Presentaciones</title>'+ICONO+catalogoHtml+'<meta name="description" content="Presentaciones visuales con ecuaciones, química, datos y exportación. Sin cuenta."><style>body{margin:0;font:14px system-ui,sans-serif;background:'+token('papel')+';color:'+token('tinta')+'}img{max-width:100%}[hidden]{display:none!important}</style><style>'+get('src/css/fuentes-katex.css')+get('src/css/fuentes-tx.css')+css+'</style></head><body>'+get('src/cuerpo.html')+script(get('vendor/katex.min.js'))+script(get('vendor/mhchem.min.js'))+script('window.ERLEN={version:'+JSON.stringify(version)+',telemetria:false};window.ERLEN_LIBRE=true;window.ERLEN_SLIDES_MARCA='+JSON.stringify(FAVICON)+';')+script(ui)+script(get('src/preludio.js')+modulos.join('\n'))+'</body></html>\n';
const out=join(root,'public');mkdirSync(out,{recursive:true});
write(join(out,'index.html'),html);write(join(out,'erlen-slides-offline.html'),html.replace('window.ERLEN_LIBRE=true;','window.ERLEN_LIBRE=false;'));
cpSync(join(root,'LICENSE'),join(out,'LICENSE'));cpSync(join(root,'licenses'),join(out,'licenses'),{recursive:true});
/* Licencias del paquete de diseño: tokens y menú (MIT) y fuentes del cromo (OFL para CMU; Latin Modern ya va en GUST-FONT-LICENSE.txt). */
cpSync(join(root,'src/diseno/licencias/MIT.txt'),join(out,'licenses/erlen-diseno-MIT.txt'));cpSync(join(root,'src/diseno/licencias/OFL.txt'),join(out,'licenses/CMU-OFL.txt'));
const science=join(out,'libre');mkdirSync(science,{recursive:true});
const assets=[['@rdkit/rdkit','dist/RDKit_minimal.js','rdkit.js'],['@rdkit/rdkit','dist/RDKit_minimal.wasm','RDKit_minimal.wasm'],['kekule','dist/kekule.min.js','kekule.js'],['3dmol','build/3Dmol-min.js','3dmol.js'],['plotly.js-basic-dist-min','plotly-basic.min.js','plotly.js'],['pptxgenjs','dist/pptxgen.bundle.js','pptxgen.bundle.js'],['reveal.js','dist/reveal.js','reveal.js'],['reveal.js','dist/reveal.css','reveal.css'],['mermaid','dist/mermaid.esm.min.mjs','mermaid/mermaid.esm.min.mjs'],['pptxtojson','dist/index.js','pptxtojson.mjs'],['fabric','dist/index.min.mjs','fabric.mjs']];
const manifest=[];
for(const [pkg,file,name]of assets){const data=read(join(root,'node_modules',pkg,file));mkdirSync(dirname(join(science,name)),{recursive:true});write(join(science,name),data);manifest.push({package:pkg,version:JSON.parse(lib(pkg+'/package.json')).version,file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
/* Keep optional runtimes outside the editor HTML. They are served locally,
   and autonomous presentations inline only the runtime they actually use. */
cpSync(join(root,'node_modules/mermaid/dist/chunks/mermaid.esm.min'),join(science,'mermaid/chunks/mermaid.esm.min'),{recursive:true,filter:p=>!p.endsWith('.map')});
const propios=[['src/markdown-core.mjs','markdown-core.mjs'],['mcp/operaciones.js','operaciones.js'],['web/exportaciones-avanzadas.js','exportaciones-avanzadas.js'],['web/flujos-editor.js','flujos-editor.js'],['src/pptx-core.mjs','pptx-core.mjs'],['src/figuras-core.mjs','figuras-core.mjs'],['web/pptx-worker.mjs','pptx-worker.mjs'],['web/importar-presentacion.js','importar-presentacion.js'],['web/figuras-editor.js','figuras-editor.js'],['web/compartir-presentacion.js','compartir-presentacion.js']];
for(const [from,to]of [...propios,['vendor/katex.min.js','katex.min.js']])cpSync(join(root,from),join(science,to));
/* El catálogo científico se mantiene local, pero sus dibujos se cargan solo
   cuando se necesitan. Los archivos de procedencia viajan con cada pieza. */
cpSync(join(root,'src/figures-catalog'),join(science,'figures-catalog'),{recursive:true});
write(join(science,'chart-runtime.js'),['01-util.js','02-data.js','11-expr.js','12-chart.js','15-smart.js'].map(n=>get('src/js/'+n)).join('\n')+'\n'+get('src/js/79-accesible.js').split('function revisaAccesibilidad')[0]);
const registra=(file,pkg,version)=>{const data=read(join(science,file));manifest.push({package:pkg,version,file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});};
for(const file of [...propios.map(x=>x[1]),'chart-runtime.js'])registra(file,'@erlen/slides',version);
registra('katex.min.js','katex',get('vendor/katex.min.js').match(/version:"([^"]+)"/)[1]);
function registraCarpeta(dir,pkg,ver){for(const ent of readdirSync(join(science,dir),{withFileTypes:true})){const p=dir+'/'+ent.name;if(ent.isDirectory())registraCarpeta(p,pkg,ver);else registra(p,pkg,ver);}}
registraCarpeta('mermaid/chunks/mermaid.esm.min','mermaid',JSON.parse(lib('mermaid/package.json')).version);
registraCarpeta('figures-catalog','@erlen/figures-catalog','0.21.0');
/* Distribute notices for the dependencies embedded in these browser bundles,
   including nested versions. Development-only dependencies are excluded. */
const vistos=new Set(), componentes=[];
function carpetaPaquete(nombre,desde){for(let p=desde;;p=dirname(p)){const d=join(p,'node_modules',nombre);if(existsSync(join(d,'package.json')))return d;if(p===dirname(p))throw new Error('Paquete no encontrado: '+nombre);}}
function avisosPaquete(nombre,desde=root){const d=carpetaPaquete(nombre,desde),m=JSON.parse(read(join(d,'package.json'),'utf8')),id=m.name+'@'+m.version;if(vistos.has(id))return;vistos.add(id);componentes.push({name:m.name,version:m.version,license:m.license,repository:m.repository});
 const l=['LICENSE','LICENSE.md','LICENSE.txt','LICENSE.markdown','LICENSE-MIT','COPYING','COPYING.txt','license','license.md','license.txt',...(m.name==='isarray'?['README.md']:[])].map(n=>join(d,n)).find(existsSync);
 if(l)cpSync(l,join(out,'licenses',id.replaceAll('/','-')+'.txt'));
 else throw new Error('Falta licencia de '+id);
 for(const dep of Object.keys(m.dependencies||{}))if(!(m.name==='pptxgenjs'&&dep==='https'))avisosPaquete(dep,d);
}
for(const p of ['mermaid','pptxgenjs','reveal.js','pptxtojson','fabric'])avisosPaquete(p);
write(join(out,'licenses/presentation-components.json'),JSON.stringify(componentes,null,2)+'\n');
/* Cada paquete trae su licencia con un nombre distinto, y alguno deja de traerla (@rdkit/rdkit 2026.3 solo publica README y dist/): entonces vale la copia
   que ya está en licenses/, revisada a mano. Sin ninguna de las dos, el build se detiene: no se publica un paquete sin su licencia. */
for(const pkg of new Set([...licenses,...assets.map(a=>a[0])])){const destino=join(out,'licenses',pkg.replaceAll('/','-')+'.txt');
 const propio=['LICENSE','LICENSE.md','LICENSE.txt','COPYING'].map(n=>join(root,'node_modules',pkg,n)).find(existsSync);
 if(propio)cpSync(propio,destino);else if(existsSync(join(root,'licenses',pkg.replaceAll('/','-')+'.txt')))console.warn(`${pkg} no incluye su licencia: se usa la copia de licenses/.`);
 else throw new Error(`${pkg} no incluye su licencia y no hay copia en licenses/${pkg.replaceAll('/','-')}.txt`);}
cpSync(join(root,'node_modules/3dmol/build/3Dmol-min.js.LICENSE.txt'),join(out,'licenses/3dmol-dependencies.txt'));
cpSync(join(root,'node_modules/kekule/dist/themes'),join(science,'themes'),{recursive:true});cpSync(join(root,'web/quimica-worker.js'),join(science,'quimica-worker.js'));
write(join(science,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
write(join(out,'build.json'),JSON.stringify({version,modules:order.length,sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n');
console.log(`Built Tabula ${version}: ${order.length} modules, ${(Buffer.byteLength(html)/1024).toFixed(0)} KiB, no production configuration.`);
