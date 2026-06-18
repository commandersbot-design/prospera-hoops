// Prospera Hoops — REBUILD app. Faithful React port of prospera-prototype.html
// (the canonical reference), wired to real data + the real logo. Four views:
// Landing · Public profile · Player dashboard · Coach HQ. Uses the .rebuild
// scoped classes from styles/prototype.css.
import React, { useEffect, useMemo, useState, useRef } from "react";
import { DevelopmentSection } from "../components/DevelopmentArc";
import { buildArc } from "../lib/developmentArc";
import { buildArchetypeCohort, archetypeForPlayer } from "../lib/archetype";
import SCHEDULE_DATA from "../data/schedule.json";
import TEAM_STATS from "../data/teamStats.json";
import NEWS_DATA from "../data/news.json";
import OFFICIAL_SCHOOL_NAMES from "../data/officialSchoolNames.json";
import { useAuth } from "../lib/auth.jsx";
import { submitClaim, myClaimForPlayer, myClaims, listClaims, setClaimStatus, submitTeamClaim, myClaimForTeam, isTeamClaim, teamSlugOf } from "../lib/profiles.js";
import { pullState, pushState } from "../lib/userState.js";
import { submitFilm, myFilms, approvedFilm, listFilms, setFilmStatus } from "../lib/film.js";
import { submitWaitlist, listWaitlist } from "../lib/waitlist.js";
import { startCheckout, hasPlus, hasCoach } from "../lib/billing.js";
import { recordScoutView, scoutViews } from "../lib/views.js";
import { useCoachAccess, hydrateCoachPass } from "../lib/coachAccess.js";
import { seasonStatLine } from "../components/StatLine.jsx";
import { playerHighlights } from "../lib/highlights.js";

const LOGO = "/brand/svg/prosperahoops-lockup-dark.svg";
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const r1 = (n) => (n == null || Number.isNaN(+n) ? "—" : (Math.round(+n * 10) / 10).toFixed(1));

// Team → state (DC/MD/VA) from schoolLocations, and public/private classification.
// Schedule data is single-context (Capitol Hoops), so we derive these from the
// real school the team maps to; ambiguous summer-club teams stay untagged.
const TEAM_STATE_OVERRIDE = { dematha: "MD" };
const PRIVATE_TEAMS = new Set(["annapolisareachristian", "boyslatin", "bullis", "concordiaprep", "dematha", "flinthill", "glenelgcountry", "gonzaga", "goodcounsel", "johncarroll", "landon", "loyolablakefield", "newhopeacademy", "potomacschool", "spalding", "stjohnsdc", "stmarysannapolis", "ststephensstagnes", "severn", "bethelacademy", "somdchristian", "takomaacademy", "virginiaacademy", "sandyspring", "clintongrace", "paulvi", "calverthall", "highlandschool", "maret", "gilman", "mcdonogh", "parkschool", "holtonarms", "edmundburke", "fieldschool", "georgetownday", "nysmith", "stalbans", "bishopmcnamara", "bishopoconnell"]);
// Name markers that reliably indicate a private/parochial school in the DMV.
const PRIVATE_RX = /(\bcatholic\b|\bchristian\b|\bacademy\b|\bpreparatory\b|\bprep\b|\bfriends\b|\bepiscopal\b|\bjesuit\b|\bcollegiate\b|\bquaker\b|\bmontessori\b|\bsidwell\b|\bgonzaga\b|\bbishop\b|\barchbishop\b|\bcardinal\b|\bseminary\b|\bbaptist\b|\blutheran\b|\badventist\b|\bhebrew\b|\bislamic\b|\byeshiva\b|day school|country day|\bsaint\b|st\.\s|\bholy\b|our lady)/i;
const teamLocCands = (name) => {
  const paren = (String(name || "").match(/\(([^)]+)\)/) || [])[1];
  const base = String(name || "").replace(/\s*\([^)]*\)/, "").trim();
  return [base, paren, name].filter(Boolean);
};
function teamState(name, locByKey) {
  const o = TEAM_STATE_OVERRIDE[nameKey(name)]; if (o) return o;
  for (const c of teamLocCands(name)) { const v = locByKey[nameKey(c)]; if (v && v.state) return v.state; }
  return null;
}
function teamType(name, locByKey) {
  for (const c of teamLocCands(name)) { if (PRIVATE_TEAMS.has(nameKey(c))) return "Private"; }
  if (PRIVATE_RX.test(name || "")) return "Private";
  return "Public"; // default: classify every school so it lands in the filter
}

// ---- color storytelling — tone a stat by how good it is --------------------
// Four-band scale: low → ok → good → elite. Used to color stats sitewide so the
// numbers tell the story at a glance instead of reading as flat grey.
const STAT_BANDS = {
  ppg: [8, 14, 20], rpg: [3.5, 6, 9], apg: [2, 3.5, 5.5], spg: [1, 1.7, 2.5], bpg: [0.5, 1, 1.7],
  fgPct: [40, 46, 52], threePct: [30, 35, 40], ftPct: [62, 72, 80], tsPct: [48, 54, 60], efg: [45, 52, 58], ato: [0.9, 1.4, 2],
};
const TONE_LOW = "#e07a5f", TONE_OK = "var(--ink)", TONE_GOOD = "var(--gold-a)", TONE_ELITE = "var(--teal)";
function statTone(kind, v) {
  const b = STAT_BANDS[kind];
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!b || n == null || Number.isNaN(n)) return "var(--ink)";
  if (n >= b[2]) return TONE_ELITE; if (n >= b[1]) return TONE_GOOD; if (n >= b[0]) return TONE_OK; return TONE_LOW;
}
// Tone by 0–100 percentile (for percentile-driven UI).
function pctTone(p) { if (p == null) return "var(--muted)"; if (p >= 80) return TONE_ELITE; if (p >= 60) return TONE_GOOD; if (p >= 35) return TONE_OK; return TONE_LOW; }
const TrendArrow = ({ d, unit }) => (d == null || d === 0 ? null : (
  <span style={{ color: d > 0 ? "var(--teal)" : "#e07a5f", fontWeight: 800, fontSize: 11, whiteSpace: "nowrap" }}>{d > 0 ? "▲" : "▼"} {Math.abs(d)}{unit || ""}</span>
));

// ---- shared: Scout Card (matches prototype .scout) -------------------------
// Routed to the one live, monitored inbox for launch. Swap to a dedicated
// headshots@ alias once that mailbox is wired up post-launch.
const HEADSHOT_EMAIL = "jalen@prosperahoops.com";
function ScoutCard({ p, portrait, onClick }) {
  return (
    <div className="scout" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <span className="crn tl" /><span className="crn tr" /><span className="crn bl" /><span className="crn br" />
      <div className="s-eye">{p.eyebrow || "Scout Card · Summer '26"}</div>
      <div className="s-head">
        <div className={`s-portrait ${portrait ? "lg" : ""}`}>
          {p.headshot ? <img src={p.headshot} alt={p.name} /> : <><span className="ph">{initials(p.name)}</span><span className="ph2">No headshot</span></>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="s-name">{p.name}</div>
          <div className="s-meta">{p.meta}</div>
          <Badges p={p} />
        </div>
      </div>
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
      {!p.headshot && !onClick && (
        <div className="s-nohead" onClick={(e) => e.stopPropagation()}>
          No headshot on file. <a href={`mailto:${HEADSHOT_EMAIL}?subject=Headshot for ${encodeURIComponent(p.name || "player")}`}>Add one →</a>
        </div>
      )}
    </div>
  );
}
function Badges({ p }) {
  return (
    <div className="badges">
      {(p.stars || (p.rankings && p.rankings.national)) ? <span className="bdg gold">{[p.stars ? `${p.stars}★` : null, p.rankings && p.rankings.national ? `#${p.rankings.national} Natl` : null].filter(Boolean).join(" · ")}</span> : null}
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
// "Lock in" / waitlist — opened from any CTA via context (no prop-drilling).
// Frictionless email capture so visitors reserve their account on day one
// without waiting on a magic-link email; real sign-in links go out later.
const LockInCtx = React.createContext(() => {});
const useLockIn = () => React.useContext(LockInCtx);

function WaitlistModal({ prefill, onClose }) {
  const { user } = useAuth();
  const addMode = !!prefill?.addPlayer; // "add me to the database" submission
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(prefill?.player_name || "");
  const [role, setRole] = useState("player");
  const [school, setSchool] = useState("");
  const [grad, setGrad] = useState("");
  const [pos, setPos] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    if (!/.+@.+\..+/.test(email)) { setErr("Enter a valid email."); return; }
    if (addMode && !name.trim()) { setErr("Enter the player’s full name."); return; }
    setBusy(true); setErr("");
    try {
      await submitWaitlist(addMode
        ? { kind: "add_player", email: email.trim(), name: name.trim(), player_name: name.trim(), school: school.trim() || null, grad_year: grad ? (parseInt(grad, 10) || null) : null, position: pos.trim() || null, role: "player" }
        : { email: email.trim(), name: name.trim() || null, role, player_id: prefill?.player_id || null, player_name: prefill?.player_name || null });
      setDone(true);
    } catch (e) { setErr("Couldn’t save that just now — try again in a moment."); }
    setBusy(false);
  };
  return (
    <Modal onClose={onClose}>
      {done ? (
        <div style={{ textAlign: "center", padding: "6px 4px" }}>
          <div style={{ fontSize: 36 }}>{addMode ? "✅" : "🔒"}</div>
          <p className="ttl" style={{ margin: "8px 0 6px", color: "var(--teal)" }}>{addMode ? "Submitted for review." : "You’re locked in."}</p>
          {addMode
            ? <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>We verify every player before they go live — no fake profiles. Once <b style={{ color: "var(--ink)" }}>{name}</b> is added, we’ll email <b style={{ color: "var(--ink)" }}>{email}</b> a link to claim the profile.</p>
            : <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{prefill?.player_name ? <><b style={{ color: "var(--ink)" }}>{prefill.player_name}</b> is reserved for you. </> : ""}We saved your spot — we’ll email <b style={{ color: "var(--ink)" }}>{email}</b> a one-tap sign-in link as we open accounts. Nothing is lost.</p>}
          <button className="cta" style={{ marginTop: 14 }} onClick={onClose}>Done</button>
        </div>
      ) : addMode ? (
        <div>
          <p className="ttl" style={{ marginTop: 0 }}>Add yourself to the board</p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>Not in the database yet? Drop your info — we <b style={{ color: "var(--ink)" }}>verify every player</b> before they go live, then email you to claim the profile and add stats.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" style={INP} />
          <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School / program" style={{ ...INP, marginTop: 10 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <input value={grad} onChange={(e) => setGrad(e.target.value)} placeholder="Grad year" inputMode="numeric" style={INP} />
            <input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="Position" style={INP} />
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email *" onKeyDown={(e) => e.key === "Enter" && submit()} style={{ ...INP, marginTop: 10 }} />
          {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "8px 0 0" }}>{err}</p>}
          <button className="cta" style={{ marginTop: 12 }} onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
          <p style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10, textAlign: "center" }}>Verified before going live — real players only. We’ll never share your email.</p>
        </div>
      ) : (
        <div>
          <p className="ttl" style={{ marginTop: 0 }}>{prefill?.player_name ? `Lock in ${prefill.player_name}` : prefill?.founding ? "Lock in a Founding spot" : "Lock in your free account"}</p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>{prefill?.founding ? "Founding members keep Prospera+ free for life — only 50 spots. Reserve yours now; " : "Reserve your spot now — "}no password, nothing to wait on. We’ll email your sign-in link as we roll out accounts.</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" onKeyDown={(e) => e.key === "Enter" && submit()} style={INP} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" style={{ ...INP, marginTop: 10 }} />
          <div style={{ display: "flex", gap: 8, margin: "12px 0 4px", flexWrap: "wrap" }}>{["player", "parent", "coach", "fan"].map((r) => <FilterChip key={r} on={role === r} onClick={() => setRole(r)}>{r}</FilterChip>)}</div>
          {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "8px 0 0" }}>{err}</p>}
          <button className="cta" style={{ marginTop: 12 }} onClick={submit} disabled={busy}>{busy ? "Locking in…" : "🔒 Lock in my spot"}</button>
          <p style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10, textAlign: "center" }}>Free forever for early members. We’ll never share your email.</p>
        </div>
      )}
    </Modal>
  );
}

