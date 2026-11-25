import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {membershipApi} from '../../apps/web/server/membership-routes.js';
import {digestToken,newToken} from '../../apps/web/server/security.js';
const db=new PrismaClient(),prefix=`review-mail-${Date.now()}`;
const ids:string[]=[];
let adminCookie='',memberCookie='',memberId='',membershipId='';
const base=process.env.APP_ORIGIN!;
const review=(body:unknown,cookie=adminCookie)=>membershipApi(new Request(`${base}/api/admin/memberships/${membershipId}/review`,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)}));
beforeAll(async()=>{
 vi.stubEnv('DEV_EMAIL_OUTBOX','false');vi.stubEnv('RESEND_API_KEY','test-key-never-sent');vi.stubEnv('RESEND_FROM','YENGFX <account@example.test>');vi.stubEnv('MEMBERSHIP_EMAIL_ENABLED','true');
 for(const role of ['ADMIN','MEMBER'] as const){
  const user=await db.user.create({data:{email:`${prefix}-${role}@example.test`,name:'Synthetic mail member',role,passwordHash:'no-login-fixture',...(role==='MEMBER'?{brokerName:'JUSTMARKET',mt5Account:'00123456',membership:{create:{status:'FREE'}}}:{})}});ids.push(user.id);
  const token=newToken();await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});
  if(role==='ADMIN')adminCookie=`yengfx_session=${token}`;else{memberId=user.id;memberCookie=`yengfx_session=${token}`;membershipId=(await db.membership.findUniqueOrThrow({where:{userId:memberId}})).id;}
 }
});
afterAll(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:ids}},{targetId:{in:ids}}]}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
it('queues only committed authorized approval, ignores forged recipients, and avoids duplicate reviews',async()=>{
 const send=vi.fn(async()=>{
  expect((await db.membership.findUniqueOrThrow({where:{id:membershipId}})).status).toBe('APPROVED');
  return new Response(JSON.stringify({id:'synthetic-provider-acceptance'}));
 });vi.stubGlobal('fetch',send);
 const body={action:'approve',version:0,profileVersion:0,verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositAmount:'100',verifiedAccountSuffix:'3456',confirmed:true,email:'forged@example.test'};
 expect((await review(body,memberCookie)).status).toBe(403);expect(send).not.toHaveBeenCalled();
 const response=await review(body);expect(response.status).toBe(200);expect((await response.json()).message).toContain('notification queued');
 await vi.waitFor(async()=>expect(await db.auditEvent.count({where:{targetId:memberId,action:'MEMBERSHIP_EMAIL_ACCEPTED'}})).toBe(1));
 const request=(send.mock.calls as unknown as [string,RequestInit][])[0][1];
 expect(JSON.parse(String(request.body)).to).toEqual([`${prefix}-MEMBER@example.test`]);expect(String(request.body)).not.toContain('forged@example.test');
 expect((await review(body)).status).toBe(409);expect(send).toHaveBeenCalledTimes(1);
});
it('retains revoked access and audits transport failure without leaking provider diagnostics',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('private-provider-error',{status:500})));
 expect((await review({action:'revoke',version:1,reason:'Independent broker review: IB relationship changed.'})).status).toBe(200);
 await vi.waitFor(async()=>expect(await db.auditEvent.count({where:{targetId:memberId,action:'MEMBERSHIP_EMAIL_FAILED'}})).toBe(1));
 expect((await db.membership.findUniqueOrThrow({where:{id:membershipId}})).status).toBe('REVOKED');
 const failures=await db.auditEvent.findMany({where:{targetId:memberId,action:'MEMBERSHIP_EMAIL_FAILED'}});expect(JSON.stringify(failures)).not.toContain('private-provider-error');
});
