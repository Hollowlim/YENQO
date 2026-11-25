import {communityApi} from '../../apps/web/server/community-routes.js';
import {editorialApi} from '../../apps/web/server/editorial-routes.js';

// Keep database/security regression coverage for deferred implementations. These
// calls deliberately bypass HTTP dispatch; launch-policy.test.ts proves that
// the public server exposes none of these archived controllers in this release.
export async function archivedController(url:string,init:RequestInit={}){
 const request=new Request(url,init);
 const handler=new URL(url).pathname.startsWith('/api/community/')?communityApi:editorialApi;
 const response=await handler(request);
 if(!response)throw new Error('Archived test requested an unknown controller route');
 return response;
}
