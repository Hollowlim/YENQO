import {Prisma} from '@prisma/client';
const D=Prisma.Decimal;
const value=input=>{if(input==null)return new D(0);if(!['string','number'].includes(typeof input)||! /^-?\d{1,15}(?:\.\d{1,8})?$/.test(String(input)))throw new Error('INVALID_DEAL');return new D(input);};
const dateKey=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
export function normalizeDeals(input,from,to){
 if(!Array.isArray(input)||input.length>10000)throw new Error('INVALID_HISTORY');
 const seen=new Map();
 for(const item of input){
  if(!['DEAL_TYPE_BUY','DEAL_TYPE_SELL'].includes(item.type))continue;
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(String(item.id))||!Number.isFinite(Date.parse(item.time))||item.profit==null)throw new Error('INVALID_DEAL');
  const time=new Date(item.time);if(time<from||time>=to)continue;
  const deal={id:String(item.id),time:time.toISOString(),positionId:String(item.positionId??''),entryType:String(item.entryType??''),symbol:String(item.symbol??'').slice(0,40),volume:value(item.volume).toString(),net:value(item.profit).add(value(item.swap)).add(value(item.commission)).add(value(item.fee)).toFixed(8)};
  if(value(deal.volume).lte(0))throw new Error('INVALID_DEAL');
  if(seen.has(deal.id)&&JSON.stringify(seen.get(deal.id))!==JSON.stringify(deal))throw new Error('CONFLICTING_DEAL');
  seen.set(deal.id,deal);
 }
 return [...seen.values()].sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
export function performanceSnapshot(deals,now=new Date()){
 /** @type {Record<string,{net:string,executions:number}>} */
 const days={};const groups=new Map();let weekly=new D(0),monthly=new D(0),yearly=new D(0);
 const day=new Date(`${dateKey(now)}T00:00:00+08:00`),end=new Date(+day+86400000);
 for(const deal of deals){
  const key=dateKey(deal.time),net=value(deal.net),time=new Date(deal.time);
  if(!days[key])days[key]={net:'0',executions:0};days[key].net=value(days[key].net).add(net).toFixed(8);days[key].executions++;
  if(time>=new Date(+end-7*86400000)&&time<end)weekly=weekly.add(net);
  if(time>=new Date(+end-30*86400000)&&time<end)monthly=monthly.add(net);
  if(time>=new Date(+end-365*86400000)&&time<end)yearly=yearly.add(net);
  if(deal.positionId){const group=groups.get(deal.positionId)??[];group.push(deal);groups.set(deal.positionId,group);}
 }
 const closed=[];
 for(const group of groups.values()){
  if(group[0].entryType!=='DEAL_ENTRY_IN'||group.some(d=>!['DEAL_ENTRY_IN','DEAL_ENTRY_OUT','DEAL_ENTRY_OUT_BY'].includes(d.entryType)))continue;
  let volume=new D(0),net=new D(0),valid=true;
  for(const d of group){volume=d.entryType==='DEAL_ENTRY_IN'?volume.add(value(d.volume)):volume.sub(value(d.volume));net=net.add(value(d.net));if(volume.lt(0))valid=false;}
  if(valid&&volume.eq(0))closed.push(net);
 }
 const wins=closed.filter(n=>n.gt(0)),losses=closed.filter(n=>n.lt(0));
 const average=values=>values.length?values.reduce((sum,n)=>sum.add(n),new D(0)).div(values.length).toFixed(8):null;
 return {days,metrics:{weekly:weekly.toFixed(8),monthly:monthly.toFixed(8),yearly:yearly.toFixed(8),winRate:closed.length?new D(wins.length).div(closed.length).mul(100).toFixed(2):null,averageWin:average(wins),averageLoss:average(losses),closedPositions:closed.length},basis:'Daily net trading-deal cash flow, including entry/exit commissions, fees and swaps. Deposits, withdrawals and unallocated balance adjustments excluded. Win rate and averages use fully closed positions with complete history; reversals and incomplete positions are excluded.'};
}