function Header({ view, go }) {
  const { user, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = (id, label) => { go(id); setMenuOpen(false); };
  const lockIn = useLockIn();
  const tab = (id, label) => <a className={view === id ? "on" : ""} onClick={() => go(id)}>{label}</a>;
  const mtab = (id, label) => <a className={view === id ? "on" : ""} onClick={() => nav(id)}>{label}</a>;
  return (
    <header className="hd"><div className="hd-in" style={{ position: "relative" }}>
      <a className="logo" onClick={() => go("landing")} title="Home"><img src={LOGO} alt="Prospera Hoops" /></a>
      <nav className="nav">
        {tab("landing", "Home")}{tab("prospects", "Prospects")}{tab("leaders", "Leaders")}{tab("recaps", "Recaps")}{tab("teams", "Teams")}{tab("watchlist", "Watchlist")}{tab("coach", "Coach HQ")}
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
          {mtab("landing", "Home")}{mtab("prospects", "Prospects")}{mtab("leaders", "Leaders")}{mtab("recaps", "Recaps")}{mtab("teams", "Teams")}{mtab("watchlist", "Watchlist")}{mtab("coach", "Coach HQ")}
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
// "Live Wire" news ticker — hand-authored items + auto top performances.
function NewsTicker({ items, openPlayer }) {
  if (!items || !items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="ticker">
      <div className="ticker-tag">Live Wire</div>
      <div className="ticker-vp"><div className="ticker-row">
        {row.map((n, i) => (
          <span key={i} className="ticker-item" onClick={() => (n.player ? openPlayer(n.player) : (n.url && window.open(n.url, "_blank", "noopener")))} style={{ cursor: n.player || n.url ? "pointer" : "default" }}>
            <span className="dot">●</span>{n.text}
          </span>
        ))}
      </div></div>
    </div>
  );
}

function Landing({ data, go, openPlayer }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const k = q.trim().toLowerCase(); if (!k) return [];
    return data.players.filter((p) => p.name.toLowerCase().includes(k)).slice(0, 6);
  }, [q, data]);
  const marquee = data.players.slice(0, 8);
  const cards = (data.featuredCards && data.featuredCards.length) ? data.featuredCards : (data.featured ? [data.featured] : []);
  const [fi, setFi] = useState(0);
  useEffect(() => { if (cards.length < 2) return; const id = setInterval(() => setFi((i) => (i + 1) % cards.length), 60000); return () => clearInterval(id); }, [cards.length]);
  const featured = cards.length ? cards[fi % cards.length] : null;
  const lockIn = useLockIn();
  return (
    <>
      <NewsTicker items={data.news} openPlayer={openPlayer} />
      <section className="hero"><div className="wrap hero-in">
        <div data-anim>
          <div className="eyebrow">The DMV&rsquo;s scouting platform — high school, AAU &amp; more</div>
          <h1>You&rsquo;re already<br />on the board.</h1>
          <p className="lede">Real stats, real development — every DMV hooper, in one place. No fake rankings. No hype.</p>
          <div className="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Search your name" />
            <button>Search</button>
            <div className={results.length ? "results on" : "results"}>
              {results.map((p, i) => (
                <div className="rrow" key={`${p.id}-${i}`} onClick={() => openPlayer(p)}>
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
          {featured && <div key={featured.id || featured.name} style={{ animation: "prfade .5s ease" }}><ScoutCard p={featured} onClick={() => openPlayer(featured)} /></div>}
          {cards.length > 1 && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>{cards.map((c, i) => <span key={i} onClick={() => setFi(i)} title={c.name} style={{ width: i === fi ? 20 : 7, height: 7, borderRadius: 9, background: i === fi ? "var(--orange)" : "var(--line)", cursor: "pointer", transition: "all .25s" }} />)}</div>}
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
          {marquee.concat(marquee).map((p, i) => {
            const rank = (i % marquee.length) + 1;
            return (
              <div className="pcard" key={i} onClick={() => openPlayer(p)}>
                <span className={`prank${rank <= 3 ? " top" : ""}`}>{rank}</span>
                <div className="phead">
                  <div className="pav">{p.headshot ? <img src={p.headshot} alt="" /> : initials(p.name)}</div>
                  <div className="pp" style={{ color: statTone("ppg", p.ppg) }}>{p.lead}<small>{p.leadK}</small></div>
                </div>
                <div className="pn">{p.name}</div>
                <div className="pm">{[p.pos, p.cls, cleanOpp(p.school)].filter(Boolean).join(" · ")}</div>
              </div>
            );
          })}
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
        <div className="fmore"><a onClick={() => go("leaders")}>Leaders</a><a onClick={() => go("prospects")}>Classes</a><a onClick={() => go("recaps")}>Recaps</a></div>
        <div className="fnote">Real stats. No fake rankings. No hype.</div>
        <div className="fnote" style={{ marginTop: 8 }}>Missing a player headshot? Email <a href={`mailto:${HEADSHOT_EMAIL}`} style={{ color: "var(--orange)", fontWeight: 700 }}>{HEADSHOT_EMAIL}</a> to add or update one.</div>
      </div></footer>
    </>
  );
}

// ---- PUBLIC PROFILE (read-only) — real data + the rich Development engine --
// Resolve a Capitol Hoops team/opponent/school string to its real, official
// school name. CH summer-league names look like "Brand (School)" — the
// parenthetical IS the actual school ("GrindHouse (Huntingtown)" → Huntingtown
// HS). A "(VA)"/"(MD)"/"(DC)" paren is a state disambiguator, not a school.
// Idempotent (safe to apply to an already-official name) and falls back to the
// cleaned base name when nothing maps (e.g. the AKT 17U AAU pilot).
const OFFICIAL_NAMES = OFFICIAL_SCHOOL_NAMES.names || {};
const OFFICIAL_VALUES = new Set(Object.values(OFFICIAL_NAMES));
const schoolLabel = (s) => {
  const raw = String(s || "").trim();
  if (!raw || OFFICIAL_VALUES.has(raw)) return raw; // already official → no-op
  const base = raw.replace(/\s*\([^)]*\)/g, "").trim();
  const pm = raw.match(/\(([^)]+)\)/);
  const paren = pm ? pm[1].trim() : "";
  const isState = /^(VA|MD|DC)$/i.test(paren);
  const cands = isState ? [raw, base] : [raw, paren, base];
  for (const c of cands) if (c && OFFICIAL_NAMES[c]) return OFFICIAL_NAMES[c];
  return paren && !isState ? paren : base;
};
// Back-compat alias: every existing call site passes a team/school/opponent name.
const cleanOpp = schoolLabel;

// Full per-game log — every game, with W/L + shooting splits, expandable.
function GameLog({ games }) {
  const [all, setAll] = useState(false);
  if (!games || !games.length) return <p style={{ fontSize: 12.5, color: "var(--faint)" }}>No per-game logs yet for this player.</p>;
  const shown = all ? games : games.slice(0, 8);
  const wl = (r) => { const m = /\b(win|loss|w|l)\b/i.exec(String(r || "")); return m ? (/w/i.test(m[1]) ? "W" : "L") : null; };
  return (
    <>
      <div style={{ maxHeight: all ? 460 : "none", overflowY: all ? "auto" : "visible" }}>
        <table className="log"><tbody>
          <tr><th>Date</th><th>Opp</th><th>Res</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3PT</th></tr>
          {shown.map((g, i) => { const r = wl(g.result); return (
            <tr key={i}>
              <td style={{ whiteSpace: "nowrap" }}>{String(g.date || "").replace(/,?\s*\d{4}$/, "")}</td>
              <td>{cleanOpp(g.opp)}</td>
              <td>{r ? <b style={{ color: r === "W" ? "var(--teal)" : "var(--muted)" }}>{r}</b> : "—"}</td>
              <td><b>{g.pts ?? 0}</b></td><td>{g.reb ?? 0}</td><td>{g.ast ?? 0}</td>
              <td style={{ color: "var(--muted)" }}>{g.fgm != null ? `${g.fgm}-${g.fga}` : "—"}</td>
              <td style={{ color: "var(--muted)" }}>{g.tpm != null ? `${g.tpm}-${g.tpa}` : "—"}</td>
            </tr>
          ); })}
        </tbody></table>
      </div>
      {games.length > 8 && <button onClick={() => setAll((v) => !v)} style={{ marginTop: 10, background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer" }}>{all ? "Show recent only" : `Show all ${games.length} games`}</button>}
    </>
  );
}

// "By the Numbers" — full box-score line, rebuild-styled (reuses seasonStatLine).
const StatCell = ({ l, v, accent, sub, color }) => (
  <div style={{ minWidth: 58 }}>
    <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 23, lineHeight: 1, color: color || (accent ? "var(--orange)" : "var(--ink)"), fontVariantNumeric: "tabular-nums" }}>{v}</div>
    <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", marginTop: 4, fontWeight: 600 }}>{l}</div>
    {sub && <div style={{ fontSize: 9.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
  </div>
);
const StatGrp = ({ title, note, children }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ fontFamily: "var(--sans)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", marginBottom: 11 }}>{title}{note && <span style={{ color: "var(--faint)", fontWeight: 400 }}> · {note}</span>}</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 26px" }}>{children}</div>
  </div>
);
function ByTheNumbers({ games }) {
  const d = useMemo(() => seasonStatLine(games), [games]);
  if (!d) return null;
  const h = playerHighlights(games);
  const notable = h ? [h.g30 > 0 && `${h.g30}× 30-pt`, h.g30 === 0 && h.g20 > 0 && `${h.g20}× 20-pt`, h.td > 0 && `${h.td} triple-dbl`, h.dd > 0 && `${h.dd} double-dbl`].filter(Boolean) : [];
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="ttl" style={{ color: "var(--orange)" }}>By the Numbers <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· {d.gp} GP · from box scores</span></div>
      <StatGrp title="Season averages">
        <StatCell l="PPG" v={d.per.ppg} color={statTone("ppg", d.per.ppg)} /><StatCell l="RPG" v={d.per.rpg} color={statTone("rpg", d.per.rpg)} /><StatCell l="APG" v={d.per.apg} color={statTone("apg", d.per.apg)} /><StatCell l="SPG" v={d.per.spg} color={statTone("spg", d.per.spg)} /><StatCell l="BPG" v={d.per.bpg} color={statTone("bpg", d.per.bpg)} /><StatCell l="TOPG" v={d.per.topg} />{d.per.mpg != null && <StatCell l="MPG" v={d.per.mpg} />}
      </StatGrp>
      <StatGrp title="Shooting">
        <StatCell l="FG" v={d.shoot.fg} /><StatCell l="FG%" v={d.shoot.fgPct} color={statTone("fgPct", d.shoot.fgPct)} /><StatCell l="3PT" v={d.shoot.tp} /><StatCell l="3P%" v={d.shoot.tpPct} color={statTone("threePct", d.shoot.tpPct)} /><StatCell l="FT" v={d.shoot.ft} /><StatCell l="FT%" v={d.shoot.ftPct} color={statTone("ftPct", d.shoot.ftPct)} /><StatCell l="eFG%" v={d.shoot.efg} color={statTone("efg", d.shoot.efg)} /><StatCell l="TS%" v={d.shoot.ts} color={statTone("tsPct", d.shoot.ts)} />
      </StatGrp>
      <StatGrp title={d.per36 ? "Per-36 & role" : "Role & efficiency"} note={d.per36 ? null : "add minutes to unlock per-36"}>
        {d.per36 && <><StatCell l="P36 PTS" v={d.per36.pts} /><StatCell l="P36 REB" v={d.per36.reb} /><StatCell l="P36 AST" v={d.per36.ast} /></>}
        <StatCell l="AST:TO" v={d.role.ato} color={statTone("ato", d.role.ato)} /><StatCell l="TOV%" v={d.role.tovPct} /><StatCell l="PTS MIX" v={`${d.role.mix2}/${d.role.mix3}/${d.role.mixFt}`} />
      </StatGrp>
      {h && (h.highs.pts || h.highs.reb || h.highs.ast) && (
        <StatGrp title="Season highs" note={notable.length ? notable.join(" · ") : null}>
          {h.highs.pts && <StatCell l="PTS HIGH" v={h.highs.pts.v} accent sub={h.highs.pts.opp ? `vs ${cleanOpp(h.highs.pts.opp).slice(0, 16)}` : null} />}
          {h.highs.reb && <StatCell l="REB HIGH" v={h.highs.reb.v} accent sub={h.highs.reb.opp ? `vs ${cleanOpp(h.highs.reb.opp).slice(0, 16)}` : null} />}
          {h.highs.ast && <StatCell l="AST HIGH" v={h.highs.ast.v} accent sub={h.highs.ast.opp ? `vs ${cleanOpp(h.highs.ast.opp).slice(0, 16)}` : null} />}
          {h.highs.tpm && h.highs.tpm.v > 0 && <StatCell l="3PM HIGH" v={h.highs.tpm.v} accent sub={h.highs.tpm.opp ? `vs ${cleanOpp(h.highs.tpm.opp).slice(0, 16)}` : null} />}
        </StatGrp>
      )}
      <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 16, lineHeight: 1.5 }}>PTS MIX = share of points from 2s / 3s / free throws. eFG% and TS% weight 3-pointers and free throws.</div>
    </div>
  );
}

// "The Leap" — prior season vs. latest, from multi-season game logs. A Prospera+
// feature: members see the jump, everyone else sees a locked teaser.
function TheLeapCard({ seasons, plus, go }) {
  if (!Array.isArray(seasons) || seasons.length < 2) return null;
  const sorted = [...seasons].sort((a, b) => String(a.season).localeCompare(String(b.season)));
  const prior = sorted[sorted.length - 2], latest = sorted[sorted.length - 1];
  const d = (a, b) => (a != null && b != null ? +(a - b).toFixed(1) : null);
  const Row = ({ l, a, b }) => {
    const dl = d(b, a);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 60px", gap: 10, alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", fontWeight: 600 }}>{l}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{a ?? "—"}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{b ?? "—"}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, color: dl > 0 ? "var(--orange)" : dl < 0 ? "var(--muted)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{dl != null ? (dl > 0 ? `+${dl}` : dl) : ""}</span>
      </div>
    );
  };
  const gOf = (s) => s.g || s.gp || "—";
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="ttl" style={{ color: "var(--blue)", margin: 0 }}>The Leap <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· {prior.season} ({gOf(prior)}g) → {latest.season} ({gOf(latest)}g)</span></div>
        <span className="bdg gold">★ Prospera+</span>
      </div>
      {plus ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 60px", gap: 10, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--faint)", margin: "10px 0 0", fontWeight: 600 }}><span /><span>Prior</span><span>Now</span><span>Δ</span></div>
          <Row l="PTS" a={prior.ppg} b={latest.ppg} />
          <Row l="REB" a={prior.rpg} b={latest.rpg} />
          <Row l="AST" a={prior.apg} b={latest.apg} />
        </>
      ) : (
        <div className="lock" style={{ paddingTop: 12 }}>
          <div className="blur" style={{ maxWidth: 420, margin: "4px auto 12px" }}><span style={{ width: "88%" }} /><span style={{ width: "70%" }} /><span style={{ width: "80%" }} /></div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 360, margin: "0 auto 12px", lineHeight: 1.5 }}>See the jump from {prior.season} to {latest.season} — points, rebounds, and assists, season over season.</div>
          <button className="claim-big" style={{ fontSize: 15, padding: "11px 18px" }} onClick={() => go && go("plus")}>🔒 Unlock The Leap with Prospera+ · $5/mo</button>
        </div>
      )}
    </div>
  );
}
// Recruiting card — real commitment/offers/rankings when present, else a clean
// claim-to-add state (the dataset has no fake recruiting-service rankings).
function RecruitingCard({ prospect, onClaim }) {
  const commitment = prospect.commitment;
  const committed = !!commitment;
  const stars = prospect.stars;
  const rk = prospect.rankings || {};
  const offers = Array.isArray(prospect.offers) ? prospect.offers : [];
  const services = Array.isArray(prospect.services) ? prospect.services : [];
  const hasRanks = stars || rk.national || rk.state || rk.position;
  const Cell = ({ v, l, c }) => <div><div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: c || "var(--ink)" }}>{v}</div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--faint)", marginTop: 2 }}>{l}</div></div>;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="ttl">Recruiting</p>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start", marginBottom: (offers.length || hasRanks) ? 14 : 10 }}>
        <Cell v={committed ? "Committed" : "Uncommitted"} l="Status" c={committed ? "var(--teal)" : "var(--ink)"} />
        {committed && <Cell v={commitment} l="School" c="var(--orange)" />}
        {stars && <Cell v={`${stars}★`} l="Rating" c="var(--gold-a)" />}
        {rk.national && <Cell v={`#${rk.national}`} l="National" />}
        {rk.state && <Cell v={`#${rk.state}`} l={`${prospect.state || ""} State`.trim()} />}
        {rk.position && <Cell v={`#${rk.position}`} l={`${prospect.position || "Pos"}`} />}
      </div>
      {offers.length > 0 ? (
        <><p className="ttl" style={{ margin: "0 0 7px" }}>Offers ({offers.length})</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{offers.map((o, i) => <span key={i} className="bdg" style={{ fontSize: 11.5 }}>{typeof o === "string" ? o : (o.school || o.name)}</span>)}</div></>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{hasRanks ? "" : "No offers or national rankings logged yet. "}Players &amp; coaches — <b style={{ color: "var(--ink)", cursor: "pointer" }} onClick={onClaim}>claim this profile</b> to add commitment, offers, and your recruiting timeline.</p>
      )}
      {services.length > 0 && <p style={{ fontSize: 10.5, color: "var(--faint)", margin: "10px 0 0" }}>Per {services.join(", ")}</p>}
    </div>
  );
}

