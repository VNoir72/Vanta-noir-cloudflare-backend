"""Offline GrabCut refinement for nonuniform backgrounds; retains original RGB."""
import json,hashlib,importlib.util
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import cv2,numpy as np
from PIL import Image
from scipy import ndimage as ndi
spec=importlib.util.spec_from_file_location('cut',str(Path(__file__).with_name('prepare-floating-cutouts.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
cv2.setNumThreads(2)
def refine(r):
 original=np.array(Image.open(m.ROOT/r['localPath']).convert('RGB'));oh,ow=original.shape[:2];scale=min(1,700/max(oh,ow));a=cv2.resize(original,(round(ow*scale),round(oh*scale)));h,w=a.shape[:2]
 # Learn background from border pixels, foreground from the middle of the image.
 mask=np.full((h,w),cv2.GC_PR_FGD,np.uint8)
 margin=max(2,int(min(h,w)*.025));mask[:margin]=0;mask[-margin:]=0;mask[:,:margin]=0;mask[:,-margin:]=0
 bg=np.zeros((1,65),np.float64);fg=np.zeros((1,65),np.float64)
 cv2.grabCut(a,mask,None,bg,fg,4,cv2.GC_INIT_WITH_MASK)
 keep=(mask==1)|(mask==3);labels,n=ndi.label(keep);sizes=np.bincount(labels.ravel());retain=sizes>h*w*.0015;retain[0]=False;keep=retain[labels]
 alpha=cv2.resize((keep*255).astype('uint8'),(ow,oh),interpolation=cv2.INTER_LINEAR);rgba=np.dstack([original,alpha]);out=m.ROOT/('public'+r['imageUrl']);tmp=out.with_suffix('.tmp');Image.fromarray(rgba).save(tmp,'WEBP',lossless=True,method=3,exact=True);tmp.replace(out)
 return {**r,'method':'offline-grabcut','sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'coverage':round(float(keep.mean()),4)}
if __name__=='__main__':
 rows=json.loads((m.ROOT/'work/floating/cutout-results.json').read_text());selected=[r for r in rows if (r['src'].startswith('http') or (r['name']=='V Buckle Belt' and r['color']=='Charcoal')) and r.get('method')!='offline-grabcut']
 refined=[]
 with ProcessPoolExecutor(max_workers=4) as pool:
  for i,r in enumerate(pool.map(refine,selected)):refined.append(r);print(i+1,len(selected),flush=True)
 byurl={r['imageUrl']:r for r in refined};rows=[byurl.get(r['imageUrl'],r) for r in rows];(m.ROOT/'work/floating/cutout-results.json').write_text(json.dumps(rows,indent=2));m.sheets(refined,m.ROOT/'work/floating/refined-sheets')
