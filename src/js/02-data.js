/* ==== 02-data.js ==== */
'use strict';
/* ================= catálogos: temas, plantillas, demo ================= */

/* Diecinueve temas, ordenados como se eligen: primero los de sala clara, luego los
   de papel y, al final, los dos oscuros. Cada uno declara sus colores, si el
   pie va en franjas («cells»), suelto («simple») o es solo el número («page»),
   y la línea Beamer con la que sale en el .tex. Cuando Beamer no tiene un
   equivalente exacto se usa el más cercano y queda dicho en un comentario que
   viaja al propio archivo exportado. La pinta de cada tema —márgenes, letra y
   tamaños— vive en 02-slides.css, en el bloque .th-<clave>. */
const THEMES = {
  metropolis: { name: 'Metropolis', desc: 'Moderno y minimalista · el favorito en congresos', acc: '#EB811B', bg: '#FAFAFA', fg: '#23373B', ft: '#23373B', ftfg: '#FAFAFA', mut: '#5F7176', pieBg: '#23373B', pieFg: '#FAFAFA', foot: 'page', dark: false, tex: '\\usetheme{metropolis}' },
  plenaria:   { name: 'Plenaria', desc: 'Titulares grandes y pocas palabras · para plenarias y pósteres', acc: '#0E6F7C', bg: '#FFFFFF', fg: '#14181B', ft: '#FFFFFF', ftfg: '#14181B', mut: '#5C646B', pieBg: '#0E6F7C', pieFg: '#FFFFFF', foot: 'page', dark: false,
    tex: '\\usetheme{metropolis}\n% Beamer no trae un tema de titulares grandes: se agrandan a mano.\n% Metropolis usa la letra Fira, así que compila con XeLaTeX o LuaLaTeX.\n\\setbeamerfont{frametitle}{size=\\huge}\n\\setbeamerfont{title}{size=\\Huge}\n\\definecolor{acentoPlenaria}{HTML}{0E6F7C}\n\\setbeamercolor{structure}{fg=acentoPlenaria}' },
  revista:    { name: 'Revista', desc: 'Sans limpio y reglas finas · se lee como una figura de artículo', acc: '#235E8C', bg: '#FFFFFF', fg: '#1B1D21', ft: '#FFFFFF', ftfg: '#1B1D21', mut: '#61666E', pieBg: '#235E8C', pieFg: '#FFFFFF', foot: 'simple', dark: false,
    tex: '\\usetheme{Boadilla}\n% Boadilla es el tema de fábrica más limpio: sin barra de navegación.\n\\definecolor{acentoRevista}{HTML}{235E8C}\n\\setbeamercolor{structure}{fg=acentoRevista}' },
  madrid:     { name: 'Madrid', desc: 'El clásico Beamer azul con pie de tres franjas', acc: '#3333B3', bg: '#FFFFFF', fg: '#111111', ft: '#3333B3', ftfg: '#FFFFFF', mut: '#555A66', pieBg: '#3333B3', pieFg: '#FFFFFF', foot: 'cells', dark: false, tex: '\\usetheme{Madrid}' },
  cambridge:  { name: 'Cambridge US', desc: 'Granate y gris, estilo academia estadounidense', acc: '#87201F', bg: '#FFFFFF', fg: '#191919', ft: '#FFFFFF', ftfg: '#87201F', mut: '#575757', pieBg: '#87201F', pieFg: '#FFFFFF', foot: 'cells', dark: false, tex: '\\usetheme{CambridgeUS}' },
  sobrio:     { name: 'Sobrio', desc: 'Serifas tipo artículo, para cuando manda el texto', acc: '#1E3A6E', bg: '#FFFFFF', fg: '#15171B', ft: '#FFFFFF', ftfg: '#15171B', mut: '#585D68', pieBg: '#1E3A6E', pieFg: '#FFFFFF', foot: 'simple', dark: false, tex: '\\usetheme{default}\n\\usefonttheme{serif}' },
  catedra:    { name: 'Cátedra', desc: 'Serifas, mucho margen y poco color · para el tribunal', acc: '#2E5241', bg: '#FFFFFF', fg: '#16181C', ft: '#FFFFFF', ftfg: '#16181C', mut: '#5A6068', pieBg: '#2E5241', pieFg: '#FFFFFF', foot: 'simple', dark: false,
    tex: '\\usetheme{default}\n\\useoutertheme{infolines}\n\\usefonttheme{serif}\n% En pantalla la letra es Pagella; en el PDF, la serifa de fábrica de LaTeX.\n% Para que coincidan, añade \\usepackage{tgpagella}.\n\\definecolor{acentoCatedra}{HTML}{2E5241}\n\\setbeamercolor{structure}{fg=acentoCatedra}' },
  papel:      { name: 'Papel', desc: 'Fondo hueso y tinta cálida · cansa menos en charlas largas', acc: '#8C4A2A', bg: '#F6F1E7', fg: '#2B2723', ft: '#F6F1E7', ftfg: '#2B2723', mut: '#6E655A', pieBg: '#2B2723', pieFg: '#F6F1E7', foot: 'simple', dark: false,
    tex: '\\usetheme{Boadilla}\n\\usefonttheme{serif}\n% El mismo esqueleto que Revista, con serifas y el papel teñido de hueso.\n\\definecolor{papelHueso}{HTML}{F6F1E7}\n\\definecolor{tintaPapel}{HTML}{2B2723}\n\\definecolor{acentoPapel}{HTML}{8C4A2A}\n\\setbeamercolor{background canvas}{bg=papelHueso}\n\\setbeamercolor{normal text}{fg=tintaPapel}\n\\setbeamercolor{structure}{fg=acentoPapel}' },
  proyector:  { name: 'Proyector', desc: 'Negro sobre blanco y letra grande · para salas con luz', acc: '#0B3FC4', bg: '#FFFFFF', fg: '#000000', ft: '#FFFFFF', ftfg: '#000000', mut: '#2E2E2E', pieBg: '#000000', pieFg: '#FFFFFF', foot: 'simple', dark: false,
    tex: '\\usetheme{default}\n\\usecolortheme{dove}\n% «dove» es el tema en blanco y negro de Beamer; el acento fuerte lo pone Erlen.\n\\definecolor{acentoProyector}{HTML}{0B3FC4}\n\\setbeamercolor{structure}{fg=acentoProyector}\n\\setbeamercolor{alerted text}{fg=acentoProyector}' },
  banda:      { name: 'Banda', desc: 'Banda de ciruela a sangre en cada título · se sigue de lejos y ordena la lectura', acc: '#5B2B6E', bg: '#FAF8FB', fg: '#1E1B24', ft: '#5B2B6E', ftfg: '#FFFFFF', mut: '#5E5766', pieBg: '#5B2B6E', pieFg: '#FFFFFF', foot: 'page', dark: false,
    tex: '\\usetheme{Boadilla}\n% Boadilla deja el título en texto suelto: la banda de color se le pone a mano.\n\\definecolor{ciruelaBanda}{HTML}{5B2B6E}\n\\definecolor{papelBanda}{HTML}{FAF8FB}\n\\setbeamercolor{background canvas}{bg=papelBanda}\n\\setbeamercolor{structure}{fg=ciruelaBanda}\n\\setbeamercolor{frametitle}{bg=ciruelaBanda,fg=white}\n\\setbeamerfont{frametitle}{size=\\large,series=\\bfseries}\n\\setbeamertemplate{itemize items}[square]\n\\setbeamercolor{itemize item}{fg=ciruelaBanda}\n\\addtobeamertemplate{frametitle}{\\vskip4pt}{\\vskip6pt}\n% La banda de Beamer queda más baja y sin el filete claro del borde inferior: eso no se reproduce.\n% En pantalla la letra es Source Sans; para que coincida, añade \\usepackage[default]{sourcesanspro}.' },
  bloque:     { name: 'Bloque', desc: 'Retícula suiza, mucho aire y un solo rojo · para pocas ideas bien puestas', acc: '#BE2418', bg: '#FBFBF9', fg: '#1B1D21', ft: '#FBFBF9', ftfg: '#1B1D21', mut: '#5B5F66', pieBg: '#1B1D21', pieFg: '#FBFBF9', foot: 'simple', dark: false,
    tex: '\\usetheme{default}\n\\usecolortheme{dove}\n% «dove» deja Beamer en blanco y negro; el rojo entra solo donde tiene que verse.\n\\definecolor{grafitoBloque}{HTML}{1B1D21}\n\\definecolor{rojoBloque}{HTML}{BE2418}\n\\definecolor{papelBloque}{HTML}{FBFBF9}\n\\setbeamercolor{background canvas}{bg=papelBloque}\n\\setbeamercolor{normal text}{fg=grafitoBloque}\n\\setbeamercolor{frametitle}{fg=grafitoBloque}\n\\setbeamercolor{structure}{fg=rojoBloque}\n\\setbeamercolor{itemize item}{fg=rojoBloque}\n\\setbeamercolor{itemize subitem}{fg=grafitoBloque}\n\\setbeamerfont{frametitle}{size=\\large,series=\\bfseries}\n\\setbeamertemplate{itemize items}[square]\n\\setbeamersize{text margin left=1.5cm,text margin right=1.5cm}\n% La regla roja bajo el título no viene de fábrica: se añade al final de la plantilla.\n\\addtobeamertemplate{frametitle}{}{\\par\\vspace{2pt}{\\color{rojoBloque}\\rule{\\textwidth}{1.5pt}}}\n% El contraste de pesos —cuerpo ligero contra título grueso— pide una familia con peso light:\n% \\usepackage[sfdefault,light]{FiraSans}. Con la letra de fábrica el tema pierde su carácter.' },
  salvia:     { name: 'Salvia', desc: 'Verde apagado, sans abierto y mucho aire · para clases y seminarios largos', acc: '#33654A', bg: '#EBEFE9', fg: '#2B2A24', ft: '#DEE7DA', ftfg: '#2B2A24', mut: '#5A6156', pieBg: '#2B3A31', pieFg: '#EBEFE9', foot: 'simple', dark: false,
    tex: '\\usetheme{Boadilla}\n% El papel verde grisáceo y la banda clara del título no vienen de fábrica: se fijan a mano, como en Papel.\n\\definecolor{salviaPapel}{HTML}{EBEFE9}\n\\definecolor{salviaBanda}{HTML}{DEE7DA}\n\\definecolor{salviaTinta}{HTML}{2B2A24}\n\\definecolor{salviaAcento}{HTML}{33654A}\n\\setbeamercolor{background canvas}{bg=salviaPapel}\n\\setbeamercolor{normal text}{fg=salviaTinta}\n\\setbeamercolor{structure}{fg=salviaAcento}\n\\setbeamercolor{frametitle}{bg=salviaBanda,fg=salviaTinta}\n% El filete verde que cierra la banda pediría redefinir la plantilla del frametitle: en el PDF la banda va sin él.\n% En pantalla la letra es Source Sans; para que el PDF coincida, añade \\usepackage[default]{sourcesanspro}.' },
  arena:      { name: 'Arena', desc: 'Papel de arena y la sans de LaTeX · aire de imprenta sin el blanco del folio', acc: '#8A571C', bg: '#F2EADB', fg: '#33291F', ft: '#F2EADB', ftfg: '#33291F', mut: '#6E6153', pieBg: '#3A2E22', pieFg: '#F2EADB', foot: 'simple', dark: false,
    tex: '\\usetheme{Boadilla}\n\\usepackage{lmodern}\n% La letra de Beamer ya es Latin Modern Sans, la misma que ves en pantalla: aquí solo se tiñe el papel.\n\\definecolor{arenaPapel}{HTML}{F2EADB}\n\\definecolor{arenaTinta}{HTML}{33291F}\n\\definecolor{arenaCobre}{HTML}{8A571C}\n\\setbeamercolor{background canvas}{bg=arenaPapel}\n\\setbeamercolor{normal text}{fg=arenaTinta}\n\\setbeamercolor{structure}{fg=arenaCobre}\n% El doble filete bajo el título, uno grueso de cobre y otro fino, es cosa de Erlen: en Beamer habría que redefinir la plantilla del frametitle.' },
  marino:     { name: 'Marino', desc: 'Azul marino con un filo de latón · para una defensa o una conferencia invitada', acc: '#B08A32', bg: '#F4F6FA', fg: '#15243D', ft: '#F4F6FA', ftfg: '#16345E', mut: '#566276', pieBg: '#16345E', pieFg: '#F4F6FA', foot: 'simple', dark: false,
    tex: '\\usetheme{Boadilla}\n\\usefonttheme{serif}\n% Boadilla es el tema de fábrica más limpio y, con serifas, es la puesta en\n% escena de una defensa. En pantalla la letra es Termes; en el PDF, la serifa\n% de fábrica de LaTeX. Para que coincidan, añade \\usepackage{tgtermes}.\n\\definecolor{marinoPapel}{HTML}{F4F6FA}\n\\definecolor{marinoTinta}{HTML}{15243D}\n\\definecolor{marinoAzul}{HTML}{16345E}\n\\definecolor{marinoLaton}{HTML}{B08A32}\n\\setbeamercolor{background canvas}{bg=marinoPapel}\n\\setbeamercolor{normal text}{fg=marinoTinta}\n\\setbeamercolor{structure}{fg=marinoAzul}\n\\setbeamercolor{frametitle}{bg=marinoPapel,fg=marinoAzul}\n\\setbeamercolor{block title}{bg=white,fg=marinoAzul}\n\\setbeamercolor{block body}{bg=white}\n\\setbeamercolor{alerted text}{fg=marinoLaton!65!marinoTinta}\n\\setbeamerfont{frametitle}{series=\\bfseries}\n% El trozo corto de latón sobre la regla del título, el canto de color de las\n% cajas y la barra de sección son de Erlen: Beamer no los trae y no salen\n% sin reescribir las plantillas de frametitle y de bloque.' },
  acuarela:   { name: 'Acuarela', desc: 'Tres azules fríos en vez de un acento · para charlas con muchas figuras', acc: '#2B7B9C', bg: '#F7FAFB', fg: '#1E2A31', ft: '#F7FAFB', ftfg: '#1D5C74', mut: '#5C6B75', pieBg: '#1D5C74', pieFg: '#F7FAFB', foot: 'page', dark: false,
    tex: '\\usetheme{default}\n% Sin barras ni adornos: el marco acompaña a las figuras y no compite con\n% ellas. En vez de un acento único, tres azules emparentados: el título en el\n% más oscuro, las viñetas y las reglas en el medio, los bloques en el acero.\n\\definecolor{acuarelaPapel}{HTML}{F7FAFB}\n\\definecolor{acuarelaTinta}{HTML}{1E2A31}\n\\definecolor{acuarelaTitulo}{HTML}{1D5C74}\n\\definecolor{acuarelaVineta}{HTML}{2B7B9C}\n\\definecolor{acuarelaBloque}{HTML}{4A6A9E}\n\\setbeamercolor{background canvas}{bg=acuarelaPapel}\n\\setbeamercolor{normal text}{fg=acuarelaTinta}\n\\setbeamercolor{structure}{fg=acuarelaVineta}\n\\setbeamercolor{frametitle}{bg=acuarelaPapel,fg=acuarelaTitulo}\n\\setbeamercolor{block title}{bg=acuarelaBloque!10!acuarelaPapel,fg=acuarelaBloque}\n\\setbeamercolor{block body}{bg=acuarelaBloque!6!acuarelaPapel}\n\\setbeamerfont{frametitle}{size=\\large,series=\\mdseries}\n% La letra de pantalla es Fira Sans Light: compila con XeLaTeX o LuaLaTeX y\n% añade \\usepackage[light]{FiraSans} para clavarla. Con pdfLaTeX sale la sans\n% de fábrica, que también vale.\n% El filete de tres colores bajo el título y en la portada es de Erlen:\n% Beamer no lo trae.' },
  nocturno:   { name: 'Nocturno', desc: 'Oscuro elegante para salas con poca luz', acc: '#F09A4D', bg: '#1B2127', fg: '#E9EDF2', ft: '#11161B', ftfg: '#F2F5F8', mut: '#A3B2BD', pieBg: '#11161B', pieFg: '#F2F5F8', foot: 'page', dark: true, tex: '\\usetheme{metropolis} % variante oscura' },
  indigo:     { name: 'Índigo', desc: 'Oscuro azul, más frío y contenido que el Nocturno', acc: '#7FC2E0', bg: '#101A2C', fg: '#DCE4F2', ft: '#0B1220', ftfg: '#E9EFF8', mut: '#93A4C0', pieBg: '#0B1220', pieFg: '#E4EBF6', foot: 'page', dark: true,
    tex: '\\usetheme{metropolis}\n% El azul oscuro de fábrica es \\usecolortheme{albatross}; aquí se fijan los colores exactos.\n% Metropolis usa la letra Fira, así que compila con XeLaTeX o LuaLaTeX.\n\\definecolor{fondoIndigo}{HTML}{101A2C}\n\\definecolor{textoIndigo}{HTML}{DCE4F2}\n\\definecolor{acentoIndigo}{HTML}{7FC2E0}\n\\setbeamercolor{background canvas}{bg=fondoIndigo}\n\\setbeamercolor{normal text}{fg=textoIndigo}\n\\setbeamercolor{structure}{fg=acentoIndigo}\n\\setbeamercolor{alerted text}{fg=acentoIndigo}\n\\setbeamercolor{frametitle}{bg=fondoIndigo!72!black,fg=textoIndigo}' },
  carbon:     { name: 'Carbón', desc: 'Casi negro cálido y tinta de hueso · descansa la vista a última hora del día', acc: '#E2563C', bg: '#15110D', fg: '#F2E8D8', ft: '#15110D', ftfg: '#F2E8D8', mut: '#B6A58E', pieBg: '#0C0A07', pieFg: '#F2E8D8', foot: 'simple', dark: true,
    tex: '\\usetheme{default}\n\\usefonttheme{serif}\n% El casi negro cálido no está en el catálogo de Beamer: los colores van a mano.\n% En pantalla la letra es Pagella; para que el PDF coincida, añade \\usepackage{tgpagella}.\n\\definecolor{fondoCarbon}{HTML}{15110D}\n\\definecolor{huesoCarbon}{HTML}{F2E8D8}\n\\definecolor{cobreCarbon}{HTML}{E2563C}\n\\setbeamercolor{background canvas}{bg=fondoCarbon}\n\\setbeamercolor{normal text}{fg=huesoCarbon}\n\\setbeamercolor{structure}{fg=cobreCarbon}\n\\setbeamercolor{alerted text}{fg=cobreCarbon}\n\\setbeamercolor{frametitle}{bg=fondoCarbon,fg=huesoCarbon}\n\\setbeamerfont{frametitle}{size=\\Large,series=\\mdseries}\n% El filete de cobre por encima del título es cosa de Erlen: Beamer solo sabe ponerlo debajo.' },
  ciruela:    { name: 'Ciruela', desc: 'Vino oscuro con un jade vivo · para la charla que quieres que se recuerde', acc: '#52D6A6', bg: '#261629', fg: '#F2E8F0', ft: '#1B0F1E', ftfg: '#F2E8F0', mut: '#BCA9C0', pieBg: '#1B0F1E', pieFg: '#F2E8F0', foot: 'page', dark: true,
    tex: '\\usetheme{metropolis}\n% El fondo de vino no existe en el catálogo de Beamer: se define entero.\n% Metropolis usa la letra Fira, así que compila con XeLaTeX o LuaLaTeX.\n% En pantalla el cuerpo va en Source Sans; la Fira del PDF es lo más parecido de fábrica.\n\\definecolor{fondoCiruela}{HTML}{261629}\n\\definecolor{bandaCiruela}{HTML}{1B0F1E}\n\\definecolor{textoCiruela}{HTML}{F2E8F0}\n\\definecolor{jadeCiruela}{HTML}{52D6A6}\n\\setbeamercolor{background canvas}{bg=fondoCiruela}\n\\setbeamercolor{normal text}{fg=textoCiruela}\n\\setbeamercolor{structure}{fg=jadeCiruela}\n\\setbeamercolor{alerted text}{fg=jadeCiruela}\n\\setbeamercolor{frametitle}{bg=bandaCiruela,fg=textoCiruela}\n\\setbeamercolor{itemize item}{fg=jadeCiruela}\n\\setbeamercolor{itemize subitem}{fg=jadeCiruela}\n% El canto de jade del borde izquierdo no tiene equivalente: lo más parecido de\n% fábrica es \\usetheme{Berkeley}, que planta una barra lateral entera.' }
};

