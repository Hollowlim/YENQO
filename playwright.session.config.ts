import {defineConfig,devices} from '@playwright/test';
import {requireLocalTestDatabase} from './tests/support/test-database';
requireLocalTestDatabase();
const origin=process.env.APP_ORIGIN??'http://127.0.0.1:3117';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname))throw new Error('Session browser tests require a local app.');
export default defineConfig({testDir:'./tests/e2e',testMatch:'session-navigation.spec.ts',workers:1,timeout:60000,reporter:'list',outputDir:'.tools/session-test-results',use:{baseURL:origin,reducedMotion:'reduce'},projects:[
 {name:'session-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
 {name:'session-tablet',use:{...devices['Desktop Chrome'],viewport:{width:834,height:1112},hasTouch:true}},
 {name:'session-mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},hasTouch:true,isMobile:true}},
]});
