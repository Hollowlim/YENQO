// Native UI previews: synthetic account, no environment/database or customer records.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {renderPage,safeAssetPath} from '../apps/web/server/render.js';

const user={id:'launch-example',name:'Example member',email:'example@example.test',role:'MEMBER',membership:{status:'APPROVED',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:'example-reviewer',verifiedAt:new Date(0)}};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname,asset=safeAssetPath(path);
  if(asset){res.setHeader('Content-Type',asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':asset.endsWith('.ttf')?'font/ttf':'image/webp');res.end(await readFile(new URL('../apps/web/public/'+asset,import.meta.url)));return;}
  if(!['/app/academy','/app/settings'].includes(path)){res.writeHead(404);res.end();return;}
  const html=await renderPage(path,user);res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html.replace('<html lang="en">','<html lang="en" data-offline-preview="true">'));
 }catch{res.writeHead(500);res.end('Preview unavailable');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
try{
 await mkdir('apps/web/public/product',{recursive:true});
 for(const [path,name] of [['academy','education-phone'],['settings','settings']]){
  const page=await browser.newPage({viewport:{width:430,height:920},deviceScaleFactor:2,reducedMotion:'reduce'});
  await page.route('https://**',route=>route.abort());await page.goto(origin+'/app/'+path);
  await page.addStyleTag({content:'.sidebar,.bottom-nav,.workspace-footer,.topbar{display:none!important}.workspace{margin:0!important;width:100%!important}.main-content{padding:20px!important}.page-heading h1{font-size:30px!important}.profile-card{max-height:360px!important}.profile-card-portrait{height:200px!important}.v4-workspace-intro{min-height:0!important}.v4-workspace-intro h1{font-size:30px!important}.launch-preview-label{font:10px Manrope,sans-serif;padding:12px;background:#25231b;border:1px solid #685c41;color:#e6cc99;text-align:center;margin-bottom:18px}.education-video-card h2{font-size:24px}.launch-video-placeholder{height:170px;border:1px solid #65563c;background:#1d2328;border-radius:12px;display:grid;place-items:center;color:#dec18b;font:18px Manrope,sans-serif;margin-top:20px}'});
  await page.evaluate(path=>{
   const main=document.querySelector('main'),label=document.createElement('div');label.className='launch-preview-label';label.textContent='INTERFACE PREVIEW \u2022 ILLUSTRATIVE CONTENT';main?.prepend(label);
   if(path==='academy'){
    const lessons=document.querySelector('[data-lessons]');if(lessons)lessons.innerHTML='<article class="card education-video-card"><span class="eyebrow">EXAMPLE LESSON</span><h2>Build your understanding.</h2><p>Video education published by YENGFX for verified members.</p><div class="launch-video-placeholder">&#9655; Video lesson layout</div><p>Illustrative lesson &bull; actual lessons depend on publication.</p></article>';
   }else document.querySelectorAll('input').forEach(input=>{if(input.name==='name')input.value='Example member';if(input.name==='email')input.value='example@example.test';});
  },path);
  await page.evaluate(()=>document.fonts.ready);
  await sharp(await page.screenshot()).resize({width:645}).webp({lossless:true}).toFile(`apps/web/public/product/${name}-preview.webp`);
  await page.close();
 }
 console.log('Created two clearly illustrative launch previews.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
