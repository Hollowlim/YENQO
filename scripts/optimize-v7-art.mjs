// Resolution/format optimization of existing approved decorative assets only.
// No new logo, generated scene, image editing model, environment or private data.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
await mkdir('apps/web/public/homepage-v7',{recursive:true});
for(const [source,name,width,quality]of [['v4-scene-rock.webp','rock',420,84],['v4-earth-texture.webp','planet',960,76]]){
 const output=await sharp(await readFile('apps/web/public/'+source)).resize({width,withoutEnlargement:true}).webp({quality}).toBuffer();
 await writeFile('apps/web/public/homepage-v7/'+name+'.webp',output);console.log(`${name}.webp: ${output.length} bytes`);
}
