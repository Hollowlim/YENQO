// Server-only MetaApi adapter. No trade/order methods are exposed or imported.
const provisioning='https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const regions=['new-york','vint-hill','london','singapore'];
export const brokerConfigured=()=>process.env.BROKER_READ_ONLY_ENABLED==='true'&&Boolean(process.env.METAAPI_TOKEN?.trim())&&regions.includes(process.env.METAAPI_REGION??'new-york');
const diagnosticOperations=['createAccount','deployAccount','removeAccount','undeployAccount','getAccount','accountInformation','historyDeals','serverDirectory','positions','candles'];
const diagnosticErrors=['UnauthorizedError','ForbiddenError','ValidationError','NotFoundError','TooManyRequestsError','InternalError'];
const diagnosticCodes=['E_AUTH','E_SERVER_TIMEZONE','E_RESOURCE_SLOTS','E_NO_SYMBOLS','ERR_OTP_REQUIRED','E_PASSWORD_CHANGE_REQUIRED','E_TRADING_ACCOUNT_DISABLED'];
const diagnosticHints=['permission','resource','role','token','region','subscription','balance','payment','quota'];
// Never retain provider text: it can echo submitted passwords or account data.
export function safeBrokerDiagnostic(value){
 if(!value||typeof value!=='object'||!Number.isInteger(value.status)||value.status<400||value.status>599||!diagnosticOperations.includes(value.operation))return undefined;
 return {status:value.status,operation:value.operation,...(diagnosticErrors.includes(value.error)?{error:value.error}:{}),...(diagnosticCodes.includes(value.code)?{code:value.code}:{}),hints:diagnosticHints.filter(hint=>Array.isArray(value.hints)&&value.hints.includes(hint))};
}
export class BrokerUnavailable extends Error {
 /** @param {string} code @param {object|undefined} diagnostic */
 constructor(code='PROVIDER_UNAVAILABLE',diagnostic=undefined){super(code);this.code=code;this.diagnostic=safeBrokerDiagnostic(diagnostic);}
}
async function boundedJson(response,limit){
 const reader=response.body?.getReader();if(!reader)throw new BrokerUnavailable();let size=0;const chunks=[];
 for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>limit){await reader.cancel();throw new BrokerUnavailable('HISTORY_TOO_LARGE');}chunks.push(next.value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function operationFor(path,method){
 if(path.startsWith('/known-mt-servers/'))return 'serverDirectory';
 if(path==='/users/current/accounts'&&method==='POST')return 'createAccount';
 if(path.endsWith('/undeploy'))return 'undeployAccount';
 if(path.endsWith('/deploy'))return 'deployAccount';
 if(path.endsWith('/accountInformation'))return 'accountInformation';
 if(path.includes('/history-deals/'))return 'historyDeals';
 if(path.endsWith('/positions'))return 'positions';
 if(path.includes('/historical-market-data/'))return 'candles';
 return method==='DELETE'?'removeAccount':'getAccount';
}
export function metaApiProvider(fetcher=fetch){
 const region=process.env.METAAPI_REGION??'new-york';
 const verifiedRegions=new Map();
 const clientFor=accountRegion=>{if(!regions.includes(accountRegion))throw new BrokerUnavailable('REGION_UNSUPPORTED');return `https://mt-client-api-v1.${accountRegion}.agiliumtrade.ai`;};
 const id=value=>{if(typeof value!=='string'||! /^[a-zA-Z0-9-]{8,80}$/.test(value))throw new BrokerUnavailable('INVALID_PROVIDER_RESPONSE');return encodeURIComponent(value);};
 /** @param {string} host @param {string} path @param {string} method @param {object|undefined} body @param {string|undefined} key */
 async function call(host,path,method='GET',body=undefined,key=undefined){
  if(!brokerConfigured())throw new BrokerUnavailable('NOT_CONFIGURED');
  try{
   const headers=new Headers({'auth-token':process.env.METAAPI_TOKEN??'',Accept:'application/json'});if(body)headers.set('Content-Type','application/json');if(key)headers.set('transaction-id',key);
   const response=await fetcher(host+path,{method,redirect:'error',signal:globalThis.AbortSignal.timeout(20000),headers,...(body?{body:JSON.stringify(body)}:{})});
   if(response.status===404&&method==='DELETE')return null;
   if(!response.ok){
    const failure=await boundedJson(response,16384).catch(()=>null);
    const providerCode=typeof failure?.details==='string'?failure.details:failure?.details?.code;
    const message=typeof failure?.message==='string'?failure.message.toLowerCase():'';
    const code=providerCode==='E_AUTH'?'BROKER_CREDENTIALS_REJECTED':providerCode==='E_SERVER_TIMEZONE'?'BROKER_SERVER_DETECTION_FAILED':response.status===401?'PROVIDER_TOKEN_REJECTED':response.status===403?'PROVIDER_PERMISSION_DENIED':response.status===429?'PROVIDER_RATE_LIMITED':'PROVIDER_UNAVAILABLE';
    throw new BrokerUnavailable(code,{status:response.status,operation:operationFor(path,method),error:failure?.error,code:providerCode,hints:diagnosticHints.filter(hint=>message.includes(hint))});
   }
   if(response.status===204)return null;
   return await boundedJson(response,4*1024*1024);
  }catch(error){if(error instanceof BrokerUnavailable)throw error;throw new BrokerUnavailable();}
 }
 return {
  servers:()=>call(provisioning,'/known-mt-servers/5/search?query=JustMarkets'),
  async create({login,server,investorPassword,requestKey,userId}){
   // MetaApi expects a 32-character transaction ID; retain the same UUID's
   // identity across retries while removing its display separators.
   const transactionId=String(requestKey).replaceAll('-','').toLowerCase();
   if(!/^[a-f0-9]{32}$/.test(transactionId))throw new BrokerUnavailable('INVALID_TRANSACTION_ID');
   const result=await call(provisioning,'/users/current/accounts','POST',{name:'YENGFX read-only '+userId,platform:'mt5',type:'cloud-g2',login,server,password:investorPassword,magic:0,manualTrades:true,region},transactionId);
   const accountId=result?.id??result?._id;id(accountId);return accountId;
  },
  deploy:accountId=>call(provisioning,`/users/current/accounts/${id(accountId)}/deploy`,'POST'),
  undeploy:accountId=>call(provisioning,`/users/current/accounts/${id(accountId)}/undeploy`,'POST'),
  remove:accountId=>call(provisioning,`/users/current/accounts/${id(accountId)}`,'DELETE'),
  async read(accountId,{login,server}){
   verifiedRegions.delete(accountId);
   const account=await call(provisioning,`/users/current/accounts/${id(accountId)}`);
   if(account.login!==login||account.server!==server||account.platform&&account.platform!=='mt5'||account.version!==undefined&&account.version!==5)throw new BrokerUnavailable('ACCOUNT_MISMATCH');
   const client=clientFor(account.region);
   if(['UNDEPLOYED','CREATED'].includes(account.state))throw new BrokerUnavailable('BROKER_UNDEPLOYED');
   if(['DEPLOY_FAILED','REDEPLOY_FAILED','UNDEPLOY_FAILED'].includes(account.state))throw new BrokerUnavailable('BROKER_DEPLOY_FAILED');
   if(account.connectionStatus==='DISCONNECTED_FROM_BROKER')throw new BrokerUnavailable('BROKER_LOGIN_DISCONNECTED');
   if(account.connectionStatus!=='CONNECTED')throw new BrokerUnavailable('BROKER_NOT_CONNECTED');
   const info=await call(client,`/users/current/accounts/${id(accountId)}/accountInformation`);
   if(String(info.login)!==login||info.server!==server||info.platform!=='mt5')throw new BrokerUnavailable('ACCOUNT_MISMATCH');
   if(info.investorMode!==true||info.tradeAllowed!==false)throw new BrokerUnavailable('INVESTOR_PASSWORD_REQUIRED');
   if(info.type!=='ACCOUNT_TRADE_MODE_DEMO' && !(process.env.METAAPI_ALLOW_REAL_READONLY==='true'&&info.type==='ACCOUNT_TRADE_MODE_REAL'))throw new BrokerUnavailable('DEMO_ACCOUNT_REQUIRED');
   if(!/^[A-Z]{3}$/.test(info.currency))throw new BrokerUnavailable('INVALID_PROVIDER_RESPONSE');
   verifiedRegions.set(accountId,account.region);
   return {currency:info.currency,balance:info.balance,equity:info.equity,margin:info.margin};
  },
  // Read-only chart data: candles for one symbol plus the account's open positions on it.
  async live(accountId,account,symbol,timeframe){
   const info=await this.read(accountId,account),region=verifiedRegions.get(accountId),path=`/users/current/accounts/${id(accountId)}`;
   const [positions,candles]=await Promise.all([
    call(clientFor(region),path+'/positions'),
    call(`https://mt-market-data-client-api-v1.${region}.agiliumtrade.ai`,`${path}/historical-market-data/symbols/${encodeURIComponent(symbol)}/timeframes/${timeframe}/candles?limit=120`)
   ]);
   if(!Array.isArray(positions)||!Array.isArray(candles))throw new BrokerUnavailable('INVALID_PROVIDER_RESPONSE');
   return {info,positions,candles};
  },
  async history(accountId,from,to){
   if(!verifiedRegions.has(accountId))throw new BrokerUnavailable('BROKER_NOT_CONNECTED');
   const client=clientFor(verifiedRegions.get(accountId));
   const result=[];
   for(let offset=0;offset<=10000;offset+=1000){
    const rows=await call(client,`/users/current/accounts/${id(accountId)}/history-deals/time/${encodeURIComponent(from.toISOString())}/${encodeURIComponent(to.toISOString())}?offset=${offset}&limit=1000`);
    if(!Array.isArray(rows))throw new BrokerUnavailable('INVALID_PROVIDER_RESPONSE');
    result.push(...rows);if(result.length>10000)throw new BrokerUnavailable('HISTORY_TOO_LARGE');if(rows.length<1000)return result;
   }
   throw new BrokerUnavailable('HISTORY_TOO_LARGE');
  }
 };
}
