// Bounded best-effort queue, matching the existing reset-email worker.
// Only committed server-side review audit IDs enter this queue. No client recipients.
import { db } from './db.js';
import { deliverMembershipNotice, membershipDeliveryEnabled } from './email.js';

export function createMembershipEmailQueue({database=db, deliver=deliverMembershipNotice, enabled=membershipDeliveryEnabled} = {}) {
  const jobs = new Set();
  let running = false;
  async function drain() {
    try {
      while (jobs.size) {
        const eventId = jobs.values().next().value;
        if (!eventId) break;
        jobs.delete(eventId);
        let targetId;
        try {
          const event = await database.auditEvent.findUnique({where:{id:eventId}});
          if (!event?.targetId || !['MEMBERSHIP_APPROVED','MEMBERSHIP_REJECTED','MEMBERSHIP_REVOKED'].includes(event.action)) continue;
          targetId = event.targetId;
          const details = event.details;
          if (!details || typeof details !== 'object' || Array.isArray(details)) continue;
          const recipient = await database.user.findUnique({where:{id:targetId},select:{email:true,role:true,membership:{select:{id:true,status:true,version:true}}}});
          if (!recipient || recipient.role !== 'MEMBER' || !recipient.membership || recipient.membership.id !== details.membershipId || event.action !== `MEMBERSHIP_${details.status}`) continue;
          const prior = await database.auditEvent.findFirst({where:{targetId,action:{in:['MEMBERSHIP_EMAIL_ACCEPTED','MEMBERSHIP_EMAIL_LOCAL_OUTBOX']},details:{path:['eventId'],equals:eventId}}});
          if (prior) continue;
          let action;
          if (recipient.membership.version !== details.version || recipient.membership.status !== details.status) action='MEMBERSHIP_EMAIL_SUPERSEDED';
          else if (!enabled()) action='MEMBERSHIP_EMAIL_UNCONFIGURED';
          else {
            const result = await deliver(recipient.email,recipient.membership.status,eventId,event.createdAt);
            action=result==='local_outbox'?'MEMBERSHIP_EMAIL_LOCAL_OUTBOX':'MEMBERSHIP_EMAIL_ACCEPTED';
          }
          await database.auditEvent.create({data:{targetId,action,details:{eventId}}});
        } catch {
          if (targetId) try { await database.auditEvent.create({data:{targetId,action:'MEMBERSHIP_EMAIL_FAILED',details:{eventId}}}); } catch { /* No provider details or recipient addresses in logs. */ }
        }
      }
    } finally { running=false; }
  }
  function enqueue(eventId) {
    if (!enabled()) return 'not_configured';
    if (jobs.size >= 100) return 'busy';
    jobs.add(eventId);
    if (!running) { running=true; globalThis.setTimeout(drain,0); }
    return 'queued';
  }
  return {enqueue,drain};
}
export const membershipEmailQueue = createMembershipEmailQueue();
