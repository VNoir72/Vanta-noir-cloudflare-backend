import {useEffect,useState} from 'react';
import {PaymentCompletion} from '@/components/payment-completion';
export function CheckoutComplete(){
 const [reference,setReference]=useState<string|null>(null);
 useEffect(()=>{setReference(new URL(window.location.href).searchParams.get('reference')??'');},[]);
 return <PaymentCompletion reference={reference}/>;
}
