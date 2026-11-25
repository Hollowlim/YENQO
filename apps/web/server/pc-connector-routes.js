import {setInterval} from 'node:timers';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db} from './db.js';import {currentUser} from './auth.js';import {digestToken,newToken,isSameOrigin} from './security.js';import {hasFullMemberAccess} from './membership-policy.js';import {jsonResponse} from './http.js';import {readBoundedJson} from './request-body.js';import {takeRateLimit} from './rate-limit.js';import {normalizeDeals,performanceSnapshot} from './broker-performance.js';
const enabled=()=>process.env.PC_CONNECTOR_ENABLED==='true';
const configuredId=()=>process.env.PC_CONNECTOR_ID??'';
const context=row=>`${row.id}:${row.generation}:${row.nonce}:${row.login}:${row.server}`;
const online=connector=>Boolean(connector?.enabled&&connector.lastSeenAt&&Date.now()-new Date(connector.lastSeenAt).getTime()<120000);
const dto=row=>row?{state:row.state,version:row.version,accountSuffix:row.login.slice(-4),server:row.server,lastSyncedAt:row.lastSyncedAt,currency:row.currency,accountType:row.accountType,errorCode:row.errorCode}:null;
const validProfile=(row,user)=>hasFullMemberAccess(user)&&row.login===user.mt5Account&&row.server===user.mt5Server;
const errors=['INVESTOR_REQUIRED','LOGIN_FAILED','HISTORY_FAILED','NEEDS_PASSWORD','DISCONNECTED','INVALID_TERMINAL','DEMO_REQUIRED','UNKNOWN'];
const versionSchema=z.object({version:z.number().int().min(1)}).strict();
const connectSchema=versionSchema.extend({nonce:z.uuid(),ciphertext:z.string().regex(/^[A-Za-z0-9+/]{683}=$/),consent:z.literal(true)}).strict();
const receiptSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),generation:z.number().int().positive(),lease:z.string().regex(/^[A-Za-z0-9_-]{43}$/),error:z.enum(errors).optional(),login:z.string().regex(/^\d{4,20}$/).optional(),server:z.string().max(100).optional(),tradeAllowed:z.literal(false).optional(),currency:z.string().regex(/^[A-Z]{3}$/).optional(),accountType:z.enum(['DEMO','REAL','CONTEST']).optional(),from:z.iso.datetime().optional(),to:z.iso.datetime().optional(),deals:z.array(z.unknown()).max(10000).optional()}).strict();
export function createPcConnectorApi({database=db,principal=currentUser,rateLimit=takeRateLimit,isEnabled=enabled,connectorId=configuredId}={}){return async request=>{
 const path=new URL(request.url).pathname,workerPath=path.startsWith('/api/pc-worker/'),mutation=request.method!=='GET';
 if(!['GET','POST','DELETE'].includes(request.method))return jsonResponse({message:'Method not allowed.'},405);
 if(!workerPath&&mutation&&!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return jsonResponse({message:'Request origin rejected.'},403);
 try{
  if(workerPath){
   if(request.method!=='POST')return jsonResponse({message:'Method not allowed.'},405);
   const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];if(!token)return jsonResponse({message:'Connector authentication required.'},401);
   if(!isEnabled())return jsonResponse({message:'Connector is disabled.'},503);
   const connector=await database.pcConnector.findUnique({where:{tokenHash:digestToken(token)}});if(!connector?.enabled||connector.id!==connectorId())return jsonResponse({message:'Connector access denied.'},403);
   if(!await rateLimit('pc-worker',connector.id,90,60))return jsonResponse({message:'Too many requests.'},429);
   if(path==='/api/pc-worker/check'){
    const parsed=receiptSchema.pick({id:true,generation:true,lease:true}).strict().safeParse(await readBoundedJson(request.body,1024));if(!parsed.success)return jsonResponse({message:'Invalid history grant.'},400);
    const grant=await database.pcBrokerAccount.findFirst({where:{id:parsed.data.id,connectorId:connector.id,generation:parsed.data.generation,leaseHash:digestToken(parsed.data.lease),leaseUntil:{gt:new Date()}},include:{user:{select:{role:true,membership:true,mt5Account:true,mt5Server:true}}}});
    if(!grant||!validProfile(grant,grant.user))return jsonResponse({message:'History grant expired or revoked.'},409);
    await database.pcConnector.update({where:{id:connector.id},data:{lastSeenAt:new Date()}});return jsonResponse({authorized:true});
   }
   if(path==='/api/pc-worker/poll'){
    const body=await readBoundedJson(request.body,1024);if(!z.object({}).strict().safeParse(body).success)return jsonResponse({message:'Invalid poll.'},400);
    await database.pcConnector.update({where:{id:connector.id},data:{lastSeenAt:new Date()}});
    await expireSecrets(database);
    const rows=await database.pcBrokerAccount.findMany({where:{connectorId:connector.id,state:{not:'REVOKED'}},select:{id:true,userId:true,login:true,server:true,state:true,generation:true,version:true,nonce:true,sealedPassword:true,secretExpiresAt:true,leaseUntil:true,nextSyncAt:true,user:{select:{role:true,membership:true,mt5Account:true,mt5Server:true}}},orderBy:{updatedAt:'asc'},take:20});
    const grants=[],jobs=[];
    for(const row of rows){
     if(!validProfile(row,row.user)){
      await database.pcBrokerAccount.updateMany({where:{id:row.id,generation:row.generation},data:{state:'REVOKED',generation:{increment:1},version:{increment:1},sealedPassword:null,secretExpiresAt:null,leaseHash:null,leaseUntil:null}});continue;
     }
     grants.push({id:row.id,generation:row.generation});
     if(!['QUEUED','ACTIVE','ERROR'].includes(row.state)||row.nextSyncAt&&new Date(row.nextSyncAt)>new Date()||row.leaseUntil&&new Date(row.leaseUntil)>new Date())continue;
     const lease=newToken(),claimed=await database.pcBrokerAccount.updateMany({where:{id:row.id,generation:row.generation,version:row.version},data:{state:'CONNECTING',leaseHash:digestToken(lease),leaseUntil:new Date(Date.now()+600000),sealedPassword:null,version:{increment:1}}});
     if(claimed.count)jobs.push({id:row.id,generation:row.generation,login:row.login,server:row.server,context:context(row),ciphertext:row.sealedPassword,secretExpiresAt:row.secretExpiresAt,lease,from:new Date(+new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00+08:00')-365*86400000).toISOString(),to:new Date().toISOString(),allowReal:process.env.PC_CONNECTOR_ALLOW_REAL_READONLY==='true'});
    }
    return jsonResponse({grants,jobs,pollAfterSeconds:30});
   }
   if(path!=='/api/pc-worker/receipt')return jsonResponse({message:'Not found.'},404);
   const parsed=receiptSchema.safeParse(await readBoundedJson(request.body,4*1024*1024));if(!parsed.success)return jsonResponse({message:'Invalid history receipt.'},400);const data=parsed.data;
   const row=await database.pcBrokerAccount.findFirst({where:{id:data.id,connectorId:connector.id,generation:data.generation,leaseHash:digestToken(data.lease),leaseUntil:{gt:new Date()}},include:{user:{select:{role:true,membership:true,mt5Account:true,mt5Server:true}}}});
   if(!row||!validProfile(row,row.user))return jsonResponse({message:'History grant expired or revoked.'},409);
   if(data.error){await database.pcBrokerAccount.updateMany({where:{id:row.id,generation:data.generation,leaseHash:digestToken(data.lease)},data:{state:['INVESTOR_REQUIRED','LOGIN_FAILED','NEEDS_PASSWORD','DEMO_REQUIRED','INVALID_TERMINAL'].includes(data.error)?'NEEDS_PASSWORD':'ERROR',errorCode:data.error,leaseHash:null,leaseUntil:null,secretExpiresAt:null,nextSyncAt:new Date(Date.now()+60000),version:{increment:1}}});return jsonResponse({accepted:true});}
   if(data.login!==row.login||data.server!==row.server||data.tradeAllowed!==false||!data.currency||!data.from||!data.to||!data.deals||!data.accountType||data.accountType!=='DEMO'&&process.env.PC_CONNECTOR_ALLOW_REAL_READONLY!=='true')return jsonResponse({message:'Read-only account identity was not confirmed.'},400);
   const from=new Date(data.from),to=new Date(data.to);if(from>=to||to>new Date(Date.now()+60000)||+to-+from>367*86400000)return jsonResponse({message:'Invalid history window.'},400);
   const deals=normalizeDeals(data.deals,from,to);
   await database.$transaction(async tx=>{
    const current=await tx.pcBrokerAccount.findFirst({where:{id:row.id,connectorId:connector.id,generation:data.generation,leaseHash:digestToken(data.lease),leaseUntil:{gt:new Date()}},include:{user:{select:{role:true,membership:true,mt5Account:true,mt5Server:true}}}});
    if(!current||!validProfile(current,current.user))throw new Error('STALE_GRANT');
    const canonical=values=>JSON.stringify(values.map(item=>[item.id,item.time,item.positionId,item.entryType,item.symbol,item.volume,item.net]));
    const changedHistory=!Array.isArray(current.deals)||canonical(current.deals)!==canonical(deals)||current.currency!==data.currency;
    const saved=await tx.pcBrokerAccount.updateMany({where:{id:row.id,generation:data.generation,leaseHash:digestToken(data.lease)},data:{state:'ACTIVE',errorCode:null,currency:data.currency,accountType:data.accountType,...(changedHistory?{deals}:{}),lastSyncedAt:to,historyFrom:from,historyTo:to,leaseHash:null,leaseUntil:null,secretExpiresAt:null,nextSyncAt:new Date(Date.now()+60000),version:{increment:1}}});if(!saved.count)throw new Error('STALE_GRANT');
    if(changedHistory||!current.lastSyncedAt||current.errorCode)await tx.auditEvent.create({data:{actorId:row.userId,targetId:row.userId,action:'PC_READ_ONLY_HISTORY_SYNCED',details:{executions:deals.length,accountType:data.accountType}}});
   });return jsonResponse({accepted:true});
  }
  const user=await principal(request);if(!user)return jsonResponse({message:'Sign in required.'},401);
  if(!await rateLimit('pc-client:'+request.method,user.id,mutation?10:90,60))return jsonResponse({message:'Too many requests. Try again shortly.'},429);
  const entitled=hasFullMemberAccess(user);
  if(!isEnabled())return jsonResponse({available:false,entitled,online:false,connection:null,message:'The Windows history connector needs owner setup.'},mutation?503:200);
  const connector=await database.pcConnector.findUnique({where:{id:connectorId()}}),isOnline=online(connector);
  await expireSecrets(database);
  if(request.method==='GET'&&path==='/api/pc-broker/connection'){
   const metadata=await database.pcBrokerAccount.findUnique({where:{userId:user.id},select:{state:true,version:true,login:true,server:true,lastSyncedAt:true,currency:true,accountType:true,errorCode:true}});
   return jsonResponse({available:Boolean(connector?.enabled),online:isOnline,entitled,connection:dto(metadata),message:!isOnline?'The Windows connector is offline. Keep the owner PC and connector running.':!entitled?'Complete membership verification before connecting your own account.':metadata?.errorCode?clientError(metadata.errorCode):['QUEUED','CONNECTING'].includes(metadata?.state??'')?'Waiting for the Windows connector and MT5. Broker access has not been confirmed yet.':metadata?.state==='ACTIVE'?'Read-only history is syncing while the owner PC stays online. View the saved snapshot in your P/L Calendar.':'Connect your own MT5 account using its investor password. The Windows connector reads history only.'});
  }
  const row=await database.pcBrokerAccount.findUnique({where:{userId:user.id}});
  if(!entitled)return jsonResponse({message:'Verified membership is required.'},403);
  const profile=await database.user.findUnique({where:{id:user.id},select:{mt5Account:true,mt5Server:true}});
  if(request.method==='GET'&&path==='/api/pc-broker/calendar'){
   const month=new URL(request.url).searchParams.get('month');if(!month||!/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month))return jsonResponse({message:'Choose a valid month.'},400);
   if(!row?.lastSyncedAt||!Array.isArray(row.deals)||row.login!==profile?.mt5Account||row.server!==profile?.mt5Server||row.state==='REVOKED')return jsonResponse({available:true,online:isOnline,connection:null,days:null,metrics:null,message:'No connector history available. Connect your own MT5 account in Settings.'});
   const data=performanceSnapshot(row.deals),stale=!isOnline||row.state!=='ACTIVE'||Date.now()-new Date(row.lastSyncedAt).getTime()>180000;
   return jsonResponse({...data,available:true,online:isOnline,source:'pc-connector',stale,connection:{...dto(row),historyFrom:row.historyFrom,historyTo:row.historyTo,canSync:false},days:Object.fromEntries(Object.entries(data.days).filter(([date])=>date.startsWith(month))),basis:`${row.accountType} MT5 history via owner-hosted Windows connector. Saved snapshot, not live prices. ${data.basis}`,message:stale?'Saved MT5 history may be stale. Check the Windows connector and account status.':'Automatically refreshed MT5 history snapshot from the Windows connector.'});
  }
  if(request.method==='DELETE'&&path==='/api/pc-broker/connection'){
   const parsed=versionSchema.safeParse(await readBoundedJson(request.body,1024));if(!parsed.success||!row||row.version!==parsed.data.version)return jsonResponse({message:'Connection changed. Reload it.'},409);
   await database.$transaction(async tx=>{const changed=await tx.pcBrokerAccount.updateMany({where:{userId:user.id,version:parsed.data.version},data:{state:'REVOKED',generation:{increment:1},version:{increment:1},sealedPassword:null,secretExpiresAt:null,leaseHash:null,leaseUntil:null,deals:[],lastSyncedAt:null}});if(!changed.count)throw new Error('STALE_GRANT');await tx.auditEvent.create({data:{actorId:user.id,targetId:user.id,action:'PC_READ_ONLY_DISCONNECTED'}});});return jsonResponse({message:'Read-only connection revoked. The worker drops its credential when it next polls.'});
  }
  if(!isOnline||!connector)return jsonResponse({message:'Start the Windows connector before entering a password.'},503);
  const origin=new URL(process.env.APP_ORIGIN??'http://127.0.0.1:3000');if(origin.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))return jsonResponse({message:'HTTPS is required for broker credential delivery.'},503);
  if(!profile?.mt5Account||!profile.mt5Server)return jsonResponse({message:'Save your MT5 account and exact server in your profile first.'},409);
  const activeConnectorId=connector.id,ownerLogin=profile.mt5Account,ownerServer=profile.mt5Server;
  if(request.method==='POST'&&path==='/api/pc-broker/prepare'){
   if(!z.object({}).strict().safeParse(await readBoundedJson(request.body,1024)).success)return jsonResponse({message:'Invalid connection request.'},400);
   const prepared=await database.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261101, 4)::text`;
    const existing=await tx.pcBrokerAccount.findUnique({where:{userId:user.id}}),count=await tx.pcBrokerAccount.count({where:{connectorId:activeConnectorId,state:{not:'REVOKED'}}});
    if((!existing||existing.state==='REVOKED'||existing.connectorId!==activeConnectorId)&&count>=5)throw new Error('CONNECTOR_CAPACITY');
    const same=existing?.login===profile.mt5Account&&existing?.server===profile.mt5Server;
    const data={connectorId:activeConnectorId,login:ownerLogin,server:ownerServer,state:'AWAITING_PASSWORD',nonce:randomUUID(),secretExpiresAt:new Date(Date.now()+120000),sealedPassword:null,leaseHash:null,leaseUntil:null,errorCode:null,...(!same?{deals:[],lastSyncedAt:null,currency:null,accountType:null,historyFrom:null,historyTo:null}:{})};
    return existing?tx.pcBrokerAccount.update({where:{userId:user.id},data:{...data,generation:{increment:1},version:{increment:1}}}):tx.pcBrokerAccount.create({data:{userId:user.id,...data}});
   });return jsonResponse({version:prepared.version,nonce:prepared.nonce,context:context(prepared),publicKey:connector.publicKey,message:'Encrypt the investor password for the Windows connector.'});
  }
  if(request.method==='POST'&&path==='/api/pc-broker/connect'){
   const parsed=connectSchema.safeParse(await readBoundedJson(request.body,4096));if(!parsed.success)return jsonResponse({message:'Use encrypted investor-password delivery and confirm read-only consent.'},400);const data=parsed.data;
   if(!row||row.login!==profile.mt5Account||row.server!==profile.mt5Server||row.state!=='AWAITING_PASSWORD'||row.version!==data.version||row.nonce!==data.nonce||!row.secretExpiresAt||row.secretExpiresAt<new Date())return jsonResponse({message:'Connection request expired or changed. Try again.'},409);
   const saved=await database.pcBrokerAccount.updateMany({where:{userId:user.id,version:data.version,state:'AWAITING_PASSWORD'},data:{state:'QUEUED',sealedPassword:data.ciphertext,secretExpiresAt:new Date(Date.now()+120000),nextSyncAt:null,version:{increment:1}}});if(!saved.count)return jsonResponse({message:'Connection changed. Reload it.'},409);
   await database.auditEvent.create({data:{actorId:user.id,targetId:user.id,action:'PC_READ_ONLY_CONNECTION_REQUESTED'}});return jsonResponse({message:'Encrypted credentials queued for your Windows connector. Waiting for broker verification.'},202);
  }
  return jsonResponse({message:'Not found.'},404);
 }catch(error){
  if(error instanceof Error&&error.message==='CONNECTOR_CAPACITY')return jsonResponse({message:'This beta connector supports five accounts. Disconnect an unused account first.'},409);
  if(error instanceof Error&&error.message==='STALE_GRANT')return jsonResponse({message:'Account grant changed or expired.'},409);
  if(error instanceof Error&&error.message==='BODY_TOO_LARGE')return jsonResponse({message:'Request too large.'},413);
  if(error instanceof Error&&error.message==='INVALID_JSON')return jsonResponse({message:'Invalid JSON.'},400);
  return jsonResponse({message:'The Windows connector could not confirm this request. No new broker results were accepted.'},503);
 }
};}
function clientError(code){return ({INVESTOR_REQUIRED:'Read-only access was not confirmed. Reconnect using the investor password.',LOGIN_FAILED:'MT5 login failed. Check account, server and investor password.',NEEDS_PASSWORD:'The connector restarted or the encrypted delivery expired. Enter the investor password again.',DEMO_REQUIRED:'Beta testing currently requires an MT5 demo account.',INVALID_TERMINAL:'The isolated MT5 terminal could not start. Ask the owner to check the connector.'})[code]??'The connector could not refresh history. Previously saved data may be stale.';}
export async function expireSecrets(database=db){await database.pcBrokerAccount.updateMany({where:{state:{in:['AWAITING_PASSWORD','QUEUED','CONNECTING']},OR:[{secretExpiresAt:{lt:new Date()},leaseHash:null},{leaseUntil:{lt:new Date()},state:'CONNECTING'}]},data:{sealedPassword:null,secretExpiresAt:null,leaseHash:null,leaseUntil:null,state:'NEEDS_PASSWORD',errorCode:'NEEDS_PASSWORD',version:{increment:1}}});}
export function startPcSecretSweeper(){const timer=setInterval(()=>{if(enabled())void expireSecrets().catch(()=>{});},60000);timer.unref();}
export const pcConnectorApi=createPcConnectorApi();
