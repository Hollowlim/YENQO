import {expect,it} from 'vitest';
const base=process.env.APP_ORIGIN??'http://127.0.0.1:3000';
it('returns 404 for deferred HTTP pages and read/write APIs before dispatch',async()=>{
 for(const route of ['/app/mapping','/app/signals','/app/signals/demo-structure','/app/community','/admin/mapping','/admin/signals']){
  const response=await fetch(base+route,{redirect:'manual'});expect(response.status,route).toBe(404);
 }
 for(const route of ['/api/content/analysis','/api/content/signals','/api/admin/analysis','/api/admin/signals','/api/community/messages','/api/community/reports','/api/community/messages/example/image']){
  for(const method of ['GET','POST']){
   const response=await fetch(base+route,{method,redirect:'manual'});expect(response.status,method+route).toBe(404);
   expect(await response.json()).toEqual({message:'This module is not available in this release.'});
  }
 }
 expect((await fetch(base+'/api/membership/me')).status).toBe(401);
 expect((await fetch(base+'/app/settings',{redirect:'manual'})).headers.get('location')).toContain('/auth/login');
});
