import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'clean-portals.spec.ts',workers:1,use:{browserName:'chromium',reducedMotion:'reduce'},projects:[
 {name:'clean-desktop',use:{viewport:{width:1440,height:1000}}},
 {name:'clean-tablet',use:{viewport:{width:834,height:1112},hasTouch:true}},
 {name:'clean-mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]});
