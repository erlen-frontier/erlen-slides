# Contribuir

Abre un issue con el problema, pasos para reproducir y versión. Usa una presentación sintética mínima; elimina datos de investigación privados, claves y datos personales.

Lee las [reglas locales](AGENTS.md) y la [guía de desarrollo](docs/desarrollo.md). Para proponer un cambio, crea una rama salvo autorización explícita para trabajar en main. Documenta qué cambió, su motivo y el alcance de las comprobaciones realizadas. Este repositorio trabaja sin CI ni revisión de código garantizada; no presupongas que otra persona comprobará el cambio.

Cuando el entorno lo permita, instala las dependencias con `npm ci`, construye con `npm run build` y ejecuta las pruebas pertinentes o `npm test`. Para cambios de diseño, inspecciona el resultado renderizado y adjunta capturas cuando estén disponibles; para exportadores, revisa los archivos producidos. Si no puedes realizar una comprobación, indica cuál, por qué y qué queda sin verificar. No presentes pruebas omitidas como aprobadas ni resultados históricos como validación actual.

Evita añadir servicios de pago como requisito de la edición local. No introduzcas CI ni sincronización automática como requisito para contribuir.

Conserva las licencias y atribuciones. Las contribuciones originales a este repositorio se reciben bajo AGPL-3.0-only. No agregues iconos, artículos o datos cuya redistribución no esté permitida.
