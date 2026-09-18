/* SPDX-License-Identifier: AGPL-3.0-only */
/* Mapa de desplazamiento del vidrio líquido (Tier 2, solo-Chromium).
 *
 * Genera un PNG RGBA de 128×128 que un <feDisplacementMap> usa para refractar
 * el fondo: cada píxel codifica en R/G un vector de muestreo y el filtro lee
 * el backdrop desplazado ese vector, simulando la refracción de Snell en el
 * canto de una lente. Técnica basada en shuding/liquid-glass (MIT,
 * https://github.com/shuding/liquid-glass) y en el análisis de kube.io
 * («Implementing Liquid Glass»); reimplementada aquí en Node puro para no
 * añadir dependencias. Este archivo es AGPL-3.0-only, como el resto del
 * proyecto (ver LICENSE en la raíz).
 *
 * Geometría: la forma es un rounded-rect centrado que llena el lienzo, con
 * radio = 30% del lado (el mismo que usan los controles flotantes). Fuera de
 * la forma el color es neutral (128,128): desplazamiento cero. Dentro, la
 * desviación sigue el perfil de squircle (1-(1-x)^4)^(1/4) con x = 1-d/radio
 * (d = distancia al borde): vale 1 justo en el canto —donde la pared de la
 * lente es vertical y el rayo se quiebra al máximo (12 px hacia afuera)— y
 * decae a 0 a profundidad = radio, donde el vidrio es plano. Codificación
 * r=round(128+dx·127/12), g=round(128+dy·127/12): con scale=24 en el filtro
 * (24·127/255 ≈ 12) el desplazamiento máximo coincide con el diseñado.
 *
 * El PNG se monta a mano (firma + IHDR + IDAT + IEND, CRC32 propio) porque
 * solo necesitamos este caso: 8 bits, RGBA, scanlines con filtro 0. */
import {deflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

const LADO=128,RADIO=LADO*.3,MAX=12,PASO=127/MAX;

/* CRC32 (polinomio 0xEDB88320, reflejo) de la especificación PNG. */
const CRC_TABLA=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc32=buf=>{let c=-1;for(let i=0;i<buf.length;i++)c=CRC_TABLA[(c^buf[i])&255]^(c>>>8);return(c^-1)>>>0;};

/* Trozo PNG: longitud + tipo + datos + CRC del conjunto tipo+datos. */
const trozo=(tipo,data)=>{
	const out=Buffer.alloc(12+data.length);
	out.writeUInt32BE(data.length,0);
	out.write(tipo,4,'latin1');
	data.copy(out,8);
	out.writeUInt32BE(crc32(out.subarray(4,8+data.length)),8+data.length);
	return out;
};

/* Devuelve el mapa como data-URL «data:image/png;base64,…» listo para
   incrustar en un <feImage href> (lo consume herramientas/build.mjs). */
export function generateGlassMap(){
	/* Scanlines con byte de filtro 0: escribimos cada píxel directamente en
	   su sitio, sin búfer intermedio. */
	const fila=LADO*4,raw=Buffer.alloc(LADO*(fila+1));
	const centro=LADO/2,base=centro-RADIO; /* semilado de la caja interior */
	for(let y=0;y<LADO;y++){
		raw[y*(fila+1)]=0;
		for(let x=0;x<LADO;x++){
			/* Coordenadas centradas en el centro del lienzo (píxel completo). */
			const px=x+.5-centro,py=y+.5-centro,ax=Math.abs(px),ay=Math.abs(py);
			const qx=ax-base,qy=ay-base;
			/* SDF de rounded-rect: negativo dentro, |sdf| = distancia al borde. */
			const sdf=Math.min(Math.max(qx,qy),0)+Math.hypot(Math.max(qx,0),Math.max(qy,0))-RADIO;
			let r=128,g=128;
			if(sdf<=0){
				/* Normal exterior del borde en este píxel: en la zona de esquina
				   apunta al vértice redondeado; en los cantos rectos, al eje. */
				const sx=px<0?-1:1,sy=py<0?-1:1;
				let nx=0,ny=0;
				if(qx>0&&qy>0){const m=Math.hypot(qx,qy);nx=sx*qx/m;ny=sy*qy/m;}
				else if(qx>0)nx=sx;
				else if(qy>0)ny=sy;
				/* Perfil squircle: x = 1 - d/radio (1 en el canto, 0 en el fondo
				   plano); la potencia 1/4 deja la caída característica del vidrio. */
				const t=Math.min(-sdf/RADIO,1),x=1-t;
				const perfil=(1-(1-x)**4)**.25;
				r=Math.round(128+nx*MAX*perfil*PASO);
				g=Math.round(128+ny*MAX*perfil*PASO);
			}
			const o=y*(fila+1)+1+x*4;
			raw[o]=r;raw[o+1]=g;raw[o+2]=0;raw[o+3]=255;
		}
	}
	/* IHDR: 128×128, 8 bits por canal, color RGBA (6), sin entrelazado. */
	const ihdr=Buffer.alloc(13);
	ihdr.writeUInt32BE(LADO,0);
	ihdr.writeUInt32BE(LADO,4);
	ihdr[8]=8;ihdr[9]=6;
	const png=Buffer.concat([
		Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
		trozo('IHDR',ihdr),
		trozo('IDAT',deflateSync(raw,{level:9})),
		trozo('IEND',Buffer.alloc(0)),
	]);
	return 'data:image/png;base64,'+png.toString('base64');
}

/* Ejecución directa (node herramientas/glass-map.mjs): vuelca el data-URL y
   su tamaño para verificación puntual; el build importa la función. */
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
	const url=generateGlassMap();
	console.log(url);
	const png=Buffer.from(url.slice(url.indexOf(',')+1),'base64');
	console.log(`glass-map: PNG de ${png.length} B (${url.length} caracteres de data-URL)`);
}
