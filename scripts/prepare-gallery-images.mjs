import sharp from 'sharp';
import { homedir } from 'node:os';
import { join } from 'node:path';
const source = join(homedir(), '.codex/generated_images/01a15815-234c-7570-b80d-57dbb8157f7f');
for (const [name, file] of [
  ['tools', 'exec-33298c71-7f35-414a-9032-fbea2183ee1d.png'],
  ['analysis', 'exec-1e4919e9-47e2-4dfa-9dde-e51802fd40e1.png'],
  ['education', 'exec-cc97c14b-28d4-4588-a765-815ea8af5c22.png'],
]) {
  await sharp(join(source, file)).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`apps/web/public/gallery-${name}.webp`);
  console.log(`Saved gallery-${name}.webp`);
}
