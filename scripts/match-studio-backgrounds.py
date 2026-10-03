"""Rebuild approved catalogue backgrounds locally; never changes upload handling."""
import argparse, hashlib, json, os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
os.environ.setdefault('OMP_NUM_THREADS', '2')
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d

ROOT = Path(__file__).resolve().parents[1]
SESSION = None

def process(url):
    global SESSION
    from rembg import new_session, remove
    if SESSION is None:
        SESSION = new_session('u2net', providers=['CPUExecutionProvider'])
    source = ROOT / ('public' + url)
    output = ROOT / 'public/images/catalogue/studio-grey' / source.name
    output.parent.mkdir(parents=True, exist_ok=True)
    record = ROOT / 'work/studio-quality' / (source.stem + '.json')
    record.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and record.exists():
        return source.name
    im = Image.open(source).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    mask = np.asarray(remove(im, session=SESSION, only_mask=True)).astype(np.float32) / 255
    # Retain solid garment pixels, including logos and stitching; blend edges only.
    alpha = np.clip((mask - .02) / .88, 0, 1)
    ys, xs = np.where(alpha > .5)
    if len(xs) < 30:
        raise ValueError(f'Empty garment mask: {url}')
    h, w = mask.shape
    profile = np.asarray(json.loads((ROOT / 'data/studio-grey-profile.json').read_text()))
    profile = gaussian_filter1d(profile, 4, axis=0)
    y = np.linspace(0, len(profile)-1, h)
    background = np.stack([np.interp(y, np.arange(len(profile)), profile[:,c]) for c in range(3)],axis=1)
    background = np.broadcast_to(background[:,None,:], rgb.shape).copy()
    yy, xx = np.mgrid[:h,:w]
    cx = (xs.min()+xs.max())/2
    cy = min(h-1, ys.max()+h*.04)
    sx = max(w*.06,(xs.max()-xs.min())*.32)
    sy = max(2,h*.018)
    shadow = 18*np.exp(-.5*((xx-cx)/sx)**2-.5*((yy-cy)/sy)**2)
    background -= shadow[:,:,None]
    result = np.clip(rgb*alpha[:,:,None]+background*(1-alpha[:,:,None]),0,255).astype('uint8')
    Image.fromarray(result).save(output,format='WEBP',quality=95,method=6)
    record.write_text(json.dumps({'source':url,'coverage':float((alpha>.5).mean()),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
    return source.name

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit',type=int)
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--shard',type=int,default=0)
    parser.add_argument('--shards',type=int,default=1)
    args=parser.parse_args()
    rows=json.loads((ROOT/'data/catalogue-approved-view-updates.json').read_text())
    urls=sorted({url for row in rows for url in row['views'].values()})
    if len({Path(u).name for u in urls}) != len(urls):
        raise ValueError('Duplicate output names')
    mapping={u:'/images/catalogue/studio-grey/'+Path(u).name for u in urls}
    (ROOT/'lib/product-photo-assets.json').write_text(json.dumps(mapping,indent=2)+'\n')
    if not 0 <= args.shard < args.shards:raise ValueError('Invalid shard')
    selected=urls[args.shard::args.shards]
    selected=selected[:args.limit] if args.limit else selected
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for index,name in enumerate(pool.map(process,selected),1):
            if index%20==0 or index==len(selected):print(f'{index}/{len(selected)} {name}',flush=True)

if __name__=='__main__':main()
