import {z} from 'zod';
export const profileDetailsSchema=z.object({
 photo:z.string().max(1500100).refine(v=>!v||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v),'Choose a JPEG, PNG or WebP photo under 1 MB.').optional(),
 gender:z.enum(['','Woman','Man','Prefer not to say']).optional(),
 birthday:z.string().refine(v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&Date.parse(v)<=Date.now()),'Enter a valid birthday.').optional(),
});
