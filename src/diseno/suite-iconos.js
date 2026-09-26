/* erlen-diseno 1.8.1 · generado por herramientas/diseno-sync.mjs --modo iife; no editar a mano */
const erlenIconos=(()=>{
// SPDX-License-Identifier: MIT
/* Copyright (c) 2026 Erlen contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* Iconos de herramientas de Erlen Suite (docs/COHERENCIA-APPS.md §7 del portal).
   Familia propia, dibujada a mano para la cinta y los menús de las apps: rejilla de
   24×24 con margen de 3–3,5, trazo 1,6 redondeado, esquinas de 1,5–2 en los
   contenedores y detalles macizos con círculos de r=1,2 en currentColor. Un
   significado, un icono. Sin dependencias; no toca el DOM.

   iconos[id]        contenido interno del <svg> (sin envoltorio), una línea por icono.
   nombresIconos     lista de ids en el orden del catálogo (docs/iconos.html).
   icono(id,{titulo}) <svg> completo con la gramática fija: viewBox 0 0 24 24,
                     fill="none", stroke="currentColor", stroke-width="1.6", extremos
                     y uniones redondeados, class="erlen-icono", data-icono,
                     aria-hidden="true" y focusable="false". Con titulo añade <title>
                     (tooltip); el icono sigue oculto a los lectores: el nombre
                     accesible lo lleva siempre el control que lo contiene.
   Uso en la cinta: {tipo:'grande', etiqueta:'Guardar', icono:icono('guardar'), accion}. */
const iconos={
 // Archivo
 inicio:'<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v9.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 20v-5h4v5"/>',
 archivo:'<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5"/><path d="M8.8 13h6.4M8.8 16.5h4.4"/>',
 nuevo:'<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5"/><path d="M12 11.5v6M9 14.5h6"/>',
 abrir:'<path d="M3.5 17.5V6A1.5 1.5 0 0 1 5 4.5h3.8l2 2.3H17a1.5 1.5 0 0 1 1.5 1.5v1.9"/><path d="M3.5 17.5l2.3-6.3a1.5 1.5 0 0 1 1.4-1h12.4a1 1 0 0 1 .95 1.3l-2 6.3a1.5 1.5 0 0 1-1.43 1.1H4.5a1 1 0 0 1-1-1.4z"/>',
 guardar:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10.2L20 8.3v10.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M8 4v4h7V4"/><path d="M7.5 20v-5.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V20"/>',
 'guardar-como':'<path d="M12 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4h10.2L20 8.3v2"/><path d="M8 4v4h7V4"/><path d="M7.5 20v-5.5a1 1 0 0 1 1-1H12"/><path d="m14.5 20.5.5-2.5 4-4a1.4 1.4 0 0 1 2 2l-4 4z"/>',
 importar:'<path d="M13.5 4.5h4A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M4 12h10M10.5 8.5 14 12l-3.5 3.5"/>',
 exportar:'<path d="M10.5 4.5h-4A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h4"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
 descargar:'<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
 cargar:'<path d="M12 15V4M7.5 8 12 3.5 16.5 8"/><path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
 imprimir:'<path d="M7 8.5v-5h10v5"/><path d="M7 16.5H5.5A1.5 1.5 0 0 1 4 15v-5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 10v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 13.5h10v7H7z"/><circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none"/>',
 compartir:'<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.7 10.7 6.6-3.9M8.7 13.3l6.6 3.9"/>',
 paquete:'<path d="M12 3.5 19.5 7.5v9L12 20.5l-7.5-4v-9z"/><path d="M4.5 7.5 12 11.5l7.5-4M12 11.5v9"/><path d="m8.2 5.5 7.5 4v3.2"/>',
 informe:'<path d="M15.5 5H17a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 7 5h1.5"/><rect x="8.5" y="3.5" width="7" height="3.5" rx="1"/><path d="M9 16.5v-2.5M12 16.5v-5.5M15 16.5v-4"/>',
 respaldo:'<rect x="3.5" y="4" width="17" height="5" rx="1.2"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
 historial:'<path d="M4.8 13a7.5 7.5 0 1 0 1.9-6.3L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M12 8v4.5l3 2"/>',
 plantilla:'<rect x="4" y="3.5" width="16" height="6" rx="1.5"/><rect x="4" y="12.5" width="7" height="8" rx="1.5"/><rect x="14" y="12.5" width="6" height="8" rx="1.5"/>',
 ejemplo:'<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5"/><path d="M12 10.5c.35 2.3 1.2 3.15 3.5 3.5-2.3.35-3.15 1.2-3.5 3.5-.35-2.3-1.2-3.15-3.5-3.5 2.3-.35 3.15-1.2 3.5-3.5z"/>',
 biblioteca:'<path d="M4.5 4.5h3v15h-3zM9.5 4.5h3v15h-3z"/><path d="m14.3 5.4 2.9-.8 3.9 14.5-2.9.8z"/>',
 libro:'<path d="M12 6.5c-1.8-1.6-4.3-2.3-8-2v13.5c3.7-.3 6.2.4 8 2 1.8-1.6 4.3-2.3 8-2V4.5c-3.7-.3-6.2.4-8 2z"/><path d="M12 6.5v13.5"/>',
 catalogo:'<rect x="3.5" y="9.5" width="17" height="10.5" rx="1.5"/><path d="M5.5 6.5h13M7.5 3.8h9"/><path d="M9.5 14.8h5"/>',
 cuenta:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="10" r="3"/><path d="M6.6 18.1a6 6 0 0 1 10.8 0"/>',
 buzon:'<path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/><path d="M5.7 5.6a1.5 1.5 0 0 1 1.4-1.1h9.8a1.5 1.5 0 0 1 1.4 1.1l2.2 7.9v5a1.5 1.5 0 0 1-1.5 1.5h-14a1.5 1.5 0 0 1-1.5-1.5v-5z"/>',
 informacion:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none"/>',
 ayuda:'<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5"/><circle cx="12" cy="16.8" r="1.2" fill="currentColor" stroke="none"/>',
 cerrar:'<path d="M6 6l12 12M18 6 6 18"/>',
 // Edición
 deshacer:'<path d="M8.5 13.5 4 9l4.5-4.5"/><path d="M4 9h10a5.5 5.5 0 0 1 0 11h-3.5"/>',
 rehacer:'<path d="M15.5 13.5 20 9l-4.5-4.5"/><path d="M20 9H10a5.5 5.5 0 0 0 0 11h3.5"/>',
 cortar:'<circle cx="6.5" cy="17" r="2.8"/><circle cx="17.5" cy="17" r="2.8"/><path d="M8.2 14.8 17 3.5M15.8 14.8 7 3.5"/>',
 copiar:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.8"/><path d="M15.5 8.5v-3A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
 pegar:'<path d="M15.5 5H17a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 7 5h1.5"/><rect x="8.5" y="3.5" width="7" height="3.5" rx="1"/><path d="M9 11.5h6M9 15h4"/>',
 duplicar:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.8"/><path d="M15.5 8.5v-3A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/><path d="M14.25 11.5v5.5M11.5 14.25H17"/>',
 eliminar:'<path d="M4.5 6.5h15M9.5 6.5v-2h5v2"/><path d="m6.5 6.5.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.1"/><path d="M10.2 10.5v6M13.8 10.5v6"/>',
 editar:'<path d="M14.5 5.5 18.5 9.5"/><path d="M16 4a2 2 0 0 1 2.9 0l1.1 1.1a2 2 0 0 1 0 2.9L9.5 18.5 4.5 19.5l1-5z"/>',
 buscar:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
 reemplazar:'<circle cx="9.5" cy="9.5" r="5"/><path d="m13.2 13.2 2.3 2.3"/><path d="M13 19h6.5M17 16.5l2.5 2.5-2.5 2.5"/>',
 comando:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m7.5 9.5 3 2.5-3 2.5M12.5 15h4"/>',
 seleccionar:'<path d="M5 4l12.5 6.2-5.3 1.6-2 5.2z"/><path d="m12.4 12 5.6 7"/>',
 'seleccionar-todo':'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="2.6 2.7"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
 deseleccionar:'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="2.6 2.7"/><path d="m9 9 6 6M15 9l-6 6"/>',
 casilla:'<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="m8 12.3 2.8 2.8L16.2 9"/>',
 revisar:'<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.6 2.6 5-5.2"/>',
 mas:'<path d="M12 5v14M5 12h14"/>',
 menos:'<path d="M5 12h14"/>',
 'mas-opciones':'<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
 ordenar:'<path d="M7.5 20V4M4.5 7l3-3 3 3M16.5 4v16M13.5 17l3 3 3-3"/>',
 izquierda:'<path d="m14.5 6-6 6 6 6"/>',
 derecha:'<path d="m9.5 6 6 6-6 6"/>',
 arriba:'<path d="m6 14.5 6-6 6 6"/>',
 abajo:'<path d="m6 9.5 6 6 6-6"/>',
 // Vista
 acercar:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M10.5 8v5M8 10.5h5"/>',
 alejar:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5"/>',
 ajustar:'<path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M15 4v3.5A1.5 1.5 0 0 0 16.5 9H20M20 15h-3.5a1.5 1.5 0 0 0-1.5 1.5V20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20"/>',
 'pantalla-completa':'<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
 enfoque:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.3"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
 mosaico:'<rect x="3.5" y="5" width="7.5" height="6" rx="1.2"/><rect x="13" y="5" width="7.5" height="6" rx="1.2"/><rect x="3.5" y="13" width="7.5" height="6" rx="1.2"/><rect x="13" y="13" width="7.5" height="6" rx="1.2"/>',
 tema:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
 panel:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/><path d="M16.8 8.5h1.5M16.8 11.5h1.5"/>',
 'panel-izquierdo':'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="M5.7 8.5h1.5M5.7 11.5h1.5"/>',
 propiedades:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 cuadricula:'<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
 regla:'<rect x="2.9" y="8.2" width="18.2" height="7.6" rx="1.4" transform="rotate(-45 12 12)"/><path d="m8.8 9.4 1.6 1.6M11.3 6.9l1.1 1.1M13.8 4.4l1.6 1.6M6.3 11.9l1.1 1.1"/>',
 visible:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
 apilar:'<path d="M3.5 7c2.5 0 3-3 4.5-3s2 3 4 3 2.5-1.5 4-1.5 2 1.5 4.5 1.5"/><path d="M3.5 13c2.5 0 3-3 4.5-3s2 3 4 3 2.5-1.5 4-1.5 2 1.5 4.5 1.5"/><path d="M3.5 19c2.5 0 3-3 4.5-3s2 3 4 3 2.5-1.5 4-1.5 2 1.5 4.5 1.5"/>',
 idioma:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z"/>',
 teclado:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="6.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="10.2" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="13.8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M8 14.3h8"/>',
 codigo:'<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/><path d="m13.5 4.5-3 15"/>',
 asistente:'<path d="M10.5 4c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z"/><path d="M18 3v4M16 5h4"/>',
 ideas:'<path d="M9 17.5v-1.3c0-1-.5-1.8-1.3-2.6A6 6 0 1 1 16.3 13.6c-.8.8-1.3 1.6-1.3 2.6v1.3z"/><path d="M9.5 20.5h5"/>',
 // Texto
 negrita:'<path d="M7 4.5h5.8a3.6 3.6 0 0 1 0 7.2H7zM7 11.7h6.8a3.9 3.9 0 0 1 0 7.8H7z"/>',
 cursiva:'<path d="M10.5 4.5h7M6.5 19.5h7M14 4.5l-4 15"/>',
 subrayado:'<path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M5 20h14"/>',
 tachado:'<path d="M4.5 12h15"/><path d="M16 6.8C15.4 5.2 13.9 4.5 12 4.5c-2.4 0-4 1.3-4 3.2 0 1.2.7 2.1 2 2.8"/><path d="M8 17.2c.6 1.6 2.1 2.3 4 2.3 2.5 0 4.2-1.3 4.2-3.3 0-.7-.2-1.3-.6-1.8"/>',
 resaltar:'<path d="m9 14 7.3-7.3a1.9 1.9 0 0 1 2.7 2.7L11.7 16.7"/><path d="m9 14-1.8 1.8L8 19.2l2.4-1.2 1.3-1.3z"/><path d="M4 20.5h3"/>',
 fuente:'<path d="M3.5 18 8 6l4.5 12M5.2 13.5h5.6"/><circle cx="17" cy="15.2" r="2.8"/><path d="M19.8 11.8V18"/>',
 'color-texto':'<path d="M6.5 15.5 12 3.5l5.5 12M8.4 11.3h7.2"/><rect x="4" y="18.2" width="16" height="2.6" rx=".8" fill="currentColor" stroke="none"/>',
 subindice:'<path d="m4 6 8 10M12 6l-8 10"/><path d="M15.4 16.1a1.7 1.7 0 1 1 2.9 1.3L15.4 20.5h3.9"/>',
 superindice:'<path d="m4 8 8 10M12 8l-8 10"/><path d="M15.4 5.1a1.7 1.7 0 1 1 2.9 1.3L15.4 9.5h3.9"/>',
 encabezado:'<path d="M5.5 4.5v15M14.5 4.5v15M5.5 12h9"/><path d="M17.5 12.5l2-1.5v8.5"/>',
 parrafo:'<path d="M13.5 4.5v15M17.5 4.5v15M19.5 4.5H10a4.2 4.2 0 0 0 0 8.4h3.5"/>',
 lista:'<circle cx="5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="17.5" r="1.2" fill="currentColor" stroke="none"/><path d="M9 6.5h11M9 12h11M9 17.5h11"/>',
 'lista-numerada':'<path d="M4.3 5.3 5.8 4.3v5"/><path d="M4.1 14.7a1.4 1.4 0 1 1 2.5.9L4.1 19h2.8"/><path d="M10 6.8h10M10 16.8h10"/>',
 tareas:'<rect x="3.5" y="4" width="6.5" height="6.5" rx="1.3"/><path d="m5.3 7.3 1.2 1.2 2-2.3"/><rect x="3.5" y="13.5" width="6.5" height="6.5" rx="1.3"/><path d="M13.5 7.2h7M13.5 16.8h7"/>',
 esquema:'<circle cx="5" cy="5.5" r="1.2" fill="currentColor" stroke="none"/><path d="M8.5 5.5H20"/><path d="M5 9v7.5a2 2 0 0 0 2 2h2M5 12.5h4"/><path d="M12.5 12.5H20M12.5 18.5H20"/>',
 sangria:'<path d="M11 5.5h9M11 10h9M11 14.5h9M4 19h16"/><path d="m4 8.3 3 2.2-3 2.2"/>',
 'texto-izquierda':'<path d="M4 5.5h16M4 10h10M4 14.5h16M4 19h10"/>',
 'texto-centro':'<path d="M4 5.5h16M7 10h10M4 14.5h16M7 19h10"/>',
 'texto-derecha':'<path d="M4 5.5h16M10 10h10M4 14.5h16M10 19h10"/>',
 justificar:'<path d="M4 5.5h16M4 10h16M4 14.5h16M4 19h16"/>',
 cita:'<path d="M5 18c2.6-1 4.2-3.3 4.2-6.8V6.5H5v4.7h4.2"/><path d="M14.8 18c2.6-1 4.2-3.3 4.2-6.8V6.5h-4.2v4.7H19"/>',
 separador:'<path d="M3.5 12h17"/><path d="M4 6h16M4 18h16" stroke-dasharray="0 3"/>',
 'salto-pagina':'<path d="M6 3.5V8a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 8V3.5"/><path d="M6 20.5V16a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 16v4.5"/><path d="M3.5 12h2M8.5 12h2M13.5 12h2M18.5 12h2"/>',
 pagina:'<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><rect x="8" y="7" width="8" height="10" rx=".5" stroke-dasharray="1.6 2.2"/>',
 'nota-pie':'<path d="M4 5h9M4 9.5h9M4 14h16"/><path d="M16.5 5.3 18.3 4v6"/><path d="M4 17.8h4M4 20.5h12"/>',
 // Insertar
 texto:'<path d="M5 7V4.5h14V7M12 4.5v15M9 19.5h6"/>',
 tabla:'<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M3.5 9.5h17M3.5 14.5h17M9.2 9.5v10M14.8 9.5v10"/>',
 imagen:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.7"/><path d="m4 17.5 4.8-4.8 4.2 4.2 2.5-2.5 4.5 4.5"/>',
 ecuacion:'<path d="M3.5 13h2.3l2.9 6.5L12.4 4.5h8.1"/><path d="m14.2 10.5 5 6M19.2 10.5l-5 6"/>',
 formula:'<path d="M11 4.5h-1A2.5 2.5 0 0 0 7.5 7v12.5M4.5 10h6"/><path d="m13.5 11 6 7.5M19.5 11l-6 7.5"/>',
 grafica:'<path d="M4 4v16h16"/><rect x="7.5" y="12" width="3" height="5" rx=".5"/><rect x="12.5" y="8" width="3" height="9" rx=".5"/><path d="M17.5 17V5.5"/>',
 enlace:'<path d="M10.2 13.8a3.8 3.8 0 0 0 5.4 0l3-3a3.8 3.8 0 0 0-5.4-5.4l-1.2 1.2"/><path d="M13.8 10.2a3.8 3.8 0 0 0-5.4 0l-3 3a3.8 3.8 0 0 0 5.4 5.4l1.2-1.2"/>',
 referencias:'<path d="M7.5 4.5h-3v15h3M16.5 4.5h3v15h-3"/><path d="M10.3 8.8 12.6 7v10"/>',
 adjunto:'<path d="m17 8-7.1 7.1a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5a3.4 3.4 0 0 1 4.8 4.8l-7.6 7.6a5.1 5.1 0 0 1-7.2-7.2l6.6-6.6"/>',
 comentario:'<path d="M5.5 4.5h13A1.5 1.5 0 0 1 20 6v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5A1.5 1.5 0 0 1 4 15V6a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M8 9h8M8 12h5"/>',
 pregunta:'<path d="M5.5 4.5h13A1.5 1.5 0 0 1 20 6v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5A1.5 1.5 0 0 1 4 15V6a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M10 8.6a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.3"/><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>',
 notas:'<rect x="3.5" y="3.5" width="17" height="9.5" rx="1.5"/><path d="M4 16.5h16M4 20h10"/>',
 anotar:'<path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.5 1.5V14L14 19.5H6a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M19.5 14h-4A1.5 1.5 0 0 0 14 15.5v4"/><path d="M8 8.5h8M8 12h4.5"/>',
 pendientes:'<path d="M5.5 20.5V4"/><path d="M5.5 4.5h11.8l-2.6 4.3 2.6 4.2H5.5"/>',
 tiempo:'<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3.5h4M12 3.5v3M17.3 7.6l1.3-1.3"/>',
 microfono:'<rect x="9" y="3.5" width="6" height="10.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5M9 20.5h6"/>',
 // Objetos
 forma:'<circle cx="8.5" cy="8.5" r="4.5"/><rect x="11.5" y="11.5" width="9" height="9" rx="1.2"/>',
 flecha:'<path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5"/>',
 linea:'<path d="M6.2 17.8 17.8 6.2"/><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none"/>',
 grosor:'<path d="M4 5.5h16"/><rect x="4" y="10" width="16" height="2.4" rx="1.2" fill="currentColor" stroke="none"/><rect x="4" y="16" width="16" height="3.8" rx="1.6" fill="currentColor" stroke="none"/>',
 color:'<path d="M12 3.5c3.3 4 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.2-6 5.5-10z"/><path d="M9.3 14a2.8 2.8 0 0 0 2.2 2.8"/>',
 paleta:'<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.7 1.8-1.6 0-.5-.2-.9-.5-1.3s-.5-.8-.5-1.3c0-.9.7-1.6 1.6-1.6h1.9a4.2 4.2 0 0 0 4.2-4.2c0-3.9-3.8-7-8.5-7z"/><circle cx="7.8" cy="11.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="9.8" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>',
 pincel:'<path d="m20 4-8.3 8.9"/><path d="M11.5 12.6a2.8 2.8 0 0 0-4 0c-1.2 1.2-.5 3.4-3.5 4.6 2 1.9 5.8 2.1 7.4.5a2.8 2.8 0 0 0 .1-5.1z"/>',
 recortar:'<path d="M7 3.5v12a1.5 1.5 0 0 0 1.5 1.5h12"/><path d="M3.5 7h12A1.5 1.5 0 0 1 17 8.5v12"/>',
 agrupar:'<rect x="7" y="7" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/><path d="M3.5 6.5v-2a1 1 0 0 1 1-1h2M17.5 3.5h2a1 1 0 0 1 1 1v2M20.5 17.5v2a1 1 0 0 1-1 1h-2M6.5 20.5h-2a1 1 0 0 1-1-1v-2"/>',
 desagrupar:'<rect x="3.5" y="3.5" width="8" height="8" rx="1.5"/><rect x="12.5" y="12.5" width="8" height="8" rx="1.5"/>',
 girar:'<rect x="4" y="10" width="9.5" height="10" rx="1.5"/><path d="M7.5 6.3A8.5 8.5 0 0 1 19 12.8"/><path d="m15.9 11.2 3.1 1.6 1.5-3.1"/>',
 subir:'<path d="M12 20V8M6.5 13.5 12 8l5.5 5.5M5 4h14"/>',
 bajar:'<path d="M12 4v12M6.5 10.5 12 16l5.5-5.5M5 20h14"/>',
 'traer-al-frente':'<path d="M7.5 15.5H5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v2.5"/><rect x="9" y="9" width="11.5" height="11.5" rx="1.5" fill="currentColor" stroke="none"/>',
 'enviar-al-fondo':'<path d="M5 3.5h9A1.5 1.5 0 0 1 15.5 5v2H8.5A1.5 1.5 0 0 0 7 8.5v7H5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5z" fill="currentColor" stroke="none"/><rect x="9" y="9" width="11.5" height="11.5" rx="1.5"/>',
 'alinear-izquierda':'<path d="M4 3.5v17"/><rect x="7" y="6" width="12.5" height="4.5" rx="1.2"/><rect x="7" y="13.5" width="7.5" height="4.5" rx="1.2"/>',
 'alinear-centro':'<path d="M12 3.5v2.5M12 10.5v3M12 18v2.5"/><rect x="5" y="6" width="14" height="4.5" rx="1.2"/><rect x="7.5" y="13.5" width="9" height="4.5" rx="1.2"/>',
 'alinear-derecha':'<path d="M20 3.5v17"/><rect x="4.5" y="6" width="12.5" height="4.5" rx="1.2"/><rect x="9.5" y="13.5" width="7.5" height="4.5" rx="1.2"/>',
 'alinear-arriba':'<path d="M3.5 4h17"/><rect x="6" y="7" width="4.5" height="12.5" rx="1.2"/><rect x="13.5" y="7" width="4.5" height="7.5" rx="1.2"/>',
 'alinear-medio':'<path d="M3.5 12h2.5M10.5 12h3M18 12h2.5"/><rect x="6" y="5" width="4.5" height="14" rx="1.2"/><rect x="13.5" y="7.5" width="4.5" height="9" rx="1.2"/>',
 'alinear-abajo':'<path d="M3.5 20h17"/><rect x="6" y="4.5" width="4.5" height="12.5" rx="1.2"/><rect x="13.5" y="9.5" width="4.5" height="7.5" rx="1.2"/>',
 'distribuir-horizontal':'<path d="M4 3.5v17M20 3.5v17"/><rect x="9.5" y="7" width="5" height="10" rx="1.2"/>',
 'distribuir-vertical':'<path d="M3.5 4h17M3.5 20h17"/><rect x="7" y="9.5" width="10" height="5" rx="1.2"/>',
 // Presentar
 presentar:'<path d="M7 5v14a1 1 0 0 0 1.5.9l11-7a1 1 0 0 0 0-1.8l-11-7A1 1 0 0 0 7 5z"/>',
 'presentar-desde-aqui':'<path d="M4.5 5v14"/><path d="M9 5.8v12.4a.9.9 0 0 0 1.4.8l9.3-6.2a.9.9 0 0 0 0-1.6L10.4 5a.9.9 0 0 0-1.4.8z"/>',
 presentador:'<rect x="3.5" y="4" width="17" height="12.5" rx="1.5"/><rect x="6" y="6.5" width="7" height="5" rx=".6"/><path d="M15.5 7h2.5M15.5 10h2.5M6 14h12"/><path d="M12 16.5v3.5M8.5 20h7"/>',
 transicion:'<rect x="9.5" y="5.5" width="11" height="13" rx="1.5"/><path d="M6.5 8v8M3.5 10v4"/>',
 efecto:'<path d="m4 20 11-11"/><path d="m13 7 4 4"/><path d="M18 3v3M16.5 4.5h3M20 10v3M18.5 11.5h3M9 3.5v3M7.5 5h3"/>',
 accesibilidad:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor" stroke="none"/><path d="m7.8 10.3 4.2.9 4.2-.9M12 11.2v2.8l-2.3 3.8M12 14l2.3 3.8"/>',
 publico:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.3a3 3 0 0 1 0 5.4M17.5 14.3a5.5 5.5 0 0 1 3 5.2"/>',
 ramas:'<circle cx="6.5" cy="5.5" r="2"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="7.5" r="2"/><path d="M6.5 7.5v9"/><path d="M17.5 9.5c0 3.8-3 4.5-6.5 5.2-2 .4-3.5 1-4.2 2"/>',
 // Ciencia y datos
 experimento:'<path d="M9.5 3.5h5M10.5 3.5V9l-5.4 9.3a1.4 1.4 0 0 0 1.2 2.2h11.4a1.4 1.4 0 0 0 1.2-2.2L13.5 9V3.5"/><path d="M7.3 14.5h9.4"/>',
 molecula:'<circle cx="6.5" cy="7" r="2.5"/><circle cx="17.5" cy="8" r="2.5"/><circle cx="11" cy="17.5" r="2.5"/><path d="M9 7.2l6 .6M16.1 10.1l-3.8 5.3M7.4 9.3l2.7 5.9"/>',
 reaccion:'<path d="M4 9h15.5M16 5.5 19.5 9"/><path d="M20 15H4.5M8 18.5 4.5 15"/>',
 cristal:'<path d="M12 3.5 19.5 7.7v8.6L12 20.5l-7.5-4.2V7.7z"/><path d="M4.5 7.7 12 12l7.5-4.3M12 12v8.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="3.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="16.3" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="16.3" r="1.2" fill="currentColor" stroke="none"/>',
 microscopio:'<path d="m9.6 3.2 3.5 2-3.6 6.2-3.5-2z"/><path d="m7.8 11.2-.9 1.5"/><path d="M13.6 8.2a5.8 5.8 0 0 1 .9 10.3"/><path d="M8.5 15.5h4"/><path d="M5 20.5h14"/>',
 espectro:'<path d="M3.5 4v16.5H20"/><path d="M6.5 15.5c1.5 0 2-8.5 3.5-8.5s1.8 6 3.2 6 1.4-3 2.8-3 1.4 5.5 3.5 5.5"/>',
 picos:'<path d="M3.5 4v16.5H20"/><path d="M6.5 17.5 9 9.5l2.5 8 2.5-5 2.5 5"/><circle cx="9" cy="5.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="14" cy="8.8" r="1.2" fill="currentColor" stroke="none"/>',
 'linea-base':'<path d="M3.5 4v16.5H20"/><path d="M6.5 13c2-.3 2.5-5.5 4-5.5s1.8 4 3.2 4 1.5-2 2.8-2 1.3 2 3 1.9"/><path d="M6.5 16.5h13" stroke-dasharray="1.6 2.4"/>',
 bandas:'<path d="M3.5 4v16.5H20"/><path d="M5.5 17.5c2.2 0 2.6-7.5 4.5-7.5s2.3 7.5 4.5 7.5"/><path d="M9.5 17.5c2.2 0 2.6-11 4.5-11s2.3 11 4.5 11"/>',
 area:'<path d="M3.5 4v16.5H20"/><path d="M6 17.5c2.5 0 3.5-10 6-10s3.5 10 6 10"/><path d="M9.6 17.5c.9-2.6 1.4-6.2 2.4-6.2s1.5 3.6 2.4 6.2z" fill="currentColor" stroke="none"/>',
 suavizado:'<path d="m3.5 9 2-3.5 2 5 2-5.5 2 5 2-4 2 4.5 2-3.5 2.5 2"/><path d="M3.5 17.5c2.5 0 3.5-3.5 6-3.5s3.5 3.5 6 3.5c2 0 3.2-1.5 5-1.5"/>',
 normalizar:'<path d="M3.5 5h17" stroke-dasharray="0 3"/><path d="M3.5 19.5h17"/><path d="M5 19.5c1.5 0 2-14.5 3.5-14.5S10.5 19.5 12 19.5c1.5 0 2-14.5 3.5-14.5s2 14.5 3.5 14.5"/>',
 serie:'<path d="M3.5 4v16.5H20"/><path d="m7 15 3.5-4 3 2.5L18 7"/><circle cx="7" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="11" r="1.2" fill="currentColor" stroke="none"/><circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="7" r="1.2" fill="currentColor" stroke="none"/>',
 modelo:'<path d="M3.5 4v16.5H20"/><path d="M6.5 16.5c4 0 6.5-1.5 8.5-4.5s3-5 4.5-6"/><circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="14" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>',
 mapa:'<rect x="3.75" y="3.75" width="4.5" height="4.5" rx=".8" fill="currentColor" stroke="none"/><rect x="9.75" y="3.75" width="4.5" height="4.5" rx=".8"/><rect x="15.75" y="3.75" width="4.5" height="4.5" rx=".8"/><rect x="3.75" y="9.75" width="4.5" height="4.5" rx=".8"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx=".8" fill="currentColor" stroke="none"/><rect x="15.75" y="9.75" width="4.5" height="4.5" rx=".8"/><rect x="3.75" y="15.75" width="4.5" height="4.5" rx=".8"/><rect x="9.75" y="15.75" width="4.5" height="4.5" rx=".8"/><rect x="15.75" y="15.75" width="4.5" height="4.5" rx=".8" fill="currentColor" stroke="none"/>',
 corridas:'<circle cx="6" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
 analizar:'<path d="M4 20V13M8.5 20V9M13 20v-3"/><circle cx="15.5" cy="9" r="4"/><path d="m18.5 12 2.5 2.5"/>',
 comparar:'<path d="M12 3.5v17"/><rect x="3.5" y="6" width="6" height="12" rx="1.5"/><rect x="14.5" y="6" width="6" height="12" rx="1.5"/>',
 datos:'<ellipse cx="12" cy="6" rx="7.5" ry="2.5"/><path d="M4.5 6v12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V6"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
 unidades:'<path d="M4 7.5h16M4 16.5h16"/><path d="M7 5v5M11 6v3M15 6v3M19 5v5M7 14v5M11 15v3M15 15v3M19 14v5"/>',
 leyenda:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="7.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/><path d="M10.5 9.5h6M10.5 14.5h6"/>',
 celda:'<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M3.5 9.5h17M3.5 14.5h17M9.2 4.5v15M14.8 4.5v15"/><rect x="9.2" y="9.5" width="5.6" height="5" fill="currentColor" stroke="none"/>',
 filas:'<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M9.2 4.5v5M14.8 4.5v5M9.2 14.5v5M14.8 14.5v5"/><rect x="3.5" y="9.5" width="17" height="5" fill="currentColor" stroke="none"/>',
 columnas:'<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M3.5 9.5h5.7M3.5 14.5h5.7M14.8 9.5h5.7M14.8 14.5h5.7"/><rect x="9.2" y="4.5" width="5.6" height="15" fill="currentColor" stroke="none"/>'
};

const nombresIconos=Object.freeze(Object.keys(iconos));

const escapar=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function icono(id,{titulo}={}){
 const interior=Object.prototype.hasOwnProperty.call(iconos,id)?iconos[id]:undefined;
 if(interior===undefined)throw new Error(`icono: id de icono desconocido: ${id}`);
 const t=titulo?`<title>${escapar(titulo)}</title>`:'';
 return `<svg class="erlen-icono" data-icono="${id}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${t}${interior}</svg>`;
}

return {icono,iconos,nombresIconos};})();
