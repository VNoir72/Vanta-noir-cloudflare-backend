import {z} from 'zod';
import {SHOP_CATEGORIES,SHOP_SECTIONS} from './shop-categories';
export type ShopCategory={id:string;name:string;section:string};
export type Swatch={name:string;hex:string};
export const DEFAULT_COLORS:Swatch[]=Object.entries({'Jet Black':'#101112','White':'#ffffff','Bone':'#e5dfcf','Cream':'#fff2d5','Beige':'#d6c3a5','Sand':'#c9b58a','Camel':'#b68a55','Brown':'#704a32','Chocolate':'#3e2723','Charcoal Grey':'#454545','Grey':'#858585','Silver':'#bcbcbc','Navy':'#15233f','Midnight Blue':'#101a30','Royal Blue':'#254ad1','Sky Blue':'#87ceeb','Denim Blue':'#446987','Teal':'#147d83','Turquoise':'#40c8c2','Olive Green':'#556b2f','Forest Green':'#234b34','Emerald':'#188557','Sage':'#9cad8f','Mint':'#a9dfbf','Lime':'#a4d640','Yellow':'#f4cf3a','Mustard':'#c49a25','Gold':'#d4af37','Orange':'#ed7b22','Rust':'#ab4b2c','Red':'#ca252b','Dark Burgundy':'#541e2b','Maroon':'#701c2f','Pink':'#e8a6b8','Hot Pink':'#e64191','Dusty Rose':'#bc858e','Purple':'#7043a0','Lavender':'#b9a3d6','Lilac':'#c7b2de','Deep Olive/Black':'#3d4534','Bone/Black':'#d6d1c3'}).map(([name,hex])=>({name,hex}));
export const optionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('color'),name:z.string().trim().min(1).max(60),hex:z.string().regex(/^#[0-9a-fA-F]{6}$/)}),
 z.object({kind:z.literal('category'),name:z.string().trim().min(1).max(100),section:z.enum(SHOP_SECTIONS)})]);
export const defaultOptions={colors:DEFAULT_COLORS,categories:SHOP_CATEGORIES as ShopCategory[]};
