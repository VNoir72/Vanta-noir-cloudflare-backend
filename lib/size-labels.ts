import { z } from "zod";
export const VARIANT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "One size", "Size pending"] as const;
export function normalizeSize(value: string) {
  const label = value.trim().replace(/\s+/g, " ").toUpperCase();
  const key = label.replace(/[\s_-]+/g, "");
  return ({ ONESIZE: "One size", SIZEPENDING: "Size pending", EXTRASMALL:"XS", SMALL:"S", MEDIUM:"M", LARGE:"L", EXTRALARGE:"XL", "2XL":"XXL", XXXL:"3XL", XXXXL:"4XL", XXXXXL:"5XL", DOUBLEEXTRALARGE:"XXL", EXTRAEXTRALARGE:"XXL" } as Record<string,string>)[key] ?? label.replace(/\s*\/\s*/g, "/");
}
export const storeSizeSchema = z.preprocess(value => typeof value === "string" ? normalizeSize(value) : value,
  z.string().min(1, "Enter a size.").max(40).regex(/^[A-Za-z0-9][A-Za-z0-9 .\/()-]*$/, "Use letters, numbers, spaces, dots, slashes or hyphens for sizes."));
export function compareSizes(a:string,b:string) {
  const rank=(s:string)=>{const i=(VARIANT_SIZES as readonly string[]).indexOf(s);return i<0?9:i;};
  return rank(a)-rank(b)||a.localeCompare(b,undefined,{numeric:true});
}
