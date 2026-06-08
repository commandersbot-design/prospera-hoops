// ProspectMap — light "recruiting atlas" map module.
//
// Ported from a Next.js package into our Vite app and adapted to the data we
// actually have (no fabricated recruiting tiers / star ratings for real minors):
//   • markers are colored by STATE (DC / MD / VA), not invented D1/D2 tiers
//   • the popup shows the school's top summer scorer (real PPG), not stars
//   • onSelectSchool opens that school's roster page in the app
//
// Leaflet + markercluster are imported here so they ride in this component's
// lazy chunk (the map tab is React.lazy'd in App) and stay out of the main
// bundle. The component is presentation-only: App shapes the `schools` array.

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import styles from "./ProspectMap.module.css";

/* ------------------------------------------------------------------ *
 * State config — colors tuned for the light CARTO basemap.
 * ------------------------------------------------------------------ */
export const STATE = {
  DC: { name: "D.C.", color: "#E0552B" },
  MD: { name: "Maryland", color: "#2F7FD1" },
  VA: { name: "Virginia", color: "#15997A" },
};
const STATE_KEYS = ["DC", "MD", "VA"];
const UNKNOWN_COLOR = "#5A6672";

/* HTML-escape text injected into Leaflet popup/icon strings. */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/* ------------------------------------------------------------------ *
 * Data normalizer — App passes already-shaped rows; this just coerces.
 * { id, name, city, lat, lng, state, prospects, top:{ n, pos, ppg } }
 * ------------------------------------------------------------------ */
export function normalizeSchool(raw) {
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city ?? "",
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    state: STATE[raw.state] ? raw.state : null,
    prospects: Number(raw.prospects ?? 0),
    top: raw.top
      ? { n: raw.top.n, pos: raw.top.pos ?? "", ppg: raw.top.ppg ?? null }
      : null,
  };
}

const colorFor = (state) => STATE[state]?.color ?? UNKNOWN_COLOR;