/* Tema efectivo: el del catálogo con el color de acento del usuario aplicado
   donde ese color manda (la barra de Madrid, el título de Cambridge, el pie).
   Todo lo que pinta —diapositivas, gráficas, SmartArt y el .tex— pasa por aquí. */
function temaDe(deck) {
  const m = (deck && deck.meta) || {};
  const base = THEMES[m.theme] || THEMES.metropolis;
  const a = m.acento;
  if (!a || String(a).toUpperCase() === base.acc.toUpperCase()) return base;
  const t = Object.assign({}, base);
  t.acc = a;
  if (base.ft === base.acc) { t.ft = a; t.ftfg = tintaSobre(a); }
  if (base.ftfg === base.acc) t.ftfg = a;
  if (base.pieBg === base.acc) { t.pieBg = a; t.pieFg = tintaSobre(a); }
  return t;
}
/* Variables de color que hay que poner en la diapositiva cuando el acento
   no es el del tema. */
function varsAcento(deck) {
  const m = (deck && deck.meta) || {};
  const base = THEMES[m.theme] || THEMES.metropolis;
  const a = m.acento;
  const v = {};
  if (!a || String(a).toUpperCase() === base.acc.toUpperCase()) return v;
  const tinta = tintaSobre(a);
  v['--sacc'] = a;
  v['--sacc-ink'] = tinta;
  if (base.pieBg === base.acc) { v['--spie-bg'] = a; v['--spie-fg'] = tinta; }
  if (m.theme === 'madrid') {
    v['--sft-bg'] = a; v['--sft-fg'] = tinta;
    v['--sfl1'] = mezcla(a, '#000000', 0.32);
    v['--sfl2'] = a;
    v['--sfl3'] = mezcla(a, '#FFFFFF', 0.42);
  } else if (m.theme === 'cambridge') {
    v['--sft-fg'] = a;
    v['--sfl2'] = a;
  }
  return v;
}
/* Colores sugeridos: los de los temas más los de uso universitario habitual. */
const ACENTOS = [
  ['#EB811B', 'Naranja Metropolis'], ['#3333B3', 'Azul Madrid'], ['#87201F', 'Granate Cambridge'],
  ['#1E3A6E', 'Azul marino'], ['#0B6E4F', 'Verde bosque'], ['#00668C', 'Azul petróleo'],
  ['#6A1B4D', 'Vino'], ['#B45309', 'Ámbar'], ['#334155', 'Grafito'], ['#7C3AED', 'Violeta']
];

