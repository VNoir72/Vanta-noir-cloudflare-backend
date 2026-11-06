import scales from "./floating-asset-scales.json";
/** Keep the complete visible garment inside the stage, including tall sets. */
export function floatingScale(image?:string){
 const match=image?.match(/^\/images\/floating\/([a-f0-9]{24})\.webp$/);
 return match?(scales as Record<string,number>)[match[1]]??1:1;
}
