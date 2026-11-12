"""Build a ready-to-serve archive from public/, excluding local capture pages.

El archivo se escribe de forma reproducible: misma entrada, mismo sha256. Las
fechas de modificación quedan fijadas porque public/ se regenera en cada build
y, si viajaran dentro del zip, el checksum publicado cambiaría sin que cambie
una sola línea y nadie podría comprobarlo.
"""
from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
out=root/'dist';out.mkdir(exist_ok=True)
zip_path=out/f'tabula-{version}-web.zip'
FECHA=(1980,1,1,0,0,0)
def add(z,ruta,nombre):
 info=zipfile.ZipInfo(str(nombre).replace('\\','/'),date_time=FECHA)
 info.compress_type=zipfile.ZIP_DEFLATED
 info.external_attr=0o644<<16
 z.writestr(info,ruta.read_bytes())
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted((root/'public').rglob('*')):
  if f.is_file() and not f.name.startswith('_capture-'):add(z,f,f.relative_to(root/'public'))
 for name in ['README.md','THIRD_PARTY_NOTICES.md','CITATION.cff']:
  add(z,root/name,name)
 for dirname in ['docs','examples']:
  for f in sorted((root/dirname).rglob('*')):
   if f.is_file():add(z,f,f.relative_to(root))
checksum=hashlib.sha256(zip_path.read_bytes()).hexdigest()
(out/(zip_path.name+'.sha256')).write_text(checksum+'  '+zip_path.name+'\n')
print(zip_path,zip_path.stat().st_size,'bytes',checksum)
