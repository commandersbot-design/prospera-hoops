import React, { useState } from "react";
import FILM_DATA from "../data/prospectFilm.json";

/**
 * Film tab — curated per-prospect video clips with click-to-play UX.
 *
 * Renders as its own tab destination (was previously inline below the
 * comp ladders — moved to a dedicated tab so it has room to breathe
 * and gets a clear purpose statement at the top).
 *
 * Per-clip UX:
 *   - Initial: YouTube/Vimeo thumbnail with cyan play button overlay
 *   - Click: thumbnail swaps to autoplay iframe
 *   - Footer: "Open on YouTube/Vimeo/Streamable" link as a fallback for
 *     networks that block iframe embeds (school filters, corporate VPNs)
 *   - Hover: play button scales up + overlay tint deepens
 *
 * Empty state (no clips for the prospect):
 *   - Clear explainer that clips are hand-curated
 *   - A YouTube search link for the prospect's name + "highlights" so the
 *     user has a one-click path to find tape themselves
 *
 * Source: src/data/prospectFilm.json (keyed by name-slug; matches the
 * authoredComps lookup convention to bridge the inline-PROSPECTS_ALL vs
 * prospects.json id mismatch).
 */

const T = {
  surface:    "var(--prospera-card)",
  surface2:   "var(--prospera-surface-2)",
  border:     "var(--prospera-border)",
  borderSoft: "var(--prospera-border-soft)",
  text:       "var(--prospera-text)",
  textDim:    "var(--prospera-text-dim)",
  textMute:   "var(--prospera-text-mute)",
  cyan:       "var(--prospera-cyan)",
  signal:     "var(--prospera-signal)",
};

const mono = {
  fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
};

const TYPE_META = {
  game:       { label: "GAME",       color: "var(--prospera-cyan)" },
  highlights: { label: "HIGHLIGHTS", color: "var(--prospera-signal)" },
  scrimmage:  { label: "SCRIMMAGE",  color: "var(--prospera-cyan)" },
  workout:    { label: "WORKOUT",    color: "var(--prospera-signal)" },
  interview:  { label: "INTERVIEW",  color: "var(--prospera-text-dim)" },
};

// Slugify rule matches the authored-comps id convention so prospectName
// callers (ScoutingTerminal, ComputedScoreCard) resolve to the same key
// without needing a separate id-by-name lookup. "AJ Dybantsa" → "ajdybantsa".
function nameToId(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Parse a video URL → { provider, id, embedUrl, thumbnailUrl, sourceUrl, sourceLabel }.
// Returns null if unrecognized so callers fall back to a plain link card.
function parseVideoUrl(url) {
  if (!url) return null;
  // Self-hosted / direct video files (e.g. /film/clip.mp4). Played inline with
  // a native <video> element — full playback, no third-party redirect.
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) {
    return {
      provider: "file",
      id: url,
      embedUrl: url,
      thumbnailUrl: null,
      sourceUrl: url,
      sourceLabel: "Open video file",
      isFile: true,
    };
  }
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) {
    const id = m[1];
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      sourceLabel: "Open on YouTube",
    };
  }
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) {
    const id = m[1];
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
      thumbnailUrl: null,
      sourceUrl: `https://vimeo.com/${id}`,
      sourceLabel: "Open on Vimeo",
    };
  }
  m = url.match(/streamable\.com\/([\w-]+)/);
  if (m) {
    const id = m[1];
    return {
      provider: "streamable",
      id,
      embedUrl: `https://streamable.com/e/${id}?autoplay=1`,
      thumbnailUrl: null,
      sourceUrl: `https://streamable.com/${id}`,
      sourceLabel: "Open on Streamable",
    };
  }
  // Instagram reels / posts / IGTV — embedded via the /embed endpoint. These
  // are portrait, so callers render them in a taller frame (see `portrait`).
  m = url.match(/instagram\.com\/(?:reels?|p|tv)\/([\w-]+)/);
  if (m) {
    const id = m[1];
    return {
      provider: "instagram",
      id,
      embedUrl: `https://www.instagram.com/reel/${id}/embed`,
      thumbnailUrl: null,
      sourceUrl: `https://www.instagram.com/reel/${id}/`,
      sourceLabel: "Open on Instagram",
      portrait: true,
    };
  }
  return null;
}

function PlayOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 100%)",
        transition: "background 0.18s",
      }}
      className="prospera-film-overlay"
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--prospera-cyan)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
          transition: "transform 0.15s, background 0.15s",
        }}
        className="prospera-film-play-circle"
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "13px solid transparent",
            borderBottom: "13px solid transparent",
            borderLeft: "22px solid var(--prospera-bg)",
            marginLeft: 6,
          }}
        />
      </div>
    </div>
  );
}

function typeBadge(color) {
  return {
    ...mono,
    fontSize: 9,
    letterSpacing: "0.14em",
    color,
    border: `1px solid ${color}`,
    padding: "3px 8px",
    opacity: 0.88,
    whiteSpace: "nowrap",
  };
}

