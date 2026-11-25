import { afterAll, beforeAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { requireLocalTestDatabase } from '../support/test-database';
requireLocalTestDatabase();
const db = new PrismaClient(), base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3117';
const prefix = `photo-${Date.now()}`;
const cookies: Record<string,string> = {}, ids: Record<string,string> = {};
const photo = async (method='GET', role='MEMBER', data?: unknown, query='', origin=base) => fetch(`${base}/api/profile/photo${query}`, { method, headers: { Cookie: cookies[role] ?? '', Origin: origin, ...(data===undefined?{}:{'Content-Type':'application/json'}) }, ...(data===undefined?{}:{body:JSON.stringify(data)}) });
let memberImage='',adminImage='';
beforeAll(async()=>{
  memberImage=(await sharp({create:{width:120,height:80,channels:3,background:'#cda557'}}).png().toBuffer()).toString('base64');
  adminImage=(await sharp({create:{width:80,height:120,channels:3,background:'#193557'}}).png().toBuffer()).toString('base64');
  for(const role of ['MEMBER','ADMIN'] as const){
    const user=await db.user.create({data:{name:`${prefix}-${role}`,email:`${prefix}-${role}@example.test`,role,passwordHash:'synthetic-no-login',membership:{create:{status:'FREE'}}}});ids[role]=user.id;
    const token=newToken();await db.session.create({data:{userId:user.id,tokenHash:digestToken(token),expiresAt:new Date(Date.now()+600000)}});
    cookies[role]=`yengfx_session=${token}; __Host-yengfx_session=${token}`;
  }
});
afterAll(async()=>{
  await db.auditEvent.deleteMany({where:{actorId:{in:Object.values(ids)}}});
  await db.user.deleteMany({where:{email:{startsWith:prefix}}});await db.$disconnect();
});
it('requires authentication and same-origin mutations',async()=>{
  expect((await photo('GET','GUEST')).status).toBe(401);
  expect((await photo('PUT','MEMBER',{image:memberImage},'','https://evil.example.test')).status).toBe(403);
  expect((await photo('DELETE','ADMIN',undefined,'','https://evil.example.test')).status).toBe(403);
  expect((await photo()).status).toBe(204);
});
it('stores normalized private photos for members and admins without altering membership evidence',async()=>{
  for(const [role,image] of [['MEMBER',memberImage],['ADMIN',adminImage]]){
    const saved=await photo('PUT',role,{image,userId:ids[role==='MEMBER'?'ADMIN':'MEMBER']});expect(saved.status).toBe(200);
    expect((await saved.json()).photoUrl).toMatch(/^\/api\/profile\/photo\?v=[a-f0-9]{64}$/);
    const response=await photo('GET',role);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('private');expect(response.headers.get('content-type')).toBe('image/webp');
    const metadata=await sharp(Buffer.from(await response.arrayBuffer())).metadata();expect(metadata.width).toBe(512);expect(metadata.height).toBe(512);expect(metadata.exif).toBeUndefined();
    expect((await db.membership.findUniqueOrThrow({where:{userId:ids[role]}})).status).toBe('FREE');
    expect((await db.user.findUniqueOrThrow({where:{id:ids[role]}})).profileVersion).toBe(0);
  }
});
it('rejects scripts, corrupt files and oversized payloads without replacing the saved photo',async()=>{
  const before=await db.profilePhoto.findUniqueOrThrow({where:{userId:ids.MEMBER}});
  for(const image of [Buffer.from('<svg onload="alert(1)"/>').toString('base64'),'bm90LWFuLWltYWdl'])expect((await photo('PUT','MEMBER',{image})).status).toBe(400);
  expect((await photo('PUT','MEMBER',{image:'a'.repeat(7*1024*1024)})).status).toBe(413);
  expect((await db.profilePhoto.findUniqueOrThrow({where:{userId:ids.MEMBER}})).imageHash).toBe(before.imageHash);
});
it('cannot read or remove another account photo through a supplied account identifier',async()=>{
  const own=await db.profilePhoto.findUniqueOrThrow({where:{userId:ids.MEMBER}}), other=await db.profilePhoto.findUniqueOrThrow({where:{userId:ids.ADMIN}});
  const read=await photo('GET','MEMBER',undefined,`?userId=${ids.ADMIN}`);expect(Buffer.from(await read.arrayBuffer())).toEqual(Buffer.from(own.imageData));
  expect((await photo('DELETE','MEMBER',undefined,`?userId=${ids.ADMIN}`)).status).toBe(200);
  expect((await photo()).status).toBe(204);
  expect((await db.profilePhoto.findUniqueOrThrow({where:{userId:ids.ADMIN}})).imageHash).toBe(other.imageHash);
  expect(await db.auditEvent.count({where:{actorId:ids.MEMBER,action:'PROFILE_PHOTO_REMOVED'}})).toBe(1);
});
