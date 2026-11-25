/** Adapted from the supplied YENGHUB Trading Tools Starter, trading-math.ts.
 * Linear contract estimates only. No quotes, account access or order methods.
 * @typedef {'BUY'|'SELL'} Side
 * @typedef {{contractSize:number,minLots:number,maxLots:number,lotStep:number,quoteToAccountRate:number,accountCurrency:string,quoteCurrency?:string}} SymbolSpec
 * @typedef {{side:Side,entry:number,exit:number,lots:number,extraCostsAccount:number,spec:SymbolSpec}} ProfitInput
 * @typedef {{side:Side,accountBalance:number,riskPercent:number,entry:number,stop:number,target:number,roundTripCostPerLotAccount:number,spec:SymbolSpec}} RiskInput
 * @typedef {{side:Side,entry:number,stop:number,target:number,lots:number,roundTripCostPerLotAccount:number,spec:SymbolSpec}} RewardInput
 */
const scale=100000000;
function positive(value,label){if(!Number.isFinite(value)||value<=0)throw Error(`${label} must be above zero.`);}
function nonNegative(value,label){if(!Number.isFinite(value)||value<0)throw Error(`${label} cannot be negative or non-finite.`);}
function sideSign(side){if(!['BUY','SELL'].includes(side))throw Error('Choose BUY or SELL.');return side==='BUY'?1:-1;}
function finiteResult(value){if(!Number.isFinite(value))throw Error('These inputs exceed the supported calculation range.');return value;}
/** @param {SymbolSpec} spec */
export function validateSpec(spec){
 for(const [key,label]of [['contractSize','Contract size'],['minLots','Minimum lots'],['maxLots','Maximum lots'],['lotStep','Lot step'],['quoteToAccountRate','Quote-to-account conversion rate']])positive(spec[key],label);
 if(spec.maxLots<spec.minLots)throw Error('Maximum lots must be >= minimum lots.');
 if(!/^[A-Z]{3}$/.test(spec.accountCurrency)||!/^[A-Z]{3}$/.test(spec.quoteCurrency??'USD'))throw Error('Use a three-letter uppercase currency code.');
 if((spec.quoteCurrency??'USD')===spec.accountCurrency&&spec.quoteToAccountRate!==1)throw Error('Use conversion rate 1 when quote and account currencies match.');
 if(spec.lotStep<1/scale||Math.abs(spec.lotStep*scale-Math.round(spec.lotStep*scale))>1e-6||spec.maxLots*scale>Number.MAX_SAFE_INTEGER)throw Error('Supported lot settings use at most 8 decimal places and safe numeric volumes.');
 if(Math.ceil(spec.minLots/spec.lotStep-1e-9)>Math.floor(spec.maxLots/spec.lotStep+1e-9))throw Error('No valid lot step fits the broker minimum and maximum.');
}
function validVolume(lots,spec){
 positive(lots,'Lots');
 if(lots<spec.minLots||lots>spec.maxLots)throw Error('Volume is outside broker min/max.');
 const steps=lots/spec.lotStep;
 if(Math.abs(steps-Math.round(steps))>1e-7)throw Error('Lot volume must follow broker lot step.');
}
function pricePlan(side,entry,stop,target){
 sideSign(side);for(const price of [entry,stop,target])positive(price,'Price');
 if(side==='BUY'&&!(stop<entry&&target>entry)||side==='SELL'&&!(stop>entry&&target<entry))throw Error(side==='BUY'?'For BUY: stop < entry < target.':'For SELL: target < entry < stop.');
}
/** @param {ProfitInput} input */
export function calculateProfit({side,entry,exit,lots,extraCostsAccount,spec}){
 validateSpec(spec);const sign=sideSign(side);positive(entry,'Entry price');positive(exit,'Exit price');validVolume(lots,spec);nonNegative(extraCostsAccount,'Extra costs');
 const grossQuote=finiteResult((exit-entry)*sign*spec.contractSize*lots);
 const grossAccount=finiteResult(grossQuote*spec.quoteToAccountRate);
 return {grossQuote,grossAccount,netAccount:finiteResult(grossAccount-extraCostsAccount),accountCurrency:spec.accountCurrency};
}
/** @param {RiskInput} input */
export function calculateRisk({side,accountBalance,riskPercent,entry,stop,target,roundTripCostPerLotAccount,spec}){
 validateSpec(spec);pricePlan(side,entry,stop,target);positive(accountBalance,'Balance');positive(riskPercent,'Risk percentage');
 if(riskPercent>100)throw Error('Risk cannot be greater than 100%.');nonNegative(roundTripCostPerLotAccount,'Round-trip cost per lot');
 const budget=finiteResult(accountBalance*riskPercent/100);
 const riskPerLot=finiteResult(Math.abs(entry-stop)*spec.contractSize*spec.quoteToAccountRate+roundTripCostPerLotAccount);
 const desired=finiteResult(budget/riskPerLot),ratio=Math.min(desired,spec.maxLots)/spec.lotStep;
 let ticks=Math.floor(ratio);
 const stepUnits=Math.round(spec.lotStep*scale);
 const volume=(count=ticks)=>count*stepUnits/scale;
 // Correct floating-point boundaries against actual cost, never by adding a
 // size-dependent epsilon which could round multiple steps over budget.
 while(ticks>0&&(volume()>spec.maxLots||volume()*riskPerLot>budget))ticks--;
 if(volume(ticks+1)<=spec.maxLots&&volume(ticks+1)*riskPerLot<=budget)ticks++;
 const lots=volume();
 if(lots<spec.minLots||lots<=0)return {available:false,budget,desiredLots:desired,lots:0,estimatedLoss:0,estimatedProfit:0,riskReward:0,message:'Risk budget below broker minimum lot; do not increase risk to force a trade.'};
 const estimatedLoss=finiteResult(lots*riskPerLot);
 const estimatedProfit=finiteResult(lots*(Math.abs(target-entry)*spec.contractSize*spec.quoteToAccountRate-roundTripCostPerLotAccount));
 return {available:true,budget,desiredLots:desired,lots,estimatedLoss,estimatedProfit,riskReward:finiteResult(estimatedProfit/estimatedLoss),message:estimatedProfit<=0?'The target does not cover the entered costs.':'Volume rounded down to the broker step. Gaps and slippage can exceed this estimated loss.'};
}
/** @param {RewardInput} input */
export function calculateRiskReward({side,entry,stop,target,lots,roundTripCostPerLotAccount,spec}){
 validateSpec(spec);pricePlan(side,entry,stop,target);validVolume(lots,spec);nonNegative(roundTripCostPerLotAccount,'Round-trip cost per lot');
 const loss=finiteResult((Math.abs(entry-stop)*spec.contractSize*spec.quoteToAccountRate+roundTripCostPerLotAccount)*lots);
 const reward=finiteResult((Math.abs(target-entry)*spec.contractSize*spec.quoteToAccountRate-roundTripCostPerLotAccount)*lots);
 return {loss,reward,ratio:finiteResult(reward/loss),stopDistance:Math.abs(entry-stop),targetDistance:Math.abs(target-entry),breakEvenWinRate:reward>0?loss/(loss+reward)*100:null};
}
/** Example specification, never a detected broker contract. @type {Readonly<SymbolSpec>} */
export const XAUUSD_EXAMPLE=Object.freeze({contractSize:100,minLots:0.01,maxLots:100,lotStep:0.01,quoteToAccountRate:1,accountCurrency:'USD',quoteCurrency:'USD'});
