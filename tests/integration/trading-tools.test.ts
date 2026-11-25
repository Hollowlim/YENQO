import {afterAll,beforeAll,expect,it} from 'vitest';import {PrismaClient} from '@prisma/client';
import {digestToken,newToken} from '../../apps/web/server/security.js';
const db=new PrismaClient(),base=process.env.APP_ORIGIN??'http://127.0.0.1:3117',tag='calculator-'+Date.now();
const ids:string[]=[],cookies:string[]=[];
beforeAll(async()=>{for(let n=0;n<2;n++){const user=await db.user.create({data:{name:'Calculator test member',email:`${tag}-${n}@example.test`,passwordHash:'synthetic-no-login',membership:{create:{status:'FREE'}}}});ids.push(user.id);const token=newToken();cookies.push('yengfx_session='+token);await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});}});
afterAll(async()=>{await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
const get=(path:string,who=-1)=>fetch(base+path,{redirect:'manual',headers:who>=0?{Cookie:cookies[who]}:{}});
it('authenticates free Tools access without unlocking private education, device setup or Admin',async()=>{
 expect((await get('/app/mt5')).headers.get('location')).toBe('/auth/login');
 const page=await get('/app/mt5',0);expect(page.status).toBe(200);expect(await page.text()).toContain('Free XAUUSD calculators');
 for(const path of ['/app/academy','/app/mt5/devices'])expect((await get(path,0)).headers.get('location')).toBe('/app/membership?notice=ib-required');
 const admin=await get('/admin',0);expect(admin.status).toBe(307);expect(admin.headers.get('location')).toBe('/app/mt5?notice=admin-required');
});
it('uses real server sessions and never accepts member/account/bridge selectors',async()=>{
 expect((await get('/api/tools/mt5-snapshot')).status).toBe(401);
 const responses=await Promise.all([0,1].map(who=>get('/api/tools/mt5-snapshot',who)));
 for(const r of responses){expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');}
 const bodies=await Promise.all(responses.map(r=>r.json()));expect(bodies[0]).toEqual(bodies[1]);expect(bodies[0]).toMatchObject({status:'disconnected',snapshot:null,source:null,tradingEnabled:false,pairingAvailable:false});
 for(const selector of ['userId='+ids[1],'accountId=forged','bridgeUrl=http://127.0.0.1:8787'])expect((await get('/api/tools/mt5-snapshot?'+selector,0)).status).toBe(400);
 expect((await fetch(base+'/api/tools/mt5-snapshot',{method:'POST',headers:{Cookie:cookies[0],Origin:base,'Content-Type':'application/json'},body:JSON.stringify({userId:ids[1]})})).status).toBe(405);
 expect(JSON.stringify(bodies)).not.toContain(ids[0]);expect(JSON.stringify(bodies)).not.toContain(ids[1]);
 await db.session.updateMany({where:{userId:ids[1]},data:{expiresAt:new Date(0)}});expect((await get('/api/tools/mt5-snapshot',1)).status).toBe(401);
});
