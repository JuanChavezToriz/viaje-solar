import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('public/assets');
for (const path of ['earth', 'environment', 'textures', 'runtime/glslang', 'runtime/twgsl']) await mkdir(`${root}/${path}`, { recursive: true });
const maps = ['daymap', 'nightmap', 'clouds'];
for (const map of maps) {
  const url = `https://www.solarsystemscope.com/textures/download/2k_earth_${map}.jpg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error(`Invalid JPEG: ${map}`);
  await writeFile(`${root}/earth/${map}.jpg`, bytes);
}
for (const tool of ['glslang', 'twgsl']) for (const ext of ['js', 'wasm']) {
  await copyFile(`node_modules/@babylonjs/core/assets/${tool}/${tool}.${ext}`, `${root}/runtime/${tool}/${tool}.${ext}`);
}
await copyFile('node_modules/@babylonjs/core/license.md', `${root}/runtime/BABYLON-LICENSE.md`);
await copyFile('node_modules/@babylonjs/core/NOTICE.md', `${root}/runtime/BABYLON-NOTICE.md`);
// Original HDR studio light rig. No photographic environment or remote render.
const width = 512, height = 256, pixels = Buffer.alloc(width * height * 4);
const smoothBox = (value, center, halfWidth, softness) => Math.exp(-Math.pow(Math.abs(value - center) / halfWidth, softness));
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const u = x / width, v = y / height;
  const key = smoothBox(u, .30, .045, 6) * smoothBox(v, .30, .20, 6) * 7.0;
  const rim = smoothBox(u, .77, .025, 6) * smoothBox(v, .43, .25, 6) * 4.5;
  const top = smoothBox(u, .51, .23, 8) * smoothBox(v, .12, .025, 6) * 3.0;
  const bounce = smoothBox(u, .14, .16, 4) * smoothBox(v, .70, .11, 4) * .32;
  const rgb = [.012 + key + rim*.82 + top + bounce*.25, .017 + key*.95 + rim*.90 + top + bounce*.52, .027 + key*.87 + rim + top + bounce];
  const max = Math.max(...rgb), exponent = Math.floor(Math.log2(max)) + 1, scale = 256 / Math.pow(2, exponent);
  const offset = (y * width + x) * 4;
  for (let c = 0; c < 3; c++) pixels[offset+c] = Math.min(255, Math.floor(rgb[c] * scale));
  pixels[offset+3] = exponent + 128;
}
await writeFile(`${root}/environment/orbital-studio.hdr`, Buffer.concat([Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`), pixels]));
console.log('Earth maps, local shader compilers and original HDR environment are ready.');
