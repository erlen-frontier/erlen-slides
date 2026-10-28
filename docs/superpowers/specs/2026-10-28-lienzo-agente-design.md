# Tabula: lienzo libre y agente integrado

## Objetivo

Permitir componer diapositivas colocando sus bloques libremente y conversar con un modelo de IA que pueda proponer y realizar cambios en la presentación abierta. Linux/Tauri es prioritario; conservar las capacidades y archivos anteriores.

## Lienzo

- El modo libre es optativo en diapositivas con zonas para bloques; no altera automáticamente presentaciones existentes. Las portadas, secciones e índices que no admiten bloques conservan su comportamiento; una diapositiva en blanco permite componer contenido desde cero, también para una portada libre. Los títulos y pies de los demás acomodos conservan su semántica.
- Mantener `layout` y las zonas JSON v1. La marca opcional de la diapositiva es `lienzoLibre: true`; cada bloque puede guardar `posLibre: {x,y,w,h}` en porcentajes de la diapositiva, independientes de `b.w` y de la fuente de sus datos. Las cuatro coordenadas son números finitos, con `1 ≤ w,h ≤ 100`, `0 ≤ x ≤ 100−w` y `0 ≤ y ≤ 100−h`; al editar se redondean a dos decimales.
- Activar el modo en una diapositiva existente conserva todos sus bloques y, cuando haya geometría real disponible, toma sus posiciones visibles. Desactivarlo vuelve al acomodo previo sin borrar la geometría ni los datos. Los bloques insertados por cualquier ruta deben permanecer visibles mediante una posición inicial determinista.
- Mover y redimensionar directamente con puntero y ofrecer controles de teclado/números. Respetar el bloqueo; confirmar un gesto como un solo paso de deshacer y cancelar sin alterar datos. Las figuras científicas no se deforman ni pierden sus fuentes.
- La pantalla, las miniaturas, la presentación y el HTML/PDF deben usar la misma geometría. Avisar expresamente cuando un formato que no la soporte cambie el acomodo; no afirmar fidelidad PowerPoint o Beamer sin validarla.

## Agente

- El usuario configura un endpoint HTTPS y un modelo compatibles con Chat Completions de un servicio en la nube. El chat explica qué contexto se envía; no hay llamadas hasta que el usuario lo use. Las claves suministradas son de sesión, no se incorporan al repo ni se guardan en el proyecto o el historial.
- El modelo recibe una descripción acotada de la presentación, sin medios base64 ni rutas. Puede responder y llamar herramientas explícitas para consultar y editar diapositivas y bloques. La entrada del documento es contenido, no instrucciones con autoridad. Limitar peticiones, pasos, tamaño, tiempo y operaciones; permitir cancelar.
- Ejecutar operaciones permitidas sobre una copia; verificar tipos, propiedades, límites, bloqueos y fuentes científicas. Aplicar el lote de forma atómica a la presentación abierta con un paso de deshacer; si el documento cambia o una operación falla, no aplicar parcialmente. Conservar nombre, archivo, selección válida y recuperación.
- Reutilizar `extensionSlides('operaciones')` solo para las operaciones que no cambian el editor vivo; no ejecutar las operaciones MCP `revisa`, `html` o `beamer` que llaman `loadDeck`. No ofrecer rutas ni shell al modelo.
- En Tauri, el transporte nativo debe validar URL y permitir solo HTTPS configurado, sin redirecciones, con límites y timeout; no registrar claves. En web, usar la política y CORS del proveedor y explicar los fallos.

## Límites y validación

JSON v1 sigue siendo el formato de trabajo. Versiones antiguas pueden abrir el contenido pero ignorarán la geometría nueva. Usar pruebas automatizadas de preservación, deshacer y rechazos, proveedor simulado y comprobaciones reales de puntero, presentación y chat en Chromium y Tauri/WebKit cuando el entorno lo permita.
