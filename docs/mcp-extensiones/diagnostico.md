# Extensión: diagnóstico

`diagnostico` revisa la instalación del servidor y, para cada problema, da el comando que lo arregla. No cambia nada. Sirve cuando algo falla de forma rara o cuando el usuario pregunta si todo está bien instalado: «ejecuta el diagnóstico de Erlen Slides».

| Parte de la respuesta | Qué dice |
|---|---|
| `estado`, `problemas` | `bien` o `con_problemas`; cada problema con su `arreglo` (un comando o una instrucción que se puede dar tal cual). |
| `node` | Versión y ejecutable de Node que corre el servidor; si es anterior a 22. |
| `aplicacion` | Versión de Erlen Slides, carpeta del código, ruta de `mcp/servidor.mjs`, si `npm ci` se hizo y si `public/index.html` existe y es posterior a todo `src/` (si no, el servidor usa una versión vieja: `npm run build`). |
| `carpeta_trabajo` | Ruta y de dónde sale (`ERLEN_SLIDES_DIR` o la de por omisión), si existe y se puede escribir, cuántas presentaciones hay y cuánto ocupa `.historial/`. No la crea. |
| `navegador` | El Chromium o Chrome que usaría la vista previa, buscado con los mismos candidatos y en el mismo orden que `mcp/navegador.mjs`, sin arrancarlo. Con `probar_navegador: true` lo arranca de verdad y da su versión. |
| `rdkit` | Si `@rdkit/rdkit` carga (estructuras desde SMILES o MOL) y su versión. |
| `extensiones` | Los archivos de extensión cargados (`.mjs` y `.pagina.js`). |
| `variables` | Las variables de entorno que cambian el comportamiento (`ERLEN_*`, `PLAYWRIGHT_BROWSERS_PATH`, proxy…). De las que pueden llevar credenciales, como un proxy con usuario y clave, solo se dice que están definidas. |

Las comprobaciones sueltas (`estadoCompilacion`, `dependenciasInstaladas`, `buscaNavegador`, `nodeValido`) se exportan también: las usa el instalador, `npm run mcp:instalar` ([docs/mcp.md](../mcp.md#conectarlo-a-un-cliente)). Para reutilizar la búsqueda de navegador, `mcp/navegador.mjs` exporta `candidatos()`.
