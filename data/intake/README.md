# Box-score intake

Drop the workbook's three CSV exports here, then run `npm run ingest`.

## The three files (headers must match exactly)
```
roster.csv     team, number, player, pos, grad_year, height, weight
schedule.csv   game_id, date, event, opponent, home_away, team_pts, opp_pts
boxscores.csv  game_id, date, player, min, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf
```

## Weekly loop
1. In the intake workbook: **File → Download/Export** each tab (Roster, Schedule, Box Scores) as **CSV** into this folder, overwriting the three files above.
2. Run `npm run ingest`.
3. The team's page, player pages, season averages, and game logs update from the box scores.

`pts` and `reb` are derived (`pts = 2·fgm + tpm + ftm`, `reb = oreb + dreb`) — don't put a points column in box scores. Season averages (PPG/RPG/APG/…, FG%/3P%/FT%/TS%) are **recomputed from the box scores every run**, so re-running with the same files changes nothing (idempotent).

## Matching rules
- Players matched by **name** (must match the roster spelling). A box-score name not on a roster is **skipped with a warning**.
- Games matched by **game_id** (shared between schedule.csv and boxscores.csv). A box score with an unknown game_id is **kept but with date only**, and warned.

## Try it
A filled sample lives in `example/`. Preview it without touching real data:
```
npm run ingest -- --intake data/intake/example --dry
```
Drop `--dry` (and point `--intake` at this folder) to write for real.
