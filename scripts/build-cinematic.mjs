import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
await build({entryPoints:['apps/web/components/cinematic-scene.js'],outfile:'apps/web/public/cinematic-scene.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'eof',banner:{js:'/* Generated from components/cinematic-scene.js. Three.js is MIT licensed. */'}});
// Embed the public decorative map so local file previews can upload it to WebGL
// without file-origin canvas restrictions. No environment or private data is read.
const [earthSource, earthTexture] = await Promise.all([
  readFile('apps/web/components/earth-renderer.js', 'utf8'),
  readFile('apps/web/public/v4-earth-texture.webp'),
]);
const globeMap = await sharp(earthTexture).resize({width:1280,withoutEnlargement:true}).webp({quality:84}).toBuffer();
await build({
  stdin: { contents: earthSource.replace('__EARTH_TEXTURE_DATA__', `data:image/webp;base64,${globeMap.toString('base64')}`), loader:'js' },
  outfile:'apps/web/public/earth-renderer.js',format:'iife',platform:'browser',target:'es2022',minify:true,
  banner:{js:'/* Generated from components/earth-renderer.js with the public Earth texture. */'},
});
const heroSource=await readFile('apps/web/components/hero-art-renderer.js','utf8');
const heroTexture=await readFile('apps/web/public/v4-hero-emblem.webp');
const cleanTexture=await readFile('apps/web/public/v4-hero-clean.webp');
const rockTexture=await readFile('apps/web/public/v4-hero-rocks.webp');
const rockLayout=JSON.parse(await readFile('apps/web/components/hero-rock-layout.json','utf8'));
await build({stdin:{contents:heroSource.replace('__HERO_ART_DATA__',`data:image/webp;base64,${heroTexture.toString('base64')}`).replace('__HERO_CLEAN_DATA__',`data:image/webp;base64,${cleanTexture.toString('base64')}`).replace('__HERO_ROCK_DATA__',`data:image/webp;base64,${rockTexture.toString('base64')}`).replace('__HERO_ROCK_LAYOUT__',JSON.stringify(rockLayout)),loader:'js'},outfile:'apps/web/public/hero-art-renderer.js',format:'iife',platform:'browser',target:'es2022',minify:true,banner:{js:'/* Generated from components/hero-art-renderer.js using the approved public artwork and isolated rocks. */'}});