// Film card: shows approved film, and a paywalled upload flow. Free accounts
// get ONE upload; more requires Prospera+. Every upload is admin-reviewed
// before it appears publicly.
function FilmCard({ p, go }) {
  const { user } = useAuth();
  const pid = p.id || nameKey(p.name);
  const [films, setFilms] = useState([]); // approved (public)
  const [mine, setMine] = useState(null); // this user's own submissions
  const [plus, setPlus] = useState(false);
  const [form, setForm] = useState({ open: false, url: "", title: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    let live = true;
    approvedFilm(pid).then((f) => { if (live) setFilms(f || []); }).catch(() => {});
    if (user) {
      myFilms().then((f) => { if (live) setMine(f || []); }).catch(() => { if (live) setMine([]); });
      hasPlus().then((v) => { if (live) setPlus(!!v); }).catch(() => {});
    } else setMine(null);
    return () => { live = false; };
  }, [pid, user]);
  const pending = (mine || []).find((f) => f.player_id === pid && f.status === "pending");
  const usedQuota = (mine || []).filter((f) => f.status !== "rejected").length; // count across all players
  const canUpload = plus || usedQuota < 1;
  const fInp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", width: "100%", fontSize: 13.5, padding: "10px 12px" };
  const submit = async () => {
    if (!form.url.trim()) { setNote("Paste a film link first."); return; }
    setBusy(true); setNote("");
    try {
      const row = await submitFilm({ player_id: pid, player_name: p.name, url: form.url.trim(), title: form.title.trim() });
      setMine((m) => [row || { player_id: pid, status: "pending" }, ...(m || [])]);
      setForm({ open: false, url: "", title: "" });
    } catch (e) {
      setNote("Couldn’t submit right now — try again in a moment.");
    }
    setBusy(false);
  };
  return (
    <div className="card">
      <p className="ttl">Film {films.length ? <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· {films.length} clip{films.length > 1 ? "s" : ""}</span> : null}</p>
      {films.length ? (
        <div className="film">{films.slice(0, 4).map((f) => <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="vid" title={f.title || "Watch film"}>▶</a>)}</div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 14px", lineHeight: 1.5 }}>{user ? "No film yet — add yours below. Every upload is reviewed before it goes live." : "Film is added by players and coaches. Claim this profile to add yours."}</p>
      )}

      {pending ? (
        <div style={{ display: "flex", gap: 9, alignItems: "center", background: "rgba(245,196,81,.1)", border: "1px solid rgba(245,196,81,.32)", borderRadius: 10, padding: "11px 13px" }}>
          <span>⏳</span><span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>Your film is <b style={{ color: "var(--ink)" }}>pending review</b> — we’ll publish it once it’s approved.</span>
        </div>
      ) : !user ? (
        <button className="claim-big" onClick={() => go("dash")}>＋ Add film — sign in</button>
      ) : canUpload ? (
        form.open ? (
          <div style={{ display: "grid", gap: 8 }}>
            <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="Film link — YouTube, Hudl, Drive…" style={fInp} />
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title (optional) — e.g. Summer mixtape" style={fInp} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="cta" style={{ flex: 1 }} onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
              <button className="bbtn" onClick={() => setForm({ open: false, url: "", title: "" })}>Cancel</button>
            </div>
            <p style={{ fontSize: 10.5, color: "var(--faint)", lineHeight: 1.5, margin: 0 }}>{plus ? "Prospera+ — unlimited film." : "This is your 1 free upload — more film comes with Prospera+."} Every upload is admin-reviewed before it’s published.</p>
          </div>
        ) : (
          <button className="claim-big" onClick={() => setForm((f) => ({ ...f, open: true }))}>＋ Add film{plus ? "" : " · 1 free"}</button>
        )
      ) : (
        <div>
          <button className="claim-big" onClick={() => go("plus")}>🔒 Add more film with Prospera+ · $5/mo</button>
          <p style={{ fontSize: 10.5, color: "var(--faint)", lineHeight: 1.5, margin: "8px 0 0" }}>You’ve used your free film upload. Prospera+ unlocks unlimited film.</p>
        </div>
      )}
      {note && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{note}</p>}
      <p style={{ fontSize: 11, color: "var(--faint)", margin: "12px 0 0", textAlign: "center" }}>Real stats. No fake rankings. No hype.</p>
    </div>
  );
}

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
  const hsRow = (data.hsByKey && data.hsByKey[key]) || null;
  const ctx = { hs: hsRow, su: summerRow, aau: null };
  const row = ctx[tab];
  const scoutP = {
    name: p.name, headshot: p.headshot,
    meta: `${p.school || ""}${p.pos ? " · " + p.pos : ""}${p.cls ? " · " + p.cls : ""}`,
    statsVerified: (p.statsVerified !== false) || !!hsRow,
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
  const STATE_FULL = { DC: "Washington, DC", MD: "Maryland", VA: "Virginia" };
  const loc = [prospect.city, prospect.state].filter(Boolean).join(", ");
  const commit = prospect.commitment || (prospect.status === "uncommitted" ? "Uncommitted" : (prospect.status || null));
  const intel = [p.school, prospect.county && `${prospect.county} County`, STATE_FULL[prospect.state] || prospect.state].filter(Boolean).join(" · ");
  const { user, isAdmin } = useAuth();
  const { hasPass } = useCoachAccess();
  const [claimOpen, setClaimOpen] = useState(false);
  const [myClaim, setMyClaim] = useState(null);
  const [plus, setPlus] = useState(false);
  const [scouts, setScouts] = useState({ scouts: 0, last: null });
  const lockIn = useLockIn();
  const wl = useWatchlist();
  const isOwner = myClaim?.status === "approved";
  useEffect(() => { let live = true; setMyClaim(null); if (user && p?.id) myClaimForPlayer(p.id).then((c) => { if (live) setMyClaim(c); }).catch(() => {}); return () => { live = false; }; }, [user, p?.id]);
  useEffect(() => { let live = true; if (user) hasPlus().then((v) => { if (live) setPlus(v); }).catch(() => {}); else setPlus(false); return () => { live = false; }; }, [user]);
  // "Scouts viewed you": read the count; record a view when a coach/scout opens
  // someone else's profile.
  useEffect(() => { let live = true; if (p?.id) scoutViews(p.id).then((v) => { if (live) setScouts(v); }).catch(() => {}); return () => { live = false; }; }, [p?.id]);
  useEffect(() => { if (p?.id && (hasPass || isAdmin) && !isOwner) recordScoutView(p.id); }, [p?.id, hasPass, isAdmin, isOwner]);
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
      <button className="bbtn" style={{ width: "100%", marginTop: 12, borderColor: wl.has(p.id) ? "var(--teal)" : undefined, color: wl.has(p.id) ? "var(--teal)" : undefined }} onClick={() => wl.toggle(p.id)}>{wl.has(p.id) ? "✓ On your Watchlist" : "＋ Add to Watchlist"}</button>

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
            <div className="pctrow" key={r.l}><span className="pl">{r.l}</span><span className="pb"><i style={{ width: `${Math.max(2, r.v)}%`, background: pctTone(r.v) }} /></span><span className="pv2" style={{ color: pctTone(r.v) }}>{r.v}</span></div>
          ))}
          <p style={{ fontSize: 11, color: "var(--faint)", margin: "8px 0 0" }}>Where he ranks vs. every tracked summer player — 75 means better than 75%.</p>
          <p className="ttl" style={{ margin: "16px 0 8px" }}>Archetype</p>
          <div className="arche">{archetype?.label || "Rotation Contributor"}</div>
          {why && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>{why}</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="ttl">Scouting report</p>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap", margin: "2px 0 10px", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {measur.map(([l, v], i) => (
            <div key={l} style={{ flex: "1 0 64px", padding: "11px 12px", borderLeft: i ? "1px solid var(--line)" : "none", textAlign: "center" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)", marginBottom: 4, fontWeight: 600 }}>{l}</div>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 19, lineHeight: 1.05, color: v ? "var(--ink)" : "var(--faint)" }}>{v || "—"}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--faint)", margin: "0 0 14px" }}>○ Unverified — self-reported, not yet measured by staff.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
          {p.school && <span style={{ color: "var(--ink)", fontWeight: 600 }}>{cleanOpp(p.school)}</span>}
          {loc && <><span style={{ color: "var(--faint)" }}>·</span><span>{loc}</span></>}
          {commit && <><span style={{ color: "var(--faint)" }}>·</span><span style={{ color: commit === "Uncommitted" ? "var(--orange)" : "var(--teal)", fontWeight: 600 }}>{commit}</span></>}
        </div>
        {(prospect.stars || prospect.rankings || (prospect.offers || []).length) ? (
          <div style={{ margin: "0 0 16px" }}>
            <p className="ttl" style={{ margin: "0 0 7px", color: "var(--gold-a)" }}>Recruiting · services</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {prospect.stars ? <span className="bdg gold">{prospect.stars}★</span> : null}
              {prospect.rankings?.national ? <span className="bdg">#{prospect.rankings.national} National</span> : null}
              {prospect.rankings?.state ? <span className="bdg">#{prospect.rankings.state} {prospect.state}</span> : null}
              {prospect.rankings?.position ? <span className="bdg">#{prospect.rankings.position} {p.pos}</span> : null}
              {(prospect.offers || []).length ? <span className="bdg">{prospect.offers.length} offer{prospect.offers.length > 1 ? "s" : ""}</span> : null}
            </div>
            {(prospect.offers || []).length ? <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>{prospect.offers.slice(0, 8).join(" · ")}</p> : null}
          </div>
        ) : null}
        <p className="ttl" style={{ margin: "0 0 7px" }}>The read</p>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          {hasSummary ? prospect.summary : autoRead}
          {!hasSummary && <> A full written report{hasMeasur ? "" : ", verified measurements,"} and recruiting timeline are pending — <b style={{ color: "var(--ink)", cursor: "pointer" }} onClick={() => setClaimOpen(true)}>claim this profile</b> to add them, free.</>}
        </p>
        {intel && <>
          <p className="ttl" style={{ margin: "16px 0 6px", color: "var(--blue)" }}>DMV Intel</p>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>{intel}</p>
        </>}
      </div>

      <RecruitingCard prospect={prospect} onClaim={() => setClaimOpen(true)} />

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p className="ttl" style={{ margin: 0 }}>👁 Scouts watching</p>
          <span className="bdg gold">★ Prospera+</span>
        </div>
        {scouts.scouts > 0 ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "10px 0 4px" }}>
            <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 40, color: "var(--orange)" }}>{scouts.scouts}</span>
            <span style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>college coach{scouts.scouts === 1 ? "" : "es"} viewed {isOwner ? "your profile" : (p.name || "").split(" ")[0]}.</span>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "10px 0 4px" }}>When a college coach opens {isOwner ? "your" : "this"} profile, it shows up right here — real eyes, tracked over time.</p>
        )}
        {isOwner && plus ? (
          <p style={{ fontSize: 12.5, color: "var(--teal)", margin: "8px 0 0" }}>✓ Prospera+ active — you&rsquo;ll be alerted the moment a new scout checks you out.</p>
        ) : (
          <button className="claim-big" style={{ fontSize: 14.5, padding: "10px 16px", marginTop: 6 }} onClick={() => go("plus")}>🔒 See who&rsquo;s watching + get scout alerts · Prospera+ · $5/mo</button>
        )}
      </div>
      <ByTheNumbers games={games} />
      <TheLeapCard seasons={seasons} plus={plus} go={go} />

      {arc && arc.multiSeason ? (
        // Real trend — two or more tracked seasons. Show the development arc.
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
      ) : (
        // No real trend yet — educate that more data makes the tool sharper.
        <div className="card" style={{ marginTop: 16 }}>
          <p className="ttl">Development Arc</p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>
            Prospera&rsquo;s development engine charts a player&rsquo;s growth <b style={{ color: "var(--ink)" }}>season over season</b> — scoring efficiency, role, and the honest read behind the numbers. {(p.name || "this player").split(" ")[0]} has one tracked season so far, so there&rsquo;s no arc to draw yet.
            <br /><br />
            <b style={{ color: "var(--ink)" }}>The more games and seasons we track, the sharper and more useful this read becomes.</b> <b onClick={() => setClaimOpen(true)} style={{ color: "var(--orange)", cursor: "pointer" }}>Claim this profile</b> or add stats to start building the arc.
          </p>
        </div>
      )}

      <div className="pf-grid">
        <div className="card">
          <p className="ttl">Game log <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· {games.length} GP · verified box scores</span></p>
          <GameLog games={games} />
        </div>
        <FilmCard p={p} go={go} />
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
// One magic-link per email per cooldown window. Persisted in localStorage so it
// survives modal close/reopen and page refresh — repeat taps can't spam the email
// service (a real risk at launch with parents/kids retrying). 60s is plenty for
// delivery while still letting a genuine "didn't arrive" resend through.
const LINK_COOLDOWN_S = 60;
const linkKey = (e) => "ph_link_sent_" + String(e || "").trim().toLowerCase();
const lastLinkAt = (e) => { try { return Number(localStorage.getItem(linkKey(e))) || 0; } catch { return 0; } };
const markLinkSent = (e) => { try { localStorage.setItem(linkKey(e), String(Date.now())); } catch {} };
const cooldownLeft = (e) => Math.max(0, LINK_COOLDOWN_S - Math.floor((Date.now() - lastLinkAt(e)) / 1000));

