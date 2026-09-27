# Extensión: informe de Erlen DoE

Convierte un informe de Erlen DoE (tipo `informe-v1`: matriz del diseño, efectos, ANOVA, figuras) en una presentación, con la misma conversión que el editor usa en «Abrir el informe de DoE como presentación» (`src/js/88e-informe.js`).

## Qué archivo acepta

Un JSON de la carpeta de trabajo, de una de estas dos formas:

- **La copia de intercambio** que DoE descarga fuera de la suite, `erlen-copia-slides-<id8>.json` (`{version: 2, id, source, target, createdAt, payloadJSON, sha256}`). Se verifica con `verifyTransfer` de `web/exchange-v2.mjs`, el transporte del editor: una copia modificada o dirigida a otra aplicación se rechaza.
- **El informe suelto** (`{format: 'erlen-context-copy-v1', kind: 'informe-v1', source: {tool: 'doe', …}, snapshot: {…}}`). Como no trae copia, la procedencia lleva el nombre del archivo, el SHA-256 de sus bytes y su fecha de modificación como fecha de envío; la respuesta lo avisa.

En los dos casos el informe pasa por `leeInforme`. Si no es válido, el error es el motivo de `leeInforme` tal cual (por ejemplo «La sección 1, bloque 1 es de tipo «imagen», que el tipo informe-v1 no define.») y no se escribe nada. Los límites son `INFORME_LIMITES`, generados en el build desde `src/contratos/informe-v1-limites.json`.

## Herramientas

- `vista_previa_informe {archivo_informe}`: valida y resume sin escribir. Devuelve `forma` (copia verificada o informe suelto), `contenido` (secciones, cuántos párrafos, listas, tablas y figuras; filas y columnas de cada tabla; series, puntos, marcas y regiones de cada figura), `lista` de diapositivas que se crearían, `avisos_conversion`, `procedencia`, `simulado` y los `limites` del tipo.
- `importar_informe_doe {archivo_informe, archivo, sobrescribir?, titulo?, subtitulo?, autores?, institucion?, fecha?, tema?, acento?}`: crea el proyecto `archivo`. No sobrescribe salvo `sobrescribir: true`, y entonces la versión anterior queda en el historial (`deshacer`); el proyecto nunca puede ocupar el archivo del informe. Devuelve la `lista` de diapositivas, los `avisos_conversion`, los `avisos` de validación, la `procedencia` (`meta.origen` del proyecto) y `notas` con los siguientes pasos.

Y el *prompt* `charla_desde_informe_doe {archivo_informe, minutos?}`: vista previa, importación, revisión y una diapositiva de conclusiones sin inventar resultados.

## Lo que no cambia

- Ninguna cifra: las celdas se muestran como las escribe `informeADeck` (hasta seis cifras significativas) y el valor completo sigue en DoE.
- Los recortes (filas, columnas, celdas largas, series reducidas conservando mínimo y máximo de cada tramo, marcas y regiones que pasan a las notas) los decide `informeADeck`, se dicen en el pie y en las notas de la diapositiva y llegan al asistente en `avisos_conversion`.
- La diapositiva de procedencia va al final, con la copia y su SHA-256; `meta.origen` guarda lo mismo en el proyecto.
- Si el informe declara datos simulados, la portada, cada diapositiva y la procedencia lo dicen; un `subtitulo` propio conserva «DATOS SIMULADOS».

Los metadatos opcionales pasan por la operación `metadatos` del catálogo, con sus mismas comprobaciones. El reparto de texto y tablas se midió con el tema Metropolis en 16:9: con otro `tema`, conviene mirar `vista_previa`.

Pruebas: `tests/mcp-doe.test.mjs`.
