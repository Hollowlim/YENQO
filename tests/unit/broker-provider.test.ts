import {afterEach,expect,it,vi} from 'vitest';
import {brokerConfigured,metaApiProvider,safeBrokerDiagnostic} from '../../apps/web/server/broker-provider.js';
afterEach(()=>vi.unstubAllEnvs());
const configure=()=>{vi.stubEnv('BROKER_READ_ONLY_ENABLED','true');vi.stubEnv('METAAPI_TOKEN','synthetic-provider-token');vi.stubEnv('METAAPI_REGION','new-york');vi.stubEnv('METAAPI_ALLOW_REAL_READONLY','false');};
it('is disabled until explicit server configuration and never sends credentials while disabled',async()=>{
 vi.stubEnv('BROKER_READ_ONLY_ENABLED','false');const fetcher=vi.fn();expect(brokerConfigured()).toBe(false);
 await expect(metaApiProvider(fetcher).create({login:'12345',server:'Synthetic',investorPassword:'synthetic-only',requestKey:'00000000-0000-4000-8000-000000000001',userId:'test'})).rejects.toThrow('NOT_CONFIGURED');expect(fetcher).not.toHaveBeenCalled();
});
it('looks up only MT5 JustMarkets servers at the fixed provisioning origin',async()=>{
 configure();const fetcher=vi.fn(async()=>new Response(JSON.stringify({'JustMarkets Ltd':['JustMarkets-Demo2']})));
 await metaApiProvider(fetcher).servers();const request=fetcher.mock.calls[0] as unknown as [string,RequestInit];
 expect(request[0]).toBe('https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/known-mt-servers/5/search?query=JustMarkets');expect(request[1].method).toBe('GET');
});
it('uses an idempotency header and only fixed managed-provider hosts for provisioning',async()=>{
 configure();const fetcher=vi.fn(async()=>new Response(JSON.stringify({id:'12345678-test'})));const api=metaApiProvider(fetcher);
 await api.create({login:'12345',server:'Synthetic',investorPassword:'synthetic-only',requestKey:'00000000-0000-4000-8000-000000000001',userId:'test'});
 const call=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(new URL(call[0]).hostname).toBe('mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai');expect(new Headers(call[1].headers).get('transaction-id')).toBe('00000000000040008000000000000001');expect(call[1].redirect).toBe('error');
});
it('refuses a master/trading-enabled account before reading any history',async()=>{
 configure();const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({login:'12345',server:'Synthetic',platform:'mt5',region:'new-york',connectionStatus:'CONNECTED'}))).mockResolvedValueOnce(new Response(JSON.stringify({login:12345,server:'Synthetic',platform:'mt5',tradeAllowed:true,investorMode:false,currency:'USD'})));
 await expect(metaApiProvider(fetcher).read('12345678-test',{login:'12345',server:'Synthetic'})).rejects.toThrow('INVESTOR_PASSWORD_REQUIRED');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('requires explicit investor mode even when broker trading is temporarily disabled',async()=>{
 configure();
 for(const investorMode of [undefined,false,true]){
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({login:'12345',server:'Synthetic',platform:'mt5',region:'new-york',connectionStatus:'CONNECTED'}))).mockResolvedValueOnce(new Response(JSON.stringify({login:12345,server:'Synthetic',platform:'mt5',tradeAllowed:false,investorMode,type:'ACCOUNT_TRADE_MODE_DEMO',currency:'USD'})));
  const result=metaApiProvider(fetcher).read('12345678-test',{login:'12345',server:'Synthetic'});
  if(investorMode===true)await expect(result).resolves.toEqual({currency:'USD'});else await expect(result).rejects.toThrow('INVESTOR_PASSWORD_REQUIRED');
 }
});
it('rejects wrong account identity and keeps raw provider diagnostics out of errors',async()=>{
 configure();const fetcher=vi.fn(async()=>new Response(JSON.stringify({login:'99999',server:'Other',region:'new-york'})));
 await expect(metaApiProvider(fetcher).read('12345678-test',{login:'12345',server:'Synthetic'})).rejects.toThrow('ACCOUNT_MISMATCH');
 const fail=metaApiProvider(vi.fn(async()=>new Response('synthetic-sensitive-provider-diagnostic',{status:403})));await expect(fail.deploy('12345678-test')).rejects.toThrow('PROVIDER_PERMISSION_DENIED');
});
it('rejects real, contest and unknown account modes until genuine demo validation',async()=>{
 configure();
 for(const type of ['ACCOUNT_TRADE_MODE_REAL','ACCOUNT_TRADE_MODE_CONTEST',undefined]){
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({login:'12345',server:'Synthetic',platform:'mt5',region:'new-york',connectionStatus:'CONNECTED'}))).mockResolvedValueOnce(new Response(JSON.stringify({login:12345,server:'Synthetic',platform:'mt5',tradeAllowed:false,investorMode:true,type,currency:'USD'})));
  await expect(metaApiProvider(fetcher).read('12345678-test',{login:'12345',server:'Synthetic'})).rejects.toThrow('DEMO_ACCOUNT_REQUIRED');
 }
});
it('uses the account region for investor checks and history instead of the new-account default',async()=>{
 configure();const fetcher=vi.fn(async(input:unknown)=>new Response(JSON.stringify(String(input).includes('mt-provisioning')?{login:'12345',server:'Synthetic',version:5,region:'london',state:'DEPLOYED',connectionStatus:'CONNECTED'}:String(input).endsWith('/accountInformation')?{login:12345,server:'Synthetic',platform:'mt5',tradeAllowed:false,investorMode:true,type:'ACCOUNT_TRADE_MODE_DEMO',currency:'USD'}:[])));
 const api=metaApiProvider(fetcher);await expect(api.read('12345678-test',{login:'12345',server:'Synthetic'})).resolves.toEqual({currency:'USD'});await expect(api.history('12345678-test',new Date(0),new Date(1000))).resolves.toEqual([]);
 expect(fetcher.mock.calls[1][0]).toContain('mt-client-api-v1.london.agiliumtrade.ai');expect(fetcher.mock.calls[2][0]).toContain('mt-client-api-v1.london.agiliumtrade.ai');
});
it('reports a stopped account without reading broker history or attempting deployment',async()=>{
 configure();const fetcher=vi.fn(async()=>new Response(JSON.stringify({login:'12345',server:'Synthetic',version:5,region:'london',state:'UNDEPLOYED',connectionStatus:'DISCONNECTED'})));const api=metaApiProvider(fetcher);
 await expect(api.read('12345678-test',{login:'12345',server:'Synthetic'})).rejects.toThrow('BROKER_UNDEPLOYED');await expect(api.history('12345678-test',new Date(0),new Date(1000))).rejects.toThrow('BROKER_NOT_CONNECTED');expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects untrusted regions and cannot read history before investor validation',async()=>{
 configure();const fetcher=vi.fn(async()=>new Response(JSON.stringify({login:'12345',server:'Synthetic',version:5,region:'london.attacker.example',connectionStatus:'CONNECTED'})));const api=metaApiProvider(fetcher);
 await expect(api.history('12345678-test',new Date(0),new Date(1000))).rejects.toThrow('BROKER_NOT_CONNECTED');expect(fetcher).not.toHaveBeenCalled();await expect(api.read('12345678-test',{login:'12345',server:'Synthetic'})).rejects.toThrow('REGION_UNSUPPORTED');expect(fetcher).toHaveBeenCalledTimes(1);
});
it('separates API denials from broker login errors and retains only fixed diagnostic values',async()=>{
 configure();
 for(const [status,details,expected] of [[401,undefined,'PROVIDER_TOKEN_REJECTED'],[403,undefined,'PROVIDER_PERMISSION_DENIED'],[400,'E_AUTH','BROKER_CREDENTIALS_REJECTED'],[400,{code:'E_SERVER_TIMEZONE'},'BROKER_SERVER_DETECTION_FAILED'],[429,undefined,'PROVIDER_RATE_LIMITED']] as const){
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({error:'ForbiddenError',details,message:'permission resource region synthetic-sensitive-investor-password',password:'synthetic-sensitive-investor-password',token:'synthetic-sensitive-token'}),{status}));
  const failure=await metaApiProvider(fetcher).create({login:'12345',server:'Synthetic',investorPassword:'synthetic-sensitive-investor-password',requestKey:'00000000-0000-4000-8000-000000000001',userId:'test'}).catch(error=>error);
  expect(failure.code).toBe(expected);expect(failure.diagnostic.status).toBe(status);expect(failure.diagnostic.operation).toBe('createAccount');expect(failure.diagnostic.hints).toEqual(['permission','resource','region']);expect(JSON.stringify(failure)).not.toContain('synthetic-sensitive');expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
it('bounds error bodies and rejects arbitrary diagnostic fields and values',async()=>{
 configure();let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(16385)));},cancel(){cancelled=true;}});
 const failure=await metaApiProvider(vi.fn(async()=>new Response(stream,{status:403}))).deploy('12345678-test').catch(error=>error);
 expect(cancelled).toBe(true);expect(failure.code).toBe('PROVIDER_PERMISSION_DENIED');expect(failure.diagnostic).toEqual({status:403,operation:'deployAccount',hints:[]});
 expect(safeBrokerDiagnostic({status:403,operation:'getAccount',error:'synthetic-secret',code:'synthetic-secret',message:'synthetic-secret',hints:['token','synthetic-secret']})).toEqual({status:403,operation:'getAccount',hints:['token']});
 expect(safeBrokerDiagnostic({status:403,operation:'synthetic-secret'})).toBeUndefined();
});
