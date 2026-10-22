import {deliveryLabels,deliveryMessage,deliveryStep,type ProgressOrder} from '@/mobile/src/delivery-progress';

export function OrderProgress({order}:{order:ProgressOrder}){
 const current=deliveryStep(order),progress=order.deliveryProgress;
 return <section className="vn-product-disclosure mt-5" aria-label="Order progress" aria-live="polite">
  <h3 className="text-xl">Delivery progress</h3>
  {current===null?<p>{deliveryMessage(order)}</p>:<><ol style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,padding:0,margin:'16px 0',listStyle:'none'}}>{deliveryLabels.map((label,index)=><li key={label} style={{minWidth:0,overflowWrap:'anywhere',borderTop:`3px solid ${index<=current?'#b8955b':'#777'}`,paddingTop:8,fontWeight:index===current?700:400,opacity:index>current?.6:1}}><span style={{fontSize:12}}>{label}</span></li>)}</ol><p>{deliveryMessage(order)}</p></>}
  {progress?.carrier&&<p>Delivery partner: {progress.carrier}</p>}
  {(progress?.events?.length||0)>0&&<div><h4>Courier updates</h4><ul>{progress!.events.slice(-6).reverse().map((event,index)=><li key={index}>{event.message}{event.location?' · '+event.location:''}{event.at?' · '+new Date(event.at).toLocaleString():''}</li>)}</ul></div>}
 </section>;
}
