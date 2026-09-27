# Extensión: esqueletos de charla

La estructura de una charla antes que su contenido. Cada tipo de charla científica es una lista de diapositivas con su papel, un diseño adecuado, un título-guía entre corchetes, notas del orador que explican qué va ahí y por qué, y minutos repartidos para sumar la duración pedida.

**No pone datos.** Ningún hueco lleva cifras, resultados ni referencias: son textos entre corchetes («[Primer resultado: una frase con verbo que diga qué muestra la figura]») y marcos de figura vacíos. Tampoco usa gráficas ni tablas, porque sus valores por omisión podrían pasar por resultados.

## Herramientas

- `listar_esqueletos {tipo?}`: los tipos con su guion y su duración habitual; con `tipo`, sus diapositivas con diseño y minutos.
- `crear_desde_esqueleto {archivo, tipo, minutos?, partes?, titulo?, subtitulo?, autores?, institucion?, fecha?, tema?, aspecto?, sobrescribir?}`: crea el proyecto. `partes` repite el bloque central (resultados, capítulos, figuras clave o ideas). La respuesta lista cada diapositiva con su papel y sus minutos.

| Tipo | Duración por omisión | Guion |
|---|---|---|
| `reunion-grupo` | 10 min | objetivo → qué se hizo → resultados → problemas y lo que necesitas → siguiente paso |
| `congreso-10`, `congreso-15` | 10 / 15 min | contexto → brecha → objetivo → método → resultados clave → conclusión → agradecimientos (+ respaldo en 15) |
| `defensa-tesis` | 45 min | índice → antecedentes → hipótesis y objetivos → metodología → capítulos de resultados (resultado, discusión, aporte) → conclusiones → perspectivas → productos → agradecimientos → respaldo |
| `journal-club` | 20 min | el artículo → su pregunta → métodos → figuras clave → crítica → preguntas para el grupo |
| `seminario` | 45 min | pregunta → contexto → antecedentes → objetivo → método → partes de resultados → conclusiones → perspectivas → respaldo |
| `divulgacion` | 15 min | gancho cotidiano → por qué importa → ideas con analogías → mensaje para llevarse |
| `poster-flash` | 3 min | pregunta → método en una línea → un resultado → invitación al póster |

## Tiempo

Los minutos se reparten por peso en pasos de medio minuto (un cuarto en charlas de cinco minutos o menos) con el método del mayor resto: ninguna diapositiva baja de su mínimo y la suma es exactamente la duración pedida. Si no cabe, se quitan primero las opcionales (índice, perspectivas, agradecimientos…) y, si aun así no cabe, el error sugiere menos partes o más minutos.

Se reutilizan las marcas del editor: las diapositivas de respaldo llevan `respaldo` (van al final, sin tiempo ni numeración) y las imprescindibles `clave`, para que «Ajustar al tiempo» no las mande a respaldo. El nivel de la charla (`comite`, `congreso`, `divulgacion`) se fija según el tipo.

## Revisión y prompt

La regla `esqueleto-pendiente` de `revisar_presentacion` (en `adicional`) señala por diapositiva lo que sigue siendo del esqueleto: títulos, encabezados, bloques y metadatos con huecos, figuras sin imagen y notas que aún empiezan por «Guía del esqueleto:». Un hueco es un texto entre corchetes que empieza por mayúscula, tiene palabras y ni cifras ni paréntesis; así no cuentan `[Co(NH3)6]Cl3`, `[Rh(cod)Cl]2`, `$[A]_0$` ni las citas `[@clave]`.

El prompt `rellenar_esqueleto {archivo, materiales?}` guía al asistente para llenar el esqueleto diapositiva por diapositiva con el material real del usuario, sin inventar, y eliminar lo que no aplique.

Archivos: `mcp/extensiones/esqueletos.mjs` (catálogo, reparto de minutos, herramientas, prompt) y `esqueletos.pagina.js` (marcas de portada, respaldo y nivel, y la regla de revisión).
