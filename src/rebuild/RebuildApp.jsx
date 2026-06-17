// Prospera Hoops — REBUILD app. Faithful React port of prospera-prototype.html
// (the canonical reference), wired to real data + the real logo. Four views:
// Landing · Public profile · Player dashboard · Coach HQ. Uses the .rebuild
// scoped classes from styles/prototype.css.
import React, { useEffect, useMemo, useState } from "react";
import { DevelopmentSection } from "../components/DevelopmentArc";
import { buildArc } from "../lib/developmentArc";
import { buildArchetypeCohort, archetypeForPlayer } from "../lib/archetype";
import SCHEDULE_DATA from "../data/schedule.json";
import { useAuth } from "../lib/auth.jsx";
import { submitClaim, myClaimForPlayer, myClaims } from "../lib/profiles.js";
import { startCheckout, hasPlus } from "../lib/billing.js";

const LOGO = "/brand/svg/prosperahoops-lockup-dark.svg";
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
function Header({ view, go }) {
  const { user, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = (id, label) => { go(id); setMenuOpen(false); };
  const tab = (id, label) => <a className={view === id ? "on" : ""} onClick={() => go(id)}>{label}</a>;
  const mtab = (id, label) => <a className={view === id ? "on" : ""} onClick={() => nav(id)}>{label}</a>;
  return (
    <header className="hd"><div className="hd-in" style={{ position: "relative" }}>
      <a className="logo" onClick={() => go("landing")} title="Home"><img src={LOGO} alt="Prospera Hoops" /></a>
      <nav className="nav">
        {tab("landing", "Home")}{tab("prospects", "Prospects")}{tab("teams", "Teams")}{tab("coach", "Coach HQ")}
      </nav>
      <div className="hd-r">
        {user ? <>
          <div className="av" onClick={() => go("dash")} title={user.email}>{initials(user.email)}</div>
          <a className="login" onClick={() => signOut()}>Log out</a>
        </> : <>
          <a className="login" onClick={() => setSignInOpen(true)}>Log in</a>
          <button className="claim-sm" onClick={() => go("prospects")}>Claim your profile</button>
        </>}
        <button className="nav-burger" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? "✕" : "☰"}</button>
      </div>
      {menuOpen && (
        <div className="nav-menu" onMouseLeave={() => setMenuOpen(false)}>
          {mtab("landing", "Home")}{mtab("prospects", "Prospects")}{mtab("teams", "Teams")}{mtab("coach", "Coach HQ")}
          <div className="mdiv" />
          {user ? <>{mtab("dash", "My Dashboard")}<a onClick={() => { signOut(); setMenuOpen(false); }}>Log out</a></>
            : <><a onClick={() => { setSignInOpen(true); setMenuOpen(false); }}>Log in</a><a onClick={() => nav("prospects")}>Claim your profile</a></>}
        </div>
      )}
      {signInOpen && <Modal onClose={() => setSignInOpen(false)}><p className="ttl" style={{ marginTop: 0 }}>Sign in to Prospera</p><SignInForm onSignedIn={() => setSignInOpen(false)} intro={<p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>Enter your email and we’ll send a one-tap sign-in link — no password.</p>} /></Modal>}
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
  // Editorial depth (carried from the pre-rebuild card): measurables + written read.
  const inFt = (i) => (i ? `${Math.floor(i / 12)}'${i % 12}"` : null);
  const wtStr = prospect.weightLbs ? `${prospect.weightLbs} lb` : null;
  const measur = [["Height", inFt(prospect.heightInches)], ["Weight", wtStr], ["Wingspan", inFt(prospect.wingspanInches)], ["Class", p.cls || null], ["Pos", p.pos || null]];
  const hasMeasur = measur.some(([, v]) => v);
  const hasSummary = prospect.summary && prospect.summary.length > 20 && !/profile in progress/i.test(prospect.summary);
  const first = (p.name || "").split(" ")[0] || "This player";
  const autoRead = archetype?.label
    ? `${first} profiles as a ${archetype.label.toLowerCase()} in summer-league play${why ? ` — ${why.toLowerCase()}` : ""}.`
    : `${first}'s summer-league stat line is live and verified.`;
  const { user } = useAuth();
  const [claimOpen, setClaimOpen] = useState(false);
  const [myClaim, setMyClaim] = useState(null);
  const [plus, setPlus] = useState(false);
  useEffect(() => { let live = true; setMyClaim(null); if (user && p?.id) myClaimForPlayer(p.id).then((c) => { if (live) setMyClaim(c); }).catch(() => {}); return () => { live = false; }; }, [user, p?.id]);
  useEffect(() => { let live = true; if (user) hasPlus().then((v) => { if (live) setPlus(v); }).catch(() => {}); else setPlus(false); return () => { live = false; }; }, [user]);
  return (
    <div className="wrap" style={{ paddingTop: 26 }}>
      {myClaim?.status === "approved" ? (
        <div className="banner" style={{ borderColor: "rgba(47,191,143,.4)" }}><div className="ico" style={{ color: "var(--teal)" }}>✓</div><div style={{ flex: 1 }}>
          <h3>You own this profile</h3><p>Manage your stats, film, and recruiting info from your dashboard.</p>
          <div className="bbtns"><button className="bbtn pri" onClick={() => go("dash")}>Go to dashboard</button></div>
        </div></div>
      ) : myClaim ? (
        <div className="banner orange"><div className="ico">⏳</div><div style={{ flex: 1 }}>
          <h3>Claim pending review</h3><p>Your claim on this profile is being confirmed — we’ll email you when it’s approved, usually within a day.</p>
        </div></div>
      ) : (
        <div className="banner orange"><div className="ico">★</div><div style={{ flex: 1 }}>
          <h3>Is this you?</h3><p>This profile is on Prospera but hasn&rsquo;t been claimed yet. Claim it to manage your stats, film, and recruiting info — free.</p>
          <div className="bbtns"><button className="bbtn pri" onClick={() => setClaimOpen(true)}>Claim this profile</button><button className="bbtn" onClick={() => go("prospects")}>Not me</button></div>
        </div></div>
      )}
      {claimOpen && <ClaimPanel player={p} onClose={() => setClaimOpen(false)} />}

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

      <div className="card" style={{ marginTop: 16 }}>
        <p className="ttl">Scouting report</p>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "2px 0 16px" }}>
          {measur.map(([l, v]) => (
            <div key={l}><div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 19, lineHeight: 1.1, color: v ? "var(--ink)" : "var(--faint)" }}>{v || "—"}</div><div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--faint)", marginTop: 2 }}>{l}</div></div>
          ))}
        </div>
        <p className="ttl" style={{ margin: "0 0 7px" }}>The read</p>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          {hasSummary ? prospect.summary : autoRead}
          {!hasSummary && <> A full written report{hasMeasur ? "" : ", verified measurements,"} and recruiting timeline are pending — <b style={{ color: "var(--ink)", cursor: "pointer" }} onClick={() => setClaimOpen(true)}>claim this profile</b> to add them, free.</>}
        </p>
      </div>

      {arc && arc.seasons && arc.seasons.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p className="ttl" style={{ margin: 0 }}>Development Arc</p>
            <span className="bdg gold">★ Prospera+</span>
          </div>
          {plus ? (
            <div style={{ marginTop: 10 }}><DevelopmentSection arc={arc} prospect={prospect} /></div>
          ) : (
            <div className="lock" style={{ paddingTop: 10 }}>
              <div className="blur" style={{ maxWidth: 420, margin: "4px auto 12px" }}><span style={{ width: "92%" }} /><span style={{ width: "74%" }} /><span style={{ width: "85%" }} /><span style={{ width: "66%" }} /></div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 360, margin: "0 auto 12px", lineHeight: 1.5 }}>
                See how {(p.name || "").split(" ")[0]} has grown season over season — scoring efficiency, role, and the honest read behind the numbers.
              </div>
              <button className="claim-big" style={{ fontSize: 15, padding: "11px 18px" }} onClick={() => go("plus")}>🔒 Unlock with Prospera+ · $5/mo</button>
            </div>
          )}
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

