import {build} from 'esbuild';
await build({entryPoints:['apps/web/components/trading-tools.js'],outfile:'apps/web/public/trading-tools.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,banner:{js:'/* Generated from components/trading-tools.js and packages/shared/trading-math.js. */'}});
