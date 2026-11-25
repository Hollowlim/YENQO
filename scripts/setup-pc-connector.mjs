import '../apps/web/server/env.js';
import {generateKeyPairSync,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {mkdir,readFile,writeFile,access} from 'node:fs/promises';import {resolve} from 'node:path';import {db} from '../apps/web/server/db.js';import {newToken,digestToken} from '../apps/web/server/security.js';
const root=resolve('.private-pc-connector'),file=resolve(root,'worker.dpapi');let stage='preflight';
const rotate=process.argv.includes('--rotate');
try{
 if(process.platform!=='win32')throw new Error('Windows is required.');
 try{await access(file);if(!rotate)throw new Error('A connector is already configured. Use --rotate to replace it explicitly.');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(rotate)execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/pc-connector.ps1'),'-Action','stop'],{stdio:'pipe'});
 const terminalPath=process.argv.slice(2).find(value=>!value.startsWith('--'))??'C:/Program Files/JustMarkets MetaTrader 5/terminal64.exe';await access(terminalPath);
 const origin=process.env.APP_ORIGIN??'http://127.0.0.1:3000',url=new URL(origin);if(url.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('HTTPS is required outside localhost.');
 stage='directory-permissions';await mkdir(root,{recursive:true});execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/protect-pc-directory.ps1'),'-Target',root],{stdio:'pipe'});
 stage='key-generation';const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:4096,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}),token=newToken(),id=randomUUID();
 const secret=Buffer.from(JSON.stringify({privateKey,token,id,origin,terminalPath:resolve(terminalPath)}),'utf8');
 const protection="Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))";
 stage='windows-protection';const protectedData=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',protection],{input:secret.toString('base64'),encoding:'utf8',windowsHide:true}).trim();secret.fill(0);
 stage='database-registration';await db.$transaction(async tx=>{
  if(rotate&&process.env.PC_CONNECTOR_ID){await tx.pcConnector.updateMany({where:{id:process.env.PC_CONNECTOR_ID},data:{enabled:false}});await tx.pcBrokerAccount.updateMany({where:{connectorId:process.env.PC_CONNECTOR_ID},data:{state:'REVOKED',sealedPassword:null,secretExpiresAt:null,leaseHash:null,leaseUntil:null,generation:{increment:1},version:{increment:1}}});}
  await tx.pcConnector.create({data:{id,tokenHash:digestToken(token),publicKey}});await tx.auditEvent.create({data:{action:rotate?'PC_CONNECTOR_ROTATED':'PC_CONNECTOR_PROVISIONED',targetId:id}});
 });
 stage='private-config';await writeFile(file,protectedData+'\n',{flag:rotate?'w':'wx'});
 stage='server-config';let env=await readFile('.env','utf8');for(const [name,value]of [['PC_CONNECTOR_ID',id],['PC_CONNECTOR_ENABLED','true'],['PC_CONNECTOR_ALLOW_REAL_READONLY','false']]){const expression=new RegExp('^'+name+'=.*$','m');env=expression.test(env)?env.replace(expression,name+'='+value):env+'\n'+name+'='+value;}
 await writeFile('.env',env.endsWith('\n')?env:env+'\n');
 console.log('Read-only PC connector configured. Keys are protected by this Windows login; no token or private key was printed. Restart the website, then use START_PC_CONNECTOR.cmd. Demo-account validation is required first.');
}catch(error){console.error(error instanceof Error&&['Windows is required.','HTTPS is required outside localhost.'].includes(error.message)?error.message:'Connector setup did not complete at '+stage+'. Check private setup and Windows permissions. No secrets were printed.');process.exitCode=1;}finally{await db.$disconnect();}
