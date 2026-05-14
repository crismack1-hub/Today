// Generate the source PNGs that @capacitor/assets needs from public/icon.svg.
// Run via `npm run icons:prep` (or `npm run icons` to also invoke @capacitor/assets).
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'public/icon.svg');
const RESOURCES = resolve(ROOT, 'resources');

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`✗ Source icon not found at ${SRC}`);
    process.exit(1);
  }
  await ensureDir(RESOURCES);

  const svg = await readFile(SRC);

  // 1) App icon — full-bleed 1024x1024
  await sharp(svg).resize(1024, 1024).png().toFile(resolve(RESOURCES, 'icon.png'));
  console.log('✓ resources/icon.png (1024x1024)');

  // 2) Adaptive icon foreground — same SVG centered with safe margins
  // Capacitor expects the icon contained inside the inner 66% of the canvas.
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await sharp(svg).resize(680, 680).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(resolve(RESOURCES, 'icon-foreground.png'));
  console.log('✓ resources/icon-foreground.png (adaptive foreground)');

  // 3) Adaptive icon background — solid accent
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: { r: 99, g: 102, b: 241 } },
  })
    .png()
    .toFile(resolve(RESOURCES, 'icon-background.png'));
  console.log('✓ resources/icon-background.png (adaptive background)');

  // 4) Splash — 2732x2732 with gradient background + centered icon
  const splashBg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#a5b4fc"/>
          <stop offset="55%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#4338ca"/>
        </radialGradient>
      </defs>
      <rect width="2732" height="2732" fill="url(#g)"/>
    </svg>`,
  );
  await sharp(splashBg)
    .composite([{ input: await sharp(svg).resize(900, 900).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(resolve(RESOURCES, 'splash.png'));
  console.log('✓ resources/splash.png (2732x2732)');

  // 5) Dark variant — darker bg
  const splashDark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#312e81"/>
          <stop offset="55%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
      </defs>
      <rect width="2732" height="2732" fill="url(#g)"/>
    </svg>`,
  );
  await sharp(splashDark)
    .composite([{ input: await sharp(svg).resize(900, 900).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(resolve(RESOURCES, 'splash-dark.png'));
  console.log('✓ resources/splash-dark.png');

  // 6) Also generate web PWA icons that the manifest references
  const pub = resolve(ROOT, 'public');
  await sharp(svg).resize(192, 192).png().toFile(resolve(pub, 'icon-192.png'));
  await sharp(svg).resize(512, 512).png().toFile(resolve(pub, 'icon-512.png'));
  await sharp(svg).resize(180, 180).png().toFile(resolve(pub, 'apple-touch-icon.png'));
  console.log('✓ public/icon-192.png, icon-512.png, apple-touch-icon.png');

  console.log('\nNext:');
  console.log('  npx cap add android   # (one-time)');
  console.log('  npx cap add ios       # (Mac only, one-time)');
  console.log('  npm run icons         # generates all platform icons');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
