import {z} from 'zod';
import {db} from './db.js';
import {currentUser} from './auth.js';
import {hasFullMemberAccess} from './membership-policy.js';
import {isSameOrigin} from './security.js';
import {takeRateLimit} from './rate-limit.js';
import {readBoundedJson} from './request-body.js';
import {jsonResponse} from './http.js';
import {brokerConfigured,metaApiProvider,BrokerUnavailable,safeBrokerDiagnostic} from './broker-provider.js';
import {normalizeDeals,performanceSnapshot} from './broker-performance.js';
import {justMarketsServerNames,justMarketsServerSuggestions} from './broker-servers.js';
const connectSchema=z.object({broker:z.string().trim().min(1).max(60),login:z.string().regex(/^\d{4,20}$/),server:z.string().trim().min(1).max(100),investorPassword:z.string().min(1).max(128).refine(value=>!value.includes('\0')),requestKey:z.uuid(),consent:z.literal(true)}).strict();
const versionSchema=z.object({version:z.number().int().min(0)}).strict();
const publicConnection=row=>row?{broker:row.broker,accountSuffix:row.login.slice(-4),server:row.server,state:row.state,version:row.version,lastSyncedAt:row.lastSyncedAt,currency:row.currency,canSync:Boolean(row.providerAccountId),requestKey:row.requestKey,historyFrom:row.historyFrom,historyTo:row.historyTo}:null;
const unavailable='MetaApi setup is pending. The owner must configure the private API token before MT5 history can connect.';
const busy=row=>row.leaseUntil&&new Date(row.leaseUntil)>new Date();
const lease=()=>new Date(Date.now()+5*60*1000);
const brokerMessages={
 INVESTOR_PASSWORD_REQUIRED:'Investor access was not confirmed. Use the investor password, disconnect and reconnect.',
 DEMO_ACCOUNT_REQUIRED:'Initial MetaApi validation requires an MT5 demo account. The provider account was not accepted for history syncing.',
 OWNERSHIP_CHANGED:'Your membership or broker details changed while syncing. No new history was saved.',
 BROKER_NOT_CONNECTED:'MetaApi has not connected yet. Check the account status in MetaApi before syncing again.',
 BROKER_UNDEPLOYED:'Your MetaApi account is stopped. The site owner must open MetaApi → Trading accounts and start/deploy this existing account. Then use Sync history. No password needs to be sent in chat.',
 BROKER_DEPLOY_FAILED:'MetaApi could not start this account. The site owner must review its deployment error in MetaApi before retrying.',
 BROKER_LOGIN_DISCONNECTED:'MetaApi is disconnected from the broker. Check the exact broker server and investor credentials in MetaApi, then wait for connection before syncing.',
 REGION_UNSUPPORTED:'This MetaApi account uses a region this integration does not support. Contact the site owner.',
 ACCOUNT_MISMATCH:'The MetaApi account does not match your saved MT5 account and server. Check the saved details before reconnecting.',
 PROVIDER_AUTH_FAILED:'MetaApi rejected an API permission or token. The site owner must check the saved API token and its account-management and REST permissions.',
 PROVIDER_TOKEN_REJECTED:'MetaApi rejected the API token (HTTP 401). The site owner must check the private server token. This does not confirm a broker-password problem.',
 PROVIDER_PERMISSION_DENIED:'MetaApi denied this operation (HTTP 403). The site owner must review the private connection diagnostic before changing permissions or retrying.',
 BROKER_CREDENTIALS_REJECTED:'MetaApi reports a broker login failure. Check the exact MT5 account, server and investor password before retrying.',
 BROKER_SERVER_DETECTION_FAILED:'MetaApi could not detect the broker server settings. Check the exact server in MT5 and review MetaApi account setup before retrying.',
 PROVIDER_RATE_LIMITED:'MetaApi is limiting requests. Wait before trying again.',
 PROVIDER_UNAVAILABLE:'The managed broker service could not complete this request. Check the provider account and try again.',
};
const liveTimeframes={M5:'5m',M15:'15m',H1:'1h',H4:'4h'};
const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
// Shapes provider data for the chart. MT5 reports "no stop" as 0, so 0 becomes null.
export function liveSnapshot({info,positions,candles},symbol,now=new Date()){
 const bars=candles.map(c=>({time:Date.parse(c?.time),open:num(c?.open),high:num(c?.high),low:num(c?.low),close:num(c?.close)})).filter(c=>Number.isFinite(c.time)&&[c.open,c.high,c.low,c.close].every(v=>v!==null)).sort((a,b)=>a.time-b.time);
 const open=positions.filter(p=>p&&typeof p==='object');
 const layers=open.filter(p=>p.symbol===symbol).map(p=>({side:p.type==='POSITION_TYPE_BUY'?'BUY':p.type==='POSITION_TYPE_SELL'?'SELL':null,volume:num(p.volume),openPrice:num(p.openPrice),stopLoss:num(p.stopLoss)||null,takeProfit:num(p.takeProfit)||null,profit:num(p.profit),time:typeof p.time==='string'?p.time:null})).filter(p=>p.side&&p.openPrice!==null&&p.volume!==null);
 return {live:true,source:'metaapi',symbol,asOf:now.toISOString(),account:{currency:info.currency,balance:num(info.balance),equity:num(info.equity),margin:num(info.margin),floating:open.reduce((sum,p)=>sum+(num(p.profit)??0),0),openPositions:open.length},candles:bars,positions:layers};
}
const safeErrorCode=code=>Object.hasOwn(brokerMessages,code)?code:'PROVIDER_UNAVAILABLE';
export function createBrokerApi({database=db,principal=currentUser,provider=metaApiProvider,configured=brokerConfigured,rateLimit=takeRateLimit}={}){
 return async function brokerApi(request){
  const path=new URL(request.url).pathname,mutation=request.method!=='GET';
  if(!['GET','POST','DELETE'].includes(request.method))return jsonResponse({message:'Method not allowed.'},405);
  if(mutation&&!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return jsonResponse({message:'Request origin rejected.'},403);
  let user,row,claimedVersion;
  try{
   user=await principal(request);if(!user)return jsonResponse({message:'Sign in required.'},401);
   if(!await rateLimit('broker:'+request.method,user.id,mutation?6:90,60))return jsonResponse({message:'Too many requests. Try again shortly.'},429);
   const entitled=hasFullMemberAccess(user);
   if(path==='/api/broker/servers'){
    if(request.method!=='GET')return jsonResponse({message:'Method not allowed.'},405);
    if(configured()){
     try{const servers=justMarketsServerNames(await provider().servers());if(servers.length)return jsonResponse({servers,source:'metaapi',message:'Choose the exact server assigned to your MT5 account.'});}catch{/* Fall back to clearly labeled reference suggestions; never claim connectivity. */}
    }
    return jsonResponse({servers:justMarketsServerSuggestions,source:'reference',message:'Common JustMarkets server suggestions. Confirm the exact name in MT5 or your broker account; this is not a connection check.'});
   }
   if(mutation&&!entitled)return jsonResponse({message:'Verified membership is required for broker syncing.'},403);
   if(!configured())return jsonResponse({available:false,entitled,connection:null,days:null,metrics:null,message:unavailable},mutation?503:200);
   const origin=new URL(process.env.APP_ORIGIN??'http://127.0.0.1:3000');
   if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!(origin.protocol==='https:'||(origin.protocol==='http:'&&process.env.NODE_ENV!=='production'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname))))return jsonResponse({message:'HTTPS is required for broker credentials.'},503);
   row=await database.brokerConnection.findUnique({where:{userId:user.id}});
   if(request.method==='GET'&&path==='/api/broker/connection'){
    let errorCode;
    if(row?.state==='ERROR'){
     const failure=await database.auditEvent.findFirst({where:{actorId:user.id,targetId:user.id,action:'BROKER_READ_ONLY_FAILED',details:{path:['version'],equals:row.version}},orderBy:{createdAt:'desc'},select:{details:true}});
     const details=failure?.details;if(details&&typeof details==='object'&&!Array.isArray(details)&&typeof details.code==='string')errorCode=safeErrorCode(details.code);
    }
    return jsonResponse({available:true,entitled,connection:publicConnection(row),...(errorCode?{errorCode,message:brokerMessages[errorCode]}:{})});
   }
   if(path==='/api/broker/calendar'&&request.method==='GET'){
    if(!entitled)return jsonResponse({message:'Verified membership is required.'},403);
    const month=new URL(request.url).searchParams.get('month');if(!month||!/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month))return jsonResponse({message:'Choose a valid calendar month.'},400);
    if(!row?.lastSyncedAt||!Array.isArray(row.deals))return jsonResponse({available:true,source:'metaapi',connection:publicConnection(row),days:null,metrics:null,message:'No MetaApi history has been synced. Connect in Settings, then use Sync history.'});
    const snapshot=performanceSnapshot(row.deals);
    return jsonResponse({...snapshot,days:Object.fromEntries(Object.entries(snapshot.days).filter(([date])=>date.startsWith(month))),available:true,source:'metaapi',connection:publicConnection(row),stale:row.state!=='READY'||Date.now()-new Date(row.lastSyncedAt).getTime()>15*60000});
   }
   if(path==='/api/broker/live'&&request.method==='GET'){
    if(!entitled)return jsonResponse({message:'A free trial or plan is required.'},403);
    const query=new URL(request.url).searchParams,symbol=query.get('symbol')??'XAUUSD',timeframe=liveTimeframes[query.get('tf')??'M15'];
    if(!/^[A-Za-z0-9._#+-]{1,24}$/.test(symbol)||!timeframe)return jsonResponse({message:'Choose a valid symbol and timeframe.'},400);
    if(!row?.providerAccountId)return jsonResponse({live:false,message:'Connect your MT5 account to see your live chart.'});
    // shortcut: 4 provider calls per poll and no shared cache; add a short per-account cache if MetaApi limits bite.
    return jsonResponse(liveSnapshot(await provider().live(row.providerAccountId,row,symbol,timeframe),symbol));
   }
   const data=await readBoundedJson(request.body,8192);
   if(path==='/api/broker/connection'&&request.method==='POST'){
    const parsed=connectSchema.safeParse(data);if(!parsed.success)return jsonResponse({message:'Enter broker, account, server and investor password, and confirm read-only access.'},400);
    const fields=parsed.data;
    const profile=await database.user.findUnique({where:{id:user.id},select:{brokerName:true,mt5Account:true,mt5Server:true}});
    if(profile?.mt5Account!==fields.login||profile?.mt5Server!==fields.server||profile?.brokerName?.toUpperCase()!==fields.broker.toUpperCase())return jsonResponse({message:'Save these broker details in your profile and complete membership verification first.'},409);
    if(row?.providerAccountId)return jsonResponse({message:'Disconnect the existing broker connection before replacing it.'},409);
    if(row&&row.requestKey!==fields.requestKey)return jsonResponse({message:'Reload this connection before retrying setup.'},409);
    if(row&&busy(row))return jsonResponse({connection:publicConnection(row),message:'Connection setup is already in progress.'},202);
    if(!row)row=await database.brokerConnection.create({data:{userId:user.id,broker:fields.broker,login:fields.login,server:fields.server,requestKey:fields.requestKey,leaseUntil:lease()}});
    else {const lock=await database.brokerConnection.updateMany({where:{userId:user.id,version:row.version},data:{state:'CONNECTING',version:{increment:1},leaseUntil:lease()}});if(!lock.count)return jsonResponse({message:'Connection changed. Reload it.'},409);row={...row,version:row.version+1};}
    claimedVersion=row.version;
    const remote=provider(),accountId=await remote.create({...fields,userId:user.id});
    const attached=await database.brokerConnection.updateMany({where:{userId:user.id,version:claimedVersion},data:{providerAccountId:accountId}});
    if(!attached.count)throw new BrokerUnavailable('CONNECTION_CHANGED');
    await remote.deploy(accountId);
    await database.brokerConnection.updateMany({where:{userId:user.id,version:claimedVersion},data:{leaseUntil:null}});
    await database.auditEvent.create({data:{actorId:user.id,action:'BROKER_READ_ONLY_REQUESTED',targetId:user.id}});
    return jsonResponse({available:true,connection:publicConnection(await database.brokerConnection.findUnique({where:{userId:user.id}})),message:'Connection created. Sync history to verify investor access and read results.'},202);
   }
   const parsed=versionSchema.safeParse(data);if(!parsed.success)return jsonResponse({message:'Reload the connection before continuing.'},400);
   if(!row)return jsonResponse({message:'No broker connection exists.'},404);
   if(row.version!==parsed.data.version||busy(row))return jsonResponse({message:'Connection changed or is busy. Reload it.'},409);
   if(!(path==='/api/broker/sync'&&request.method==='POST'||path==='/api/broker/connection'&&request.method==='DELETE'))return jsonResponse({message:'Not found.'},404);
   if(request.method==='DELETE'&&!row.providerAccountId)return jsonResponse({message:'Account creation has an uncertain result. Contact the owner to reconcile it in MetaApi before removing this connection.'},409);
   const lock=await database.brokerConnection.updateMany({where:{userId:user.id,version:row.version},data:{version:{increment:1},state:request.method==='DELETE'?'REMOVING':'SYNCING',leaseUntil:lease()}});
   if(!lock.count)return jsonResponse({message:'Connection changed. Reload it.'},409);claimedVersion=row.version+1;
   const remote=provider();
   if(request.method==='DELETE'){
    await remote.remove(row.providerAccountId);
    await database.brokerConnection.deleteMany({where:{userId:user.id,version:claimedVersion}});
    await database.auditEvent.create({data:{actorId:user.id,action:'BROKER_READ_ONLY_DISCONNECTED',targetId:user.id}});
    return jsonResponse({available:true,connection:null,message:'Broker connection and cached history removed.'});
   }
   if(!row.providerAccountId)throw new BrokerUnavailable('BROKER_NOT_CONNECTED');
   let info;
   try{info=await remote.read(row.providerAccountId,row);}catch(error){if(error instanceof BrokerUnavailable&&['INVESTOR_PASSWORD_REQUIRED','DEMO_ACCOUNT_REQUIRED'].includes(error.code))await remote.undeploy(row.providerAccountId).catch(()=>{});throw error;}
   const to=new Date(),localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(to),from=new Date(+new Date(localDay+'T00:00:00+08:00')-365*86400000);
   const deals=normalizeDeals(await remote.history(row.providerAccountId,from,to),from,to);
   try { const confirmed=await remote.read(row.providerAccountId,row); if(confirmed.currency!==info.currency)throw new BrokerUnavailable('ACCOUNT_MISMATCH'); }
   catch(error){if(error instanceof BrokerUnavailable&&['INVESTOR_PASSWORD_REQUIRED','DEMO_ACCOUNT_REQUIRED'].includes(error.code))await remote.undeploy(row.providerAccountId).catch(()=>{});throw error;}
   // Profile edits and membership reviews serialize on these same rows. Never
   // persist an in-flight result after access or the linked account has changed.
   const saved=await database.$transaction(async tx=>{
    await tx.user.update({where:{id:user.id},data:{profileVersion:{increment:0}}});
    await tx.membership.updateMany({where:{userId:user.id},data:{version:{increment:0}}});
    const owner=await tx.user.findUnique({where:{id:user.id},include:{membership:true}});
    if(!owner||!hasFullMemberAccess(owner)||owner.mt5Account!==row.login||owner.mt5Server!==row.server||owner.brokerName?.toUpperCase()!==row.broker.toUpperCase())throw new BrokerUnavailable('OWNERSHIP_CHANGED');
    return tx.brokerConnection.updateMany({where:{userId:user.id,version:claimedVersion,providerAccountId:row.providerAccountId},data:{state:'READY',leaseUntil:null,currency:info.currency,historyFrom:from,historyTo:to,lastSyncedAt:to,deals}});
   });
   if(!saved.count)return jsonResponse({message:'Connection changed; results were not saved.'},409);
   await database.auditEvent.create({data:{actorId:user.id,action:'BROKER_HISTORY_SYNCED',targetId:user.id,details:{deals:deals.length}}});
   return jsonResponse({available:true,connection:publicConnection(await database.brokerConnection.findUnique({where:{userId:user.id}})),message:'Broker history synced. Results are a saved snapshot, not a live feed.'});
  }catch(error){
   if(user&&claimedVersion!==undefined){
    const marked=await database.brokerConnection.updateMany({where:{userId:user.id,version:claimedVersion},data:{state:'ERROR',leaseUntil:null}}).catch(()=>null);
    if(marked?.count&&error instanceof BrokerUnavailable){const diagnostic=safeBrokerDiagnostic(error.diagnostic);await database.auditEvent.create({data:{actorId:user.id,targetId:user.id,action:'BROKER_READ_ONLY_FAILED',details:{version:claimedVersion,code:safeErrorCode(error.code),...(diagnostic?{provider:diagnostic}:{})}}}).catch(()=>{});}
   }
   if(error instanceof BrokerUnavailable){const code=safeErrorCode(error.code);return jsonResponse({errorCode:code,message:brokerMessages[code]},error.code==='OWNERSHIP_CHANGED'?403:503);}
   if(error&&typeof error==='object'&&'code' in error&&error.code==='P2002')return jsonResponse({message:'A broker connection already exists. Reload before retrying.'},409);
   if(error instanceof Error&&error.message==='BODY_TOO_LARGE')return jsonResponse({message:'Request too large.'},413);
   if(error instanceof Error&&error.message==='INVALID_JSON')return jsonResponse({message:'Request must contain valid JSON.'},400);
   return jsonResponse({message:'Broker syncing is temporarily unavailable. No new results were confirmed.'},503);
  }
 };
}
export const brokerApi=createBrokerApi();
