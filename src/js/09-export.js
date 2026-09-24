/* ==== 09-export.js ==== */
'use strict';
/* ================= exportaciones: PDF, Beamer .tex, proyecto .json ================= */

/* ---------- LaTeX ---------- */
const TEX_ESC = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '_': '\\_', '%': '\\%', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
function texEscape(s) { return String(s == null ? '' : s).replace(/[\\{}$&#_%~^]/g, c => TEX_ESC[c]); }
/* Convierte texto con $…$ a LaTeX: escapa solo lo que está fuera de matemáticas. */
/* Escapa texto plano, pero deja pasar los \SI y \ce que produce la notación
   automática. Las macros se apartan, se escapa el resto y se vuelven a poner. */
function texEscapeNota(s) {
  if (typeof notacionOn !== 'function' || !notacionOn()) return texEscape(s);
  const macros = [];
  const con = notacionTex(s).replace(/\\(?:SI|ce)\{[^{}]*\}(?:\{[^{}]*\})?/g, m => {
    macros.push(m); return '\u0001' + (macros.length - 1) + '\u0001';
  });
  return texEscape(con).replace(/\u0001(\d+)\u0001/g, (_, i) => macros[+i]);
}
/* Las matemáticas se copian literalmente al .tex: es lo que las hace útiles y
   también la vía por la que un proyecto ajeno podría colar órdenes de archivo
   o de shell en tu compilación. Estas primitivas no aparecen en ninguna
   ecuación legítima (KaTeX ni las admite), así que se retiran y se avisa. */
const TEX_PROHIBIDO = /\\(?:@@input|inputlineno|input|include|subfile|openin|openout|write18|writeln|write|readline|read|catcode|csname|endcsname|immediate|directlua|latelua|ShellEscape|lstinputlisting|verbatiminput|usepackage|RequirePackage|special|newread|newwrite|escapechar|endlinechar)(?![a-zA-Z])/g;
let TEX_RETIRADO = 0;
function texMate(s) {
  return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ')
    .replace(TEX_PROHIBIDO, m => { TEX_RETIRADO++; return '\\text{[' + m.slice(1) + ' retirado]}'; });
}
let TEX_EN_TITULO = false;
function texInline(s) {
  let out = '', buf = '', inM = false, i = 0;
  s = String(s == null ? '' : s);
  /* {{término}} lleva llaves, que el escape convertiría: se marca con dos
     caracteres de control que el escape no toca y se resuelve al final. */
  if (s.indexOf('{{') >= 0 && typeof RE_GLOSA !== 'undefined') s = s.replace(RE_GLOSA, (m, t) => '\u0001' + t + '\u0002');
  while (i < s.length) {
    const c = s[i];
    /* «\$» es un signo de dólar escrito, como en inlineRich: fuera de las
       matemáticas lo escapa texEscape (sumarle otra barra la imprimía). */
    if (c === '\\' && s[i + 1] === '$') { buf += inM ? '\\$' : '$'; i += 2; continue; }
    if (c === '$') {
      out += inM ? '$' + texMate(buf) + '$' : texEscapeNota(buf);
      buf = ''; inM = !inM; i++; continue;
    }
    buf += c; i++;
  }
  out += inM ? texEscape('$' + buf) : texEscapeNota(buf);
  /* [@clave] y {{término}} atraviesan el escape sin tocarse: aquí se resuelven. */
  const conCitas = resuelveCitas(out.replace(/\n/g, ' \\\\\n'), 'tex');
  if (conCitas.indexOf('\u0001') < 0) return conCitas;
  return conCitas.replace(/\u0001([^\u0001\u0002]*)\u0002/g, (m, t) => {
    const g = typeof glosaDe === 'function' ? glosaDe(t, TEX_DECK || S.deck) : null;
    if (!TEX_EN_TITULO && g && g.breve && nivelDe(TEX_DECK || S.deck) === 'divulgacion') return t + '\\footnote{' + texEscape(g.breve) + '}';
    return t;
  });
}
function texBlockText(s) {
  return String(s == null ? '' : s).split('\n').map(ln => {
    const t = ln.trim();
    if (t.length > 4 && t.startsWith('$$') && t.endsWith('$$')) return '\\[ ' + t.slice(2, -2).trim() + ' \\]';
    return texInline(ln);
  }).join('\n\n').replace(/\n{3,}/g, '\n\n');
}

const MARCA_DIAPO = '% --- diapositiva ';
/* Un dibujo de TikZ mide en centímetros y no sabe nada del ancho de la
   columna: se mete en una caja que lo lleva al porcentaje elegido, igual que
   en pantalla. */
function enCaja(tikz, pct, p) {
  const w = clamp(+pct || 70, 10, 100) / 100;
  return p + '\\resizebox{' + w.toFixed(2) + '\\linewidth}{!}{%\n' + tikz + '\n' + p + '}';
}
/* Un registro de colores: TikZ no admite expresiones de color con comas
   dentro de una opción, así que cada tono se declara antes con su nombre.
   Lo usan las figuras que llevan su propia paleta —el montaje y la estructura—,
   y por eso vive aquí y no dentro de ninguna de las dos. */
function registroColores() {
  const mapa = new Map(); const defs = [];
  return {
    defs,
    n(hex, respaldo) {
      if (!/^#[0-9a-f]{6}$/i.test(String(hex || ''))) return respaldo || 'erlentinta';
      const k = hex.toUpperCase();
      if (!mapa.has(k)) {
        const nom = 'tpc' + mapa.size;
        mapa.set(k, nom);
        defs.push('\\definecolor{' + nom + '}{HTML}{' + k.slice(1) + '}');
      }
      return mapa.get(k);
    }
  };
}
const figName = b => b._nom || ('figura-' + String(b.id || 'x').slice(0, 8));
/* La figura, con su barra de escala encima si la tiene. */
function figTex(b) {
  const w = ((b.w || 70) / 100).toFixed(2);
  if (typeof figAdaptada === 'function' && figAdaptada(b)) return figuraConMarcasTex(b, '');
  const e = b.escala;
  if (!e || !e.porPx || !e.anchoImg) return `\\erlenfig{${w}}{${figName(b)}}`;
  const frac = (e.largo / e.porPx / e.anchoImg) * (b.w || 70) / 100;
  return `\\erlenescala{${w}}{${figName(b)}}{${frac.toFixed(4)}}{${texEscape(e.largo + ' ' + (e.unidad || 'µm'))}}`;
}
const zt = (sl, i) => ((sl.zt || [])[i] || '');
/* Beamer exige [fragile] en todo frame con un entorno verbatim; sin él el .tex
   no compila («Runaway argument… ended by \end{frame}»). */
const frameConCodigo = sl => CLAVES_ZONA.some(k => (sl[k] || []).some(b => b && b.type === 'code'));
/* Abre un frame respetando título, subtítulo y el margen elegido. */
function abreFrame(sl) {
  const estrecho = sl.pad === 'estrecho' || sl.layout === 'ancho';
  const partes = [];
  if (estrecho) partes.push('t');
  if (frameConCodigo(sl)) partes.push('fragile');
  const opt = partes.length ? '[' + partes.join(',') + ']' : '';
  TEX_EN_TITULO = true;
  const cab = '\\begin{frame}' + opt + '{' + texInline(sl.title || '') +
    (sl.subtitle ? '}{' + texInline(sl.subtitle) : '') + '}';
  TEX_EN_TITULO = false;
  return cab;
}

/* ---------- SmartArt → TikZ ----------
   Se reutiliza la misma disposición que dibuja la pantalla, escalada a cm. */
function smartToTikz(b, p) {
  const L = smartLayout(b, S.deck);
  const anchoCm = 11 * clamp((b.w || 84) / 100, 0.4, 1);
  const k = anchoCm / 1000;                       /* unidades → cm */
  const X = v => (v * k).toFixed(3);
  const Y = v => (-v * k).toFixed(3);             /* TikZ crece hacia arriba */
  const col = (hex, nombre) => { colores[nombre] = hex.replace('#', '').toUpperCase(); return nombre; };
  const colores = {};
  const L2 = [];
  L2.push(p + '% Con babel-spanish las palabras largas se parten solas y el texto respira mejor.');
  L2.push(p + '\\begin{tikzpicture}[x=1cm,y=1cm,font=\\footnotesize]');

  L.formas.forEach((f, i) => {
    const nf = f.fill ? col(f.fill, 'sa' + i + 'f') : null;
    const ns = f.stroke ? col(f.stroke, 'sa' + i + 's') : null;
    const est = [];
    if (nf) est.push('fill=' + nf);
    if (ns) est.push('draw=' + ns, 'line width=' + ((f.grosor || 2.5) * 0.28).toFixed(2) + 'pt'); else est.push('draw=none');
    if (f.op != null && f.op < 1) est.push('fill opacity=' + f.op);
    const e = est.join(', ');
    if (f.t === 'rect') L2.push(p + `  \\draw[${e}, rounded corners=${((f.rx||0)*k*10).toFixed(1)}pt] (${X(f.x)},${Y(f.y)}) rectangle (${X(f.x+f.w)},${Y(f.y+f.h)});`);
    else if (f.t === 'circle') L2.push(p + `  \\draw[${e}] (${X(f.cx)},${Y(f.cy)}) circle (${X(f.r)});`);
    else if (f.t === 'path') {
      const pts = (f.d.match(/[ML]\s*[-\d.]+,[-\d.]+|H\s*[-\d.]+|V\s*[-\d.]+/g) || []);
      let cx = 0, cy = 0; const salida = [];
      pts.forEach(seg => {
        const c = seg[0], resto = seg.slice(1).trim();
        if (c === 'H') cx = parseFloat(resto);
        else if (c === 'V') cy = parseFloat(resto);
        else { const [a, bb] = resto.split(','); cx = parseFloat(a); cy = parseFloat(bb); }
        salida.push(`(${X(cx)},${Y(cy)})`);
      });
      if (salida.length) L2.push(p + `  \\draw[${e}] ` + salida.join(' -- ') + ' -- cycle;');
    }
    else if (f.t === 'line') L2.push(p + `  \\draw[draw=${col(f.stroke,'sa'+i+'l')}, line width=${f.gruesa?1.1:f.tenue?.4:.8}pt${f.tenue?', draw opacity=.5':''}${f.flecha?', -{Latex[length=2mm]}':''}] (${X(f.x1)},${Y(f.y1)}) -- (${X(f.x2)},${Y(f.y2)});`);
    else if (f.t === 'arc') {
      const a1 = Math.atan2(f.y1 - (f.cy0 || 0), 0) ;
      L2.push(p + `  \\draw[draw=${col(f.stroke,'sa'+i+'a')}, line width=.8pt, -{Latex[length=2mm]}] (${X(f.x1)},${Y(f.y1)}) to[bend left=18] (${X(f.x2)},${Y(f.y2)});`);
    }
  });

  L.rotulos.forEach(r => {
    const ancho = (r.w * k).toFixed(2);
    const cuerpo = texInline(r.t || '') + (r.s ? '\\\\[2pt]{\\tiny ' + texInline(r.s) + '}' : '');
    const nc = col(r.col, 'sat' + Math.abs(hashCol(r.col)));
    /* Sin partición de palabras, una palabra larga se sale de la caja.
       Se baja el tamaño hasta que la más larga quepa. */
    const larga = String(r.t || '').split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
    const ESCALAS = [['', 0.142], ['\\scriptsize ', 0.124]];
    let tam = (r.fs || 1) < 0.92 ? '\\scriptsize ' : '';
    const anchoNum = parseFloat(ancho);
    for (const [cmd, cw] of ESCALAS) {
      if (cmd.length < tam.length) continue;
      if (larga * cw <= anchoNum) { tam = cmd; break; }
      tam = cmd;
    }
    L2.push(p + `  \\node[text=${nc}, align=${r.al === 'left' ? 'left' : 'center'}, text width=${ancho}cm, inner sep=1pt] at (${X(r.x)},${Y(r.y)}) {${tam}\\bfseries ${cuerpo}};`);
  });
  L2.push(p + '\\end{tikzpicture}');

  const defs = Object.keys(colores).map(n => p + `\\definecolor{${n}}{HTML}{${colores[n]}}`);
  return defs.concat(L2).join('\n');
}
function hashCol(x) { let h = 0; for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return h; }

/* ---------- gráficas → pgfplots ---------- */
const PGF_COLORS = ['serieA', 'serieB', 'serieC', 'serieD', 'serieE', 'serieF'];
const PGF_MARKS = ['*', 'square*', 'triangle*', 'diamond*', 'x', 'star'];
/* Número seguro para pgfplots: 7 cifras y sin colas absurdas. */
function pgfNum(v) {
  if (!isFinite(v)) return '0';
  if (Math.abs(v) < 1e-20) return '0';
  return String(Number(Number(v).toPrecision(7)));
}
function pgfCoords(pts, p, conError) {
  const out = [];
  let line = p + '    ';
  const step = Math.max(1, Math.ceil(pts.length / 150));
  pts.forEach(([x, y, e], i) => {
    if (!isFinite(y)) return;
    if (i % step && i !== pts.length - 1) return;
    /* La barra de error viaja con el punto, en la sintaxis de pgfplots. */
    const t = `(${pgfNum(x)},${pgfNum(y)})` + (conError ? ` +- (0,${pgfNum(isFinite(e) && e > 0 ? e : 0)})` : '') + ' ';
    if (line.length + t.length > 94) { out.push(line); line = p + '    '; }
    line += t;
  });
  if (line.trim()) out.push(line);
  return out.join('\n');
}
/* Un número para el papel: la misma cifra que en pantalla, con la potencia de
   diez escrita como la escribe LaTeX. */
function texNum(v, n) {
  return String(sigFig(v, n || 4)).replace(/\u00d710\^(-?\d+)/, '\\times 10^{$1}');
}
function texAxisLabel(s) {
  /* los rótulos ya vienen con $…$; fuera de ellos hay que escapar */
  return texInline(s);
}
function chartToPgf(b, p) {
  const kind = b.type === 'func' ? 'linea' : (b.kind || 'linea');
  const series = chartSeries(b);
  if (!series.length || series.every(s => !s.pts.length)) return p + '% (la gráfica no tenía datos)';
  const offsetMode = b.type !== 'func' && kind === 'linea' && !!b.offset;
  /* Las mismas reglas de escala que en pantalla, leídas de la misma función:
     qué ejes van en logaritmo, qué punto cabe en ellos y en qué espacio se
     ajusta la recta. Si esto se copiara aquí, el PDF acabaría dibujando otra
     gráfica, que es lo que pasa siempre que una decisión vive dos veces. */
  const esc = escalasChart(b, kind, offsetMode);
  const { eX, eY, iY, logX, logY, vale } = esc;
  let span = 1;
  if (offsetMode) {
    const ys = [];
    series.forEach(s => s.pts.forEach(pt => { if (isFinite(pt[1])) ys.push(pt[1]); }));
    span = (Math.max.apply(null, ys) - Math.min.apply(null, ys)) || 1;
  }
  const offStep = offsetMode ? span * (b.offsetPct == null ? 55 : b.offsetPct) / 100 : 0;

  const L = [];
  /* medidas relativas al ancho disponible: así encaja igual en una
     diapositiva completa que dentro de una columna */
  const fw = clamp((b.w || 78) / 100, 0.3, 1);
  L.push(p + '\\begin{tikzpicture}');
  const opt = [];
  opt.push('width=' + fw.toFixed(2) + '\\linewidth',
           'height=' + (fw * chartAR(b) + 0.07).toFixed(2) + '\\linewidth');
  if (b.xlabel) opt.push('xlabel={' + texAxisLabel(b.xlabel) + '}');
  if (b.ylabel) opt.push('ylabel={' + texAxisLabel(b.ylabel) + '}');
  if (b.title) opt.push('title={' + texAxisLabel(b.title) + '}');
  if (b.grid !== false) opt.push('grid=major', 'grid style={line width=.2pt, draw=gray!25}');
  if (b.xrev || b.invertirX) opt.push('x dir=reverse');
  if (logX) opt.push('xmode=log', 'log basis x=10');
  if (logY) opt.push('ymode=log', 'log basis y=10');
  if (offsetMode) opt.push('ytick=\\empty');
  opt.push('tick align=outside', 'tick pos=left', 'axis line style={gray!60}', 'label style={font=\\small}', 'tick label style={font=\\footnotesize}');
  if (series.length > 1 && !offsetMode && b.legend !== false) opt.push('legend style={font=\\footnotesize, draw=none, fill=none, at={(0.5,-0.22)}, anchor=north, legend columns=-1, /tikz/every even column/.append style={column sep=8pt}}');
  if (kind === 'barras') opt.push('ybar', 'bar width=7pt', 'ymin=0');
  /* Con capas o con un «después», los ejes se fijan: si no, Beamer los
     recalcularía en cada overlay y el marco saltaría. */
  const porCapas = !!b.capas && b.type !== 'func';
  const conDespues = !!((b.despues && b.despues.data) || b._ejesDe) && b.type !== 'func';
  if (porCapas || conDespues) {
    const xs = [], ys = [];
    const mete = ss => ss.forEach(s => s.pts.forEach(pt => {
      if (!vale(pt)) return;
      xs.push(pt[0]); ys.push(pt[1]);
      if (isFinite(pt[2]) && pt[2] > 0) { ys.push(pt[1] + pt[2]); if (!logY || pt[1] - pt[2] > 0) ys.push(pt[1] - pt[2]); }
    }));
    mete(series);
    if (b.despues && b.despues.data) mete(chartSeries(Object.assign({}, b, { data: b.despues.data, despues: null })));
    if (b._ejesDe) mete(chartSeries(Object.assign({}, b._ejesDe, { despues: null })));
    if (xs.length) {
      const y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), pad = (y1 - y0 || 1) * 0.08;
      /* En un eje logarítmico el margen no se suma, se multiplica: sumar un
         octavo del recorrido dejaría el mínimo en cero o por debajo. */
      const yA = logY ? y0 / 1.3 : (kind === 'barras' ? Math.min(0, y0 - pad) : y0 - pad);
      const yB = logY ? y1 * 1.3 : y1 + pad;
      opt.push('xmin=' + pgfNum(Math.min.apply(null, xs)), 'xmax=' + pgfNum(Math.max.apply(null, xs)),
        'ymin=' + pgfNum(yA), 'ymax=' + pgfNum(yB));
    }
  }
  L.push(p + '  \\begin{axis}[');
  L.push(p + '    ' + opt.join(',\n' + p + '    '));
  L.push(p + '  ]');

  const ajustes = [], ecuaciones = [];
  series.forEach((s, i) => {
    const col = PGF_COLORS[i % PGF_COLORS.length];
    const mk = PGF_MARKS[i % PGF_MARKS.length];
    const pts = s.pts.filter(vale).map(([x, y, e]) => [x, y + offStep * (series.length - 1 - i), e]);
    let style;
    if (kind === 'barras') style = `[fill=${col}, draw=${col}]`;
    else if (kind === 'linea') {
      /* Los puntos se marcan igual que en pantalla: si en el editor se ven las
         mediciones, en el PDF también. */
      const conPuntos = b.type !== 'func' && (b.puntos == null ? pts.length <= 30 : !!b.puntos);
      style = `[${col}, line width=1pt, mark=${conPuntos ? mk + ', mark size=1.7pt' : 'none'}, smooth]`;
    }
    else style = `[only marks, mark=${mk}, mark size=1.9pt, ${col}]`;
    /* La incertidumbre viaja con la serie, igual que en pantalla. */
    if (s.tieneError) style = style.slice(0, -1) + ', error bars/.cd, y dir=both, y explicit]';
    /* Por capas: cada serie es un overlay, en el mismo orden que en pantalla. */
    if (porCapas && pts.some(q => isFinite(q[1]))) L.push(p + '    \\only<+->{');
    L.push(p + `    \\addplot${style} coordinates {`);
    L.push(pgfCoords(pts, p, !!s.tieneError));
    L.push(p + '    };');
    if (series.length > 1 && !offsetMode && b.legend !== false) L.push(p + '    \\addlegendentry{' + texAxisLabel(s.name) + '}');
    if (porCapas && pts.some(q => isFinite(q[1]))) L.push(p + '    }');
    if (kind === 'ajuste') {
      const ok = pts.filter(q => isFinite(q[1]));
      /* El ajuste se hace en el espacio que se ve, como en pantalla: con el
         eje y en log, sobre log y. Y se emite como dos coordenadas en vez de
         como fórmula, porque en ese espacio la recta es recta y pgfplots une
         las coordenadas ya transformadas: así el PDF traza la misma línea. */
      const f = linFit(ok.map(q => [eX(q[0]), eY(q[1])]));
      if (f && ok.length) {
        const xs = ok.map(q => q[0]);
        const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
        const y0 = iY(f.m * eX(x0) + f.b), y1 = iY(f.m * eX(x1) + f.b);
        const linea = p + `    \\addplot[${col}, line width=.9pt, mark=none, forget plot] coordinates {(${pgfNum(x0)},${pgfNum(y0)}) (${pgfNum(x1)},${pgfNum(y1)})};`;
        if (porCapas) ajustes.push(linea); else L.push(linea);
        if (b.showFit !== false) ecuaciones.push({ f, name: s.name, col });
      }
    }
    if (offsetMode && pts.length) {
      const last = pts[pts.length - 1];
      L.push(p + `    \\node[anchor=east, font=\\footnotesize] at (axis cs:${pgfNum(last[0])},${pgfNum(last[1])}) {${texAxisLabel(s.name)}};`);
    }
  });
  if (ajustes.length) { L.push(p + '    \\only<+->{'); ajustes.forEach(x => L.push(x)); L.push(p + '    }'); }
  /* El punto que importa: un anillo del color de acento y su rótulo. */
  if (porCapas && b.destaca && series[b.destaca.serie]) {
    const pt = series[b.destaca.serie].pts[b.destaca.i];
    if (pt && isFinite(pt[1])) {
      const y = pt[1] + offStep * (series.length - 1 - b.destaca.serie);
      L.push(p + '    \\only<+->{');
      L.push(p + `    \\addplot[only marks, mark=o, mark size=4pt, line width=1.3pt, erlenacento, forget plot] coordinates {(${pgfNum(pt[0])},${pgfNum(y)})};`);
      if (b.destaca.txt) L.push(p + `    \\node[anchor=south west, font=\\footnotesize\\bfseries, erlenacento, inner sep=2pt] at (axis cs:${pgfNum(pt[0])},${pgfNum(y)}) {${texAxisLabel(b.destaca.txt)}};`);
      L.push(p + '    }');
    }
  }
  /* La ecuación del ajuste con su R². En pantalla se leen bajo el título y al
     PDF no llegaban: la diapositiva decía una cosa y el papel, otra. Van
     dentro del marco, en la esquina que la propia recta deja libre —arriba a
     la izquierda si sube, a la derecha si baja—, que es donde las pone a mano
     cualquiera que dibuje una calibración. */
  if (ecuaciones.length) {
    const sube = ecuaciones[0].f.m >= 0;
    const izq = logY ? '\\log_{10} y' : 'y', der = logX ? '\\log_{10} x' : 'x';
    const lin = ecuaciones.slice(0, 3).map(e =>
      (ecuaciones.length > 1 ? texAxisLabel(e.name) + ': ' : '') +
      `$${izq} = ${texNum(e.f.m)}\\,${der} ${e.f.b < 0 ? '-' : '+'} ${texNum(Math.abs(e.f.b))}$` +
      ` \\quad $R^{2} = ${e.f.r2.toFixed(4)}$`);
    L.push(p + `    \\node[anchor=north ${sube ? 'west' : 'east'}, align=${sube ? 'left' : 'right'}, font=\\footnotesize,` +
      ` fill=erlenfondo, fill opacity=0.72, text opacity=1, inner sep=2pt]` +
      ` at (rel axis cs:${sube ? '0.03' : '0.97'},0.97) {${lin.join(' \\\\ ')}};`);
  }
  L.push(p + '  \\end{axis}');
  L.push(p + '\\end{tikzpicture}');
  return L.join('\n');
}

/* El deck que se está exportando, para los bloques que necesitan verlo entero
   (la diapositiva de referencias, por ejemplo). */
let TEX_DECK = null;
/* Cierra el frame poniendo antes, si las hay, las citas de esa diapositiva. */
function cierraFrame(L, sl, deck) {
  const c = typeof citasTex === 'function' ? citasTex(sl, deck || TEX_DECK || S.deck, '  ') : null;
  if (c) L.push(c);
  L.push('\\end{frame}');
}
function texBlocks(arr, ind) {
  const L = [];
  const p = ind || '    ';
  for (const b of arr) {
    if (typeof bloqueVisible === 'function' && !bloqueVisible(b, TEX_DECK || S.deck)) continue;
    switch (b.type) {
      case 'text': {
        const body = texBlockText(b.text);
        if (b.align === 'center') L.push(p + '\\begin{center}\n' + p + body + '\n' + p + '\\end{center}');
        else if (b.size === 's') L.push(p + '{\\small ' + body + '}');
        else if (b.size === 'l') L.push(p + '{\\large ' + body + '}');
        else L.push(p + body);
        break;
      }
      case 'bullets': {
        const lines = [];
        let lvl = 0;
        lines.push(p + '\\begin{itemize}');
        for (const it of (b.items || [])) {
          const want = clamp(it.lvl || 0, 0, 2);
          while (lvl < want) { lvl++; lines.push(p + '  '.repeat(lvl) + '\\begin{itemize}'); }
          while (lvl > want) { lines.push(p + '  '.repeat(lvl) + '\\end{itemize}'); lvl--; }
          lines.push(p + '  '.repeat(lvl) + '  \\item' + (b.step && !(typeof TEX_PLANO !== 'undefined' && TEX_PLANO) ? '<+->' : '') + ' ' + texInline(it.t));
        }
        while (lvl > 0) { lines.push(p + '  '.repeat(lvl) + '\\end{itemize}'); lvl--; }
        lines.push(p + '\\end{itemize}');
        L.push(lines.join('\n'));
        break;
      }
      case 'math':
        if (typeof conDerivacion === 'function' && conDerivacion(b)) { L.push(derivacionTex(b, p)); break; }
        if (b.tex) L.push(p + '\\begin{equation*}\n' + p + '  ' + texMate(b.tex) + '\n' + p + '\\end{equation*}');
        break;
      case 'chem':
        if (b.tex) L.push(p + '\\begin{center}\n' + p + '  \\ce{' + texMate(b.tex) + '}\n' + p + '\\end{center}');
        break;
      case 'teorema':
        L.push(teoremaTex(b, p));
        break;
      case 'geo': {
        const capG = b.caption ? '\n' + p + '  \\caption{' + texInline(b.caption) + '}' : '';
        L.push(p + '\\begin{figure}\n' + p + '  \\centering\n' +
          enCaja(geometriaTikz(b, p + '    '), b.w || 58, p + '  ') + capG + '\n' + p + '\\end{figure}');
        break;
      }
      case 'estruct': {
        const capE = b.caption ? '\n' + p + '  \\caption{' + texInline(b.caption) + '}' : '';
        L.push(p + '\\begin{figure}\n' + p + '  \\centering\n' +
          enCaja(estructuraTikz(b, p + '    ', TEX_DECK || S.deck), b.w || 55, p + '  ') + capE + '\n' + p + '\\end{figure}');
        break;
      }
      case 'galeria': {
        L.push(galeriaTex(b, p));
        break;
      }
      case 'refs': {
        L.push(referenciasTex(TEX_DECK || S.deck, p, b));
        break;
      }
      case 'montaje': {
        const capM = b.caption ? '\n' + p + '  \\caption{' + texInline(b.caption) + '}' : '';
        L.push(p + '\\begin{figure}\n' + p + '  \\centering\n' +
          enCaja(montajeTikz(b, p + '    '), b.w || 88, p + '  ') + capM + '\n' + p + '\\end{figure}');
        break;
      }
      case 'image': {
        const cap = b.caption ? '\n' + p + '  \\caption{' + texInline(b.caption) + '}' : '';
        const cuerpo = (b.despues && b.despues.src)
          ? `  \\only<+>{${figTex(b)}}\\only<+->{${figTex(Object.assign({}, b, { _nom: figName(b) + '-despues' }))}}`
          : `  ${figTex(b)}`;
        L.push(p + '\\begin{figure}\n' + p + '  \\centering\n' + p + cuerpo + cap + '\n' + p + '\\end{figure}');
        break;
      }
      case 'table': {
        const rows = b.rows || [];
        if (!rows.length) break;
        const n = rows[0].length;
        /* Las columnas de cifras van a la derecha, como en pantalla. */
        const numCols = columnasNumericas(rows, !!b.header);
        const base = b.align === 'l' ? 'l' : 'c';
        const col = Array.from({ length: n }, (_, i) => numCols[i] ? 'r' : base).join('');
        const lines = [];
        lines.push(p + '\\begin{table}');
        lines.push(p + '  \\centering');
        if (b.caption) lines.push(p + '  \\caption{' + texInline(b.caption) + '}');
        lines.push(p + '  \\begin{tabular}{' + col + '}');
        lines.push(p + '    \\toprule');
        const body = rows.slice(b.header ? 1 : 0);
        if (b.header) {
          lines.push(p + '    ' + rows[0].map(c => '\\textbf{' + texInline(c) + '}').join(' & ') + ' \\\\');
          lines.push(p + '    \\midrule');
        }
        body.forEach(r => lines.push(p + '    ' + r.map(texInline).join(' & ') + ' \\\\'));
        lines.push(p + '    \\bottomrule');
        lines.push(p + '  \\end{tabular}');
        lines.push(p + '\\end{table}');
        L.push(lines.join('\n'));
        break;
      }
      case 'bblock': {
        const env = b.kind === 'alert' ? 'alertblock' : b.kind === 'example' ? 'exampleblock' : 'block';
        L.push(p + `\\begin{${env}}{` + texInline(b.btitle) + '}\n' + p + '  ' + texBlockText(b.body).replace(/\n/g, '\n' + p + '  ') + '\n' + p + `\\end{${env}}`);
        break;
      }
      case 'quote':
        L.push(p + '\\begin{quote}\n' + p + '  ' + texInline(b.text) + (b.by ? '\n' + p + '  \\par\\hfill\\textit{--- ' + texInline(b.by) + '}' : '') + '\n' + p + '\\end{quote}');
        break;
      case 'code':
        /* En semiverbatim la barra y las llaves siguen activas: se escapan o
           el código del usuario se lee como comandos LaTeX inexistentes. */
        L.push(p + '\\begin{semiverbatim}\n' + String(b.text || '').split('\n')
          .map(l => p + l.replace(/\\/g, '\u0001').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\u0001/g, '\\textbackslash{}'))
          .join('\n') + '\n' + p + '\\end{semiverbatim}');
        break;
      case 'spacer':
        L.push(p + `\\vspace{${((b.hpx || 24) / 28).toFixed(1)}em}`);
        break;
      case 'chart':
      case 'func': {
        const lines = [p + '\\begin{figure}', p + '  \\centering'];
        if (b.type === 'func') {
          lines.push(p + '  % Curvas evaluadas por Erlen:');
          (b.curves || []).forEach(cv => lines.push(p + '  %   ' + String(cv.name || 'y').replace(/[\r\n]+/g, ' ') + ' = ' + String(cv.expr || '').replace(/[\r\n]+/g, ' ')));
          if ((b.params || []).length) lines.push(p + '  %   con ' + b.params.map(q => q.name + ' = ' + q.value).join(', '));
        }
        if (b.type === 'chart' && b.despues && b.despues.data) {
          /* Antes y después: el mismo marco, dos overlays. */
          lines.push(p + '  \\only<+>{');
          lines.push(chartToPgf(Object.assign({}, b, { capas: false }), p + '    '));
          lines.push(p + '  }\\only<+->{');
          lines.push(chartToPgf(Object.assign({}, b, { capas: false, data: b.despues.data, despues: null, _ejesDe: b }), p + '    '));
          lines.push(p + '  }');
        } else lines.push(chartToPgf(b, p + '  '));
        if (b.sello && b.fuente && typeof selloFuenteTex === 'function') lines.push(selloFuenteTex(b, p + '  '));
        if (b.caption) lines.push(p + '  \\caption{' + texInline(b.caption) + '}');
        lines.push(p + '\\end{figure}');
        L.push(lines.join('\n'));
        break;
      }
      case 'smart': {
        const lineas = [p + '\\begin{figure}', p + '  \\centering'];
        lineas.push(smartToTikz(b, p + '  '));
        if (b.caption) lineas.push(p + '  \\caption{' + texInline(b.caption) + '}');
        lineas.push(p + '\\end{figure}');
        L.push(lineas.join('\n'));
        break;
      }
      case 'video': {
        const cap = b.caption ? '\n' + p + '  \\caption{' + texInline(b.caption) + '}' : '';
        L.push(p + '% Video: en el PDF se imprime el primer fotograma.' +
          '\n' + p + '\\begin{figure}\n' + p + '  \\centering\n' + p +
          `  ${figTex(b)}` + cap + '\n' + p + '\\end{figure}');
        break;
      }
    }
  }
  return L.join('\n' + p + '\\medskip\n\n');
}

/* Texto libre del pie → inserts de Beamer. */
const TOK_TEX = {
  autor: '\\insertshortauthor', titulo: '\\inserttitle', tituloCorto: '\\insertshorttitle',
  subtitulo: '\\insertsubtitle', institucion: '\\insertshortinstitute', fecha: '\\insertshortdate',
  seccion: '\\insertsection', n: '\\insertframenumber', N: '\\inserttotalframenumber'
};
function textoPieTex(txt, m) {
  const partes = String(txt || '').split(/(\{\w+\})/g);
  return partes.map(x => {
    const mm = /^\{(\w+)\}$/.exec(x);
    if (!mm) return texInline(x);
    if (mm[1] === 'leyenda') return texInline(m.pieTexto || '');
    return TOK_TEX[mm[1]] || texInline(x);
  }).join('');
}
/* Contenido LaTeX de una celda del pie. */
function celdaTex(c, m) {
  if (!c) return '';
  if (c.t === 'texto') return textoPieTex(c.x || '', m);
  if (c.t === 'leyenda') return texInline(m.pieTexto || '');
  if (c.t === 'logo') return m.logo ? '\\erlenlogo{height=2.1ex}' : '';
  const ins = INS[c.t];
  return ins && ins.tex ? ins.tex : '';
}
/* \setbeamertemplate{footline} a la medida, al estilo de infolines/split. */
function pieTex(deck) {
  const m = deck.meta, p = pieDe(m), L = [];
  if (p.modo === 'tema') return L;
  if (p.modo === 'ninguno') { L.push('\\setbeamertemplate{footline}{}'); return L; }
  if (p.modo === 'numero' && p.numFormato === 'n') { L.push('\\setbeamertemplate{footline}[frame number]'); return L; }

  /* Los colores salen de la tabla de temas, para que la pantalla y el PDF
     de LaTeX se vean iguales. */
  const th2 = temaDe(deck);
  const hx = c => c.replace('#', '').toUpperCase();
  L.push('% Pie de página a la medida (equivale a un \\setbeamertemplate{footline} propio).');
  L.push('\\definecolor{pieAcc}{HTML}{' + hx(th2.acc) + '}');
  L.push('\\definecolor{pieBg}{HTML}{' + hx(th2.bg) + '}');
  L.push('\\definecolor{pieMut}{HTML}{' + hx(th2.mut || th2.fg) + '}');
  L.push('\\definecolor{pieBar}{HTML}{' + hx(th2.pieBg || th2.ft) + '}');
  L.push('\\definecolor{pieBarFg}{HTML}{' + hx(th2.pieFg || th2.ftfg) + '}');
  L.push('\\definecolor{pieTinta}{HTML}{' + hx(tintaSobre(th2.acc)) + '}');
  const COLOR = {
    ninguno: '{fg=pieMut}',
    tenue:   '{fg=normal text.fg, bg=pieAcc!12!pieBg}',
    acento:  '{fg=pieTinta, bg=pieAcc}',
    barra:   '{fg=pieBarFg, bg=pieBar}'
  };
  L.push('\\setbeamercolor{piedetx}' + (COLOR[p.fondo] || COLOR.tenue));
  L.push('\\setbeamerfont{piedetx}{size=\\' + (p.tam === 'xs' ? 'tiny' : p.tam === 's' ? 'scriptsize' : p.tam === 'm' ? 'footnotesize' : 'small') + '}');

  let celdas;
  if (p.modo === 'numero') celdas = [{ t: 'numeroTotal' }];
  else if (p.modo === 'linea') celdas = [{ t: 'texto', x: p.texto }];
  else celdas = p.celdas.slice(0, p.ncel);
  const nc = celdas.length;
  const anchos = nc === 1 ? ['\\paperwidth'] : nc === 2 ? ['.5\\paperwidth', '.5\\paperwidth']
    : ['.3333\\paperwidth', '.3334\\paperwidth', '.3333\\paperwidth'];
  const alineaDe = i => {
    if (nc === 1) return p.modo === 'numero' ? 'der' : 'cen';
    if (p.alineado === 'centrado') return 'cen';
    return i === 0 ? 'izq' : i === nc - 1 ? 'der' : 'cen';
  };
  const OPC = { izq: 'leftskip=1.6ex,rightskip=1.6ex plus1fil', cen: 'center', der: 'leftskip=1.6ex plus1fil,rightskip=1.6ex' };

  L.push('\\setbeamertemplate{footline}{%');
  L.push('  \\leavevmode%');
  if (p.regla === 'fina') L.push('  {\\color{pieMut!45!pieBg}\\hrule height 0.4pt}%');
  if (p.regla === 'acento') L.push('  {\\color{pieAcc}\\hrule height 2pt}%');
  L.push('  \\hbox{%');
  celdas.forEach((c, i) => {
    L.push('  \\begin{beamercolorbox}[wd=' + anchos[i] + ',ht=2.6ex,dp=1.4ex,' + OPC[alineaDe(i)] + ']{piedetx}%');
    L.push('    \\usebeamerfont{piedetx}' + (celdaTex(c, m) || '\\strut') + '%');
    L.push('  \\end{beamercolorbox}%');
  });
  L.push('  }%');
  L.push('  \\vskip0pt%');
  L.push('}');
  return L;
}
/* Nota del orador en LaTeX: párrafos y viñetas. */
function notaTex(sl) {
  const partes = partesNota(sl.notes);
  const L = [];
  if (minutosDe(sl)) L.push('  {\\scriptsize\\textbf{Tiempo previsto: ' + mmss(minutosDe(sl)) + ' min}}\\par\\medskip');
  partes.forEach(pt => {
    if (pt.tipo === 'lista') {
      L.push('  \\begin{itemize}');
      pt.items.forEach(t => L.push('    \\item ' + texInline(t)));
      L.push('  \\end{itemize}');
    } else L.push('  ' + texInline(pt.texto) + '\\par');
  });
  return L;
}

function toBeamer(deck) {
  if (typeof sincronizaBib === 'function') sincronizaBib(deck);
  TEX_RETIRADO = 0;
  const m = deck.meta;
  const th = temaDe(deck);
  const hasChem = deck.slides.some(sl => CLAVES_ZONA.reduce((a,z)=>a.concat(sl[z]||[]),[]).some(b => b.type === 'chem'));
  const hasImg = deck.slides.some(sl => CLAVES_ZONA.reduce((a,z)=>a.concat(sl[z]||[]),[]).some(b => b.type === 'image' || b.type === 'video' || b.type === 'galeria'));
  const hasTab = deck.slides.some(sl => CLAVES_ZONA.reduce((a,z)=>a.concat(sl[z]||[]),[]).some(b => b.type === 'table'));
  const hasPlot = deck.slides.some(sl => CLAVES_ZONA.reduce((a,z)=>a.concat(sl[z]||[]),[]).some(b => b.type === 'chart' || b.type === 'func'));
  const hasVideo = deck.slides.some(sl => CLAVES_ZONA.reduce((a,z)=>a.concat(sl[z]||[]),[]).some(b => b.type === 'video'));
  const haySangre = deck.slides.some(sl => sl.layout === 'sangre' && !(typeof fueraDeRama === 'function' && fueraDeRama(sl, deck)));
  const hayLogo = !!m.logo;
  const hayPie = hayLogo && !!m.logoPie;
  const pieTxt = (m.pieTexto || '').trim();
  const L = [];
  L.push('% ===================================================================');
  L.push('%  Generado por Erlen');
  L.push('%  Compílalo en Overleaf, o localmente con dos pasadas de pdflatex.');
  if (m.theme === 'metropolis' || m.theme === 'nocturno')
    L.push('%  Este tema usa la tipografía Fira: compila con XeLaTeX o LuaLaTeX para verla.');
  if (hasImg || hayLogo) L.push('%  Figuras y logotipo: descárgalos desde Erlen (botón «Descargar figuras»)');
  if (hasImg || hayLogo) L.push('%  y súbelos junto a este archivo, conservando sus nombres.');
  L.push('% ===================================================================');
  L.push('\\documentclass[' + (m.aspect === '43' ? 'aspectratio=43' : 'aspectratio=169') + ',11pt]{beamer}');
  L.push(th.tex);
  if (m.theme === 'nocturno') {
    L.push('\\definecolor{fondoOscuro}{HTML}{1B2127}');
    L.push('\\definecolor{textoClaro}{HTML}{E9EDF2}');
    L.push('\\definecolor{acentoNoc}{HTML}{F09A4D}');
    L.push('\\setbeamercolor{background canvas}{bg=fondoOscuro}');
    L.push('\\setbeamercolor{normal text}{fg=textoClaro}');
    L.push('\\setbeamercolor{alerted text}{fg=acentoNoc}');
    L.push('\\setbeamercolor{frametitle}{bg=fondoOscuro!70!black,fg=textoClaro}');
  }
  const baseTema = THEMES[m.theme] || THEMES.metropolis;
  if (m.acento && String(m.acento).toUpperCase() !== baseTema.acc.toUpperCase()) {
    L.push('');
    L.push('% Color de acento propio. En Beamer «structure» tiñe títulos, viñetas,');
    L.push('% barras y cajas; «alerted text» es el color de énfasis.');
    L.push('\\definecolor{acentoTX}{HTML}{' + m.acento.replace('#', '').toUpperCase() + '}');
    L.push('\\setbeamercolor{structure}{fg=acentoTX}');
    L.push('\\setbeamercolor{alerted text}{fg=acentoTX}');
    L.push('');
  }
  L.push('\\usepackage[utf8]{inputenc}');
  L.push('\\usepackage[T1]{fontenc}');
  L.push('% Español: se carga solo si babel-spanish está instalado (Overleaf lo trae).');
  L.push('\\IfFileExists{spanish.ldf}{\\usepackage[spanish,es-nodecimaldot]{babel}}{}');
  const fu = fuenteDe(m);
  if (fu.id !== 'auto') {
    const lineas = (m.fuenteMat === false && fu.texTxt) ? fu.texTxt : fu.tex;
    L.push('');
    L.push('% Tipografía: ' + fu.n + (fu.propia ? ' (la misma que ves en Erlen)' : ''));
    if (fu.texTxt && m.fuenteMat === false) L.push('% Solo cambia el texto; las matemáticas se quedan en Computer Modern.');
    lineas.forEach(x => L.push(x));
    L.push('');
  }
  L.push('\\usepackage{amsmath,amssymb}');
  if (hasChem || notacionOn(m)) L.push('\\usepackage[version=4]{mhchem}');
  if (hasImg || hayLogo) L.push('\\usepackage{graphicx}');
  if (hasTab) L.push('\\usepackage{booktabs}');
  if (deck.slides.some(sl => sl.layout === 'flujo')) L.push('\\usepackage{multicol}');
  const haySmart = deck.slides.some(sl => CLAVES_ZONA.reduce((a, z) => a.concat(sl[z] || []), []).some(b => b.type === 'smart'));
  const hayQuim = deck.slides.some(sl => CLAVES_ZONA.reduce((a, z) => a.concat(sl[z] || []), []).some(b => b.type === 'estruct' || b.type === 'montaje' || b.type === 'geo' || (b.type === 'image' && typeof figAdaptada === 'function' && figAdaptada(b))));
  /* El líquido de los montajes usa el acento del tema, igual que en pantalla. */
  const hayMont = deck.slides.some(sl => CLAVES_ZONA.reduce((a, z) => a.concat(sl[z] || []), []).some(b => b.type === 'montaje' || b.type === 'geo' || (b.type === 'image' && typeof figAdaptada === 'function' && figAdaptada(b))));
  if (hayMont) {
    const thm = temaDe(deck);
    L.push('\\definecolor{erlenliq}{HTML}{' + thm.acc.slice(1).toUpperCase() + '}');
    L.push('\\definecolor{erlentinta}{HTML}{' + (thm.fg || '#222222').slice(1).toUpperCase() + '}');
    L.push('\\definecolor{erlenvidrio}{HTML}{6E8FA8}');
  }
  /* El papel y el acento del tema: los montajes, las estructuras y el rótulo
     del ajuste los necesitan, así que se declaran siempre. */
  { const thm = temaDe(deck);
    L.push('\\definecolor{erlenfondo}{HTML}{' + (thm.bg || '#FFFFFF').slice(1).toUpperCase() + '}');
    L.push('\\definecolor{erlenacento}{HTML}{' + (thm.acc || '#C0392B').slice(1).toUpperCase() + '}'); }
  teoremasPreambulo(deck).forEach(x => L.push(x));
  const hayEscala = deck.slides.some(sl => zonas(sl).some(z => z.some(b => b.type === 'image' && b.escala)));
  if (haySmart || hayPie || pieTxt || hayEscala || hayQuim || haySangre) {
    L.push('\\usepackage{tikz}');
    if (haySmart || hayQuim) L.push('\\usetikzlibrary{arrows.meta, calc}');
  }
  if (hasPlot) {
    L.push('\\usepackage{pgfplots}');
    L.push('\\pgfplotsset{compat=1.18}');
    /* La misma paleta que en pantalla (la segura para daltonismo, salvo que se apague). */
    const pal = chartPalette(deck).series;
    PGF_COLORS.forEach((n, i) => L.push('\\definecolor{' + n + '}{HTML}{' + (pal[i % pal.length] || '#000000').slice(1).toUpperCase() + '}'));
  }
  /* Sin babel en español, LaTeX rotula «Figure» y «Table»: se fija a mano
     para que el PDF salga igual esté o no instalado el paquete de idioma. */
  L.push('\\renewcommand{\\figurename}{Figura}');
  L.push('\\renewcommand{\\tablename}{Tabla}');
  L.push('\\usepackage{siunitx}');
  L.push('\\sisetup{per-mode=symbol, range-units=single}');
  L.push('%%UNIDADES%%');
  const cfgPie = pieDe(m);
  if (cfgPie.modo === 'tema') {
    if (!m.numbers) L.push('\\setbeamertemplate{footline}{}');
    else if (th.foot === 'page') L.push('\\setbeamertemplate{footline}[frame number]');
    if (!m.footline && th.foot !== 'page') L.push('\\setbeamertemplate{footline}[frame number]');
  }
  L.push('\\setbeamertemplate{navigation symbols}{}');
  L.push('% Algunos temas (Metropolis entre ellos) insertan solos una diapositiva al');
  L.push('% empezar cada sección. Erlen ya emite la suya, así que se desactiva la');
  L.push('% automática: de otro modo cada sección saldría dos veces y la numeración');
  L.push('% del PDF dejaría de coincidir con la de la app.');
  L.push('\\AtBeginSection{}');
  L.push('\\AtBeginSubsection{}');
  const cfgNotas = notasDe(m);
  if (cfgNotas.modo === 'paginas') {
    L.push('% Después de cada diapositiva se imprime una página con sus notas.');
    L.push('\\setbeameroption{show notes}');
  } else if (cfgNotas.modo === 'derecha' || cfgNotas.modo === 'abajo') {
    L.push('% Página al doble de tamaño: la diapositiva y, al lado, las notas.');
    L.push('\\usepackage{pgfpages}');
    L.push('\\setbeameroption{show notes on second screen=' + (cfgNotas.modo === 'derecha' ? 'right' : 'bottom') + '}');
  }
  if (hayLogo) {
    L.push('');
    L.push('% Logotipo institucional. Descárgalo con «Descargar figuras» y súbelo junto');
    L.push('% a este archivo: si falta, el documento compila igual y solo se omite.');
    L.push('\\newcommand{\\erlenlogo}[1]{%');
    L.push('  \\IfFileExists{logo-erlen.png}{\\includegraphics[#1]{logo-erlen.png}}{%');
    L.push('  \\IfFileExists{logo-erlen.pdf}{\\includegraphics[#1]{logo-erlen.pdf}}{%');
    L.push('  \\IfFileExists{logo-erlen.jpg}{\\includegraphics[#1]{logo-erlen.jpg}}{}}}}');
  }
  if (hayPie || pieTxt) {
    L.push('');
    L.push('% Logotipo y leyenda al pie de cada diapositiva (necesita dos pasadas).');
    L.push('\\addtobeamertemplate{footline}{}{%');
    L.push('  \\begin{tikzpicture}[remember picture,overlay]');
    if (hayPie) L.push('    \\node[anchor=south east,inner sep=0pt,xshift=-14pt,yshift=15pt] at (current page.south east) {\\erlenlogo{height=0.062\\paperheight}};');
    if (pieTxt) L.push('    \\node[anchor=south west,inner sep=0pt,xshift=14pt,yshift=17pt,text width=0.55\\paperwidth,align=left] at (current page.south west) {\\tiny ' + texInline(pieTxt) + '};');
    L.push('  \\end{tikzpicture}}');
  }
  if (hasImg) {
    L.push('');
    L.push('% Inserta la figura si el archivo existe; si no, deja un recuadro con su nombre,');
    L.push('% de modo que el documento compile aunque aún no hayas subido las imágenes.');
    L.push('\\newcommand{\\erlenfig}[2]{%');
    L.push('  \\IfFileExists{#2.png}{\\includegraphics[width=#1\\linewidth]{#2.png}}{%');
    L.push('  \\IfFileExists{#2.pdf}{\\includegraphics[width=#1\\linewidth]{#2.pdf}}{%');
    L.push('  \\IfFileExists{#2.jpg}{\\includegraphics[width=#1\\linewidth]{#2.jpg}}{%');
    L.push('  \\fbox{\\parbox[c][0.24\\textheight][c]{#1\\linewidth}{\\centering\\small Falta la imagen \\texttt{#2}}}}}}}');
    if (haySangre) {
      L.push('');
      L.push('% Figura a sangre: cubre la diapositiva entera.');
      L.push('\\newcommand{\\erlensangre}[1]{%');
      L.push('  \\IfFileExists{#1.png}{\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio]{#1.png}}{%');
      L.push('  \\IfFileExists{#1.pdf}{\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio]{#1.pdf}}{%');
      L.push('  \\IfFileExists{#1.jpg}{\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio]{#1.jpg}}{%');
      L.push('  \\parbox[c][0.62\\paperheight][c]{0.9\\paperwidth}{\\centering\\small Falta la imagen \\texttt{#1}}}}}}');
    }
    if (deck.slides.some(sl => zonas(sl).some(z => z.some(b => b.type === 'image' && b.escala)))) {
      L.push('');
      L.push('% Barra de escala de micrografía: se dibuja encima de la figura.');
      L.push('% #1 ancho de la figura, #2 nombre, #3 fracción del ancho que ocupa la barra, #4 rótulo');
      L.push('\\newcommand{\\erlenescala}[4]{%');
      L.push('  \\begin{tikzpicture}');
      L.push('    \\node[inner sep=0] (im) {\\erlenfig{#1}{#2}};');
      L.push('    \\begin{scope}[shift={(im.south east)}]');
      L.push('      \\fill[black, opacity=.55] (-#3\\textwidth-0.55em-0.2em, 0.25em) rectangle (-0.2em, 1.75em);');
      L.push('      \\draw[white, line width=1.2pt] (-#3\\textwidth-0.4em, 0.55em) -- (-0.4em, 0.55em);');
      L.push('      \\node[white, anchor=south east, font=\\scriptsize\\bfseries] at (-0.4em, 0.75em) {#4};');
      L.push('    \\end{scope}');
      L.push('  \\end{tikzpicture}}');
    }
  }
  pieTex(deck).forEach(x => L.push(x));
  L.push('');
  L.push('\\title' + (m.short ? '[' + texInline(m.short) + ']' : '') + '{' + texInline(m.title) + '}');
  if (m.subtitle) L.push('\\subtitle{' + texInline(m.subtitle) + '}');
  if (m.authors) L.push('\\author{' + texInline(m.authors) + '}');
  if (m.institute) L.push('\\institute{' + texInline(m.institute) + '}');
  L.push('\\date{' + (m.date ? texInline(m.date) : '\\today') + '}');
  L.push('');
  L.push('\\begin{document}');
  L.push('');
  TEX_DECK = deck;
  let _apEmitido = false;
  deck.slides.forEach((sl, _iSl) => {
    if (typeof fueraDeRama === 'function' && fueraDeRama(sl, deck)) return;   /* no va en esta rama */
    /* Las de respaldo van tras \appendix: Beamer deja de contarlas. */
    if (typeof esRespaldo === 'function' && esRespaldo(sl) && !_apEmitido) {
      _apEmitido = true;
      L.push('');
      L.push('% ---- respaldo para preguntas: fuera de la numeración ----');
      L.push('\\appendix');
    }
    /* Marca cada diapositiva: hace el .tex legible y permite mostrar en el
       editor el fragmento que corresponde a la diapositiva actual. */
    L.push(MARCA_DIAPO + (_iSl + 1) + ' ---');
    if (sl.layout === 'title') {
      L.push('\\begin{frame}' + (cfgPie.enPortada ? '' : '[plain]'));
      if (hayLogo && (m.logoPos || 'arriba') === 'esquina') {
        L.push('  \\begin{tikzpicture}[remember picture,overlay]');
        L.push('    \\node[anchor=north east,inner sep=0pt,xshift=-22pt,yshift=-20pt] at (current page.north east) {\\erlenlogo{height=0.14\\paperheight}};');
        L.push('  \\end{tikzpicture}');
      } else if (hayLogo) {
        L.push('  \\begin{center}\\erlenlogo{width=' + (clamp(+m.logoW || 16, 5, 60) / 100).toFixed(2) + '\\paperwidth}\\end{center}');
        L.push('  \\vspace{-0.6em}');
      }
      L.push('  \\titlepage');
      cierraFrame(L, sl, deck);
    } else if (sl.layout === 'section') {
      L.push('\\section{' + texInline(sl.title) + '}');
      L.push('\\begin{frame}' + (cfgPie.enSecciones ? '' : '[plain]'));
      L.push('  \\sectionpage');
      cierraFrame(L, sl, deck);
    } else if (sl.layout === 'toc') {
      TEX_EN_TITULO = true; L.push('\\begin{frame}{' + texInline(sl.title || 'Contenido') + '}'); TEX_EN_TITULO = false;
      L.push('  \\tableofcontents');
      cierraFrame(L, sl, deck);
    } else if (sl.layout === 'twocol' || sl.layout === 'barra') {
      const esBarra = sl.layout === 'barra';
      const sp = clamp(sl.split || (esBarra ? 30 : 50), esBarra ? 20 : 25, esBarra ? 45 : 75) / 100;
      L.push(abreFrame(sl));
      L.push('  \\begin{columns}[T]');
      L.push('    \\begin{column}{' + sp.toFixed(2) + '\\textwidth}');
      if (esBarra && zt(sl, 0)) L.push('      {\\small\\bfseries ' + texInline(zt(sl, 0)) + '}\\par\\medskip');
      L.push(texBlocks(sl.blocks || [], '      '));
      L.push('    \\end{column}');
      L.push('    \\begin{column}{' + (0.96 - sp).toFixed(2) + '\\textwidth}');
      L.push(texBlocks(sl.blocks2 || [], '      '));
      L.push('    \\end{column}');
      L.push('  \\end{columns}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'comparacion') {
      L.push(abreFrame(sl));
      L.push('  \\begin{columns}[T]');
      [0, 1].forEach(i => {
        L.push('    \\begin{column}{0.47\\textwidth}');
        L.push('      \\begin{block}{' + texInline(zt(sl, i) || ('Lado ' + (i + 1))) + '}');
        L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '        '));
        L.push('      \\end{block}');
        L.push('    \\end{column}');
      });
      L.push('  \\end{columns}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'tres' || sl.layout === 'pasos') {
      const esPaso = sl.layout === 'pasos';
      L.push(abreFrame(sl));
      L.push('  \\begin{columns}[T]');
      [0, 1, 2].forEach(i => {
        L.push('    \\begin{column}{0.30\\textwidth}');
        if (esPaso) L.push('      {\\bfseries ' + (i + 1) + '.~' + texInline(zt(sl, i)) + '}\\par\\smallskip');
        L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
        L.push('    \\end{column}');
      });
      L.push('  \\end{columns}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'cuadricula') {
      L.push(abreFrame(sl));
      [[0, 1], [2, 3]].forEach((fila, f) => {
        if (f) L.push('  \\medskip');
        L.push('  \\begin{columns}[T]');
        fila.forEach(i => {
          L.push('    \\begin{column}{0.47\\textwidth}');
          L.push('      {\\bfseries ' + texInline(zt(sl, i) || ('Celda ' + (i + 1))) + '}\\par\\smallskip');
          L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
          L.push('    \\end{column}');
        });
        L.push('  \\end{columns}');
      });
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'sangre') {
      /* A sangre de verdad: la figura al tamaño del papel y la banda de texto
         anclada al borde inferior con un nodo de TikZ. */
      const bs = (sl.blocks || []).filter(x => typeof bloqueVisible !== 'function' || bloqueVisible(x, deck));
      const fig = bs.find(x => ['image', 'chart', 'func', 'galeria', 'montaje'].includes(x.type));
      const resto = bs.filter(x => x !== fig);
      L.push('\\begin{frame}[plain]');
      L.push('  \\begin{tikzpicture}[remember picture, overlay]');
      if (fig && fig.type === 'image') {
        L.push('    \\node[anchor=center, inner sep=0] at (current page.center) {\\erlensangre{' + figName(fig) + '}};');
      } else if (fig) {
        L.push('    \\node[anchor=center, inner sep=0] at (current page.center) {%');
        L.push('      \\resizebox{\\paperwidth}{!}{%');
        L.push(texBlocks([Object.assign({}, fig, { w: 100, caption: '' })], '        '));
        L.push('      }};');
      }
      const banda = [texInline(sl.title || '')].concat(resto.map(x => texBlockText(x.text || x.body || ''))).filter(Boolean);
      if (banda.length) {
        L.push('    \\node[anchor=south, inner sep=0] at (current page.south) {%');
        L.push('      \\begin{tikzpicture}');
        L.push('        \\fill[black, opacity=.62] (0,0) rectangle (\\paperwidth,2.1);');
        L.push('        \\node[anchor=west, text width=\\dimexpr\\paperwidth-1.2cm\\relax, align=left, text=white, inner sep=0] at (0.6,1.05) {%');
        L.push('          {\\large\\bfseries ' + texInline(sl.title || '') + '}' + (resto.length ? '\\\\[3pt]{\\small ' + banda.slice(1).join(' ') + '}' : ''));
        L.push('        };');
        L.push('      \\end{tikzpicture}};');
      }
      L.push('  \\end{tikzpicture}');
      L.push('\\end{frame}');

    } else if (sl.layout === 'piefigura') {
      L.push(abreFrame(sl));
      L.push('  \\begin{columns}[c]');
      L.push('    \\begin{column}{0.66\\textwidth}');
      L.push(texBlocks(sl.blocks || [], '      '));
      L.push('    \\end{column}');
      L.push('    \\begin{column}{0.30\\textwidth}');
      L.push('      \\small');
      L.push(texBlocks(sl.blocks2 || [], '      '));
      L.push('    \\end{column}');
      L.push('  \\end{columns}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'zigzag') {
      L.push(abreFrame(sl));
      [[0, 1], [2, 3]].forEach((par, f) => {
        if (f) L.push('  \\medskip');
        L.push('  \\begin{columns}[c]');
        par.forEach(i => {
          const esFig = (f + par.indexOf(i)) % 2 === 0;
          L.push('    \\begin{column}{' + (esFig ? '0.56' : '0.40') + '\\textwidth}');
          if (!esFig) L.push('      \\small');
          L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
          L.push('    \\end{column}');
        });
        L.push('  \\end{columns}');
      });
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'partida') {
      L.push(abreFrame(sl));
      L.push('  \\begin{columns}[T, onlytextwidth]');
      [0, 1].forEach(i => {
        L.push('    \\begin{column}{0.48\\textwidth}');
        L.push('      {\\bfseries\\color{structure.fg} ' + texInline(zt(sl, i) || ('Mitad ' + (i + 1))) + '}\\par\\smallskip');
        L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
        L.push('    \\end{column}');
      });
      L.push('  \\end{columns}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'filas') {
      L.push(abreFrame(sl));
      [0, 1, 2].forEach(i => {
        if (i) L.push('  \\medskip\\hrule height .2pt\\medskip');
        L.push('  \\begin{columns}[T, onlytextwidth]');
        L.push('    \\begin{column}{0.21\\textwidth}');
        L.push('      {\\bfseries\\small\\color{structure.fg} ' + texInline(zt(sl, i)) + '}');
        L.push('    \\end{column}');
        L.push('    \\begin{column}{0.75\\textwidth}');
        L.push('      \\small');
        L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
        L.push('    \\end{column}');
        L.push('  \\end{columns}');
      });
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'rejilla6') {
      L.push(abreFrame(sl));
      [[0, 1, 2], [3, 4, 5]].forEach((fila, f) => {
        if (f) L.push('  \\vspace{\\stretch{1}}');
        L.push('  \\begin{columns}[T, onlytextwidth]');
        fila.forEach(i => {
          L.push('    \\begin{column}{0.30\\textwidth}');
          L.push('      {\\bfseries\\footnotesize\\color{structure.fg} ' + texInline(zt(sl, i) || ('Celda ' + (i + 1))) + '}\\par\\smallskip');
          L.push('      \\footnotesize');
          L.push(texBlocks(sl[CLAVES_ZONA[i]] || [], '      '));
          L.push('    \\end{column}');
        });
        L.push('  \\end{columns}');
      });
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'dato') {
      L.push(abreFrame(sl));
      L.push('  \\vfill');
      L.push('  \\begin{center}');
      L.push('    {\\fontsize{54}{60}\\selectfont\\bfseries\\color{structure.fg} ' + texInline(zt(sl, 0)) + '}\\par\\smallskip');
      if (zt(sl, 1)) L.push('    {\\large ' + texInline(zt(sl, 1)) + '}\\par\\medskip');
      L.push('    \\small');
      L.push(texBlocks(sl.blocks || [], '    '));
      L.push('  \\end{center}');
      L.push('  \\vfill');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'cita') {
      L.push(abreFrame(sl));
      L.push('  \\vfill');
      L.push('  \\begin{quote}');
      L.push('    \\itshape\\large');
      L.push(texBlocks(sl.blocks || [], '    '));
      L.push('  \\end{quote}');
      if (zt(sl, 0)) L.push('  \\smallskip\\hfill{\\small --- ' + texInline(zt(sl, 0)) + '}');
      L.push('  \\vfill');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'flujo') {
      L.push(abreFrame(sl));
      L.push('  \\begin{multicols}{' + clamp(sl.cols || 2, 2, 3) + '}');
      L.push(texBlocks(sl.blocks || [], '    '));
      L.push('  \\end{multicols}');
      cierraFrame(L, sl, deck);

    } else if (sl.layout === 'enunciado') {
      L.push(abreFrame(sl));
      L.push('  \\vfill');
      L.push('  \\begin{center}');
      L.push(texBlocks(sl.blocks || [], '    '));
      L.push('  \\end{center}');
      L.push('  \\vfill');
      cierraFrame(L, sl, deck);

    } else {
      L.push(abreFrame(sl));
      if (sl.vcenter) L.push('  \\vfill');
      L.push(texBlocks(sl.blocks || [], '  '));
      if (sl.vcenter) L.push('  \\vfill');
      cierraFrame(L, sl, deck);
    }
    if (sl.notes || minutosDe(sl)) {
      L.push('\\note{%');
      notaTex(sl).forEach(x => L.push(x));
      L.push('}');
    }
    L.push('');
  });
  L.push('\\end{document}');
  /* Transición del PDF: Beamer la escribe dentro de cada marco, así que se
     inserta justo después de cada \\begin{frame} de primer nivel. */
  /* Las unidades que siunitx no trae se declaran una vez, ya sabiendo cuáles
     aparecen de verdad en el documento. */
  {
    const i = L.indexOf('%%UNIDADES%%');
    if (i >= 0) L.splice(i, 1, ...declaraUnidades(L.join('\n')));
  }
  if (TEX_RETIRADO && typeof toast === 'function')
    toast('Se retiraron ' + TEX_RETIRADO + ' órdenes de LaTeX que leen archivos o ejecutan programas. Revisa esas ecuaciones antes de compilar.', 'warn');
  const tr = transDe(m);
  if (!tr.tex) return L.join('\n');
  const fuera = [];
  L.forEach(linea => {
    fuera.push(linea);
    if (linea.slice(0, 13) === '\\begin{frame}') fuera.push('  ' + tr.tex);
  });
  return fuera.join('\n');
}

/* ---------- descarga ----------
   En la app publicada se usa la capacidad "downloads" (el visor pide
   confirmación); en un navegador normal, un enlace Blob. */
async function downloadFile(filename, text, mime, altName) {
  /* Toda descarga es el final natural de una sesión: es donde vale la pena
     poner el resumen, porque el final pesa más que la duración. */
  SESION.exportes++;
  setTimeout(() => cierraSesion('Listo'), 350);
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: text }); toast('Archivo guardado'); return; }
    catch (e) {
      const code = e && e.code;
      if (code === 'declined') return;
      if (code === 'rejected_extension' && altName) {
        try { await dl.save({ filename: altName, data: text }); toast('Guardado como ' + altName); return; }
        catch (e2) { if (e2 && e2.code === 'declined') return; }
      }
      toast('No se pudo guardar el archivo aquí; copia el contenido', 'warn');
      window.ErlenDiagnostico?.reportar('descargar');
      return;
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Archivo descargado');
  } catch (e) { window.ErlenDiagnostico?.reportar('descargar'); toast('No se pudo descargar; copia el contenido', 'warn'); }
}
function exportJSON() {
  flushEdicion();
  return downloadFile(deckSlug() + '.json', JSON.stringify(S.deck, null, 2), 'application/json');
}
function deckSlug() {
  return (S.deck.meta.title || 'presentacion').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'presentacion';
}

/* ---------- PDF por impresión ---------- */
function exportPDF() {
  flushEdicion();
  const area = $('#printArea');
  area.innerHTML = '';
  const [W, H] = slideDims(S.deck);
  const style = h('style', null, `@page{size:${W}px ${H}px;margin:0}
    #printArea .pr-page{width:${W}px;height:${H}px}`);
  area.append(style);
  S.deck.slides.forEach((sl, i) => { if (typeof fueraDeRama === 'function' && fueraDeRama(sl)) return; area.append(h('div', { class: 'pr-page' }, renderSlide(S.deck, i, 'export', 99))); });
  const done = () => { setTimeout(() => { area.innerHTML = ''; }, 800); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); }, 260);
}

