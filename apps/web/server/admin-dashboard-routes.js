import { db } from './db.js';
import { currentUser } from './auth.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { IB_POLICY } from './membership-policy.js';

const dayMs = 86400000;
const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit' }).format(value);
const memberWhere = { role: /** @type {const} */ ('MEMBER') };
const verifiedWhere = {
  ...memberWhere,
  membership: { is: {
    status: /** @type {const} */ ('APPROVED'),
    verifiedBroker: IB_POLICY.broker,
    verifiedIbCode: IB_POLICY.ibCode,
    verifiedDepositCents: { gte:IB_POLICY.minimumDepositCents },
    verifiedById: { not:null },
    verifiedAt: { not:null },
  } },
};

// Aggregate operations data only. Admin access never grants broker authority.
export async function adminDashboardApi(request) {
  if (request.method !== 'GET') return jsonResponse({message:'Method not allowed.'},405);
  try {
    const user = await currentUser(request);
    if (!user) return jsonResponse({message:'Sign in required.'},401);
    if (user.role !== 'ADMIN') return jsonResponse({message:'Administrator access required.'},403);
    const parameter = new URL(request.url).searchParams.get('days') ?? '30';
    if (!['7','30','90','365'].includes(parameter)) return jsonResponse({message:'Choose a 7, 30, 90 or 365 day window.'},400);
    if (!await takeRateLimit('admin-dashboard:GET',user.id,60,60)) return jsonResponse({message:'Too many requests. Try again shortly.'},429);
    const days = Number(parameter), now = new Date();
    const today = new Date(`${dateKey(now)}T00:00:00+08:00`);
    const start = new Date(today.getTime()-(days-1)*dayMs);
    const activeSince = new Date(now.getTime()-30*dayMs);
    const [totalMembers, activeMembers30d, verifiedMembers, pendingMemberships, publishedAnalysis, publishedSignals, publishedLessons, pendingModeration, statuses, beforeWindow, dailyRegistrations, activity, recentMembers] = await Promise.all([
      db.user.count({where:memberWhere}),
      db.user.count({where:{...memberWhere,lastLoginAt:{gte:activeSince}}}),
      db.user.count({where:verifiedWhere}),
      db.membership.count({where:{status:'PENDING',user:memberWhere}}),
      db.dailyPlan.count({where:{status:'PUBLISHED'}}),
      db.manualSignal.count({where:{status:'PUBLISHED'}}),
      db.videoLesson.count({where:{status:'PUBLISHED'}}),
      db.communityReport.count({where:{message:{hiddenAt:null}}}),
      db.membership.groupBy({by:['status'],where:{user:memberWhere},_count:{_all:true}}),
      db.user.count({where:{...memberWhere,createdAt:{lt:start}}}),
      db.$queryRaw`SELECT to_char("createdAt" + INTERVAL '8 hours', 'YYYY-MM-DD') AS "date", COUNT(*)::integer AS "registrations" FROM "User" WHERE "role" = 'MEMBER' AND "createdAt" >= ${start} AND "createdAt" <= ${now} GROUP BY 1 ORDER BY 1`,
      db.auditEvent.findMany({where:{action:{in:['AUTH_REGISTER','MEMBERSHIP_APPROVED','MEMBERSHIP_REVOKED','MEMBERSHIP_REJECTED','MEMBERSHIP_REQUESTED','DAILY_PLAN_SAVED','MANUAL_SIGNAL_SAVED','VIDEO_LESSON_SAVED','VIDEO_LESSON_UPLOADED','COMMUNITY_MESSAGE_HIDDEN','COMMUNITY_MESSAGE_REMOVED']}},orderBy:[{createdAt:'desc'},{id:'desc'}],take:8,select:{id:true,action:true,createdAt:true}}),
      db.user.findMany({where:memberWhere,orderBy:[{createdAt:'desc'},{id:'desc'}],take:6,select:{id:true,name:true,email:true,createdAt:true,lastLoginAt:true,membership:{select:{status:true}}}}),
    ]);
    const countFor = status => statuses.find(item=>item.status===status)?._count._all ?? 0;
    const withMembership = statuses.reduce((sum,item)=>sum+item._count._all,0);
    const free = countFor('FREE')+Math.max(0,totalMembers-withMembership), pending = countFor('PENDING'), revoked = countFor('REVOKED');
    const distribution = [
      {key:'VERIFIED',label:'Verified access',count:verifiedMembers},
      {key:'FREE',label:'Free members',count:free},
      {key:'PENDING',label:'Pending review',count:pending},
      {key:'REVOKED',label:'Revoked access',count:revoked},
      {key:'OTHER',label:'Other access states',count:Math.max(0,totalMembers-verifiedMembers-free-pending-revoked)},
    ];
    const rows = /** @type {{date:string,registrations:number}[]} */ (dailyRegistrations);
    let running = beforeWindow;
    const growth = Array.from({length:days},(_,index)=>{
      const date = dateKey(new Date(start.getTime()+index*dayMs));
      const registrations = Number(rows.find(row=>row.date===date)?.registrations ?? 0);
      running += registrations;
      return {date,registrations,total:running};
    });
    await db.auditEvent.create({data:{actorId:user.id,action:'ADMIN_DASHBOARD_VIEWED',details:{days}}});
    return jsonResponse({
      source:'application-database',asOf:now.toISOString(),days,
      metrics:{totalMembers,activeMembers30d,verifiedMembers,pendingMemberships,publishedAnalysis,publishedSignals,publishedLessons,pendingModeration},
      growth,distribution,activity,
      recentMembers:recentMembers.map(({membership,...member})=>({...member,status:membership?.status??'FREE'})),
      services:[
        {name:'Web application',status:'Responding',detail:'This authenticated request was served successfully.'},
        {name:'Authentication',status:'Confirmed',detail:'Your current administrator session was verified.'},
        {name:'Database',status:'Connected',detail:'Dashboard queries completed at the refresh time shown.'},
        {name:'MT5 connection',status:'Disconnected',detail:'Tools is coming soon. No broker commands are enabled.'},
        {name:'Live support',status:'Unavailable',detail:'Live support is not connected. Community discussions will use Telegram.'},
        {name:'Billing',status:'Not configured',detail:'No revenue or payment provider is connected.'},
      ],
    });
  } catch {
    return jsonResponse({message:'Operations data is temporarily unavailable. Try refreshing shortly.'},503);
  }
}
