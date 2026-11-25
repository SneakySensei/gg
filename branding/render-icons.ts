/**
 * Renders branding/logo.svg to the PNG icon sizes the extension uses.
 * Run with: bun branding/render-icons.ts
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd(); // run from the project root
const svg = readFileSync(join(root, 'branding', 'logo.svg'), 'utf8');
// Heavier-stroke cut keeps the mark crisp at toolbar sizes.
const svgSmall = readFileSync(join(root, 'branding', 'logo-small.svg'), 'utf8');
const outDir = join(root, 'public', 'icon');
mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 96, 128]) {
  const png = new Resvg(size <= 32 ? svgSmall : svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(outDir, `${size}.png`), png);
}

// Large preview for docs / store listing.
writeFileSync(
  join(root, 'branding', 'logo-512.png'),
  new Resvg(svg, { fitTo: { mode: 'width', value: 512 } }).render().asPng(),
);
console.log('Rendered icons to public/icon and branding/logo-512.png');
