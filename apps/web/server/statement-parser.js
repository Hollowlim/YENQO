import {parse} from 'parse5';
import {normalizeDeals} from './broker-performance.js';
export class StatementError extends Error {}
// HTML is parsed as inert server-side data. Never render or retain uploaded markup.
export function parseStatement(html,utcOffset){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)throw new StatementError('Use an MT5 HTML report smaller than 2 MB.');
 if(!Number.isInteger(utcOffset)||utcOffset< -720||utcOffset>840||utcOffset%15)throw new StatementError('Choose the broker report UTC offset.');
 const document=parse(html),rows=[];
 const text=node=>node.nodeName==='#text'?node.value:['script','style','iframe'].includes(node.tagName)?'':(node.childNodes??[]).map(text).join(' ');
 const visit=node=>{if(node.tagName==='tr')rows.push((node.childNodes??[]).filter(n=>['td','th'].includes(n.tagName)).map(n=>text(n).replace(/\s+/g,' ').trim()));for(const child of node.childNodes??[])visit(child);};visit(document);
 if(rows.length>15000)throw new StatementError('This report has too many rows. Export a shorter period.');
 let login='',currency='',server='';
 for(const row of rows){for(let i=0;i<row.length-1;i++){
  if(/^Account\s*:?$/i.test(row[i])){const match=row[i+1].match(/^(\d{4,20})(?:\s|\(|$)/);if(match){if(login&&login!==match[1])throw new StatementError('Import one trading account per report.');login=match[1];}const code=row[i+1].match(/\(([A-Z]{3})(?:[,\s)]|$)/);if(code){if(currency&&currency!==code[1])throw new StatementError('Conflicting report currency.');currency=code[1];}}
  if(/^Currency\s*:?$/i.test(row[i])&&/^[A-Z]{3}$/.test(row[i+1])){if(currency&&currency!==row[i+1])throw new StatementError('Conflicting report currency.');currency=row[i+1];}
  if(/^Server\s*:?$/i.test(row[i])){if(server&&server!==row[i+1])throw new StatementError('Import one broker server per report.');server=row[i+1];}
 }}
 if(!login||!currency)throw new StatementError('Report must include the MT5 account number and currency. Export an English MT5 History HTML statement.');
 const number=value=>{const normalized=value.replace(/[\s,]/g,'');if(!/^-?\d{1,15}(?:\.\d{1,8})?$/.test(normalized))throw new StatementError('Unsupported number format. Export the report in English.');return normalized;};
 let columns=null;const deals=[];
 for(const row of rows){
  const lower=row.map(cell=>cell.toLowerCase());
  if(['time','deal','type','volume','profit','commission','swap'].every(name=>lower.includes(name))){columns=lower;continue;}
  if(!columns)continue;
  const get=name=>row[columns.indexOf(name)]??'';
  if(!/^\d+$/.test(get('deal')))continue;
  const type=get('type').toLowerCase();if(!['buy','sell'].includes(type))continue;
  const stamp=get('time').match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if(!stamp)throw new StatementError('A trade has an unsupported date. Use an English MT5 History statement.');
  const [year,month,day,hour,minute,second]=stamp.slice(1,7).map(Number),local=Date.UTC(year,month-1,day,hour,minute,second,Number((stamp[7]??'').padEnd(3,'0')));
  const check=new Date(local);if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||hour>23||minute>59||second>59)throw new StatementError('A trade contains an invalid date.');
  const time=new Date(local-utcOffset*60000);if(time.getUTCFullYear()<1900||time>new Date(Date.now()+86400000))throw new StatementError('A trade date is outside the supported range. Check the UTC offset.');
  const direction=get('direction').toLowerCase(),entryType=({'in':'DEAL_ENTRY_IN','out':'DEAL_ENTRY_OUT','in/out':'DEAL_ENTRY_INOUT','out by':'DEAL_ENTRY_OUT_BY'})[direction]??'';
  deals.push({id:get('deal'),time:time.toISOString(),type:type==='buy'?'DEAL_TYPE_BUY':'DEAL_TYPE_SELL',entryType,positionId:get('position'),symbol:get('symbol'),volume:number(get('volume')),profit:number(get('profit')),commission:number(get('commission')),swap:number(get('swap')),fee:columns.includes('fee')?number(get('fee')):0});
 }
 if(!columns||!deals.length)throw new StatementError('No supported trading deals found. Export History → Report → HTML with the Deals table. Summary-only, PDF and backtest reports are not supported.');
 try{return {login,currency,server,deals:normalizeDeals(deals,new Date('1900-01-01Z'),new Date('2101-01-01Z'))};}catch{throw new StatementError('Invalid or conflicting deals in the report. No results were imported.');}
}
export function mergeStatement(existing,incoming){
 const map=new Map((existing??[]).map(row=>[row.id,row]));let added=0;
 for(const row of incoming){const old=map.get(row.id);if(old&&Object.keys(row).some(field=>old[field]!==row[field]))throw new StatementError('A previously imported deal differs. Check account, report and UTC offset.');if(!old){map.set(row.id,row);added++;}}
 if(map.size>10000)throw new StatementError('The calendar supports up to 10,000 trading executions.');
 return {deals:[...map.values()].sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id)),added};
}
