#!/usr/bin/env bash
# One-time: gather every Prospera Hoops deliverable into ~/Desktop/PROSPERAHOOPS.
# Copies only (originals untouched). Run from anywhere.
set -u
shopt -s nullglob

ROOT="/c/Users/danud/OneDrive/Desktop/PROSPERAHOOPS"
REPO="/c/LocalDesktop/prospera-preps"
DESK="/c/Users/danud/OneDrive/Desktop"
KIT="$DESK/PROSPERALAUNCHKIT"

copy() { local dest="$1"; shift; mkdir -p "$dest"; for f in "$@"; do [ -e "$f" ] && cp -rf "$f" "$dest"/; done; }

# 01 — Brand Kit
copy "$ROOT/01 Brand Kit/Logos (PNG)"          $REPO/public/brand/png/*
copy "$ROOT/01 Brand Kit/Source Files (SVG)"   $REPO/brand-kit/prospera-*.svg
copy "$ROOT/01 Brand Kit/Icons & App Marks"    $REPO/brand-kit/app-icon-512.png $REPO/brand-kit/favicon-*.png $REPO/brand-kit/prospera-emblem-*.png $REPO/brand-kit/prospera-badge-512.png $REPO/brand-kit/prospera-coin-512.png $REPO/brand-kit/prospera-icon-512.png $REPO/brand-kit/prospera_logo_final.png
copy "$ROOT/01 Brand Kit/Hayfield Hawks"       $REPO/brand-kit/hayfield-hawk-*.png
copy "$ROOT/01 Brand Kit/Archives (zips)"      $DESK/prospera_hoops_brand_kit.zip $DESK/prospera_hoops_logos.zip $DESK/prospera_hoops_logos-Popcorn.zip
[ -e "$REPO/public/brand/BRAND.txt" ] && cp -f "$REPO/public/brand/BRAND.txt" "$ROOT/01 Brand Kit/Brand-Guide-colors-and-fonts.txt"

# 02 — Social Media Profiles
copy "$ROOT/02 Social Media Profiles"              $REPO/public/brand/social/x-header-1500x500.png $REPO/public/brand/social/*profile* $REPO/public/brand/social/avatar-with-text-512.png
copy "$ROOT/02 Social Media Profiles/IG Templates" $REPO/public/brand/social/ig-*

# 03 — Social Posts
copy "$ROOT/03 Social Posts/Hayfield Playoff 06.24 (8-slide carousel)" $REPO/docs/social-posts/playoff-0624/*
copy "$ROOT/03 Social Posts/Hayfield Player Cards" $REPO/docs/social-posts/hayfield-* $REPO/docs/social-posts/spotlight-* $REPO/docs/social-posts/statdrop-* $REPO/docs/social-posts/card-* $DESK/Prospera-Hayfield-*.png $DESK/Prospera-06.16-StatDrop-Towe.png
copy "$ROOT/03 Social Posts/Launch Campaign"       $REPO/docs/social-posts/launch-* $REPO/docs/social-posts/how-* $REPO/docs/social-posts/post-* $REPO/docs/social-posts/packet-* $REPO/docs/social-posts/recap.png $REPO/docs/social-posts/claim.png $REPO/docs/social-posts/live.png $REPO/docs/social-posts/contact-sheet.png $REPO/docs/launch-assets/* $REPO/docs/launch-set/*.png $DESK/Prospera-Announcement-*.png $DESK/Prospera-06.16-Feed-SEEN.png $DESK/Prospera-06.16-Story-SEEN.png $KIT/who-*.png $KIT/story-tracked-1day.png

# 04 — One-Pager
copy "$ROOT/04 One-Pager" $KIT/Prospera-Hoops-OnePager.pdf $KIT/Prospera-Hoops-OnePager.html $REPO/docs/prospera-onepager.html

# 05 — Launch Kit (June 2026)
copy "$ROOT/05 Launch Kit (June 2026)" $DESK/Prospera-Today-Playbook-06.16.pdf $KIT/2026-06-17-launch-eve.md $KIT/2026-06-18-launch-day.md $REPO/docs/launch-set/README.md

# 06 — Marketing & Content Plans
copy "$ROOT/06 Marketing & Content Plans" $REPO/docs/content-schedule.md $REPO/docs/launch-marketing.md $REPO/docs/coach-outreach.md $REPO/docs/coach-tier.md $REPO/docs/metrics-blueprint.md $REPO/docs/SITE-FEATURES.md $REPO/docs/LAUNCH_RUNBOOK.md $REPO/docs/STRIPE_SETUP.md

# 07 — Data Intake Templates
copy "$ROOT/07 Data Intake Templates" $REPO/docs/*.xlsx

# 09 — Backups (repo checkpoint zips)
copy "$ROOT/09 Backups (zips)" $DESK/prospera-checkpoint-*.zip

echo "ROOT=$ROOT"
find "$ROOT" -type f | wc -l
