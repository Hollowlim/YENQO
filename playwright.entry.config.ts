import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'real-index-entry.spec.ts',workers:1,reporter:'list',projects:[{name:'entry-desktop',use:{viewport:{width:1440,height:1000}}},{name:'entry-mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]});
