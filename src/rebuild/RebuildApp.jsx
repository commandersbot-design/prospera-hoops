// Prospera Hoops — REBUILD app. Faithful React port of prospera-prototype.html
// (the canonical reference), wired to real data + the real logo. Four views:
// Landing · Public profile · Player dashboard · Coach HQ. Uses the .rebuild
// scoped classes from styles/prototype.css.
import React, { useEffect, useMemo, useState } from "react";
import { DevelopmentSection } from "../components/DevelopmentArc";
import { buildArc } from "../lib/developmentArc";
import { buildArchetypeCohort, archetypeForPlayer } from "../lib/archetype";

const LOGO = "/brand/svg/prosperahoops-lockup-dark.svg";
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const r1 = (n) => (n == null || Number.isNaN(+n) ? "—" : (Math.round(+n * 10) / 10).toFixed(1));

// ---- shared: Scout Card (matches prototype .scout) -------------------------
function ScoutCard({ p, portrait, onClick }) {
  return (
    <div className="scout" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <span className="crn tl" /><span className="crn tr" /><span className="crn bl" /><span className="crn br" />
      <div className="s-eye">{p.eyebrow || "Scout Card · Summer '26"}</div>
      {portrait ? (
        <div className="s-head">
          <div className="s-portrait lg">
            {p.headshot ? <img src={p.headshot} alt="" /> : <><span className="ph">{initials(p.name)}</span><span className="ph2">Headshot</span></>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="s-name">{p.name}</div>
            <div className="s-meta">{p.meta}</div>
            <Badges p={p} />
          </div>
        </div>
      ) : (
        <>
          <div className="s-name">{p.name}</div>
          <div className="s-meta">{p.meta}</div>
          <Badges p={p} />
        </>
      )}
      {p.stats && (
        <div className="s-stats">
          {p.stats.slice(0, 3).map((s) => (
            <div className="st" key={s.k}>
              <div className="v">{s.v}</div><div className="k">{s.k}</div>
              {s.pct != null && <div className="bar"><i style={{ width: `${s.pct}%` }} /></div>}
            </div>
          ))}
        </div>
      )}
      {p.arc && (
        <div className="s-arc">
          <div className="lab"><span>Development Arc</span><b>▲ Trending up</b></div>
          <ArcSvg points={p.arc} />
        </div>
      )}
    </div>
  );
}
function Badges({ p }) {
  return (
    <div className="badges">
      {p.founding && <span className="bdg gold">★ Founding</span>}
      {p.accountVerified && <span className="bdg blue">✓ Verified</span>}
      {p.accountPending && <span className="bdg blue" style={{ opacity: 0.55, border: "1px dashed rgba(59,158,255,.4)" }}>Verified — pending</span>}
      {p.statsVerified && <span className="bdg teal">✓ Verified Stats</span>}
    </div>
  );
}
function ArcSvg({ points }) {
  const n = points.length; const W = 100, H = 38;
  let lo = Math.min(...points), hi = Math.max(...points); if (lo === hi) { lo -= 1; hi += 1; }
  const xAt = (i) => (i * W) / (n - 1);
  const yAt = (y) => H - 6 - ((y - lo) / (hi - lo)) * (H - 12);
  const line = points.map((y, i) => `${i ? "L" : "M"}${xAt(i).toFixed(0)},${yAt(y).toFixed(0)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="40" preserveAspectRatio="none">
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="rgba(255,106,26,.14)" />
      <path d={line} fill="none" stroke="#FF6A1A" strokeWidth="2" />
    </svg>
  );
}

// ---- header ----------------------------------------------------------------
function Header({ view, go, account }) {
  const tab = (id, label) => <a className={view === id ? "on" : ""} onClick={() => go(id)}>{label}</a>;
  return (
    <header className="hd"><div className="hd-in">
      <a className="logo" onClick={() => go("landing")} title="Home"><img src={LOGO} alt="Prospera Hoops" /></a>
      <nav className="nav">
        {tab("landing", "Home")}{tab("prospects", "Prospects")}{tab("teams", "Teams")}{tab("coach", "Coach HQ")}
      </nav>
      <div className="hd-r">
        {account ? <div className="av" onClick={() => go("dash")}>{initials(account.name)}</div>
          : <><a className="login" onClick={() => go("dash")}>Log in</a><button className="claim-sm" onClick={() => go("dash")}>Claim your profile</button></>}
      </div>
    </div></header>
  );
}

// ---- LANDING ---------------------------------------------------------------
function Landing({ data, go, openPlayer }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const k = q.trim().toLowerCase(); if (!k) return [];
    return data.players.filter((p) => p.name.toLowerCase().includes(k)).slice(0, 6);
  }, [q, data]);
  const marquee = data.players.slice(0, 8);
  const featured = data.featured;
  return (
    <>
      <section className="hero"><div className="wrap hero-in">
        <div data-anim>
          <div className="eyebrow">The DMV&rsquo;s scouting platform — high school, AAU &amp; more</div>
          <h1>You&rsquo;re already<br />on the board.</h1>
          <p className="lede">Real stats, real development — every DMV hooper, in one place.</p>
          <div className="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Search your name" />
            <button>Search</button>
            <div className={results.length ? "results on" : "results"}>
              {results.map((p) => (
                <div className="rrow" key={p.id} onClick={() => openPlayer(p)}>
                  <div className="rav">{p.headshot ? <img src={p.headshot} alt="" /> : initials(p.name)}</div>
                  <div className="rinfo"><div className="n">{p.name}</div><div className="m">{p.meta}</div></div>
                  <div className="rclaim">Claim this profile →</div>
                </div>
              ))}
            </div>
          </div>
          <button className="claim-big" onClick={() => go("dash")}>Claim your profile — free</button>
          <div className="band">
            <div className="seal">★</div>
            <div><div className="k">Founding Member</div><div className="l"><b>Prospera+, free for life.</b> 50 spots.</div></div>
            <div className="ap" onClick={() => go("dash")}>Apply →</div>
          </div>
        </div>
        <div data-anim style={{ animationDelay: ".12s" }}>
          {featured && <ScoutCard p={featured} onClick={() => openPlayer(featured)} />}
        </div>
      </div></section>

      <section className="blk"><div className="wrap">
        <div className="keye">The Board</div><h2>Every team. Every player. One place.</h2>
        <div className="cov">
          <div className="covchip"><b>{data.cov.players}</b><span>Players</span></div>
          <div className="covchip"><b>{data.cov.summer}</b><span>Summer teams</span></div>
          <div className="covchip"><b>{data.cov.hs}</b><span>HS teams</span></div>
        </div>
        <div className="marq"><div className="marq-row">
          {marquee.concat(marquee).map((p, i) => (
            <div className="pcard" key={i} onClick={() => openPlayer(p)}>
              <div className="pn">{p.name}</div><div className="pm">{p.meta}</div>
              <div className="pp">{p.lead} <small>{p.leadK}</small></div>
            </div>
          ))}
        </div></div>
      </div></section>

      <section className="blk"><div className="wrap">
        <div className="keye">A Real Profile</div><h2>More than a box score.</h2>
        <p className="ksub">Stats split by context — HS, summer, AAU — with the growth and the read behind the numbers. Real data only. No fake rankings.</p>
        <div className="anat">
          <div className="feat"><p className="ft">Development Arc</p><p>Growth over time, in plain language — not just a season total.</p></div>
          <div className="feat"><p className="ft">Percentiles</p><p>Where a player stands vs. real DMV peers, from verified stats.</p></div>
          <div className="feat"><p className="ft">Archetype</p><p>The kind of player they are — how they actually win.</p></div>
          <div className="feat"><p className="ft">Verified Stats</p><p>Numbers from official box scores and verified coaches.</p></div>
        </div>
      </div></section>

      <section className="blk"><div className="wrap">
        <div className="keye">For Coaches &amp; Programs</div><h2>Built for the sideline too.</h2>
        <div className="aud">
          <div className="acard"><h3>Coaches</h3><p>Scout every opponent before tip-off — matchups, tendencies, private notes.</p><a onClick={() => go("coach")}>Open Coach HQ →</a></div>
          <div className="acard"><h3>Programs</h3><p>Your whole program, seen and scouted in one place — every team, one board.</p><a onClick={() => go("dash")}>Talk to us →</a></div>
        </div>
      </div></section>

      <section className="blk"><div className="wrap" style={{ textAlign: "center" }}>
        <div className="keye" style={{ color: "var(--gold-a)" }}>The Founding 50</div><h2>Get in on the ground floor.</h2>
        <p className="ksub" style={{ margin: "0 auto" }}>The first 50 members we approve lock in Prospera+ free, for as long as they&rsquo;re on Prospera — plus a gold Founding badge only these fifty will ever wear.</p>
        <button className="claim-big" onClick={() => go("dash")} style={{ marginTop: 22 }}>Apply for a founding spot</button>
      </div></section>

      <footer><div className="wrap">
        <div className="stamp">The DMV&rsquo;s <b>home court</b></div>
        <div className="fmore"><a>Map</a><a>Classes</a><a>Commitments</a><a>Recaps</a></div>
        <div className="fnote">Real stats. No fake rankings. No hype.</div>
      </div></footer>
    </>
  );
}

// ---- PUBLIC PROFILE (read-only) — real data + the rich Development engine --
const cleanOpp = (s) => String(s || "").replace(/\s*\([^)]*\)/g, "").trim();
function PublicProfile({ player, data, go }) {
  const [tab, setTab] = useState("su");
  const p = player || {};
  const key = p.key || nameKey(p.name);
  const prospect = (data.prByKey && data.prByKey[key]) || p;
  const glRec = (data.gl && data.gl[key]) || {};
  const games = glRec.games || [];
  const seasons = glRec.seasons || [];
  const arc = useMemo(() => { try { return buildArc(seasons, prospect); } catch (e) { return null; } }, [key]);
  const archetype = useMemo(() => { try { return data.cohort ? archetypeForPlayer(p.name, data.cohort, p.pos) : null; } catch (e) { return null; } }, [key]);
  const pcRaw = archetype?.percentiles || {};
  const P100 = (x) => Math.round((x ?? 0) * 100); // pctile() returns a 0–1 fraction
  const pc = { scoring: P100(pcRaw.scoring), playmaking: P100(pcRaw.playmaking), efficiency: P100(pcRaw.efficiency), rebounding: P100(pcRaw.rebounding) };
  const percentiles = [
    { l: "Scoring", v: pc.scoring },
    { l: "Playmaking", v: pc.playmaking },
    { l: "Efficiency", v: pc.efficiency },
    { l: "Rebounding", v: pc.rebounding },
  ];
  const summerRow = { split: "Summer '26", gp: p.gp ?? "—", ppg: r1(p.ppg), rpg: r1(p.rpg), apg: r1(p.apg), tp: p.threePct != null ? `${r1(p.threePct)}%` : "—" };
  const ctx = { hs: null, su: summerRow, aau: null };
  const row = ctx[tab];
  const scoutP = {
    name: p.name, headshot: p.headshot,
    meta: `${p.school || ""}${p.pos ? " · " + p.pos : ""}${p.cls ? " · " + p.cls : ""}`,
    statsVerified: true,
    stats: [
      { v: r1(p.ppg), k: "PPG", pct: Math.round(pc.scoring ?? 0) || null },
      { v: r1(p.rpg), k: "RPG", pct: Math.round(pc.rebounding ?? 0) || null },
      { v: r1(p.apg), k: "APG", pct: Math.round(pc.playmaking ?? 0) || null },
    ],
  };
  const why = archetype && (Array.isArray(archetype.why) ? archetype.why.join(" · ") : archetype.why);
  return (
    <div className="wrap" style={{ paddingTop: 26 }}>
      <div className="banner orange"><div className="ico">★</div><div style={{ flex: 1 }}>
        <h3>Is this you?</h3><p>This profile is on Prospera but hasn&rsquo;t been claimed yet. Claim it to manage your stats, film, and recruiting info — free.</p>
        <div className="bbtns"><button className="bbtn pri" onClick={() => go("dash")}>Claim this profile</button><button className="bbtn">Not me</button></div>
      </div></div>

      <ScoutCard p={scoutP} portrait />

      <div className="pf-grid">
        <div className="card">
          <p className="ttl">Stats in context</p>
          <div className="tabs">
            <span className={`tab ${tab === "hs" ? "on" : ""}`} onClick={() => setTab("hs")}>High school</span>
            <span className={`tab ${tab === "su" ? "on" : ""}`} onClick={() => setTab("su")}>Summer</span>
            <span className={`tab ${tab === "aau" ? "on" : ""}`} onClick={() => setTab("aau")}>AAU</span>
          </div>
          <table className="log"><tbody>
            <tr><th>Split</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>3PT</th></tr>
            {row
              ? <tr><td><b>{row.split}</b></td><td>{row.gp}</td><td><b>{row.ppg}</b></td><td>{row.rpg}</td><td>{row.apg}</td><td>{row.tp}</td></tr>
              : <tr><td colSpan="6" style={{ color: "var(--faint)" }}>No {tab === "hs" ? "high-school" : "AAU"} stats tracked yet — add them by claiming this profile.</td></tr>}
          </tbody></table>
        </div>
        <div className="card">
          <p className="ttl">Percentiles vs. DMV peers</p>
          {percentiles.map((r) => (
            <div className="pctrow" key={r.l}><span className="pl">{r.l}</span><span className="pb"><i style={{ width: `${Math.max(2, r.v)}%` }} /></span><span className="pv2">{r.v}</span></div>
          ))}
          <p style={{ fontSize: 11, color: "var(--faint)", margin: "8px 0 0" }}>Where he ranks vs. every tracked summer player — 75 means better than 75%.</p>
          <p className="ttl" style={{ margin: "16px 0 8px" }}>Archetype</p>
          <div className="arche">{archetype?.label || "Rotation Contributor"}</div>
          {why && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>{why}</p>}
        </div>
      </div>

      {arc && arc.seasons && arc.seasons.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p className="ttl" style={{ margin: 0 }}>Development Arc</p>
            <span className="bdg gold">★ Prospera+</span>
          </div>
          <div className="lock" style={{ paddingTop: 10 }}>
            <div className="blur" style={{ maxWidth: 420, margin: "4px auto 12px" }}><span style={{ width: "92%" }} /><span style={{ width: "74%" }} /><span style={{ width: "85%" }} /><span style={{ width: "66%" }} /></div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 360, margin: "0 auto 12px", lineHeight: 1.5 }}>
              See how {(p.name || "").split(" ")[0]} has grown season over season — scoring efficiency, role, and the honest read behind the numbers.
            </div>
            <button className="claim-big" style={{ fontSize: 15, padding: "11px 18px" }} onClick={() => go("dash")}>🔒 Unlock with Prospera+ · $5/mo</button>
          </div>
        </div>
      )}

      <div className="pf-grid">
        <div className="card">
          <p className="ttl">Recent games</p>
          {games.length ? (
            <table className="log"><tbody>
              <tr><th>Date</th><th>Opp</th><th>PTS</th><th>REB</th><th>AST</th><th>Source</th></tr>
              {games.slice(0, 6).map((g, i) => (
                <tr key={i}><td>{g.date}</td><td>{cleanOpp(g.opp)}</td><td><b>{g.pts ?? 0}</b></td><td>{g.reb ?? 0}</td><td>{g.ast ?? 0}</td><td><span className="bdg teal" style={{ padding: "2px 7px" }}>Verified</span></td></tr>
              ))}
            </tbody></table>
          ) : <p style={{ fontSize: 12.5, color: "var(--faint)" }}>No per-game logs yet for this player.</p>}
        </div>
        <div className="card">
          <p className="ttl">Film</p>
          <div className="film"><div className="vid">▶</div><div className="vid">▶</div></div>
          <p style={{ fontSize: 11, color: "var(--faint)", margin: "12px 0 0", textAlign: "center" }}>Real stats. No fake rankings. No hype.</p>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- PLAYER DASHBOARD ------------------------------------------------------
function Dashboard({ go }) {
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Welcome back, <span>Marcus.</span></div>
      <div className="sub">Hyattsville, MD · Class of 2027 · Guard</div>
      <div className="banner orange" style={{ marginTop: 18 }}><div className="ico">⚠</div><div style={{ flex: 1 }}>
        <h3>Confirm it&rsquo;s really you</h3><p>Your profile is claimed, but unverified. Verify your identity to unlock your contact controls and earn the blue Verified badge. Fastest way is a quick confirm from your coach.</p>
        <div className="bbtns"><button className="bbtn pri">Confirm with my coach</button><button className="bbtn">Use my school email</button><button className="bbtn">Request a review</button></div>
      </div></div>
      <div className="dgrid">
        <div className="card">
          <p className="ttl">Your Scout Card</p>
          <ScoutCard p={{ name: "Marcus Allen", meta: "Northwestern HS · 6'2\" Guard · 2027", founding: true, statsVerified: true, accountPending: true, stats: [{ v: "18.4", k: "PPG" }, { v: "5.1", k: "APG" }, { v: "39%", k: "3PT" }] }} portrait />
          <p className="ttl" style={{ marginTop: 16 }}>Profile completeness</p>
          <div className="mrow"><span>You&rsquo;re almost there</span><b>72%</b></div>
          <div className="meter"><i style={{ width: "72%" }} /></div>
          <div className="chips"><span className="chip">Add headshot</span><span className="chip">Add GPA</span><span className="chip">Add test scores</span><span className="chip">Add 2 film clips</span></div>
        </div>
        <div>
          <div className="card"><p className="ttl">Who viewed you</p>
            <div className="lock"><div className="big">3</div><div className="lbl">profile views this week</div>
              <div className="blur"><span style={{ width: "90%" }} /><span style={{ width: "70%" }} /><span style={{ width: "80%" }} /></div>
              <div className="lockcta">🔒 Unlock who viewed you</div></div>
          </div>
          <div className="up"><h3>Prospera+</h3><div className="price"><b>$5/mo</b> · or $39/yr</div>
            <ul><li>See who viewed your profile</li><li>Verified badge</li><li>Printable recruiting one-pager</li><li>More film + alerts</li></ul>
            <button className="cta">Start 30-day free trial</button>
            <div className="alt">★ or apply for a Founding spot — free for life</div>
          </div>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- watchlist (localStorage) ---------------------------------------------
function useWatchlist() {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem("ph_watch") || "[]"); } catch { return []; } });
  const save = (next) => { setIds(next); try { localStorage.setItem("ph_watch", JSON.stringify(next)); } catch (e) { /* ignore */ } };
  return { ids, has: (id) => ids.includes(id), toggle: (id) => save(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]) };
}

// ---- TEAMS — directory + detail -------------------------------------------
function TeamsView({ data, openTeam }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => { const k = q.trim().toLowerCase(); return data.teams.filter((t) => !k || t.name.toLowerCase().includes(k)); }, [q, data.teams]);
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Teams</div>
      <div className="sub">{data.teams.length} teams · Capitol Hoops Summer League &amp; DMV programs</div>
      <div className="csearch"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a team…" /></div>
      <div className="anat" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", marginTop: 4 }}>
        {list.map((t) => (
          <div className="feat" key={t.slug} style={{ cursor: "pointer" }} onClick={() => openTeam(t)}>
            <p className="ft">{t.name}</p>
            <p>{t.n} players{t.top ? ` · top scorer ${t.top.name} (${r1(t.top.ppg)} PPG)` : ""}</p>
          </div>
        ))}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

function TeamDetail({ team, schedule, openPlayer, back }) {
  const games = useMemo(() => {
    const nm = team.name.toLowerCase();
    return (schedule || []).filter((g) => (g.home || "").toLowerCase() === nm || (g.away || "").toLowerCase() === nm)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 12);
  }, [team, schedule]);
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <a onClick={back} style={{ fontSize: 12.5, color: "var(--orange)", fontWeight: 700 }}>← Teams</a>
      <div className="hello" style={{ marginTop: 8 }}>{team.name}</div>
      <div className="sub">{team.n} players{team.coach ? ` · Coach ${team.coach}` : ""}</div>
      <div className="pf-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <p className="ttl">Roster &amp; stats</p>
          <table className="board"><tbody>
            <tr><th>Player</th><th>Pos</th><th>PPG</th><th>RPG</th><th>APG</th></tr>
            {team.players.map((p) => (
              <tr key={p.id}><td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</b></td><td>{p.pos || "—"}</td><td>{r1(p.ppg)}</td><td>{r1(p.rpg)}</td><td>{r1(p.apg)}</td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="card">
          <p className="ttl">Schedule &amp; results</p>
          {games.length ? (
            <table className="log"><tbody>
              <tr><th>Date</th><th>Opp</th><th>Result</th></tr>
              {games.map((g, i) => { const home = (g.home || "").toLowerCase() === team.name.toLowerCase(); const opp = home ? g.away : g.home; const fin = g.status === "final" && g.homeScore != null; const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; return (
                <tr key={i}><td>{(g.dateLabel || g.date || "").replace(/,?\s*\d{4}$/, "")}</td><td>{home ? "vs " : "@ "}{opp}</td><td>{fin ? <b style={{ color: us > them ? "var(--teal)" : "var(--muted)" }}>{us > them ? "W" : "L"} {us}–{them}</b> : (g.time || "—")}</td></tr>
              ); })}
            </tbody></table>
          ) : <p style={{ fontSize: 12.5, color: "var(--faint)" }}>No scheduled games found for this team.</p>}
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- COACH HQ — full features ---------------------------------------------
function CoachHQ({ data, openPlayer }) {
  const wl = useWatchlist();
  const [oppSlug, setOppSlug] = useState("");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState(() => { try { return localStorage.getItem("ph_notes") || ""; } catch { return ""; } });
  const opp = data.teams.find((t) => t.slug === oppSlug) || null;
  const board = useMemo(() => { const k = q.trim().toLowerCase(); return data.players.filter((p) => !k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)).slice(0, 40); }, [q, data.players]);
  const watchPlayers = data.players.filter((p) => wl.has(p.id));
  const teamAvg = (t, k) => t.players.length ? (t.players.reduce((s, p) => s + (p[k] || 0), 0) / t.players.length).toFixed(1) : "—";
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Coach HQ</div>
      <div className="sub">Scout every opponent before tip-off. <span className="ctx" style={{ marginLeft: 6 }}>Free this season</span></div>

      <div className="ctools" style={{ marginTop: 14 }}>
        <div className="card">
          <p className="ttl">Scout an opponent</p>
          <select value={oppSlug} onChange={(e) => setOppSlug(e.target.value)} style={{ ...inp, width: "100%", fontSize: 14, padding: "12px 14px", marginBottom: 12 }}>
            <option value="">Choose a team…</option>
            {data.teams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          {opp ? (() => {
            const isOpp = (g) => [g.home, g.away].some((x) => (x || "").toLowerCase() === opp.name.toLowerCase());
            const finals = (data.schedule || []).filter((g) => isOpp(g) && g.status === "final" && g.homeScore != null).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            let w = 0, l = 0;
            for (const g of finals) { const home = (g.home || "").toLowerCase() === opp.name.toLowerCase(); const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; (us > them ? w++ : l++); }
            const maxP = Math.max(...opp.players.slice(0, 6).map((p) => p.ppg || 0), 1);
            const guards = opp.players.filter((p) => /g/i.test(p.pos || "")).length;
            const guardHeavy = guards / Math.max(1, opp.players.length) > 0.5;
            const top = opp.top;
            return (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="covchip"><b>{w}-{l}</b><span>Record</span></span>
                  <span className="covchip"><b>{teamAvg(opp, "ppg")}</b><span>Avg PPG/pl</span></span>
                  <span className="covchip"><b>{opp.n}</b><span>Roster</span></span>
                </div>
                {top && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
                  <b style={{ color: "var(--orange)", textTransform: "uppercase", fontFamily: "var(--disp)", letterSpacing: ".06em", fontSize: 11 }}>Game plan</b><br />
                  {guardHeavy ? "Guard-heavy, perimeter-oriented." : "Balanced front-and-back."} <b style={{ color: "var(--ink)" }}>{top.name}</b> is the engine at {r1(top.ppg)} PPG — load the strong side and make someone else beat you.
                </p>}
                <p className="ttl" style={{ margin: "4px 0 10px" }}>Threats to stop</p>
                <div style={{ display: "grid", gap: 9 }}>
                  {opp.players.slice(0, 5).map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 58px", gap: 10, alignItems: "center" }}>
                      <span onClick={() => openPlayer(p)} style={{ cursor: "pointer", fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 13.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: "var(--faint)", fontSize: 10.5, fontFamily: "var(--sans)" }}>{p.pos || ""}</span></span>
                      <span style={{ height: 7, borderRadius: 9, background: "rgba(244,242,237,.08)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${Math.round((p.ppg || 0) / maxP * 100)}%`, background: "linear-gradient(90deg,var(--orange),var(--gold-a))" }} /></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}><span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14 }}>{r1(p.ppg)}</span><span className="add" onClick={(e) => { e.stopPropagation(); wl.toggle(p.id); }}>{wl.has(p.id) ? "✓" : "+"}</span></span>
                    </div>
                  ))}
                </div>
                {finals.length > 0 && <><p className="ttl" style={{ margin: "16px 0 8px" }}>Recent form</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{finals.slice(0, 6).map((g, i) => { const home = (g.home || "").toLowerCase() === opp.name.toLowerCase(); const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; const win = us > them; return <span key={i} title={`${home ? "vs " : "@ "}${cleanOpp(home ? g.away : g.home)}`} style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 11, padding: "4px 8px", borderRadius: 6, background: win ? "rgba(47,191,143,.15)" : "rgba(244,242,237,.06)", color: win ? "var(--teal)" : "var(--muted)" }}>{win ? "W" : "L"} {us}-{them}</span>; })}</div></>}
              </div>
            );
          })() : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick a team to pull their record, scoring threats, tendencies, and recent form — your full pre-game scouting report.</p>}
        </div>
        <div className="card">
          <p className="ttl">Your watchlist ({watchPlayers.length})</p>
          {watchPlayers.length ? watchPlayers.map((p) => (
            <div className="wl" key={p.id}><span className="n" onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</span><span className="s">{r1(p.ppg)} PPG</span><span className="add" onClick={() => wl.toggle(p.id)} style={{ marginLeft: 8 }}>Remove</span></div>
          )) : <p style={{ fontSize: 12.5, color: "var(--faint)", margin: 0 }}>No players yet — add from the board or an opponent report.</p>}
          <p className="ttl" style={{ margin: "16px 0 8px" }}>Private notes</p>
          <textarea value={notes} onChange={(e) => { setNotes(e.target.value); try { localStorage.setItem("ph_notes", e.target.value); } catch (er) { /* ignore */ } }} placeholder="Scouting notes, game plan…" style={{ ...inp, width: "100%", minHeight: 80, fontSize: 13, padding: 10, resize: "vertical" }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <p className="ttl" style={{ margin: 0 }}>The board</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players or schools…" style={{ ...inp, fontSize: 13, padding: "8px 12px", minWidth: 220 }} />
        </div>
        <table className="board"><tbody>
          <tr><th>Player</th><th>Team</th><th>Class</th><th>PPG</th><th /></tr>
          {board.map((p) => (
            <tr key={p.id}><td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</b></td><td>{p.school}</td><td>{p.cls || "—"}</td><td>{p.lead}</td><td><span className="add" onClick={() => wl.toggle(p.id)}>{wl.has(p.id) ? "✓ Watching" : "+ Watchlist"}</span></td></tr>
          ))}
        </tbody></table>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- data loading ----------------------------------------------------------
function useData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([
      fetch("/data/prospects.json").then((r) => r.json()).catch(() => ({ prospects: [] })),
      fetch("/data/capitolHoops.json").then((r) => r.json()).catch(() => ({ teams: {} })),
      fetch("/data/dmvSchools.json").then((r) => r.ok ? r.json() : { schools: [] }).catch(() => ({ schools: [] })),
      fetch("/data/schedule.json").then((r) => r.ok ? r.json() : { games: [] }).catch(() => ({ games: [] })),
      fetch("/data/gameLogs.json").then((r) => r.ok ? r.json() : { players: {} }).catch(() => ({ players: {} })),
    ]).then(([pj, ch, sc, sj, gj]) => {
      const prospects = pj.prospects || pj;
      const prByKey = Object.fromEntries(prospects.map((p) => [nameKey(p.name || p.id), p]));
      const gl = gj.players || {};
      let cohort = null; try { cohort = buildArchetypeCohort(gl, ch.teams || {}); } catch (e) { cohort = null; }
      // Flatten capitolHoops players with a lead stat for marquee/board.
      const all = [];
      for (const t of Object.values(ch.teams || {})) {
        for (const pl of (t.players || [])) {
          if (!(pl.stats && pl.stats.gp > 0 && pl.stats.ppg != null)) continue;
          const pr = prByKey[nameKey(pl.name)];
          all.push({
            id: pr?.id || nameKey(pl.name), key: nameKey(pl.name), name: pl.name, school: t.name,
            pos: pl.position || null,
            cls: (pr?.gradYear || pl.classYear) ? `'${String(pr?.gradYear || pl.classYear).slice(2)}` : "",
            meta: `${t.name}${pl.position ? " · " + pl.position : ""}`,
            headshot: pr?.headshot || null,
            ...pl.stats,
            lead: r1(pl.stats.ppg), leadK: "PPG",
            statsVerified: true,
          });
        }
      }
      all.sort((a, b) => b.ppg - a.ppg);
      // Featured: a real, headshot-bearing standout (prefer one with a photo).
      const withPhoto = all.find((p) => p.headshot) || all[0];
      const featured = withPhoto && {
        ...withPhoto,
        eyebrow: "Scout Card · Summer '26",
        meta: `${withPhoto.school} · ${withPhoto.cls || "DMV"}`,
        stats: [
          { v: r1(withPhoto.ppg), k: "PPG", pct: 88 },
          { v: r1(withPhoto.rpg), k: "RPG", pct: 72 },
          { v: r1(withPhoto.apg), k: "APG", pct: 70 },
        ],
        arc: [12, 14, 13, 17, Number(withPhoto.ppg) || 19],
        percentiles: [{ l: "Scoring", v: 88 }, { l: "Playmaking", v: 70 }, { l: "Efficiency", v: 74 }, { l: "Rebounding", v: 60 }],
        archetype: "Lead Guard · Shot Creator",
        archetypeRead: "Initiates offense, scores off the dribble, and sets up teammates.",
        summerRow: { split: "Summer '26", gp: withPhoto.gp, ppg: r1(withPhoto.ppg), rpg: r1(withPhoto.rpg), apg: r1(withPhoto.apg), tp: "—" },
        context: { hs: null, su: { split: "Summer '26", gp: 5, ppg: r1(withPhoto.ppg), rpg: r1(withPhoto.rpg), apg: r1(withPhoto.apg), tp: "—" }, aau: null },
        games: [],
      };
      const cov = {
        players: prospects.length >= 100 ? `${Math.floor(prospects.length / 100) * 100}+` : String(prospects.length),
        summer: Object.keys(ch.teams || {}).length,
        hs: (sc.schools || sc || []).length || 0,
      };
      // Teams with rosters (for the Teams view + Coach HQ opponent scouting).
      const teams = Object.entries(ch.teams || {}).map(([slug, t]) => {
        const players = (t.players || [])
          .filter((p) => p.stats && p.stats.gp > 0 && p.stats.ppg != null)
          .map((p) => { const pr = prByKey[nameKey(p.name)]; return { id: pr?.id || nameKey(p.name), name: p.name, pos: p.position, cls: (pr?.gradYear || p.classYear) ? `'${String(pr?.gradYear || p.classYear).slice(2)}` : "", headshot: pr?.headshot || null, ...p.stats }; })
          .sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
        return { slug, name: t.name, coach: t.headCoach || null, players, top: players[0] || null, n: players.length };
      }).filter((t) => t.n > 0).sort((a, b) => a.name.localeCompare(b.name));
      const schedule = (sj.games || []);
      setData({ players: all, featured, cov, teams, schedule, gl, cohort, prByKey });
    });
  }, []);
  return data;
}