/* ================= tipografías =================
   Las cinco primeras son las que usa LaTeX de verdad (Latin Modern y TeX Gyre,
   licencia GUST) y viajan dentro de la app recortadas, así que lo que se ve en
   pantalla es la misma letra del PDF. Las otras vienen de Google Fonts.
   tex   = paquetes cuando las matemáticas también deben cambiar de familia
   texTxt= variante que solo cambia el texto y deja las matemáticas en Computer
           Modern, que es lo que se ve en pantalla (KaTeX siempre usa CM). */
const FUENTES = [
  { id: 'auto', n: 'La del tema', grp: 'auto', k: 1, lh: null,
    d: 'Cada tema trae la suya: Fira Sans en Metropolis y Nocturno, STIX Two en Sobrio, la de fábrica de Beamer en los demás.' },

  { id: 'lm', n: 'Latin Modern', grp: 'serif', propia: true, k: 1.07, lh: 1.40,
    esp: 'La de fábrica de LaTeX',
    d: 'Computer Modern, la letra con la que Knuth compuso TeX. Es la que reconoces en cualquier artículo hecho en LaTeX sin tocar la tipografía.',
    tex: ['\\usefonttheme{serif}', '\\IfFileExists{lmodern.sty}{\\usepackage{lmodern}}{}'] },
  { id: 'termes', n: 'Times · Termes', grp: 'serif', propia: true, k: 1.07, lh: 1.38,
    esp: 'La que piden las revistas',
    d: 'TeX Gyre Termes, el clon libre de Times. Es la tipografía que exigen la mayoría de las revistas científicas en sus plantillas.',
    tex: ['\\usefonttheme{serif}', '\\usepackage{mathptmx}'],
    texTxt: ['\\usefonttheme{serif}', '\\IfFileExists{tgtermes.sty}{\\usepackage{tgtermes}}{\\usepackage{times}}'] },
  { id: 'pagella', n: 'Palatino · Pagella', grp: 'serif', propia: true, k: 1.0, lh: 1.44,
    esp: 'Para tesis y libros',
    d: 'TeX Gyre Pagella, el clon libre de Palatino. Letra ancha y de buen color en la página: la favorita para tesis y libros de texto.',
    tex: ['\\usefonttheme{serif}', '\\usepackage{mathpazo}'],
    texTxt: ['\\usefonttheme{serif}', '\\IfFileExists{tgpagella.sty}{\\usepackage{tgpagella}}{\\usepackage{palatino}}'] },
  { id: 'schola', n: 'New Century Schoolbook', grp: 'serif', propia: true, k: 0.99, lh: 1.44,
    esp: 'Muy legible de lejos',
    d: 'TeX Gyre Schola, el clon libre de New Century Schoolbook: trazos gruesos y letras abiertas. Es la de Physical Review y la de muchos libros de texto.',
    tex: ['\\usefonttheme{serif}', '\\usepackage{newcent}'] },
  { id: 'stix', n: 'STIX Two', grp: 'serif', k: 1.0, lh: 1.46,
    esp: 'Diseñada para ciencia',
    d: 'Hecha por AIP, APS, ACS, IEEE y Elsevier justo para publicación científica: cubre todos los símbolos matemáticos y químicos.',
    tex: ['\\usefonttheme{serif}', '\\IfFileExists{stix2.sty}{\\usepackage{stix2}}{\\usepackage{mathptmx}}'] },

  { id: 'lmsans', n: 'Latin Modern Sans', grp: 'sans', propia: true, k: 1.05, lh: 1.42,
    esp: 'La de LaTeX, sin remates',
    d: 'La versión de palo seco de la familia de LaTeX. Neutra y sin adornos, hace juego con las ecuaciones sin competir con ellas.',
    tex: ['\\IfFileExists{lmodern.sty}{\\usepackage{lmodern}}{}', '\\renewcommand{\\familydefault}{\\sfdefault}'] },
  { id: 'heros', n: 'Helvetica · Heros', grp: 'sans', propia: true, k: 1.0, lh: 1.42,
    esp: 'La de las figuras',
    d: 'TeX Gyre Heros, el clon libre de Helvetica. Es la que Elsevier y ACS piden para los rótulos de las figuras, así que las gráficas y la diapositiva se ven de la misma familia.',
    tex: ['\\usepackage{helvet}', '\\renewcommand{\\familydefault}{\\sfdefault}'] },
  { id: 'fira', n: 'Fira Sans', grp: 'sans', k: 1.0, lh: 1.42,
    esp: 'La de los congresos',
    d: 'La tipografía del tema Metropolis, la más vista en presentaciones de congreso de los últimos años.',
    tex: ['\\IfFileExists{FiraSans.sty}{\\usepackage[sfdefault]{FiraSans}}{\\usepackage{helvet}\\renewcommand{\\familydefault}{\\sfdefault}}'] },
  { id: 'source', n: 'Source Sans 3', grp: 'sans', k: 1.0, lh: 1.44,
    esp: 'Números muy claros',
    d: 'La de PLOS y eLife. Distingue bien el uno del ele y el cero de la o, que es justo lo que se agradece en una tabla de datos.',
    tex: ['\\IfFileExists{sourcesanspro.sty}{\\usepackage[default]{sourcesanspro}}{\\usepackage{helvet}\\renewcommand{\\familydefault}{\\sfdefault}}'] }
];
const FU = {}; FUENTES.forEach(f => FU[f.id] = f);
const GRUPO_FUENTE = { serif: 'Con remates · para leer y para tesis', sans: 'De palo seco · para proyectar' };
const fuenteDe = m => FU[m && m.fuente] ? FU[m.fuente] : FU.auto;

