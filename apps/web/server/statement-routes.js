import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {db} from './db.js';import {currentUser} from './auth.js';import {hasFullMemberAccess} from './membership-policy.js';import {isSameOrigin} from './security.js';import {takeRateLimit} from './rate-limit.js';import {readBoundedJson} from './request-body.js';import {jsonResponse} from './http.js';import {parseStatement,mergeStatement,StatementError} from './statement-parser.js';import {performanceSnapshot} from './broker-performance.js';
const key=randomBytes(32),schema=z.object({html:z.string().max(2*1024*1024),utcOffset:z.number().int(),version:z.number().int().min(0),confirmation:z.string().max(200).optional()}).strict();
const sign=(userId,hash,version,offset,expires)=>createHmac('sha256',key).update(JSON.stringify([userId,hash,version,offset,expires])).digest('hex');
export function createStatementApi({database=db,principal=currentUser,rateLimit=takeRateLimit}={}){return async request=>{
 const path=new URL(request.url).pathname;
 if(!['GET','POST'].includes(request.method))return jsonResponse({message:'Method not allowed.'},405);
 if(request.method==='POST'&&!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return jsonResponse({message:'Request origin rejected.'},403);
 try{
  const user=await principal(request);if(!user)return jsonResponse({message:'Sign in required.'},401);
  if(!hasFullMemberAccess(user))return jsonResponse({message:'Verified membership is required for your P/L Calendar.'},403);
  if(!await rateLimit('statement:'+request.method,user.id,request.method==='GET'?90:10,60))return jsonResponse({message:'Too many import attempts. Try again shortly.'},429);
  const row=await database.statementHistory.findUnique({where:{userId:user.id}});
  const profile=await database.user.findUnique({where:{id:user.id},select:{mt5Account:true,mt5Server:true}});
  if(request.method==='GET'){
   if(path!=='/api/statements/calendar')return jsonResponse({message:'Method not allowed.'},405);
   const month=new URL(request.url).searchParams.get('month');if(!month||!/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month))return jsonResponse({message:'Choose a valid month.'},400);
   const own=row&&row.login===profile?.mt5Account&&row.server===(profile?.mt5Server??'');
   if(!own)return jsonResponse({available:true,version:row?.version??0,connection:null,days:null,metrics:null,message:row?'Account details changed. Imported results are hidden. Restore the original account details before importing.':'No statement imported yet. Upload an MT5 History HTML report to see your results.'});
   const data=performanceSnapshot(row.deals);
   return jsonResponse({...data,available:true,version:row.version,connection:{currency:row.currency,lastSyncedAt:row.importedAt,historyFrom:row.historyFrom,historyTo:row.historyTo,canSync:false},days:Object.fromEntries(Object.entries(data.days).filter(([date])=>date.startsWith(month))),basis:'Manually uploaded MT5 statement; not broker-verified or live. Daily cash flow includes trading profit, commission, swap and fees; excludes deposits/withdrawals. Position statistics are unavailable unless the report includes complete position identifiers.'});
  }
  if(!['/api/statements/preview','/api/statements/import'].includes(path))return jsonResponse({message:'Not found.'},404);
  const parsed=schema.safeParse(await readBoundedJson(request.body,3*1024*1024));if(!parsed.success)return jsonResponse({message:'Choose an MT5 HTML report and its broker UTC offset.'},400);const fields=parsed.data;
  if(fields.version!==(row?.version??0))return jsonResponse({message:'History changed. Reload the calendar and preview again.'},409);
  const report=parseStatement(fields.html,fields.utcOffset);
  if(!profile?.mt5Account||profile.mt5Account!==report.login||report.server&&report.server!==profile.mt5Server)throw new StatementError('The report must match your saved MT5 account and server. Update your own account details first.');
  if(row&&(row.login!==report.login||row.server!==(profile.mt5Server??'')||row.currency!==report.currency))throw new StatementError('This calendar belongs to a different account, server or currency. Existing results were not changed.');
  const merged=mergeStatement(row?.deals??[],report.deals),from=new Date(merged.deals[0].time),to=new Date(+new Date(merged.deals.at(-1).time)+1),hash=createHash('sha256').update(fields.html).digest('hex');
  if(path==='/api/statements/preview'){
   const expires=Date.now()+10*60000,confirmation=expires+'.'+sign(user.id,hash,fields.version,fields.utcOffset,expires);
   return jsonResponse({confirmation,version:fields.version,accountSuffix:report.login.slice(-4),currency:report.currency,added:merged.added,duplicates:report.deals.length-merged.added,from,to,message:'Review these details. Confirm import to save your own statement results. No broker connection or password is used.'});
  }
  const [expires,signature]=fields.confirmation?.split('.')??[];
  if(!/^\d{13}$/.test(expires??'')||! /^[a-f0-9]{64}$/.test(signature??'')||Number(expires)<Date.now()||Number(expires)>Date.now()+10*60000||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(user.id,hash,fields.version,fields.utcOffset,Number(expires)),'hex')))return jsonResponse({message:'Preview expired or changed. Review the statement again.'},409);
  if(!merged.added)return jsonResponse({message:'All these executions are already imported. Nothing was added.'});
  await database.$transaction(async tx=>{
   const current=await tx.user.findUnique({where:{id:user.id},select:{mt5Account:true,mt5Server:true,membership:true,role:true,createdAt:true}});
   if(!current||!hasFullMemberAccess(current)||current.mt5Account!==report.login||current.mt5Server!==profile.mt5Server)throw new StatementError('Account or membership changed. Reload before importing.');
   const data={login:report.login,server:profile.mt5Server??'',currency:report.currency,deals:merged.deals,historyFrom:from,historyTo:to,importedAt:new Date()};
   if(row){const saved=await tx.statementHistory.updateMany({where:{userId:user.id,version:fields.version},data:{...data,version:{increment:1}}});if(!saved.count)throw new StatementError('History changed. Preview again.');}
   else await tx.statementHistory.create({data:{userId:user.id,...data}});
   await tx.auditEvent.create({data:{actorId:user.id,targetId:user.id,action:'MT5_STATEMENT_IMPORTED',details:{added:merged.added,fileHash:hash,utcOffset:fields.utcOffset}}});
  });
  return jsonResponse({message:`Imported ${merged.added} trading executions. Results are from your uploaded statement, not a live broker feed.`});
 }catch(error){
  if(error instanceof StatementError)return jsonResponse({message:error.message},400);
  if(error instanceof Error&&error.message==='BODY_TOO_LARGE')return jsonResponse({message:'Report is too large. Use an HTML file smaller than 2 MB.'},413);
  if(error instanceof Error&&error.message==='INVALID_JSON')return jsonResponse({message:'Invalid import request.'},400);
  if(error&&typeof error==='object'&&'code'in error&&error.code==='P2002')return jsonResponse({message:'History changed. Preview again.'},409);
  return jsonResponse({message:'Statement import is unavailable. No new results were confirmed.'},503);
 }
};}
export const statementApi=createStatementApi();