/* Reúne todo el CSS de la app (KaTeX incluido, con sus fuentes incrustadas).
   De las tipografías de LaTeX solo se lleva la que está en uso y sus dos
   respaldos: las demás pesarían de balde en el PNG y en el archivo imprimible. */
const FAM_FUENTE = { lm: 'TXLatinModern', lmsans: 'TXLatinSans', termes: 'TXTermes',
  pagella: 'TXPagella', schola: 'TXSchola', heros: 'TXHeros' };
function collectCSS() {
  const usa = new Set(['TXTermes', 'TXHeros']);
  const id = fuenteDe(S.deck.meta).id;
  if (FAM_FUENTE[id]) usa.add(FAM_FUENTE[id]);
  const sobra = r => {
    if (!r.style || !r.style.fontFamily) return false;
    const f = r.style.fontFamily.replace(/['"]/g, '').trim();
    return f.indexOf('TX') === 0 && !usa.has(f);
  };
  return Array.from(document.styleSheets).map(ss => {
    try {
      return Array.from(ss.cssRules)
        .filter(r => !(r.type === CSSRule.FONT_FACE_RULE && sobra(r)))
        .map(r => r.cssText).join('\n');
    } catch (e) { return ''; }
  }).join('\n');
}

/* Archivo HTML autónomo con todas las diapositivas, listo para «Imprimir → Guardar como PDF». */
function buildPrintableHTML(autoPrint) {
  const [W, H] = slideDims(S.deck);
  const wb = $('#workbench');
  wb.innerHTML = '';
  const pages = S.deck.slides.map((_, i) => {
    const d = h('div', { class: 'pr-page' }, renderSlide(S.deck, i, 'export', 99));
    wb.append(d);
    return d.outerHTML;
  });
  const css = collectCSS();
  wb.innerHTML = '';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<title>' + esc(S.deck.meta.title || 'Presentación') + '</title>' +
    '<style>' + css + '</style>' +
    '<style>@page{size:' + W + 'px ' + H + 'px;margin:0}' +
    'html,body{margin:0;padding:0;background:#8A93A6;height:auto;overflow:visible}' +
    '#printArea{display:block}' +
    '.pr-page{width:' + W + 'px;height:' + H + 'px;overflow:hidden;margin:0 auto 14px;' +
    'page-break-after:always;break-after:page}' +
    '.pr-page:last-child{page-break-after:auto;break-after:auto;margin-bottom:0}' +
    '.tip{font:14px system-ui;background:#161A26;color:#fff;padding:10px 16px;text-align:center}' +
    '@media print{.tip{display:none}.pr-page{margin:0}body{background:#fff}}</style></head><body>' +
    '<div class="tip">Imprime este archivo (Ctrl+P / Cmd+P) y elige «Guardar como PDF», con márgenes «Ninguno» y gráficos de fondo activados.</div>' +
    '<div id="printArea">' + pages.join('') + '</div>' +
    (autoPrint ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),400))<\/script>' : '') +
    '</body></html>';
}

