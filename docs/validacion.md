# Validación de 0.2.1

Comprobaciones del 9 de septiembre de 2026, sobre esta distribución independiente:

| Comprobación | Resultado y alcance |
|---|---|
| Dependencias | Instalación aislada desde npm; lockfile portable, sin enlaces a rutas del equipo original |
| Build | 90 módulos; aplicación sin configuración de producción ni fuentes externas automáticas |
| Tests | 80 casos, incluidos los controles de auditoría científica, plantilla afirmación-evidencia, procedencia, exportación SVG, informe por formato y accesibilidad del build |
| Ejemplos | 12 proyectos, 72 diapositivas; validación JSON, render DOM de cada diapositiva, ausencia de errores KaTeX y generación Beamer |
| Guardado | Conservar una presentación con nombre al abrir otro ejemplo; navegación y enlace directo de ejemplo |
| PowerPoint | Generado un archivo con texto, tabla y notas; integridad ZIP, XML parseable y contenido conservado. Una prueba automática arma el paquete con una rama activa y comprueba CRC, partes declaradas y referencias. Los paquetes de cuatro ejemplos se abrieron además con un lector OOXML independiente (python-pptx 1.0.2) y se convirtieron a PDF con LibreOffice Impress 24.2: 6 páginas cada uno, ninguna en blanco, con el SmartArt, las estructuras, los montajes, la geometría y las gráficas presentes. **No se ha abierto en Microsoft PowerPoint** |
| RDKit real | RDKit 2025.03.4 analizó etanol, SMILES CCO; masa monoisotópica calculada 46.04186 |
| Inspección visual | Capturas Firefox: inicio, editor, química, presentación y móvil de 390 × 844. La composición vertical se comprobó además en Chromium a 390 × 844, 360 × 640, 768 × 1024 y en apaisado, y el lienzo de estructuras con la aplicación en claro y en oscuro. Las barras de error, el eje logarítmico y el rótulo del eje Y con unidades se revisaron en Chromium |
| Privacidad del build | Sin endpoints de producción, SDK de Supabase o fuentes Google automáticas |

Los tests de DOM usan JSDOM y almacenamiento aislado; no prueban medidas de pantalla reales, y JSDOM no implementa `innerText`, así que el guardado del texto tecleado se comprueba en navegador y no en la suite. Las capturas complementan esa limitación. No se ha verificado visualmente el PPTX en Microsoft PowerPoint, ni compilado los ejemplos TEX con una distribución LaTeX. La comprobación real de RDKit no equivale a validar todas sus operaciones ni las herramientas 3D.

`npm test` ejecuta los diez archivos de pruebas. Algunas versiones de Node muestran diez grupos en el resumen; ejecutando cada archivo directamente se muestran sus 80 casos. No se atribuye a esta distribución el resultado histórico de pruebas de la suite completa.

## Calidad científica y trazabilidad — 17 de septiembre de 2026

La auditoría integrada revisa datos de gráficas, ejes, unidades indicadas, dominios logarítmicos, incertidumbres, pies, encabezados de tablas y procedencia declarada. La plantilla afirmación-evidencia crea un diseño `twocol` compatible con JSON v1 y marca sus datos como ilustrativos. Los paquetes de figuras y kits incorporan `provenance.json` con hashes de datos y metadatos de fuente cuando existen. La exportación SVG produce una figura vectorial autónoma; el informe JSON clasifica riesgos para PDF, Beamer, PowerPoint y SVG. Las pestañas del inspector exponen roles y estados WAI-ARIA; los tests de DOM comprueban el contrato, mientras que la validación visual con lectores de pantalla queda pendiente.
