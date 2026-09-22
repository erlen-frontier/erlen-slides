/* SPDX-License-Identifier: AGPL-3.0-only */
import {readFileSync as read,writeFileSync as write,mkdirSync,cpSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {icons} from 'lucide';
import {generateGlassMap} from './glass-map.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const get=p=>read(join(root,p),'utf8');
const version=JSON.parse(get('package.json')).version;
const order=get('src/js/_orden.txt').trim().split('\n');
/* Mapa de refracción del vidrio (Tier 2, solo-Chromium): se genera en cada
   build y se escribe como módulo ANTES de unir los de src/js, para que
   _orden.txt siempre lo encuentre aunque el repositorio esté limpio.
   El data-URL es base64 (sin comillas); el replace es solo preventivo. */
write(join(root,'src/js/_glass-map-gen.js'),'// Generado por herramientas/glass-map.mjs — no editar a mano.\nconst ERLEN_GLASS_MAP=\''+generateGlassMap().replace(/'/g,"\\'")+'\';\n');
/* Paquete de diseño de la suite (src/diseno, sincronizado por diseno-sync del
   portal): tokens --erlen-* y, del paquete de fuentes, solo las caras que usa
   el cromo, incrustadas para que el archivo suelto siga funcionando y el HTML
   quede bajo los 3 MB del contrato. CMU Concrete (texto de lectura largo) no
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
   diapositivas. Su JS es src/js/55a-suite-cinta.js, copia de src/diseno/suite-cinta.js. */
const css=tokensSuite+'\n'+get('src/diseno/cinta.css')+'\n'+fuentesSuite+'\n'+get('src/css/_preludio.css')+get('src/css/_orden.txt').trim().split('\n').map(n=>get('src/css/'+n)).join('\n');
const lib=p=>get('node_modules/'+p);
const names=['Undo2','Redo2','Search','Expand','Minimize2','ZoomIn','ZoomOut','Plus','HelpCircle','FlaskConical','Atom','ChartLine','FolderOpen','Download','Play','Settings2','House','Presentation','ArrowUpRight','ArrowRight','LayoutTemplate','Archive','ChevronRight',
 /* Iconos de la cinta (src/js/56-cinta.js): uno por significado, sin repetir. */
 'SquarePlus','Copy','Trash2','ListTree','Command','Route','Mic','ChartGantt','Library','GraduationCap','Columns3','Type','List','Sigma','ArrowRightLeft','Image','Table','Blocks','Pi','BookMarked','LibraryBig','Superscript','BookOpen','Palette','Droplet','CaseSensitive','Sparkles','MoveRight','Users','BookA','PanelBottom','Shield','Bookmark','PanelRight','LayoutDashboard','ALargeSmall','Scaling','NotebookPen','ScrollText','Clock','MessageCircleQuestion','Lightbulb','GitBranch','SquareCheck','ListTodo','StickyNote','Brain','Eye','StepForward','Timer','Hourglass','CircleCheckBig','Projector','Accessibility','FileCheck','Microscope','LayoutGrid','Code','SunMoon','Rows3','PanelTop','Pencil','ImageUp','SlidersHorizontal','Scissors','Crop','Ruler','Footprints','WandSparkles','Gauge','ArrowUp','ArrowDown','CopyPlus','Delete','ArrowRightToLine','FilePlus','Save','HardDrive','Upload','History','CalendarDays','FileText','FileSliders','FileCode','FilePen','Printer','NotebookText','FileJson','Package','FileImage','PenTool','ClipboardList','Info'];
if(names.some(n=>!icons[n]))throw new Error('Icono de lucide inexistente: '+names.filter(n=>!icons[n]).join(', '));
const licenses=['@floating-ui/core','@floating-ui/dom','lucide'];
const ui='/*\n'+licenses.map(p=>lib(p+'/LICENSE')).join('\n').replace(/\*\//g,'* /')+'\n*/\n'+lib('@floating-ui/core/dist/floating-ui.core.umd.min.js')+'\n'+lib('@floating-ui/dom/dist/floating-ui.dom.umd.min.js')+'\nwindow.ERLEN_ICONOS='+JSON.stringify(Object.fromEntries(names.map(n=>[n,icons[n]])))+';';
/* El matraz de la marca como icono de pestaña, incrustado: sin petición al
   servidor, sin 404 y disponible con el archivo suelto. */
const FAVICON='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
 +'<rect width="64" height="64" rx="12" fill="'+token('papel')+'"/>'
 +'<path d="M25 10h14v15l13 24a4 4 0 0 1-3.5 6H15.5a4 4 0 0 1-3.5-6l13-24z" fill="none" stroke="'+token('tinta')+'" stroke-width="4" stroke-linejoin="round"/>'
 +'<path d="M20 42h24l5 9H15z" fill="'+token('verde')+'"/></svg>';
const ICONO='<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(FAVICON).replace(/'/g,'%27')+'">';
const script=s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>';
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Erlen Slides · Presentaciones científicas</title>'+ICONO+'<meta name="description" content="Presentaciones científicas libres con ecuaciones, química, datos y exportación. Sin cuenta."><style>body{margin:0;font:14px system-ui,sans-serif;background:'+token('papel')+';color:'+token('tinta')+'}img{max-width:100%}[hidden]{display:none!important}</style><style>'+get('src/css/fuentes-katex.css')+get('src/css/fuentes-tx.css')+css+'</style></head><body>'+get('src/cuerpo.html')+script(get('vendor/katex.min.js'))+script(get('vendor/mhchem.min.js'))+script('window.ERLEN={version:'+JSON.stringify(version)+',telemetria:false};window.ERLEN_LIBRE=true;')+script(ui)+script(get('src/preludio.js')+order.map(n=>get('src/js/'+n)).join('\n'))+'</body></html>\n';
const out=join(root,'public');mkdirSync(out,{recursive:true});
write(join(out,'index.html'),html);write(join(out,'erlen-slides-offline.html'),html.replace('window.ERLEN_LIBRE=true;','window.ERLEN_LIBRE=false;'));
cpSync(join(root,'LICENSE'),join(out,'LICENSE'));cpSync(join(root,'licenses'),join(out,'licenses'),{recursive:true});
/* Licencias del paquete de diseño: tokens y menú (MIT) y fuentes del cromo (OFL para CMU; Latin Modern ya va en GUST-FONT-LICENSE.txt). */
cpSync(join(root,'src/diseno/licencias/MIT.txt'),join(out,'licenses/erlen-diseno-MIT.txt'));cpSync(join(root,'src/diseno/licencias/OFL.txt'),join(out,'licenses/CMU-OFL.txt'));
const science=join(out,'libre');mkdirSync(science,{recursive:true});
const assets=[['@rdkit/rdkit','dist/RDKit_minimal.js','rdkit.js'],['@rdkit/rdkit','dist/RDKit_minimal.wasm','RDKit_minimal.wasm'],['kekule','dist/kekule.min.js','kekule.js'],['3dmol','build/3Dmol-min.js','3dmol.js'],['plotly.js-basic-dist-min','plotly-basic.min.js','plotly.js']];
const manifest=[];
for(const [pkg,file,name]of assets){const data=read(join(root,'node_modules',pkg,file));write(join(science,name),data);manifest.push({package:pkg,version:JSON.parse(lib(pkg+'/package.json')).version,file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
for(const pkg of new Set([...licenses,...assets.map(a=>a[0])]))cpSync(join(root,'node_modules',pkg,'LICENSE'),join(out,'licenses',pkg.replaceAll('/','-')+'.txt'));
cpSync(join(root,'node_modules/3dmol/build/3Dmol-min.js.LICENSE.txt'),join(out,'licenses/3dmol-dependencies.txt'));
cpSync(join(root,'node_modules/kekule/dist/themes'),join(science,'themes'),{recursive:true});cpSync(join(root,'web/quimica-worker.js'),join(science,'quimica-worker.js'));
write(join(science,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
write(join(out,'build.json'),JSON.stringify({version,modules:order.length,sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n');
console.log(`Built Erlen Slides ${version}: ${order.length} modules, ${(Buffer.byteLength(html)/1024).toFixed(0)} KiB, no production configuration.`);