/* ---------- menú de exportación ---------- */
function openExport(anchor) {
  const menu = h('div', { class: 'menu' });
  const item = (ic, label, sub, fn) => menu.append(h('button', { onclick: () => { closeMenus(); fn(); pistaAtajo(leeAtajo(sub), label); } },
    h('span', { class: 'mi' }, ic), h('span', null, label), sub ? h('span', { class: 'msub' }, sub) : null));
  item('✓', 'Revisar antes de presentar', 'desbordes, contraste, figuras', () => openRevision());
  item('▣', 'Simulacro de sala', 'proyector, distancia, daltonismo', () => openSala());
  item('⌾', 'Comprobar el archivo final', 'resolución, fuentes, páginas', () => openComprobacion());
  item('⏱', 'Ensayar con cronómetro', 'mide tu tiempo real por diapositiva', () => presentaEnsayo());
  menu.append(h('div', { class: 'm-sep' }));
  item('▤', 'PDF (imprimir)', 'vectorial', () => { openPdfHelp(); });
  item('∑', 'Código Beamer (.tex)', 'Overleaf', () => openTexView());
  item('{}', 'Proyecto (.json)', 'respaldo', () => exportJSON());
  item('§', 'Esqueleto de artículo (.tex)', 'afirmaciones → secciones, notas → prosa', () => exportArticulo());
  menu.append(h('div', { class: 'm-sep' }));
  item('▦', 'PowerPoint (.pptx)', 'texto y tablas editables', () => exportPPTX());
  item('▦', 'Kit de defensa (.zip)', 'tex, 4:3, json, guion y figuras', () => kitDefensa());
  item('▤', 'Folleto para repartir', '2, 3 o 6 por hoja', () => openFolleto());
  item('¶', 'Guion del orador', 'notas + miniaturas', () => exportGuion());
  item('▣', 'Imagen de esta diapositiva', 'PNG', () => exportPNG());
  item('⌁', 'SVG científico', 'gráfica o función seleccionada', () => exportFiguraSVG());
  item('⚗', 'Informe de exportación', 'advertencias por formato', () => exportInformeExportacion());
  showMenu(menu, anchor);
}

