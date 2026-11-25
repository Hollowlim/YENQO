// Bounded background delivery. The public response never waits on account lookup or email.
// Best-effort in-process queue: production deployments should use a durable worker.
import { db } from './db.js';
import { newToken, digestToken } from './security.js';
import { deliverReset } from './email.js';
const jobs = [];
let running = false;
export function queueResetRequest(email) {
  if (jobs.length >= 100) return false;
  jobs.push(email);
  if (!running) { running = true; globalThis.setTimeout(drain,0); }
  return true;
}
async function drain() {
  while (jobs.length) {
    const email = jobs.shift(); let userId, tokenHash, delivered = false;
    try {
      const user = await db.user.findUnique({where:{email}});
      if (!user) continue;
      userId = user.id; const token = newToken(); tokenHash = digestToken(token);
      await db.passwordReset.create({data:{userId,tokenHash,expiresAt:new Date(Date.now()+1800000)}});
      await deliverReset(user.email,token);
      delivered = true;
      await db.auditEvent.create({data:{actorId:userId,action:'AUTH_RESET_REQUEST'}});
    } catch {
      try {
        if (!delivered && userId && tokenHash) await db.passwordReset.deleteMany({where:{userId,tokenHash}});
        if (!delivered && userId) await db.auditEvent.create({data:{actorId:userId,action:'AUTH_RESET_DELIVERY_FAILED'}});
      } catch { /* Do not expose private database or transport errors. */ }
    }
  }
  running = false;
}
