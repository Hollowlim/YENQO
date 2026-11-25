import {expect,it} from 'vitest';import {parseStatement,mergeStatement} from '../../apps/web/server/statement-parser.js';import {performanceSnapshot} from '../../apps/web/server/broker-performance.js';import {statement} from '../support/mt5-statement';
it('reads inert English MT5 HTML, excludes cash deposits and converts the declared broker offset',()=>{
 const result=parseStatement(statement(),120);expect(result.login).toBe('123456');expect(result.currency).toBe('USD');expect(result.deals).toHaveLength(1);expect(result.deals[0].time).toBe('2026-10-31T17:00:00.000Z');const report=performanceSnapshot(result.deals,new Date('2026-11-01Z'));expect(report.days['2026-11-01'].net).toBe('9.00000000');expect(report.metrics.winRate).toBeNull();
});
it('deduplicates normalized records after database JSON key reordering and rejects conflicting money/time',()=>{
 const rows=parseStatement(statement(),120).deals;const reordered=rows.map(row=>Object.fromEntries(Object.entries(row).reverse()));expect(mergeStatement(reordered,rows).added).toBe(0);expect(()=>mergeStatement(rows,parseStatement(statement('123456','101','99'),120).deals)).toThrow('previously imported deal differs');expect(()=>mergeStatement(rows,parseStatement(statement(),180).deals)).toThrow();
});
it('rejects unsupported summaries, invalid dates/amounts, unknown offsets and oversized files',()=>{
 for(const html of ['<html>Summary only</html>',statement().replace('2026.10.31','2026.02.31'),statement().replace('10.00','NaN'),'x'.repeat(2*1024*1024+1)])expect(()=>parseStatement(html,120)).toThrow();expect(()=>parseStatement(statement(),121)).toThrow();
});
