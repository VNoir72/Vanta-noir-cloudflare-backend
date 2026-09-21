import { PaymentCompletion } from "@/components/payment-completion";
export const dynamic="force-dynamic";
export const metadata={title:"Payment confirmation",robots:{index:false,follow:false}};
export default async function CheckoutCompletePage({searchParams}:{searchParams:Promise<{reference?:string|string[]}>}){const params=await searchParams;return <PaymentCompletion reference={(Array.isArray(params.reference)?params.reference[0]:params.reference)||""}/>;}
