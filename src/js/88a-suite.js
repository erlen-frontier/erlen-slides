/* SPDX-License-Identifier: AGPL-3.0-only */
const SUITE_VISTAS=['inicio','biblioteca','plantillas','herramientas','servicio'];
function suiteVistaValida(v){return SUITE_VISTAS.includes(v)?v:'inicio';}
function suiteRuta(hash){return hash==='#presentaciones'?'editor':suiteVistaValida(String(hash||'').replace(/^#suite\/?/,''));}
function suiteUrl(v){const hash=v==='editor'?'#presentaciones':'#suite/'+suiteVistaValida(v);if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);}
function suiteDesdeUrl(){if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#suite/inicio');const v=suiteRuta(location.hash);v==='editor'?wsCerrar():wsInicio(v);}
function suiteEnlace(v,t,i){return h('a',{class:'suite-nav-link',href:'#suite/'+v,'aria-current':wsVista===v?'page':null},cienciaIcono(i),h('span',null,t));}
function suitePinta(){
 const root=$('#workspaceRoot');root.replaceChildren();root.scrollTop=0;root.setAttribute('aria-label','Erlen Slides');
 const names={inicio:'Inicio',biblioteca:'Mis presentaciones',plantillas:'Ejemplos editables',herramientas:'Recursos',servicio:'Acerca de'};
 document.title=names[wsVista]+' · Erlen Slides';
 const sidebar=h('aside',{class:'suite-sidebar'},h('a',{class:'suite-brand',href:'#suite/inicio'},$('.marca-svg').cloneNode(true),h('span',null,'Erlen'),h('small',null,'SLIDES')),h('nav',{class:'suite-nav','aria-label':'Navegación principal'},suiteEnlace('inicio','Inicio','House'),suiteEnlace('biblioteca','Mis presentaciones','FolderOpen'),suiteEnlace('plantillas','Ejemplos editables','LayoutTemplate'),suiteEnlace('herramientas','Recursos y respaldos','Archive')),h('div',{class:'suite-sidebar-bottom'},suiteEnlace('servicio','Acerca de','Settings2'),h('a',{href:ERLEN_SOURCE_URL,target:'_blank',rel:'noopener'},'Código fuente · AGPLv3'),h('p',null,'Disponible · beta',h('span',null,'Sin cuenta · tu ciencia, en tus manos.'))));
 const panel=h('div',{class:'suite-panel'}),content=h('div',{class:'suite-content'});
 panel.append(h('header',{class:'suite-topbar'},h('span',null,'Presentaciones científicas'),h('div',{class:'suite-top-actions'},h('span',{class:'suite-local'},cienciaIcono('FolderOpen'),'En este navegador'),!deckEnBlanco()?wsBoton('Continuar presentación',wsCerrar):null)),content);root.append(h('div',{class:'suite-shell'},sidebar,panel));
 erlenSuiteNavigation(root.querySelector('.suite-top-actions'),'slides');
 if(wsVista==='inicio'){
 const buscador=h('input',{type:'search',placeholder:'Buscar un ejemplo científico…','aria-label':'Buscar ejemplos científicos'});
 const rejilla=h('section',{class:'slides-showcase','aria-label':'Ejemplos científicos'},h('button',{class:'slides-new-card',type:'button',onclick:()=>wsNueva()},h('span',{class:'slides-new-icon','aria-hidden':'true'},'+'),h('strong',null,'Nueva presentación'),h('small',null,'Lienzo científico en blanco')),...EJEMPLOS.slice(0,3).map((e,i)=>h('article',{class:'slides-example','data-search':(e.n+' '+e.d).toLowerCase()},h('span',{class:'ws-eyebrow'},['QUÍMICA ANALÍTICA','CINÉTICA','INVESTIGACIÓN'][i]),h('div',{class:'slides-example-art','aria-hidden':'true'},i===0?'A = εlc':i===1?'c(t) = c₀e⁻ᵏᵗ':'Pregunta → Evidencia'),h('h2',null,e.n),h('p',null,e.d),wsBoton('Abrir ejemplo',()=>wsNueva(e.build()),true))));
 buscador.addEventListener('input',()=>{const q=buscador.value.trim().toLowerCase();rejilla.querySelectorAll('.slides-example').forEach(card=>card.hidden=q&&!card.dataset.search.includes(q));});
 content.append(h('div',{class:'suite-archive-head'},h('header',{class:'suite-welcome'},h('span',{class:'ws-eyebrow'},'ARCHIVO CIENTÍFICO · ERLEN SLIDES'),h('h1',{id:'wsTitle',tabindex:'-1'},'Presentaciones ',h('em',null,'científicas')),h('p',null,'Crea, explora y conserva historias visuales para comunicar datos, métodos y resultados con precisión.')),h('label',{class:'suite-search'},cienciaIcono('Search'),buscador)));
 content.append(h('div',{class:'suite-archive-meta'},h('h2',null,'Colección de inicio'),h('div',{class:'suite-primary-actions'},wsBoton('Explorar ejemplos',()=>wsCambiar('plantillas')),wsBoton('Importar proyecto',wsAccion(importJSON)))));
 content.append(rejilla);
 content.append(h('footer',{class:'suite-archive-foot'},h('p',{class:'ws-note'},'Ejemplos didácticos · sustituye los datos por los de tu investigación.'),h('span',{class:'suite-archive-status'},'Guardado local activo')));
 }else{content.append(h('header',{class:'suite-page-heading'},h('span',{class:'ws-eyebrow'},'ERLEN SLIDES'),h('h1',{id:'wsTitle',tabindex:'-1'},names[wsVista])),h('section',{id:'wsContent','aria-label':names[wsVista]}));wsPinta();}
 $('#wsTitle')?.focus({preventScroll:true});
}
