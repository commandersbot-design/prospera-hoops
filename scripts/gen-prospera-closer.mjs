// Generate the reusable "Powered by Prospera" closing slide for any post.
//
//   node scripts/gen-prospera-closer.mjs                         -> generic template
//   node scripts/gen-prospera-closer.mjs "WARRIORS" "WASHINGTON, DC · 3SSB"
//   node scripts/gen-prospera-closer.mjs "HAYFIELD HAWKS" "ALEXANDRIA, VA" brand-kit/hayfield-hawk-white.png out.png
import { renderCloser } from "./lib/prospera-closer.mjs";

const [team = "", location = "", mark = "", out] = process.argv.slice(2);
const slug = (team || "template").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const outPath = out || `docs/social-posts/_templates/powered-by-prospera-${slug}.png`;
renderCloser(outPath, { team, location, mark, eyebrow: team ? "WHAT EVERY PLAYER GETS" : "WHAT EVERY PLAYER GETS" });
console.log("Powered-by-Prospera closer →", outPath);
