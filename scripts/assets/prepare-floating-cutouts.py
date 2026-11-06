"""Offline studio-background extraction. Original RGB retained; only alpha changes.
Inputs: work/floating/asset-inventory.json. Outputs are candidates until visual QA.
No model downloads, telemetry or network requests.
"""
import argparse, hashlib, json
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from scipy import ndimage as ndi
ROOT=Path(__file__).resolve().parents[2]
def process(row):
    source=ROOT/row['localPath']; im=Image.open(source).convert('RGB'); a=np.asarray(im); h,w=a.shape[:2]
    # Studio backgrounds vary vertically. Estimate from BOTH outside margins.
    border=max(2,round(w*.025)); edges=np.concatenate([a[:,:border],a[:,-border:]],axis=1)
    bg=ndi.median_filter(np.median(edges,axis=1),size=(15,1))
    diff=np.max(np.abs(a.astype(float)-bg[:,None,:]),axis=2)
    candidate=diff>12
    labels,n=ndi.label(candidate); sizes=np.bincount(labels.ravel()); strong=np.bincount(labels.ravel(),weights=(diff>48).ravel())
    keep=(sizes>max(40,h*w*.00015))&(strong>max(12,h*w*.000025));keep[0]=False
    mask=keep[labels]
    # Recover antialiasing next to retained silhouette, without changing garment RGB.
    near=ndi.binary_dilation(mask,iterations=1)
    alpha=np.where(mask,255,np.where(near,np.clip((diff-4)/8,0,1)*255,0)).astype('uint8')
    # Fill only tiny compression holes; retain genuine gaps between garment pieces.
    holes=ndi.binary_fill_holes(mask)&~mask; lab,n=ndi.label(holes); sz=np.bincount(lab.ravel()); tiny=(sz<40);tiny[0]=False;alpha[tiny[lab]]=255
    rgba=np.dstack([a,alpha]); key=hashlib.sha256((row['id']+'\0'+row['color']+'\0'+row['src']).encode()).hexdigest()[:24]
    out=ROOT/'public/images/floating'/f'{key}.webp';out.parent.mkdir(parents=True,exist_ok=True)
    temporary=out.with_suffix('.tmp');Image.fromarray(rgba).save(temporary,'WEBP',lossless=True,method=3,exact=True);temporary.replace(out)
    ys,xs=np.where(alpha>127);coverage=float((alpha>127).mean());flags=[]
    if coverage<.025 or coverage>.82:flags.append('coverage')
    if np.any(alpha[:2]) or np.any(alpha[-2:]) or np.any(alpha[:,:2]) or np.any(alpha[:,-2:]):flags.append('touches-edge')
    if np.percentile(np.std(edges.astype(float),axis=1),90)>8:flags.append('uneven-background')
    return {**row,'imageUrl':'/images/floating/'+out.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'coverage':round(coverage,4),'flags':flags,'width':w,'height':h}
def sheets(rows,folder):
    folder.mkdir(parents=True,exist_ok=True)
    for start in range(0,len(rows),48):
        part=rows[start:start+48];sheet=Image.new('RGB',(1440,((len(part)+7)//8)*235),'#d5d0c4');draw=ImageDraw.Draw(sheet)
        for i,r in enumerate(part):
            tile=Image.open(ROOT/('public'+r['imageUrl']));tile.thumbnail((170,190));x=(i%8)*180;y=(i//8)*235
            sheet.paste(tile,(x+(180-tile.width)//2,y),tile)
            draw.text((x+4,y+192),str(start+i)+' '+r['name'][:22],fill='black');draw.text((x+4,y+207),r['color'][:22],fill='black');draw.text((x+4,y+220),','.join(r['flags']),fill='red')
        sheet.save(folder/f'{start//48:03d}.jpg',quality=90)
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--sample',action='store_true');ap.add_argument('--workers',type=int,default=4);args=ap.parse_args()
    rows=json.loads((ROOT/'work/floating/asset-inventory.json').read_text());rows=[r for r in rows if r.get('localPath')]
    if args.sample:rows=rows[::max(1,len(rows)//24)][:24]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        done=[]
        for r in pool.map(process,rows):
            done.append(r)
            if len(done)%50==0:print(len(done),flush=True)
    target=ROOT/'work/floating'/('sample-results.json' if args.sample else 'cutout-results.json');target.write_text(json.dumps(done,indent=2))
    sheets(done,ROOT/'work/floating'/('sample-sheets' if args.sample else 'qa-sheets'))
    print('Prepared',len(done),'flagged',sum(bool(r['flags']) for r in done),flush=True)
if __name__=='__main__':main()
