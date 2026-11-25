import {expect,it} from 'vitest';
import {calculateProfit,calculateRisk,calculateRiskReward,validateSpec,XAUUSD_EXAMPLE as spec} from '../../packages/shared/trading-math.js';
const profit={side:'BUY' as const,entry:4000,exit:4005,lots:0.1,extraCostsAccount:0,spec};
const risk={side:'BUY' as const,accountBalance:1000,riskPercent:1,entry:4000,stop:3992,target:4016,roundTripCostPerLotAccount:0,spec};
it('passes the supplied eight sample checks without claiming live XAUUSD prices',()=>{
 expect(calculateProfit(profit).netAccount).toBe(50);
 expect(calculateProfit({...profit,side:'SELL'}).netAccount).toBe(-50);
 expect(calculateProfit({...profit,extraCostsAccount:5,spec:{...spec,accountCurrency:'MYR',quoteToAccountRate:4.5}}).netAccount).toBe(220);
 expect(calculateRisk(risk)).toMatchObject({available:true,lots:0.01,estimatedLoss:8,estimatedProfit:16,riskReward:2});
 expect(calculateRisk({...risk,side:'SELL',stop:4008,target:3984})).toMatchObject({lots:0.01,estimatedLoss:8,estimatedProfit:16});
 const below=calculateRisk({...risk,accountBalance:100,stop:3990,target:4010});expect(below.lots).toBe(0);expect(below.message).toMatch(/below broker minimum/);
 expect(()=>calculateRisk({...risk,stop:4010,target:4020})).toThrow(/stop < entry/);
 expect(()=>calculateProfit({...profit,lots:0.015})).toThrow(/lot step/);
});
it('calculates BUY and SELL outcomes, losses and costs using the chosen contract',()=>{
 expect(calculateProfit({...profit,exit:3995}).netAccount).toBe(-50);
 expect(calculateProfit({...profit,side:'SELL',exit:3995,extraCostsAccount:7}).netAccount).toBe(43);
 expect(calculateProfit({...profit,spec:{...spec,contractSize:10}}).netAccount).toBe(5);
 expect(calculateProfit({...profit,exit:4000,extraCostsAccount:3}).netAccount).toBe(-3);
});
it('uses manual FX conversion for both risk sizing and round-trip account-currency costs',()=>{
 const r=calculateRisk({...risk,accountBalance:10000,roundTripCostPerLotAccount:10,spec:{...spec,accountCurrency:'MYR',quoteToAccountRate:4.5}});
 expect(r.lots).toBe(0.02);expect(r.estimatedLoss).toBeCloseTo(72.2);expect(r.estimatedProfit).toBeCloseTo(143.8);
});
it('floors irregular and fractional lot steps, honors maximums and shows full precision',()=>{
 const s={...spec,minLots:0.25,maxLots:10,lotStep:0.25};
 expect(calculateRisk({...risk,accountBalance:100000,spec:s}).lots).toBe(1.25);
 expect(calculateRisk({...risk,accountBalance:1000000,spec:{...s,maxLots:1}}).lots).toBe(1);
 expect(calculateRisk({...risk,accountBalance:100,spec:{...spec,minLots:0.001,lotStep:0.001}}).lots).toBe(0.001);
});
it('never rounds a position above budget, including a boundary just below a lot step',()=>{
 const near=calculateRisk({...risk,accountBalance:799.9999999999});expect(near.available).toBe(false);
 for(let n=1;n<=1500;n++){
  const input={...risk,accountBalance:n/7,riskPercent:(n%11+1)/7,roundTripCostPerLotAccount:n%17/3};
  const r=calculateRisk(input);expect(r.estimatedLoss).toBeLessThanOrEqual(r.budget);
  if(r.available){expect(r.lots).toBeGreaterThanOrEqual(spec.minLots);expect(r.lots).toBeLessThanOrEqual(spec.maxLots);expect(r.lots/spec.lotStep).toBeCloseTo(Math.round(r.lots/spec.lotStep),7);}
 }
 for(let n=1;n<=100;n++){
  const r=calculateRisk({...risk,accountBalance:1e12-n/3,riskPercent:17.1234567,spec:{...spec,minLots:1e-8,lotStep:1e-8,maxLots:90000000}});expect(r.estimatedLoss).toBeLessThanOrEqual(r.budget);expect(r.lots).toBeLessThanOrEqual(90000000);
 }
});
it('computes net reward/risk and theoretical break-even for both sides',()=>{
 const base={side:'BUY' as const,entry:4000,stop:3992,target:4016,lots:0.1,roundTripCostPerLotAccount:0,spec};
 expect(calculateRiskReward(base)).toMatchObject({loss:80,reward:160,ratio:2,stopDistance:8,targetDistance:16});
 expect(calculateRiskReward(base).breakEvenWinRate).toBeCloseTo(100/3);
 expect(calculateRiskReward({...base,side:'SELL',stop:4008,target:3984}).ratio).toBe(2);
 expect(calculateRiskReward({...base,roundTripCostPerLotAccount:2000})).toMatchObject({loss:280,reward:-40,breakEvenWinRate:null});
 expect(calculateRisk({...risk,roundTripCostPerLotAccount:2000,accountBalance:10000}).message).toMatch(/does not cover/);
});
it('rejects zero, non-finite, wrong-direction, invalid-volume and invalid-currency inputs',()=>{
 for(const value of [NaN,Infinity,-Infinity,0,-1]){
  expect(()=>calculateProfit({...profit,entry:value})).toThrow();
  expect(()=>calculateRisk({...risk,riskPercent:value})).toThrow();
 }
 expect(()=>calculateProfit({...profit,side:'INVALID' as 'BUY'})).toThrow(/BUY or SELL/);
 expect(()=>calculateProfit({...profit,lots:100.01})).toThrow(/min\/max/);
 expect(()=>calculateProfit({...profit,extraCostsAccount:-1})).toThrow();
 expect(()=>calculateRisk({...risk,riskPercent:101})).toThrow(/100/);
 expect(()=>calculateRisk({...risk,side:'SELL'})).toThrow(/target < entry < stop/);
 for(const change of [{contractSize:0},{quoteToAccountRate:0},{minLots:1,maxLots:0.1},{lotStep:0},{accountCurrency:'usd'},{accountCurrency:'<x>'},{quoteCurrency:'US'},{quoteToAccountRate:4.5},{lotStep:0.000000001},{minLots:0.011,maxLots:0.019}])expect(()=>validateSpec({...spec,...change})).toThrow();
 expect(()=>calculateProfit({...profit,entry:Number.MAX_VALUE,exit:1,lots:100})).toThrow(/range/);
});
