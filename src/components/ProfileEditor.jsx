// Self-edit UI for a player who owns an approved claim. Writes only to the
// profile_overrides overlay (bio / film / contact / socials / self-reported
// measurables / recruiting status) — never to stats or eval, which stay
// system-owned. RLS guarantees a user can only save their own player's row.
import React, { useEffect, useState } from "react";
import { getMyOverride, saveOverride } from "../lib/profiles.js";
import { T, ui, inputStyle, label } from "../lib/theme.js";

const EMPTY = {
  bio: "",
  contact_email: "",
  contact_phone: "",
  contact_public: false,
  instagram: "",
  twitter: "",
  hudl: "",
  height: "",
  weight: "",
  gpa: "",
  grad_year: "",
  positions: "",
  recruiting_status: "Open",
  film_links: [],
};

const Field = ({ children, hint }) => (
  <label style={{ display: "grid", gap: 5 }}>
    <span style={label}>{children}</span>
    {hint}
  </label>
);

export default function ProfileEditor({ prospect, onClose, onSaved }) {
  const [d, setD] = useState(null);
  const [state, setState] = useState("loading"); // loading | idle | saving | saved | error
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    getMyOverride(prospect.id).then((row) => {
      if (!live) return;
      setD({ ...EMPTY, ...(row || {}), film_links: (row && row.film_links) || [] });
      setState("idle");
    });
    return () => { live = false; };
  }, [prospect.id]);

  if (state === "loading" || !d) {
    return <div style={box}><div style={{ ...ui, fontSize: 12, color: T.textMute }}>Loading your profile…</div></div>;
  }

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));
  const setFilm = (i, k) => (e) => setD((p) => { const fl = p.film_links.slice(); fl[i] = { ...fl[i], [k]: e.target.value }; return { ...p, film_links: fl }; });
  const addFilm = () => setD((p) => ({ ...p, film_links: [...p.film_links, { label: "", url: "" }] }));
  const rmFilm = (i) => setD((p) => ({ ...p, film_links: p.film_links.filter((_, j) => j !== i) }));

  async function save(e) {
    e.preventDefault();
    setState("saving");
    setErr("");
    try {
      const payload = {
        ...d,
        film_links: (d.film_links || []).filter((x) => x && x.url && x.url.trim()),
        grad_year: d.grad_year ? Number(d.grad_year) || null : null,
      };
      await saveOverride(prospect.id, payload);
      setState("saved");
      onSaved?.();
    } catch (e2) {
      setErr(String(e2.message || e2));
      setState("error");
    }
  }

  return (
    <form onSubmit={save} style={box}>
      <div style={{ ...ui, fontSize: 10, letterSpacing: "0.14em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>Edit my profile</div>
      <div style={{ ...ui, fontSize: 12, color: T.textMute, lineHeight: 1.5, maxWidth: 640 }}>
        You control this section. Stats, rankings, and evaluation stay Prospera-owned. Height / weight / GPA / class show publicly as <b style={{ color: T.textDim }}>self-reported</b>.
      </div>

      <Field hint={<textarea style={{ ...inputStyle, minHeight: 84, resize: "vertical" }} placeholder="A short bio — who you are, your game, your goals." value={d.bio} onChange={set("bio")} />}>Bio</Field>

      {/* Film */}
      <div style={{ display: "grid", gap: 6 }}>
        <span style={label}>Film links</span>
        {d.film_links.length === 0 && <div style={{ ...ui, fontSize: 12, color: T.textMute }}>Add your Hudl, YouTube, or highlight links.</div>}
        {d.film_links.map((fl, i) => (
          <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inputStyle, flex: "1 1 130px" }} placeholder="Label (e.g. Senior mixtape)" value={fl.label || ""} onChange={setFilm(i, "label")} />
            <input style={{ ...inputStyle, flex: "2 1 220px" }} placeholder="https://…" value={fl.url || ""} onChange={setFilm(i, "url")} />
            <button type="button" onClick={() => rmFilm(i)} style={{ ...ui, fontSize: 11, color: T.danger, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addFilm} style={{ ...ui, fontSize: 11, color: T.signal, background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "8px", cursor: "pointer", justifySelf: "start" }}>+ Add film link</button>
      </div>

      {/* Self-reported measurables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        <Field hint={<input style={inputStyle} placeholder={`e.g. 6'2"`} value={d.height} onChange={set("height")} />}>Height</Field>
        <Field hint={<input style={inputStyle} placeholder="e.g. 180 lb" value={d.weight} onChange={set("weight")} />}>Weight</Field>
        <Field hint={<input style={inputStyle} placeholder="e.g. 3.6" value={d.gpa} onChange={set("gpa")} />}>GPA</Field>
        <Field hint={<input style={inputStyle} type="number" placeholder="e.g. 2027" value={d.grad_year} onChange={set("grad_year")} />}>Class of</Field>
        <Field hint={<input style={inputStyle} placeholder="e.g. PG / SG" value={d.positions} onChange={set("positions")} />}>Positions</Field>
        <Field hint={
          <select style={inputStyle} value={d.recruiting_status} onChange={set("recruiting_status")}>
            <option>Open</option><option>Receiving interest</option><option>Has offers</option><option>Committed</option>
          </select>
        }>Recruiting</Field>
      </div>

      {/* Socials */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <Field hint={<input style={inputStyle} placeholder="@instagram" value={d.instagram} onChange={set("instagram")} />}>Instagram</Field>
        <Field hint={<input style={inputStyle} placeholder="@twitter / X" value={d.twitter} onChange={set("twitter")} />}>Twitter / X</Field>
        <Field hint={<input style={inputStyle} placeholder="Hudl URL" value={d.hudl} onChange={set("hudl")} />}>Hudl</Field>
      </div>

      {/* Contact + visibility */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <Field hint={<input style={inputStyle} type="email" placeholder="Coaches' contact email" value={d.contact_email} onChange={set("contact_email")} />}>Contact email</Field>
        <Field hint={<input style={inputStyle} placeholder="Phone (optional)" value={d.contact_phone} onChange={set("contact_phone")} />}>Contact phone</Field>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", ...ui, fontSize: 12.5, color: T.textDim, cursor: "pointer" }}>
        <input type="checkbox" checked={!!d.contact_public} onChange={(e) => setD((p) => ({ ...p, contact_public: e.target.checked }))} />
        Show my contact info publicly (off = visible to Prospera only). Recommended off until you're ready.
      </label>

      {state === "error" && <div style={{ ...ui, fontSize: 11, color: T.danger }}>{err || "Couldn't save — try again."}</div>}
      {state === "saved" && <div style={{ ...ui, fontSize: 11, color: T.positive, fontWeight: 700 }}>Saved ✓ Your profile is updated.</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={state === "saving"} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "9px 16px", cursor: "pointer" }}>
          {state === "saving" ? "Saving…" : "Save profile"}
        </button>
        <button type="button" onClick={onClose} style={{ ...ui, fontSize: 11, color: T.textDim, background: "transparent", border: "none", cursor: "pointer" }}>Close</button>
      </div>
    </form>
  );
}

const box = { background: "var(--prospera-accent-bg-faint)", border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, display: "grid", gap: 12 };