function openPdfHelp() {
  openModal({
    title: 'Exportar a PDF', size: 'modal-sm',
    body: h('div', null,
      h('p', { style: 'margin:0 0 10px;font-size:13.5px;line-height:1.6' },
        'Se abrirá el cuadro de impresión del navegador. En destino elige ',
        h('b', null, 'Guardar como PDF'), ' y verifica que:'),
      h('div', { class: 'help-grid', style: 'grid-template-columns:1fr' },
        h('div', { class: 'help-row' }, h('span', null, 'Márgenes'), h('kbd', null, 'Ninguno')),
        h('div', { class: 'help-row' }, h('span', null, 'Escala'), h('kbd', null, '100 %')),
        h('div', { class: 'help-row' }, h('span', null, 'Gráficos de fondo'), h('kbd', null, 'Activado'))),
      h('p', { class: 'hint', style: 'margin-top:10px' }, 'El PDF sale con texto y ecuaciones vectoriales, del mismo tamaño exacto de la diapositiva. En el celular la opción aparece como «Imprimir» y luego «Guardar como PDF». Si el cuadro de impresión no se abre (pasa dentro de algunos visores), descarga el archivo imprimible y ábrelo en tu navegador: hace lo mismo.')),
    foot: [
      h('span', { class: 'foot-note' }, '¿No se abre el cuadro? Usa el archivo imprimible.'),
      h('button', { class: 'btn', onclick: () => {
        closeModal();
        downloadFile(deckSlug() + '-imprimible.html', buildPrintableHTML(true), 'text/html;charset=utf-8');
      } }, 'Archivo imprimible (.html)'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); exportPDF(); } }, 'Abrir cuadro de impresión')
    ]
  });
}

