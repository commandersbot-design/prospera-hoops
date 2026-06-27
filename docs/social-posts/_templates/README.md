# Reusable "Powered by Prospera" closer

The value-pitch slide that should **end every game-report carousel**. One source
of truth: `scripts/lib/prospera-closer.mjs`.

## Make one
```
# generic (PROSPERA HOOPS band)
node scripts/gen-prospera-closer.mjs

# a specific team (add a white-logo PNG as the 3rd arg if you have one)
node scripts/gen-prospera-closer.mjs "WASHINGTON WARRIORS" "WASHINGTON, DC · 3SSB"
node scripts/gen-prospera-closer.mjs "HAYFIELD HAWKS" "ALEXANDRIA, VA · BOYS BASKETBALL" brand-kit/hayfield-hawk-white.png
```
Output lands in `docs/social-posts/_templates/powered-by-prospera-<team>.png`.

## Use it inside a post script
```js
import { renderCloser } from "./lib/prospera-closer.mjs";
renderCloser(path.join(OUT, "9-prospera.png"), {
  team: "HAYFIELD HAWKS",
  location: "ALEXANDRIA, VA · BOYS BASKETBALL",
  mark: "brand-kit/hayfield-hawk-white.png",
});
```
(The Hayfield playoff pack's slide 8 already calls this.)

## Change the pitch once, everywhere
Edit the `FEATS` array in `scripts/lib/prospera-closer.mjs` — every post that uses
the module updates the next time it's rendered.
