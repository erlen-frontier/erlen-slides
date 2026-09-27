/* SPDX-License-Identifier: AGPL-3.0-only */
/* Extensión «esqueletos»: la estructura de una charla antes que su contenido.

   Una reunión de grupo, un congreso de diez minutos y una defensa de tesis
   piden guiones distintos, y quien empieza suele copiar el de otra persona.
   Aquí cada tipo de charla es una lista de diapositivas con su papel: un
   diseño adecuado, un título que es una instrucción entre corchetes, notas
   que explican qué va ahí y por qué, y minutos repartidos para llegar justo
   a la duración pedida.

   Lo que no hace, a propósito: poner datos. Ningún hueco lleva cifras,
   resultados ni referencias; son textos entre corchetes que la regla de
   revisión «esqueleto-pendiente» (esqueletos.pagina.js) señala hasta que el
   usuario los sustituye por lo suyo. Las figuras son marcos vacíos. */
import {existsSync} from 'node:fs';
import {op, rutaSegura, visible, guardaVersion, escribe, ErrorUso} from '../motor.mjs';

/* Las notas del orador empiezan así mientras son la guía del esqueleto; la
   regla de revisión busca el mismo prefijo (esqueletos.pagina.js). */
const GUIA = 'Guía del esqueleto: ';
const CIERRE_NOTA = ' Sustituye esta nota por lo que vas a decir.';

/* ---------- piezas ---------- */
const T = t => ({tipo: 'text', text: t});
const V = (...its) => ({tipo: 'bullets', items: its.map(t => ({t, lvl: 0}))});
/* Un marco de figura vacío: el editor lo enseña como «elige una imagen» y la
   revisión lo cuenta como hueco. Nunca una gráfica: newBlock('chart') trae
   datos de muestra que podrían pasar por resultados. */
const F = pie => ({tipo: 'image', caption: pie});
/* En «Figura con pie ancho» el pie es la columna de al lado, no el caption
   de la imagen: el hueco del pie va ahí, donde el público lo lee. */
const PIE_LATERAL = '[Pie: muestra, técnica y condiciones de medida.';
/* Ordinales sin cifras: los huecos no llevan números para que ninguno se
   confunda con un dato. */
const ORD = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto'];
const ORDA = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'];
const ord = k => ORD[k].toLowerCase();

/* Diapositiva de un esqueleto:
     rol      qué papel cumple (lo devuelve la herramienta)
     peso     minutos a la duración nominal; se escalan a la pedida
     minimo   minutos por debajo de los cuales no tiene sentido
     opcional se quita si no cabe en el tiempo (de la última a la primera)
     clave    la ajustan-tiempo del editor no la manda a respaldo (sl.clave)
     respaldo va al apéndice: no cuenta tiempo ni numeración */
const D = (rol, diseno, titulo, nota, o = {}) => ({rol, diseno, titulo, notas: GUIA + nota + CIERRE_NOTA, peso: 1, minimo: 0.5, ...o});
const seccion = (titulo, nota) => D('seccion', 'section', titulo, nota || 'Las secciones ordenan la charla y llenan el índice. Basta nombrarla al pasar.', {peso: 0.5, minimo: 0.25});
const indice = () => D('indice', 'toc', 'Contenido', 'El índice se llena solo con las secciones. Recórrelo en voz alta en pocos segundos: así el público sabe en qué parte está en cada momento.', {peso: 0.5, minimo: 0.25, opcional: true});
const agradecimientos = (peso = 0.5) => D('agradecimientos', 'content', 'Agradecimientos',
  'Nombra a quien financió el trabajo (agencia y clave del proyecto), a los laboratorios y técnicos que midieron y a los coautores. Copia los nombres y claves de los documentos oficiales, no de memoria.',
  {peso, minimo: 0.25, opcional: true, zonas: [[T('[Financiamiento, laboratorios, técnicos y coautores]')]]});
const resultado = (k, o = {}) => D('resultado', 'piefigura', '[' + ORD[k] + ' resultado: una frase con verbo que diga qué muestra la figura]',
  'Un resultado por diapositiva, con la figura hecha de tus datos (bloque image con «archivo» o chart con «archivo_datos»). El título es la conclusión que la figura sostiene (estructura aserción-evidencia); el pie dice qué se midió y en qué condiciones. Si la conclusión todavía no está clara, no la adelantes en el título.',
  {peso: 2, minimo: 1, clave: k === 0, zonas: [[F('')], [T(PIE_LATERAL + ' Qué mirar y cómo se compara con lo esperado o con la referencia]')]], ...o});
const pasos = (titulo, nota, o = {}) => D('metodo', 'pasos', titulo, nota, {
  encabezados: ['[Primer paso]', '[Segundo paso]', '[Tercer paso]'],
  zonas: [[T('[Qué se hizo y la condición que importa]')], [T('[Qué se hizo y la condición que importa]')], [T('[Qué se hizo y la condición que importa]')]], ...o});