function openTexView() {
  flushEdicion();
  const tex = toBeamer(S.deck);
  const pre = h('div', { class: 'code-view' }, tex);
  openModal({
    title: 'Código Beamer (.tex)', size: 'modal-lg',
    body: h('div', null,
      h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'Este es el LaTeX real de tu presentación, listo para Overleaf. Compila tal cual, aunque todavía no subas las figuras: donde falte una, aparece un recuadro con su nombre. Descárgalas con el botón de abajo y súbelas al proyecto sin cambiarles el nombre.'),
      pre),
    foot: [
      figCount() ? h('button', { class: 'btn', onclick: exportFigures }, `Descargar figuras (${figCount()})`) : null,
      h('button', { class: 'btn', onclick: async () => { const ok = await copyText(tex); toast(ok ? 'Código copiado al portapapeles' : 'No se pudo copiar; selecciona el texto manualmente', ok ? '' : 'warn'); } }, 'Copiar todo'),
      h('button', { class: 'btn btn-pri', onclick: () => downloadFile(deckSlug() + '.tex', tex, 'text/plain;charset=utf-8', deckSlug() + '-beamer.txt') }, 'Descargar')
    ]
  });
}

/* ---------- figuras para Overleaf ---------- */
function allImageBlocks() {
  const out = [];
  S.deck.slides.forEach(sl => CLAVES_ZONA.reduce((a, z) => a.concat(sl[z] || []), [])
    .forEach(b => {
      if (b.type === 'image' && b.src) out.push(b);
      if (b.type === 'image' && b.despues && b.despues.src) out.push(Object.assign({}, b, { src: b.despues.src, _nom: figName(b) + '-despues', despues: null }));
      /* cada figura de una galería viaja con su propio nombre */
      if (b.type === 'galeria' && b.gal && Array.isArray(b.gal.imgs))
        b.gal.imgs.forEach((im, i) => { if (im.src) out.push({ type: 'image', id: b.id, src: im.src, est: b.est, _nom: galNombre(b, i) }); });
    }));
  return out;
}
const figCount = () => allImageBlocks().length + (S.deck.meta.logo ? 1 : 0);

