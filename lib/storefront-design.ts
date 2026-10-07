import { z } from 'zod';

export function safeHeroImage(value:string) {
  return /^\/images\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(value) && !value.includes('..')
    || /^https:\/\/api\.vantanoir\.store\/api\/media\/products\/[a-zA-Z0-9-]+\.(?:png|jpg|webp|avif)$/i.test(value);
}
const image=z.string().trim().max(500).refine(safeHeroImage,'Choose a store image or upload one using the button below.');
export const heroMediaSchema=z.object({
  url:z.string().max(500).refine(v=>safeHeroImage(v)||/^https:\/\/api\.vantanoir\.store\/api\/media\/products\/[a-f0-9-]+\.(mp4|webm)$/.test(v),'Upload store media first.'),
  type:z.enum(['image','video']), alt:z.string().max(240).default('Vanta Noir campaign'),
});
export const announcementSchema=z.object({enabled:z.boolean().default(false),text:z.string().trim().max(500).default(''),mode:z.enum(['stationary','left','right']).default('stationary'),startsAt:z.string().max(30).default(''),endsAt:z.string().max(30).default('')});
export const heroSchema=z.object({
  fit:z.enum(['contain','cover']).default('contain'),
  playlist:z.array(heroMediaSchema).max(12).default([]),
  desktopHeight:z.number().int().min(40).max(100).default(80),
  mobileHeight:z.number().int().min(40).max(100).default(80),
  intervalSeconds:z.number().int().min(5).max(30).default(8),
  image:image.default('/images/vanta-hero.png'),
  mobileImage:z.union([z.literal(''),image]).default(''),
  alt:z.string().trim().min(3).max(240).default('Vanta Noir technical streetwear worn by two campaign models'),
  kicker:z.string().trim().max(100).default('PRESENCE. POWER. PRECISION.'),
  title:z.string().trim().max(120).default('Your next\neveryday uniform.'),
  body:z.string().trim().max(300).default('Technical detail. A distinct silhouette.\nDiscover the full Vanta Noir collection.'),
  buttonText:z.string().trim().min(1).max(50).default('Find your fit'),
  buttonLink:z.string().trim().max(500).refine(v=>/^\/(?!\/)[a-zA-Z0-9_/?#=&%+.,~-]*$/.test(v),'Use a link within your store, starting with /.').default('/#collection'),
  showText:z.boolean().default(true),
  focus:z.enum(['left','center','right']).default('center'),
});
export type HeroSettings=z.infer<typeof heroSchema>;
export const collectionLabelsSchema=z.array(z.object({source:z.string().trim().min(1).max(200),label:z.string().trim().min(1).max(100)})).max(100)
  .refine(rows=>new Set(rows.map(row=>row.source)).size===rows.length,'Each collection label must be unique.');

export const aboutImageSchema=z.object({
  image:image.default('/images/vanta-hero.png'),
  alt:z.string().trim().min(3).max(240).default('Vanta Noir campaign — technical streetwear in motion'),
  focus:z.enum(['left','center','right']).default('center'),
});
