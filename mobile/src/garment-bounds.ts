/** Tight transparent bounds with a small breathing margin. Null means no garment. */
export function garmentBounds(data:Uint8ClampedArray,width:number,height:number){
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left||bottom<top)return null;
 const pad=Math.max(2,Math.round(Math.max(right-left,bottom-top)*.035));left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(width-1,right+pad);bottom=Math.min(height-1,bottom+pad);
 return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