function SignInForm({ onSignedIn, intro }) {
  const { configured, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(0);
  useEffect(() => { if (user && onSignedIn) onSignedIn(user); }, [user]);
  // Tick the resend cooldown down to zero.
  useEffect(() => { if (left <= 0) return; const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [left]);
  if (!configured) return <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>Accounts open at launch. To claim your profile now, email <a href="mailto:jalen@prosperahoops.com" style={{ color: "var(--orange)" }}>jalen@prosperahoops.com</a> and we’ll set you up.</p>;
  if (user) return null;
  const send = async () => {
    setErr("");
    const e2 = email.trim();
    if (!/.+@.+\..+/.test(e2)) { setErr("Enter a valid email."); return; }
    // Already sent a link to this address within the window? Don't fire another —
    // just surface the confirmation and run the countdown.
    const remaining = cooldownLeft(e2);
    if (remaining > 0) { setSent(true); setLeft(remaining); return; }
    setBusy(true);
    try {
      await signIn(e2);
      markLinkSent(e2);
      setSent(true);
      setLeft(LINK_COOLDOWN_S);
    } catch (e) {
      const s = String((e && e.message) || e || "");
      setErr(/rate.?limit|429|over_email_send/i.test(s) ? "Too many sign-in emails just now — wait a minute, then tap Resend once." : "Couldn’t send the link right now — try again in a moment.");
    } finally { setBusy(false); }
  };
  if (sent) return (
    <div>{intro}
      <p className="ttl" style={{ margin: "4px 0 6px" }}>Check your email</p>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>We sent a one-tap sign-in link to <b style={{ color: "var(--ink)" }}>{email.trim()}</b> — open it on this device to finish. It lands within a minute; <b style={{ color: "var(--ink)" }}>if you don’t see it, check your spam or promotions folder.</b></p>
      <button className="bbtn" style={{ marginTop: 12 }} onClick={send} disabled={busy || left > 0}>{busy ? "Resending…" : left > 0 ? `Resend in ${left}s` : "Resend link"}</button>
      {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "8px 0 0" }}>{err}</p>}
    </div>
  );
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
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{claim.status === "approved" ? "You can manage your stats, film, and recruiting info from your dashboard." : "Your claim is pending review — we usually approve within a day. Check back on your dashboard."}</p>
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

// Claim a team / program — the coach equivalent of a player claim. Same
// sign-in → role → submit → admin-verify flow, linked to the account.
function ClaimTeamPanel({ team, onClose }) {
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [role, setRole] = useState("Head Coach");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { let live = true; if (user && team?.slug) myClaimForTeam(team.slug).then((c) => { if (live) setClaim(c); }).catch(() => {}); return () => { live = false; }; }, [user, team?.slug]);
  const submit = async () => { setErr(""); setBusy(true); try { const c = await submitTeamClaim({ team_slug: team.slug, team_name: team.label || team.name, role }); setClaim(c || { status: "pending" }); } catch (e) { setErr(String(e.message || e)); } finally { setBusy(false); } };
  return (
    <Modal onClose={onClose}>
      <p className="ttl" style={{ marginTop: 0 }}>Claim {team.label || team.name}</p>
      {claim ? (
        <div>
          <span className="bdg teal" style={{ display: "inline-block", marginBottom: 10 }}>{claim.status === "approved" ? "✓ You manage this team" : "Claim submitted"}</span>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{claim.status === "approved" ? "Coach HQ for this program is unlocked on your account — scouting, matchups, and your-team tools, on any device." : "Your team claim is pending review — we usually verify within a day. Check back on your dashboard."}</p>
        </div>
      ) : !user ? (
        <SignInForm intro={<p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>Sign in to claim your program — free. Unlock Coach HQ for your team.</p>} />
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 4px" }}>Signed in as <b style={{ color: "var(--ink)" }}>{user.email}</b>. Your role with this program:</p>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>{["Head Coach", "Assistant", "Director", "Staff"].map((r) => <FilterChip key={r} on={role === r} onClick={() => setRole(r)}>{r}</FilterChip>)}</div>
          {err && <p style={{ color: "#ff7a7a", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
          <button className="cta" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit team claim"}</button>
        </div>
      )}
    </Modal>
  );
}

// ---- PLAYER DASHBOARD ------------------------------------------------------
function Dashboard({ go, openClaimedPlayer, openClaimedTeam }) {
  const { user, isAdmin, configured, loading, signOut } = useAuth();
  const [claims, setClaims] = useState(null);
  const [filmQueue, setFilmQueue] = useState(null);
  const [waits, setWaits] = useState(null);
  const [claimQueue, setClaimQueue] = useState(null);
  useEffect(() => { let live = true; if (user) myClaims().then((c) => { if (live) setClaims(c || []); }).catch(() => { if (live) setClaims([]); }); else setClaims(null); return () => { live = false; }; }, [user]);
  useEffect(() => { let live = true; if (user && isAdmin) listFilms("pending").then((f) => { if (live) setFilmQueue(f || []); }).catch(() => { if (live) setFilmQueue([]); }); else setFilmQueue(null); return () => { live = false; }; }, [user, isAdmin]);
  useEffect(() => { let live = true; if (user && isAdmin) listWaitlist().then((w) => { if (live) setWaits(w || []); }).catch(() => { if (live) setWaits([]); }); else setWaits(null); return () => { live = false; }; }, [user, isAdmin]);
  useEffect(() => { let live = true; if (user && isAdmin) listClaims("pending").then((c) => { if (live) setClaimQueue(c || []); }).catch(() => { if (live) setClaimQueue([]); }); else setClaimQueue(null); return () => { live = false; }; }, [user, isAdmin]);
  const reviewFilm = async (id, status) => { try { await setFilmStatus(id, status); setFilmQueue((q) => (q || []).filter((f) => f.id !== id)); } catch (e) { /* keep row; admin can retry */ } };
  const reviewClaim = async (id, status) => { try { await setClaimStatus(id, status); setClaimQueue((q) => (q || []).filter((c) => c.id !== id)); } catch (e) { /* keep row; admin can retry */ } };

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

          {isAdmin && claimQueue && claimQueue.length > 0 && (
            <div className="card" style={{ marginTop: 18, borderColor: "rgba(255,106,26,.4)" }}>
              <p className="ttl" style={{ color: "var(--orange)" }}>Profile claims to review · {claimQueue.length}</p>
              <div style={{ display: "grid", gap: 10, maxHeight: 360, overflowY: "auto" }}>
                {claimQueue.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.player_name || c.player_id}{isTeamClaim(c) ? <span className="bdg" style={{ marginLeft: 6 }}>TEAM</span> : null}{c.role ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {c.role}</span> : null}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{[isTeamClaim(c) ? "Team claim" : c.school, c.message].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="bbtn" onClick={() => reviewClaim(c.id, "approved")} style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>Approve</button>
                      <button className="bbtn" onClick={() => reviewClaim(c.id, "rejected")}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && filmQueue && filmQueue.length > 0 && (
            <div className="card" style={{ marginTop: 18, borderColor: "rgba(245,196,81,.4)" }}>
              <p className="ttl" style={{ color: "var(--gold-a)" }}>Film awaiting review · {filmQueue.length}</p>
              <div style={{ display: "grid", gap: 10 }}>
                {filmQueue.map((f) => (
                  <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{f.player_name || f.player_id}{f.title ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {f.title}</span> : null}</div>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "var(--orange)", wordBreak: "break-all" }}>{f.url}</a>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="bbtn" onClick={() => reviewFilm(f.id, "approved")} style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>Approve</button>
                      <button className="bbtn" onClick={() => reviewFilm(f.id, "rejected")}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && waits && waits.filter((w) => w.kind === "add_player").length > 0 && (
            <div className="card" style={{ marginTop: 18, borderColor: "rgba(245,196,81,.4)" }}>
              <p className="ttl" style={{ color: "var(--gold-a)" }}>Players to verify &amp; add · {waits.filter((w) => w.kind === "add_player").length}</p>
              <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {waits.filter((w) => w.kind === "add_player").slice(0, 100).map((w) => (
                  <div key={w.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{w.player_name || w.name}{w.position ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {w.position}</span> : null}{w.grad_year ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · &rsquo;{String(w.grad_year).slice(2)}</span> : null}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{[w.school, w.email].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAdmin && waits && waits.filter((w) => w.kind !== "add_player").length > 0 && (
            <div className="card" style={{ marginTop: 18, borderColor: "rgba(47,191,143,.3)" }}>
              <p className="ttl" style={{ color: "var(--teal)" }}>Locked in · {waits.filter((w) => w.kind !== "add_player").length}</p>
              <div style={{ display: "grid", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                {waits.filter((w) => w.kind !== "add_player").slice(0, 100).map((w) => (
                  <div key={w.id} style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--line)", paddingBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>{w.email}</b>{w.player_name ? <span style={{ color: "var(--muted)", fontSize: 12 }}> · {w.player_name}</span> : null}</div>
                    <span style={{ fontSize: 11, color: "var(--faint)", textTransform: "capitalize" }}>{[w.role, w.name].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dgrid" style={{ marginTop: 18 }}>
            <div className="card">
              <p className="ttl">Your profiles &amp; teams</p>
              {claims.length === 0 ? (
                <div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>You haven’t claimed anything yet. Find your profile on the board and hit <b style={{ color: "var(--ink)" }}>Claim this profile</b> — or open your team and <b style={{ color: "var(--ink)" }}>Claim this team</b>.</p>
                  <button className="cta" onClick={() => go("prospects")}>Find my profile</button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {claims.map((c) => { const teamish = isTeamClaim(c); const slug = teamSlugOf(c); return (
                    <div key={c.id || c.player_id} className="wl" style={{ cursor: c.status === "approved" ? "pointer" : "default" }} onClick={() => c.status === "approved" && (teamish ? (openClaimedTeam && openClaimedTeam(slug)) : (openClaimedPlayer && openClaimedPlayer(c.player_id)))}>
                      <span className="n">{c.player_name}{teamish ? <span className="bdg" style={{ marginLeft: 8 }}>TEAM</span> : null}</span>
                      <span className="s">{teamish ? (c.role || "Program") : (c.school || "")}</span>
                      <span className={`bdg ${c.status === "approved" ? "teal" : ""}`} style={{ marginLeft: 8 }}>{c.status === "approved" ? (teamish ? "✓ Managed" : "✓ Owned") : "Pending"}</span>
                    </div>
                  ); })}
                </div>
              )}
            </div>
            <div>
              <div className="up"><h3>Prospera+</h3><div className="price"><b>$5/mo</b> · or $39/yr</div>
                <ul><li>Full Development Arc</li><li>The Leap — season-over-season jump</li><li>See which scouts (college coaches) viewed you + alerts</li><li>Verified badge</li><li>Printable recruiting one-pager</li></ul>
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
          <li>The Leap — prior season vs. now, the jump in black and white</li>
          <li>See which scouts (college coaches) viewed you + alerts</li>
          <li>Verified badge</li>
          <li>Printable recruiting one-pager</li>
          <li>Unlimited film uploads (free tier gets one) + recruiting alerts</li>
        </ul>
        <button className="cta" onClick={start} disabled={busy}>{busy ? "Starting…" : (user ? "Start 30-day free trial" : "Sign in to start")}</button>
        <div className="alt">★ or apply for a Founding spot — free for life</div>
        {note && <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>{note}</p>}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- account-synced state --------------------------------------------------
// Mirrors a value to localStorage (instant, offline-safe) AND to the signed-in
// user's account (user_state table), so Coach HQ content follows them across
// devices. On sign-in it pulls the account copy; if none exists, it migrates
// whatever's local up to the account. Degrades to plain localStorage when signed
// out or before the table exists. Same [value, setValue] shape as useState.
function useSynced(key, initial) {
  const read = () => {
    try {
      const r = localStorage.getItem(key);
      if (r == null) return initial;
      try { return JSON.parse(r); } catch { return r; } // tolerate legacy raw strings
    } catch { return initial; }
  };
  const [val, setVal] = useState(read);
  const { user } = useAuth();
  const tRef = useRef();
  // Re-read local when the key changes (e.g. per-team notes switching teams).
  useEffect(() => { setVal(read()); }, [key]);
  // On sign-in: pull the account copy, or migrate the local copy up if none.
  useEffect(() => {
    let live = true;
    if (!user) return;
    (async () => {
      const remote = await pullState(key);
      if (!live) return;
      if (remote !== undefined) {
        setVal(remote);
        try { localStorage.setItem(key, JSON.stringify(remote)); } catch { /* ignore */ }
      } else {
        const local = read();
        if (JSON.stringify(local) !== JSON.stringify(initial)) pushState(key, local);
      }
    })();
    return () => { live = false; };
  }, [user, key]);
  const update = (next) => {
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => pushState(key, next), 700); // debounce account writes
  };
  return [val, update];
}

// ---- watchlist (account-synced) -------------------------------------------
function useWatchlist() {
  const [ids, setIds] = useSynced("ph_watch", []);
  const [notes, setNotes] = useSynced("ph_scout_notes", {});
  return {
    ids, has: (id) => ids.includes(id),
    toggle: (id) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    add: (id) => { if (!ids.includes(id)) setIds([...ids, id]); },
    note: (id) => notes[id] || "",
    setNote: (id, t) => setNotes({ ...notes, [id]: t }),
  };
}

// ---- TEAMS — directory + detail -------------------------------------------
function TeamsView({ data, openTeam }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("teams"); // teams | schedule
  const [states, setStates] = useState([]);
  const [types, setTypes] = useState([]);
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return data.teams.filter((t) =>
      (!k || t.name.toLowerCase().includes(k) || (t.label || "").toLowerCase().includes(k)) &&
      (!states.length || (t.state && states.includes(t.state))) &&
      (!types.length || (t.type && types.includes(t.type))));
  }, [q, states, types, data.teams]);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="keye">Teams</div>
          <div className="sub" style={{ marginTop: 4 }}>{data.teams.length} schools · the full DMV directory — summer rosters where we have them</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "teams" ? "Search a team…" : "Search the schedule…"} style={{ ...inp, minWidth: 220, fontSize: 14, padding: "11px 14px" }} />
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "20px 0 14px", alignItems: "flex-end" }}>
        <ChipGroup label="View">
          <FilterChip on={mode === "teams"} onClick={() => setMode("teams")}>Teams</FilterChip>
          <FilterChip on={mode === "schedule"} onClick={() => setMode("schedule")}>Schedule</FilterChip>
        </ChipGroup>
        {mode === "teams" && <>
          <ChipGroup label="Region">{["DC", "MD", "VA"].map((s) => <FilterChip key={s} on={states.includes(s)} onClick={() => tog(states, setStates, s)}>{s}</FilterChip>)}</ChipGroup>
          <ChipGroup label="Type">{["Public", "Private"].map((t) => <FilterChip key={t} on={types.includes(t)} onClick={() => tog(types, setTypes, t)}>{t}</FilterChip>)}</ChipGroup>
        </>}
      </div>

      {mode === "teams" ? (
        <>
          <div style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12, color: "var(--faint)", margin: "16px 0 6px" }}>{list.length} {list.length === 1 ? "team" : "teams"}</div>
          {list.length ? list.map((t) => (
            <div key={t.slug} onClick={() => openTeam(t)} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 13, alignItems: "center", padding: "11px 2px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
              <div className="rav" style={{ width: 42, height: 42 }}>{initials(t.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 15.5, color: "var(--ink)" }}>{t.label || t.name}</span>
                  {t.state ? <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, fontWeight: 700, color: "var(--faint)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" }}>{t.state}{t.type ? ` · ${t.type}` : ""}</span> : null}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.directory ? (t.n > 0 ? `${t.n} ranked recruit${t.n > 1 ? "s" : ""} · full roster coming` : `${[t.city, t.state].filter(Boolean).join(", ") || "Directory"} · roster coming`) : [`${t.n} players`, t.coach && `Coach ${t.coach}`].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
          )) : <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 12 }}>No teams match those filters.</p>}
        </>
      ) : (
        <div className="card" style={{ marginTop: 4 }}>
          <p className="ttl">Capitol Hoops Summer League · schedule &amp; results</p>
          <p style={{ fontSize: 12, color: "var(--faint)", margin: "-6px 0 12px" }}>The current Capitol Hoops Summer League slate. More schedules come online as new circuits are added.</p>
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
  const { user } = useAuth();
  const [claimOpen, setClaimOpen] = useState(false);
  const [teamClaim, setTeamClaim] = useState(null);
  useEffect(() => { let live = true; setTeamClaim(null); if (user && team?.slug) myClaimForTeam(team.slug).then((c) => { if (live) setTeamClaim(c); }).catch(() => {}); return () => { live = false; }; }, [user, team?.slug]);
  const games = useMemo(() => {
    const nm = team.name.toLowerCase();
    return (schedule || []).filter((g) => (g.home || "").toLowerCase() === nm || (g.away || "").toLowerCase() === nm)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 12);
  }, [team, schedule]);
  const ROSTER_COLS = [
    { k: "gp", l: "GP" }, { k: "ppg", l: "PPG", tone: "ppg" }, { k: "rpg", l: "RPG", tone: "rpg" }, { k: "apg", l: "APG", tone: "apg" },
    { k: "spg", l: "SPG", tone: "spg" }, { k: "bpg", l: "BPG", tone: "bpg" }, { k: "fgPct", l: "FG%", tone: "fgPct", pct: true }, { k: "threePct", l: "3P%", tone: "threePct", pct: true }, { k: "tsPct", l: "TS%", tone: "tsPct", pct: true },
  ];
  const [sort, setSort] = useState({ k: "ppg", dir: -1 });
  const roster = team.roster || team.players;
  const sorted = useMemo(() => [...roster].sort((a, b) => (((a[sort.k] ?? -1) - (b[sort.k] ?? -1)) * sort.dir)), [roster, sort]);
  const setSortKey = (k) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }));
  const arrow = (k) => (sort.k === k ? (sort.dir < 0 ? " ▾" : " ▴") : "");
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <a onClick={back} style={{ fontSize: 12.5, color: "var(--orange)", fontWeight: 700 }}>← Teams</a>
      <div className="hello" style={{ marginTop: 8 }}>{team.label || team.name}</div>
      <div className="sub">{team.directory ? `${[team.city, team.state].filter(Boolean).join(", ") || "DMV"} · directory${team.n > 0 ? ` · ${team.n} ranked recruit${team.n > 1 ? "s" : ""}` : " · full roster coming"}` : `${team.n} players${team.statN != null && team.statN < team.n ? ` · ${team.statN} with summer stats` : ""}${team.coach ? ` · Coach ${team.coach}` : ""}${team.state ? ` · ${team.state}${team.type ? " " + team.type : ""}` : ""}`}</div>
      <div style={{ marginTop: 12 }}>
        {teamClaim?.status === "approved"
          ? <span className="bdg teal">✓ You manage this program</span>
          : teamClaim
            ? <span className="bdg">Team claim pending review</span>
            : <button className="bbtn" onClick={() => setClaimOpen(true)}>＋ Coach here? Claim this team</button>}
      </div>
      <div className="pf-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <p className="ttl">Roster &amp; stats <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· tap a column to sort</span></p>
          <div style={{ overflowX: "auto" }}>
            <table className="board"><tbody>
              <tr>
                <th>Player</th><th>Pos</th>
                {ROSTER_COLS.map((c) => <th key={c.k} onClick={() => setSortKey(c.k)} style={{ cursor: "pointer", whiteSpace: "nowrap", color: sort.k === c.k ? "var(--orange)" : undefined }}>{c.l}{arrow(c.k)}</th>)}
              </tr>
              {sorted.map((p, i) => (
                <tr key={`${p.id}-${i}`} style={p.hasStats === false ? { opacity: 0.6 } : undefined}>
                  <td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>{p.name}</b>{p.hasStats === false ? <span style={{ fontSize: 9.5, color: "var(--faint)", marginLeft: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>roster</span> : null}</td>
                  <td>{p.pos || "—"}</td>
                  {ROSTER_COLS.map((c) => <td key={c.k} style={{ color: c.tone ? statTone(c.tone, p[c.k]) : "var(--muted)", fontWeight: sort.k === c.k ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{p[c.k] == null ? "—" : (c.pct ? `${r1(p[c.k])}%` : r1(p[c.k]))}</td>)}
                </tr>
              ))}
            </tbody></table>
            {sorted.length === 0 && <p style={{ fontSize: 12.5, color: "var(--muted)", padding: "10px 2px 2px", lineHeight: 1.6 }}>No roster on file yet — we’re building full DMV rosters school by school. Summer-league stats fill in here, and players can claim their spot anytime.</p>}
          </div>
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
      {claimOpen && <ClaimTeamPanel team={team} onClose={() => { setClaimOpen(false); if (user && team?.slug) myClaimForTeam(team.slug).then(setTeamClaim).catch(() => {}); }} />}
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

// Team analytics + coach-facing insights, derived honestly from roster stats.
function teamAnalytics(team) {
  const ps = team.players || [];
  const n = ps.length || 1;
  const guards = ps.filter((p) => /g/i.test(p.pos || "")).length;
  const bigs = ps.filter((p) => /c/i.test(p.pos || "") || /pf/i.test(p.pos || "")).length;
  const totalPpg = ps.reduce((s, p) => s + (p.ppg || 0), 0);
  const top = team.top;
  const topShare = totalPpg ? Math.round((top?.ppg || 0) / totalPpg * 100) : 0;
  const shooters = ps.filter((p) => (p.threePct || 0) >= 33 && (p.ppg || 0) >= 4);
  const scorers = ps.filter((p) => (p.ppg || 0) >= 10);
  const stockGuys = ps.filter((p) => ((p.spg || 0) + (p.bpg || 0)) >= 2);
  return { ps, n, guards, bigs, totalPpg, top, topShare, shooters, scorers, stockGuys, guardHeavy: guards / n > 0.5, balanced: topShare <= 28 && scorers.length >= 3 };
}
function coachInsights(team, opp) {
  const a = teamAnalytics(team), out = [];
  if (a.guardHeavy) out.push(["Guard-heavy, perimeter-oriented", opp ? "Pressure the ball; chase them off the three-point line." : "Push pace and play through your guards."]);
  else if (a.bigs >= 2) out.push(["Size up front", opp ? "Box out — limit second-chance points." : "Pound the paint and crash the offensive glass."]);
  else out.push(["Balanced front-and-back", opp ? "No single coverage wins — match personnel." : "Attack mismatches across positions."]);
  if (a.top && a.topShare >= 32) out.push([`${(a.top.name || "").split(" ")[0]} carries the scoring`, opp ? `${a.topShare}% of their points run through him — make someone else beat you.` : `${a.topShare}% of scoring is one man — build a reliable second option.`]);
  else if (a.balanced) out.push(["Scores by committee", opp ? `${a.scorers.length} double-figure scorers — pick your poison.` : `${a.scorers.length} double-figure scorers — hard to game-plan against.`]);
  if (a.shooters.length >= 3) out.push([`${a.shooters.length} live shooters`, opp ? "Close out hard; don't help off shooters." : "Space the floor — shooting is your weapon."]);
  if (a.stockGuys.length) out.push(["Disruptive defenders", opp ? `Value the ball vs. ${a.stockGuys.slice(0, 2).map((p) => (p.name || "").split(" ")[0]).join(" & ")}.` : "Lean into pressure D — you generate turnovers."]);
  return out;
}
function useTeamNotes(slug) {
  return useSynced(`ph_teamnote_${slug || ""}`, "");
}

function TeamReport({ team, schedule, wl, openPlayer, mode = "opponent" }) {
  const opp = mode === "opponent";
  const [note, setNote] = useTeamNotes(team.slug);
  const finals = (schedule || []).filter((g) => [g.home, g.away].some((x) => (x || "").toLowerCase() === team.name.toLowerCase()) && g.status === "final" && g.homeScore != null).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const rec = teamRecord(team, schedule);
  const winPct = (rec.w + rec.l) ? rec.w / (rec.w + rec.l) : null;
  const recColor = winPct == null ? "var(--ink)" : winPct >= 0.6 ? "var(--teal)" : winPct < 0.4 ? "#e07a5f" : "var(--ink)";
  const maxP = Math.max(...team.players.slice(0, 6).map((p) => p.ppg || 0), 1);
  const insights = coachInsights(team, opp);
  const grp = [
    ["Guards", team.players.filter((p) => /g/i.test(p.pos || ""))],
    ["Wings/Forwards", team.players.filter((p) => /f|w/i.test(p.pos || "") && !/g/i.test(p.pos || "") && !/c/i.test(p.pos || ""))],
    ["Bigs", team.players.filter((p) => /c/i.test(p.pos || ""))],
  ].filter(([, list]) => list.length);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span className="covchip"><b style={{ color: recColor }}>{rec.w}-{rec.l}</b><span>Record</span></span>
        <span className="covchip"><b>{teamAvgPpg(team)}</b><span>Avg PPG/pl</span></span>
        <span className="covchip"><b>{team.n}</b><span>Roster</span></span>
        {team.top && <span className="covchip"><b style={{ color: statTone("ppg", team.top.ppg) }}>{r1(team.top.ppg)}</b><span>Top scorer</span></span>}
      </div>

      <p className="ttl" style={{ margin: "0 0 10px", color: "var(--orange)" }}>{opp ? "Keys to the game" : "Team strengths & watch-areas"}</p>
      <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
        {insights.map(([t, d], i) => (
          <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <span style={{ flex: "none", width: 7, height: 7, borderRadius: 9, background: "var(--orange)", marginTop: 7 }} />
            <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}><b style={{ color: "var(--ink)" }}>{t}.</b> <span style={{ color: "var(--muted)" }}>{d}</span></span>
          </div>
        ))}
      </div>

      <p className="ttl" style={{ margin: "0 0 10px" }}>{opp ? "Threats to stop" : "Your leaders"}</p>
      <div style={{ display: "grid", gap: 9 }}>
        {team.players.slice(0, 6).map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 58px", gap: 10, alignItems: "center" }}>
            <span onClick={() => openPlayer(p)} style={{ cursor: "pointer", fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 13.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: "var(--faint)", fontSize: 10.5, fontFamily: "var(--sans)" }}>{p.pos || ""}</span></span>
            <span style={{ height: 7, borderRadius: 9, background: "rgba(244,242,237,.08)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${Math.round((p.ppg || 0) / maxP * 100)}%`, background: "linear-gradient(90deg,var(--orange),var(--gold-a))" }} /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}><span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, color: statTone("ppg", p.ppg) }}>{r1(p.ppg)}</span><span className="add" onClick={(e) => { e.stopPropagation(); wl.toggle(p.id); }}>{wl.has(p.id) ? "✓" : "+"}</span></span>
          </div>
        ))}
      </div>

      {grp.length > 1 && <>
        <p className="ttl" style={{ margin: "18px 0 10px" }}>Depth chart</p>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${grp.length}, 1fr)`, gap: 14 }}>
          {grp.map(([label, list]) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{label}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {[...list].sort((x, y) => (y.ppg || 0) - (x.ppg || 0)).slice(0, 5).map((p) => (
                  <div key={p.id} onClick={() => openPlayer(p)} style={{ display: "flex", justifyContent: "space-between", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                    <b style={{ fontFamily: "var(--disp)", color: statTone("ppg", p.ppg) }}>{r1(p.ppg)}</b>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>}

      {finals.length > 0 && <><p className="ttl" style={{ margin: "18px 0 8px" }}>Recent form</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{finals.slice(0, 8).map((g, i) => { const home = (g.home || "").toLowerCase() === team.name.toLowerCase(); const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore; const win = us > them; return <span key={i} title={`${home ? "vs " : "@ "}${cleanOpp(home ? g.away : g.home)}`} style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 11, padding: "4px 8px", borderRadius: 6, background: win ? "rgba(47,191,143,.15)" : "rgba(224,122,95,.14)", color: win ? "var(--teal)" : "#e9a08c" }}>{win ? "W" : "L"} {us}-{them}</span>; })}</div></>}

      <p className="ttl" style={{ margin: "18px 0 8px" }}>{opp ? "Your scouting notes" : "Coach's notes"}</p>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={opp ? `Defensive game plan, coverages, tendencies on ${team.label || team.name}…` : "Practice focus, rotations, reminders…"} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", width: "100%", minHeight: 76, fontSize: 13, padding: 11, resize: "vertical" }} />
    </div>
  );
}

// One side of a custom 5-on-5 lineup — search-add up to 5, with summed production.
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const EMPTY5 = () => [null, null, null, null, null];
// Saved lineups follow the signed-in coach across devices (account-synced),
// falling back to this device's localStorage when signed out.
function useLineups() {
  const [list, setList] = useSynced("ph_lineups", []);
  return {
    list,
    add: (name, ids) => setList([{ id: `lu_${Date.now()}`, name: name || "Untitled", ids: [...ids] }, ...list].slice(0, 40)),
    remove: (id) => setList(list.filter((l) => l.id !== id)),
  };
}

function LineupSide({ data, ids, setIds, label, lineups }) {
  const [team, setTeam] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const byId = useMemo(() => Object.fromEntries(data.players.map((p) => [p.id, p])), [data.players]);
  const rosterTeams = useMemo(() => data.teams.filter((t) => !t.directory && (t.roster || t.players || []).length).sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name)), [data.teams]);
  const teamObj = useMemo(() => data.teams.find((t) => t.slug === team) || null, [team, data.teams]);
  const pool = teamObj ? (teamObj.roster && teamObj.roster.length ? teamObj.roster : teamObj.players || []) : [];
  const teamLabel = teamObj ? (teamObj.label || teamObj.name) : "";
  const sel = ids.map((id) => (id ? byId[id] : null));
  const sum = (k) => sel.filter(Boolean).reduce((s, p) => s + (p[k] || 0), 0);
  const filled = sel.filter(Boolean).length;
  const setSlot = (i, pid) => { const n = [...ids]; n[i] = pid; setIds(n); setEditing(null); setQ(""); };
  const clear = (i) => { const n = [...ids]; n[i] = null; setIds(n); };
  const pickTeam = (slug) => { setTeam(slug); setIds(EMPTY5()); setEditing(null); setQ(""); }; // new team → fresh lineup
  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    const base = pool.filter((p) => !ids.includes(p.id));
    return (k ? base.filter((p) => p.name.toLowerCase().includes(k)) : [...base].sort((a, b) => (b.ppg || 0) - (a.ppg || 0))).slice(0, 60);
  }, [q, ids, pool]);
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  return (
    <div>
      <p className="ttl" style={{ margin: "0 0 8px" }}>{label} <span style={{ color: filled === 5 ? "var(--teal)" : "var(--faint)", fontFamily: "var(--sans)" }}>({filled}/5)</span></p>
      <select value={team} onChange={(e) => pickTeam(e.target.value)} style={{ ...inp, width: "100%", fontSize: 13, padding: "10px 12px", marginBottom: 10 }}>
        <option value="">Pick a team…</option>
        {rosterTeams.map((t) => <option key={t.slug} value={t.slug}>{t.label || t.name}</option>)}
      </select>
      <div style={{ display: "grid", gap: 6 }}>
        {POSITIONS.map((pos, i) => {
          const p = sel[i];
          const active = editing === i;
          return (
            <div key={i}>
              <div className="lslot" onClick={() => { if (!teamObj) return; setEditing(active ? null : i); setQ(""); }} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 10, alignItems: "center", padding: "12px 13px", borderRadius: 10, cursor: teamObj ? "pointer" : "not-allowed", opacity: teamObj ? 1 : 0.55, border: `1.5px solid ${active ? "var(--orange)" : "var(--line)"}`, background: "var(--surface)" }}>
                <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 13, color: "var(--orange)" }}>{pos}</span>
                {p
                  ? <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 14, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  : <span style={{ color: active ? "var(--orange)" : "var(--muted)", fontSize: 13, fontWeight: 500 }}>{active ? "Choose a player below…" : (teamObj ? "Tap to pick a player" : "Pick a team above first")}</span>}
                <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                  {p && <b style={{ fontFamily: "var(--disp)", fontSize: 15, color: statTone("ppg", p.ppg) }}>{r1(p.ppg)}</b>}
                  {p
                    ? <span className="add" onClick={(e) => { e.stopPropagation(); clear(i); }} title="Remove">✕</span>
                    : <span style={{ color: active ? "var(--orange)" : "var(--faint)", fontSize: 14, fontWeight: 800 }}>{active ? "▴" : "▾"}</span>}
                </span>
              </div>
              {active && (
                <div style={{ margin: "6px 0 4px", border: "1px solid var(--orange)", borderRadius: 11, overflow: "hidden", background: "var(--raised)" }}>
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${teamLabel} · ${pos}…`} style={{ ...inp, width: "100%", fontSize: 13.5, padding: "11px 13px", border: "none", borderBottom: "1px solid var(--line)", borderRadius: 0, background: "var(--surface)" }} />
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {results.map((r, ri) => <div key={`${r.id}-${ri}`} onClick={() => setSlot(i, r.id)} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "11px 13px", cursor: "pointer", fontSize: 13.5, borderBottom: "1px solid var(--line)" }}><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name} <span style={{ color: "var(--faint)", fontSize: 11.5 }}>{r.pos || ""} · {cleanOpp(r.school)}</span></span><b style={{ fontFamily: "var(--disp)", color: statTone("ppg", r.ppg) }}>{r1(r.ppg)}</b></div>)}
                    {results.length === 0 && <div style={{ padding: "11px 13px", fontSize: 12.5, color: "var(--faint)" }}>No players match “{q}”.</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        {[["PPG", "ppg"], ["RPG", "rpg"], ["APG", "apg"]].map(([l, k]) => <div key={k}><div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 19, color: "var(--ink)" }}>{r1(sum(k))}</div><div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--faint)", marginTop: 2 }}>{l}</div></div>)}
      </div>
      {filled > 0 && lineups && (
        <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this lineup…" style={{ ...inp, flex: 1, fontSize: 12.5, padding: "8px 11px" }} onKeyDown={(e) => e.key === "Enter" && (lineups.add(name || label, ids), setName(""))} />
          <button className="bbtn pri" onClick={() => { lineups.add(name || label, ids); setName(""); }}>Save</button>
        </div>
      )}
    </div>
  );
}

function FiveOnFive({ data }) {
  const [aIds, setAIds] = useState(EMPTY5);
  const [bIds, setBIds] = useState(EMPTY5);
  const lineups = useLineups();
  const byId = useMemo(() => Object.fromEntries(data.players.map((p) => [p.id, p])), [data.players]);
  const sum = (ids, k) => ids.map((id) => (id ? byId[id] : null)).filter(Boolean).reduce((s, p) => s + (p[k] || 0), 0);
  const ready = aIds.filter(Boolean).length && bIds.filter(Boolean).length;
  const ppA = sum(aIds, "ppg"), ppB = sum(bIds, "ppg");
  const loadInto = (setter, l) => setter([...l.ids, ...EMPTY5()].slice(0, 5));
  return (
    <div>
      <p className="ttl">Custom 5-on-5 — fill both lineups</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <LineupSide data={data} ids={aIds} setIds={setAIds} label="Lineup A" lineups={lineups} />
        <LineupSide data={data} ids={bIds} setIds={setBIds} label="Lineup B" lineups={lineups} />
      </div>
      {ready
        ? <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}><b style={{ color: "var(--orange)", fontFamily: "var(--disp)", textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>Projected edge</b> — Lineup {ppA >= ppB ? "A" : "B"} projects {r1(Math.abs(ppA - ppB))} more combined PPG. Production only — adjust for fit, pace, and matchups.</p>
        : <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 14 }}>Fill both lineups to see the projected production edge.</p>}
      {lineups.list.length > 0 && (
        <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <p className="ttl" style={{ margin: "0 0 9px" }}>Saved lineups <span style={{ color: "var(--faint)", fontWeight: 400, fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0 }}>· {lineups.list.length}</span></p>
          <div style={{ display: "grid", gap: 7 }}>
            {lineups.list.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--surface)" }}>
                <b style={{ fontFamily: "var(--disp)", textTransform: "uppercase", fontSize: 13.5 }}>{l.name}</b>
                <span style={{ fontSize: 11, color: "var(--faint)", flex: 1, minWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.ids.filter(Boolean).map((id) => byId[id]?.name).filter(Boolean).join(", ") || "—"}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="bbtn" onClick={() => loadInto(setAIds, l)}>→ A</button>
                  <button className="bbtn" onClick={() => loadInto(setBIds, l)}>→ B</button>
                  <button className="bbtn" onClick={() => lineups.remove(l.id)}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function statsFor(data, p) {
  if (!p) return null;
  const key = p.key || nameKey(p.name);
  const pros = (data.prByKey && data.prByKey[key]) || {};
  const games = (data.gl && data.gl[key] && data.gl[key].games) || [];
  let d = null; try { d = seasonStatLine(games); } catch (e) { d = null; }
  let arch = null; try { arch = data.cohort ? archetypeForPlayer(p.name, data.cohort, p.pos) : null; } catch (e) { arch = null; }
  const inFt = (i) => (i ? `${Math.floor(i / 12)}'${i % 12}"` : null);
  return {
    p, arch,
    ht: pros.heightInches, htStr: inFt(pros.heightInches), wt: pros.weightLbs, ws: pros.wingspanInches, wsStr: inFt(pros.wingspanInches),
    ppg: d?.per.ppg ?? p.ppg, rpg: d?.per.rpg ?? p.rpg, apg: d?.per.apg ?? p.apg, spg: d?.per.spg ?? p.spg, bpg: d?.per.bpg ?? p.bpg,
    fg: d?.shoot.fgPct ?? (p.fgPct != null ? `${r1(p.fgPct)}%` : null), tp: d?.shoot.tpPct ?? (p.threePct != null ? `${r1(p.threePct)}%` : null), ft: d?.shoot.ftPct ?? (p.ftPct != null ? `${r1(p.ftPct)}%` : null), efg: d?.shoot.efg, ts: d?.shoot.ts ?? (p.tsPct != null ? `${r1(p.tsPct)}%` : null),
    ato: d?.role.ato, tov: d?.role.tovPct, gp: d?.gp ?? p.gp,
  };
}
function OneOnOne({ data, openPlayer }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [notes, setNotes] = useSynced("ph_1v1", "");
  const opts = useMemo(() => [...data.players].sort((a, b) => a.name.localeCompare(b.name)), [data.players]);
  const A = statsFor(data, data.players.find((p) => p.id === p1));
  const B = statsFor(data, data.players.find((p) => p.id === p2));
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", width: "100%", fontSize: 14, padding: "12px 14px" };
  const Sel = ({ value, onChange, ph }) => <select value={value} onChange={(e) => onChange(e.target.value)} style={inp}><option value="">{ph}</option>{opts.map((p, i) => <option key={`${p.id}-${i}`} value={p.id}>{p.name} · {cleanOpp(p.school)}</option>)}</select>;
  const Row = ({ l, a, b, aN, bN, tone, higherBetter = true }) => {
    const na = aN != null ? aN : (a == null ? null : parseFloat(a)), nb = bN != null ? bN : (b == null ? null : parseFloat(b));
    const cmp = (x, y) => (na == null || nb == null || Number.isNaN(na) || Number.isNaN(nb)) ? false : (higherBetter ? x > y : x < y);
    const aWin = cmp(na, nb), bWin = cmp(nb, na);
    const col = (val, win) => (win ? "var(--orange)" : (tone ? statTone(tone, val) : "var(--ink)"));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
        <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 17, color: col(a, aWin), fontVariantNumeric: "tabular-nums" }}>{a == null ? "—" : a}{aWin && <span style={{ color: "var(--orange)", fontSize: 11 }}> ◄</span>}</span>
        <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", whiteSpace: "nowrap", fontWeight: 600 }}>{l}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 17, color: col(b, bWin), fontVariantNumeric: "tabular-nums" }}>{bWin && <span style={{ color: "var(--orange)", fontSize: 11 }}>► </span>}{b == null ? "—" : b}</span>
      </div>
    );
  };
  const Section = ({ t }) => <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--orange)", margin: "16px 0 6px" }}>{t}</div>;
  const nameCell = (s, right) => <span onClick={() => openPlayer(s.p)} style={{ cursor: "pointer", textAlign: right ? "left" : "right", fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 15, lineHeight: 1.1 }}>{s.p.name}<br /><span style={{ fontSize: 10.5, color: "var(--faint)", fontFamily: "var(--sans)", fontWeight: 600 }}>{[s.p.pos, s.p.cls, cleanOpp(s.p.school)].filter(Boolean).join(" · ")}</span></span>;
  return (
    <div>
      <p className="ttl">1-on-1 read — head to head</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Sel value={p1} onChange={setP1} ph="Player A…" /><Sel value={p2} onChange={setP2} ph="Player B…" />
      </div>
      {A && B ? <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 6, alignItems: "center" }}>
          {nameCell(A, false)}<span style={{ color: "var(--faint)", fontFamily: "var(--disp)" }}>vs</span>{nameCell(B, true)}
        </div>
        <Section t="Measurables" />
        <Row l="Height" a={A.htStr} b={B.htStr} aN={A.ht} bN={B.ht} />
        <Row l="Weight" a={A.wt ? `${A.wt} lb` : null} b={B.wt ? `${B.wt} lb` : null} aN={A.wt} bN={B.wt} />
        <Row l="Wingspan" a={A.wsStr} b={B.wsStr} aN={A.ws} bN={B.ws} />
        <Section t="Production · per game" />
        <Row l="PPG" a={r1(A.ppg)} b={r1(B.ppg)} tone="ppg" />
        <Row l="RPG" a={r1(A.rpg)} b={r1(B.rpg)} tone="rpg" />
        <Row l="APG" a={r1(A.apg)} b={r1(B.apg)} tone="apg" />
        <Row l="SPG" a={r1(A.spg)} b={r1(B.spg)} tone="spg" />
        <Row l="BPG" a={r1(A.bpg)} b={r1(B.bpg)} tone="bpg" />
        <Section t="Shooting" />
        <Row l="FG%" a={A.fg} b={B.fg} tone="fgPct" />
        <Row l="3P%" a={A.tp} b={B.tp} tone="threePct" />
        <Row l="FT%" a={A.ft} b={B.ft} tone="ftPct" />
        <Row l="eFG%" a={A.efg} b={B.efg} tone="efg" />
        <Row l="TS%" a={A.ts} b={B.ts} tone="tsPct" />
        <Section t="Playmaking & efficiency" />
        <Row l="AST:TO" a={A.ato} b={B.ato} tone="ato" />
        <Row l="TOV%" a={A.tov} b={B.tov} higherBetter={false} />
        <Section t="Profile" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
          <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 12.5, color: "var(--gold-a)" }}>{A.arch?.label || "—"}</span>
          <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--faint)" }}>Archetype</span>
          <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 12.5, color: "var(--gold-a)" }}>{B.arch?.label || "—"}</span>
        </div>
        <Row l="Games" a={A.gp} b={B.gp} />
        <p style={{ fontSize: 10.5, color: "var(--faint)", margin: "8px 0 0" }}>◄ ► marks the edge in each row. Skill stats are tone-colored; measurables show the size advantage.</p>
        <p className="ttl" style={{ margin: "16px 0 6px" }}>The battle — your notes</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who guards whom, where the edge is, how to attack…" style={{ ...inp, minHeight: 80, resize: "vertical", fontSize: 13 }} />
      </> : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick two players to compare their full lines — measurables, stats, shooting, efficiency, and archetype — head to head.</p>}
    </div>
  );
}