function dataUriToBlob(uri) {
  /* Un data: puede traer más parámetros que base64 —los SVG suelen venir como
     «data:image/svg+xml;utf8,…»— y antes eso hacía fallar la exportación. */
  const m = /^data:([^,;]*)((?:;[^,;]*)*),(.*)$/s.exec(uri);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const b64 = /;base64/i.test(m[2] || '');
  const data = b64 ? atob(m[3]) : decodeURIComponent(m[3]);
  const arr = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), mime };
}
async function exportFigures() {
  /* El estilo (forma, marco, sombra, filtro) se cuece aquí: así el archivo que
     subes a Overleaf ya trae el mismo aspecto que ves en pantalla. */
  const bloques = allImageBlocks();
  const imgs = [];
  for (const b of bloques) imgs.push({ nombre: b._nom || figName(b), src: await imagenProcesada(b, S.deck) });
  if (S.deck.meta.logo) imgs.unshift({ nombre: 'logo-erlen', src: S.deck.meta.logo });
  if (!imgs.length) { toast('Esta presentación no tiene figuras'); return; }
  let n = 0;
  for (const b of imgs) {
    const d = dataUriToBlob(b.src);
    if (!d) continue;
    const ext = d.mime.includes('svg') ? 'svg' : d.mime.includes('jpeg') ? 'jpg' : 'png';
    await downloadFile(b.nombre + '.' + ext, d.blob, d.mime);
    n++;
    await new Promise(r => setTimeout(r, 400));
  }
  if (n) toast(n + (n === 1 ? ' figura lista' : ' figuras listas') + ' para Overleaf');
}

