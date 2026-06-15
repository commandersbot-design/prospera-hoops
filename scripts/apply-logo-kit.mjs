// One-shot: apply the new logo kit onto the site's existing brand asset paths so
// logos update sitewide with no code changes. The kit lockup uses live <text>, so
// we inject the embedded-font <style> from the current lockup (Saira base64) so the
// wordmark renders correctly in <img> and in sharp. Run once: node scripts/_logo-apply.mjs
import sharp from "sharp";
import fs from "fs";

const KIT = "brand-kit"; // logo kit source (committed); see brand-kit/README.md
const PUB = "public";
const GRAPHITE = "#0B0E13";

// 1) Lockup SVG (header): inject the current lockup's embedded-font <style> into the
//    kit lockup so its <text> wordmark renders with real Saira everywhere.
const curLockup = fs.readFileSync(`${PUB}/brand/svg/prosperahoops-lockup-dark.svg`, "utf8");
const fontStyle = (curLockup.match(/<style[\s\S]*?<\/style>/) || [""])[0];
let kitLockup = fs.readFileSync(`${KIT}/prospera-lockup-dark.svg`, "utf8");
if (fontStyle && !/@font-face/.test(kitLockup)) {
  kitLockup = kitLockup.replace(/(<svg[^>]*>)/, `$1${fontStyle}`);
}
fs.writeFileSync(`${PUB}/brand/svg/prosperahoops-lockup-dark.svg`, kitLockup);

// 2) Favicon (tiny): simplified mark (arc/rim drop out per kit rules).
fs.copyFileSync(`${KIT}/prospera-icon-simple.svg`, `${PUB}/favicon.svg`);

// 3) Loader symbol (index.html splash, 72px): full icon.
fs.copyFileSync(`${KIT}/prospera-icon.svg`, `${PUB}/brand/svg/prosperahoops-symbol.svg`);

// 4) App / PWA / apple-touch icons from the orange coin app-icon, flattened onto
//    graphite so they're opaque (apple-touch) and full-bleed safe (maskable).
const coin = () => sharp(`${KIT}/app-icon-512.png`).flatten({ background: GRAPHITE });
const iconTargets = [
  ["brand/png/prosperahoops-symbol-192.png", 192],
  ["brand/png/prosperahoops-symbol-512.png", 512],
  ["brand/png/prosperahoops-mark-square-192.png", 192],
  ["brand/png/prosperahoops-mark-square-512.png", 512],
];

// 5) OG / share default image: render the font-injected lockup at 1600w on graphite.
async function run() {
  for (const [rel, size] of iconTargets) {
    await coin().resize(size, size).png().toFile(`${PUB}/${rel}`);
  }
  await sharp(Buffer.from(kitLockup))
    .resize({ width: 1600 })
    .flatten({ background: GRAPHITE })
    .png()
    .toFile(`${PUB}/brand/png/prosperahoops-lockup-dark-1600w.png`);
  console.log("logo kit applied: lockup + favicon + symbol + 4 icon PNGs + og lockup 1600w");
}
run();