/* ---------- catálogo ---------- */
const ESQUELETOS = [
  {id: 'reunion-grupo', nombre: 'Reunión de grupo (avance semanal)', para: 'El avance de la semana ante tu grupo o tu director(a): qué buscabas, qué hiciste, qué salió, qué te frena y qué sigue.',
    nominal: 10, rango: [5, 20], nivel: 'comite', partes: {def: 2, max: 4, que: 'resultados'},
    titulo: '[Avance: proyecto y semana]',
    portada: 'En la reunión de grupo todos te conocen: título, fecha y proyecto bastan. No te detengas aquí.',
    diapositivas: p => [
      D('objetivo', 'enunciado', '[Objetivo de esta semana: qué querías averiguar o conseguir]',
        'Recordar el objetivo da al grupo el criterio para juzgar lo que sigue. Una sola frase; si hace falta contexto, que sea lo acordado en la reunión anterior.',
        {clave: true, zonas: [[T('[La pregunta concreta que guiaba el trabajo de estos días y cómo encaja en el proyecto]')]]}),
      D('que-se-hizo', 'content', '[Qué se hizo: los experimentos o cálculos de esta semana]',
        'Enumera lo hecho, no lo intentado en abstracto. Las condiciones completas (masas, tiempos, temperaturas) van en tu bitácora; aquí solo lo que el grupo necesita para entender los resultados.',
        {peso: 1.5, zonas: [[V('[Síntesis o experimento realizado, con la condición que cambiaste]', '[Caracterización o medida hecha]', '[Lo que no se alcanzó a hacer, si importa]')]]}),
      ...Array.from({length: p}, (_, k) => resultado(k, {notas: GUIA + 'Un resultado por diapositiva, con la figura real de tus datos (bloque image con «archivo» o chart con «archivo_datos»). El título es la conclusión; si todavía no sabes qué concluir, dilo tal cual: en la reunión de grupo es legítimo enseñar algo sin interpretar y pedir ideas.' + CIERRE_NOTA})),
      D('problemas', 'comparacion', '[Problemas: qué falló y qué necesito]',
        'Es la parte más útil de la reunión: el grupo solo puede ayudarte con lo que enseñas. Separa el problema (y lo que ya probaste) de la petición concreta.',
        {peso: 1.5, encabezados: ['[Qué falló o preocupa]', '[Qué necesito del grupo]'],
          zonas: [[V('[Problema concreto y lo que ya probaste]')], [V('[Pregunta, equipo, reactivo o consejo que necesitas]')]]}),
      D('siguiente-paso', 'content', '[Siguiente paso: lo que harás antes de la próxima reunión]',
        'Cierra con compromisos verificables: la próxima reunión empieza revisando esta lista.',
        {clave: true, zonas: [[V('[Acción concreta y el criterio para saber si funcionó]', '[Segunda acción, si la hay]')]]})
    ]},

  ...[10, 15].map(m => ({id: 'congreso-' + m, nombre: 'Congreso: charla oral de ' + m + ' minutos',
    para: 'Charla oral en un congreso o simposio: contexto, brecha, objetivo, método, resultados clave, conclusión y agradecimientos.',
    nominal: m, rango: m === 10 ? [8, 12] : [12, 20], nivel: 'congreso', partes: {def: m === 10 ? 2 : 3, max: m === 10 ? 3 : 4, que: 'resultados clave'},
    titulo: '[Título: el hallazgo principal en una frase]', subtitulo: '[Congreso, sesión y lugar]',
    portada: 'Título, autores (quien presenta, señalado) e institución. Di tu nombre y tu grupo en una frase y entra en materia: en ' + m + ' minutos no hay tiempo para una introducción larga.',
    diapositivas: p => [
      D('contexto', 'twocol', '[Contexto: por qué importa el problema]',
        'El público de un congreso es especialista, pero no de tu subtema: parte de lo que comparten. Cualquier cifra o afirmación del campo necesita su referencia verificada (agregar_referencia); si no la tienes, no la pongas.',
        {peso: m === 10 ? 1.5 : 2, zonas: [[V('[Hecho del campo que motiva el trabajo, con su referencia real]', '[Lo que ya se sabe]')], [F('[Pie: esquema que sitúe el problema; cita la fuente si la figura no es tuya]')]]}),
      D('brecha', 'enunciado', '[La brecha: lo que todavía no se sabe o no funciona]',
        'La brecha convierte el contexto en una pregunta. Si el público no sabe qué falta, no podrá valorar lo que aportas.',
        {peso: 0.75, zonas: [[T('[Una frase: el hueco concreto que tu trabajo ataca]')]]}),
      D('objetivo', 'enunciado', '[Objetivo: qué te propusiste demostrar]',
        'Objetivo o hipótesis en una frase que se pueda comprobar. Es la diapositiva que el público debería poder repetir al salir.',
        {peso: 0.75, clave: true, zonas: [[T('[El objetivo o la hipótesis que se pone a prueba]')]]}),
      pasos('[Método: cómo lo abordaste, en tres pasos]',
        'Solo el método que hace falta para creer los resultados: la preparación y las técnicas, sin el procedimiento completo. Los detalles quedan para las preguntas' + (m === 15 ? ' y para la diapositiva de respaldo.' : '.'),
        {peso: m === 10 ? 1.5 : 2}),
      ...Array.from({length: p}, (_, k) => resultado(k, {peso: m === 10 ? 2 : 2.25})),
      D('conclusion', 'content', '[Conclusión: el mensaje que quieres que se lleven]',
        'Solo conclusiones que salgan de resultados que enseñaste. Suele quedar proyectada durante las preguntas: que se entienda sola.',
        {peso: 1, clave: true, zonas: [[V('[Primera conclusión, apoyada en un resultado mostrado]', '[Segunda conclusión]', '[Perspectiva inmediata, si cabe]')]]}),
      agradecimientos(),
      ...(m === 15 ? [D('respaldo', 'content', '[Respaldo: el detalle que puede salir en las preguntas]',
        'Va al apéndice: no cuenta en el tiempo ni en la numeración. Pon aquí condiciones, controles o ajustes que no caben en la charla pero que alguien puede pedir.',
        {respaldo: true, zonas: [[V('[Condición experimental, control o ajuste que puedan preguntar]')]]})] : [])
    ]})),

  {id: 'defensa-tesis', nombre: 'Defensa de tesis', para: 'Examen de grado ante un comité: antecedentes, hipótesis y objetivos, metodología, capítulos de resultados, conclusiones, perspectivas y respaldo.',
    nominal: 45, rango: [30, 60], nivel: 'comite', partes: {def: 3, max: 5, que: 'capítulos de resultados'},
    titulo: '[Título de la tesis]', subtitulo: '[Grado y programa de posgrado]',
    portada: 'Título de la tesis, tu nombre, director(a) y codirector(a), programa e institución. Agradece al comité en una frase y empieza.',
    diapositivas: p => [
      indice(),
      seccion('Antecedentes'),
      D('antecedentes', 'twocol', '[Antecedentes: el problema y por qué importa]',
        'El comité conoce el campo: no des una clase, sitúa el problema. Cada afirmación del estado del arte lleva su referencia verificada (agregar_referencia).',
        {peso: 3, minimo: 1, zonas: [[V('[Problema general y su relevancia, con referencia real]', '[Lo que se sabe hasta ahora]')], [F('[Pie: esquema del sistema o del problema; cita la fuente si no es tuya]')]]}),
      D('estado-del-arte', 'content', '[Estado del arte: qué se ha intentado y qué falta]',
        'Termina en la brecha que abre tu tesis: es el puente hacia la hipótesis. Dos o tres enfoques previos bastan, con su limitación concreta.',
        {peso: 3, minimo: 1, zonas: [[V('[Enfoque previo y su limitación, con referencia real]', '[Otro enfoque y su limitación]', '[La brecha que aborda la tesis]')]]}),
      seccion('Hipótesis y objetivos'),
      D('hipotesis', 'enunciado', '[Hipótesis: la afirmación que la tesis pone a prueba]',
        'Una hipótesis que se pueda refutar con los experimentos que vas a enseñar. El comité volverá a ella al final: las conclusiones deben responderla.',
        {peso: 2, clave: true, zonas: [[T('[La hipótesis en una frase]')]]}),
      D('objetivos', 'content', '[Objetivos: general y específicos]',
        'Un objetivo específico por capítulo de resultados, en el mismo orden: así el comité ve que la tesis cumple lo que prometió.',
        {peso: 2, zonas: [[V('[Objetivo general]', ...Array.from({length: p}, (_, k) => '[Objetivo específico del ' + ord(k) + ' capítulo]'))]]}),
      seccion('Metodología'),
      D('metodologia', 'filas', '[Metodología: preparación, caracterización y análisis]',
        'Lo necesario para creer los resultados, en el orden en que se hizo. Los procedimientos completos y las condiciones de cada equipo van a respaldo: el comité los pedirá si le interesan.',
        {peso: 3, minimo: 1, encabezados: ['[Síntesis o preparación]', '[Caracterización]', '[Análisis o modelado]'],
          zonas: [[T('[Método de preparación y variable que se estudia]')], [T('[Técnicas empleadas y para qué sirve cada una]')], [T('[Cómo se analizaron los datos]')]]}),
      ...Array.from({length: p}, (_, k) => [
        seccion('[Nombre corto del ' + ord(k) + ' capítulo de resultados]', 'Cada capítulo responde a un objetivo específico: nómbralo al entrar para que el comité sepa cuál.'),
        D('resultado', 'piefigura', '[' + ORD[k] + ' capítulo: una frase con el resultado principal]',
          'La figura central del capítulo, hecha de tus datos (image con «archivo» o chart con «archivo_datos»). El título dice qué demuestra; el pie, qué se midió y en qué condiciones.',
          {peso: 3, minimo: 1, clave: true, zonas: [[F('')], [T(PIE_LATERAL + ' Qué mirar en la figura]')]]}),
        D('discusion', 'twocol', '[Discusión: qué significa el resultado y cómo se compara]',
          'Interpreta: mecanismo propuesto, comparación con la literatura (con referencias reales) e incertidumbres. Distingue lo que muestran los datos de lo que propones tú.',
          {peso: 3, minimo: 1, zonas: [[V('[Interpretación del resultado]', '[Comparación con trabajos previos, con referencia real]', '[Limitaciones o incertidumbre]')], [F('[Pie: figura complementaria de tus datos]')]]}),
        D('sintesis-capitulo', 'enunciado', '[Lo que aporta este capítulo, en una frase]',
          'Cierra el capítulo con su aporte y enlaza con el siguiente. Si alguien del comité se distrajo, aquí se reengancha.',
          {peso: 1, zonas: [[T('[El aporte del capítulo respecto a su objetivo específico]')]]})
      ]).flat(),
      seccion('Conclusiones'),
      D('conclusiones', 'content', '[Conclusiones: la respuesta a la hipótesis]',
        'Una conclusión por capítulo y una general que diga si la hipótesis se sostiene. Nada que no hayas enseñado antes.',
        {peso: 3, minimo: 1, clave: true, zonas: [[V(...Array.from({length: p}, (_, k) => '[Conclusión del ' + ord(k) + ' capítulo]'), '[Conclusión general frente a la hipótesis]')]]}),
      D('perspectivas', 'content', '[Perspectivas: lo que queda abierto]',
        'Preguntas que deja la tesis y el trabajo que las contestaría. Muestra que conoces los límites de lo que hiciste.',
        {peso: 2, opcional: true, zonas: [[V('[Pregunta abierta que deja la tesis]', '[Experimento o trabajo que la respondería]')]]}),
      D('productos', 'content', '[Productos: artículos, congresos y estancias derivados]',
        'Solo lo que existe o está enviado, con su estado real (publicado, aceptado, enviado). Los datos exactos, copiados de cada documento.',
        {peso: 1, opcional: true, zonas: [[V('[Artículo o presentación derivada y su estado]')]]}),
      agradecimientos(1),
      D('respaldo', 'content', '[Respaldo: detalle del método que el comité puede preguntar]',
        'El apéndice no cuenta en el tiempo ni en la numeración. Prepara aquí lo que prevés que pregunten: condiciones, calibraciones, ajustes.',
        {respaldo: true, zonas: [[V('[Condiciones de síntesis o de medida en detalle]')]]}),
      D('respaldo', 'content', '[Respaldo: controles, repeticiones e incertidumbres]',
        'Réplicas, blancos y barras de error: la pregunta más frecuente de un comité es «¿cuántas veces lo repetiste?».',
        {respaldo: true, zonas: [[V('[Control o réplica y lo que mostró]')]]}),
      D('respaldo', 'piefigura', '[Respaldo: figura complementaria]',
        'Una figura que no cupo en la charla pero sostiene una conclusión (espectros completos, micrografías adicionales, ajustes).',
        {respaldo: true, zonas: [[F('')], [T(PIE_LATERAL + ' Para qué pregunta sirve]')]]})
    ]},

  {id: 'journal-club', nombre: 'Journal club', para: 'Presentar y criticar un artículo ante el grupo: el artículo, su pregunta, sus métodos, las figuras clave, la crítica y la discusión.',
    nominal: 20, rango: [10, 30], nivel: 'congreso', partes: {def: 3, max: 5, que: 'figuras clave'},
    titulo: '[Título del artículo o una pregunta que lo resuma]',
    portada: 'Quién presenta y qué artículo, con la cita completa en la siguiente diapositiva.',
    diapositivas: p => [
      D('articulo', 'barra', '[El artículo: de qué trata y por qué lo elegiste]',
        'Copia autores, revista, año y DOI del propio artículo y regístralo con agregar_referencia; nunca de memoria. Di por qué lo elegiste: qué tiene que ver con el grupo.',
        {peso: 2, encabezados: ['[Ficha del artículo]', ''], zonas: [[V('[Autores]', '[Revista y año]', '[DOI del artículo]')], [T('[De qué trata el artículo, en dos frases y con tus palabras]')]]}),
      D('pregunta', 'enunciado', '[La pregunta del artículo: qué querían averiguar los autores]',
        'Si el grupo entiende la pregunta, podrá juzgar si los experimentos la responden. Formúlala tú; no copies el resumen.',
        {peso: 1.5, clave: true, zonas: [[T('[La pregunta o hipótesis de los autores, en una frase]')]]}),
      pasos('[Métodos: cómo la abordaron]',
        'Lo justo para juzgar las figuras: sistema, técnicas y controles. Señala desde ahora lo que te parezca débil; volverás a ello en la crítica.',
        {peso: 2.5}),
      ...Array.from({length: p}, (_, k) => D('figura-clave', 'piefigura', '[' + ORDA[k][0].toUpperCase() + ORDA[k].slice(1) + ' figura clave: qué afirman los autores con ella]',
        'Reproduce la figura del artículo y cítala en el pie (número de figura y referencia). Separa lo que la figura muestra de lo que los autores interpretan: ese contraste es el centro de un journal club.',
        {peso: 3, minimo: 1, clave: k === 0, zonas: [[F('')], [T('[Pie: figura del artículo que se reproduce y su cita. Qué afirman los autores y si la figura lo sostiene]')]]})),
      D('critica', 'comparacion', '[Crítica: qué convence y qué no]',
        'Juzga el diseño experimental, los controles, la estadística y si las conclusiones se siguen de los datos. Una crítica concreta vale más que diez generales.',
        {peso: 3, minimo: 1, encabezados: ['[Fortalezas]', '[Debilidades o dudas]'], zonas: [[V('[Fortaleza concreta]')], [V('[Debilidad o duda concreta]')]]}),
      D('discusion', 'enunciado', '[Preguntas para el grupo]',
        'Deja la pantalla quieta y abre la conversación: qué haríamos distinto, qué nos sirve del artículo, qué experimento lo pondría a prueba.',
        {peso: 2.5, minimo: 1, zonas: [[T('[Una o dos preguntas abiertas para discutir]')]]})
    ]},

  {id: 'seminario', nombre: 'Seminario', para: 'Seminario departamental o de posgrado: una pregunta, su contexto, el método y varias partes de resultados, con tiempo para matizar.',
    nominal: 45, rango: [30, 60], nivel: 'congreso', partes: {def: 3, max: 5, que: 'partes de resultados'},
    titulo: '[Título: la pregunta o el hallazgo del seminario]',
    portada: 'Título, autores e institución. En un seminario puedes dedicar una frase a presentarte y a presentar al grupo.',
    diapositivas: p => [
      indice(),
      D('pregunta', 'enunciado', '[La pregunta que guía el seminario]',
        'Una pregunta al principio convierte el seminario en una búsqueda y da al público algo que seguir.',
        {peso: 2, clave: true, zonas: [[T('[La pregunta, en una frase que entienda alguien de otra área]')]]}),
      D('contexto', 'twocol', '[Contexto: de dónde viene la pregunta]',
        'El público de un seminario es variado: parte de lo que sabe un químico de otra área. Cada afirmación del campo, con referencia verificada.',
        {peso: 3, minimo: 1, zonas: [[V('[Problema general, con referencia real]', '[Lo que se sabe]')], [F('[Pie: esquema del problema; cita la fuente si no es tuya]')]]}),
      D('antecedentes', 'content', '[Antecedentes: qué se ha intentado y qué falta]',
        'Termina en la brecha que ataca tu trabajo.',
        {peso: 3, minimo: 1, zonas: [[V('[Enfoque previo y su limitación, con referencia real]', '[La brecha que abordas]')]]}),
      D('objetivo', 'enunciado', '[Objetivo: qué te propusiste]',
        'Objetivo o hipótesis en una frase comprobable.',
        {peso: 1.5, zonas: [[T('[El objetivo o la hipótesis]')]]}),
      pasos('[Método: cómo lo abordaste]',
        'Lo necesario para creer los resultados; los detalles, a respaldo.', {peso: 3, minimo: 1}),
      ...Array.from({length: p}, (_, k) => [
        seccion('[Nombre de la ' + ORDA[k] + ' parte]'),
        resultado(k, {peso: 3}),
        D('discusion', 'twocol', '[Discusión: qué significa y cómo se compara]',
          'Interpreta y compara con la literatura (con referencias reales). Separa lo que muestran los datos de lo que propones.',
          {peso: 3, minimo: 1, zonas: [[V('[Interpretación]', '[Comparación con trabajos previos, con referencia real]')], [F('[Pie: figura complementaria de tus datos]')]]}),
        D('sintesis-parte', 'enunciado', '[Lo que aporta esta parte, en una frase]',
          'Cierra la parte y enlaza con la siguiente: el público que se perdió se reengancha aquí.',
          {peso: 1, zonas: [[T('[El aporte de esta parte]')]]})
      ]).flat(),
      D('conclusiones', 'content', '[Conclusiones: la respuesta a la pregunta inicial]',
        'Vuelve a la pregunta del principio y contéstala. Nada que no hayas enseñado.',
        {peso: 3, minimo: 1, clave: true, zonas: [[V('[Conclusión principal]', '[Segunda conclusión]', '[Lo que queda abierto]')]]}),
      D('perspectivas', 'content', '[Perspectivas: el trabajo que sigue]',
        'Lo que harás después y lo que buscas del público: colaboraciones, muestras, ideas.',
        {peso: 2, opcional: true, zonas: [[V('[Siguiente paso del proyecto]', '[Colaboración o ayuda que buscas]')]]}),
      agradecimientos(1),
      D('respaldo', 'content', '[Respaldo: el detalle que puede salir en las preguntas]',
        'El apéndice no cuenta en el tiempo ni en la numeración.',
        {respaldo: true, zonas: [[V('[Condición, control o ajuste que puedan preguntar]')]]})
    ]},

  {id: 'divulgacion', nombre: 'Divulgación', para: 'Charla para público general: un gancho cotidiano, pocas ideas con analogías y un mensaje para llevarse a casa.',
    nominal: 15, rango: [5, 30], nivel: 'divulgacion', partes: {def: 3, max: 4, que: 'ideas'},
    titulo: '[Título: una pregunta o una imagen cotidiana]',
    portada: 'Tu nombre y de dónde vienes, sin siglas. El título debe entenderlo cualquiera.',
    diapositivas: p => [
      D('gancho', 'enunciado', '[Una pregunta o una escena cotidiana que conecte con tu tema]',
        'Empieza por algo que el público ya vive (la batería del teléfono, el color de una pintura) y no por tu técnica. Si no se enganchan en el primer minuto, no vuelven.',
        {peso: 1.5, clave: true, zonas: [[T('[La pregunta o la escena, en palabras de todos los días]')]]}),
      D('por-que-importa', 'twocol', '[Por qué importa: el problema en palabras de todos]',
        'Un solo problema y a quién afecta. Cualquier cifra que uses necesita fuente verificada; mejor una imagen que un número.',
        {peso: 2, zonas: [[T('[El problema y a quién afecta]')], [F('[Pie: imagen que muestre el problema; cita la fuente si no es tuya]')]]}),
      ...Array.from({length: p}, (_, k) => D('idea', 'twocol', '[' + ORDA[k][0].toUpperCase() + ORDA[k].slice(1) + ' idea: una frase sin tecnicismos]',
        'Una idea por diapositiva, con una analogía o un ejemplo cotidiano. Si un término técnico es imprescindible, escríbelo como {{término}} y añade su glosa en el editor: en el nivel divulgación su explicación sale al pie.',
        {peso: 3, minimo: 1, zonas: [[T('[Una analogía o un ejemplo cotidiano que la explique]')], [F('[Pie: imagen que la ilustre]')]]})),
      D('mensaje', 'enunciado', '[El mensaje para llevarse a casa]',
        'La frase que quieres que repitan en la cena. Si solo recordaran una diapositiva, que sea esta.',
        {peso: 1.5, clave: true, zonas: [[T('[El mensaje, en una frase]')]]}),
      D('que-sigue', 'content', '[Qué sigue y quién lo hace]',
        'Cierra con personas: quién hace este trabajo, dónde, y cómo puede el público saber más.',
        {peso: 1, opcional: true, zonas: [[V('[Quién hace este trabajo y dónde]', '[Dónde saber más]')]]}),
      agradecimientos()
    ]},

  {id: 'poster-flash', nombre: 'Presentación flash de póster', para: 'Los pocos minutos para anunciar tu póster en una sesión flash: la pregunta, un resultado y la invitación a pasar.',
    nominal: 3, rango: [2, 5], nivel: 'congreso', partes: null,
    titulo: '[Título del póster]',
    portada: 'Nombre y título del póster en una frase: cada segundo cuenta.',
    diapositivas: () => [
      D('pregunta', 'enunciado', '[La pregunta de tu póster, en una frase]',
        'Sin antecedentes: la pregunta sola, dicha para alguien de otra área.',
        {peso: 0.5, minimo: 0.25, zonas: [[T('[La pregunta o el problema]')]]}),
      D('metodo', 'content', '[Cómo lo abordaste, en una línea]',
        'Una línea basta: el material y la técnica principal.',
        {peso: 0.5, minimo: 0.25, opcional: true, zonas: [[T('[Material y técnica principal]')]]}),
      resultado(0, {peso: 1, minimo: 0.5, titulo: '[El resultado que quieres que vean: una frase con verbo]',
        notas: GUIA + 'Un solo resultado, la figura más clara del póster y un título que lo diga. Nada de tablas: no da tiempo a leerlas.' + CIERRE_NOTA}),
      D('invitacion', 'enunciado', '[Por qué pasar por tu póster]',
        'Termina con la invitación: dónde está el póster, cuándo estarás y qué podrán discutir contigo.',
        {peso: 0.5, minimo: 0.25, clave: true, zonas: [[T('[Ubicación del póster, horario y lo que podrán discutir contigo]')]]})
    ]}
];
const POR_ID = Object.fromEntries(ESQUELETOS.map(e => [e.id, e]));