// Paywall for Coach-tier tabs: subscribe ($19/mo) or redeem a pilot code.
function CoachLock({ feature, user, go, redeem }) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const subscribe = async () => {
    if (!user) { setNote("Sign in first, then unlock Coach HQ."); go("dash"); return; }
    setNote(""); setBusy(true);
    const res = await startCheckout({ plan: "coach_monthly", email: user.email, userId: user.id });
    setBusy(false);
    if (!res.ok) setNote(res.reason === "unconfigured" ? "Your free year of Coach HQ opens at launch — we’ll email you the moment it’s live." : (res.detail || "Couldn’t start checkout — try again."));
  };
  const tryCode = () => { const p = redeem(code); setNote(p ? "" : "That code isn’t valid — check with your program."); };
  return (
    <div className="card" style={{ textAlign: "center", padding: "34px 22px" }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <p className="ttl" style={{ color: "var(--gold-a)", margin: "10px 0 6px" }}>{feature} · Coach HQ</p>
      <p style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 430, margin: "0 auto 16px", lineHeight: 1.6 }}>Matchup builders, your-team analytics, opponent game plans and board export are part of <b style={{ color: "var(--ink)" }}>Coach HQ</b> — built for coaches who live on the sideline. <b style={{ color: "var(--teal)" }}>Free for your entire first year.</b></p>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 26 }}><span style={{ color: "var(--teal)" }}>FREE</span> <span style={{ fontSize: 15, color: "var(--muted)" }}>your first year</span></div>
      <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 5 }}>then $19/mo · or $149/yr — launch offer</div>
      <button className="cta" style={{ maxWidth: 280, margin: "14px auto 0" }} onClick={subscribe} disabled={busy}>{busy ? "Starting…" : (user ? "Start your free year" : "Sign in to start")}</button>
      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Coach with a pilot code?</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryCode()} placeholder="Enter code" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", fontSize: 13, padding: "8px 11px", maxWidth: 150 }} />
        <button className="bbtn" onClick={tryCode}>Redeem</button>
      </div>
      {note && <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>{note}</p>}
    </div>
  );
}