// ---- auth + claim ----------------------------------------------------------
const INP = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", width: "100%", fontSize: 14, padding: "12px 14px" };

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", zIndex: 200, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 440, width: "100%", position: "relative" }}>
        <span onClick={onClose} style={{ position: "absolute", top: 10, right: 14, cursor: "pointer", color: "var(--faint)", fontSize: 22, lineHeight: 1 }}>×</span>
        {children}
      </div>
    </div>
  );
}

// Magic-link sign-in. Falls back to an honest email CTA when Supabase is unconfigured.
function SignInForm({ onSignedIn, intro }) {
  const { configured, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (user && onSignedIn) onSignedIn(user); }, [user]);
  if (!configured) return <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>Accounts open at launch. To claim your profile now, email <a href="mailto:claims@prosperahoops.com" style={{ color: "var(--orange)" }}>claims@prosperahoops.com</a> and we’ll set you up.</p>;
  if (user) return null;
  const send = async () => { setErr(""); if (!/.+@.+\..+/.test(email)) { setErr("Enter a valid email."); return; } setBusy(true); try { await signIn(email); setSent(true); } catch (e) { setErr(String(e.message || e)); } finally { setBusy(false); } };
  if (sent) return <div>{intro}<p className="ttl" style={{ margin: "4px 0 6px" }}>Check your email</p><p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>We sent a one-tap sign-in link to <b style={{ color: "var(--ink)" }}>{email}</b>. Open it on this device to finish.</p></div>;
  return (
    <div>
      {intro}
      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} type="email" placeholder="you@email.com" style={INP} />
      {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "8px 0 0" }}>{err}</p>}
      <button className="cta" style={{ marginTop: 12 }} onClick={send} disabled={busy}>{busy ? "Sending…" : "Send magic link"}</button>
    </div>
  );
}

