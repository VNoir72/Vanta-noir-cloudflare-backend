import {displayMoney,usePreferences} from "../preferences";
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Pressable,ScrollView,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';
import {Text,useTheme} from '../theme';
import {Product} from '../types';
import {imageUrl} from '../api';
import {useReducedMotion} from './Motion';
export type AppHeroSettings={image:string;mobileImage?:string;title:string;showText?:boolean;buttonText?:string;buttonLink?:string;contentMode?:'mixed'|'products'|'campaigns';productsFirst?:boolean;productOrder?:string[];intervalSeconds?:number;fit?:'contain'|'cover';playlist?:{url:string;type:'image'|'video';alt:string;link?:string}[]};
function HeroVideo({url,active,autoplay}:{url:string;active:boolean;autoplay:boolean}){
 const player=useVideoPlayer(imageUrl(url),p=>{p.muted=true;p.loop=true;});
 useEffect(()=>{if(active&&autoplay)player.play();else player.pause();const sub=AppState.addEventListener('change',state=>{if(state==='active'&&active&&autoplay)player.play();else player.pause();});return()=>sub.remove();},[active,autoplay,player]);
 return <View style={{flex:1,backgroundColor:'#0a0a0a'}}><VideoView player={player} nativeControls={!autoplay} contentFit="contain" style={{flex:1}}/></View>;
}
export function AppHero({hero,products,onProduct,onCampaign,autoplay}:{hero:AppHeroSettings;products:Product[];onProduct:(p:Product)=>void;onCampaign:(link:string)=>void;autoplay:boolean}){
 usePreferences();
 const {colors}=useTheme(),reduce=useReducedMotion();const [width,setWidth]=useState(0),[index,setIndex]=useState(0);const scroll=useRef<ScrollView>(null);
 const featured=hero.contentMode==='campaigns'?[]:hero.productOrder?.length?hero.productOrder.flatMap(id=>products.find(p=>p.id===id)?[products.find(p=>p.id===id)!]:[]):products.filter(p=>p.featured).slice(0,12);
 const media=hero.contentMode==='products'&&featured.length?[]:hero.playlist?.length?hero.playlist:[{url:hero.mobileImage||hero.image,type:'image' as const,alt:'Vanta Noir campaign',link:hero.buttonLink}];
 const productSlides=featured.map(product=>({product,media:undefined}));const campaignSlides=media.map(media=>({product:undefined,media}));const slides=hero.productsFirst?[...productSlides,...campaignSlides]:[...campaignSlides,...productSlides];
 useEffect(()=>{if(reduce||!autoplay||slides.length<2||!width)return;const timer=setInterval(()=>{if(AppState.currentState!=='active')return;const next=(index+1)%slides.length;scroll.current?.scrollTo({x:next*width,animated:true});setIndex(next);},Math.max(5,hero.intervalSeconds||8)*1000);return()=>clearInterval(timer);},[autoplay,reduce,width,index,slides.length,hero.intervalSeconds]);
 const activeIndex=Math.min(index,Math.max(0,slides.length-1));
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{borderRadius:16,overflow:'hidden',backgroundColor:colors.surface}}>
 <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>{if(width)setIndex(Math.round(e.nativeEvent.contentOffset.x/width));}}>
 {slides.map((slide,i)=><View key={slide.product?.id||slide.media?.url||i} style={{width:width||320,height:210}}>{slide.product?<Pressable onPress={()=>onProduct(slide.product!)} style={{flex:1,flexDirection:'row',padding:14,gap:10,backgroundColor:colors.page}}><Image source={require('../../assets/emblem-watermark.png')} resizeMode="contain" style={{position:'absolute',right:8,bottom:8,width:140,height:120,opacity:0.035,tintColor:colors.text}}/><Image source={{uri:imageUrl(slide.product.imageUrl)}} resizeMode="contain" style={{width:'48%',height:'100%'}}/><View style={{flex:1,justifyContent:'center',gap:8}}><Text style={{fontSize:10,letterSpacing:1.5}}>FEATURED</Text><Text numberOfLines={3} style={{fontSize:18,fontWeight:'700'}}>{slide.product.name}</Text><Text>{slide.product.details?.availability==='preview'?'Preview design':displayMoney(slide.product.priceKobo)}</Text><Text style={{fontWeight:'700'}}>View piece →</Text></View></Pressable>:slide.media&&<>
 {slide.media.type==='video'?<HeroVideo url={slide.media.url} active={activeIndex===i} autoplay={autoplay&&!reduce}/>:<View style={{flex:1,backgroundColor:'#141414'}}><Image source={{uri:imageUrl(slide.media.url)}} blurRadius={22} resizeMode="cover" style={{position:'absolute',width:'100%',height:'100%',opacity:0.35}}/><Image source={{uri:imageUrl(slide.media.url)}} accessibilityLabel={slide.media.alt} resizeMode={hero.fit||'contain'} style={{width:'100%',height:'100%'}}/></View>}
 {hero.showText===false&&<Pressable accessibilityLabel="Open campaign" onPress={()=>onCampaign(slide.media?.link||hero.buttonLink||'/#collection')} style={{position:'absolute',right:12,bottom:28,padding:10,borderRadius:20,backgroundColor:'rgba(0,0,0,.55)'}}><Text style={{color:'#fff',fontSize:12}}>Explore →</Text></Pressable>}
 {hero.showText!==false&&<Pressable accessibilityLabel="Open campaign" onPress={()=>onCampaign(slide.media?.link||hero.buttonLink||'/#collection')} style={{position:'absolute',left:12,bottom:28,right:12,padding:9,borderRadius:8,backgroundColor:'rgba(0,0,0,.48)'}}><Text numberOfLines={2} style={{fontSize:19,fontWeight:'700',color:'#fff'}}>{hero.title.replace(/\n/g,' ')}</Text><Text style={{fontSize:12,color:'#fff'}}>{hero.buttonText||'Explore'} →</Text></Pressable>}
 </>}</View>)}
 </ScrollView>
 {slides.length>1&&<View style={{position:'absolute',bottom:2,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:3}}>{slides.map((_,i)=><Pressable key={i} accessibilityLabel={`Hero slide ${i+1}`} onPress={()=>{setIndex(i);scroll.current?.scrollTo({x:i*width,animated:!reduce});}} style={{padding:8}}><View style={{height:4,width:i===activeIndex?18:6,borderRadius:4,backgroundColor:i===activeIndex?colors.accent:'#9c9c9c'}}/></Pressable>)}</View>}
 </View>;
}
