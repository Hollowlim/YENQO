// Captures representative portal layouts with explicitly illustrative content.
// No .env, credentials, sessions, database or external market feed is accessed.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { renderPage, safeAssetPath } from '../apps/web/server/render.js';

const user={id:'illustrative-preview',name:'YENGFX member',email:'example@example.test',role:'MEMBER',membership:{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:'illustrative-review',verifiedAt:new Date(0)}};
const routes={mapping:'/app/mapping',signals:'/app/signals',academy:'/app/academy',community:'/app/community'};
const server=createServer(async(request,response)=>{
  try{
    const path=new URL(request.url,'http://127.0.0.1').pathname;
    const asset=safeAssetPath(path);
    if(asset){response.setHeader('Content-Type',asset.endsWith('.css')?'text/css':asset.endsWith('.js')?'text/javascript':asset.endsWith('.ttf')?'font/ttf':asset.endsWith('.png')?'image/png':'image/webp');response.end(await readFile(new URL('../apps/web/public/'+asset,import.meta.url)));return;}
    if(!Object.values(routes).includes(path)){response.writeHead(404);response.end();return;}
    const html=await renderPage(path,user);
    response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html.replace('<html lang="en">','<html lang="en" data-offline-preview="true">'));
  }catch{response.writeHead(500);response.end('Preview could not render');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
await mkdir('apps/web/public/product',{recursive:true});
const styles=`
 .sidebar,.bottom-nav,.workspace-footer,.topbar-actions>[data-v2-collapse],.topbar-actions>.demo-badge,.v4-workspace-intro>img,.v4-research-method,.v4-module-navigation,.v4-signal-guide,.main-content>.page-heading,[data-editorial-status],[data-education-status],[data-community-access],.chat-room-sidebar{display:none!important}
 .workspace{margin:0!important;width:100%!important}.topbar{position:relative!important;top:auto!important;padding:10px 16px!important}.main-content{padding:17px!important;min-height:0!important}
 .v4-workspace-intro{min-height:0!important;margin-bottom:12px!important;padding:8px 0 18px!important}.v4-workspace-intro h1{font-size:29px!important;margin:10px 0!important}.v4-workspace-intro p{font-size:12px!important;line-height:1.6!important}.v4-workspace-intro>div{max-width:100%!important}
 .preview-label{font:10px Outfit,sans-serif;letter-spacing:.11em;text-align:center;padding:10px;color:#efd28d;background:#d5ac6611;border-bottom:1px solid #d5ac6638}.editorial-toolbar{gap:10px!important}.editorial-toolbar input{min-height:37px!important}.editorial-public-card{margin-top:14px!important;padding:20px!important}.editorial-public-card h2{font-size:24px!important;line-height:1.1!important}.editorial-description{font-size:14px!important;line-height:1.9!important}.editorial-levels{gap:9px!important}.editorial-levels dd{font-size:14px!important}
 [data-lessons]{display:block!important}.education-video-card{padding:22px!important}.education-video-card h2{font-size:22px!important}.preview-video{height:148px;display:grid;place-content:center;gap:9px;text-align:center;color:#edce8c;border:1px solid #d5ac6640;border-radius:8px;margin-top:18px;background:radial-gradient(ellipse at center,#d5ac6625,#09111b 70%);font:11px Outfit,sans-serif}.preview-play{font-size:33px}.preview-lesson-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.community-room{display:block!important}.chat-room-header{padding:16px!important}.chat-thread{min-height:680px!important}.community-message{padding:15px!important}.chat-messages{min-height:360px!important}.chat-thread:has([data-community-feed]){width:100%!important}
`;
const fixtures={
 mapping:`<article class="card editorial-public-card"><div class="editorial-meta"><span class="eyebrow">EXAMPLE GAME PLAN</span><span class="tag bias-sideway">SIDEWAY</span></div><h2>Read the structure.</h2><h3 class="editorial-section-label">Today's Game Plan</h3><p class="editorial-description">Mark your key areas before the session. Watch the reaction before forming a plan.</p><h3 class="editorial-section-label">What to prepare</h3><p class="editorial-description">Higher-timeframe context<br>Support &amp; resistance<br>Structure confirmation<br>Clear invalidation</p><p class="editorial-timestamp">Illustrative content • not today's analysis</p></article>`,
 signals:`<article class="card editorial-public-card"><div class="editorial-meta"><span class="eyebrow">XAUUSD / EXAMPLE FORMAT</span><span class="tag">MANUAL PLAN</span></div><h2>The plan, in one view.</h2><dl class="signal-levels editorial-levels"><div><dt>ENTRY ZONE</dt><dd>Published zone</dd></div><div><dt>SL</dt><dd>Invalidation</dd></div><div><dt>TP1</dt><dd>First target</dd></div><div><dt>TP2</dt><dd>Next target</dd></div><div><dt>TP3</dt><dd>Final target</dd></div></dl><p class="editorial-description">Follow the notes. Review the context. Make your own decision.</p><p class="editorial-timestamp">Illustrative field layout • no market prices shown</p></article>`,
 academy:`<div class="preview-lesson-grid">${[['01','Market structure','Understand the context.'],['02','Support & resistance','Build your preparation.'],['03','Risk discipline','Learn a consistent process.']].map(([n,title,description])=>`<article class="card education-video-card"><span class="eyebrow">EXAMPLE LESSON / ${n}</span><h2>${title}</h2><p>${description}</p><div class="preview-video"><span class="preview-play">▷</span><span>Video lesson layout</span></div></article>`).join('')}</div>`,
 community:`<div class="chat-date-divider">Example conversation</div><article class="community-message"><div class="community-message-meta"><strong>YENGFX Team</strong><span class="tag gold">ADMIN</span></div><p>Progress begins with discipline. Share what you learn and support one another.</p></article><article class="community-message is-own"><div class="community-message-meta"><strong>Member</strong></div><p>My preparation: map the key areas, then wait for confirmation.</p></article><article class="community-message"><div class="community-message-meta"><strong>YENGFX Team</strong></div><p>Stay patient. Every chart is a lesson.</p></article>`
};
try{
 for(const [name,path] of Object.entries(routes)){
  const tablet=name==='academy';const context=await browser.newContext({viewport:tablet?{width:1080,height:720}:{width:430,height:920},deviceScaleFactor:2,reducedMotion:'reduce'});
  const page=await context.newPage();await page.route('https://**',route=>route.abort());await page.goto(origin+path);await page.addStyleTag({content:styles});
  await page.evaluate(({name,markup})=>{
    const main=document.querySelector('main');const label=document.createElement('div');label.className='preview-label';label.textContent='INTERFACE PREVIEW • ILLUSTRATIVE CONTENT';main?.prepend(label);
    const selector=name==='academy'?'[data-lessons]':name==='community'?'[data-community-feed]':'[data-editorial-items]';const host=document.querySelector(selector);if(host)host.innerHTML=markup;
    const date=document.querySelector('[data-analysis-date]');if(date instanceof HTMLInputElement){date.type='text';date.value='Example plan';}
    document.querySelectorAll('button:disabled').forEach(button=>button.removeAttribute('disabled'));
  },{name,markup:fixtures[name]});
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`.tools/product-${name}.png`});
  await sharp(`.tools/product-${name}.png`).resize({width:tablet?1404:645}).webp({lossless:true}).toFile(`apps/web/public/product/${name}-preview.webp`);
  await context.close();
 }
 console.log('Captured four illustrative portal previews without reading or modifying customer data.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