// LAUNCH FLAG: Coach HQ is open & free for everyone until accounts go live.
// Flip to false once sign-ins + Stripe are set up to re-gate it behind the Coach tier.
const COACH_HQ_OPEN = true;
function CoachHQ({ data, openPlayer, go }) {
  const wl = useWatchlist();
  const { user, isAdmin } = useAuth();
  const { hasPass, redeem, pass } = useCoachAccess();
  const [coachEnt, setCoachEnt] = useState(false);
  useEffect(() => { let live = true; if (user) hasCoach().then((v) => { if (live) setCoachEnt(v); }).catch(() => {}); else setCoachEnt(false); return () => { live = false; }; }, [user]);
  // An approved team claim grants this coach Coach HQ access on their account.
  const [ownsTeam, setOwnsTeam] = useState(false);
  useEffect(() => { let live = true; if (user) myClaims().then((cs) => { if (live) setOwnsTeam((cs || []).some((c) => c.status === "approved" && isTeamClaim(c))); }).catch(() => {}); else setOwnsTeam(false); return () => { live = false; }; }, [user]);
  const realAccess = isAdmin || hasPass || coachEnt || ownsTeam;
  const unlocked = COACH_HQ_OPEN || realAccess; // open & free until accounts launch
  const PREMIUM = { matchup: true, myteam: true }; // scout + lists are the free hook
  const [tab, setTab] = useState("scout");
  const [oppA, setOppA] = useState("");
  const [oppB, setOppB] = useState("");
  const [mine, setMine] = useState("");
  const [mmode, setMmode] = useState("team"); // team | five | one
  const [q, setQ] = useState("");
  const [notes, setNotes] = useSynced("ph_notes", "");
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  const find = (slug) => data.teams.find((t) => t.slug === slug) || null;
  const Picker = ({ value, onChange, ph }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, width: "100%", fontSize: 14, padding: "12px 14px" }}>
      <option value="">{ph}</option>{data.teams.filter((t) => !t.directory).map((t) => <option key={t.slug} value={t.slug}>{t.label || t.name}</option>)}
    </select>
  );
  const board = useMemo(() => { const k = q.trim().toLowerCase(); return data.players.filter((p) => !k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)).slice(0, 50); }, [q, data.players]);
  const leaders = useMemo(() => [...data.players].sort((x, y) => (y.ppg || 0) - (x.ppg || 0)).slice(0, 12), [data.players]);
  const watchPlayers = data.players.filter((p) => wl.has(p.id));
  const a = find(oppA), b = find(oppB), my = find(mine);
  const gated = (k) => PREMIUM[k] && !unlocked;
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="hello">Coach HQ</div>
        {realAccess ? <span className="ctx">{isAdmin || pass?.tier === "owner" ? "Owner" : hasPass ? "Pilot access" : "Coach access"} ✓</span>
          : <span className="ctx" style={{ color: "var(--gold-a)", borderColor: "rgba(245,196,81,.4)" }}>{COACH_HQ_OPEN ? "Free preview · Coach tier at launch" : "Coach tier · free first year"}</span>}
      </div>
      <div className="sub">Scout opponents, build matchups, and run your team — your whole sideline brain, in one place.</div>
      {COACH_HQ_OPEN && !realAccess && (
        <div className="banner" style={{ borderColor: "rgba(245,196,81,.4)", marginTop: 14 }}><div className="ico" style={{ color: "var(--gold-a)" }}>★</div><div style={{ flex: 1 }}>
          <h3>Coach HQ is open &amp; free during launch</h3>
          <p>Dig into everything — matchups, your-team analytics, opponent game plans. Once accounts go live it becomes a <b style={{ color: "var(--ink)" }}>Coach-tier</b> feature ($19/mo · <b style={{ color: "var(--ink)" }}>free your first year</b>).</p>
        </div></div>
      )}
      <div className="tabs" style={{ margin: "16px 0", flexWrap: "wrap" }}>
        {[["scout", "Opponent Scouting"], ["matchup", "Matchup Builder"], ["myteam", "My Team"], ["lists", "Lists & Notes"]].map(([k, l]) => <span key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}{PREMIUM[k] && !unlocked ? " 🔒" : ""}</span>)}
      </div>

      {tab === "scout" && (
        <div className="card">
          <p className="ttl">Scout an opponent</p>
          <div style={{ marginBottom: 12 }}><Picker value={oppA} onChange={setOppA} ph="Choose a team…" /></div>
          {a ? <TeamReport team={a} schedule={data.schedule} wl={wl} openPlayer={openPlayer} mode="opponent" />
            : (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 18px" }}>Pick a team to pull their record, scoring threats, tendencies, and recent form — your full pre-game scouting report. Or scan the league’s top scorers below.</p>
                <p className="ttl" style={{ margin: "0 0 4px" }}>League leaders · top scorers</p>
                <div>
                  {leaders.map((p, i) => (
                    <div key={`${p.id}-${i}`} onClick={() => openPlayer(p)} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 12, alignItems: "center", padding: "10px 2px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
                      <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, color: "var(--faint)" }}>{i + 1}</span>
                      <span><span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 14.5, color: "var(--ink)" }}>{p.name}</span> <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{[p.pos, cleanOpp(p.school)].filter(Boolean).join(" · ")}</span></span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 15 }}>{r1(p.ppg)}</span><span style={{ fontSize: 9.5, color: "var(--faint)", textTransform: "uppercase" }}>ppg</span><span className="add" onClick={(e) => { e.stopPropagation(); wl.toggle(p.id); }}>{wl.has(p.id) ? "✓" : "+"}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {tab === "matchup" && (gated("matchup") ? <CoachLock feature="Matchup Builder" user={user} go={go} redeem={redeem} /> : (
        <div className="card">
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[["team", "Team vs Team"], ["five", "Custom 5-on-5"], ["one", "1-on-1 read"]].map(([k, l]) => <span key={k} className={`tab ${mmode === k ? "on" : ""}`} onClick={() => setMmode(k)}>{l}</span>)}
          </div>

          {mmode === "five" && <FiveOnFive data={data} openPlayer={openPlayer} />}
          {mmode === "one" && <OneOnOne data={data} openPlayer={openPlayer} />}

          {mmode === "team" && <>
          <p className="ttl">Build a matchup — team vs team</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Picker value={oppA} onChange={setOppA} ph="Your team / Team A…" />
            <Picker value={oppB} onChange={setOppB} ph="Opponent / Team B…" />
          </div>
          {a && b ? (() => {
            const ra = teamRecord(a, data.schedule), rb = teamRecord(b, data.schedule);
            const aa = +teamAvgPpg(a), ab = +teamAvgPpg(b);
            const aN = teamAnalytics(a), bN = teamAnalytics(b);
            const topReb = (t) => [...t.players].sort((x, y) => (y.rpg || 0) - (x.rpg || 0))[0];
            const ar = topReb(a), br = topReb(b);
            const wp = (r) => r.w / Math.max(1, r.w + r.l);
            const row = (label, va, vb, better) => (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: better === "a" ? "var(--orange)" : "var(--ink)" }}>{va}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", whiteSpace: "nowrap", fontWeight: 600 }}>{label}</span>
                <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: better === "b" ? "var(--orange)" : "var(--ink)" }}>{vb}</span>
              </div>
            );
            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ textAlign: "right", fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 16 }}>{a.label || a.name}</span>
                  <span style={{ color: "var(--faint)", fontFamily: "var(--disp)", fontSize: 14 }}>vs</span>
                  <span style={{ fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 16 }}>{b.label || b.name}</span>
                </div>
                {row("Record", `${ra.w}-${ra.l}`, `${rb.w}-${rb.l}`, wp(ra) >= wp(rb) ? "a" : "b")}
                {row("Avg PPG/player", aa, ab, aa >= ab ? "a" : "b")}
                {row("Top scorer", a.top ? r1(a.top.ppg) : "—", b.top ? r1(b.top.ppg) : "—", (a.top?.ppg || 0) >= (b.top?.ppg || 0) ? "a" : "b")}
                {row("Double-figure scorers", aN.scorers.length, bN.scorers.length, aN.scorers.length >= bN.scorers.length ? "a" : "b")}
                {row("Live shooters (33%+)", aN.shooters.length, bN.shooters.length, aN.shooters.length >= bN.shooters.length ? "a" : "b")}
                {row("Disruptive defenders", aN.stockGuys.length, bN.stockGuys.length, aN.stockGuys.length >= bN.stockGuys.length ? "a" : "b")}
                {row("Top rebounder (RPG)", ar ? r1(ar.rpg) : "—", br ? r1(br.rpg) : "—", (ar?.rpg || 0) >= (br?.rpg || 0) ? "a" : "b")}
                {row("Roster size", a.n, b.n, a.n >= b.n ? "a" : "b")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  {[[a, aN], [b, bN]].map(([t, n], i) => (
                    <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 11px", background: "var(--surface)" }}>
                      <div style={{ fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", fontSize: 12.5 }}>{t.label || t.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{n.guardHeavy ? "Guard-heavy, perimeter" : n.bigs >= 2 ? "Size up front" : "Balanced"} · {n.balanced ? "scores by committee" : `${(t.top?.name || "").split(" ")[0]}-led`}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}><b style={{ color: "var(--orange)", fontFamily: "var(--disp)", textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>Key matchup</b> — {a.top?.name} vs {b.top?.name}. Win the {aa >= ab ? a.name : b.name} scoring edge{aN.guardHeavy !== bN.guardHeavy ? `; ${(aN.guardHeavy ? a : b).name} will try to push pace` : ""} and control tempo.</p>
              </div>
            );
          })() : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick two teams to compare records, scoring, and the key individual matchup.</p>}
          </>}
        </div>
      ))}

      {tab === "myteam" && (gated("myteam") ? <CoachLock feature="My Team" user={user} go={go} redeem={redeem} /> : (
        <div className="card">
          <p className="ttl">My team</p>
          <div style={{ marginBottom: 12 }}><Picker value={mine} onChange={setMine} ph="Choose your team…" /></div>
          {my ? <TeamReport team={my} schedule={data.schedule} wl={wl} openPlayer={openPlayer} mode="myteam" />
            : <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Pick your team to see your efficiency leaders, tendencies, and recent form.</p>}
        </div>
      ))}

      {tab === "lists" && (
        <div className="ctools">
          <div className="card">
            <p className="ttl">Watchlist ({watchPlayers.length})</p>
            {watchPlayers.length ? watchPlayers.map((p, i) => (
              <div className="wl" key={`${p.id}-${i}`}><span className="n" onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</span><span className="s">{r1(p.ppg)} PPG · {p.school}</span><span className="add" onClick={() => wl.toggle(p.id)} style={{ marginLeft: 8 }}>Remove</span></div>
            )) : <p style={{ fontSize: 12.5, color: "var(--faint)", margin: 0 }}>No players yet — add from the board or a scouting report.</p>}
            <p className="ttl" style={{ margin: "16px 0 8px" }}>Game-prep notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes, tags, game plan…" style={{ ...inp, width: "100%", minHeight: 90, fontSize: 13, padding: 10, resize: "vertical" }} />
          </div>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <p className="ttl" style={{ margin: 0 }}>The board</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players…" style={{ ...inp, fontSize: 13, padding: "8px 12px", minWidth: 160 }} />
            </div>
            <table className="board"><tbody>
              <tr><th>Player</th><th>Team</th><th>PPG</th><th /></tr>
              {board.map((p, i) => (
                <tr key={`${p.id}-${i}`}><td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer" }}>{p.name}</b></td><td>{p.school}</td><td>{p.lead}</td><td><span className="add" onClick={() => wl.toggle(p.id)}>{wl.has(p.id) ? "✓" : "+ Watch"}</span></td></tr>
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
      fetch("/data/schoolLocations.json").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
      fetch("/data/gameRecaps.json").then((r) => r.ok ? r.json() : { recaps: [] }).catch(() => ({ recaps: [] })),
      fetch("/data/headshots.json").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([pj, ch, sc, gj, loc, rc, hs]) => {
      const hsImg = hs || {}; // nameKey → "/headshots/<key>.jpg" (scraped from Capitol Hoops)
      const shotFor = (name, pr) => pr?.headshot || hsImg[nameKey(name)] || null;
      const sj = { games: SCHEDULE_DATA.games || SCHEDULE_DATA };
      const recaps = (rc.recaps || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const recapSource = rc._source || "Capitol Hoops Summer League";
      const locByKey = {}; for (const [nm, v] of Object.entries(loc || {})) locByKey[nameKey(nm)] = v;
      const prospects = pj.prospects || pj;
      const prByKey = Object.fromEntries(prospects.map((p) => [nameKey(p.name || p.id), p]));
      const gl = gj.players || {};
      let cohort = null; try { cohort = buildArchetypeCohort(gl, ch.teams || {}); } catch (e) { cohort = null; }
      // Flatten EVERY rostered Capitol Hoops player into the database. Players
      // who logged summer minutes carry their stats; the rest are included with
      // null stats (render as "—", sort last) so the full roster is searchable.
      const NO_STATS = { gp: null, ppg: null, rpg: null, apg: null, spg: null, bpg: null, fgPct: null, ftPct: null, threePct: null, tsPct: null };
      const all = [];
      for (const t of Object.values(ch.teams || {})) {
        for (const pl of (t.players || [])) {
          const has = pl.stats && pl.stats.gp > 0 && pl.stats.ppg != null;
          const pr = prByKey[nameKey(pl.name)];
          const gy = pr?.gradYear || pl.classYear;
          all.push({
            id: pr?.id || nameKey(pl.name), key: nameKey(pl.name), name: pl.name, school: schoolLabel(t.name),
            pos: pl.position || pr?.position || null,
            cls: gy ? `'${String(gy).slice(2)}` : "",
            gradYear: gy || null,
            state: pr?.state || teamState(t.name, locByKey) || null, // school-derived state so region filters work for all
            stars: pr?.stars || null, rankings: pr?.rankings || null,
            status: pr?.status || pr?.commitment || null,
            meta: `${schoolLabel(t.name)}${pl.position ? " · " + pl.position : ""}`,
            headshot: shotFor(pl.name, pr),
            ...(has ? pl.stats : NO_STATS),
            lead: has ? r1(pl.stats.ppg) : "—", leadK: "PPG",
            statsVerified: has,
          });
        }
      }
      all.sort((a, b) => (b.ppg ?? -1) - (a.ppg ?? -1));
      // Ranked recruits — EVERY DMV player carrying a recruiting-service rating or
      // ranking, whether or not they played summer league. Board players keep their
      // summer stats; the rest come straight from the prospect DB.
      const onBoard = Object.fromEntries(all.map((p) => [p.key, p]));
      const isRanked = (x) => !!(x && (x.stars || (x.rankings && (x.rankings.national || x.rankings.state || x.rankings.position))));
      const ranked = [];
      const seenRank = new Set();
      for (const pr of prospects) {
        if (!isRanked(pr)) continue;
        const k = nameKey(pr.name);
        if (seenRank.has(k)) continue;
        seenRank.add(k);
        if (onBoard[k]) { ranked.push(onBoard[k]); continue; }
        const gy = pr.gradYear || pr.classYear;
        ranked.push({
          id: pr.id || k, key: k, name: pr.name, school: schoolLabel(pr.school || ""),
          pos: pr.position || null, cls: gy ? `'${String(gy).slice(2)}` : "",
          gradYear: gy || null, state: pr.state || null,
          stars: pr.stars || null, rankings: pr.rankings || null,
          status: pr.status || pr.commitment || null,
          meta: `${schoolLabel(pr.school || "")}${pr.position ? " · " + pr.position : ""}`,
          headshot: shotFor(pr.name, pr),
          gp: null, ppg: null, rpg: null, apg: null, lead: "—", leadK: "PPG", statsVerified: false,
        });
      }
      ranked.sort((a, b) => (((a.rankings && a.rankings.national) || 9999) - ((b.rankings && b.rankings.national) || 9999)) || ((b.stars || 0) - (a.stars || 0)) || ((b.ppg || 0) - (a.ppg || 0)));
      // Featured: a rotating set of real standouts — summer leaders + ranked
      // recruits (who carry their rating/ranking badge on the card).
      const allByKey = Object.fromEntries(all.map((p) => [p.key, p]));
      const rankedByKey = Object.fromEntries(ranked.map((p) => [p.key, p]));
      const buildFeatured = (p) => p && ({
        ...p,
        eyebrow: p.ppg != null ? "Scout Card · Summer '26" : `Scout Card · Class ${p.cls || "DMV"}`,
        meta: `${p.school || ""}${p.cls ? " · " + p.cls : ""}`,
        stats: p.ppg != null
          ? [{ v: r1(p.ppg), k: "PPG", pct: 88 }, { v: r1(p.rpg), k: "RPG", pct: 70 }, { v: r1(p.apg), k: "APG", pct: 66 }]
          : [p.stars ? { v: `${p.stars}★`, k: "RATING" } : null, p.rankings && p.rankings.national ? { v: `#${p.rankings.national}`, k: "NATIONAL" } : null, p.rankings && p.rankings.state ? { v: `#${p.rankings.state}`, k: `${p.state || ""} STATE`.trim() } : null].filter(Boolean),
        arc: p.ppg != null ? [12, 14, 13, 17, Number(p.ppg) || 19] : null,
      });
      const FEATURED_NAMES = ["Christian Towe", "Drew Hill", "Major Jones", "J'Lon Lyons", "Brandon Woodard"];
      const featuredCards = FEATURED_NAMES.map((nm) => buildFeatured(allByKey[nameKey(nm)] || rankedByKey[nameKey(nm)])).filter(Boolean);
      const withPhoto = all.find((p) => p.headshot) || all[0];
      const featured = featuredCards[0] || (withPhoto && buildFeatured(withPhoto));
      const cov = {
        // Use the actual board population (players with tracked stats) so the
        // landing "Players" stat matches the Prospects tab count exactly.
        players: all.length >= 100 ? `${Math.floor(all.length / 100) * 100}+` : String(all.length),
        summer: Object.keys(ch.teams || {}).length,
        hs: (sc.schools || sc || []).length || 0,
      };
      // Summer-league teams (with rosters + stats — for Teams view + Coach HQ).
      const summerTeams = Object.entries(ch.teams || {}).map(([slug, t]) => {
        // Full roster — every rostered player, not only summer stat-posters.
        // Players who logged no summer minutes carry null stats (render as "—").
        const roster = (t.players || [])
          .map((p) => { const pr = prByKey[nameKey(p.name)]; const has = p.stats && p.stats.gp > 0 && p.stats.ppg != null; return { id: pr?.id || nameKey(p.name), name: p.name, pos: p.position, cls: (pr?.gradYear || p.classYear) ? `'${String(pr?.gradYear || p.classYear).slice(2)}` : "", headshot: shotFor(p.name, pr), hasStats: !!has, ...(has ? p.stats : NO_STATS) }; })
          .sort((a, b) => (b.ppg ?? -1) - (a.ppg ?? -1));
        const players = roster.filter((p) => p.hasStats); // stat-qualified, for analytics/top scorer
        const ln = (t.name || "").toLowerCase();
        const ctx = /hayfield/.test(ln) ? "HS" : (/\bakt\b|warriors|3ssb|\baau\b/.test(ln) ? "AAU" : "SUMMER");
        return { slug, name: t.name, label: schoolLabel(t.name), coach: t.headCoach || null, roster, players, top: players[0] || null, n: roster.length, statN: players.length, ctx, state: teamState(t.name, locByKey), type: teamType(t.name, locByKey) };
      }).filter((t) => t.players.length > 0);
      // Full DMV directory: EVERY school is a team. Summer teams keep their
      // rosters/stats; the rest are directory entries (school info + any ranked
      // recruits we have) so the site covers the whole DMV, not just summer ball.
      const matchKey = (n) => String(n || "").toLowerCase().replace(/\bsaint\b/g, "st")
        .replace(/\b(secondary|high|school|academy|preparatory|prep|catholic|college|christian|friends|country|the|of)\b/g, "").replace(/[^a-z0-9]/g, "");
      const haveSchool = new Set();
      for (const t of summerTeams) { haveSchool.add(matchKey(t.label)); haveSchool.add(matchKey(t.name)); for (const tok of String(t.slug).split("-")) { const mk = matchKey(tok); if (mk.length >= 4) haveSchool.add(mk); } }
      const rankedBySchool = {};
      for (const rp of ranked) { const mk = matchKey(rp.school); if (mk) (rankedBySchool[mk] = rankedBySchool[mk] || []).push(rp); }
      const directory = [];
      for (const s of (sc.schools || sc || [])) {
        if (!s || !s.name) continue;
        const mk = matchKey(s.name);
        if (!mk || haveSchool.has(mk)) continue;
        haveSchool.add(mk);
        const label = schoolLabel(s.name);
        const ros = rankedBySchool[matchKey(label)] || rankedBySchool[mk] || [];
        directory.push({ slug: String(s.slug || mk).replace(/\//g, "-"), name: s.name, label, coach: null, roster: ros, players: [], top: null, n: ros.length, statN: 0, ctx: "HS", state: s.state || null, type: teamType(s.name, locByKey), directory: true, city: s.city || null });
      }
      const teams = [...summerTeams, ...directory].sort((a, b) => a.label.localeCompare(b.label));
      const schedule = (sj.games || []);
      // HS-season lines (teamStats.json), keyed by player for the profile "High school" tab.
      const hsByKey = {};
      for (const ht of Object.values(TEAM_STATS || {})) {
        for (const pl of (ht.players || [])) {
          const g = pl.gameStats || {}, sh = pl.shooting || {};
          hsByKey[pl.id || nameKey(pl.name)] = { split: `HS ${ht.season || "season"}`, gp: pl.gp ?? "—", ppg: r1(g.ppg), rpg: r1(g.rpg), apg: r1(g.apg), spg: r1(g.spg), bpg: r1(g.bpg), tp: sh.tpPct != null ? `${r1(sh.tpPct)}%` : "—", fgPct: sh.fgPct, ftPct: sh.ftPct };
        }
      }
      // Live Wire ticker: hand-authored news + auto top summer performances.
      const newsHand = (NEWS_DATA.items || []).map((it) => ({ text: it.headline, url: it.url || null, player: it.prospectId ? (all.find((p) => p.id === it.prospectId) || null) : null }));
      const newsPerf = [...all].sort((x, y) => (y.ppg || 0) - (x.ppg || 0)).slice(0, 8).map((p) => ({ text: `${p.name} — ${r1(p.ppg)} PPG this summer for ${cleanOpp(p.school)}`, player: p }));
      const news = [...newsHand, ...newsPerf];
      setData({ players: all, ranked, featured, featuredCards, cov, teams, schedule, gl, cohort, prByKey, hsByKey, news, recaps, recapSource });
    });
  }, []);
  return data;
}

// ---- PROSPECTS — button-filter board (pre-rebuild UX + depth) --------------
const FilterChip = ({ on, onClick, children }) => (
  <button type="button" className={`fchip ${on ? "on" : ""}`} onClick={onClick}>{children}</button>
);
const ChipGroup = ({ label, children }) => (
  <div className="fgroup"><span className="fglabel">{label}</span><div className="fgrow">{children}</div></div>
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
  const [sort, setSort] = useState("ppg");
  const [showRoster, setShowRoster] = useState(false);
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  // Split matches into players with summer production (the stat board)
  // and rostered players with no summer stats yet (their own section below).
  const { list, rosterList } = useMemo(() => {
    const k = q.trim().toLowerCase();
    const matched = data.players.filter((p) =>
      (!k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)) &&
      (!states.length || (p.state && states.includes(p.state))) &&
      (!poss.length || poss.some((b) => posIn(p.pos, b))) &&
      (!cls.length || cls.includes(p.cls)) &&
      (!tracked || wl.has(p.id)));
    // "Ranked" shows EVERY ranked DMV recruit (board or not), pre-sorted by rank
    // in useData. Apply the same region/position/class/search/watchlist filters.
    if (sort === "ranked") {
      const rk = (data.ranked || []).filter((p) =>
        (!k || p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k)) &&
        (!states.length || (p.state && states.includes(p.state))) &&
        (!poss.length || poss.some((b) => posIn(p.pos, b))) &&
        (!cls.length || cls.includes(p.cls)) &&
        (!tracked || wl.has(p.id)));
      return { list: rk.slice(0, 250), rosterList: [] };
    }
    const stat = matched.filter((p) => p.gp != null);
    const roster = matched.filter((p) => p.gp == null).sort((a, b) => a.name.localeCompare(b.name));
    const sorted = sort === "az" ? [...stat].sort((a, b) => a.name.localeCompare(b.name)) : [...stat].sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
    return { list: sorted.slice(0, 250), rosterList: roster };
  }, [q, states, poss, cls, tracked, sort, data.players, data.ranked, wl.ids]);
  const inp = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none" };
  const renderRow = (p, i) => (
    <div key={`${p.id}-${i}`} onClick={() => openPlayer(p)} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 13, alignItems: "center", padding: "11px 2px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
      <div className="rav" style={{ width: 42, height: 42 }}>{p.headshot ? <img src={p.headshot} alt="" /> : initials(p.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 15.5, color: "var(--ink)" }}>{p.name}</span>
          {(p.stars || (p.rankings && p.rankings.national)) ? <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, fontWeight: 700, color: "var(--gold-a)", border: "1px solid rgba(245,196,81,.4)", borderRadius: 4, padding: "1px 5px" }}>{[p.stars ? `${p.stars}★` : null, p.rankings && p.rankings.national ? `#${p.rankings.national} Natl` : null].filter(Boolean).join(" · ")}</span> : null}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{[p.pos, p.cls, cleanOpp(p.school), p.gp == null ? "on roster" : null].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, color: p.gp == null ? "var(--faint)" : "var(--orange)", lineHeight: 1 }}>{r1(p.ppg)}</div>
        <div style={{ fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>{p.gp == null ? "roster · no summer stats" : `ppg · ${p.gp || 0}gp${(p.gp || 0) < 3 ? " · small" : ""}`}</div>
      </div>
    </div>
  );
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="keye">Prospects</div>
          <div className="sub" style={{ marginTop: 4 }}>The full DMV database · {data.players.length} profiles · sorted by summer production</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player or school…" style={{ ...inp, minWidth: 220, fontSize: 14, padding: "11px 14px" }} />
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "20px 0 14px", alignItems: "flex-end" }}>
        <ChipGroup label="Region">{["DC", "MD", "VA"].map((s) => <FilterChip key={s} on={states.includes(s)} onClick={() => tog(states, setStates, s)}>{s}</FilterChip>)}</ChipGroup>
        <ChipGroup label="Position">{["G", "W", "F"].map((b) => <FilterChip key={b} on={poss.includes(b)} onClick={() => tog(poss, setPoss, b)}>{b}</FilterChip>)}</ChipGroup>
        <ChipGroup label="Class">{["'27", "'28", "'29", "'30"].map((c) => <FilterChip key={c} on={cls.includes(c)} onClick={() => tog(cls, setCls, c)}>{c}</FilterChip>)}</ChipGroup>
        <ChipGroup label="Watchlist"><FilterChip on={tracked} onClick={() => setTracked(!tracked)}>☆ Tracked</FilterChip></ChipGroup>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <ChipGroup label="Sort by">{[["ppg", "PPG"], ["ranked", "Ranked"], ["az", "A–Z"]].map(([v, l]) => <FilterChip key={v} on={sort === v} onClick={() => setSort(v)}>{l}</FilterChip>)}</ChipGroup>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", fontSize: 11.5, color: "var(--faint)" }}>{data.players.length} players</span>
      </div>

      <div style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12, color: "var(--faint)", margin: "24px 0 6px" }}>
        {sort === "ranked" ? `${list.length} ranked ${list.length === 1 ? "recruit" : "recruits"}` : `${list.length} shown`}
      </div>
      {sort === "ranked" && <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "-2px 0 8px", lineHeight: 1.5, maxWidth: 560 }}>Players carrying a recruiting-service rating or a national / state / position ranking. Everyone else is on the PPG board.</p>}
      <div>
        {list.map(renderRow)}
        {list.length === 0 && rosterList.length === 0 && <p style={{ fontSize: 12.5, color: "var(--faint)", padding: 18 }}>No prospects match these filters.</p>}
      </div>

      {rosterList.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div onClick={() => setShowRoster((s) => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 14px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", cursor: "pointer" }}>
            <div>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 13.5, color: "var(--ink)" }}>On rosters · no summer stats yet <span style={{ color: "var(--orange)" }}>{rosterList.length}</span></div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Full team rosters from Capitol Hoops — tracked &amp; searchable. Stat lines fill in as they log summer games.</div>
            </div>
            <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 12, color: "var(--orange)", whiteSpace: "nowrap" }}>{showRoster ? "Hide ▴" : "Show ▾"}</span>
          </div>
          {showRoster && <div style={{ marginTop: 8 }}>{rosterList.slice(0, 400).map(renderRow)}</div>}
        </div>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- LEADERS — public statistical leaderboards ----------------------------