// Claim a specific player profile. Sign-in → role → submitClaim (pending review).
function ClaimPanel({ player, onClose }) {
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [role, setRole] = useState("player");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { let live = true; if (user && player?.id) myClaimForPlayer(player.id).then((c) => { if (live) setClaim(c); }).catch(() => {}); return () => { live = false; }; }, [user, player?.id]);
  const submit = async () => { setErr(""); setBusy(true); try { const c = await submitClaim({ player_id: player.id, player_name: player.name, school: player.school, role }); setClaim(c || { status: "pending" }); } catch (e) { setErr(String(e.message || e)); } finally { setBusy(false); } };
  const first = (player.name || "").split(" ")[0] || "this player";
  return (
    <Modal onClose={onClose}>
      <p className="ttl" style={{ marginTop: 0 }}>Claim {player.name}</p>
      {claim ? (
        <div>
          <span className="bdg teal" style={{ display: "inline-block", marginBottom: 10 }}>{claim.status === "approved" ? "✓ You own this profile" : "Claim submitted"}</span>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{claim.status === "approved" ? "You can manage your stats, film, and recruiting info from your dashboard." : "Your claim is pending review — we’ll email you when it’s approved, usually within a day."}</p>
        </div>
      ) : !user ? (
        <SignInForm intro={<p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>Sign in to claim this profile — free. Manage your stats, film, and recruiting info.</p>} />
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 4px" }}>Signed in as <b style={{ color: "var(--ink)" }}>{user.email}</b>. Your relationship to {first}:</p>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 14px" }}>{["player", "parent", "coach"].map((r) => <FilterChip key={r} on={role === r} onClick={() => setRole(r)}>{r}</FilterChip>)}</div>
          {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
          <button className="cta" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit claim"}</button>
        </div>
      )}
    </Modal>
  );
}

