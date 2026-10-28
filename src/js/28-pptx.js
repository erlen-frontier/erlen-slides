/* ==== 28-pptx.js ==== */
'use strict';
/* ================= .pptx: empaquetado ================= */

const TEMA_XML = XMLCAB +
'<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Erlen">' +
'<a:themeElements><a:clrScheme name="Erlen">' +
'<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
'<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
'<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
'<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
'<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
'<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
'<a:fontScheme name="Erlen"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
'<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
'<a:fmtScheme name="Erlen">' +
'<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
'<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
'<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
'<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>' +
'<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>' +
'<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
'<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
'</a:fmtScheme></a:themeElements></a:theme>';

const ARBOL_VACIO = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
const MAPA_COLOR = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
  'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';

const MAESTRA_XML = XMLCAB + '<p:sldMaster ' + NS + '><p:cSld>' + ARBOL_VACIO + '</p:cSld>' + MAPA_COLOR +
  '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
  '<p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle>' +
  '<p:bodyStyle><a:lvl1pPr><a:defRPr sz="2400"/></a:lvl1pPr></p:bodyStyle>' +
  '<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>';
const DISENO_XML = XMLCAB + '<p:sldLayout ' + NS + ' type="blank" preserve="1"><p:cSld name="En blanco">' +
  ARBOL_VACIO + '</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
const MAESTRA_NOTAS_XML = XMLCAB + '<p:notesMaster ' + NS + '><p:cSld>' + ARBOL_VACIO + '</p:cSld>' + MAPA_COLOR +
  '<p:notesStyle><a:lvl1pPr><a:defRPr sz="1200"/></a:lvl1pPr></p:notesStyle></p:notesMaster>';

const rel = (id, tipo, destino) => '<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + tipo + '" Target="' + destino + '"/>';
const relsDe = xs => XMLCAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + xs.join('') + '</Relationships>';

function notasXml(texto) {
  const parr = String(texto || '').split('\n').filter(l => l.trim()).map(l =>
    '<a:p><a:r><a:rPr lang="es-MX" sz="1200"/><a:t xml:space="preserve">' + xesc(l.trim()) + '</a:t></a:r></a:p>').join('') || '<a:p/>';
  return XMLCAB + '<p:notes ' + NS + '><p:cSld><p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notas"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/>' + parr + '</p:txBody></p:sp>' +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>';
}

