import {displayMoney,usePreferences} from '../preferences';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Pressable,ScrollView,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';
import {Text} from '../theme';
import {Product} from '../types';
import {imageUrl} from '../api';
import {useReducedMotion} from './Motion';
import {FloatingCampaign} from './FloatingCampaign';
import {heroSlides,heroProductImage,HeroMode,HeroMedia} from '../hero-policy';
export type AppHeroSettings={slots?:import('../hero-policy').HeroSlot[];image:string;mobileImage?:string;title:string;showText?:boolean;buttonText?:string;buttonLink?:string;contentMode?:HeroMode;fourthSlideEnabled?:boolean;productsFirst?:boolean;productOrder?:string[];productCutouts?:Record<string,string>;intervalSeconds?:number;fit?:'contain'|'cover';playlist?:HeroMedia[]};
function HeroVideo({url,active,autoplay,onEnd,loop}:{url:string;active:boolean;autoplay:boolean;onEnd:()=>void;loop:boolean}){
 const player=useVideoPlayer(imageUrl(url),p=>{p.muted=true;p.loop=loop;});
 useEffect(()=>{if(active&&autoplay)player.play();else player.pause();const sub=AppState.addEventListener('change',state=>{if(state==='active'&&active&&autoplay)player.play();else player.pause();});return()=>sub.remove();},[active,autoplay,player]);
 useEffect(()=>{const sub=player.addListener('playToEnd',onEnd);return()=>sub.remove();},[player,onEnd]);
 return <VideoView player={player} nativeControls contentFit="contain" style={{flex:1,backgroundColor:'#080b0c'}}/>;
}
export function AppHero({hero,products,onProduct,onCampaign,autoplay}:{hero:AppHeroSettings;products:Product[];onProduct:(p:Product)=>void;onCampaign:(link:string)=>void;autoplay:boolean}){
 usePreferences();const reduce=useReducedMotion();const [width,setWidth]=useState(0),[index,setIndex]=useState(0);const scroll=useRef<ScrollView>(null);
 const featured=hero.productOrder?.length?hero.productOrder.flatMap(id=>products.find(p=>p.id===id)?[products.find(p=>p.id===id)!]:[]):products.filter(p=>p.featured);
 const slides=heroSlides(hero,featured,{url:hero.mobileImage||hero.image,type:'image',alt:'Vanta Noir campaign',link:hero.buttonLink});
 const count=slides.length,activeIndex=Math.min(index,Math.max(0,count-1)),isVideo=slides[activeIndex]?.media?.type==='video';
 const identity=slides.map(s=>s.product?.id||s.media?.url).join('|');const lastLayout=useRef('');
 useEffect(()=>{const layout=identity+'@'+width;if(lastLayout.current===layout)return;lastLayout.current=layout;scroll.current?.scrollTo({x:activeIndex*width,animated:false});},[identity,width,activeIndex]);
 const move=(n:number)=>{const next=(n+count)%Math.max(1,count);setIndex(next);scroll.current?.scrollTo({x:next*width,animated:!reduce});};
 useEffect(()=>{if(reduce||!autoplay||isVideo||count<2||!width)return;const timer=setInterval(()=>{if(AppState.currentState!=='active')return;const next=(activeIndex+1)%count;scroll.current?.scrollTo({x:next*width,animated:true});setIndex(next);},Math.max(5,hero.intervalSeconds||8)*1000);return()=>clearInterval(timer);},[autoplay,reduce,width,activeIndex,count,hero.intervalSeconds,isVideo]);
 if(!count)return null;
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{borderRadius:18,overflow:'hidden',backgroundColor:'#080b0c'}}><ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>{if(width)setIndex(Math.round(e.nativeEvent.contentOffset.x/width));}}>
 {slides.map((slide,i)=>{const animated=!!slide.product||slide.media?.type==='image'&&/vanta-brand-hero|vanta-burgundy-set-campaign/.test(slide.media.url);const light=i%3===0;const open=()=>slide.product?onProduct(slide.product):onCampaign(slide.media?.link||hero.buttonLink||'/#collection');return <View key={slide.product?.id||slide.media?.url||i} style={{width:width||320,height:230}}>{animated?<><FloatingCampaign theme={i%3} active={activeIndex===i} reduced={reduce} image={slide.product?imageUrl(heroProductImage(slide.product,hero.productCutouts)):undefined}/><View style={{position:'absolute',left:16,top:35,width:'43%',gap:9}}><Text numberOfLines={3} style={{fontSize:20,lineHeight:23,fontWeight:'700',color:light?'#171a17':'#fff'}}>{slide.product?.name||hero.title.replace(/\n/g,' ')}</Text>{slide.product&&<Text style={{fontSize:12,color:light?'#171a17':'#fff'}}>{slide.product.details?.availability==='preview'?'Preview design':displayMoney(slide.product.priceKobo)}</Text>}<Pressable onPress={open} style={{backgroundColor:'#ceff46',borderRadius:30,minHeight:44,paddingHorizontal:14,justifyContent:'center',alignSelf:'flex-start'}}><Text style={{fontSize:12,fontWeight:'700',color:'#151915'}}>Explore →</Text></Pressable></View></>:slide.media?.type==='video'?<HeroVideo url={slide.media.url} active={activeIndex===i} autoplay={autoplay&&!reduce} onEnd={()=>move(i+1)} loop={count===1}/>:<Pressable onPress={open} style={{flex:1}}><Image source={{uri:imageUrl(slide.media!.url)}} accessibilityLabel={slide.media!.alt} resizeMode={hero.fit||'contain'} style={{width:'100%',height:'100%'}}/></Pressable>}</View>;})}
 </ScrollView>{!isVideo&&count>1&&<View style={{position:'absolute',bottom:0,left:0,right:0,flexDirection:'row',justifyContent:'center'}}>{slides.map((_,i)=><Pressable key={i} accessibilityLabel={`Hero slide ${i+1}`} accessibilityState={{selected:i===activeIndex}} onPress={()=>move(i)} style={{padding:12}}><View style={{height:6,width:i===activeIndex?18:6,borderRadius:4,backgroundColor:i===activeIndex?'#c9ff43':'#888'}}/></Pressable>)}</View>}</View>;
}
