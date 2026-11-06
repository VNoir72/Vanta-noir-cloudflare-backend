import importlib.util,json,hashlib,os
from pathlib import Path
os.chdir(Path(__file__).resolve().parents[2])
import numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('cut','scripts/assets/prepare-floating-cutouts.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
rows=json.load(open('work/floating/cutout-results.json'));selected=[]
for r in rows:
 if r.get('method')!='offline-grabcut':continue
 p=m.ROOT/('public'+r['imageUrl']);a=np.array(Image.open(p).convert('RGBA'));original=a.copy();m.process(r);b=np.array(Image.open(p).convert('RGBA'));a[:,:,3]=np.minimum(a[:,:,3],b[:,:,3]);tmp=p.with_suffix('.tmp');Image.fromarray(a).save(tmp,'WEBP',lossless=True,method=3,exact=True);tmp.replace(p);r['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();r['method']='offline-grabcut-and-studio-mask';selected.append(r)
open('work/floating/cutout-results.json','w').write(json.dumps(rows,indent=2));m.sheets(selected,m.ROOT/'work/floating/combined-sheets')