/* ---------- el tiempo ----------
   Los minutos se reparten en pasos (medio minuto; un cuarto en charlas de
   cinco minutos o menos) con el método del mayor resto: cada diapositiva
   recibe lo proporcional a su peso, ninguna baja de su mínimo y la suma es
   exactamente la duración pedida, redondeada al paso. */
function reparte(pesos, minimos, total, paso) {
  const U = Math.round(total / paso);
  const m = minimos.map(x => Math.max(1, Math.ceil(x / paso - 1e-9)));
  const fijo = new Array(pesos.length).fill(false);
  let libres = U, peso = pesos.reduce((a, b) => a + b, 0), ideal;
  for (;;) {
    ideal = pesos.map((w, i) => fijo[i] ? m[i] : w * libres / peso);
    const bajo = ideal.findIndex((x, i) => !fijo[i] && x < m[i]);
    if (bajo < 0) break;
    fijo[bajo] = true; libres -= m[bajo]; peso -= pesos[bajo];
  }
  const u = ideal.map(Math.floor);
  let resto = U - u.reduce((a, b) => a + b, 0);
  ideal.map((x, i) => [x - u[i], i]).filter(([, i]) => !fijo[i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => { if (resto > 0) { u[i]++; resto--; } });
  return u.map(x => x * paso);
}

function planDe(tipo, a, sugerir = true) {
  const esq = POR_ID[tipo];
  if (!esq) throw new ErrorUso('Esqueleto desconocido: «' + tipo + '». Tipos: ' + ESQUELETOS.map(e => e.id).join(', ') + '.');
  const minutos = a.minutos != null ? +a.minutos : esq.nominal;
  if (!(minutos > 0 && minutos <= 240)) throw new ErrorUso('«minutos» debe estar entre 0 y 240.');
  let partes = null;
  if (esq.partes) {
    partes = a.partes != null ? Math.floor(+a.partes) : esq.partes.def;
    if (!(partes >= 1 && partes <= esq.partes.max)) throw new ErrorUso('«partes» (' + esq.partes.que + ') debe estar entre 1 y ' + esq.partes.max + ' en «' + tipo + '».');
  } else if (a.partes != null) throw new ErrorUso('«' + tipo + '» no tiene partes que repetir.');
  const paso = minutos <= 5 ? 0.25 : 0.5;
  const portada = {rol: 'portada', diseno: 'title', notas: GUIA + esq.portada + CIERRE_NOTA, peso: minutos <= 5 ? 0.25 : 0.5, minimo: 0.25};
  let lista = [portada, ...esq.diapositivas(partes)];
  const omitidas = [];
  const cuenta = l => l.filter(d => !d.respaldo);
  const necesita = l => cuenta(l).reduce((s, d) => s + Math.max(paso, Math.ceil(d.minimo / paso - 1e-9) * paso), 0);
  /* Si no cabe, se van primero las opcionales, empezando por el final. */
  while (necesita(lista) > minutos + 1e-9) {
    const j = lista.map(d => !!d.opcional && !d.respaldo).lastIndexOf(true);
    if (j < 0) break;
    omitidas.push(lista[j].rol);
    lista = lista.filter((_, i) => i !== j);
  }
  if (necesita(lista) > minutos + 1e-9) {
    if (!sugerir) throw new ErrorUso('No cabe.');
    /* La sugerencia tiene que caber de verdad: el mayor número de partes que
       entra, o los esqueletos que sí caben en esos minutos. Esas pruebas no
       sugieren a su vez (sugerir=false), o se llamarían sin fin. */
    let menos = null;
    for (let q = (partes || 1) - 1; q >= 1 && menos == null; q--) { try { planDe(tipo, {minutos, partes: q}, false); menos = q; } catch {} }
    const caben = ESQUELETOS.filter(e => e.id !== tipo).filter(e => { try { planDe(e.id, {minutos}, false); return true; } catch { return false; } }).map(e => e.id);
    throw new ErrorUso('«' + tipo + '» necesita al menos ' + necesita(lista) + ' min con ' + cuenta(lista).length + ' diapositivas y se pidieron ' + minutos + '.' +
      (menos ? ' Prueba con menos partes (partes: ' + menos + ') o con más minutos.' : ' Pide más minutos' + (caben.length ? ' o usa un esqueleto que quepa (' + caben.join(', ') + ').' : '.')));
  }
  const charla = cuenta(lista);
  const reparto = reparte(charla.map(d => d.peso), charla.map(d => d.minimo), minutos, paso);
  charla.forEach((d, i) => { d.min = reparto[i]; });
  const avisos = [];
  if (minutos < esq.rango[0] || minutos > esq.rango[1]) avisos.push('Un «' + esq.nombre + '» suele durar entre ' + esq.rango[0] + ' y ' + esq.rango[1] + ' min; se pidieron ' + minutos + '.');
  const media = minutos / charla.length;
  if (media > 3) avisos.push('Salen ' + (Math.round(media * 10) / 10) + ' min por diapositiva de media: ' + (esq.partes ? 'sube «partes» o ' : '') + 'añade diapositivas de resultados con agregar_diapositivas.');
  if (omitidas.length) avisos.push('No cabían en ' + minutos + ' min y se omitieron: ' + omitidas.join(', ') + '.');
  return {esq, minutos, partes, paso, lista, omitidas, avisos};
}

/* ---------- herramientas ---------- */
const resumenEsqueleto = (e, detalle) => {
  const out = {id: e.id, nombre: e.nombre, para: e.para, minutos_por_omision: e.nominal, minutos_habituales: e.rango.join('–'), nivel: e.nivel};
  if (e.partes) out.partes = {que_se_repite: e.partes.que, por_omision: e.partes.def, maximo: e.partes.max};
  const {lista} = planDe(e.id, {});
  out.diapositivas = detalle ? lista.map(d => ({rol: d.rol, diseno: d.diseno, titulo: d.titulo || '(portada)', minutos: d.respaldo ? 'respaldo' : d.min}))
    : lista.filter(d => !d.respaldo).length + (lista.some(d => d.respaldo) ? ' + ' + lista.filter(d => d.respaldo).length + ' de respaldo' : '');
  out.guion = [...new Set(lista.filter(d => !['seccion', 'indice'].includes(d.rol)).map(d => d.rol))].join(' → ');
  return out;
};

async function crea(a) {
  const {esq, minutos, partes, lista, avisos} = planDe(a.tipo, a);
  const ruta = rutaSegura(a.archivo, '.json');
  if (existsSync(ruta) && !a.sobrescribir) throw new ErrorUso('«' + visible(ruta) + '» ya existe. Elige otro nombre o pasa sobrescribir: true (la versión anterior queda en el historial).');
  const [portada, ...resto] = lista;
  const meta = {titulo: a.titulo || esq.titulo, autores: a.autores || '[Autores: quien presenta, señalado]', institucion: a.institucion || '[Institución]'};
  if (a.subtitulo || esq.subtitulo) meta.subtitulo = a.subtitulo || esq.subtitulo;
  for (const k of ['fecha', 'tema', 'aspecto']) if (a[k] != null) meta[k] = a[k];
  let r = await op('nueva', {...meta, diapositivas: resto.map(d => {
    const s = {diseno: d.diseno, titulo: d.titulo, notas: d.notas, zonas: d.zonas || []};
    if (d.encabezados) s.encabezados = d.encabezados;
    if (d.min) s.minutos = d.min;
    return s;
  })});
  /* Sin título del usuario, el pie no debe llevar la guía recortada: vacío,
     muestra el título completo y sigue al que se escriba después. */
  r = await op('esqueletoAcaba', {deck: r.deck, nivel: esq.nivel, sinCorto: !a.titulo,
    portada: {notas: portada.notas, minutos: portada.min},
    respaldo: lista.flatMap((d, i) => d.respaldo ? [i] : []),
    clave: lista.flatMap((d, i) => d.clave ? [i] : [])});
  guardaVersion(ruta, 'crear_desde_esqueleto');
  escribe(ruta, r.deck);
  const charla = lista.filter(d => !d.respaldo);
  return {
    archivo: visible(ruta), esqueleto: esq.id, nombre: esq.nombre, ...(partes ? {partes} : {}),
    minutos_objetivo: minutos, minutos_asignados: Math.round(charla.reduce((s, d) => s + d.min, 0) * 100) / 100,
    diapositivas: lista.map((d, i) => ({n: i + 1, rol: d.rol, diseno: d.diseno, titulo: i ? d.titulo : meta.titulo, minutos: d.respaldo ? 'respaldo' : d.min})),
    avisos: [...avisos, ...(r.avisos || [])],
    siguiente: 'Todo lo que está entre corchetes es un hueco: pide al usuario su contenido real diapositiva por diapositiva (prompt rellenar_esqueleto) y sustitúyelo con editar_diapositiva, editar_bloque y editar_metadatos. Las figuras vacías se llenan con editar_bloque (archivo o archivo_datos). Elimina las diapositivas que no apliquen en vez de inventar su contenido. revisar_presentacion lista lo pendiente en «adicional» (regla esqueleto-pendiente).'
  };
}

export default {
  herramientas: [
    {name: 'listar_esqueletos', title: 'Listar esqueletos de charla',
      description: 'Tipos de charla científica con estructura predefinida: reunión de grupo, congreso de 10 y de 15 min, defensa de tesis, journal club, seminario, divulgación y presentación flash de póster. Da el guion de cada uno; con «tipo», sus diapositivas con diseño y minutos.',
      inputSchema: {type: 'object', properties: {tipo: {type: 'string', enum: ESQUELETOS.map(e => e.id), description: 'Ver en detalle un esqueleto.'}}},
      annotations: {readOnlyHint: true, openWorldHint: false},
      run: async a => a.tipo ? resumenEsqueleto(POR_ID[a.tipo] || planDe(a.tipo, {}).esq, true)
        : {esqueletos: ESQUELETOS.map(e => resumenEsqueleto(e, false)), nota: 'crear_desde_esqueleto crea el proyecto con huecos marcados entre corchetes; no pone datos, resultados ni referencias.'}},
    {name: 'crear_desde_esqueleto', title: 'Crear desde un esqueleto',
      description: 'Crea una presentación con la estructura de un tipo de charla (listar_esqueletos): cada diapositiva con un diseño adecuado a su papel, un título-guía entre corchetes, notas que explican qué va ahí y por qué, y minutos repartidos para sumar la duración pedida. No inventa contenido: los huecos van entre corchetes y las figuras vacías; revisar_presentacion los señala hasta que se sustituyan por el material del usuario.',
      inputSchema: {type: 'object', required: ['archivo', 'tipo'], properties: {
        archivo: {type: 'string', description: 'Proyecto JSON que se crea en la carpeta de trabajo.'},
        tipo: {type: 'string', enum: ESQUELETOS.map(e => e.id)},
        minutos: {type: 'number', exclusiveMinimum: 0, maximum: 240, description: 'Duración de la charla; por omisión, la habitual del tipo. Las diapositivas opcionales se omiten si no caben.'},
        partes: {type: 'integer', minimum: 1, maximum: 6, description: 'Cuántas veces se repite el bloque central: resultados, capítulos, figuras clave o ideas, según el tipo.'},
        titulo: {type: 'string'}, subtitulo: {type: 'string'}, autores: {type: 'string'}, institucion: {type: 'string'}, fecha: {type: 'string'},
        tema: {type: 'string', description: 'Id de tema (guia_formato).'}, aspecto: {type: 'string', enum: ['169', '43']},
        sobrescribir: {type: 'boolean'}}},
      annotations: {readOnlyHint: false, destructiveHint: false, openWorldHint: false},
      run: crea}
  ],
  prompts: [{
    name: 'rellenar_esqueleto', title: 'Rellenar un esqueleto de charla',
    description: 'Guía para llenar, con el material real del usuario, una presentación creada con crear_desde_esqueleto.',
    arguments: [{name: 'archivo', description: 'Proyecto creado desde un esqueleto', required: true}, {name: 'materiales', description: 'Archivos de datos, figuras o notas del usuario en la carpeta de trabajo'}],
    texto: a => `Vamos a llenar el esqueleto «${a.archivo}» con mi contenido real.${a.materiales ? '\nMateriales disponibles: ' + a.materiales + '.' : ''}
1. ver_presentacion y revisar_presentacion: la regla «esqueleto-pendiente» de «adicional» lista cada hueco (texto entre corchetes, figuras vacías, notas de guía). Lee las notas de cada diapositiva: explican qué va ahí y por qué.
2. Recorre las diapositivas en orden. Para cada una, pregúntame lo que necesitas o propón un texto a partir de mis materiales y espera mi confirmación. No inventes datos, cifras, resultados, nombres ni referencias: lo que yo no te dé se queda como hueco y me lo recuerdas al final.
3. Títulos: sustituye la guía por una afirmación con verbo que diga la conclusión de la diapositiva («El pH 10 da la fase más pura», no «Resultados»). Los títulos que no son huecos (secciones, agradecimientos) se quedan.
4. Figuras: llena los marcos vacíos con editar_bloque (archivo para imágenes, o cambia a un bloque chart con archivo_datos para datos de equipo; estruct con smiles para moléculas, comprobando la fórmula devuelta). Pie con muestra, técnica y condiciones.
5. Referencias solo las que yo dé o estén verificadas, con agregar_referencia. Metadatos (título, autores, institución) con editar_metadatos.
6. Notas: reemplaza la guía por lo que voy a decir, en frases cortas. Si una diapositiva no aplica, elimínala en vez de rellenarla; conserva los minutos o reajústalos para que la suma siga siendo la duración.
7. Al terminar: revisar_presentacion con minutos_objetivo (no debe quedar nada en «esqueleto-pendiente»), vista_previa en mosaico, y un resumen de lo que falta que yo aporte.`
  }],
  convenciones: {
    esqueletos: 'crear_desde_esqueleto arma la estructura de un tipo de charla (listar_esqueletos) con huecos entre corchetes, p. ej. «[Una frase con el resultado principal]», y notas que empiezan por «Guía del esqueleto:». revisar_presentacion los señala en «adicional» (regla esqueleto-pendiente) hasta que se sustituyen. Un texto entre corchetes que empieza por mayúscula y no lleva cifras ni paréntesis cuenta como hueco.'
  }
};

/* Para las pruebas: el reparto y el plan sin tocar disco. */
export {reparte, planDe, ESQUELETOS};
