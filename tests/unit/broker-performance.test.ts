import {expect,it} from 'vitest';
import {normalizeDeals,performanceSnapshot} from '../../apps/web/server/broker-performance.js';
const from=new Date('2026-01-01Z'),to=new Date('2026-11-02Z');
const deal=(id:string,time:string,entryType:string,volume:number,profit:number,commission=0)=>({id,time,entryType,volume,profit,commission,swap:0,fee:0,positionId:'one',symbol:'XAUUSD',type:'DEAL_TYPE_BUY'});
it('counts real trade cash flow in MYT, excludes deposits and deduplicates deal identifiers',()=>{
 const entry=deal('1','2026-10-31T15:50:00Z','DEAL_ENTRY_IN',1,0,-2),close=deal('2','2026-10-31T16:30:00Z','DEAL_ENTRY_OUT',1,10,-1);
 const rows=normalizeDeals([entry,close,close,{...close,id:'deposit',type:'DEAL_TYPE_BALANCE',profit:10000}],from,to);
 expect(rows).toHaveLength(2);const report=performanceSnapshot(rows,new Date('2026-11-01T10:00:00Z'));
 expect(report.days['2026-10-31'].net).toBe('-2.00000000');expect(report.days['2026-11-01'].net).toBe('9.00000000');
 expect(report.metrics.weekly).toBe('7.00000000');expect(report.metrics.winRate).toBe('100.00');expect(report.metrics.averageWin).toBe('7.00000000');
});
it('requires complete closed positions for trade statistics, keeping partial profits in daily totals',()=>{
 const rows=normalizeDeals([deal('1','2026-10-30T00:00:00Z','DEAL_ENTRY_IN',1,0,-2),deal('2','2026-11-01T01:00:00Z','DEAL_ENTRY_OUT',.4,40,-1)],from,to);
 const partial=performanceSnapshot(rows,new Date('2026-11-01T10:00:00Z'));expect(partial.metrics.closedPositions).toBe(0);expect(partial.metrics.winRate).toBeNull();expect(partial.days['2026-11-01'].net).toBe('39.00000000');
 const closed=performanceSnapshot(normalizeDeals([...rows.map(d=>({...d,profit:d.net,commission:0,type:'DEAL_TYPE_BUY'})),deal('3','2026-11-01T02:00:00Z','DEAL_ENTRY_OUT',.6,-10,-1)],from,to),new Date('2026-11-01T10:00:00Z'));
 expect(closed.metrics.closedPositions).toBe(1);expect(closed.metrics.averageWin).toBe('26.00000000');
});
it('does not classify netting reversals or history beginning with an exit as complete trades',()=>{
 const rows=normalizeDeals([deal('1','2026-11-01T01:00:00Z','DEAL_ENTRY_INOUT',1,10),{...deal('2','2026-11-01T02:00:00Z','DEAL_ENTRY_OUT',1,15),positionId:'other'}],from,to);
 expect(performanceSnapshot(rows).metrics.winRate).toBeNull();
 expect(()=>normalizeDeals([deal('1','bad','DEAL_ENTRY_IN',1,0)],from,to)).toThrow();
 expect(()=>normalizeDeals([{...deal('1','2026-11-01Z','DEAL_ENTRY_IN',1,0),profit:undefined}],from,to)).toThrow('INVALID_DEAL');
 expect(()=>normalizeDeals([deal('1','2026-11-01Z','DEAL_ENTRY_IN',1,0),deal('1','2026-11-01Z','DEAL_ENTRY_IN',1,1)],from,to)).toThrow('CONFLICTING_DEAL');
});