// ---- PLAYER DASHBOARD ------------------------------------------------------
function Dashboard({ go, openClaimedPlayer }) {
  const { user, configured, loading, signOut } = useAuth();
  const [claims, setClaims] = useState(null);
  useEffect(() => { let live = true; if (user) myClaims().then((c) => { if (live) setClaims(c || []); }).catch(() => { if (live) setClaims([]); }); else setClaims(null); return () => { live = false; }; }, [user]);

  // Not signed in → sign-in prompt.
  if (!user) {
    return (
      <div className="wrap" style={{ paddingTop: 24, maxWidth: 460 }}>
        <div className="hello">Your dashboard</div>
        <div className="sub">Sign in to claim and manage your profile.</div>
        <div className="card" style={{ marginTop: 18 }}>
          {loading ? <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Checking your session…</p>
            : <SignInForm intro={<p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>{configured ? "Enter your email and we’ll send a one-tap sign-in link — no password." : "Accounts open at launch."}</p>} />}
        </div>
        <div style={{ height: 40 }} />
      </div>
    );
  }

  const approved = (claims || []).filter((c) => c.status === "approved");
  const pending = (claims || []).filter((c) => c.status !== "approved");
  const firstName = (approved[0]?.player_name || user.email || "").split(/[ @]/)[0];

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="hello">Welcome{firstName ? <>, <span>{firstName}.</span></> : "."}</div>
          <div className="sub">{user.email}</div>
        </div>
        <a className="login" style={{ cursor: "pointer" }} onClick={() => signOut()}>Log out</a>
      </div>

      {claims === null ? <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 18 }}>Loading your profiles…</p> : (
        <>
          {pending.length > 0 && (
            <div className="banner orange" style={{ marginTop: 18 }}><div className="ico">⏳</div><div style={{ flex: 1 }}>
              <h3>{pending.length === 1 ? "Claim pending review" : `${pending.length} claims pending review`}</h3>
              <p>We’re confirming {pending.length === 1 ? "your claim" : "your claims"} for {pending.map((c) => c.player_name).join(", ")}. You’ll get an email the moment {pending.length === 1 ? "it’s" : "they’re"} approved — usually within a day.</p>
            </div></div>
          )}

          <div className="dgrid" style={{ marginTop: 18 }}>
            <div className="card">
              <p className="ttl">Your claimed profiles</p>
              {claims.length === 0 ? (
                <div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>You haven’t claimed a profile yet. Find yours on the board and hit <b style={{ color: "var(--ink)" }}>Claim this profile</b>.</p>
                  <button className="cta" onClick={() => go("prospects")}>Find my profile</button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {claims.map((c) => (
                    <div key={c.id || c.player_id} className="wl" style={{ cursor: c.status === "approved" ? "pointer" : "default" }} onClick={() => c.status === "approved" && openClaimedPlayer && openClaimedPlayer(c.player_id)}>
                      <span className="n">{c.player_name}</span>
                      <span className="s">{c.school || ""}</span>
                      <span className={`bdg ${c.status === "approved" ? "teal" : ""}`} style={{ marginLeft: 8 }}>{c.status === "approved" ? "✓ Owned" : "Pending"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="up"><h3>Prospera+</h3><div className="price"><b>$5/mo</b> · or $39/yr</div>
                <ul><li>Full Development Arc</li><li>See who viewed your profile</li><li>Verified badge</li><li>Printable recruiting one-pager</li></ul>
                <button className="cta" onClick={() => go("plus")}>Start 30-day free trial</button>
                <div className="alt">★ or apply for a Founding spot — free for life</div>
              </div>
            </div>
          </div>
        </>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- PROSPERA+ checkout ----------------------------------------------------
function PlusView({ go }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const start = async () => {
    if (!user) { setNote("Sign in first — then your free trial is one tap."); go("dash"); return; }
    setNote(""); setBusy(true);
    const res = await startCheckout({ plan, email: user.email, userId: user.id });
    setBusy(false);
    if (!res.ok) setNote(res.reason === "unconfigured"
      ? "Prospera+ checkout opens at launch — you’re signed in, so we’ll email you the moment it’s live."
      : (res.detail || "Couldn’t start checkout — please try again in a moment."));
  };
  const price = plan === "yearly" ? { big: "$39", per: "/yr", sub: "Two months free vs. monthly" } : { big: "$5", per: "/mo", sub: "30-day free trial · cancel anytime" };
  return (
    <div className="wrap" style={{ paddingTop: 26, maxWidth: 560 }}>
      <a onClick={() => go("dash")} style={{ fontSize: 12.5, color: "var(--orange)", fontWeight: 700, cursor: "pointer" }}>← Back</a>
      <div className="hello" style={{ marginTop: 8 }}>Prospera<span style={{ color: "var(--orange)" }}>+</span></div>
      <div className="sub">Your whole profile, unlocked — and the full Development Arc.</div>
      <div className="up" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <FilterChip on={plan === "monthly"} onClick={() => setPlan("monthly")}>Monthly</FilterChip>
          <FilterChip on={plan === "yearly"} onClick={() => setPlan("yearly")}>Yearly · save</FilterChip>
        </div>
        <div className="price"><b>{price.big}</b> {price.per}</div>
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 12px" }}>{price.sub}</div>
        <ul>
          <li>Full Development Arc — season-over-season growth + the honest read</li>
          <li>See who viewed your profile</li>
          <li>Verified badge</li>
          <li>Printable recruiting one-pager</li>
          <li>More film slots + recruiting alerts</li>
        </ul>
        <button className="cta" onClick={start} disabled={busy}>{busy ? "Starting…" : (user ? "Start 30-day free trial" : "Sign in to start")}</button>
        <div className="alt">★ or apply for a Founding spot — free for life</div>
        {note && <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>{note}</p>}
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
  const [mode, setMode] = useState("teams"); // teams | schedule
  const list = useMemo(() => { const k = q.trim().toLowerCase(); return data.teams.filter((t) => (!k || t.name.toLowerCase().includes(k))); }, [q, data.teams]);
  const teamNames = useMemo(() => new Set(data.teams.map((t) => t.name.toLowerCase())), [data.teams]);
  const games = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (data.schedule || [])
      .filter((g) => (!k || (g.home || "").toLowerCase().includes(k) || (g.away || "").toLowerCase().includes(k)))
      .filter((g) => g.date)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 80);
  }, [q, data.schedule]);
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="hello">Teams</div>
      <div className="sub">{data.teams.length} teams · Capitol Hoops Summer League &amp; DMV programs</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "14px 0 4px" }}>
        <FilterChip on={mode === "teams"} onClick={() => setMode("teams")}>Teams</FilterChip>
        <FilterChip on={mode === "schedule"} onClick={() => setMode("schedule")}>Schedule</FilterChip>
      </div>
      <div className="csearch" style={{ marginTop: 10 }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "teams" ? "Search a team…" : "Search by team in the schedule…"} /></div>

      {mode === "teams" ? (
        <div className="anat" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", marginTop: 4 }}>
          {list.length ? list.map((t) => (
            <div className="feat" key={t.slug} style={{ cursor: "pointer" }} onClick={() => openTeam(t)}>
              <p className="ft">{t.name}</p>
              <p>{t.n} players{t.top ? ` · top scorer ${t.top.name} (${r1(t.top.ppg)} PPG)` : ""}</p>
            </div>
          )) : <p style={{ fontSize: 13, color: "var(--faint)", gridColumn: "1/-1" }}>No teams match those filters.</p>}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 4 }}>
          <p className="ttl">League schedule &amp; results</p>
          {games.length ? (
            <table className="log"><tbody>
              <tr><th>Date</th><th>Matchup</th><th>Result</th></tr>
              {games.map((g, i) => {
                const fin = g.status === "final" && g.homeScore != null;
                const hk = teamNames.has((g.home || "").toLowerCase()), ak = teamNames.has((g.away || "").toLowerCase());
                const tm = (nm, known) => <span onClick={() => { const t = data.teams.find((x) => x.name.toLowerCase() === (nm || "").toLowerCase()); if (t) openTeam(t); }} style={known ? { cursor: "pointer", color: "var(--ink)", fontWeight: 600 } : {}}>{cleanOpp(nm)}</span>;
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{(g.dateLabel || g.date || "").replace(/,?\s*\d{4}$/, "")}</td>
                    <td>{tm(g.away, ak)} <span style={{ color: "var(--faint)" }}>@</span> {tm(g.home, hk)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fin ? <b>{g.awayScore}–{g.homeScore}</b> : (g.time || "—")}</td>
                  </tr>
                );
              })}
            </tbody></table>
          ) : <p style={{ fontSize: 12.5, color: "var(--faint)" }}>No games match that search.</p>}
        </div>
      )}
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

// ---- COACH HQ — full coach tier (Scouting / Matchup / My Team / Lists) -----
function teamRecord(team, schedule) {
  let w = 0, l = 0;
  for (const g of (schedule || [])) {
    const home = (g.home || "").toLowerCase() === team.name.toLowerCase();
    if (!(home || (g.away || "").toLowerCase() === team.name.toLowerCase()) || g.status !== "final" || g.homeScore == null) continue;
    const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore;
    (us > them ? w++ : l++);
  }
  return { w, l };
}
const teamAvgPpg = (t) => t.players.length ? (t.players.reduce((s, p) => s + (p.ppg || 0), 0) / t.players.length).toFixed(1) : "—";

function TeamReport({ team, schedule, wl, openPlayer, headLabel = "Read" }) {
  const finals = (schedule || []).filter((g) => [g.home, g.away].some((x) => (x || "").toLowerCase() === team.name.toLowerCase()) && g.status === "final" && g.homeScore != null).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const rec = teamRecord(team, schedule);
  const maxP = Math.max(...team.players.slice(0, 6).map((p) => p.ppg || 0), 1);
  const guardHeavy = team.players.filter((p) => /g/i.test(p.pos || "")).length / Math.max(1, team.players.length) > 0.5;
  const top = team.top;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="covchip"><b>{rec.w}-{rec.l}</b><span>Record</span></span>
        <span className="covchip"><b>{teamAvgPpg(team)}</b><span>Avg PPG/pl</span></span>
        <span className="covchip"><b>{team.n}</b><span>Roster</span></span>
      </div>
      {top && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
        <b style={{ color: "var(--orange)", textTransform: "uppercase", fontFamily: "var(--disp)", letterSpacing: ".06em", fontSize: 11 }}>{headLabel}</b><br />
        {guardHeavy ? "Guard-heavy, perimeter-oriented." : "Balanced front-and-back."} <b style={{ color: "var(--ink)" }}>{top.name}</b> is the engine at {r1(top.ppg)} PPG.
      </p>}
      <p className="ttl" style={{ margin: "4px 0 10px" }}>Top players</p>
      <div style={{ display: "grid", gap: 9 }}>
        {team.players.slice(0, 6).map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 58px", gap: 10, alignItems: "center" }}>
            <span onClick={() => openPlayer(p)} style={{ cursor: "pointer", fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 13.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: "var(--faint)", fontSize: 10.5, fontFamily: "var(--sans)" }}>{p.pos || ""}</span></span>
            <span style={{ height: 7, borderRadius: 9, background: "rgba(244,242,237,.08)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${Math.round((p.ppg || 0) / maxP * 100)}%`, background: "linear-gradient(90deg,var(--orange),var(--gold-a))" }} /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}><span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14 }}>{r1(p.ppg)}</span><span className="add" onClick={(e) => { e.stopPropagation(); wl.toggle(p.id); }}>{wl.has(p.id) ? "✓" : "+"}</span></span>
          </div>
        ))}
      </div>
      {finals.length > 0 && <><p className="ttl" style={{ margin: "16px 0 8px" }}>Recent form</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{finals.slice(0, 6).map((g, i) => { const home = (g.home || "").toLowerCase() === team.name.toLowerCase(); const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; const win = us > them; return <span key={i} title={`${home ? "vs " : "@ "}${cleanOpp(home ? g.away : g.home)}`} style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 11, padding: "4px 8px", borderRadius: 6, background: win ? "rgba(47,191,143,.15)" : "rgba(244,242,237,.06)", color: win ? "var(--teal)" : "var(--muted)" }}>{win ? "W" : "L"} {us}-{them}</span>; })}</div></>}
    </div>
  );
}