function FilmCard({ video }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const parsed = parseVideoUrl(video.url);
  const meta = TYPE_META[video.type] || TYPE_META.highlights;

  // Unrecognized provider — render a plain link card.
  if (!parsed) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 15, color: T.text, fontWeight: 600, lineHeight: 1.35 }}>{video.title}</div>
          <span style={typeBadge(meta.color)}>{meta.label}</span>
        </div>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...mono, fontSize: 11, color: T.cyan, letterSpacing: "0.08em", textDecoration: "none" }}
        >
          ↗ Open video (unrecognized provider)
        </a>
        {video.notes && (
          <div style={{ marginTop: 12, fontSize: 13, color: T.textDim, lineHeight: 1.55 }}>{video.notes}</div>
        )}
      </div>
    );
  }

  const showThumbnail = parsed.thumbnailUrl && !thumbnailFailed;

  // Portrait clips (Instagram reels / vertical files) get a tall, capped,
  // centered frame; landscape clips keep the standard 16:9 responsive box.
  const portrait = parsed.portrait || video.portrait;
  const mediaBox = portrait
    ? { position: "relative", width: "100%", maxWidth: 380, height: 600, margin: "0 auto", background: "#000", overflow: "hidden" }
    : { position: "relative", paddingBottom: "56.25%", height: 0, background: "#000", overflow: "hidden" };
  const fill = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 16 }}>
      {/* Title + type badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 15, color: T.text, fontWeight: 600, lineHeight: 1.35 }}>{video.title}</div>
        <span style={typeBadge(meta.color)}>{meta.label}</span>
      </div>

      {/* Media container — 16:9 for landscape, tall portrait for reels */}
      <div style={mediaBox}>
        {isPlaying ? (
          parsed.isFile ? (
            <video
              src={parsed.embedUrl}
              title={video.title}
              controls
              autoPlay
              playsInline
              style={{ ...fill, objectFit: "contain", background: "#000" }}
            />
          ) : (
            <iframe
              src={parsed.embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={fill}
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label={`Play ${video.title}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
              padding: 0,
              cursor: "pointer",
              background: "transparent",
            }}
          >
            {parsed.isFile ? (
              // First-frame poster pulled from the file itself (no extra asset).
              <video
                src={`${parsed.embedUrl}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
              />
            ) : showThumbnail ? (
              <img
                src={parsed.thumbnailUrl}
                alt=""
                onError={() => setThumbnailFailed(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #0F1620 0%, #1A2333 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...mono,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: T.textMute,
                  textTransform: "uppercase",
                }}
              >
                {parsed.provider}
              </div>
            )}
            <PlayOverlay />
          </button>
        )}
      </div>

      {/* Footer: source-out link. Self-hosted clips link back to the original
          post (video.source) for attribution rather than the raw file. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
        <a
          href={video.source || parsed.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: T.textDim,
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          ↗ {video.sourceLabel || (video.source ? "View original" : parsed.sourceLabel)}
        </a>
      </div>

      {video.notes && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: T.textDim,
            lineHeight: 1.6,
            paddingTop: 12,
            borderTop: `1px solid ${T.borderSoft}`,
          }}
        >
          {video.notes}
        </div>
      )}
    </div>
  );
}

function EmptyState({ prospectName }) {
  const name = prospectName || "this prospect";
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " highlights")}`;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px dashed ${T.border}`,
        padding: "48px 32px",
        textAlign: "center",
        display: "grid",
        gap: 14,
        justifyItems: "center",
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: T.textMute,
          textTransform: "uppercase",
        }}
      >
        No Tape Curated Yet
      </div>
      <div style={{ fontSize: 14, color: T.textDim, maxWidth: 420, lineHeight: 1.6 }}>
        Film here is hand-picked — signature games, season reels, and pre-draft
        workouts that capture {name}'s range. Nothing's been added for them
        yet.
      </div>
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: T.cyan,
          textTransform: "uppercase",
          textDecoration: "none",
          marginTop: 4,
        }}
      >
        ↗ Search YouTube for "{name} highlights"
      </a>
    </div>
  );
}

export default function ProspectFilm({ prospectId, prospectName }) {
  const key = prospectId || nameToId(prospectName);
  const videos = (key && FILM_DATA.videos?.[key]) || [];
  const name = prospectName || "this prospect";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Tab header — purpose statement + count. Signal-orange eyebrow
          distinguishes it from cyan-eyebrow comp sections. */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          padding: 20,
        }}
      >
        <div
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            color: T.signal,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Film · Curated Tape
        </div>
        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.55, maxWidth: 720 }}>
          Hand-picked clips that ground the eval in actual on-court evidence —
          signature games, season reels, and pre-draft workouts where they exist.
          The numbers and comps tell you who they remind us of;{" "}
          <span style={{ color: T.signal, fontWeight: 600 }}>film tells you who they are</span>.
        </div>
        {videos.length > 0 && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: "0.16em",
              color: T.textMute,
              textTransform: "uppercase",
              marginTop: 12,
            }}
          >
            {videos.length} clip{videos.length === 1 ? "" : "s"} for {name}
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <EmptyState prospectName={name} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {videos.map((v, i) => (
            <FilmCard key={`${v.url}-${i}`} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
