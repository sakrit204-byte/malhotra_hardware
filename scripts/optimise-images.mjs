/**
 * Brings the stored photographs down to the size the pages actually use.
 *
 * The catalogue was seeded with 2000 by 3000 pixel photographs of up to 1.4MB.
 * No slot on the site is wider than about 1400 pixels, so every one of them was
 * being decoded and resized on demand at several times the resolution anyone
 * would ever see. Capping the long edge at 2000 keeps the hero sharp on a wide
 * screen and takes roughly two thirds off the rest.
 *
 * Originals are kept in storage/private/original-uploads.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const MAX_EDGE = 2000;
const QUALITY = 80;
const roots = ["public/uploads"];

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) files.push(full);
  }
};
for (const root of roots) if (fs.existsSync(root)) walk(root);

let before = 0;
let after = 0;
let changed = 0;

for (const file of files) {
  const original = fs.statSync(file).size;
  before += original;

  // Read into memory first. Sharp holds a lock on the file it reads from,
  // and on Windows that makes writing back to the same path fail.
  const source = fs.readFileSync(file);
  const meta = await sharp(source).metadata();
  const isPng = /\.png$/i.test(file);

  const pipeline = sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });

  const buffer = isPng
    ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
    : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true, progressive: true }).toBuffer();

  // Never write a file that came out larger than the one already on disk.
  if (buffer.length < original) {
    fs.writeFileSync(file, buffer);
    after += buffer.length;
    changed += 1;
    const out = await sharp(buffer).metadata();
    console.log(
      `${String(Math.round(original / 1024)).padStart(5)}KB ${meta.width}x${meta.height}` +
        ` -> ${String(Math.round(buffer.length / 1024)).padStart(5)}KB ${out.width}x${out.height}  ${path.basename(file)}`,
    );
  } else {
    after += original;
  }
}

console.log(
  `\n${changed} of ${files.length} rewritten. ` +
    `${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB ` +
    `(${(100 - (after / before) * 100).toFixed(0)}% smaller)`,
);