/* ---------- Leaflet icon factories ---------- */
function pinIcon(state) {
  const c = colorFor(state);
  const svg = `<svg width="28" height="38" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="${c}"/><circle cx="15" cy="15" r="11" fill="#fff" opacity="0.18"/></svg>`;
  return L.divIcon({
    className: "",
    html: `<div class="${styles.pin}">${svg}</div>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

function popupHTML(s) {
  const c = colorFor(s.state);
  const ppg = s.top && s.top.ppg != null ? `${Number(s.top.ppg).toFixed(1)} PPG` : null;
  const top = s.top
    ? `<div class="${styles.cardTop}">
         <div class="${styles.cardPn}">${esc(s.top.n)}</div>
         <div class="${styles.cardPp}">${esc(s.top.pos)}${ppg ? ` &nbsp;·&nbsp; <span class="${styles.ppg}">${ppg}</span>` : ""}</div>
       </div>`
    : "";
  return `<div class="${styles.card}">
    <div class="${styles.cardHd}" style="background:${c}">
      <div class="${styles.cardT}">${esc(STATE[s.state]?.name ?? "DMV")}</div>
      <div class="${styles.cardN}">${esc(s.name)}</div>
    </div>
    <div class="${styles.cardBd}">
      ${s.city ? `<div class="${styles.cardLine}"><span>${esc(s.city)}</span></div>` : ""}
      <div class="${styles.cardLine}">Players in database <b>${s.prospects}</b></div>
      ${top}
      <a class="${styles.cardCta}" href="#" data-roster="${esc(s.id)}">${s.prospects > 0 ? "View roster" : "Open school"} →</a>
    </div>
  </div>`;
}

const CARTO_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/* ================================================================== */
export default function ProspectMap({
  schools = [],
  center = [38.9, -77.02],
  zoom = 9,
  onSelectSchool, // (school) => void
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef({}); // id -> L.marker
  const dataRef = useRef([]);
  const onSelectRef = useRef(onSelectSchool);
  const [activeStates, setActiveStates] = useState(() => new Set(STATE_KEYS));
  const [activeId, setActiveId] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const data = useMemo(() => schools.map(normalizeSchool), [schools]);
  dataRef.current = data;
  onSelectRef.current = onSelectSchool;

  /* ---- init map once ---- */
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView(center, zoom);
    map.zoomControl.setPosition("topright");
    L.tileLayer(CARTO_LIGHT, {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 46,
      iconCreateFunction: (cl) => {
        const n = cl.getChildCount();
        const sz = n < 10 ? 36 : 44;
        return L.divIcon({
          html: `<div class="${styles.clusterIco}" style="width:${sz}px;height:${sz}px">${n}</div>`,
          className: "",
          iconSize: [sz, sz],
        });
      },
    });
    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    // delegate roster-link clicks inside popups
    map.getContainer().addEventListener("click", (e) => {
      const link = e.target.closest("[data-roster]");
      if (!link) return;
      e.preventDefault();
      const id = link.getAttribute("data-roster");
      const s = dataRef.current.find((x) => String(x.id) === String(id));
      if (s && onSelectRef.current) onSelectRef.current(s);
    });

    // map sized inside a flex/grid panel — settle tiles after first paint
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- build markers when data changes ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current = {};
    data.forEach((s) => {
      if (Number.isNaN(s.lat) || Number.isNaN(s.lng)) return;
      // Rostered schools show solid; directory-only (0 players) pins are dimmed
      // so the schools we actually track stand out across the DMV footprint.
      const m = L.marker([s.lat, s.lng], { icon: pinIcon(s.state), opacity: s.prospects > 0 ? 1 : 0.5 });
      m.bindPopup(popupHTML(s), { closeButton: true });
      m.on("popupopen", () => setActiveId(s.id));
      markersRef.current[s.id] = m;
    });
  }, [data]);

  /* ---- re-filter cluster whenever states or data change ---- */
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    const layers = [];
    data.forEach((s) => {
      const key = s.state || "DC"; // unknown rides with DC's toggle
      if (activeStates.has(s.state) || (!s.state && activeStates.size === STATE_KEYS.length)) {
        if (markersRef.current[s.id]) layers.push(markersRef.current[s.id]);
      }
    });
    cluster.addLayers(layers);
  }, [activeStates, data]);

  const shown = useMemo(
    () =>
      data
        .filter((s) => activeStates.has(s.state) || (!s.state && activeStates.size === STATE_KEYS.length))
        .sort((a, b) => b.prospects - a.prospects),
    [data, activeStates]
  );

  const stats = useMemo(() => {
    const topPpg = shown.reduce((m, s) => Math.max(m, s.top?.ppg ?? 0), 0);
    return {
      schools: shown.length,
      prospects: shown.reduce((a, s) => a + s.prospects, 0),
      topPpg: topPpg > 0 ? topPpg.toFixed(1) : "—",
    };
  }, [shown]);

  const toggleState = useCallback((st) => {
    setActiveStates((prev) => {
      const next = new Set(prev);
      if (next.has(st)) {
        if (next.size === 1) return prev;
        next.delete(st);
      } else next.add(st);
      return next;
    });
  }, []);

  const focusSchool = useCallback(
    (id) => {
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const marker = markersRef.current[id];
      const s = dataRef.current.find((x) => String(x.id) === String(id));
      if (!map || !s) return;
      setActiveId(id);
      // On mobile the map sits above the list — scroll it into view so the
      // fly-to is visible after tapping a school.
      if (window.innerWidth <= 760) mapEl.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      // The marker may currently be hidden inside a cluster — zoomToShowLayer
      // declusters/zooms to it first, then we open its popup in the callback.
      if (cluster && marker) {
        cluster.zoomToShowLayer(marker, () => marker.openPopup());
      } else {
        map.flyTo([s.lat, s.lng], 13, { duration: 0.7 });
        setTimeout(() => marker?.openPopup(), 720);
      }
    },
    []
  );

  return (
    <div className={styles.app}>
      <aside className={`${styles.panel} ${panelCollapsed ? styles.collapsed : ""}`}>
        <div className={styles.brand}>
          <div className={styles.kicker}>DMV Hoops Recruiting</div>
          <h1 className={styles.h1}>Prospect Map</h1>
          <div className={styles.sub}>D.C. · Maryland · Virginia high schools</div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.statV}>{stats.schools}</div><div className={styles.statL}>Schools</div></div>
          <div className={styles.stat}><div className={styles.statV}>{stats.prospects}</div><div className={styles.statL}>Players</div></div>
          <div className={styles.stat}><div className={styles.statV}>{stats.topPpg}</div><div className={styles.statL}>Top PPG</div></div>
        </div>

        <div className={styles.filters}>
          <div className={styles.ftitle}>Filter by state</div>
          <div className={styles.chips}>
            {STATE_KEYS.map((st) => {
              const info = STATE[st];
              const on = activeStates.has(st);
              return (
                <button key={st} className={styles.chip} aria-pressed={on} onClick={() => toggleState(st)}>
                  <span className={styles.dot} style={{ background: info.color }} />
                  {info.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.listwrap}>
          <div className={styles.listhead}>Schools <span style={{ color: "#5A6672" }}>({shown.length})</span></div>
          {shown.map((s) => {
            const initials = s.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
            return (
              <div
                key={s.id}
                className={`${styles.school} ${activeId === s.id ? styles.active : ""}`}
                onClick={() => focusSchool(s.id)}
              >
                <div className={styles.badge} style={{ background: colorFor(s.state) }}>{initials}</div>
                <div className={styles.meta}>
                  <div className={styles.nm}>{s.name}</div>
                  <div className={styles.sm}>{s.city}</div>
                </div>
                <div className={styles.cnt}>{s.prospects}</div>
              </div>
            );
          })}
        </div>

        <button className={styles.mtoggle} onClick={() => setPanelCollapsed((v) => !v)}>
          {panelCollapsed ? "Show list" : "Show map"}
        </button>
      </aside>

      <div className={styles.mapwrap}>
        <div ref={mapEl} className={styles.map} />
        <div className={styles.legend}>
          <div className={styles.lt}>State</div>
          {STATE_KEYS.map((st) => (
            <div key={st} className={styles.legendRow}>
              <span className={styles.dot} style={{ background: STATE[st].color }} />
              {STATE[st].name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