function CoachHQ({ data, openPlayer }) {
  const wl = useWatchlist();
  const [tab, setTab] = useState("scout");
  const [oppA, setOppA] = useState("");
  const [oppB, setOppB] = useState("");
  const [mine, setMine] = useState("");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState(() => { try { return localStorage.getItem("ph_notes") || ""; } catch (e) { return ""; } });
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  const find = (slug) => data.teams.find((t) => t.slug === slug) || null;
  const Picker = ({ value, onChange, ph }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, width: "100%", fontSize: 14, padding: "12px 14px" }}>
      <option value="">{ph}</option>{data.teams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
    </select>
  );
  const board = useMemo(() => { const k = q.trim().toLowerCase(); return data.players.filter((p) => !k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)).slice(0, 50); }, [q, data.players]);
  const watchPlayers = data.players.filter((p) => wl.has(p.id));
  const a = find(oppA), b = find(oppB), my = find(mine);
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="hello">Coach HQ</div><span className="ctx">Free this season</span>
      </div>
      <div className="sub">Scout opponents, build matchups, and run your team — your whole sideline brain, in one place.</div>
      <div className="tabs" style={{ margin: "16px 0", flexWrap: "wrap" }}>
        {[["scout", "Opponent Scouting"], ["matchup", "Matchup Builder"], ["myteam", "My Team"], ["lists", "Lists & Notes"]].map(([k, l]) => <span key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</span>)}
      </div>

      {tab === "scout" && (
        <div className="card">
          <p className="ttl">Scout an opponent</p>
          <div style={{ marginBottom: 12 }}><Picker value={oppA} onChange={setOppA} ph="Choose a team…" /></div>
          {a ? <TeamReport team={a} schedule={data.schedule} wl={wl} openPlayer={openPlayer} headLabel="Game plan" />
            : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick a team to pull their record, scoring threats, tendencies, and recent form — your full pre-game scouting report.</p>}
        </div>
      )}

      {tab === "matchup" && (
        <div className="card">
          <p className="ttl">Build a matchup — team vs team</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Picker value={oppA} onChange={setOppA} ph="Your team / Team A…" />
            <Picker value={oppB} onChange={setOppB} ph="Opponent / Team B…" />
          </div>
          {a && b ? (() => {
            const ra = teamRecord(a, data.schedule), rb = teamRecord(b, data.schedule);
            const aa = +teamAvgPpg(a), ab = +teamAvgPpg(b);
            const wp = (r) => r.w / Math.max(1, r.w + r.l);
            const row = (label, va, vb, better) => (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: better === "a" ? "var(--orange)" : "var(--ink)" }}>{va}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)", whiteSpace: "nowrap" }}>{label}</span>
                <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: better === "b" ? "var(--orange)" : "var(--ink)" }}>{vb}</span>
              </div>
            );
            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 16 }}>{a.name}</span>
                  <span style={{ color: "var(--faint)", fontFamily: "var(--disp)", fontSize: 14 }}>vs</span>
                  <span style={{ fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 16 }}>{b.name}</span>
                </div>
                {row("Record", `${ra.w}-${ra.l}`, `${rb.w}-${rb.l}`, wp(ra) >= wp(rb) ? "a" : "b")}
                {row("Avg PPG/player", aa, ab, aa >= ab ? "a" : "b")}
                {row("Top scorer", a.top ? r1(a.top.ppg) : "—", b.top ? r1(b.top.ppg) : "—", (a.top?.ppg || 0) >= (b.top?.ppg || 0) ? "a" : "b")}
                {row("Roster size", a.n, b.n, a.n >= b.n ? "a" : "b")}
                <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}><b style={{ color: "var(--orange)", fontFamily: "var(--disp)", textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>Key matchup</b> — {a.top?.name} vs {b.top?.name}. Win the {aa >= ab ? a.name : b.name} scoring edge and control tempo.</p>
              </div>
            );
          })() : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick two teams to compare records, scoring, and the key individual matchup.</p>}
        </div>
      )}

      {tab === "myteam" && (
        <div className="card">
          <p className="ttl">My team</p>
          <div style={{ marginBottom: 12 }}><Picker value={mine} onChange={setMine} ph="Choose your team…" /></div>
          {my ? <TeamReport team={my} schedule={data.schedule} wl={wl} openPlayer={openPlayer} headLabel="Strengths" />
            : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick your team to see your efficiency leaders, tendencies, and recent form.</p>}
        </div>
      )}

      {tab === "lists" && (
        <div className="ctools">
          <div className="card">
            <p className="ttl">Watchlist ({watchPlayers.length})</p>
            {watchPlayers.length ? watchPlayers.map((p) => (
              <div className="wl" key={p.id}><span className="n" onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</span><span className="s">{r1(p.ppg)} PPG · {p.school}</span><span className="add" onClick={() => wl.toggle(p.id)} style={{ marginLeft: 8 }}>Remove</span></div>
            )) : <p style={{ fontSize: 12.5, color: "var(--faint)", margin: 0 }}>No players yet — add from the board or a scouting report.</p>}
            <p className="ttl" style={{ margin: "16px 0 8px" }}>Game-prep notes</p>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); try { localStorage.setItem("ph_notes", e.target.value); } catch (er) { /* ignore */ } }} placeholder="Private notes, tags, game plan…" style={{ ...inp, width: "100%", minHeight: 90, fontSize: 13, padding: 10, resize: "vertical" }} />
          </div>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <p className="ttl" style={{ margin: 0 }}>The board</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players…" style={{ ...inp, fontSize: 13, padding: "8px 12px", minWidth: 160 }} />
            </div>
            <table className="board"><tbody>
              <tr><th>Player</th><th>Team</th><th>PPG</th><th /></tr>
              {board.map((p) => (
                <tr key={p.id}><td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</b></td><td>{p.school}</td><td>{p.lead}</td><td><span className="add" onClick={() => wl.toggle(p.id)}>{wl.has(p.id) ? "✓" : "+ Watch"}</span></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}
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
      fetch("/data/gameLogs.json").then((r) => r.ok ? r.json() : { players: {} }).catch(() => ({ players: {} })),
    ]).then(([pj, ch, sc, gj]) => {
      const sj = { games: SCHEDULE_DATA.games || SCHEDULE_DATA };
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
          const gy = pr?.gradYear || pl.classYear;
          all.push({
            id: pr?.id || nameKey(pl.name), key: nameKey(pl.name), name: pl.name, school: t.name,
            pos: pl.position || pr?.position || null,
            cls: gy ? `'${String(gy).slice(2)}` : "",
            gradYear: gy || null,
            state: pr?.state || null,
            stars: pr?.stars || null, rankings: pr?.rankings || null,
            status: pr?.status || pr?.commitment || null,
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
        const ln = (t.name || "").toLowerCase();
        const ctx = /hayfield/.test(ln) ? "HS" : (/\bakt\b|warriors|3ssb|\baau\b/.test(ln) ? "AAU" : "SUMMER");
        return { slug, name: t.name, coach: t.headCoach || null, players, top: players[0] || null, n: players.length, ctx };
      }).filter((t) => t.n > 0).sort((a, b) => a.name.localeCompare(b.name));
      const schedule = (sj.games || []);
      setData({ players: all, featured, cov, teams, schedule, gl, cohort, prByKey });
    });
  }, []);
  return data;
}

