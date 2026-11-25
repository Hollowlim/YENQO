// Capture the actual current member layout. No credentials, environment, API or database.
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
await mkdir('apps/web/public/homepage-v7',{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:832},deviceScaleFactor:1.5,reducedMotion:'reduce'});
 await page.route('https://**',route=>route.abort());
 await page.goto(pathToFileURL(resolve('apps/web/pages/member/overview.html')).href);
 await page.addStyleTag({content:'.offline-banner{display:none!important}'});
 await page.evaluate(()=>document.fonts.ready);
 await sharp(await page.screenshot()).resize({width:1600}).webp({quality:92}).toFile('apps/web/public/homepage-v7/member-workspace.webp');
 console.log('Captured current member layout: 1600 x 1040 illustrative offline account.');
}finally{await browser.close();}
