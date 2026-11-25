import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';import {renderPage} from '../../apps/web/server/render.js';
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
it('keeps public homepage, every Admin render and all unrelated source bytes unchanged',async()=>{
 const before=JSON.parse(await readFile('docs/TRADING_TOOLS_BASELINE.json','utf8')) as {files:Record<string,string>,renders:Record<string,string>};
 const yenqo=JSON.parse(await readFile('docs/YENQO_REBRAND_BASELINE.json','utf8')) as Record<string,string>;
 const allowed=['apps/web/server/index.js','apps/web/server/render.js','apps/web/server/membership-policy.js','apps/web/templates/portal-member-navigation.html'];
 for(const[file,hash]of Object.entries(before.files))if(!allowed.includes(file))expect(sha(await readFile(file)),file).toBe(yenqo[file]??hash);
 for(const[path,hash]of Object.entries(before.renders)){const user=path==='/'?null:{id:'tools-preservation',role:'ADMIN',name:'Example member',email:'example@example.test'};expect(sha((await renderPage(path,user))??'unavailable'),path).toBe(yenqo['tools-render:'+path]??hash);}
});
it('loads calculator assets only in Tools and never renders trade controls or shared bridge credentials',async()=>{
 const free={id:'synthetic-free',name:'Example',email:'example@example.test',role:'MEMBER',membership:null};
 const tools=(await renderPage('/app/mt5',free))!;expect(tools).toContain('/assets/trading-tools.js');expect(tools).toContain('/assets/trading-tools.css');expect(tools).not.toMatch(/data-trade-action|name="investorPassword"|127\.0\.0\.1:8787|YENG_MT5_BRIDGE_TOKEN/);
 for(const path of ['/','/auth/login','/app/settings','/admin','/admin/settings'])expect(await renderPage(path,path==='/'?null:{...free,role:'ADMIN'}),path).not.toContain('/assets/trading-tools.');
});
