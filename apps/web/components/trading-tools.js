import {calculateProfit,calculateRisk,calculateRiskReward,XAUUSD_EXAMPLE} from '../../../packages/shared/trading-math.js';

const toolsRoot=document.querySelector('[data-trading-tools]');
if(toolsRoot instanceof HTMLElement){
 const root=toolsRoot;
 const formElement=root.querySelector('[data-tools-form]');
 if(!(formElement instanceof HTMLFormElement))throw Error('Calculator form unavailable');
 const form=formElement;
 const node=selector=>{const value=root.querySelector(selector);if(!(value instanceof HTMLElement))throw Error('Calculator element unavailable');return value;};
 const field=name=>{const value=form.querySelector(`[name="${name}"]`);if(!(value instanceof HTMLInputElement))throw Error('Calculator input unavailable');return value;};
 const number=name=>field(name).value.trim()===''?NaN:Number(field(name).value);
 const primary=node('[data-tools-primary]'),errorText=node('[data-tools-error]'),results=node('[data-tools-results]');
 const tabs=Array.from(root.querySelectorAll('[data-tool-tab]')).filter((tab)=>tab instanceof HTMLButtonElement);
 let view='profit',timer;
 const fmt=(value,digits=2)=>new Intl.NumberFormat('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
 const money=(value,currency)=>`${value<0?'−':''}${currency} ${fmt(Math.abs(value))}`;
 const lots=value=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:8}).format(value);
 function row(label,value){const wrapper=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;wrapper.append(term,detail);results.append(wrapper);}
 function calculate(){
  if(view==='mt5')return;
  results.replaceChildren();errorText.hidden=true;errorText.textContent='';node('[data-tools-notice]').textContent='';primary.className='yh-amount';
  try{
   const active=Array.from(form.querySelectorAll('input')).filter(input=>!input.matches(':disabled'));
   for(const input of active){const valid=input.validity.valid;input.setAttribute('aria-invalid',String(!valid));}
   if(!form.checkValidity()){
    const invalid=active.find(input=>!input.validity.valid);const label=invalid?.closest('label')?.textContent?.trim()??'Input';
    throw Error(`Check ${label.toLowerCase()}. Enter a complete value within the stated limits.`);
   }
   const checked=form.querySelector('input[name="side"]:checked');
   if(!(checked instanceof HTMLInputElement)||!['BUY','SELL'].includes(checked.value))throw Error('Choose BUY or SELL.');
   const side=/** @type {import('../../../packages/shared/trading-math.js').Side} */(checked.value);
   const spec={contractSize:number('contractSize'),minLots:number('minLots'),maxLots:number('maxLots'),lotStep:number('lotStep'),quoteToAccountRate:number('quoteToAccountRate'),accountCurrency:field('accountCurrency').value,quoteCurrency:field('quoteCurrency').value};
   const amount=value=>money(value,spec.accountCurrency);
   if(view==='profit'){
    const extra=number('profitCosts'),r=calculateProfit({side,entry:number('profitEntry'),exit:number('profitExit'),lots:number('profitLots'),extraCostsAccount:extra,spec});
    primary.textContent=amount(r.netAccount);primary.classList.add(r.netAccount>=0?'is-positive':'is-negative');
    row('Gross P&L',amount(r.grossAccount));row('Extra costs',amount(extra));row('Direction',side);row('Volume',lots(number('profitLots'))+' lots');
   }else if(view==='risk'){
    const r=calculateRisk({side,entry:number('riskEntry'),stop:number('riskStop'),target:number('riskTarget'),accountBalance:number('riskBalance'),riskPercent:number('riskPercent'),roundTripCostPerLotAccount:number('riskCost'),spec});
    primary.textContent=r.available?lots(r.lots)+' lots':'No valid position';row('Risk budget',amount(r.budget));
    if(r.available){row('Estimated loss at stop',amount(r.estimatedLoss));row('Estimated net target P&L',amount(r.estimatedProfit));row('Net reward / risk',fmt(r.riskReward)+' : 1');}
    node('[data-tools-notice]').textContent=r.message;
   }else{
    const r=calculateRiskReward({side,entry:number('rewardEntry'),stop:number('rewardStop'),target:number('rewardTarget'),lots:number('rewardLots'),roundTripCostPerLotAccount:number('rewardCost'),spec});
    primary.textContent=fmt(r.ratio)+' : 1';if(r.reward<=0)primary.classList.add('is-negative');
    row('Estimated loss at stop',amount(r.loss));row('Estimated net target P&L',amount(r.reward));row('Stop distance',fmt(r.stopDistance)+' '+spec.quoteCurrency);row('Target distance',fmt(r.targetDistance)+' '+spec.quoteCurrency);
    row('Theoretical break-even win rate',r.breakEvenWinRate===null?'Not applicable':fmt(r.breakEvenWinRate)+'%');
    node('[data-tools-notice]').textContent=r.reward<=0?'The target does not cover the entered costs.':'Break-even rate assumes identical outcomes and entered costs. It is not a predicted win rate.';
   }
  }catch(error){primary.textContent='—';results.replaceChildren();errorText.hidden=false;errorText.textContent=error instanceof Error?error.message:'Check your inputs.';}
 }
 let checking=false;
 async function checkSnapshot(){
  const message=node('[data-tools-mt5-status]'),button=node('[data-tools-check]');
  if(checking)return;
  if(window.location.protocol==='file:'||document.documentElement.dataset.offlinePreview==='true'){message.textContent='Offline preview only. No broker connection or account snapshot is available.';return;}
  checking=true;button.setAttribute('disabled','');message.textContent='Checking your account connection status…';
  try{
   const response=await fetch('/api/tools/mt5-snapshot',{credentials:'same-origin',cache:'no-store',signal:window.AbortSignal.timeout(8000)});
   if(response.status===401){message.textContent='Your session has expired. Sign in again to check account status.';return;}
   if(!response.ok)throw Error('unavailable');
   const data=await response.json();
   if(data.status!=='disconnected'||data.snapshot!==null||data.tradingEnabled!==false)throw Error('unverified');
   message.textContent='No paired MT5 device. Secure read-only pairing is not available in this release.';
  }catch{message.textContent='Connection status is unavailable. No broker connection was confirmed.';}
  finally{checking=false;button.removeAttribute('disabled');}
 }
 function select(tab){
  const next=tab.dataset.toolTab;if(!['profit','risk','reward','mt5'].includes(next))return;view=next;
  for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;}
  const calculator=node('#yh-calculator-panel'),mt5=node('#yh-mt5-panel');calculator.hidden=view==='mt5';mt5.hidden=view!=='mt5';
  calculator.setAttribute('aria-labelledby',tab.id);
  for(const fields of root.querySelectorAll('[data-tools-fields]'))if(fields instanceof window.HTMLFieldSetElement){fields.hidden=fields.dataset.toolsFields!==view;fields.disabled=fields.hidden;}
  const titles={profit:'Profit & Loss Calculator',risk:'Risk & Lot Size Calculator',reward:'Risk / Reward Calculator'};
  const captions={profit:'Estimated net profit / loss',risk:'Position size · rounded down',reward:'Net reward for each 1 unit of risk'};
  if(view==='mt5'){void checkSnapshot();return;}
  node('[data-tools-title]').textContent=titles[view];node('[data-tools-caption]').textContent=captions[view];calculate();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(tab));
  tab.addEventListener('keydown',event=>{
   let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
   event.preventDefault();tabs[next].focus();select(tabs[next]);
  });
 });
 form.addEventListener('submit',event=>event.preventDefault());
 form.addEventListener('input',event=>{const input=event.target;if(input instanceof HTMLInputElement&&['quoteCurrency','accountCurrency'].includes(input.name))input.value=input.value.toUpperCase();window.clearTimeout(timer);timer=window.setTimeout(calculate,120);});
 form.addEventListener('change',calculate);
 node('[data-tools-example]').addEventListener('click',()=>{
  for(const [key,value]of Object.entries(XAUUSD_EXAMPLE))field(key).value=String(value);
  const values=view==='profit'?{profitEntry:4000,profitExit:4005,profitLots:0.1,profitCosts:0}:view==='risk'?{riskBalance:1000,riskPercent:1,riskEntry:4000,riskStop:3992,riskTarget:4016,riskCost:0}:{rewardEntry:4000,rewardStop:3992,rewardTarget:4016,rewardLots:0.1,rewardCost:0};
  for(const [key,value]of Object.entries(values))field(key).value=String(value);
  const buy=form.querySelector('input[name="side"][value="BUY"]');if(buy instanceof HTMLInputElement)buy.checked=true;calculate();
 });
 node('[data-tools-check]').addEventListener('click',()=>void checkSnapshot());
 calculate();
}