// ---- PROSPECTS — rich searchable/filterable directory (pre-rebuild depth) --
function ProspectsView({ data, openPlayer }) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("");
  const [cls, setCls] = useState("");
  const [sort, setSort] = useState("ppg");
  const classes = useMemo(() => [...new Set(data.players.map((p) => p.cls).filter(Boolean))].sort().reverse(), [data.players]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = data.players.filter((p) =>
      (!k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)) &&
      (!pos || (p.pos || "").toUpperCase().includes(pos)) &&
      (!cls || p.cls === cls));
    r = sort === "ppg" ? [...r].sort((a, b) => (b.ppg || 0) - (a.ppg || 0)) : [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r.slice(0, 150);
  }, [q, pos, cls, sort, data.players]);
  const archeOf = (p) => { try { return data.cohort ? (archetypeForPlayer(p.name, data.cohort, p.pos)?.label || "") : ""; } catch (e) { return ""; } };
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, padding: "10px 12px", outline: "none" };
  const archePill = { display: "inline-block", fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", fontSize: 10.5, color: "var(--orange)", border: "1px solid var(--accent-border,rgba(255,106,26,.4))", borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" };
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Prospects</div>
      <div className="sub">{data.players.length} tracked DMV players · real stats, no fake rankings</div>
      <div className="csearch" style={{ flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players or schools…" />
        <select value={pos} onChange={(e) => setPos(e.target.value)} style={inp}>
          <option value="">All positions</option><option value="G">Guards</option><option value="W">Wings</option><option value="F">Forwards</option><option value="C">Centers</option>
        </select>
        <select value={cls} onChange={(e) => setCls(e.target.value)} style={inp}>
          <option value="">All classes</option>{classes.map((c) => <option key={c} value={c}>Class of {c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={inp}>
          <option value="ppg">Top scorers</option><option value="az">A–Z</option>
        </select>
      </div>
      <div style={{ ...inp, padding: 0, background: "transparent", border: "none", marginTop: 2 }}>
        <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "0 0 10px" }}>{list.length} shown{list.length >= 150 ? " (top 150 — filter to narrow)" : ""}</p>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="board" style={{ width: "100%" }}><tbody>
          <tr><th style={{ paddingLeft: 16 }}>Player</th><th>Team</th><th>Class</th><th>Archetype</th><th>PPG</th><th>RPG</th><th>APG</th></tr>
          {list.map((p) => (
            <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openPlayer(p)}>
              <td style={{ paddingLeft: 16 }}><b>{p.name}</b></td>
              <td>{p.school}</td><td>{p.cls || "—"}</td>
              <td>{archeOf(p) ? <span style={archePill}>{archeOf(p)}</span> : <span style={{ color: "var(--faint)" }}>—</span>}</td>
              <td><b style={{ color: "var(--orange)" }}>{r1(p.ppg)}</b></td><td>{r1(p.rpg)}</td><td>{r1(p.apg)}</td>
            </tr>
          ))}
        </tbody></table>
        {list.length === 0 && <p style={{ fontSize: 12.5, color: "var(--faint)", padding: 18 }}>No players match.</p>}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

export default function RebuildApp() {
  const [view, setView] = useState("landing");
  const [selected, setSelected] = useState(null);
  const [team, setTeam] = useState(null);
  const data = useData();
  const go = (v) => { setView(v); window.scrollTo(0, 0); };
  const openPlayer = (p) => { setSelected(p); setView("profile"); window.scrollTo(0, 0); };
  const openTeam = (t) => { setTeam(t); setView("teamDetail"); window.scrollTo(0, 0); };

  if (!data) return <div className="rebuild" style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--disp)", letterSpacing: ".2em", textTransform: "uppercase", fontSize: 12 }}>Loading the board…</div>;

  return (
    <div className="rebuild">
      <Header view={view} go={go} />
      {view === "landing" && <Landing data={data} go={go} openPlayer={openPlayer} />}
      {view === "profile" && <PublicProfile player={selected || data.featured} data={data} go={go} />}
      {view === "prospects" && <ProspectsView data={data} openPlayer={openPlayer} />}
      {view === "dash" && <Dashboard go={go} />}
      {view === "teams" && <TeamsView data={data} openTeam={openTeam} />}
      {view === "teamDetail" && team && <TeamDetail team={team} schedule={data.schedule} openPlayer={openPlayer} back={() => go("teams")} />}
      {view === "coach" && <CoachHQ data={data} openPlayer={openPlayer} />}
    </div>
  );
}