// ---- PROSPECTS — button-filter board (pre-rebuild UX + depth) --------------
const FilterChip = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? "var(--orange)" : "var(--line)"}`, background: on ? "var(--orange)" : "transparent", color: on ? "#1c0d03" : "var(--muted)", whiteSpace: "nowrap" }}>{children}</button>
);
const posIn = (pos, b) => { const x = (pos || "").toUpperCase(); if (b === "G") return /G/.test(x); if (b === "W") return /W|SF/.test(x); if (b === "F") return /F|C/.test(x); return false; };
const divider = <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />;

function ProspectsView({ data, openPlayer }) {
  const wl = useWatchlist();
  const [q, setQ] = useState("");
  const [states, setStates] = useState([]);
  const [poss, setPoss] = useState([]);
  const [cls, setCls] = useState([]);
  const [tracked, setTracked] = useState(false);
  const [sort, setSort] = useState("ranked");
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = data.players.filter((p) =>
      (!k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)) &&
      (!states.length || (p.state && states.includes(p.state))) &&
      (!poss.length || poss.some((b) => posIn(p.pos, b))) &&
      (!cls.length || cls.includes(p.cls)) &&
      (!tracked || wl.has(p.id)));
    r = sort === "az" ? [...r].sort((a, b) => a.name.localeCompare(b.name)) : [...r].sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
    return r.slice(0, 250);
  }, [q, states, poss, cls, tracked, sort, data.players, wl.ids]);
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="keye">Prospects</div>
          <div className="sub" style={{ marginTop: 4 }}>The full DMV database · {data.players.length} profiles · ranked board first, the rest by summer stat</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player or school…" style={{ ...inp, minWidth: 220, fontSize: 14, padding: "11px 14px" }} />
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "16px 0 8px", alignItems: "center" }}>
        {["DC", "MD", "VA"].map((s) => <FilterChip key={s} on={states.includes(s)} onClick={() => tog(states, setStates, s)}>{s}</FilterChip>)}
        {divider}
        {["G", "W", "F"].map((b) => <FilterChip key={b} on={poss.includes(b)} onClick={() => tog(poss, setPoss, b)}>{b}</FilterChip>)}
        {divider}
        {["'27", "'28", "'29", "'30"].map((c) => <FilterChip key={c} on={cls.includes(c)} onClick={() => tog(cls, setCls, c)}>{c}</FilterChip>)}
        {divider}
        <FilterChip on={tracked} onClick={() => setTracked(!tracked)}>☆ Tracked</FilterChip>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[["ranked", "Ranked"], ["ppg", "PPG"], ["az", "A–Z"]].map(([v, l]) => <FilterChip key={v} on={sort === v} onClick={() => setSort(v)}>{l}</FilterChip>)}
        </div>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", fontSize: 11, color: "var(--faint)" }}>{data.players.length} prospects · 0 ranked</span>
      </div>

      {sort === "ranked" && (
        <div style={{ marginTop: 22 }}>
          <div className="keye" style={{ color: "var(--gold-a)" }}>Ranked Board</div>
          <p className="ksub" style={{ margin: "10px 0 0" }}>No prospects evaluated yet — the ranked board fills as the eval engine grades players. Until then, the full DMV is below by summer production.</p>
        </div>
      )}

      <div style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12, color: "var(--faint)", margin: "24px 0 6px" }}>
        {sort === "ranked" ? "Notable · not yet evaluated" : `${list.length} shown`}
      </div>
      <div>
        {list.map((p, i) => (
          <div key={`${p.id}-${i}`} onClick={() => openPlayer(p)} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 13, alignItems: "center", padding: "11px 2px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
            <div className="rav" style={{ width: 42, height: 42 }}>{p.headshot ? <img src={p.headshot} alt="" /> : initials(p.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 15.5, color: "var(--ink)" }}>{p.name}</span>
                {p.stars ? <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, fontWeight: 700, color: "var(--gold-a)", border: "1px solid rgba(245,196,81,.4)", borderRadius: 4, padding: "1px 5px" }}>{p.stars}★{p.rankings && p.rankings.national ? ` · #${p.rankings.national} Natl` : ""}</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{[p.pos, p.cls, cleanOpp(p.school), "eval pending"].filter(Boolean).join(" · ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, color: "var(--orange)", lineHeight: 1 }}>{r1(p.ppg)}</div>
              <div style={{ fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>ppg · {p.gp || 0}gp{(p.gp || 0) < 3 ? " · small" : ""}</div>
            </div>
          </div>
        ))}
        {list.length === 0 && <p style={{ fontSize: 12.5, color: "var(--faint)", padding: 18 }}>No prospects match these filters.</p>}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// View ↔ URL mapping for the simple state router (History API).
