import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync('data/floating-assets-manifest.json','utf8'));
const index=JSON.parse(readFileSync('lib/floating-assets.json','utf8'));
for(const asset of manifest.assets){
 const path='public'+asset.imageUrl;
 if(!existsSync(path))throw new Error(`Missing floating garment asset ${path}. Extract the prepared garment asset pack in the project root before building.`);
 const bytes=readFileSync(path);
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error(`Asset checksum mismatch: ${path}`);
 if('/images/floating/'+index[asset.source]+'.webp'!==asset.imageUrl)throw new Error(`Asset map mismatch: ${asset.source}`);
}
if(Object.keys(index).length!==manifest.assets.length)throw new Error('Floating asset counts differ');
console.log(`Verified ${manifest.assets.length} transparent garment assets and source mappings.`);
