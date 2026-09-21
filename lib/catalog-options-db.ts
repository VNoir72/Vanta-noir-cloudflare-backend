import {getDbBinding} from './runtime-env';
import {defaultOptions,optionSchema,type Swatch,type ShopCategory} from './catalog-options';
export async function getCatalogOptions(){
 const rows=await getDbBinding().prepare("SELECT key,value FROM store_meta WHERE key LIKE 'catalog-option:%' ORDER BY key").all<{key:string;value:string}>();
 const colors=new Map(defaultOptions.colors.map(c=>[c.name.toLowerCase(),c]));
 const categories=new Map(defaultOptions.categories.map(c=>[c.name.toLowerCase(),c]));
 for(const row of rows.results){const p=optionSchema.safeParse(JSON.parse(row.value));if(!p.success)continue;const v=p.data;if(v.kind==='color')colors.set(v.name.toLowerCase(),{name:v.name,hex:v.hex});else categories.set(v.name.toLowerCase(),{id:categories.get(v.name.toLowerCase())?.id??'custom:'+v.name.toLowerCase(),name:v.name,section:v.section});}
 return {colors:[...colors.values()] as Swatch[],categories:[...categories.values()] as ShopCategory[]};
}
export async function saveCatalogOption(input:unknown){const v=optionSchema.parse(input);await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(`catalog-option:${v.kind}:${v.name.toLowerCase()}`,JSON.stringify(v)).run();return getCatalogOptions();}
