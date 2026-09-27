# Extensión: abrir en el editor

`abrir_en_editor {archivo}` enseña un proyecto de la carpeta de trabajo en el editor de Erlen Slides, en el navegador del usuario, para que lo vea y lo siga editando a mano.

```json
{"archivo": "hdl.json", "url": "http://127.0.0.1:8130/?abrir=Qm9…", "navegador": "abierto",
 "caduca": "2026-09-27T18:40:00.000Z", "nota": "Se abrió el navegador. El enlace sirve una sola vez; …"}
```

## Cómo funciona

1. Lee y valida el proyecto (con `saneaDeck`, como cualquier otra herramienta): un proyecto roto lo sabe la IA, no la persona delante de un aviso.
2. Arranca, una vez por proceso, un servidor HTTP en `127.0.0.1` que sirve `public/` (la app construida) y una sola ruta más, `/mcp/abrir/<clave>`. Las llamadas siguientes lo reutilizan.
3. Guarda en memoria una copia del proyecto detrás de una clave aleatoria de 192 bits, y abre el navegador del sistema (`xdg-open`, `open` o `cmd /c start`, con los argumentos por separado) en `http://127.0.0.1:<puerto>/?abrir=<clave>`. **Siempre devuelve la URL**, por si el navegador no se abre.
4. La página retira `?abrir` de la dirección, pide el proyecto al mismo origen con una ruta relativa, lo sanea y enseña una vista previa. Solo al pulsar **Abrir en el editor** se guarda en la biblioteca del navegador con un nombre libre (nunca pisa otra presentación) y se abre; la que estaba abierta se conserva.

## Seguridad

- Escucha solo en `127.0.0.1`. Rechaza con 403 cualquier petición cuyo `Host` no sea `127.0.0.1:<puerto>` o `localhost:<puerto>` (defensa ante *DNS rebinding*).
- Cada clave entrega **un** proyecto, **una** vez, durante **10 minutos**; después, o con cualquier otra clave, 404. El navegador no manda rutas de archivo: la clave apunta a la copia hecha al llamar la herramienta. Como mucho hay 20 claves pendientes.
- Fuera de `/mcp/abrir/` solo se sirven archivos de `public/`, sin listados de carpetas ni rutas que salgan de ella. Solo `GET` y `HEAD`.
- La respuesta del proyecto lleva `Cache-Control: no-store` y no tiene cabeceras CORS: otra página del navegador no puede leerla.

## La copia del navegador es independiente

El editor guarda en el almacenamiento de su origen. Lo que el usuario edite después **no vuelve solo al archivo**: para traerlo, **Exportar → Proyecto (.json)** y guardarlo en la carpeta de trabajo (con el mismo nombre, si se quiere seguir con estas herramientas; conviene que la IA lo vuelva a leer antes de editar). No hay escritura de vuelta desde el navegador: evita que una página pueda cambiar archivos de la carpeta.

El almacenamiento del navegador va por origen, puerto incluido. Por eso el servidor prefiere el puerto **8130**, el mismo de `npm start`: la biblioteca es la misma se abra el editor desde el asistente o a mano (no a la vez). Si está ocupado usa otro libre y lo avisa en `aviso`, porque la biblioteca de ese puerto es otra. El editor funciona mientras el asistente siga conectado.

## Variables

| Variable | Para qué |
|---|---|
| `ERLEN_SLIDES_SIN_NAVEGADOR=1` | No abre el navegador; solo devuelve la URL (pruebas, servidores sin escritorio). |
| `ERLEN_SLIDES_PUERTO` | Puerto preferido (8130 por omisión); `0` elige uno libre. |
| `ERLEN_SLIDES_CADUCIDAD` | Segundos de validez de cada clave (600 por omisión). |

Se prueba en `tests/mcp-editor.test.mjs` (el servidor, con el `fetch` de Node) y `tests/editor-asistente.test.mjs` (el camino de la app, en JSDOM con un `fetch` simulado).
