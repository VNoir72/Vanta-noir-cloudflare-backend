/** Paystack owns the payment fields; the server alone confirms a paid order. */
type Options = { onSuccess: () => void; onCancel: () => void; onError: (error: {message?:string}) => void };
type PaystackConstructor = new () => { resumeTransaction: (accessCode:string,options:Options)=>void };
declare global { interface Window { PaystackPop?: PaystackConstructor } }
let loading: Promise<PaystackConstructor> | undefined;
export function loadPaystack(): Promise<PaystackConstructor> {
  if(window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if(loading) return loading;
  loading = new Promise<PaystackConstructor>((resolve,reject)=>{
    const script = document.createElement("script");
    script.src="https://js.paystack.co/v2/inline.js"; script.async=true;
    const timer=setTimeout(()=>finish(new Error("The secure payment window took too long to load. Check your connection and retry.")),15000);
    function finish(error?:Error){clearTimeout(timer);script.onload=null;script.onerror=null;if(error||!window.PaystackPop){script.remove();loading=undefined;reject(error??new Error("The secure payment window is unavailable. Please retry."));}else resolve(window.PaystackPop);}
    script.onload=()=>finish();script.onerror=()=>finish(new Error("The secure payment window could not load. Check your connection and retry."));document.head.appendChild(script);
  });
  return loading;
}
