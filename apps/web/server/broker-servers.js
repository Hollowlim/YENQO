// Suggested MT5 names corresponding to the broker's published Live/Live2/Demo/Demo2 routes.
// This is a small reference list, not an exhaustive directory or a connection-health check.
// Source (checked 2026-11-01): https://justmarkets.com/trade/web-terminal
export const justMarketsServerSuggestions=['JustMarkets-Live','JustMarkets-Live2','JustMarkets-Demo','JustMarkets-Demo2'];
export function justMarketsServerNames(response){
 if(!response||typeof response!=='object'||Array.isArray(response))return [];
 const names=[];
 for(const [broker,servers]of Object.entries(response).slice(0,10)){
  if(!/just\s*(?:global\s*)?markets/i.test(broker)||!Array.isArray(servers))continue;
  for(const server of servers.slice(0,10))if(typeof server==='string'&&/^JustMarkets[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9 _-]{0,80}$/.test(server))names.push(server);
 }
 return [...new Set(names)].sort((a,b)=>a.localeCompare(b));
}
