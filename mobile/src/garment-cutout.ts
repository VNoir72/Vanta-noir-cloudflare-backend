/** Removes only edge-connected studio backdrop pixels; preserves enclosed garment detail. */
export function removeGarmentBackdrop(data:Uint8ClampedArray,width:number,height:number){
 // Existing cutouts must retain white fabric, piping and soft alpha edges.
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<16)transparent++;
 if(transparent>width*height*.01)return true;
 const n=width*height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const corners=[0,width-1,(height-1)*width,n-1].map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);
 const background=(i:number)=>{const j=i*4;if(data[j+3]<16)return true;const r=data[j],g=data[j+1],b=data[j+2];return (Math.min(r,g,b)>202&&Math.max(r,g,b)-Math.min(r,g,b)<24)||corners.some(c=>Math.max(...c)-Math.min(...c)>24&&Math.hypot(r-c[0],g-c[1],b-c[2])<36);};
 const add=(i:number)=>{if(i>=0&&i<n&&!seen[i]&&background(i)){seen[i]=1;queue[tail++]=i;}};
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
 while(head<tail){const i=queue[head++];if(i%width)add(i-1);if(i%width<width-1)add(i+1);add(i-width);add(i+width);}
 if(tail/n>.94)return false;
 for(let i=0;i<n;i++)if(seen[i])data[i*4+3]=0;
 return true;
}
