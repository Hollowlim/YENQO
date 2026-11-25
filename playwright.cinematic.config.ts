import { defineConfig } from '@playwright/test';
// File-only presentation checks: no app server, environment secrets or database access.
export default defineConfig({testDir:'./tests/e2e',testMatch:['v4-design.spec.ts','product-home.spec.ts'],workers:1,use:{browserName:'chromium',launchOptions:{args:['--enable-unsafe-swiftshader']}},projects:[
  {name:'desktop',use:{viewport:{width:1440,height:1000}}},
  {name:'desktop-wide',use:{viewport:{width:2249,height:1141}}},
  {name:'full-hd',use:{viewport:{width:1920,height:1080}}},
  {name:'laptop',use:{viewport:{width:1024,height:900}}},
  {name:'ipad',use:{viewport:{width:834,height:1112}}},
  {name:'mobile',use:{viewport:{width:390,height:844}}},
  {name:'phone-small',use:{viewport:{width:375,height:812}}},
  {name:'phone-wide',use:{viewport:{width:691,height:900}}},
  {name:'phone-tall',use:{viewport:{width:691,height:1290}}},
]});