function LeadersView({ data, openPlayer }) {
  const [cat, setCat] = useState("ppg");
  const CATS = [["ppg", "Scoring", "PPG"], ["rpg", "Rebounding", "RPG"], ["apg", "Assists", "APG"], ["spg", "Steals", "SPG"], ["bpg", "Blocks", "BPG"], ["threePct", "3-Point %", "3P%"], ["tsPct", "True Shooting", "TS%"]];
  const isPct = cat === "threePct" || cat === "tsPct";
  const toneKey = cat === "threePct" ? "threePct" : cat === "tsPct" ? "tsPct" : cat;
  const list = useMemo(() => {
    const minGp = isPct ? 3 : 1;
    return [...data.players].filter((p) => (p.gp || 0) >= minGp && p[cat] != null && (!isPct || p[cat] > 0)).sort((a, b) => (b[cat] || 0) - (a[cat] || 0)).slice(0, 30);
  }, [cat, data.players]);
  const lab = CATS.find((c) => c[0] === cat)?.[2] || "";
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="keye">Leaders</div>
      <div className="sub" style={{ marginTop: 4 }}>DMV summer-league statistical leaders{isPct ? " · min. 3 GP" : ""}</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "18px 0 14px" }}>
        {CATS.map(([k, l]) => <FilterChip key={k} on={cat === k} onClick={() => setCat(k)}>{l}</FilterChip>)}
      </div>
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="board"><tbody>
            <tr><th>#</th><th>Player</th><th>Team</th><th>{lab}</th><th>GP</th></tr>
            {list.map((p, i) => (
              <tr key={`${p.id}-${i}`}>
                <td style={{ fontFamily: "var(--disp)", fontWeight: 800, color: i < 3 ? "var(--orange)" : "var(--faint)" }}>{i + 1}</td>
                <td><b onClick={() => openPlayer(p)} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>{p.name}</b> <span style={{ color: "var(--faint)", fontSize: 11 }}>{p.pos || ""}</span></td>
                <td>{cleanOpp(p.school)}</td>
                <td style={{ fontFamily: "var(--disp)", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: statTone(toneKey, p[cat]) }}>{isPct ? `${r1(p[cat])}%` : r1(p[cat])}</td>
                <td style={{ color: "var(--muted)" }}>{p.gp}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- RECAPS — game previews/recaps, reported by Capitol Hoops (credited) ----
function RecapsView({ data }) {
  const recaps = data.recaps || [];
  const source = "Capitol Hoops Summer League";
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="keye">Recaps</div>
      <div className="sub" style={{ marginTop: 4 }}>Game previews &amp; recaps, reported by <b style={{ color: "var(--ink)" }}>{source}</b>. We link to the source — all credit to their writers.</div>
      {recaps.length === 0 ? <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 18 }}>No recaps yet.</p> : (
        <div className="anat" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", marginTop: 18 }}>
          {recaps.map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="feat" style={{ display: "block", overflow: "hidden", padding: 0 }}>
              {r.image && <div style={{ height: 150, background: `#10141b url("${r.image}") center/cover no-repeat` }} />}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", background: r.type === "recap" ? "rgba(47,191,143,.15)" : "rgba(59,158,255,.15)", color: r.type === "recap" ? "var(--teal)" : "var(--blue)", borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>{r.type || "story"}</span>
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{r.date}</span>
                </div>
                <p className="ft" style={{ fontSize: 14.5, lineHeight: 1.25, marginBottom: 8 }}>{r.title}</p>
                {r.excerpt && <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.excerpt}</p>}
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>Read on Capitol Hoops →</span>
              </div>
            </a>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 22, lineHeight: 1.5 }}>Previews &amp; recaps are written and published by {source}. Prospera Hoops links to the original articles and claims no authorship.</div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---- SCOUT BOARD — your tracked players + notes + printable report ---------
function ScoutView({ data, openPlayer, go }) {
  const wl = useWatchlist();
  const players = useMemo(() => {
    const byId = {};
    for (const p of [...(data.players || []), ...(data.ranked || [])]) if (!byId[p.id]) byId[p.id] = p;
    return wl.ids.map((id) => byId[id]).filter(Boolean);
  }, [wl.ids, data.players, data.ranked]);
  const ta = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, color: "var(--ink)", fontFamily: "var(--sans)", outline: "none", width: "100%", minHeight: 64, fontSize: 13, padding: 10, resize: "vertical", marginTop: 10 };
  return (
    <div className="wrap scout-board" style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="keye">Watchlist</div>
          <div className="sub" style={{ marginTop: 4 }}>{players.length} player{players.length === 1 ? "" : "s"} tracked · notes save to this device</div>
        </div>
        {players.length > 0 && <button className="bbtn no-print" onClick={() => window.print()}>🖨 Print / save report</button>}
      </div>
      {players.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>Your watchlist is empty. On any profile or the Prospects board, tap <b style={{ color: "var(--ink)" }}>＋ Watch</b> (or the ☆) to add a player here — then write notes, stack them side by side, and print a one-page report.</p>
          <button className="cta no-print" style={{ marginTop: 14 }} onClick={() => go("prospects")}>Browse the board</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {players.map((p, i) => (
            <div key={`${p.id}-${i}`} className="card" style={{ padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center" }}>
                <div className="rav" style={{ width: 48, height: 48, cursor: "pointer" }} onClick={() => openPlayer(p)}>{p.headshot ? <img src={p.headshot} alt="" /> : initials(p.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span onClick={() => openPlayer(p)} style={{ fontFamily: "var(--disp)", fontWeight: 700, textTransform: "uppercase", fontSize: 16, color: "var(--ink)", cursor: "pointer" }}>{p.name}</span>
                    {(p.stars || (p.rankings && p.rankings.national)) ? <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, fontWeight: 700, color: "var(--gold-a)", border: "1px solid rgba(245,196,81,.4)", borderRadius: 4, padding: "1px 5px" }}>{[p.stars ? `${p.stars}★` : null, p.rankings && p.rankings.national ? `#${p.rankings.national} Natl` : null].filter(Boolean).join(" · ")}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{[p.pos, p.cls, cleanOpp(p.school)].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {p.ppg != null && ["ppg", "rpg", "apg"].map((k) => <div key={k} style={{ textAlign: "right" }}><div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 17, color: statTone(k, p[k]) }}>{r1(p[k])}</div><div style={{ fontSize: 8.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{k}</div></div>)}
                  <span className="add no-print" onClick={() => wl.toggle(p.id)} title="Remove from board" style={{ cursor: "pointer" }}>✕</span>
                </div>
              </div>
              <textarea value={wl.note(p.id)} onChange={(e) => wl.setNote(p.id, e.target.value)} placeholder={`Scouting notes on ${(p.name || "").split(" ")[0]} — strengths, fit, projection, who to call…`} style={ta} />
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

// View ↔ URL mapping for the simple state router (History API).
const VIEW_PATH = { landing: "/", prospects: "/prospects", leaders: "/leaders", recaps: "/recaps", teams: "/teams", watchlist: "/watchlist", coach: "/coach", dash: "/dashboard", plus: "/plus" };
const pushUrl = (path) => { try { if (window.location.pathname !== path) window.history.pushState({}, "", path); } catch (e) { /* ignore */ } };

export default function RebuildApp() {
  const { user } = useAuth();
  // On login, recover a coach's redeemed access from their account (no re-redeem).
  useEffect(() => { if (user) hydrateCoachPass(); }, [user]);
  const [view, setView] = useState("landing");
  const [selected, setSelected] = useState(null);
  const [team, setTeam] = useState(null);
  const [lockIn, setLockIn] = useState(null); // null | { player_id, player_name, founding }
  const openLockIn = (prefill) => setLockIn(prefill || {});
  const data = useData();
  const go = (v) => { setView(v); pushUrl(VIEW_PATH[v] || "/"); window.scrollTo(0, 0); };
  const openPlayer = (p) => { setSelected(p); setView("profile"); pushUrl(`/p/${slugify(p.name)}`); window.scrollTo(0, 0); };
  const openTeam = (t) => { setTeam(t); setView("teamDetail"); pushUrl(`/t/${t.slug}`); window.scrollTo(0, 0); };
  const openClaimedPlayer = (playerId) => { const pl = data && data.players.find((p) => p.id === playerId); if (pl) openPlayer(pl); else go("prospects"); };
  const openClaimedTeam = (slug) => { const t = data && data.teams.find((x) => x.slug === slug); if (t) openTeam(t); else go("teams"); };

  // Resolve the URL to a view on first load + on browser back/forward.
  useEffect(() => {
    if (!data) return;
    const resolve = () => {
      const path = window.location.pathname;
      if (path.startsWith("/p/")) { const s = path.slice(3).replace(/\/$/, ""); const pl = data.players.find((p) => slugify(p.name) === s) || (data.ranked || []).find((p) => slugify(p.name) === s); if (pl) { setSelected(pl); setView("profile"); return; } }
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
    <LockInCtx.Provider value={openLockIn}>
    <div className="rebuild">
      <Header view={view} go={go} />
      {view === "landing" && <Landing data={data} go={go} openPlayer={openPlayer} />}
      {view === "profile" && <PublicProfile player={selected || data.featured} data={data} go={go} />}
      {view === "prospects" && <ProspectsView data={data} openPlayer={openPlayer} />}
      {view === "leaders" && <LeadersView data={data} openPlayer={openPlayer} />}
      {view === "recaps" && <RecapsView data={data} />}
      {view === "dash" && <Dashboard go={go} openClaimedPlayer={openClaimedPlayer} openClaimedTeam={openClaimedTeam} />}
      {view === "plus" && <PlusView go={go} />}
      {view === "teams" && <TeamsView data={data} openTeam={openTeam} />}
      {view === "watchlist" && <ScoutView data={data} openPlayer={openPlayer} go={go} />}
      {view === "teamDetail" && team && <TeamDetail team={team} schedule={data.schedule} openPlayer={openPlayer} back={() => go("teams")} />}
      {view === "coach" && <CoachHQ data={data} openPlayer={openPlayer} go={go} />}
      {lockIn && <WaitlistModal prefill={lockIn} onClose={() => setLockIn(null)} />}
    </div>
    </LockInCtx.Provider>
  );
}
