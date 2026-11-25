import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { isSameOrigin } from './security.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { readBoundedJson } from './request-body.js';

// Integration boundary for the future cloud MT5 connector. The full lifecycle
// (preview -> confirm -> queue -> device lease -> broker ACK -> receipt) is NOT
// built; every command is validated, audited and rejected. Nothing reaches a broker.
const points = z.number().int().min(1).max(100000).nullable();
export const eaSettingsSchema = z.object({
  lotSize: z.number().min(0.01).max(100),
  riskPercent: z.number().min(0.01).max(10),
  maxExposureLots: z.number().min(0.01).max(100),
  maxLayers: z.number().int().min(1).max(20),
  stopLossPoints: points,
  takeProfitPoints: points,
  breakevenTriggerPoints: points,
  partialClosePercent: z.number().int().min(1).max(100),
}).strict().refine(s => s.lotSize <= s.maxExposureLots, 'Lot size cannot exceed maximum exposure.');
export const EA_ACTIONS = ['START', 'PAUSE_NEW_ENTRIES', 'RESUME', 'EMERGENCY_STOP', 'BREAKEVEN', 'PARTIAL_CLOSE', 'UPDATE_SETTINGS'];
const commandSchema = z.object({ action: z.enum(EA_ACTIONS), settings: eaSettingsSchema.optional(), clientKey: z.uuid() }).strict()
  .refine(c => (c.action === 'UPDATE_SETTINGS') === Boolean(c.settings), 'Settings are required only for UPDATE_SETTINGS.');

export function createEaApi({ principal = currentUser, rateLimit = takeRateLimit, database = db } = {}) {
  return async request => {
    const path = new URL(request.url).pathname;
    try {
      if (request.method === 'POST' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return jsonResponse({ message: 'Request origin rejected.' }, 403);
      const user = await principal(request);
      if (!user) return jsonResponse({ message: 'Sign in required.' }, 401);
      if (!(await rateLimit(`ea:${request.method}`, user.id, request.method === 'GET' ? 60 : 10, 60))) return jsonResponse({ message: 'Too many requests. Try again shortly.' }, 429);
      if (path === '/api/ea/status' && request.method === 'GET')
        return jsonResponse({ connector: 'PENDING', execution: 'DISABLED', eaStatus: 'NOT_DEPLOYED', account: null, positions: [], orders: [], message: 'Cloud MT5 connector is not deployed. No EA is running for your account.' });
      if (path !== '/api/ea/commands' || request.method !== 'POST') return jsonResponse({ message: 'Not found.' }, 404);
      const parsed = commandSchema.safeParse(await readBoundedJson(request.body, 4096));
      if (!parsed.success) return jsonResponse({ message: 'Invalid EA request. Check the action and settings ranges.' }, 400);
      // Scoped to the principal only; no account or user selector is accepted from the client.
      await database.auditEvent.create({ data: { actorId: user.id, action: 'EA_COMMAND_REJECTED', targetId: user.id, details: { action: parsed.data.action, clientKey: parsed.data.clientKey, reason: 'EXECUTION_DISABLED' } } });
      return jsonResponse({ accepted: false, status: 'REJECTED', reason: 'EXECUTION_DISABLED', brokerConfirmed: false, message: 'Request recorded and rejected: cloud execution is not enabled. Nothing was sent to a broker.' }, 409);
    } catch (error) {
      if (error instanceof Error && ['BODY_TOO_LARGE', 'INVALID_JSON'].includes(error.message)) return jsonResponse({ message: 'Invalid request body.' }, 400);
      return jsonResponse({ message: 'EA service unavailable. No command was sent.' }, 503);
    }
  };
}
export const eaApi = createEaApi();
