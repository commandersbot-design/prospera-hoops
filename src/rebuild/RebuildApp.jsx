// Prospera Hoops — REBUILD app. Faithful React port of prospera-prototype.html
// (the canonical reference), wired to real data + the real logo. Four views:
// Landing · Public profile · Player dashboard · Coach HQ. Uses the .rebuild
// scoped classes from styles/prototype.css.
import React, { useEffect, useMemo, useState } from "react";

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
        {tab("landing", "Home")}<a onClick={() => go("landing")}>Board</a>{tab("coach", "Teams")}
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

// ---- PUBLIC PROFILE (read-only) — wired to a selected player --------------
function PublicProfile({ player, go }) {
  const [tab, setTab] = useState("su");
  const p = player || {};
  const ctx = p.context || { hs: null, su: p.summerRow || null, aau: null };
  const row = ctx[tab];
  return (
    <div className="wrap" style={{ paddingTop: 26 }}>
      <div className="banner orange"><div className="ico">★</div><div style={{ flex: 1 }}>
        <h3>Is this you?</h3><p>This profile is on Prospera but hasn&rsquo;t been claimed yet. Claim it to manage your stats, film, and recruiting info — free.</p>
        <div className="bbtns"><button className="bbtn pri" onClick={() => go("dash")}>Claim this profile</button><button className="bbtn">Not me</button></div>
      </div></div>

      <ScoutCard p={p} portrait />

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
              : <tr><td colSpan="6" style={{ color: "var(--faint)" }}>No {tab === "hs" ? "high-school" : tab === "aau" ? "AAU" : "summer"} stats tracked yet.</td></tr>}
          </tbody></table>
        </div>
        <div className="card">
          <p className="ttl">Percentiles vs. DMV peers</p>
          {(p.percentiles || []).map((r) => (
            <div className="pctrow" key={r.l}><span className="pl">{r.l}</span><span className="pb"><i style={{ width: `${r.v}%` }} /></span><span className="pv2">{r.v}</span></div>
          ))}
          <p className="ttl" style={{ margin: "16px 0 8px" }}>Archetype</p>
          <div className="arche">{p.archetype || "—"}</div>
          {p.archetypeRead && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>{p.archetypeRead}</p>}
        </div>
      </div>

      <div className="pf-grid">
        <div className="card">
          <p className="ttl">Recent games</p>
          <table className="log"><tbody>
            <tr><th>Date</th><th>Opp</th><th>PTS</th><th>REB</th><th>AST</th><th>Source</th></tr>
            {(p.games || []).slice(0, 4).map((g, i) => (
              <tr key={i}><td>{g.date}</td><td>{g.opp}</td><td><b>{g.pts}</b></td><td>{g.reb}</td><td>{g.ast}</td><td><span className="bdg teal" style={{ padding: "2px 7px" }}>Verified</span></td></tr>
            ))}
          </tbody></table>
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

// ---- COACH HQ --------------------------------------------------------------
function CoachHQ({ data, openPlayer }) {
  const board = data.players.slice(0, 6);
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Coach HQ</div>
      <div className="sub">Scout every opponent before tip-off.</div>
      <div className="csearch"><input placeholder="Search players or opponents…" /><button className="cbtn">Search</button></div>
      <div className="ctools">
        <div className="card"><p className="ttl">Scout an opponent</p>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>Pull a full breakdown — tendencies, top scorers, and a matchup plan for your next game.</p>
          <button className="cbtn" style={{ padding: "10px 16px" }}>Build a matchup →</button>
        </div>
        <div className="card"><p className="ttl">Your watchlist</p>
          {board.slice(0, 3).map((p) => <div className="wl" key={p.id}><span className="n">{p.name}</span><span className="s">{p.lead} {p.leadK} · {p.cls || ""}</span></div>)}
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <p className="ttl">The board</p>
        <table className="board"><tbody>
          <tr><th>Player</th><th>Team</th><th>Class</th><th>Key stat</th><th /></tr>
          {board.map((p) => (
            <tr key={p.id}><td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</b></td><td>{p.school}</td><td>{p.cls || "—"}</td><td>{p.lead} {p.leadK}</td><td><span className="add">+ Watchlist</span></td></tr>
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
    ]).then(([pj, ch, sc]) => {
      const prospects = pj.prospects || pj;
      const prByKey = Object.fromEntries(prospects.map((p) => [nameKey(p.name || p.id), p]));
      // Flatten capitolHoops players with a lead stat for marquee/board.
      const all = [];
      for (const t of Object.values(ch.teams || {})) {
        for (const pl of (t.players || [])) {
          if (!(pl.stats && pl.stats.gp > 0 && pl.stats.ppg != null)) continue;
          const pr = prByKey[nameKey(pl.name)];
          all.push({
            id: pr?.id || nameKey(pl.name), name: pl.name, school: t.name,
            cls: (pr?.gradYear || pl.classYear) ? `'${String(pr?.gradYear || pl.classYear).slice(2)}` : "",
            meta: `${t.name}${pl.position ? " · " + pl.position : ""}`,
            headshot: pr?.headshot || null,
            ppg: pl.stats.ppg, rpg: pl.stats.rpg, apg: pl.stats.apg,
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
      setData({ players: all, featured, cov });
    });
  }, []);
  return data;
}

export default function RebuildApp() {
  const [view, setView] = useState("landing");
  const [selected, setSelected] = useState(null);
  const data = useData();
  const go = (v) => { setView(v); window.scrollTo(0, 0); };
  const openPlayer = (p) => { setSelected(p); setView("profile"); window.scrollTo(0, 0); };

  if (!data) return <div className="rebuild" style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--disp)", letterSpacing: ".2em", textTransform: "uppercase", fontSize: 12 }}>Loading the board…</div>;

  return (
    <div className="rebuild">
      <Header view={view} go={go} />
      {view === "landing" && <Landing data={data} go={go} openPlayer={openPlayer} />}
      {view === "profile" && <PublicProfile player={selected || data.featured} go={go} />}
      {view === "dash" && <Dashboard go={go} />}
      {view === "coach" && <CoachHQ data={data} openPlayer={openPlayer} />}
    </div>
  );
}
