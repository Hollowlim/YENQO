import {beforeAll,afterAll,expect,it} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {digestToken,newToken} from '../../apps/web/server/security.js';
const db=new PrismaClient(),base=process.env.APP_ORIGIN!,prefix=`session-home-${Date.now()}`;
const identities:{id:string;cookie:string;token:string;destination:string}[]=[];
let expiredCookie='';
beforeAll(async()=>{
 const admin=await db.user.create({data:{email:prefix+'-admin@example.test',name:'Session admin fixture',role:'ADMIN',passwordHash:'no-password-fixture'}});
 for(const kind of ['admin','free','approved']){
  const user=kind==='admin'?admin:await db.user.create({data:{email:`${prefix}-${kind}@example.test`,name:'Session member fixture',passwordHash:'no-password-fixture',membership:{create:kind==='approved'?{status:'APPROVED',plan:'LIFETIME',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:admin.id,verifiedAt:new Date()}:{status:'FREE'}}}});
  const token=newToken();await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});
  identities.push({id:user.id,token,cookie:`yengfx_session=${token}`,destination:kind==='admin'?'/admin':'/app/mt5'});
 }
 const expired=newToken();await db.session.create({data:{userId:admin.id,tokenHash:digestToken(expired),expiresAt:new Date(Date.now()-60000)}});expiredCookie=`yengfx_session=${expired}`;
});
afterAll(async()=>{await db.auditEvent.deleteMany({where:{actorId:{in:identities.map(user=>user.id)}}});await db.user.deleteMany({where:{email:{startsWith:prefix}}});await db.$disconnect();});
const get=(path:string,cookie='')=>fetch(base+path,{headers:{Cookie:cookie},redirect:'manual'});
it('keeps the same session when visiting the homepage and personalizes only portal entry links',async()=>{
 for(const user of identities){
  const before=await db.session.findUniqueOrThrow({where:{tokenHash:digestToken(user.token)}});
  const home=await get('/',user.cookie);expect(home.status).toBe(200);expect(home.headers.get('set-cookie')).toBeNull();expect(home.headers.get('cache-control')).toBe('no-store');const html=await home.text();expect(html).not.toMatch(/href="\/auth\/(?:login|register)"/);expect(html).toContain(`class="v7-login" href="${user.destination}"`);
  const after=await db.session.findUniqueOrThrow({where:{tokenHash:digestToken(user.token)}});expect(after.expiresAt).toEqual(before.expiresAt);expect(after.id).toBe(before.id);
  expect((await get(user.destination,user.cookie)).status).toBe(200);
 }
});
it('redirects active sessions away from login and signup without bypassing membership or admin permissions',async()=>{
 for(const user of identities)for(const path of ['/auth/login','/auth/register']){const response=await get(path,user.cookie);expect(response.status).toBe(307);expect(response.headers.get('location')).toBe(user.destination);expect(response.headers.get('set-cookie')).toBeNull();}
 const free=identities[1];
 const forged=await get('/?userId='+identities[0].id,free.cookie);expect(await forged.text()).not.toContain('Admin portal');expect((await get('/admin',free.cookie)).headers.get('location')).toContain('/app/mt5');
});
it('keeps guest and expired-session pages public without extending expired sessions or redirecting password recovery',async()=>{
 for(const cookie of ['',expiredCookie,`yengfx_session=${newToken()}`]){
  const home=await get('/',cookie);expect(home.status).toBe(200);expect(await home.text()).toContain('href="/auth/login"');expect((await get('/auth/login',cookie)).status).toBe(200);expect((await get('/auth/register',cookie)).status).toBe(200);
 }
 expect((await get('/auth/forgot-password',identities[0].cookie)).status).toBe(200);expect((await get('/auth/reset-password',identities[0].cookie)).status).toBe(200);
});
it('only an authorized explicit sign-out revokes the session; subsequent homepage and portal requests are guests',async()=>{
 for(const user of identities){
  const denied=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:'https://other.example.test',Cookie:user.cookie,'Content-Type':'application/json'},body:'{}'});expect(denied.status).toBe(403);expect((await get('/auth/login',user.cookie)).status).toBe(307);
  const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:user.cookie,'Content-Type':'application/json'},body:'{}'});expect(logout.status).toBe(200);expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');expect(await db.session.findUnique({where:{tokenHash:digestToken(user.token)}})).toBeNull();
  expect(await (await get('/',user.cookie)).text()).toContain('href="/auth/login"');expect((await get('/app',user.cookie)).headers.get('location')).toBe('/auth/login');
 }
});
