import {afterAll,beforeAll,expect,it,vi} from 'vitest';import {PrismaClient} from '@prisma/client';
import {createBrokerApi} from '../../apps/web/server/broker-routes.js';import {BrokerUnavailable} from '../../apps/web/server/broker-provider.js';import {digestToken,newToken} from '../../apps/web/server/security.js';
const db=new PrismaClient(),base=process.env.APP_ORIGIN??'http://127.0.0.1:3117',prefix='broker-'+Date.now();
const ids:Record<string,string>={},cookies:Record<string,string>={};
const provider={servers:vi.fn(async()=>({'JustMarkets Ltd':['JustMarkets-Live2']})),create:vi.fn(async()=> 'synthetic-provider-account'),deploy:vi.fn(async()=>null),remove:vi.fn(async()=>null),undeploy:vi.fn(async()=>null),read:vi.fn(async()=>({currency:'USD',balance:0,equity:0,margin:0})),live:vi.fn(),history:vi.fn(async()=>[{id:'one',time:new Date(Date.now()-60000).toISOString(),type:'DEAL_TYPE_BUY',entryType:'DEAL_ENTRY_IN',volume:1,profit:0,commission:-1,positionId:'position-one'},{id:'two',time:new Date(Date.now()-30000).toISOString(),type:'DEAL_TYPE_SELL',entryType:'DEAL_ENTRY_OUT',volume:1,profit:11,commission:-1,positionId:'position-one'}])};
const api=createBrokerApi({database:db,configured:()=>true,provider:()=>provider,rateLimit:async()=>true});
const request=(path:string,method='GET',data:unknown=undefined,who='member',origin=base)=>new Request(base+path,{method,headers:{Cookie:cookies[who]??'',Origin:origin,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
const fields={broker:'SYNTHETIC',login:'123456',server:'Synthetic-Test',investorPassword:'synthetic-investor-only',requestKey:crypto.randomUUID(),consent:true};
beforeAll(async()=>{
 const admin=await db.user.create({data:{email:prefix+'-admin@example.test',name:'Synthetic reviewer',role:'ADMIN',passwordHash:'no-password-login'}});ids.admin=admin.id;
 const adminToken=newToken();await db.session.create({data:{userId:admin.id,tokenHash:digestToken(adminToken),expiresAt:new Date(Date.now()+600000)}});cookies.admin='yengfx_session='+adminToken;
 for(const who of ['member','other','free']){
  const user=await db.user.create({data:{email:`${prefix}-${who}@example.test`,name:'Synthetic broker member',passwordHash:'no-password-login',brokerName:fields.broker,mt5Account:fields.login,mt5Server:fields.server,membership:{create:who==='free'?{status:'FREE'}:{status:'APPROVED',plan:'LIFETIME',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:admin.id,verifiedAt:new Date()}}}});ids[who]=user.id;
  const token=newToken();await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});cookies[who]='yengfx_session='+token;
 }
});
afterAll(async()=>{await db.auditEvent.deleteMany({where:{actorId:{in:Object.values(ids)}}});await db.user.deleteMany({where:{email:{startsWith:prefix}}});await db.$disconnect();});
it('never saves an in-flight MetaApi history result after membership revocation',async()=>{
 await db.brokerConnection.create({data:{userId:ids.other,broker:fields.broker,login:fields.login,server:fields.server,requestKey:crypto.randomUUID(),providerAccountId:'synthetic-race-account'}});
 provider.history.mockImplementationOnce(async()=>{await db.membership.update({where:{userId:ids.other},data:{status:'REVOKED',plan:'FREE',version:{increment:1}}});return [];});
 const result=await api(request('/api/broker/sync','POST',{version:0},'other'));expect(result.status).toBe(403);
 const row=await db.brokerConnection.findUniqueOrThrow({where:{userId:ids.other}});expect(row.lastSyncedAt).toBeNull();expect(row.deals).toBeNull();
 await db.brokerConnection.delete({where:{userId:ids.other}});await db.membership.update({where:{userId:ids.other},data:{status:'APPROVED',plan:'LIFETIME'}});
});
it('authenticates MT5 server lookup, labels the configured provider and falls back honestly',async()=>{
 expect((await api(request('/api/broker/servers','GET',undefined,'guest'))).status).toBe(401);
 const lookup=await (await api(request('/api/broker/servers','GET',undefined,'free'))).json();expect(lookup.source).toBe('metaapi');expect(lookup.servers).toEqual(['JustMarkets-Live2']);
 provider.servers.mockRejectedValueOnce(new Error('synthetic-provider-diagnostic'));
 const fallback=await (await api(request('/api/broker/servers'))).json();expect(fallback.source).toBe('reference');expect(fallback.servers).toHaveLength(4);expect(JSON.stringify(fallback)).not.toContain('synthetic-provider-diagnostic');
 const disabled=createBrokerApi({configured:()=>false});const reference=await (await disabled(request('/api/broker/servers','GET',undefined,'free'))).json();expect(reference.source).toBe('reference');expect(reference.message).toContain('not a connection check');
 expect((await api(request('/api/broker/servers','POST',{}))).status).toBe(405);
});
it('requires authentication, verified access and same-origin mutations',async()=>{
 expect((await api(request('/api/broker/connection','GET',undefined,'guest'))).status).toBe(401);
 expect((await api(request('/api/broker/connection','POST',fields,'free'))).status).toBe(403);
 expect((await api(request('/api/broker/connection','POST',fields,'member','https://evil.example'))).status).toBe(403);
 expect(provider.create).not.toHaveBeenCalled();
});
it('enforces rate limits before any provider provisioning',async()=>{
 const limited=createBrokerApi({database:db,configured:()=>true,provider:()=>provider,rateLimit:async()=>false});
 expect((await limited(request('/api/broker/connection','POST',fields))).status).toBe(429);expect(provider.create).not.toHaveBeenCalled();
});
it('rejects forged ownership and does not store the investor password',async()=>{
 expect((await api(request('/api/broker/connection','POST',{...fields,userId:ids.other}))).status).toBe(400);
 const created=await api(request('/api/broker/connection','POST',fields));expect(created.status).toBe(202);
 const body=await created.json();expect(body.connection.providerAccountId).toBeUndefined();expect(JSON.stringify(body)).not.toContain(fields.investorPassword);
 expect(JSON.stringify(await db.brokerConnection.findUnique({where:{userId:ids.member}}))).not.toContain(fields.investorPassword);
 expect((await db.brokerConnection.findUnique({where:{userId:ids.other}}))).toBeNull();
 const own=await api(request('/api/broker/connection?userId='+ids.member,'GET',undefined,'other'));expect((await own.json()).connection).toBeNull();
 expect((await api(request('/api/broker/connection','POST',fields))).status).toBe(409);expect(provider.create).toHaveBeenCalledTimes(1);
});
it('syncs only the principal account, idempotently replaces a bounded history snapshot and rejects stale versions',async()=>{
 expect((await api(request('/api/broker/sync','POST',{version:0},'other'))).status).toBe(404);
 const synced=await api(request('/api/broker/sync','POST',{version:0}));expect(synced.status).toBe(200);
 const row=await db.brokerConnection.findUniqueOrThrow({where:{userId:ids.member}});expect(row.state).toBe('READY');expect(row.currency).toBe('USD');expect(row.deals).toHaveLength(2);
 expect((await api(request('/api/broker/sync','POST',{version:0}))).status).toBe(409);
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit'}).format(new Date());const data=await (await api(request('/api/broker/calendar?month='+month))).json();expect(data.metrics.weekly).toBe('9.00000000');expect(JSON.stringify(data)).not.toContain('synthetic-provider-account');
 const other=await (await api(request('/api/broker/calendar?month='+month+'&userId='+ids.member,'GET',undefined,'other'))).json();expect(other.metrics).toBeNull();
});
it('blocks revoked history access and never grants admins another member connection',async()=>{
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit'}).format(new Date());
 const admin=await (await api(request('/api/broker/connection?userId='+ids.member,'GET',undefined,'admin'))).json();expect(admin.connection).toBeNull();
 await db.membership.update({where:{userId:ids.member},data:{status:'REVOKED',plan:'FREE'}});
 try{
  expect((await api(request('/api/broker/calendar?month='+month))).status).toBe(403);
  expect((await api(request('/api/broker/sync','POST',{version:1}))).status).toBe(403);
 }finally{await db.membership.update({where:{userId:ids.member},data:{status:'APPROVED',plan:'LIFETIME'}});}
});
it('keeps the last successful snapshot when the provider fails and disconnects without touching another member',async()=>{
 provider.read.mockRejectedValueOnce(new BrokerUnavailable('INVESTOR_PASSWORD_REQUIRED'));
 expect((await api(request('/api/broker/sync','POST',{version:1}))).status).toBe(503);expect(provider.undeploy).toHaveBeenCalledTimes(1);
 const row=await db.brokerConnection.findUniqueOrThrow({where:{userId:ids.member}});expect(row.deals).toHaveLength(2);expect(row.state).toBe('ERROR');
 expect((await api(request('/api/broker/connection','DELETE',{version:row.version}))).status).toBe(200);expect(await db.brokerConnection.findUnique({where:{userId:ids.member}})).toBeNull();
 expect(provider.remove).toHaveBeenCalledTimes(1);
});
it('returns a setup-required state without querying uninstalled tables when the provider is disabled',async()=>{
 const disabled=createBrokerApi({configured:()=>false});const response=await disabled(request('/api/broker/connection'));
 expect(response.status).toBe(200);expect((await response.json()).available).toBe(false);
 const live=await fetch(base+'/api/broker/connection',{headers:{Cookie:cookies.member}});expect(live.status).toBe(200);expect((await live.json()).available).toBe(false);
});
it('persists actionable stopped-account errors only for the owner and never retries deployment',async()=>{
 await db.brokerConnection.create({data:{userId:ids.member,broker:fields.broker,login:fields.login,server:fields.server,requestKey:crypto.randomUUID(),providerAccountId:'synthetic-stopped-account'}});
 const deploys=provider.deploy.mock.calls.length,reads=provider.history.mock.calls.length;
 provider.read.mockRejectedValueOnce(new BrokerUnavailable('BROKER_UNDEPLOYED'));
 const result=await api(request('/api/broker/sync','POST',{version:0}));expect(result.status).toBe(503);expect((await result.json()).message).toContain('start/deploy');
 const own=await (await api(request('/api/broker/connection'))).json();expect(own.errorCode).toBe('BROKER_UNDEPLOYED');expect(own.message).toContain('account is stopped');
 const other=await (await api(request('/api/broker/connection','GET',undefined,'other'))).json();expect(other.errorCode).toBeUndefined();expect(other.message).toBeUndefined();
 expect(provider.deploy).toHaveBeenCalledTimes(deploys);expect(provider.history).toHaveBeenCalledTimes(reads);
 const event=await db.auditEvent.findFirstOrThrow({where:{actorId:ids.member,action:'BROKER_READ_ONLY_FAILED'}});expect(JSON.stringify(event.details)).not.toContain(fields.investorPassword);
});
it('audits bounded provider diagnostics without returning them or exposing them to another member',async()=>{
 const row=await db.brokerConnection.findUniqueOrThrow({where:{userId:ids.member}});
 const failure=new BrokerUnavailable('PROVIDER_PERMISSION_DENIED',{status:403,operation:'accountInformation',error:'ForbiddenError',hints:['permission','synthetic-secret']});
 Object.assign(failure.diagnostic??{},{message:fields.investorPassword,token:'synthetic-secret'});
 provider.read.mockRejectedValueOnce(failure);
 const response=await api(request('/api/broker/sync','POST',{version:row.version}));const result=await response.json();expect(response.status).toBe(503);expect(result.errorCode).toBe('PROVIDER_PERMISSION_DENIED');expect(result.provider).toBeUndefined();
 const event=await db.auditEvent.findFirstOrThrow({where:{actorId:ids.member,action:'BROKER_READ_ONLY_FAILED'},orderBy:{createdAt:'desc'}});expect(event.details).toEqual({version:row.version+1,code:'PROVIDER_PERMISSION_DENIED',provider:{status:403,operation:'accountInformation',error:'ForbiddenError',hints:['permission']}});
 const own=await(await api(request('/api/broker/connection'))).json();expect(own.errorCode).toBe('PROVIDER_PERMISSION_DENIED');expect(own.provider).toBeUndefined();
 const other=await(await api(request('/api/broker/connection','GET',undefined,'other'))).json();expect(other.errorCode).toBeUndefined();expect(JSON.stringify([result,own,other,event.details])).not.toContain(fields.investorPassword);expect(JSON.stringify(event.details)).not.toContain('synthetic-secret');
});
