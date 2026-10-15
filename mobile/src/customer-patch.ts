import type {Customer,Address} from './types';
/** Never resend unrelated stale address data when changing profile or favourites. */
export function customerPatch(previous:Customer,next:Customer){
 const patch:Partial<Pick<Customer,'name'|'phone'|'addresses'|'favourites'>>&{expectedAddresses?:Address[]}={};
 for(const key of ['name','phone','favourites'] as const){
  if(JSON.stringify(previous[key])!==JSON.stringify(next[key]))Object.assign(patch,{[key]:next[key]});
 }
 if(JSON.stringify(previous.addresses)!==JSON.stringify(next.addresses)){
  patch.addresses=next.addresses;patch.expectedAddresses=previous.addresses;
 }
 return patch;
}
