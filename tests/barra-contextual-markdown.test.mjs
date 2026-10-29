/* SPDX-License-Identifier: AGPL-3.0-only */
import test from 'node:test';
import assert from 'node:assert/strict';
import {aMarkdown, leeMarkdown} from '../src/markdown-core.mjs';

test('Markdown warns when whole-block text styles and right alignment will be lost',()=>{
  const deck={meta:{},slides:[{layout:'content',blocks:[{type:'text',text:'Resultado',negrita:true,cursiva:true,align:'right'}]}]};
  const {md,avisos}=aMarkdown(deck,{zonasPorDiseno:{content:1}});
  assert.match(md,/Resultado/);
  const aviso=avisos.join(' ');
  assert.match(aviso,/negrita/i);assert.match(aviso,/cursiva/i);assert.match(aviso,/alineación.*derecha/i);
});

test('Markdown reports fragment styles but keeps its literal text and previous import contract',()=>{
  const text='Resultado 😀 y *marcas*\n$E=mc^2$';
  const b={type:'text',text,negrita:true,formatoTexto:[
    {inicio:0,fin:9,negrita:false},
    {inicio:10,fin:12,cursiva:true}
  ]};
  const deck={meta:{},slides:[{layout:'title',blocks:[]},{layout:'content',title:'Ilustración',blocks:[b]}]};
  const antes=JSON.stringify(deck), {md,avisos}=aMarkdown(deck,{zonasPorDiseno:{title:0,content:1}});
  assert.match(avisos.join(' '),/negrita y cursiva por fragmentos/i);
  assert.equal(JSON.stringify(deck),antes);
  const leido=leeMarkdown(md);
  assert.equal(leido.diapositivas[0].zonas[0][0].text,text);
  assert.equal(leido.diapositivas[0].zonas[0][0].formatoTexto,undefined);
  assert.equal(leeMarkdown('# Título\n\n## S\n\n**negrita** y *cursiva*').diapositivas[0].zonas[0][0].text,'negrita y cursiva');
  const sinFormato=aMarkdown({...deck,slides:[deck.slides[0],{...deck.slides[1],blocks:[{type:'text',text:'normal',formatoTexto:[]}]}]}, {zonasPorDiseno:{title:0,content:1}});
  assert.doesNotMatch(sinFormato.avisos.join(' '),/fragmentos/i);
});
