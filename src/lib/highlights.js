// Records & milestones — computed honestly from game logs (box scores).
// Player season highs + notable-game counts, and team single-game top performances.

const cat10 = (g) => ["pts", "reb", "ast", "stl", "blk"].filter((k) => (g[k] || 0) >= 10).length;

// Per-player season highs (with the game each happened in) + notable counts.
export function playerHighlights(games) {
  if (!games || !games.length) return null;
  const high = (k) => games.reduce((b, g) => ((g[k] ?? 0) > (b ? b.v : -1) ? { v: g[k] ?? 0, opp: g.opp, date: g.date } : b), null);
  return {
    gp: games.length,
    highs: { pts: high("pts"), reb: high("reb"), ast: high("ast"), tpm: high("tpm") },
    g20: games.filter((g) => (g.pts || 0) >= 20).length,
    g30: games.filter((g) => (g.pts || 0) >= 30).length,
    dd: games.filter((g) => cat10(g) >= 2).length,
    td: games.filter((g) => cat10(g) >= 3).length,
  };
}

// Top single-game scoring performances across a roster. `entries` is a flat list
// of { player, pts, reb, ast, opp, date } (one per player-game). Returns top N.
export function topPerformances(entries, n = 4) {
  return [...entries].sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)).slice(0, n);
}
