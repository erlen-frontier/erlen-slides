/* SPDX-License-Identifier: AGPL-3.0-only */
const TABULA_SOURCE_URL='https://github.com/erlen-frontier/erlen-slides';
const edVersion=()=>window.TABULA?.version||'0.2.0';
function pintaEdicion(){const b=$('#edicionBadge');if(b)b.textContent='AGPLv3';}
function openEdicion(){const body=h('div');wsServicio(body);openModal({title:'Software libre para comunicar ciencia',body});}
