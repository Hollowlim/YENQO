import {readFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
it('separates the real index launcher from the explicitly offline demo',async()=>{
 const index=await readFile('apps/web/pages/index.html','utf8'),demo=await readFile('apps/web/pages/demo-preview.html','utf8');
 expect(index).toContain('data-local-entry');expect(index).toContain('local-entry.js');
 expect(index).not.toContain('data-offline-preview="true"');expect(index).not.toContain('offline-banner');
 for(const path of ['/auth/login','/auth/register','/admin'])expect(index).toContain(`href="http://127.0.0.1:3000${path}"`);
 expect(index).not.toContain('href="auth/login.html"');expect(index).not.toContain('href="demo-preview.html"');
 expect(demo).toContain('data-offline-preview="true"');expect(demo).toContain('offline-banner');expect(demo).not.toContain('local-entry.js');
 expect(demo).toContain('href="auth/login.html"');
});