/* z = número de zonas donde se pueden soltar bloques */
const LAYOUTS = [
  { id: 'title',      name: 'Portada',        z: 0, grp: 'Estructura', d: 'Título, autores e institución.' },
  { id: 'section',    name: 'Sección',        z: 0, grp: 'Estructura', d: 'Separador entre partes de la charla.' },
  { id: 'toc',        name: 'Índice',         z: 0, grp: 'Estructura', d: 'Se llena solo con tus secciones.' },
  { id: 'content',    name: 'Contenido',      z: 1, grp: 'Una columna', d: 'La de siempre: los bloques van uno debajo de otro.' },
  { id: 'flujo',      name: 'Texto fluido',   z: 1, grp: 'Una columna', d: 'El texto llena la diapositiva en dos o tres columnas, como un artículo. Ideal cuando hay mucho que decir.' },
  { id: 'enunciado',  name: 'Enunciado',      z: 1, grp: 'Una columna', d: 'Una idea grande, centrada y con aire. Para conclusiones y transiciones.' },
  { id: 'ancho',      name: 'A todo lo ancho', z: 1, grp: 'Una columna', d: 'Márgenes mínimos: la figura o la tabla ocupan casi toda la diapositiva.' },
  { id: 'twocol',     name: 'Dos columnas',   z: 2, grp: 'Varias columnas', d: 'Texto a un lado, figura al otro. La anchura es ajustable.' },
  { id: 'barra',      name: 'Barra lateral',  z: 2, grp: 'Varias columnas', d: 'Una franja estrecha con datos clave y el contenido principal al lado.' },
  { id: 'comparacion',name: 'Comparación',    z: 2, grp: 'Varias columnas', d: 'Dos bloques con su propio encabezado de color: antes y después, A contra B.' },
  { id: 'tres',       name: 'Tres columnas',  z: 3, grp: 'Varias columnas', d: 'Tres ideas en paralelo, cada una con su espacio.' },
  { id: 'pasos',      name: 'Pasos',          z: 3, grp: 'Varias columnas', d: 'Tres etapas numeradas de izquierda a derecha: una metodología de un vistazo.' },
  { id: 'cuadricula', name: 'Cuadrícula 2×2', z: 4, grp: 'Varias columnas', d: 'Cuatro celdas con título: técnicas, resultados o cuadrantes.' },
  { id: 'rejilla6',   name: 'Cuadrícula 3×2', z: 6, grp: 'Varias columnas', d: 'Seis celdas rotuladas: una por técnica, por muestra o por condición.' },
  { id: 'filas',      name: 'Tres filas',     z: 3, grp: 'Varias columnas', d: 'Tres bandas horizontales con su rótulo a la izquierda. La secuencia se lee de arriba abajo.' },
  { id: 'partida',    name: 'Pantalla partida', z: 2, grp: 'Varias columnas', d: 'Dos mitades a sangre, sin marcos ni márgenes: antes y después, o dos muestras enfrentadas.' },
  { id: 'sangre',     name: 'Figura a sangre', z: 1, grp: 'La figura manda', d: 'La figura llena la diapositiva y el texto va encima, en una banda legible.' },
  { id: 'piefigura',  name: 'Figura con pie ancho', z: 2, grp: 'La figura manda', d: 'La figura ocupa casi todo y el pie va al lado, en una columna estrecha con aire.' },
  { id: 'zigzag',     name: 'Zigzag',         z: 4, grp: 'La figura manda', d: 'Dos filas alternadas: figura y texto, luego texto y figura. Para encadenar dos resultados.' },
  { id: 'dato',       name: 'Dato grande',    z: 1, grp: 'Una idea', d: 'Una cifra enorme con su rótulo. Para el número que quieres que se lleven.' },
  { id: 'cita',       name: 'Cita destacada', z: 1, grp: 'Una idea', d: 'Una cita del artículo o del comité, con su autor. Deja respirar la diapositiva.' }
];
const LAY = {}; LAYOUTS.forEach(l => LAY[l.id] = l);
const zonasDe = lay => (LAY[lay] ? LAY[lay].z : 1);
const CLAVES_ZONA = ['blocks', 'blocks2', 'blocks3', 'blocks4', 'blocks5', 'blocks6'];
/* Nombres por defecto de los encabezados de zona */
const ZT_DEF = {
  comparacion: ['Antes', 'Después'],
  partida: ['Antes', 'Después'],
  filas: ['Síntesis', 'Caracterización', 'Aplicación'],
  rejilla6: ['DRX', 'FTIR', 'SEM', 'UV-Vis', 'TGA', 'Raman'],
  dato: ['26 %', 'de eficiencia certificada'],
  cita: ['Kojima et al., J. Am. Chem. Soc., 2009'],
  cuadricula: ['Primero', 'Segundo', 'Tercero', 'Cuarto'],
  pasos: ['Síntesis', 'Caracterización', 'Análisis'],
  barra: ['Datos clave', '']
};

/* Una columna de una tabla es numérica si todas sus celdas con contenido lo
   son. Esas se alinean a la derecha: es como se leen las cifras y como se
   comparan de una fila a otra. Acepta el menos tipográfico, la coma decimal,
   los miles y la notación científica. */
const ES_NUMERO_CELDA = /^[+\-\u2212\u00B1]?\s*\d{1,3}(?:[ .]\d{3})*(?:[.,]\d+)?(?:\s*[\u00D7x]\s*10\^?[+\-\u2212]?\d+|[eE][+-]?\d+)?\s*%?$/;
function columnasNumericas(rows, conCabecera) {
  const filas = Array.isArray(rows) ? rows : [];
  const cuerpo = filas.slice(conCabecera ? 1 : 0);
  const n = filas.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
  const out = [];
  for (let c = 0; c < n; c++) {
    let hay = false, todas = true;
    for (const r of cuerpo) {
      const v = String((r || [])[c] == null ? '' : (r || [])[c]).trim();
      if (!v) continue;
      hay = true;
      if (!ES_NUMERO_CELDA.test(v)) { todas = false; break; }
    }
    out.push(hay && todas);
  }
  return out;
}

const BLOCK_DEFS = [
  { id: 'text',    name: 'Texto',        ic: 'T',  grp: 'base' },
  { id: 'bullets', name: 'Viñetas',      ic: '≔',  grp: 'base' },
  { id: 'math',    name: 'Ecuación',     ic: '∑',  grp: 'base' },
  { id: 'chem',    name: 'Reacción',     ic: '⇌',  grp: 'base' },
  { id: 'image',   name: 'Figura',       ic: '▣',  grp: 'base' },
  { id: 'galeria', name: 'Galería de figuras', ic: '▤', grp: 'base' },
  { id: 'refs',    name: 'Referencias',   ic: '❝',  grp: 'base' },
  { id: 'table',   name: 'Tabla',        ic: '⊞',  grp: 'base' },
  { id: 'bblock',  name: 'Caja Beamer',  ic: '❑',  grp: 'base' },
  { id: 'quote',   name: 'Cita',         ic: '“',  grp: 'base' },
  { id: 'code',    name: 'Código',       ic: '</>',grp: 'base' },
  { id: 'spacer',  name: 'Espacio',      ic: '↕',  grp: 'base' },
  { id: 'chart',   name: 'Gráfica de datos', ic: '∿', grp: 'viva' },
  { id: 'func',    name: 'Gráfica dinámica', ic: '𝑓', grp: 'viva' },
  { id: 'video',   name: 'Video o GIF',      ic: '▶', grp: 'viva' },
  { id: 'smart',   name: 'Diagrama SmartArt', ic: '◈', grp: 'viva' },
  { id: 'estruct', name: 'Estructura química',  ic: '⬡', grp: 'quim' },
  { id: 'montaje', name: 'Montaje experimental', ic: '⚗', grp: 'quim' },
  { id: 'teorema', name: 'Teorema y demostración', ic: '∴', grp: 'mate' },
  { id: 'geo',     name: 'Figura geométrica',      ic: '△', grp: 'mate' }
];

/* ---------- efectos de entrada para cualquier bloque ----------
   Solo actúan al presentar y sobre los bloques que aparecen por pasos. Todos
   respetan «reducir movimiento» del sistema: si está puesto, el bloque
   simplemente aparece. En el PDF el paso se conserva (\onslide), pero el
   movimiento no: un PDF no anima, y decirlo es más honesto que fingirlo. */
