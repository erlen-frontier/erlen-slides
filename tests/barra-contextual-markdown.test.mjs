/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {aMarkdown} from '../src/markdown-core.mjs';

test('Markdown warns when whole-block text styles and right alignment will be lost',()=>{
  const deck={meta:{},slides:[{layout:'content',blocks:[{type:'text',text:'Resultado',negrita:true,cursiva:true,align:'right'}]}]};
  const {md,avisos}=aMarkdown(deck,{zonasPorDiseno:{content:1}});
  assert.match(md,/Resultado/);
  const aviso=avisos.join(' ');
  assert.match(aviso,/negrita/i);assert.match(aviso,/cursiva/i);assert.match(aviso,/alineación.*derecha/i);
});
