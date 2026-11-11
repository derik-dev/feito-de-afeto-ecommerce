import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Informe a pasta das imagens geradas.');
const assets = {
  hero: 'exec-def007ec-06ad-4fdd-a1b6-ea35ca7ddc0e.png',
  'hero-mobile': 'exec-03ada632-0ac4-4a57-914a-bb71216cd4ae.png',
  collection: 'exec-799e3736-6a43-4a5e-86fe-9276299f68e5.png',
  floral: 'exec-7307067d-cd41-4f4a-85dd-a7ad6092a9b4.png',
  financial: 'exec-316cbbe7-27af-414b-82f1-f77dbba1e8e9.png',
  studies: 'exec-94feb817-aa6c-4373-ad3d-3ed7bedee631.png',
  minimal: 'exec-f9132cc9-ce7e-41c8-a68a-1f2babc63d4b.png',
  atelier: 'exec-3d3845bb-a7f5-4675-b522-85f8576ccda3.png',
};
await mkdir('public/images', { recursive: true });
for (const [name, file] of Object.entries(assets)) {
  const output = path.join('public/images', name + '.webp');
  await sharp(path.join(source, file)).resize({ width: ['hero', 'hero-mobile', 'collection', 'atelier'].includes(name) ? 1536 : 768, withoutEnlargement: true }).webp({ quality: 87 }).toFile(output);
  console.log(`${output}: ${Math.round((await stat(output)).size / 1024)} KB`);
}