const VIEW_PATH = { landing: "/", prospects: "/prospects", teams: "/teams", coach: "/coach", dash: "/dashboard", plus: "/plus" };
const pushUrl = (path) => { try { if (window.location.pathname !== path) window.history.pushState({}, "", path); } catch (e) { /* ignore */ } };

export default function RebuildApp() {
  const [view, setView] = useState("landing");
  const [selected, setSelected] = useState(null);
  const [team, setTeam] = useState(null);
  const data = useData();
  const go = (v) => { setView(v); pushUrl(VIEW_PATH[v] || "/"); window.scrollTo(0, 0); };
  const openPlayer = (p) => { setSelected(p); setView("profile"); pushUrl(`/p/${slugify(p.name)}`); window.scrollTo(0, 0); };
  const openTeam = (t) => { setTeam(t); setView("teamDetail"); pushUrl(`/t/${t.slug}`); window.scrollTo(0, 0); };
  const openClaimedPlayer = (playerId) => { const pl = data && data.players.find((p) => p.id === playerId); if (pl) openPlayer(pl); else go("prospects"); };

  // Resolve the URL to a view on first load + on browser back/forward.
  useEffect(() => {
    if (!data) return;
    const resolve = () => {
      const path = window.location.pathname;
      if (path.startsWith("/p/")) { const s = path.slice(3).replace(/\/$/, ""); const pl = data.players.find((p) => slugify(p.name) === s); if (pl) { setSelected(pl); setView("profile"); return; } }
      if (path.startsWith("/t/")) { const s = path.slice(3).replace(/\/$/, ""); const tm = data.teams.find((t) => t.slug === s); if (tm) { setTeam(tm); setView("teamDetail"); return; } }
      const byPath = Object.fromEntries(Object.entries(VIEW_PATH).map(([v, p]) => [p, v]));
      setView(byPath[path] || "landing");
    };
    resolve();
    window.addEventListener("popstate", resolve);
    return () => window.removeEventListener("popstate", resolve);
  }, [data]);

  if (!data) return <div className="rebuild" style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--disp)", letterSpacing: ".2em", textTransform: "uppercase", fontSize: 12 }}>Loading the board…</div>;

  return (
    <div className="rebuild">
      <Header view={view} go={go} />
      {view === "landing" && <Landing data={data} go={go} openPlayer={openPlayer} />}
      {view === "profile" && <PublicProfile player={selected || data.featured} data={data} go={go} />}
      {view === "prospects" && <ProspectsView data={data} openPlayer={openPlayer} />}
      {view === "dash" && <Dashboard go={go} openClaimedPlayer={openClaimedPlayer} />}
      {view === "plus" && <PlusView go={go} />}
      {view === "teams" && <TeamsView data={data} openTeam={openTeam} />}
      {view === "teamDetail" && team && <TeamDetail team={team} schedule={data.schedule} openPlayer={openPlayer} back={() => go("teams")} />}
      {view === "coach" && <CoachHQ data={data} openPlayer={openPlayer} />}
    </div>
  );
}
