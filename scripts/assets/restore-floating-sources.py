"""Restore ORIGINAL public source images for repeatable cutout preparation."""
import json,hashlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];manifest=json.loads((root/'data/floating-assets-manifest.json').read_text());rows=[]
(root/'work/floating/sources').mkdir(parents=True,exist_ok=True)
for a in manifest['assets']:
 source=a['displaySource'];local='public'+source if source.startswith('/') else 'work/floating/sources/'+hashlib.sha256(source.encode()).hexdigest()[:24]+'.webp'
 path=root/local
 if not path.exists():
  if not source.startswith('https://api.vantanoir.store/api/media/products/'):raise ValueError('Missing local source: '+source)
  subprocess.run(['curl','-fsS','--max-time','60',source,'-o',str(path)],check=True)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=a['sourceSha256']:raise ValueError('Original source changed: '+source)
 rows.append({'id':a['productId'],'name':a['name'],'color':a['color'],'src':a['source'],'displaySource':source,'localPath':local})
(root/'work/floating/asset-inventory.json').write_text(json.dumps(rows,indent=2));print('Restored',len(rows),'source references')
