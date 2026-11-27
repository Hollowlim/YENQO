import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
const useOutbox = () => process.env.NODE_ENV !== 'production' && process.env.DEV_EMAIL_OUTBOX === 'true';
const sender = () => (process.env.RESEND_FROM || process.env.RESET_EMAIL_FROM || '').trim();
const providerConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && sender() && !/[\r\n]/.test(sender()));
export const resetDeliveryEnabled = () => useOutbox() || providerConfigured();
function applicationUrl(pathname) {
  const origin = new URL(process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000');
  const loopback = ['127.0.0.1','localhost','[::1]'].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      !(origin.protocol === 'https:' || (origin.protocol === 'http:' && loopback && process.env.NODE_ENV !== 'production')))
    throw new Error('Invalid email origin');
  return new URL(pathname, origin);
}
async function deliverMessage(email, subject, text, idempotencyKey, localDetails = {}) {
  if (!resetDeliveryEnabled()) throw new Error('Email delivery is not configured');
  if (!useOutbox()) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method:'POST', redirect:'error', signal:globalThis.AbortSignal.timeout(10000),
        headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
        body:JSON.stringify({from:sender(),to:[email],subject,text}),
      });
      if (!response.ok || typeof (await response.json()).id !== 'string') throw new Error('Provider rejected email');
      return 'provider_accepted';
    } catch { throw new Error('Email delivery unavailable'); }
  }
  const directory = path.resolve(process.cwd(), '.local-mail');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, `${randomUUID()}.json`), JSON.stringify({to:email,subject,text,...localDetails}), {mode:0o600});
  return 'local_outbox';
}
export async function deliverReset(email, token) {
  if (!resetDeliveryEnabled())
    throw new Error("Email delivery is not configured");
  const url = applicationUrl('/auth/reset-password');
  url.searchParams.set("token", token);
  return deliverMessage(email,'Reset your YENQO password',`You requested a password reset for YENQO.\n\n${url.toString()}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`,
    `password-reset/${createHash('sha256').update(token).digest('hex')}`,{url:url.toString(),expiresInMinutes:30});
}
