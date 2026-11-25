import { db } from './db.js';
import { currentUser } from './auth.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';

// A safe administrative projection. JSON details can contain private snapshots,
// so they are deliberately never returned by this browsing endpoint.
export async function adminAuditApi(request) {
  if(request.method!=='GET')return jsonResponse({message:'Method not allowed.'},405);
  try {
    const user=await currentUser(request);
    if(!user)return jsonResponse({message:'Sign in required.'},401);
    if(user.role!=='ADMIN')return jsonResponse({message:'Administrator access required.'},403);
    if(!await takeRateLimit('admin-audit:GET',user.id,60,60))return jsonResponse({message:'Too many requests. Try again shortly.'},429);
    const before=new URL(request.url).searchParams.get('before');
    if(before && (!/^[A-Za-z0-9_-]{1,100}$/.test(before) || !await db.auditEvent.findUnique({where:{id:before},select:{id:true}})))return jsonResponse({message:'Invalid page cursor. Refresh the log.'},400);
    const rows=await db.auditEvent.findMany({
      orderBy:[{createdAt:'desc'},{id:'desc'}],take:51,
      ...(before?{cursor:{id:before},skip:1}:{}),
      select:{id:true,action:true,createdAt:true,actorId:true,targetId:true},
    });
    await db.auditEvent.create({data:{actorId:user.id,action:'AUDIT_LOG_VIEWED',details:{count:Math.min(rows.length,50)}}});
    return jsonResponse({source:'application-database',asOf:new Date().toISOString(),items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
  } catch {
    return jsonResponse({message:'Administrative logs are temporarily unavailable. Try refreshing shortly.'},503);
  }
}
