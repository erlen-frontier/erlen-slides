# Procedencia del catálogo de figuras

El dibujador `catalog.mjs`, el índice `assets/registry-index.mjs` y los 124 lotes de `assets/chunks/` se conservaron de Erlen Figures 0.21.0, en el commit `c8e743be0c0b88433cdf7a2807e6757c03e873af` de Erlen Suite. El dibujador está bajo AGPL-3.0-only; las 221 piezas heredadas de Slides mantienen esa licencia y las 73 piezas originales de Figures declaran la misma.

Los 706 SVG normalizados tienen licencias propias: Bioicons (CC BY 3.0, CC BY 4.0 o CC0 según cada autor), Health Icons (CC0), Tabler Icons (MIT) y diagramas de Janosh y otros autores (MIT). El índice identifica para cada pieza su autor, licencia y enlace, ruta y commit de origen, huella SHA-256 original y normalizada, y modificaciones. Los avisos MIT completos se distribuyen en `licenses/figures-catalog-MIT.txt` y se conservan además en el índice.

`index.mjs` es el adaptador de Tabula: busca sin conexión, carga cada lote cuando se necesita y genera SVG con la procedencia y los créditos de la pieza. Los términos de la licencia de cada dibujo externo no se sustituyen por la AGPL de la aplicación.