const ANIMS = [
  { id: 'none',    name: 'Sin efecto',   d: 'Aparece de golpe.', grp: 'Discretos' },
  { id: 'fade',    name: 'Aparecer',     d: 'Se funde en su sitio. El más seguro en cualquier proyector.', grp: 'Discretos' },
  { id: 'surgir',  name: 'Surgir',       d: 'Entra desenfocado y se asienta. Muy suave.', grp: 'Discretos' },
  { id: 'up',      name: 'Subir',        d: 'Sube unos milímetros al aparecer.', grp: 'Movimiento' },
  { id: 'down',    name: 'Bajar',        d: 'Baja al entrar; va bien para una conclusión.', grp: 'Movimiento' },
  { id: 'left',    name: 'Desde la izquierda', d: 'Entra corrido desde el margen izquierdo.', grp: 'Movimiento' },
  { id: 'right',   name: 'Desde la derecha',   d: 'Entra corrido desde el margen derecho.', grp: 'Movimiento' },
  { id: 'zoom',    name: 'Acercar',      d: 'Crece hasta su tamaño.', grp: 'Movimiento' },
  { id: 'alejar',  name: 'Alejar',       d: 'Entra un poco grande y se asienta.', grp: 'Movimiento' },
  { id: 'rebote',  name: 'Rebote',       d: 'Sube y se pasa un poco antes de asentarse.', grp: 'Movimiento' },
  { id: 'barrido', name: 'Barrido',      d: 'Se descubre de izquierda a derecha, como al pasar la mano.', grp: 'Revelado' },
  { id: 'cortina', name: 'Cortina',      d: 'Se descubre de arriba abajo.', grp: 'Revelado' },
  { id: 'voltear', name: 'Voltear',      d: 'Gira sobre su eje horizontal al entrar.', grp: 'Revelado' },
  { id: 'destacar', name: 'Destacar',    d: 'Aparece y da un pulso con el color de acento, para el dato que no quieres que se pierda.', grp: 'Revelado' },
  { id: 'draw',    name: 'Dibujar trazo', d: 'La línea de la gráfica se dibuja sola. Solo tiene efecto en gráficas y diagramas.', grp: 'Revelado' }
];
const AK_ANIM = {}; ANIMS.forEach(a => AK_ANIM[a.id] = a);
/* Velocidad del efecto: la misma idea que la de PowerPoint. */
const ANIM_VEL = [
  { id: 'rapida', n: 'Rápida', ms: 220 },
  { id: 'normal', n: 'Normal', ms: 360 },
  { id: 'lenta',  n: 'Lenta',  ms: 640 }
];
const animMs = b => (ANIM_VEL.find(v => v.id === (b && b.animVel)) || ANIM_VEL[1]).ms;

/* modelos listos para la gráfica dinámica */
const FUNC_MODELS = [
  { n: 'Arrhenius', d: 'Constante de velocidad contra temperatura',
    curves: [{ expr: 'A*exp(-Ea*1000/(R*x))', name: 'k(T)' }],
    params: [{ name: 'A', value: 1e10, min: 1e8, max: 1e12, step: 1e8 },
             { name: 'Ea', value: 60, min: 10, max: 150, step: 1 }],
    xmin: 280, xmax: 500, xlabel: 'Temperatura $T$ (K)', ylabel: '$k$ (s$^{-1}$)', title: '' },
  { n: 'Decaimiento de 1.er orden', d: 'Concentración contra tiempo',
    curves: [{ expr: 'C0*exp(-k*x)', name: '[A]' }],
    params: [{ name: 'C0', value: 1, min: 0.1, max: 2, step: 0.05 },
             { name: 'k', value: 0.25, min: 0.01, max: 1, step: 0.01 }],
    xmin: 0, xmax: 20, xlabel: 'Tiempo (min)', ylabel: '$[A]$ (mol L$^{-1}$)', title: '' },
  { n: 'Pico gaussiano (FWHM)', d: 'Ancho de una reflexión o banda',
    curves: [{ expr: 'I*gauss(x, x0, w/2.3548)', name: 'Perfil' }],
    params: [{ name: 'I', value: 100, min: 10, max: 200, step: 5 },
             { name: 'x0', value: 11.6, min: 8, max: 16, step: 0.1 },
             { name: 'w', value: 0.6, min: 0.05, max: 3, step: 0.05 }],
    xmin: 8, xmax: 16, xlabel: '$2\\theta$ (grados)', ylabel: 'Intensidad (u. a.)', title: '' },
  { n: 'Gaussiana vs. Lorentziana', d: 'Comparar perfiles de línea',
    curves: [{ expr: 'gauss(x, 0, w)', name: 'Gaussiana' }, { expr: 'lorentz(x, 0, w)', name: 'Lorentziana' }],
    params: [{ name: 'w', value: 1, min: 0.2, max: 3, step: 0.1 }],
    xmin: -6, xmax: 6, xlabel: 'Desplazamiento', ylabel: 'Intensidad normalizada', title: '' },
  { n: 'Beer–Lambert', d: 'Absorbancia contra concentración',
    curves: [{ expr: 'eps*l*x', name: 'A' }],
    params: [{ name: 'eps', value: 1200, min: 100, max: 3000, step: 50 },
             { name: 'l', value: 1, min: 0.1, max: 5, step: 0.1 }],
    xmin: 0, xmax: 0.001, xlabel: 'Concentración (mol L$^{-1}$)', ylabel: 'Absorbancia', title: '' },
  { n: 'Isoterma de Langmuir', d: 'Adsorción en función de la concentración',
    curves: [{ expr: 'qm*KL*x/(1+KL*x)', name: 'Langmuir' }],
    params: [{ name: 'qm', value: 120, min: 10, max: 300, step: 5 },
             { name: 'KL', value: 0.05, min: 0.005, max: 0.5, step: 0.005 }],
    xmin: 0, xmax: 200, xlabel: 'Concentración en equilibrio (mg L$^{-1}$)', ylabel: '$q_e$ (mg g$^{-1}$)', title: '' },
  { n: 'Scherrer', d: 'Ancho del pico contra tamaño de cristalita',
    curves: [{ expr: 'K*lam/(x*cos(theta*pi/180))*180/pi', name: 'FWHM' }],
    params: [{ name: 'K', value: 0.9, min: 0.8, max: 1.1, step: 0.01 },
             { name: 'lam', value: 0.15406, min: 0.05, max: 0.3, step: 0.001 },
             { name: 'theta', value: 5.8, min: 2, max: 40, step: 0.2 }],
    xmin: 5, xmax: 100, xlabel: 'Tamaño de cristalita $D$ (nm)', ylabel: 'FWHM (grados)', title: '' },
  { n: 'Fermi–Dirac', d: 'Ocupación electrónica contra energía',
    curves: [{ expr: '1/(exp((x-EF)/(kB*T/eV))+1)', name: 'f(E)' }],
    params: [{ name: 'EF', value: 0, min: -1, max: 1, step: 0.05 },
             { name: 'T', value: 300, min: 10, max: 2000, step: 10 }],
    xmin: -0.5, xmax: 0.5, xlabel: 'Energía $E$ (eV)', ylabel: 'Ocupación', title: '' },
  { n: 'Onda / superposición', d: 'Dos ondas que se suman',
    curves: [{ expr: 'sin(k*x)', name: 'Onda 1' }, { expr: 'sin(k*x + d)', name: 'Onda 2' }, { expr: 'sin(k*x) + sin(k*x + d)', name: 'Suma' }],
    params: [{ name: 'k', value: 1, min: 0.2, max: 4, step: 0.1 },
             { name: 'd', value: 1.57, min: 0, max: 6.28, step: 0.05 }],
    xmin: 0, xmax: 12, xlabel: 'Posición', ylabel: 'Amplitud', title: '' }
];

/* datos de ejemplo para la gráfica de datos */
const CHART_SAMPLES = [
  { n: 'Curva de calibración', kind: 'ajuste',
    xlabel: 'Concentración (mg L$^{-1}$)', ylabel: 'Absorbancia',
    data: 'C\tAbsorbancia\n0\t0.004\n2\t0.118\n4\t0.229\n6\t0.347\n8\t0.452\n10\t0.571' },
  { n: 'Dos espectros comparados', kind: 'linea', offset: true,
    xlabel: 'Número de onda (cm$^{-1}$)', ylabel: 'Transmitancia',
    data: 'cm-1\tMuestra\tReferencia\n4000\t98\t97\n3600\t62\t70\n3200\t55\t68\n2900\t88\t86\n2400\t95\t94\n1700\t74\t90\n1600\t68\t72\n1400\t71\t83\n1100\t45\t60\n900\t80\t78\n600\t58\t64' },
  { n: 'Comparación por barras', kind: 'barras',
    xlabel: 'Ensayo', ylabel: 'Rendimiento (%)',
    data: 'Ensayo\tRendimiento\n1\t62\n2\t71\n3\t85\n4\t78\n5\t91' },
  /* Una medida con su incertidumbre: la columna «±» no es una serie, es la
     barra de error de la anterior. */
  { n: 'Medidas con su error', kind: 'dispersion',
    xlabel: 'Tiempo (min)', ylabel: 'Conversión (%)',
    data: 't\tConversión\t±\n5\t18\t2.1\n10\t34\t2.6\n15\t51\t3.4\n20\t63\t3.1\n30\t74\t4.2\n45\t79\t3.8' },
  /* Primer orden: en eje logarítmico la caída exponencial es una recta, y el
     ajuste se hace sobre el logaritmo, que es lo que se ve. */
  { n: 'Cinética en eje logarítmico', kind: 'ajuste', logY: true,
    xlabel: 'Tiempo (min)', ylabel: 'Concentración (mmol L$^{-1}$)',
    data: 't\tc\n0\t100\n10\t61\n20\t37\n30\t22\n40\t14\n50\t8.2' }
];

