/**
 * Builds every app icon from the DANK Capital logo (public/brand/logo.png).
 * Run after the logo changes:  node scripts/make-icons.mjs
 *
 *   src/app/favicon.ico           16/32/48, browser tabs
 *   src/app/icon.png              192, high-resolution tab / bookmark icon
 *   src/app/apple-icon.png        180, iPhone/iPad home screen (opaque: iOS
 *                                 fills transparency with black)
 *   public/icons/icon-*.png       192/512, installed app (manifest)
 *   public/icons/maskable-512.png Android adaptive icon: logo inside the safe
 *                                 zone, so round/squircle masks never cut it
 *   src/app/opengraph-image.jpg   1200×630, link previews (site's hall photo)
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const LOGO = "public/brand/logo.png";
const HALL = "public/brand/hall.jpg";
const NAVY = "#0d232b"; // dank.capital background

mkdirSync("public/icons", { recursive: true });

// The logo without its transparent margin.
const logo = await sharp(LOGO).trim().png().toBuffer();

/** Logo centred on a square; `scale` = share of the side it takes. */
async function square(size, scale, background) {
  const inner = Math.round(size * scale);
  const mark = await sharp(logo)
    .resize(inner, inner, { fit: "contain", background: "#0000" })
    .toBuffer();
  return (
    sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: mark, gravity: "center" }])
      // 256-colour palette: a fraction of the size, no visible difference.
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toBuffer()
  );
}

async function write(path, buffer, label) {
  writeFileSync(path, buffer);
  if (!label) {
    const { width, height } = await sharp(buffer).metadata();
    label = `${width}×${height}`;
  }
  console.log(`${path}  ${label}  ${(buffer.length / 1024).toFixed(1)} KB`);
}

/** ICO container with PNG entries (supported by all current browsers). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// Browser tabs: transparent, as large as the square allows.
const favicons = [];
for (const size of [16, 32, 48]) {
  favicons.push({ size, data: await square(size, 1) });
}
await write("src/app/favicon.ico", ico(favicons), "16+32+48");
await write("src/app/icon.png", await square(192, 1));

// Home screens: the gold badge on the site's navy, like a native app tile.
await write("src/app/apple-icon.png", await square(180, 0.84, NAVY));
await write("public/icons/icon-192.png", await square(192, 0.84, NAVY));
await write("public/icons/icon-512.png", await square(512, 0.84, NAVY));
await write("public/icons/maskable-512.png", await square(512, 0.6, NAVY));

// Link previews: hall photo under a navy scrim, logo in the middle.
const scrim = Buffer.from(
  `<svg width="1200" height="630"><rect width="1200" height="630" fill="${NAVY}" fill-opacity="0.72"/></svg>`,
);
const ogLogo = await sharp(logo)
  .resize(360, 360, { fit: "contain", background: "#0000" })
  .toBuffer();
await write(
  "src/app/opengraph-image.jpg",
  await sharp(HALL)
    .resize(1200, 630, { fit: "cover" })
    .composite([{ input: scrim }, { input: ogLogo, gravity: "center" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer(),
);
