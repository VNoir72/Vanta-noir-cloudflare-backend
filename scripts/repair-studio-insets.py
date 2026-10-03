"""Repair four reviewed inset-panel masks using the original studio pipeline.

Run after match-studio-backgrounds.py. Cropping applies only to segmentation;
the garment pixels, output dimensions, grey profile and shadows still come
from the existing processor. No source photograph is changed.
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image
import rembg
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[1]
# Insets were checked visually against the original photographs.
CROPS = {
    'vn-pdf-p06-3-r5-c5-black-right-r04.webp': [.21, .06, .79, .94],
    'vn-pdf-p04-3-r3-a5-bone-black-shadow-grid-right-r04.webp': [.19, .06, .80, .94],
    'vn-p048-bone-back.webp': [.10, .06, .90, .94],
    'pdf-p04-3-r3-a5-side.webp': [.20, .06, .80, .94],
}
# These enclosed background openings otherwise look like part of the object
# to the general segmentation model. Remove only the connected, matching
# background colour at the reviewed seed, bounded by the garment/frame.
OPENINGS = {
    'vn-pdf-p06-3-r5-c5-black-right-r04.webp': [.52, .27],
    'vn-p048-bone-back.webp': [.50, .49],
}
spec = importlib.util.spec_from_file_location('studio', ROOT / 'scripts/match-studio-backgrounds.py')
studio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)
original_remove = rembg.remove
mapping = json.loads((ROOT / 'lib/product-photo-assets.json').read_text())

for source in mapping:
    name = Path(source).name
    if name not in CROPS:
        continue
    fractions = CROPS[name]

    def inset_mask(im, **kwargs):
        w, h = im.size
        box = tuple(round(f * (w if i % 2 == 0 else h)) for i, f in enumerate(fractions))
        cropped = original_remove(im.crop(box), **kwargs)
        mask = Image.new('L', im.size, 0)
        mask.paste(cropped, box[:2])
        if name in OPENINGS:
            px, py = OPENINGS[name]
            sx, sy = round(w * px), round(h * py)
            rgb = np.asarray(im).astype(np.int16)
            regions, _ = label(np.max(np.abs(rgb - rgb[sy, sx]), axis=2) <= 12)
            region = regions[sy, sx]
            if region:
                values = np.asarray(mask).copy()
                values[regions == region] = 0
                mask = Image.fromarray(values)
        return mask

    rembg.remove = inset_mask
    record = ROOT / 'work/studio-quality' / (Path(source).stem + '.json')
    record.unlink(missing_ok=True)
    studio.process(source)
    print('Repaired', name, flush=True)

rembg.remove = original_remove
