# Extensión: bibliografía

Traer al proyecto las referencias que la persona ya tiene (Zotero, Mendeley, JabRef, la web de la revista), citarlas por su clave y, solo si se permite la red, completarlas con Crossref. Archivos: `mcp/extensiones/bibliografia.mjs` (herramientas, lectura de archivos y Crossref) y `bibliografia.pagina.js` (dentro del editor, con sus mismos lectores de `57-citas.js` y `61-zotero.js`).

Ninguna herramienta inventa datos: lo que no está en el archivo o en Crossref se queda vacío y se informa.

## `importar_bibliografia`

`{archivo, archivo_bib}` o `{archivo, texto}`; `formato` (`bib` o `ris`) solo si la extensión no lo deja claro.

- **BibTeX**: varias entradas, llaves anidadas, comillas, `#`, macros `@string`, meses (`month = mar`), `@comment` y `@preamble` ignorados. Acentos de LaTeX a Unicode (`{\'e}`, `\"{u}`, `\c{c}`, `{\O}`, `{\ss}`…), `--` a raya corta en las páginas, órdenes como `\emph{}` o `\textsubscript{}` a su texto; lo que va entre `$…$` se conserva porque el editor lo dibuja. Autores separados por `and`; un nombre entre llaves (`{Consorcio X}`) es una institución y `and others` es «et al.».
- **RIS**: `TY` abre y `ER` cierra; `AU`/`A1`, `TI`/`T1`, `T2`/`JO`/`JF`, `PY`/`Y1`, `VL`, `SP`–`EP`, `DO` (se quita `https://doi.org/`), `UR`, `ID` como clave. Las líneas sin etiqueta continúan el valor anterior.
- **Sin duplicar**: una entrada ya está si coincide el DOI (sin distinguir mayúsculas) o el título normalizado con el mismo año (si a una le falta el año, basta el título); sin título ni DOI, los autores y el año. También dentro del mismo archivo.
- **Claves**: la de BibTeX (o el `ID` de RIS) se conserva si es válida (`^[A-Za-z0-9]{1,40}$`); si no, se limpia (`garcia:2019-b` → `garcia2019b`) o se deriva de autor y año como en el editor, y si ya existe se le añade `b`, `c`…
- **Autores muy largos**: el proyecto guarda hasta 400 caracteres; antes de cortar a media palabra se quitan nombres enteros del final y se pone «et al.».
- Si el archivo no está en UTF-8 (acentos como «�»), la respuesta lo avisa.

Respuesta: `entradas`, `agregadas` (`clave`, `id`, `cita` corta), `duplicadas` (qué referencia ya estaba y por qué), `problemas` (les falta `autores`, `titulo` o `anio`, o se recortaron autores), `claves_cambiadas` (original, nueva y motivo) y `descartadas` (sin autores, título ni DOI). Importar no cita nada.

## `citar`

`{archivo, diapositiva, claves: [...], bloque_referencias?}`. Pone las referencias al pie de la diapositiva (`citas`), sin repetir las que ya estaban. Una clave desconocida es un error que no cambia nada y que sugiere la clave con otras mayúsculas si existe. La respuesta da, para cada cita al pie, el número que toma en el estilo de la charla (se renumera sola por orden de aparición).

Con `bloque_referencias: true` se asegura la lista de referencias: si ya hay un bloque `refs` propio se respeta; con la bibliografía automática (lo normal) se crea ya la diapositiva que mantiene el editor, que crece, se parte en varias y desaparece según lo citado; si está apagada, se añade una diapositiva «Referencias» propia al final.

Para citar dentro de un texto, basta escribir `[@clave]` o `[@una; @otra]` con `editar_bloque`.

## `completar_por_doi`

`{archivo, doi, clave?}`. Consulta `https://api.crossref.org/works/{doi}` y:

- si hay una referencia con ese DOI, rellena **solo** sus campos vacíos; lo que difiere se devuelve en `discrepancias` sin tocarlo;
- si no, y se da `clave` de una referencia sin DOI, la completa solo si su título coincide con el de Crossref;
- si no, y hay una referencia sin DOI con el mismo título y año (una importada de un .bib que no lo traía), completa esa y le pone el DOI;
- si no, la añade como referencia nueva (con `clave` si se dio y no existía, o una derivada de autor y año).

Los títulos de Crossref vienen con marcado JATS: `<sub>2</sub>` pasa a «₂» y el resto de etiquetas se quita. `siguen_vacios` dice qué campos no trae Crossref.

Está **apagada por omisión**, porque sale a internet. Para activarla, en la configuración del cliente MCP:

```json
"env": {"ERLEN_SLIDES_DIR": "…", "ERLEN_SLIDES_RED": "1", "ERLEN_SLIDES_CORREO": "tu@correo"}
```

`ERLEN_SLIDES_CORREO` es opcional: va en el `User-Agent` (`ErlenSlides/<versión> (https://github.com/erlen-frontier/erlen-slides; mailto:…)`), como pide Crossref para su servicio «polite». Sin `ERLEN_SLIDES_RED=1` la herramienta responde con un error que explica esto y no toca el proyecto. La consulta espera como mucho 15 s. `ERLEN_SLIDES_CROSSREF` cambia la dirección de Crossref y solo lo usan las pruebas, con un servidor local.

## Revisión

`revisar_presentacion` añade en `adicional` (regla `bibliografia`) las `[@clave]` que no existen (en pantalla saldrían como «[cita perdida]») y las referencias citadas a las que les falta autores, título, año o dónde encontrarlas.

## Prompt y convención

`citar_desde_bibliografia` (archivo, bibliografía) guía el flujo: importar, proponer qué referencia respalda cada diapositiva y citar tras el visto bueno. `guia_formato` incluye la convención `bibliografia`.

## Cambios en el editor

El lector de BibTeX del panel de Referencias es el mismo, así que también gana: ya no confunde `booktitle` con `title`, lee llaves anidadas y acentos de LaTeX, conserva las instituciones entre llaves, entiende `and others`, lee la forma `@article(…)` y las macros `@string`, quita los escapes de LaTeX del DOI, y una arroba suelta en un comentario ya no se come la entrada siguiente. La traducción de Crossref (`refDesdeCrossref`) quita el marcado JATS de los títulos. Los nombres entre llaves ya no se parten por un «and» o «y» interior. Y la diapositiva de referencias pone el volumen en negrita: antes enseñaba `**12**` con los asteriscos.

Pruebas: `tests/mcp-bibliografia.test.mjs`, con referencias ficticias en `tests/fixtures/bibliografia/` (prefijo de pruebas `10.5555` de Crossref) y un Crossref simulado en `127.0.0.1`; ninguna sale a internet.
