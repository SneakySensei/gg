/**
 * Renders the Chrome Web Store promo images from the logo:
 *   store/assets/promo-small-440x280.png   (required "small promo tile")
 *   store/assets/promo-marquee-1400x560.png (optional marquee)
 *   store/assets/icon-128.png               (store icon)
 * Run from the project root: bun run store:assets
 *
 * Screenshots are not generated: they must show the real extension in Gmail
 * (see docs/PUBLISHING.md for how to take them without exposing your inbox).
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'store', 'assets');
mkdirSync(out, { recursive: true });

const INK = '#161618';
const PAPER = '#f5f5f3';
const MUTED = '#9a9a9f';
const BLUE = '#398eff';

// Logo body without its <svg> wrapper, so it can be placed and scaled.
const logo = readFileSync(join(root, 'branding', 'logo.svg'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '');

const FONT = "'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif";

function tile(w: number, h: number, logoSize: number, title: number, tagline: number, extra = '') {
  const pad = Math.round(h * 0.2);
  const lx = pad;
  const ly = (h - logoSize) / 2;
  const tx = lx + logoSize + Math.round(logoSize * 0.28);
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${INK}"/>
  <g transform="translate(${lx} ${ly}) scale(${logoSize / 128})">${logo}</g>
  <text x="${tx}" y="${cy - tagline * 0.35}" font-family="${FONT}" font-weight="700" font-size="${title}" fill="${PAPER}">GG</text>
  <text x="${tx}" y="${cy + tagline * 1.45}" font-family="${FONT}" font-size="${tagline}" fill="${MUTED}">Greater experience for Gmail™</text>
  <rect x="${tx}" y="${cy + tagline * 2.2}" width="${tagline * 2.2}" height="${Math.max(3, tagline * 0.18)}" rx="2" fill="${BLUE}"/>
  ${extra}
</svg>`;
}

function render(svg: string, file: string) {
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  writeFileSync(join(out, file), png);
  console.log('wrote', join('store', 'assets', file));
}

render(tile(440, 280, 96, 58, 16), 'promo-small-440x280.png');
render(
  tile(
    1400,
    560,
    250,
    150,
    40,
    `<text x="${1400 - 110}" y="${560 - 70}" text-anchor="end" font-family="${FONT}" font-size="30" fill="${MUTED}">Keyboard shortcuts · Clean layout · Inbox zero, faster</text>`,
  ),
  'promo-marquee-1400x560.png',
);
render(readFileSync(join(root, 'branding', 'logo.svg'), 'utf8'), 'icon-128.png');
