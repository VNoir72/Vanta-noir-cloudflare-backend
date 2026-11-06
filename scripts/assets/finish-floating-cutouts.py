"""Reviewed residual-shadow cleanup; all visible RGB values remain unchanged."""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
root=Path(__file__).resolve().parents[2];rows=json.loads((root/'work/floating/cutout-results.json').read_text())
for r in rows:
 if not (r['id']=='vn-studio-halo' or (r['id']=='vn-hooded-performance' and r['color']=='Deep Olive/Black')):continue
 a=np.array(Image.open(root/('public'+r['imageUrl'])).convert('RGBA'));rgb=a[:,:,:3].astype(float);h,w=a.shape[:2];yy=np.arange(h)[:,None]
 if r['id']=='vn-hooded-performance' and r['color']=='Deep Olive/Black':
  eligible=(rgb.mean(2)>135)&(rgb.max(2)-rgb.min(2)<30)&(yy>h*.46)
 elif r['id']=='vn-studio-halo':
  eligible=(rgb[:,:,2]>rgb[:,:,0]+2)&(yy>h*.72)
 else:continue
 connected=ndi.binary_propagation(a[:,:,3]==0,mask=(a[:,:,3]==0)|eligible)
 a[connected,3]=0
 labels,n=ndi.label(a[:,:,3]>0);sizes=np.bincount(labels.ravel());tiny=sizes<h*w*.0003;tiny[0]=False;a[tiny[labels],3]=0
 p=root/('public'+r['imageUrl']);tmp=p.with_suffix('.tmp');Image.fromarray(a).save(tmp,'WEBP',lossless=True,method=3,exact=True);tmp.replace(p);r['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();r['method']=r.get('method','offline-studio-mask')+'-reviewed-shadow-cleanup'
(root/'work/floating/cutout-results.json').write_text(json.dumps(rows,indent=2))
