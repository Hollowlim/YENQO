import {afterEach,expect,it,vi} from 'vitest';
import type {PrismaClient} from '@prisma/client';
import {createMembershipEmailQueue} from '../../apps/web/server/membership-email-jobs.js';
afterEach(()=>vi.useRealTimers());
function fixture(){
 vi.useFakeTimers();
 const event={id:'audit-fixture',targetId:'member-fixture',action:'MEMBERSHIP_APPROVED',createdAt:new Date(0),details:{membershipId:'membership-fixture',version:1,status:'APPROVED'}};
 const recipient={email:'saved-member@example.test',role:'MEMBER',membership:{id:'membership-fixture',version:1,status:'APPROVED'}};
 const database={auditEvent:{findUnique:vi.fn(async()=>event),findFirst:vi.fn(async()=>null as unknown),create:vi.fn(async()=>({}))},user:{findUnique:vi.fn(async()=>recipient)}};
 const deliver=vi.fn(async()=> 'provider_accepted' as const);
 const enabled=vi.fn(()=>true);
 const queue=createMembershipEmailQueue({database:database as unknown as PrismaClient,deliver,enabled});
 return {event,recipient,database,deliver,enabled,queue};
}
it('sends only the committed review to the saved member email and records provider acceptance',async()=>{
 const f=fixture();expect(f.queue.enqueue(f.event.id)).toBe('queued');f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);
 expect(f.deliver).toHaveBeenCalledExactlyOnceWith('saved-member@example.test','APPROVED',f.event.id,new Date(0));
 expect(f.database.auditEvent.create).toHaveBeenCalledWith({data:{targetId:'member-fixture',action:'MEMBERSHIP_EMAIL_ACCEPTED',details:{eventId:f.event.id}}});
});
it('does not email a stale approval after revocation or resend an accepted event',async()=>{
 const f=fixture();f.recipient.membership.version=2;f.recipient.membership.status='REVOKED';f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.deliver).not.toHaveBeenCalled();expect(f.database.auditEvent.create).toHaveBeenCalledWith({data:{targetId:'member-fixture',action:'MEMBERSHIP_EMAIL_SUPERSEDED',details:{eventId:f.event.id}}});
 f.database.auditEvent.findFirst.mockResolvedValue({id:'already-accepted'});f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.deliver).not.toHaveBeenCalled();
});
it('rejects non-review audit IDs and member/admin mismatches',async()=>{
 const f=fixture();f.event.action='AUTH_REGISTER';f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.deliver).not.toHaveBeenCalled();
 f.event.action='MEMBERSHIP_APPROVED';f.recipient.role='ADMIN';f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.deliver).not.toHaveBeenCalled();
 f.recipient.role='MEMBER';f.recipient.membership.id='other-membership';f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.deliver).not.toHaveBeenCalled();
});
it('audits sanitized failure without reversing membership and bounds the queue',async()=>{
 const f=fixture();f.deliver.mockRejectedValue(new Error('secret-provider-details'));f.queue.enqueue(f.event.id);await vi.advanceTimersByTimeAsync(0);expect(f.database.auditEvent.create).toHaveBeenCalledWith({data:{targetId:'member-fixture',action:'MEMBERSHIP_EMAIL_FAILED',details:{eventId:f.event.id}}});expect(JSON.stringify(f.database.auditEvent.create.mock.calls)).not.toContain('secret-provider-details');
 f.enabled.mockReturnValue(false);expect(f.queue.enqueue(f.event.id)).toBe('not_configured');f.enabled.mockReturnValue(true);for(let i=0;i<100;i++)expect(f.queue.enqueue('fixture-'+i)).toBe('queued');expect(f.queue.enqueue('overflow')).toBe('busy');
});
