import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({lookup:vi.fn(),create:vi.fn(),remove:vi.fn(),audit:vi.fn(),send:vi.fn()}));
vi.mock('../../apps/web/server/db.js',() => ({db:{user:{findUnique:mocks.lookup},passwordReset:{create:mocks.create,deleteMany:mocks.remove},auditEvent:{create:mocks.audit}}}));
vi.mock('../../apps/web/server/email.js',() => ({deliverReset:mocks.send}));
afterEach(() => {vi.useRealTimers();vi.resetModules();vi.resetAllMocks();});
it('responds to enqueue without waiting for account lookup and bounds pending work',async () => {
  vi.useFakeTimers();
  const {queueResetRequest} = await import('../../apps/web/server/reset-jobs.js');
  mocks.lookup.mockResolvedValue(null);
  for(let i=0;i<100;i++) expect(queueResetRequest(`absent-${i}@example.test`)).toBe(true);
  expect(queueResetRequest('overflow@example.test')).toBe(false);
  expect(mocks.lookup).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();expect(mocks.lookup).toHaveBeenCalledTimes(100);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('stores only a hash and removes an undelivered token when transport fails',async () => {
  vi.useFakeTimers();
  const {queueResetRequest} = await import('../../apps/web/server/reset-jobs.js');
  mocks.lookup.mockResolvedValue({id:'synthetic-user',email:'client@example.test'});
  mocks.send.mockRejectedValue(new Error('synthetic transport failure'));
  queueResetRequest('client@example.test');await vi.runAllTimersAsync();
  const token = mocks.send.mock.calls[0][1];
  const saved = mocks.create.mock.calls[0][0].data;
  expect(saved.tokenHash).not.toBe(token);expect(saved.tokenHash).toHaveLength(64);
  expect(mocks.remove).toHaveBeenCalledWith({where:{userId:'synthetic-user',tokenHash:saved.tokenHash}});
  expect(mocks.audit).toHaveBeenCalledWith({data:{actorId:'synthetic-user',action:'AUTH_RESET_DELIVERY_FAILED'}});
});
it('keeps a delivered link usable if subsequent audit storage fails',async () => {
  vi.useFakeTimers();
  const {queueResetRequest} = await import('../../apps/web/server/reset-jobs.js');
  mocks.lookup.mockResolvedValue({id:'synthetic-user',email:'client@example.test'});
  mocks.send.mockResolvedValue(undefined);mocks.audit.mockRejectedValue(new Error('audit storage unavailable'));
  queueResetRequest('client@example.test');await vi.runAllTimersAsync();
  expect(mocks.send).toHaveBeenCalledOnce();expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.audit).toHaveBeenCalledOnce();
});
