import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'account-settings.spec.ts',workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:3117',browserName:'chromium',reducedMotion:'reduce'},projects:[
 {name:'settings-desktop',use:{viewport:{width:1440,height:1000}}},
 {name:'settings-tablet',use:{viewport:{width:834,height:1112},hasTouch:true}},
 {name:'settings-mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]});