/* ---------- PNG de la diapositiva actual ---------- */
function exportPNG() {
  toast('Preparando imagen…');
  const [W, H] = slideDims(S.deck);
  const node = renderSlide(S.deck, S.cur, 'export', 99);
  const wb = $('#workbench');
  wb.innerHTML = ''; wb.append(node);
  setTimeout(() => {
    try {
      const cssText = collectCSS();
      const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px">${htmlAXml(node.outerHTML)}</div>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style type="text/css"><![CDATA[${cssText}]]></style></defs><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
      const img = new Image();
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      img.onload = () => {
        const cv = h('canvas'); cv.width = W * 2; cv.height = H * 2;
        const cx = cv.getContext('2d'); cx.scale(2, 2); cx.drawImage(img, 0, 0);
        cv.toBlob(b => {
          if (!b) { toast('No se pudo generar la imagen; usa la exportación a PDF', 'warn'); return; }
          const u = URL.createObjectURL(b);
          const a = h('a', { href: u, download: `diapositiva-${S.cur + 1}.png` });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 4000);
          toast('Imagen descargada');
        }, 'image/png');
        wb.innerHTML = '';
      };
      img.onerror = () => { wb.innerHTML = ''; toast('No se pudo generar la imagen; usa la exportación a PDF', 'warn'); };
      img.src = url;
    } catch (e) { wb.innerHTML = ''; toast('No se pudo generar la imagen; usa la exportación a PDF', 'warn'); }
  }, 120);
}
