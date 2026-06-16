// Pre-launch holding page. Replaces the entire app until launch day so the public
// can't see the product before 06.18. Controlled from main.jsx via VITE_PRELAUNCH:
// defaults ON in production, set VITE_PRELAUNCH=false in Vercel on 06.18 to go live.
import React from 'react'

const ORANGE = '#FF6A1A'
const OFF = '#F4F2ED'
const MUTED = '#8B93A1'

export default function ComingSoon() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 24px',
        background:
          'radial-gradient(circle at 50% 0%, rgba(255,106,26,0.10), transparent 42%), linear-gradient(180deg, #11161f 0%, #161d29 45%, #0f141d 100%)',
        color: OFF,
        overflow: 'hidden',
      }}
    >
      <img
        src="/brand/svg/prosperahoops-lockup-dark.svg"
        alt="Prospera Hoops"
        style={{ width: 'min(320px, 72vw)', height: 'auto', marginBottom: 'clamp(28px, 6vw, 56px)' }}
      />

      <div
        style={{
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(12px, 2.6vw, 15px)',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: ORANGE,
          marginBottom: 'clamp(18px, 4vw, 28px)',
        }}
      >
        Launching&nbsp; 06.18
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: "'Saira Condensed', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(52px, 13vw, 132px)',
          lineHeight: 0.96,
          letterSpacing: '0.01em',
        }}
      >
        <span style={{ display: 'block', color: OFF }}>SEEN.</span>
        <span style={{ display: 'block', color: OFF }}>TRACKED.</span>
        <span style={{ display: 'block', color: ORANGE }}>HOME.</span>
      </h1>

      <p
        style={{
          maxWidth: 540,
          margin: 'clamp(28px, 6vw, 44px) auto 0',
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontWeight: 500,
          fontSize: 'clamp(15px, 3.4vw, 19px)',
          lineHeight: 1.55,
          color: MUTED,
        }}
      >
        A home for DMV hoopers. Every player seen, every step tracked — real stats,
        no hype. The DMV&rsquo;s scouting system of record goes live June&nbsp;18.
      </p>

      <div
        style={{
          position: 'absolute',
          bottom: 'clamp(20px, 5vw, 40px)',
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(10px, 2.2vw, 12px)',
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        The DMV&rsquo;s Home Court
      </div>
    </div>
  )
}
