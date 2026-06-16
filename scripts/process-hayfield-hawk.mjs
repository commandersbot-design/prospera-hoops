// Turn the Hayfield hawk (black silhouette on a solid orange background) into a
// clean transparent PNG: keep the dark hawk pixels opaque, drop the orange to
// alpha=0. Output two versions — black (for orange/light backgrounds) and white
// (for dark backgrounds). Run: node scripts/process-hayfield-hawk.mjs
import sharp from "sharp";

const SRC = "brand-kit/hayfield-hawk-src.webp";
const LUM_CUTOFF = 110; // below = hawk (dark), above = orange background

async function make(outPath, ink) {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[i * 4] = ink; out[i * 4 + 1] = ink; out[i * 4 + 2] = ink;
    out[i * 4 + 3] = lum < LUM_CUTOFF ? 255 : 0; // opaque on the hawk only
  }
  await sharp(out, { raw: { width, height, channels: 4 } }).png().trim().toFile(outPath);
  const m = await sharp(outPath).metadata();
  console.log(`  ${outPath}  ${m.width}x${m.height}`);
}

await make("brand-kit/hayfield-hawk-black.png", 0);
await make("brand-kit/hayfield-hawk-white.png", 255);
console.log("done.");
