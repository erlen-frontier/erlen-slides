# Componentes y atribuciones

La licencia AGPL-3.0-only cubre el trabajo original de Erlen Slides. Las bibliotecas, fuentes y dependencias externas conservan sus licencias. Los textos redistribuidos están en [licenses](licenses/).

| Componente | Uso | Licencia / origen |
|---|---|---|
| KaTeX 0.16.11 | Matemáticas y fuentes KaTeX | MIT · https://github.com/KaTeX/KaTeX/tree/v0.16.11 |
| mhchem incluido con KaTeX | Reacciones y unidades | Adaptación MIT, parser Apache-2.0; ver `licenses/mhchem-NOTICE.txt` |
| Latin Modern y TeX Gyre | Familias TXLatinModern, TXLatinSans, TXHeros, TXPagella, TXSchola, TXTermes | GUST Font License / LPPL 1.3c o posterior · https://www.gust.org.pl/projects/e-foundry |
| RDKit JS | Análisis molecular en WebAssembly | BSD-3-Clause · https://github.com/rdkit/rdkit-js |
| Kekule.js | Edición de moléculas | MIT · https://github.com/partridgejiang/Kekule.js |
| 3Dmol.js | Estructuras tridimensionales | BSD-3-Clause y avisos de dependencias · https://github.com/3dmol/3Dmol.js |
| Plotly.js basic | Gráficas desde datos | MIT · https://github.com/plotly/plotly.js |
| Floating UI | Posicionamiento de interfaz | MIT · https://github.com/floating-ui/floating-ui |
| Intercambio de copias de Erlen Suite (`web/exchange-v2.mjs`) | Leer la copia que DoE envía a Slides | MIT · Erlen contributors; aviso íntegro en el propio archivo y en `src/js/88d-intercambio.js` |
| Lucide | Iconos de interfaz | ISC; ver texto que incluye atribuciones adicionales · https://github.com/lucide-icons/lucide |

`licenses/components.json` registra las versiones npm utilizadas. `licenses/embedded-assets.json` identifica con SHA-256 los archivos tipográficos y KaTeX heredados. Las fuentes WOFF2 están incrustadas en CSS; el build las conserva, no las recompila. Sus creadores incluyen Bogusław Jackowski, Janusz M. Nowacki y los colaboradores de GUST e-foundry; los derivados TeX Gyre conservan los créditos de las familias originales.

Los paquetes de pruebas, incluidos JSDOM y fake-indexeddb, se obtienen mediante npm y conservan sus avisos en el paquete instalado. Los ejemplos, diagramas y datos ilustrativos nuevos son originales del proyecto. No se incluyen artículos ajenos, logotipos institucionales ni investigaciones privadas.
