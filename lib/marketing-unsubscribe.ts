// Transactional order/account messages and confirmation requests never receive marketing headers.
export function marketingUnsubscribeHeaders(eventKey:string){
  if(!/^(?:subscription:[^:]+:(?:restock|release):|automation:(?:checkout|aftercare):)/.test(eventKey))return undefined;
  const token=eventKey.split(':').at(-1)||'';
  if(!/^[a-f0-9-]{72}$/i.test(token))return undefined;
  return {'List-Unsubscribe':`<https://api.vantanoir.store/api/subscriptions?one_click=${encodeURIComponent(token)}>`,
    'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'};
}
