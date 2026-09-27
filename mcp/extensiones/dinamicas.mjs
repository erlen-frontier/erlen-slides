/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «dinamicas»: gráficas dinámicas (bloques func) desde el MCP.

   Un modelo de lenguaje escribe fórmulas con soltura, pero también con
   paréntesis de menos, parámetros sin definir o intervalos donde la curva
   no existe; y en la diapositiva eso se ve como una gráfica en blanco. Aquí
   se comprueba todo con el analizador y el muestreo reales de la app
   (dinamicas.pagina.js) antes de guardar nada:

   - listar_modelos_dinamicos: el catálogo de FUNC_MODELS, con el
     significado y la unidad de cada símbolo.
   - validar_grafica_dinamica: el diagnóstico, sin tocar ningún archivo.
   - ajustar_grafica_dinamica: mover los deslizadores de un bloque que ya
     existe (el estado que se ve al abrir la diapositiva y el que sale fijo
     en el PDF).
   - transformaBloque: {tipo:'func', modelo:'arrhenius', params:{Ea: 75}}
     en cualquier herramienta que cree bloques; si la gráfica no se puede
     dibujar, la herramienta falla con el motivo en vez de guardarla. */
import {lee, op, modifica, ErrorUso} from '../motor.mjs';

const archivo = {type: 'string', description: 'Proyecto de la carpeta de trabajo.'};
const especificacion = {type: 'object', additionalProperties: true,
  description: 'La gráfica como se pasaría a agregar_bloque: {"modelo":"arrhenius","params":{"Ea":75}} o {"curves":[{"expr":"A*exp(-k*x)","name":"C(t)"}],"params":[{"name":"A","value":1,"min":0,"max":2}],"xmin":0,"xmax":10}.'};

/* Un error por línea, con la curva o el parámetro delante y, si lo hay, el
   carácter donde se atascó la lectura marcado con ▸. */
const describe = e => (e.curva ? '«' + e.curva + '»: ' : e.parametro ? '«' + e.parametro + '»: ' : '') + e.problema + (e.marca ? ' → ' + e.marca : '');

