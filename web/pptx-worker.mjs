/* SPDX-License-Identifier: AGPL-3.0-only */
import { revisaPaquetePPTX } from './pptx-core.mjs';
import { parse } from './pptxtojson.mjs';
self.onmessage = async ({ data }) => {
  try {
    revisaPaquetePPTX(data);
    const resultado = await parse(data, { imageMode: 'base64', videoMode: 'none', audioMode: 'none' });
    self.postMessage({ resultado });
  } catch (e) { self.postMessage({ error: 'No se pudo leer el PowerPoint: ' + String(e.message || e).slice(0, 300) }); }
};
