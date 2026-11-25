import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { expect, it } from 'vitest';

it('provides isolated rock silhouettes with transparent surrounds at the source artwork resolution',async()=>{
  const original=await sharp('apps/web/public/v4-hero-emblem.webp').metadata();
  const clean=await sharp('apps/web/public/v4-hero-clean.webp').metadata();
  const sprite=sharp('apps/web/public/v4-hero-rocks.webp');
  const metadata=await sprite.metadata();
  expect([clean.width,clean.height]).toEqual([original.width,original.height]);
  expect([metadata.width,metadata.height]).toEqual([original.width,original.height]);
  expect(metadata.hasAlpha).toBe(true);
  const {data,info}=await sprite.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const layout=JSON.parse(await readFile('apps/web/components/hero-rock-layout.json','utf8')) as {source:number[],placement:number[],hole:number[]}[];
  expect(layout.length).toBeGreaterThan(4);
  for(const rock of layout){
    const [cx,cy,rx,ry]=rock.source;
    const left=Math.floor(cx-rx),top=Math.floor(cy-ry),right=Math.ceil(cx+rx),bottom=Math.ceil(cy+ry);
    expect(left).toBeGreaterThanOrEqual(0);expect(top).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(info.width);expect(bottom).toBeLessThanOrEqual(info.height);
    let solid=0,transparent=0;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const alpha=data[(y*info.width+x)*4+3];
      if(alpha>200)solid++;if(alpha<10)transparent++;
    }
    // A valid sprite has a detailed object and genuinely empty space around it.
    expect(solid).toBeGreaterThan(100);
    expect(transparent).toBeGreaterThan((right-left)*(bottom-top)*.05);
    expect(rock.placement[2]).toBeGreaterThan(0);
  }
});
