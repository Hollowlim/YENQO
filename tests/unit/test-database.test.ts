import { expect, it } from 'vitest';
import { requireLocalTestDatabase } from '../support/test-database';
it('blocks destructive fixture suites against hosted databases while allowing loopback test databases', () => {
  expect(() => requireLocalTestDatabase('postgresql://test@127.0.0.1:5433/test')).not.toThrow();
  expect(() => requireLocalTestDatabase('postgresql://test@localhost:5433/test')).not.toThrow();
  expect(() => requireLocalTestDatabase('postgresql://test@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres')).toThrow('blocked');
  expect(() => requireLocalTestDatabase('postgresql://test@localhost.example.com/test')).toThrow('blocked');
});
