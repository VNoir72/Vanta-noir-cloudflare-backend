const DAY=86_400_000;
export type ReportRange={from:string;to:string;previousFrom:string;previousTo:string;days:number;endExclusive:string};
export function reportRange(params:URLSearchParams=new URLSearchParams(),now=new Date()):ReportRange{
 const today=now.toISOString().slice(0,10),to=params.get('to')||today;
 const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const count=Number(params.get('days')||30);
 if(!Number.isInteger(count)||count<1||count>366||!date(to))throw new Error('Choose a valid date range of at most 366 days.');
 const from=params.get('from')||new Date(Date.parse(to)-(count-1)*DAY).toISOString().slice(0,10);
 if(!date(from)||from>to||to>today)throw new Error('Choose valid dates, ending today or earlier.');
 const days=Math.round((Date.parse(to)-Date.parse(from))/DAY)+1;
 if(days>366)throw new Error('Choose at most 366 days.');
 return {from,to,days,previousFrom:new Date(Date.parse(from)-days*DAY).toISOString().slice(0,10),previousTo:new Date(Date.parse(from)-DAY).toISOString().slice(0,10),endExclusive:new Date(Date.parse(to)+DAY).toISOString().slice(0,10)};
}
export function comparison(current:number,previous:number){return previous===0?(current===0?'No change':'No previous baseline'):`${current>=previous?'+':''}${((current-previous)/previous*100).toFixed(1)}%`;}
export function reportTrend(range:ReportRange,rows:Array<{day:string;orders:number;revenueKobo:number}>){
 const map=new Map(rows.map(row=>[row.day,row]));
 return Array.from({length:range.days},(_,index)=>{const day=new Date(Date.parse(range.from)+index*DAY).toISOString().slice(0,10),previousDate=new Date(Date.parse(range.previousFrom)+index*DAY).toISOString().slice(0,10),row=map.get(day),previous=map.get(previousDate);return {date:day,previousDate,label:new Date(day).toLocaleDateString('en-NG',{day:'2-digit',month:'short',timeZone:'UTC'}),orders:Number(row?.orders||0),revenueKobo:Number(row?.revenueKobo||0),previousOrders:Number(previous?.orders||0),previousRevenueKobo:Number(previous?.revenueKobo||0)};});
}