async function exportPPTX() {
  flushEdicion();
  const aviso = toast('Armando el PowerPoint…');
  await new Promise(r => setTimeout(r, 60));
  const deck = S.deck, m = deck.meta;
  const [W, H] = slideDims(deck);
  const anchoPulg = m.aspect === '43' ? 10 : 13.333;
  const PAGE_W = Math.round(anchoPulg * EMU_PULG), PAGE_H = Math.round(7.5 * EMU_PULG);
  const esc = PAGE_W / W;                 /* px de diapositiva -> EMU */
  const ptPorPx = (anchoPulg * 72) / W;   /* px -> puntos */
  const fuente = FUENTE_PPTX[(fuenteDe(m) || {}).id] || 'Calibri';
  const th = temaDe(deck);
  const css = collectCSS();

  /* Banco propio, no el compartido. La exportación va con `await` en medio
     —cada figura se rasteriza— y cualquier cosa que se despierte mientras
     tanto y use `#workbench` deja la diapositiva a medio medir. Le pasaba con
     la revisión del indicador de preparación, que se recalcula «en reposo»: le
     vacía el banco y lo repone desde su HTML, con lo que los nodos que la
     exportación tenía en la mano quedan sueltos del documento. Un elemento
     suelto no tiene ni medidas ni estilo calculado, así que sus formas salían
     con `sz="NaN"` y un marco de 1 EMU, y la diapositiva llegaba en blanco al
     PowerPoint. Pasaba en dos de cada cinco exportaciones. */
  const wb = h('div', { style: 'position:absolute;left:-99999px;top:0' });
  document.body.append(wb);
  const archivos = [];
  const medios = [];           /* {nombre, bytes} */
  const cacheMedio = new Map();
  const slidesXml = [];
  const conNotas = [];

  try {
    for (let i = 0; i < deck.slides.length; i++) {
      const sl = deck.slides[i];
      if (typeof fueraDeRama === 'function' && fueraDeRama(sl, deck)) continue;
      const raiz = renderSlide(deck, i, 'export', 99);
      raiz.style.position = 'relative';
      wb.innerHTML = ''; wb.append(raiz);
      await new Promise(r => setTimeout(r, 10));
      const relsSlide = [];
      /* Cada imagen se guarda una vez y cada diapositiva la referencia. */
      const ctx = {
        esc, ptPorPx, fuente, css, id: 2, fondo: th.bg,
        medio: async uri => {
          if (cacheMedio.has(uri)) {
            const y = cacheMedio.get(uri);
            if (!relsSlide.some(x => x.rid === y.rid)) relsSlide.push(y);
            return y.rid;
          }
          let bytes;
          try { bytes = b64aBytes(uri); } catch (e) { return null; }
          const k = medios.length + 1;
          const nombre = 'imagen' + k + '.png';
          medios.push({ nombre, bytes });
          const y = { rid: 'rIdM' + k, destino: '../media/' + nombre };
          cacheMedio.set(uri, y);
          relsSlide.push(y);
          return y.rid;
        }
      };

      const formas = await formasSlide(raiz, sl, deck, i, ctx);
      const fondo = '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + hex6(th.bg) + '"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>';
      slidesXml.push(XMLCAB + '<p:sld ' + NS + '><p:cSld>' + fondo +
        '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
        formas.join('') + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');

      /* Las diapositivas fuera de la rama no se escriben: numerar por posición
         exportada, no por índice del mazo, o el paquete referencia archivos que
         no existen y PowerPoint lo da por dañado. */
      const num = slidesXml.length;
      const tieneNota = !!(sl.notes && sl.notes.trim());
      conNotas.push(tieneNota);
      const rels = [rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml')];
      relsSlide.forEach(x => rels.push(rel(x.rid, 'image', x.destino)));
      if (tieneNota) rels.push(rel('rIdN', 'notesSlide', '../notesSlides/notesSlide' + num + '.xml'));
      archivos.push({ nombre: 'ppt/slides/_rels/slide' + num + '.xml.rels', datos: relsDe(rels) });
      if (tieneNota) {
        archivos.push({ nombre: 'ppt/notesSlides/notesSlide' + num + '.xml', datos: notasXml(sl.notes) });
        archivos.push({ nombre: 'ppt/notesSlides/_rels/notesSlide' + num + '.xml.rels',
          datos: relsDe([rel('rId1', 'notesMaster', '../notesMasters/notesMaster1.xml'), rel('rId2', 'slide', '../slides/slide' + num + '.xml')]) });
      }
    }
  } finally { wb.remove(); }

  slidesXml.forEach((x, i) => archivos.push({ nombre: 'ppt/slides/slide' + (i + 1) + '.xml', datos: x }));
  medios.forEach(md => archivos.push({ nombre: 'ppt/media/' + md.nombre, datos: md.bytes }));

  const n = slidesXml.length;   /* diapositivas realmente escritas */
  const relsPres = [rel('rId1', 'slideMaster', 'slideMasters/slideMaster1.xml')];
  for (let i = 0; i < n; i++) relsPres.push(rel('rIdS' + (i + 1), 'slide', 'slides/slide' + (i + 1) + '.xml'));
  relsPres.push(rel('rIdNM', 'notesMaster', 'notesMasters/notesMaster1.xml'));
  relsPres.push(rel('rIdT', 'theme', 'theme/theme1.xml'));

  const listaSld = Array.from({ length: n }, (_, i) => '<p:sldId id="' + (256 + i) + '" r:id="rIdS' + (i + 1) + '"/>').join('');
  archivos.push({ nombre: 'ppt/presentation.xml', datos: XMLCAB + '<p:presentation ' + NS + ' saveSubsetFonts="1">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:notesMasterIdLst><p:notesMasterId r:id="rIdNM"/></p:notesMasterIdLst>' +
    '<p:sldIdLst>' + listaSld + '</p:sldIdLst>' +
    '<p:sldSz cx="' + PAGE_W + '" cy="' + PAGE_H + '"/><p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>' });
  archivos.push({ nombre: 'ppt/_rels/presentation.xml.rels', datos: relsDe(relsPres) });
  archivos.push({ nombre: 'ppt/slideMasters/slideMaster1.xml', datos: MAESTRA_XML });
  archivos.push({ nombre: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    datos: relsDe([rel('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'), rel('rId2', 'theme', '../theme/theme1.xml')]) });
  archivos.push({ nombre: 'ppt/slideLayouts/slideLayout1.xml', datos: DISENO_XML });
  archivos.push({ nombre: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    datos: relsDe([rel('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml')]) });
  archivos.push({ nombre: 'ppt/notesMasters/notesMaster1.xml', datos: MAESTRA_NOTAS_XML });
  archivos.push({ nombre: 'ppt/notesMasters/_rels/notesMaster1.xml.rels',
    datos: relsDe([rel('rId1', 'theme', '../theme/theme2.xml')]) });
  archivos.push({ nombre: 'ppt/theme/theme1.xml', datos: TEMA_XML });
  archivos.push({ nombre: 'ppt/theme/theme2.xml', datos: TEMA_XML.replace('name="Erlen"', 'name="ErlenNotas"') });

  const tiposSlide = Array.from({ length: n }, (_, i) =>
    '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('');
  const tiposNotas = conNotas.map((tiene, i) => tiene
    ? '<Override PartName="/ppt/notesSlides/notesSlide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>' : '').join('');
  archivos.unshift({ nombre: '[Content_Types].xml', datos: XMLCAB +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    tiposSlide + tiposNotas + '</Types>' });
  archivos.push({ nombre: '_rels/.rels', datos: relsDe([
    rel('rId1', 'officeDocument', 'ppt/presentation.xml'),
    rel('rId2', 'metadata/core-properties', 'docProps/core.xml'),
    rel('rId3', 'extended-properties', 'docProps/app.xml')]) });
  const ahora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  archivos.push({ nombre: 'docProps/core.xml', datos: XMLCAB +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + xesc(m.title || 'Presentación') + '</dc:title>' +
    '<dc:creator>' + xesc(m.authors || 'Tabula') + '</dc:creator>' +
    '<cp:lastModifiedBy>Tabula</cp:lastModifiedBy>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + ahora + '</dcterms:created>' +
    '<dcterms:modified xsi:type="dcterms:W3CDTF">' + ahora + '</dcterms:modified></cp:coreProperties>' });
  archivos.push({ nombre: 'docProps/app.xml', datos: XMLCAB +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>Tabula</Application><Slides>' + n + '</Slides></Properties>' });

  const blob = await armaZip(archivos);
  await downloadFile(deckSlug() + '.pptx', blob,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  if (aviso && aviso.remove) aviso.remove();
  toast('PowerPoint listo · ' + n + ' diapositivas');
  if (deck.slides.some(sl => sl.lienzoLibre && zonasDe(sl.layout) && zonas(sl).some(z => z.length)))
    openModal({ title: 'Revisar el PowerPoint', body: h('p', null, 'La posición libre puede diferir en PowerPoint; revisa el acomodo, el orden y los recortes en el archivo descargado.'),
      foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Entendido')] });
}

