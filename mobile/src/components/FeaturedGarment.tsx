import {garmentBoundsScript} from '../garment-bounds-script';
import {API} from '../api';
import React from 'react';
import {WebView} from 'react-native-webview';
import {garmentCutoutScript} from '../garment-cutout-script';
export function FeaturedGarment({src}:{src:string}){
 const safe=JSON.stringify(API+'/api/featured-image?src='+encodeURIComponent(src)).replace(/</g,'\\u003c');
 const html=`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:transparent;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;object-fit:contain}</style><canvas id="garment"></canvas><script>const remove=${garmentCutoutScript};const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{try{const c=document.getElementById('garment'),ctx=c.getContext('2d');const scale=Math.min(1,800/im.naturalWidth);c.width=Math.round(im.naturalWidth*scale);c.height=Math.round(im.naturalHeight*scale);ctx.drawImage(im,0,0,c.width,c.height);const frame=ctx.getImageData(0,0,c.width,c.height);if(!remove(frame.data,c.width,c.height)){ctx.clearRect(0,0,c.width,c.height);return;}const bounds=(${garmentBoundsScript})(frame.data,c.width,c.height);if(!bounds)return;const crop=new ImageData(bounds.width,bounds.height);for(let y=0;y<bounds.height;y++)crop.data.set(frame.data.subarray(((y+bounds.y)*c.width+bounds.x)*4,((y+bounds.y)*c.width+bounds.x+bounds.width)*4),y*bounds.width*4);c.width=bounds.width;c.height=bounds.height;ctx.putImageData(crop,0,0);}catch{}};im.src=${safe};</script></html>`;
 return <WebView key={src} originWhitelist={['about:blank']} source={{html}} javaScriptEnabled scrollEnabled={false} onShouldStartLoadWithRequest={r=>r.url==='about:blank'} style={{backgroundColor:'transparent',flex:1}}/>;
}
