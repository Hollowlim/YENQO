import {defineConfig} from '@playwright/test';
import {loadEnvFile} from 'node:process';
import {requireLocalTestDatabase} from './tests/support/test-database';
try{loadEnvFile('.env');}catch{/* Supplied environment is supported. */}
requireLocalTestDatabase();
export default defineConfig({testDir:'./tests/e2e',testMatch:'trading-tools.spec.ts',workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:3117',browserName:'chromium',reducedMotion:'reduce'},projects:[
 {name:'tools-desktop',use:{viewport:{width:1440,height:1000}}},
 {name:'tools-tablet',use:{viewport:{width:834,height:1112},hasTouch:true}},
 {name:'tools-mobile',use:{viewport:{width:390,height:844},hasTouch:true,isMobile:true}},
]});
