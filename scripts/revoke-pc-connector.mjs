import '../apps/web/server/env.js';import {db} from '../apps/web/server/db.js';
try{
 const id=process.env.PC_CONNECTOR_ID;if(!id)throw new Error();
 await db.$transaction(async tx=>{await tx.pcConnector.updateMany({where:{id},data:{enabled:false}});await tx.pcBrokerAccount.updateMany({where:{connectorId:id},data:{state:'REVOKED',sealedPassword:null,secretExpiresAt:null,leaseHash:null,leaseUntil:null,generation:{increment:1},version:{increment:1}}});await tx.auditEvent.create({data:{action:'PC_CONNECTOR_REVOKED',targetId:id}});});
 console.log('PC connector revoked. Its token can no longer poll or submit history. Stop the local worker and rotate credentials before enabling a replacement.');
}catch{console.error('Revocation could not be confirmed. Check private database access; no secrets were printed.');process.exitCode=1;}finally{await db.$disconnect();}
