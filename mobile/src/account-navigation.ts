/** A detail opened from You returns to You, not to an unrelated settings menu. */
export function openAccountPanel(history:string[],next:string):string[]{
 return history[history.length-1]===next?history:[...history,next];
}
export function previousAccountPanel(history:string[]):string[]|null{
 return history.length>1?history.slice(0,-1):null;
}

export function initialAccountPanel(panel?:string):string{
 const supported=['Settings','Profile','Shipping address','Vanta Circle','Verify phone','Currency','Email subscriptions','Account security','About Vanta Noir','Viewed'];
 return panel&&supported.includes(panel)?panel:'Settings';
}
