# Notas de la versión 0.2.1

> Nota histórica: el menú de Suite descrito aquí se retiró posteriormente de Tabula independiente.

El editor no cambia. Lo que llega es el menú común de Erlen, que hasta ahora no vivía en este repositorio.

## El menú de la suite vuelve a la fuente

La suite desplegaba una 0.1.2 con menú, pero esa versión nunca se empujó aquí: era la 0.1.0 con el auxiliar de navegación inyectado en el momento de construir, desde un commit que no existe en GitHub. El resultado es que el paquete desplegado no se podía reconstruir desde este repositorio, y que actualizar la suite a la 0.2.0 habría hecho desaparecer el menú.

Desde la 0.2.1 el auxiliar vive en `src/js/88a0-suite-nav.js`: copia literal del archivo MIT del repositorio maestro, con su aviso completo, envuelta en una función porque este editor concatena módulos en vez de importarlos. `88a-suite.js` lo monta en la barra del espacio de trabajo, que es donde estaba en la 0.1.2.

No es una dependencia de los otros editores. No importa ni ejecuta su código: pinta una lista de enlaces y comprueba `location.pathname`, de modo que en la distribución independiente —la que se descarga de Releases— el menú no aparece y no deja enlaces que no llevan a ninguna parte. La prueba `standalone.test.mjs` comprueba las dos caras: montado en `/slides/` aparece con sus siete enlaces, el actual marcado y los demás a otra pestaña; servido en la raíz, no existe.

## Comprobado

- 74 pruebas, todas pasan (una nueva para el menú).
- Construcción: 89 módulos, 2719 KiB.
- Chromium real a 320 y 1440 px, servido bajo `/slides/`: el menú abre, cabe dentro del ancho, lleva seis enlaces a otra pestaña, cierra con Escape, no hay desplazamiento horizontal y la consola queda limpia.
- La prueba que vigila que la construcción no arrastre otros editores ni servicios de nube sigue en verde.

## Pendiente

Publicar la release con su ZIP. La suite pasa a fijar esta versión en lugar de la 0.1.2, cuyo código fuente no existe en ningún sitio.