/* ---------- plantillas de ecuaciones ---------- */
const EQT = [
  { id: 'bas', name: 'Básicas', items: [
    { n: 'Fracción', t: '\\dfrac{a}{b}' },
    { n: 'Raíz', t: '\\sqrt{x}' },
    { n: 'Raíz n-ésima', t: '\\sqrt[n]{x}' },
    { n: 'Potencia', t: 'x^{n}' },
    { n: 'Subíndice', t: 'x_{i}' },
    { n: 'Sub y súper', t: 'x_{i}^{2}' },
    { n: 'Suma', t: '\\sum_{i=1}^{n} x_i' },
    { n: 'Producto', t: '\\prod_{i=1}^{n} x_i' },
    { n: 'Límite', t: '\\lim_{x \\to \\infty} f(x)' },
    { n: 'Vector', t: '\\vec{v}' },
    { n: 'Promedio', t: '\\langle x \\rangle' },
    { n: 'Recta', t: 'y = mx + b' }
  ]},
  { id: 'cal', name: 'Cálculo', items: [
    { n: 'Derivada', t: '\\dfrac{dy}{dx}' },
    { n: 'Parcial', t: '\\dfrac{\\partial f}{\\partial x}' },
    { n: 'Integral', t: '\\int_{a}^{b} f(x)\\,dx' },
    { n: 'Integral doble', t: '\\iint_{S} f\\,dA' },
    { n: 'Gradiente', t: '\\nabla f' },
    { n: 'Laplaciano', t: '\\nabla^{2}\\psi' },
    { n: 'Dif. total', t: 'dG = -S\\,dT + V\\,dP' }
  ]},
  { id: 'mat', name: 'Matrices', items: [
    { n: 'Matriz 2×2', t: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { n: 'Matriz 3×3', t: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
    { n: 'Determinante', t: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    { n: 'Por casos', t: 'f(x) = \\begin{cases} x^{2} & x \\geq 0 \\\\ -x & x < 0 \\end{cases}' }
  ]},
  { id: 'mate', name: 'Matemáticas', items: [
    { n: 'Sistema de ecuaciones', t: '\\begin{cases} a_{11}x + a_{12}y = b_1 \\\\ a_{21}x + a_{22}y = b_2 \\end{cases}' },
    { n: 'Matriz n×m', t: '\\begin{bmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{m1} & \\cdots & a_{mn} \\end{bmatrix}' },
    { n: 'Binomio de Newton', t: '(x+y)^{n} = \\sum_{k=0}^{n} \\binom{n}{k} x^{k} y^{n-k}' },
    { n: 'Serie de Taylor', t: 'f(x) = \\sum_{n=0}^{\\infty} \\dfrac{f^{(n)}(a)}{n!}(x-a)^{n}' },
    { n: 'Definición de derivada', t: "f'(x) = \\lim_{h \\to 0} \\dfrac{f(x+h) - f(x)}{h}" },
    { n: 'Teorema fundamental', t: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)' },
    { n: 'Regla de la cadena', t: '\\dfrac{d}{dx}f(g(x)) = f\'(g(x))\\,g\'(x)' },
    { n: 'Límite con épsilon', t: '\\forall \\varepsilon > 0\; \\exists \\delta > 0 : |x-a| < \\delta \\Rightarrow |f(x)-L| < \\varepsilon' },
    { n: 'Identidad de Euler', t: 'e^{i\\pi} + 1 = 0' },
    { n: 'Fórmula cuadrática', t: 'x = \\dfrac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}' },
    { n: 'Producto punto', t: '\\vec{u}\\cdot\\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta' },
    { n: 'Producto cruz', t: '\\vec{u}\\times\\vec{v} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ u_1 & u_2 & u_3 \\\\ v_1 & v_2 & v_3 \\end{vmatrix}' },
    { n: 'Conjunto por comprensión', t: 'A = \\{\\, x \\in \\mathbb{R} : x^{2} < 4 \\,\\}' },
    { n: 'Probabilidad condicional', t: 'P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}' },
    { n: 'Bayes', t: 'P(A \\mid B) = \\dfrac{P(B \\mid A)\\,P(A)}{P(B)}' },
    { n: 'Normal', t: 'f(x) = \\dfrac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^{2}}{2\\sigma^{2}}}' }
  ]},
  { id: 'fis', name: 'Física', items: [
    { n: 'Segunda ley de Newton', t: '\\sum \\vec{F} = m\\vec{a}' },
    { n: 'Trabajo', t: 'W = \\int_{a}^{b} \\vec{F}\\cdot d\\vec{r}' },
    { n: 'Energía cinética', t: 'K = \\tfrac{1}{2}mv^{2}' },
    { n: 'Gravitación', t: 'F = G\\dfrac{m_1 m_2}{r^{2}}' },
    { n: 'MAS', t: 'x(t) = A\\cos(\\omega t + \\varphi)' },
    { n: 'Onda', t: 'y(x,t) = A\\sin(kx - \\omega t)' },
    { n: 'Ley de Ohm', t: 'V = IR' },
    { n: 'Ley de Coulomb', t: 'F = \\dfrac{1}{4\\pi\\varepsilon_0}\\dfrac{q_1 q_2}{r^{2}}' },
    { n: 'Gauss', t: '\\oint \\vec{E}\\cdot d\\vec{A} = \\dfrac{Q_{enc}}{\\varepsilon_0}' },
    { n: 'Faraday', t: '\\varepsilon = -\\dfrac{d\\Phi_B}{dt}' },
    { n: 'Maxwell (forma diferencial)', t: '\\nabla\\times\\vec{B} = \\mu_0\\vec{J} + \\mu_0\\varepsilon_0\\dfrac{\\partial\\vec{E}}{\\partial t}' },
    { n: 'Lorentz', t: '\\vec{F} = q(\\vec{E} + \\vec{v}\\times\\vec{B})' },
    { n: 'Relatividad', t: 'E = \\gamma m c^{2}, \\quad \\gamma = \\dfrac{1}{\\sqrt{1 - v^{2}/c^{2}}}' },
    { n: 'Incertidumbre', t: '\\Delta x\\,\\Delta p \\geq \\dfrac{\\hbar}{2}' },
    { n: 'Planck', t: 'E = h\\nu' },
    { n: 'Snell', t: 'n_1\\sin\\theta_1 = n_2\\sin\\theta_2' }
  ]},
  { id: 'bio', name: 'Biología', items: [
    { n: 'Hardy–Weinberg', t: 'p^{2} + 2pq + q^{2} = 1' },
    { n: 'Michaelis–Menten', t: 'v = \\dfrac{V_{max}[S]}{K_M + [S]}' },
    { n: 'Lineweaver–Burk', t: '\\dfrac{1}{v} = \\dfrac{K_M}{V_{max}}\\dfrac{1}{[S]} + \\dfrac{1}{V_{max}}' },
    { n: 'Crecimiento exponencial', t: 'N(t) = N_0 e^{rt}' },
    { n: 'Crecimiento logístico', t: '\\dfrac{dN}{dt} = rN\\left(1 - \\dfrac{N}{K}\\right)' },
    { n: 'Lotka–Volterra', t: '\\dfrac{dN}{dt} = rN - aNP, \\quad \\dfrac{dP}{dt} = baNP - mP' },
    { n: 'Índice de Shannon', t: "H' = -\\sum_{i=1}^{S} p_i \\ln p_i" },
    { n: 'Nernst (membrana)', t: 'E_{ion} = \\dfrac{RT}{zF}\\ln\\dfrac{[C]_{fuera}}{[C]_{dentro}}' },
    { n: 'Henderson–Hasselbalch', t: '\\mathrm{pH} = \\mathrm{p}K_a + \\log\\dfrac{[\\mathrm{A}^-]}{[\\mathrm{HA}]}' },
    { n: 'Fotosíntesis', t: '6\\,\\mathrm{CO_2} + 6\\,\\mathrm{H_2O} \\xrightarrow{\\ h\\nu\\ } \\mathrm{C_6H_{12}O_6} + 6\\,\\mathrm{O_2}' },
    { n: 'Tasa de mutación', t: '\\mu = \\dfrac{m}{N \\cdot g}' }
  ]},
  { id: 'ter', name: 'Termodinámica', items: [
    { n: 'Energía de Gibbs', t: '\\Delta G = \\Delta H - T\\Delta S' },
    { n: 'Gibbs y equilibrio', t: '\\Delta G^{\\circ} = -RT\\ln K' },
    { n: 'Constante K', t: 'K = e^{-\\Delta G^{\\circ}/RT}' },
    { n: "van 't Hoff", t: '\\ln\\dfrac{K_2}{K_1} = -\\dfrac{\\Delta H^{\\circ}}{R}\\left(\\dfrac{1}{T_2} - \\dfrac{1}{T_1}\\right)' },
    { n: 'Clausius–Clapeyron', t: '\\dfrac{dP}{dT} = \\dfrac{\\Delta H_{vap}}{T\\,\\Delta V}' },
    { n: 'Potencial químico', t: '\\mu = \\mu^{\\circ} + RT\\ln a' }
  ]},
  { id: 'cin', name: 'Cinética', items: [
    { n: 'Ley de velocidad', t: 'v = k[\\mathrm{A}]^{m}[\\mathrm{B}]^{n}' },
    { n: 'Arrhenius', t: 'k = A\\,e^{-E_a/RT}' },
    { n: 'Arrhenius lineal', t: '\\ln k = \\ln A - \\dfrac{E_a}{R}\\cdot\\dfrac{1}{T}' },
    { n: 'Vida media (1er orden)', t: 't_{1/2} = \\dfrac{\\ln 2}{k}' },
    { n: 'Eyring', t: 'k = \\dfrac{k_B T}{h}\\,e^{-\\Delta G^{\\ddagger}/RT}' }
  ]},
  { id: 'cri', name: 'Cristalografía', items: [
    { n: 'Ley de Bragg', t: 'n\\lambda = 2d\\sin\\theta' },
    { n: 'Scherrer', t: '\\tau = \\dfrac{K\\lambda}{\\beta\\cos\\theta}' },
    { n: 'Williamson–Hall', t: '\\beta\\cos\\theta = \\dfrac{K\\lambda}{D} + 4\\varepsilon\\sin\\theta' },
    { n: 'd (sistema cúbico)', t: '\\dfrac{1}{d^{2}} = \\dfrac{h^{2}+k^{2}+l^{2}}{a^{2}}' },
    { n: 'Densidad teórica', t: '\\rho = \\dfrac{ZM}{N_A\\,V}' }
  ]},
  { id: 'esp', name: 'Espectroscopía', items: [
    { n: 'Beer–Lambert', t: 'A = \\varepsilon\\,\\ell\\,c' },
    { n: 'Tauc', t: '(\\alpha h\\nu)^{1/n} = B\\,(h\\nu - E_g)' },
    { n: 'Kubelka–Munk', t: 'F(R) = \\dfrac{(1-R)^{2}}{2R}' },
    { n: 'Energía de fotón', t: 'E = h\\nu = \\dfrac{hc}{\\lambda}' },
    { n: 'Número de onda', t: '\\tilde{\\nu} = \\dfrac{1}{\\lambda}' }
  ]},
  { id: 'ele', name: 'Electroquímica', items: [
    { n: 'Nernst', t: 'E = E^{\\circ} - \\dfrac{RT}{nF}\\ln Q' },
    { n: 'Gibbs y potencial', t: '\\Delta G^{\\circ} = -nFE^{\\circ}' },
    { n: 'Faraday', t: 'm = \\dfrac{Q\\,M}{n\\,F}' },
    { n: 'Randles–Ševčík', t: 'i_p = 2.69\\times10^{5}\\,n^{3/2}A\\,D^{1/2}C\\,v^{1/2}' }
  ]},
  { id: 'cua', name: 'Cuántica y sólidos', items: [
    { n: 'Schrödinger', t: '\\hat{H}\\psi = E\\psi' },
    { n: 'Caja de potencial', t: 'E_n = \\dfrac{n^{2}h^{2}}{8mL^{2}}' },
    { n: 'De Broglie', t: '\\lambda = \\dfrac{h}{mv}' },
    { n: 'Fermi–Dirac', t: 'f(E) = \\dfrac{1}{e^{(E - E_F)/k_B T} + 1}' }
  ]},
  { id: 'est', name: 'Estadística y DoE', items: [
    { n: 'Media', t: '\\bar{x} = \\dfrac{1}{n}\\sum_{i=1}^{n} x_i' },
    { n: 'Desviación estándar', t: 's = \\sqrt{\\dfrac{\\sum (x_i - \\bar{x})^{2}}{n-1}}' },
    { n: 'Regresión', t: '\\hat{y} = b_0 + b_1 x' },
    { n: 'S/N menor-mejor', t: '\\mathrm{S/N} = -10\\log\\!\\left(\\dfrac{1}{n}\\sum y_i^{2}\\right)' },
    { n: 'S/N mayor-mejor', t: '\\mathrm{S/N} = -10\\log\\!\\left(\\dfrac{1}{n}\\sum \\dfrac{1}{y_i^{2}}\\right)' },
    { n: 'S/N nominal', t: '\\mathrm{S/N} = 10\\log\\!\\left(\\dfrac{\\bar{y}^{2}}{s^{2}}\\right)' }
  ]}
];

/* símbolos para insertar en el código */
const SYMS = [
  { name: 'Griegas', items: 'alpha beta gamma delta epsilon zeta eta theta kappa lambda mu nu xi pi rho sigma tau phi chi psi omega'.split(' ').map(g => ({ d: '\\' + g, t: '\\' + g }))
      .concat('Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega'.split(' ').map(g => ({ d: '\\' + g, t: '\\' + g }))) },
  { name: 'Operadores', items: [
    { d: '\\pm', t: '\\pm' }, { d: '\\times', t: '\\times' }, { d: '\\cdot', t: '\\cdot' }, { d: '\\div', t: '\\div' },
    { d: '\\approx', t: '\\approx' }, { d: '\\neq', t: '\\neq' }, { d: '\\equiv', t: '\\equiv' }, { d: '\\leq', t: '\\leq' },
    { d: '\\geq', t: '\\geq' }, { d: '\\propto', t: '\\propto' }, { d: '\\infty', t: '\\infty' }, { d: '\\partial', t: '\\partial' },
    { d: '\\nabla', t: '\\nabla' }, { d: '{}^{\\circ}', t: '^{\\circ}' }, { d: '{}^{\\circ}\\mathrm{C}', t: '^{\\circ}\\mathrm{C}' }, { d: '\\text{\\AA}', t: '\\text{\\AA}' }
  ]},
  { name: 'Flechas', items: [
    { d: '\\to', t: '\\to' }, { d: '\\leftarrow', t: '\\leftarrow' }, { d: '\\leftrightarrow', t: '\\leftrightarrow' },
    { d: '\\Rightarrow', t: '\\Rightarrow' }, { d: '\\rightleftharpoons', t: '\\rightleftharpoons' },
    { d: '\\uparrow', t: '\\uparrow' }, { d: '\\downarrow', t: '\\downarrow' }
  ]},
  { name: 'Decoraciones', items: [
    { d: '\\bar{x}', t: '\\bar{x}' }, { d: '\\hat{x}', t: '\\hat{x}' }, { d: '\\dot{x}', t: '\\dot{x}' },
    { d: '\\tilde{x}', t: '\\tilde{x}' }, { d: "x'", t: "x'" }, { d: 'x^{\\ast}', t: 'x^{\\ast}' },
    { d: '\\mathrm{abc}', t: '\\mathrm{}' }, { d: '\\text{ab}', t: '\\text{}' }
  ]}
];

/* plantillas de química (contenido de \ce{...}) */
const CHEMT = [
  { n: 'Síntesis sol-gel', t: 'Ti(OC3H7)4 + 2 H2O -> TiO2 v + 4 C3H7OH' },
  { n: 'Precipitación', t: 'AgNO3(aq) + NaCl(aq) -> AgCl v + NaNO3(aq)' },
  { n: 'Equilibrio', t: 'N2(g) + 3 H2(g) <=> 2 NH3(g)' },
  { n: 'Ácido–base', t: 'HCl + NaOH -> NaCl + H2O' },
  { n: 'Combustión', t: 'CH4 + 2 O2 -> CO2 + 2 H2O' },
  { n: 'Descomposición térmica', t: 'CaCO3(s) ->[\\Delta] CaO(s) + CO2 ^' },
  { n: 'Par redox', t: 'Fe^3+ + e- -> Fe^2+' },
  { n: 'Disolución iónica', t: 'NaCl ->[\\text{H2O}] Na+ + Cl-' },
  { n: 'Hidrato', t: 'CuSO4 * 5 H2O' },
  { n: 'Isótopo', t: '^{235}_{92}U' },
  { n: 'Hidróxido metálico', t: 'M^2+ + 2 OH- -> M(OH)2 v' }
];
const CHEM_KEYS = [
  { l: '→', t: ' -> ' }, { l: '⇌', t: ' <=> ' }, { l: 'Δ sobre flecha', t: ' ->[\\Delta] ' },
  { l: 'texto sobre flecha', t: ' ->[\\text{}] ', off: 10 }, { l: '↑ gas', t: ' ^' }, { l: '↓ precipita', t: ' v' },
  { l: '(s)', t: '(s)' }, { l: '(l)', t: '(l)' }, { l: '(g)', t: '(g)' }, { l: '(aq)', t: '(aq)' },
  { l: 'carga +', t: '^2+' }, { l: 'carga −', t: '^-' }, { l: '·hidrato', t: ' * 5 H2O' }
];

/* ---------- figura de ejemplo (SVG) ---------- */
function perovskiteSVG() {
  const B = '#3A4A54', X = '#EB811B', A = '#5B6EE0';
  const f = [[70, 90], [250, 90], [250, 270], [70, 270]];          // cara frontal
  const dx = 60, dy = -42;
  const b = f.map(p => [p[0] + dx, p[1] + dy]);                    // cara trasera
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" font-family="sans-serif">';
  const line = (p, q, o) => '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="#7C8894" stroke-width="2.5"' + (o ? ' stroke-dasharray="5 5" opacity=".6"' : '') + '/>';
  s += line(b[0], b[1], 1) + line(b[1], b[2], 1) + line(b[2], b[3], 1) + line(b[3], b[0], 1);
  for (let i = 0; i < 4; i++) s += line(f[i], b[i], i === 3 || i === 0 ? 1 : 0);
  s += line(f[0], f[1]) + line(f[1], f[2]) + line(f[2], f[3]) + line(f[3], f[0]);
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const circ = (p, r, c, st) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + c + '"' + (st ? ' opacity=".55"' : '') + '/>';
  for (let i = 0; i < 4; i++) s += circ(mid(b[i], b[(i + 1) % 4]), 7, X, 1) + circ(mid(f[i], b[i]), 8, X, i === 0 || i === 3 ? 1 : 0);
  const ctr = [(f[0][0] + f[2][0]) / 2 + dx / 2, (f[0][1] + f[2][1]) / 2 + dy / 2];
  s += circ(ctr, 26, A);
  for (const p of b) s += circ(p, 11, B, 1);
  for (let i = 0; i < 4; i++) s += circ(mid(f[i], f[(i + 1) % 4]), 9, X);
  for (const p of f) s += circ(p, 13, B);
  s += '<g font-size="15" fill="#455060">' +
    '<circle cx="330" cy="82" r="9" fill="' + A + '"/><text x="346" y="87">A</text>' +
    '<circle cx="330" cy="112" r="8" fill="' + B + '"/><text x="346" y="117">B</text>' +
    '<circle cx="330" cy="142" r="7" fill="' + X + '"/><text x="346" y="147">X</text></g></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
}

/* ---------- baraja de ejemplo ---------- */
function demoDeck() { return EJEMPLOS[0].build(); }

function blankDeck() {
  return {
    v: 1,
    meta: { title: 'Presentación sin título', short: '', subtitle: '', authors: '', institute: '', date: '', theme: 'metropolis', aspect: '169', numbers: true, footline: true, citEstilo: 'num', bibAuto: true },
    slides: [{ id: uid(), layout: 'title', title: '', blocks: [] }]
  };
}

/* Contenido de arranque de cada diseño, para que la diapositiva nazca útil */
function contenidoInicial(layout) {
  const T = (t, o) => Object.assign(newBlock('text'), { text: t }, o || {});
  const V = its => Object.assign(newBlock('bullets'), { items: its.map(t => ({ t, lvl: 0 })) });
  switch (layout) {
    case 'flujo': return [[
      T('La diapositiva de texto fluido reparte el contenido en columnas, como un artículo. Sirve cuando tienes bastante que contar y no quieres reducir el tamaño de la letra para que quepa.'),
      T('Escribe de corrido: los bloques se acomodan solos y saltan a la siguiente columna cuando se llena la primera. Si el texto crece, sube el número de columnas en el panel de la derecha.'),
      V(['Cada punto puede llevar $matemáticas$ en línea', 'Las viñetas también fluyen entre columnas', 'El tamaño del texto se ajusta desde el panel'])
    ]];
    case 'enunciado': return [[
      T('La idea que quieres que se lleven de esta diapositiva', { size: 'l', align: 'center' }),
      T('Una línea de apoyo, opcional, con el matiz o el dato que la sostiene.', { size: 's', align: 'center' })
    ]];
    case 'ancho': return [[
      T('Los márgenes se estrechan para que la figura, la tabla o la gráfica ocupen casi toda la diapositiva.', { align: 'center' })
    ]];
    case 'barra': return [
      [V(['Dato clave', 'Segunda cifra', 'Condición de trabajo'])],
      [T('La barra de la izquierda concentra las cifras o condiciones que el público debe tener a la vista mientras explicas el contenido principal aquí, con todo el ancho disponible.')]
    ];
    case 'comparacion': return [
      [V(['Primera característica', 'Segunda característica', 'Tercera característica'])],
      [V(['Lo que cambió', 'Lo que mejoró', 'Lo que sigue igual'])]
    ];
    case 'tres': return [
      [T('Primera idea, con su explicación breve debajo.')],
      [T('Segunda idea, en paralelo a las otras dos.')],
      [T('Tercera idea, cerrando la comparación.')]
    ];
    case 'sangre': return [[
      Object.assign(newBlock('image'), { w: 100, caption: '' }),
      T('Escribe aquí lo que hay que ver en la figura. Va sobre una banda oscura, así que se lee encima de cualquier imagen.', { size: 's' })
    ]];
    case 'piefigura': return [
      [Object.assign(newBlock('image'), { w: 100, caption: '' })],
      [T('El pie va aquí, con espacio para explicarlo bien: qué se midió, en qué condiciones y qué hay que mirar.', { size: 's' })]
    ];
    case 'zigzag': return [
      [Object.assign(newBlock('image'), { w: 100, caption: '' })],
      [T('Lo que muestra la primera figura.', { size: 's' })],
      [T('Lo que muestra la segunda, y cómo se encadena con la anterior.', { size: 's' })],
      [Object.assign(newBlock('image'), { w: 100, caption: '' })]
    ];
    case 'partida': return [
      [V(['Condición de partida', 'Lo que se observaba', 'La limitación'])],
      [V(['Condición nueva', 'Lo que se observa ahora', 'Lo que resolvió'])]
    ];
    case 'filas': return [
      [T('Qué se hizo en esta etapa y con qué condiciones.', { size: 's' })],
      [T('Qué se midió y con qué técnica.', { size: 's' })],
      [T('Qué salió de ahí y para qué sirve.', { size: 's' })]
    ];
    case 'rejilla6': return [
      [T('Fase cúbica, sin impurezas.', { size: 's' })], [T('Bandas de C–N y N–H.', { size: 's' })],
      [T('Granos de 200–400 nm.', { size: 's' })], [T('Borde a 780 nm.', { size: 's' })],
      [T('Estable hasta 250 °C.', { size: 's' })], [T('Modo a 142 cm$^{-1}$.', { size: 's' })]
    ];
    case 'dato': return [[
      T('Récord certificado del NREL para una celda de perovskita de unión simple.', { size: 's', align: 'center' })
    ]];
    case 'cita': return [[
      T('El descubrimiento de que un haluro de plomo con estructura de perovskita podía funcionar como sensibilizador cambió por completo la ruta de las celdas solares en disolución.', { align: 'left' })
    ]];
    case 'pasos': return [
      [T('Qué se hizo en esta etapa y con qué condiciones.')],
      [T('Qué técnicas se usaron para seguir el proceso.')],
      [T('Qué se obtuvo y cómo se interpretó.')]
    ];
    case 'cuadricula': return [
      [T('Contenido de la primera celda.')],
      [T('Contenido de la segunda celda.')],
      [T('Contenido de la tercera celda.')],
      [T('Contenido de la cuarta celda.')]
    ];
    case 'twocol': return [
      [T('El texto va de este lado y la figura del otro. La anchura de cada columna se ajusta con el deslizador del panel.')],
      []
    ];
    default: return null;
  }
}

function newBlock(type) {
  switch (type) {
    /* Vacíos a propósito: el recuadro con su pista ya dice qué va ahí, y así no
       hay que borrar un texto de muestra antes de escribir el de verdad. */
    case 'text': return { id: uid(), type, text: '', size: 'n', align: 'left' };
    case 'bullets': return { id: uid(), type, items: [{ t: '', lvl: 0 }], step: false };
    case 'math': return { id: uid(), type, tex: '', size: 'n' };
    case 'chem': return { id: uid(), type, tex: '' };
    case 'image': return { id: uid(), type, src: '', w: 70, caption: '', frame: false };
    case 'table': return { id: uid(), type, header: true, align: 'c', caption: '', rows: [['Variable', 'Valor', 'Unidad'], ['—', '—', '—'], ['—', '—', '—']] };
    case 'bblock': return { id: uid(), type, kind: 'block', btitle: 'Definición', body: 'Cuerpo de la caja. Admite $matemáticas$ en línea.' };
    case 'quote': return { id: uid(), type, text: 'La ciencia es el gran antídoto contra el veneno del entusiasmo y la superstición.', by: 'Adam Smith' };
    case 'code': return { id: uid(), type, text: 'import numpy as np\n\nx = np.linspace(0, 10, 100)\ny = np.sin(x)', lang: 'python' };
    case 'spacer': return { id: uid(), type, hpx: 24 };
    case 'chart': return {
      id: uid(), type, kind: 'ajuste', data: CHART_SAMPLES[0].data,
      xlabel: CHART_SAMPLES[0].xlabel, ylabel: CHART_SAMPLES[0].ylabel, title: '',
      w: 78, ar: 0.52, grid: true, legend: true, offset: false, offsetPct: 55,
      logX: false, logY: false, showFit: true, anim: 'fade'
    };
    case 'func': {
      const m = FUNC_MODELS[1];
      return {
        id: uid(), type, curves: deepCopy(m.curves), params: deepCopy(m.params),
        xmin: m.xmin, xmax: m.xmax, xlabel: m.xlabel, ylabel: m.ylabel, title: '',
        w: 78, ar: 0.52, grid: true, legend: true, sliders: true, anim: 'draw'
      };
    }
    case 'video': return { id: uid(), type, src: '', poster: '', mime: '', w: 70, caption: '', loop: true, autoplay: true, controls: true, anim: 'fade' };
    case 'estruct': return { id: uid(), type, est: null, w: 55, caption: '', anim: 'fade' };
    case 'refs': return { id: uid(), type, anim: 'fade' };
    case 'galeria': return { id: uid(), type, gal: { imgs: [], modo: 'rejilla', cols: 2, letras: true, hueco: 8 }, w: 92, caption: '', est: { forma: 'recta', marco: 'none', sombra: false, filtro: 'none' }, anim: 'fade' };
    case 'montaje': return { id: uid(), type, mont: null, w: 88, caption: '', anim: 'fade' };
    case 'teorema': return { id: uid(), type, kind: 'teorema', titulo: '', num: '', anim: 'fade',
      body: 'Enunciado del teorema. Admite $matemáticas$ en línea.' };
    case 'geo': return { id: uid(), type, geo: null, w: 58, caption: '', anim: 'fade' };
    case 'smart': return { id: uid(), type, kind: 'proceso', w: 84, caption: '', anim: 'fade',
      items: [{ t: 'Primera etapa' }, { t: 'Segunda etapa' }, { t: 'Tercera etapa' }, { t: 'Cuarta etapa' }] };
  }
}


