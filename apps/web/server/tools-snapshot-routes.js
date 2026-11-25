import {currentUser} from './auth.js';
import {jsonResponse} from './http.js';
import {takeRateLimit} from './rate-limit.js';

// Preparation endpoint only. No bridge destination, global terminal or provider
// credential is accepted. Future snapshots must resolve a paired device by user.id.
export function createToolsSnapshotApi({principal=currentUser,rateLimit=takeRateLimit}={}){
 return async request=>{
  try{
   const user=await principal(request);
   if(!user)return jsonResponse({message:'Sign in required.'},401);
   if(request.method!=='GET')return jsonResponse({message:'Method not allowed.'},405);
   if(new URL(request.url).search)return jsonResponse({message:'Account selectors are not accepted.'},400);
   if(!await rateLimit('tools-snapshot',user.id,30,60))return jsonResponse({message:'Too many requests. Try again shortly.'},429);
   return jsonResponse({status:'disconnected',source:null,snapshot:null,asOf:null,tradingEnabled:false,pairingAvailable:false,message:'No paired MT5 device. Secure read-only pairing is not available in this release.'});
  }catch{return jsonResponse({message:'Account status is unavailable. No broker connection was confirmed.'},503);}
 };
}
export const toolsSnapshotApi=createToolsSnapshotApi();