export default {
  herramientas: [
    {name: 'listar_modelos_dinamicos', title: 'Modelos de gráfica dinámica',
      description: 'Los modelos listos para una gráfica dinámica (bloque func): Arrhenius, cinéticas de 1.er y 2.º orden, perfiles de pico (gaussiano, lorentziano, pseudo-Voigt), Beer–Lambert, isotermas de Langmuir y Freundlich, cinética de adsorción, Scherrer, Bragg, Tauc, Van \'t Hoff, Michaelis–Menten, Fermi–Dirac… Cada uno con su fórmula, el significado y la unidad de x, y y de cada parámetro, el recorrido de los deslizadores y los supuestos. Úsalo antes de crear un bloque {"tipo":"func","modelo":"<id>"}.',
      inputSchema: {type: 'object', properties: {buscar: {type: 'string', description: 'Filtra por palabra en el id, el nombre, la descripción o los supuestos (p. ej. «adsorción», «XRD», «cinética»).'}}},
      annotations: {readOnlyHint: true, openWorldHint: false},
      run: async a => {
        let {modelos} = await op('dinamicaModelos', {});
        if (a.buscar) {
          const plano = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
          const q = plano(a.buscar).replace(/\bxrd\b|\bdrx\b/, 'difraccion').split(/\s+/).filter(Boolean);
          const texto = m => plano([m.id, m.nombre, m.descripcion, m.nota, m.x.significado, m.y.significado].join(' ') + (/2θ|bragg|scherrer|pico/.test(plano(m.nota + m.x.significado)) ? ' difraccion' : ''));
          modelos = modelos.filter(m => q.every(p => texto(m).includes(p)));
        }
        return {modelos, uso: 'Bloque {"tipo":"func","modelo":"<id>","params":{"<nombre>":<valor> o {"value","min","max"}},"caption":"…"}: toma fórmulas, ejes y deslizadores del modelo y cambia solo lo que pases. Los valores deben caber en [min, max].'};
      }},
    {name: 'validar_grafica_dinamica', title: 'Validar gráfica dinámica',
      description: 'Comprueba una gráfica dinámica con el analizador de fórmulas y el muestreo reales de la app, sin guardar nada: errores de sintaxis con el carácter marcado (▸), variables sin definir, parámetros fuera de su deslizador o que chocan con una constante (R, e, pi, kB…), intervalo de x, y evalúa las curvas en [xmin, xmax] (puntos válidos, dominio, polos, y mín./máx. y cinco puntos de control). Pasa «bloque» para una gráfica nueva, o «archivo» y «bloque_id» para una que ya está en la presentación.',
      inputSchema: {type: 'object', properties: {bloque: especificacion, archivo, bloque_id: {type: 'string', description: 'Id de un bloque func existente (ver_presentacion).'}}},
      annotations: {readOnlyHint: true, openWorldHint: false},
      run: async a => {
        let r;
        if (a.archivo) {
          if (!a.bloque_id) throw new ErrorUso('Con «archivo» pasa también «bloque_id».');
          const {deck} = lee(a.archivo);
          r = await op('dinamicaAnaliza', {deck, id: a.bloque_id});
        } else r = await op('dinamicaAnaliza', {bloque: a.bloque});
        const {bloque, ...resto} = r;
        return {...resto, ...(r.valido ? {bloque: {tipo: 'func', ...bloque}} : {resumen: r.errores.map(describe)})};
      }},
    {name: 'ajustar_grafica_dinamica', title: 'Ajustar gráfica dinámica',
      description: 'Cambia los valores de los parámetros (la posición de los deslizadores) de una gráfica dinámica existente y, si hace falta, su recorrido o el intervalo de x. Es el estado con que se abre la diapositiva y el que sale fijo en el PDF y en Beamer. Valida antes de guardar: si la curva deja de poder dibujarse, no cambia nada. Se puede deshacer.',
      inputSchema: {type: 'object', required: ['archivo', 'bloque'], properties: {archivo,
        bloque: {type: 'string', description: 'Id del bloque func.'},
        valores: {type: 'object', additionalProperties: true, description: '{"Ea": 75} o {"A": {"value": 1e13, "max": 1e14}}.'},
        xmin: {type: 'number'}, xmax: {type: 'number'}}},
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
      run: a => modifica(a.archivo, 'dinamicaAjusta', {bloque: a.bloque, valores: a.valores || {}, xmin: a.xmin, xmax: a.xmax}, 'ajustar_grafica_dinamica')}
  ],

  prompts: [
    {name: 'explicar_con_grafica_dinamica', title: 'Explicar un modelo con una gráfica dinámica',
      description: 'Añade una diapositiva con una gráfica dinámica para enseñar cómo un parámetro cambia una curva.',
      arguments: [{name: 'archivo', description: 'Proyecto de destino', required: true}, {name: 'tema', description: 'Qué se quiere enseñar (p. ej. «cómo la energía de activación cambia k(T)»)', required: true}],
      texto: a => `En «${a.archivo}», añade una diapositiva que explique: ${a.tema}.
1. Busca un modelo con listar_modelos_dinamicos; si ninguno encaja, escribe la fórmula con x como variable del eje.
2. Comprueba la gráfica con validar_grafica_dinamica antes de crearla y corrige todos los errores.
3. Crea el bloque {"tipo":"func", ...} con ejes rotulados con unidades, un pie que diga qué mover y qué mirar, y en las notas qué valores enseñar en vivo.
4. Deja con ajustar_grafica_dinamica los valores que deben verse en el PDF, y enséñame la vista previa.
No presentes valores de parámetros como medidos si no vienen de mis datos: son ilustrativos y así lo dice el pie.`}
  ],

  convenciones: {
    func: 'Bloque «func» (gráfica dinámica): {"tipo":"func","modelo":"<id de listar_modelos_dinamicos>","params":{"Ea":75},"caption":"…"} o {"tipo":"func","curves":[{"expr":"C0*exp(-k*x)","name":"[A]"}],"params":[{"name":"k","value":0.25,"min":0.01,"max":1,"unit":"min$^{-1}$","d":"Constante de velocidad"}],"xmin":0,"xmax":20,"xlabel":"…","ylabel":"…"}. x es la variable del eje; las demás letras son parámetros con deslizador (unit: unidad; d: qué es; log: true para los que abarcan décadas). Funciones: exp ln log10 sqrt sin cos tan abs erf gauss(x,μ,σ) lorentz(x,x0,γ) if(c,a,b); constantes: pi e R NA h hbar c kB F eV me. Se valida al crear (validar_grafica_dinamica da el diagnóstico sin guardar) y ajustar_grafica_dinamica mueve los deslizadores. Los polos cortan el trazo; logX/logY ponen los ejes en logaritmo.'
  },

  /* Una gráfica dinámica que llega a cualquier herramienta que cree bloques
     sale de aquí completa y comprobada. Las ediciones parciales (cambios de
     editar_bloque sin tipo ni modelo) pasan tal cual: no se sabe el resto del
     bloque, y revisar_presentacion las comprueba después. */
  transformaBloque: async (b, {esImagen}) => {
    const tipo = b.tipo || b.type;
    const params = b.params != null ? b.params : b.parametros;
    if (esImagen && !tipo && b.modelo == null && params != null && typeof params === 'object' && !Array.isArray(params))
      throw new ErrorUso('Para cambiar los valores de los parámetros de una gráfica dinámica usa ajustar_grafica_dinamica ({"valores": {"Ea": 75}}); en editar_bloque, «params» es la lista completa [{name, value, min, max}].');
    if (tipo !== 'func' && !(esImagen && !tipo && b.modelo != null)) return b;
    const r = await op('dinamicaAnaliza', {bloque: b});
    if (!r.valido) throw new ErrorUso('La gráfica dinámica no se puede dibujar: ' + r.errores.map(describe).join(' ') + ' (validar_grafica_dinamica da el diagnóstico completo).');
    return tipo ? {...r.bloque, tipo} : r.bloque;
  }
};
