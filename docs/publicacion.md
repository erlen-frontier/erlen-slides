# Publicar versiones y conservarlas en Zenodo

Repositorio público: `erlen-frontier/erlen-slides`. El repositorio privado `project-memories` no forma parte de esta distribución ni debe enviarse a Zenodo.

## Crear una versión revisable

1. Actualiza de forma coherente package.json, package-lock.json, CITATION.cff y .zenodo.json.
2. Ejecuta `npm ci`, `npm run build`, `npm test` y `npm run examples`.
3. Revisa capturas y exportaciones, licencia, datos de ejemplo y ausencia de secretos.
4. Ejecuta `python3 herramientas/package-release.py` para obtener el ZIP web y su checksum.
5. Escribe las notas en `docs/publicacion-<version>.md`.
6. Tras la revisión del propietario, publica manualmente una release con la etiqueta
   `v<version>`, las notas, el ZIP y su suma SHA-256. La etiqueta debe coincidir con la
   versión de `package.json`. La política actual retira GitHub Actions y la publicación
   automática, pero este repositorio aún conserva workflows históricos. Antes de crear
   una etiqueta o release, comprueba que Actions esté deshabilitado en el repositorio;
   de lo contrario esos workflows podrían ejecutarse.

## Zenodo

Zenodo requiere que el propietario conecte su cuenta de GitHub y habilite el repositorio en su panel GitHub. Usa **Sync now** si el repositorio nuevo no aparece. Las releases nuevas del repositorio habilitado pueden archivarse mediante la integración.

- [Habilitar repositorio](https://help.zenodo.org/docs/github/enable-repository/)
- [Metadatos .zenodo.json](https://help.zenodo.org/docs/github/describe-software/zenodo-json/)
- [Archivo de versiones](https://help.zenodo.org/docs/github/archive-software/github-upload/)

Este repositorio incluye .zenodo.json y CITATION.cff. Zenodo da prioridad a .zenodo.json al archivar releases. Mantén los dos archivos sincronizados.

Verifica título, autor, licencia y archivos del depósito antes de publicar. No uses el token de GitHub como token de Zenodo. No guardes credenciales en el código. Después del depósito, anota el DOI real y los enlaces en las notas de versión y documentación; distingue el DOI de una versión del DOI que agrupa versiones.

Si ya existía una release antes de habilitar la integración, sigue el flujo de carga de Zenodo para ese archivo o crea una siguiente versión revisada. No afirmes que una release antigua quedó archivada solo por encender la integración.
