# Publicar versiones y conservarlas en Zenodo

Repositorio público: `erlen-frontier/erlen-slides`. El repositorio privado `project-memories` no forma parte de esta distribución ni debe enviarse a Zenodo.

## Preparar una versión

Este repositorio trabaja sin CI ni revisión de código garantizada. La preparación se realiza localmente y la publicación de releases es manual. La autorización para publicar no equivale a una revisión técnica del código ni certifica sus resultados. No añadas automatización como requisito de este proceso.

1. Actualiza de forma coherente `package.json`, `package-lock.json`, `CITATION.cff` y `.zenodo.json` para la versión que se va a publicar. Describe sus funciones y ejemplos reales, no los de otra versión. No inventes fechas de publicación ni DOI; confirma la fecha de la release antes de fijarla en los metadatos.
2. Cuando el entorno lo permita, ejecuta `npm ci`, `npm run build`, `npm test` y `npm run examples`. Registra los comandos, resultados, omisiones y limitaciones. Las comprobaciones no realizadas se declaran como pendientes; los resultados históricos no validan automáticamente el código actual.
3. Comprueba capturas y exportaciones cuando dispongas del entorno, y revisa licencia, datos de ejemplo y ausencia de secretos. Documenta el alcance real: una prueba estructural no sustituye la inspección visual ni certifica compatibilidad con todas las aplicaciones.
4. Ejecuta `python3 herramientas/package-release.py` para obtener el ZIP web y su checksum. Si no puedes generar el paquete, no lo describas como disponible ni publiques un artefacto inexistente.
5. Escribe las notas de la versión en `docs/publicacion-<version>.md`. Distingue los antecedentes históricos de las funciones actuales y no sobrescribas silenciosamente notas de otra distribución que use el mismo número de versión.
6. Con autorización explícita del propietario, publica manualmente una release con la etiqueta `v<version>`, las notas, el ZIP generado y su suma SHA-256. La etiqueta debe coincidir con la versión de `package.json`. Informa de las comprobaciones que no se hayan realizado; no presupongas checks de GitHub Actions ni revisión posterior del código.

## Zenodo

Zenodo requiere que el propietario conecte su cuenta de GitHub y habilite el repositorio en su panel GitHub. Usa **Sync now** si el repositorio nuevo no aparece. Las releases nuevas del repositorio habilitado pueden archivarse mediante la integración. Esta integración de archivo es opcional y distinta de CI; no implica sincronizar Lámina con Erlen Suite.

- [Habilitar repositorio](https://help.zenodo.org/docs/github/enable-repository/)
- [Metadatos .zenodo.json](https://help.zenodo.org/docs/github/describe-software/zenodo-json/)
- [Archivo de versiones](https://help.zenodo.org/docs/github/archive-software/github-upload/)

Este repositorio incluye `.zenodo.json` y `CITATION.cff`. Zenodo da prioridad a `.zenodo.json` al archivar releases. Mantén los dos archivos sincronizados con la publicación concreta. Los metadatos del código en preparación no prueban que exista un paquete publicado o un depósito.

Verifica título, autor, licencia y archivos del depósito antes de publicar. No uses el token de GitHub como token de Zenodo. No guardes credenciales en el código. Después del depósito, anota el DOI real y los enlaces en las notas de versión y documentación; distingue el DOI de una versión del DOI que agrupa versiones.

Si ya existía una release antes de habilitar la integración, sigue el flujo de carga de Zenodo para ese archivo o crea una siguiente versión revisada. No afirmes que una release antigua quedó archivada solo por encender la integración.
