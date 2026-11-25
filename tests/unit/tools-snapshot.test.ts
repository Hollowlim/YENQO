import {expect,it,vi} from 'vitest';
import {createToolsSnapshotApi} from '../../apps/web/server/tools-snapshot-routes.js';
const request=(suffix='',method='GET')=>new Request('http://127.0.0.1:3000/api/tools/mt5-snapshot'+suffix,{method});
const member={id:'member-a',role:'MEMBER' as const,email:'synthetic@example.test',name:'Synthetic member',profilePhoto:null,membership:null,mentorApprovedAt:null};
it('uses the authenticated principal and exposes no account data while pairing is unavailable',async()=>{
 const rateLimit=vi.fn(async()=>true),principal=vi.fn(async()=>member),api=createToolsSnapshotApi({principal,rateLimit});
 const r=await api(request());expect(r.status).toBe(200);expect(r.headers.get('Cache-Control')).toBe('no-store');
 expect(await r.json()).toMatchObject({status:'disconnected',snapshot:null,source:null,asOf:null,tradingEnabled:false,pairingAvailable:false});expect(rateLimit).toHaveBeenCalledWith('tools-snapshot','member-a',30,60);
 expect((await api(request('?userId=member-b&bridge=http://127.0.0.1:8787'))).status).toBe(400);
 expect((await api(request('','POST'))).status).toBe(405);
});
it('fails closed for absent/failed sessions and rate limits without querying a provider',async()=>{
 expect((await createToolsSnapshotApi({principal:async()=>null})(request('?userId=forged'))).status).toBe(401);
 expect((await createToolsSnapshotApi({principal:async()=>{throw Error('synthetic-private-error');}})(request())).status).toBe(503);
 const api=createToolsSnapshotApi({principal:async()=>member,rateLimit:async()=>false});expect((await api(request())).status).toBe(429);
});
