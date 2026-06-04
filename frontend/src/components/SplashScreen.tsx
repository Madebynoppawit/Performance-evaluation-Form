import { useEffect, useState } from 'react'

const TITLE    = 'AMW  COMMAND'
const BOOT_SEQ = [
  '[ .... ] Starting performance engine',
  '[  OK  ] Mounting user workspace',
  '[  OK  ] System operational',
]

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [show,     setShow]     = useState(false)
  const [chars,    setChars]    = useState(0)
  const [progress, setProgress] = useState(0)
  const [bootIdx,  setBootIdx]  = useState(0)
  const [ready,    setReady]    = useState(false)
  const [fadeOut,  setFadeOut]  = useState(false)

  useEffect(() => {
    const ts = [
      setTimeout(() => setShow(true),      380),
      setTimeout(() => setBootIdx(1),     1500),
      setTimeout(() => setBootIdx(2),     2000),
      setTimeout(() => setReady(true),    2100),
      setTimeout(() => setFadeOut(true),  2600),
      setTimeout(onDone,                  3200),
    ]
    return () => ts.forEach(clearTimeout)
  }, [onDone])

  /* Typewriter */
  useEffect(() => {
    if (!show || chars >= TITLE.length) return
    const t = setTimeout(() => setChars(c => c + 1), 58)
    return () => clearTimeout(t)
  }, [show, chars])

  /* Progress */
  useEffect(() => {
    if (!show || progress >= 100) return
    const t = setTimeout(() => setProgress(p => Math.min(p + 1.4, 100)), 14)
    return () => clearTimeout(t)
  }, [show, progress])

  const pct = Math.round(progress)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#030303',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
      pointerEvents: fadeOut ? 'none' : 'all',
    }}>

      {/* ── Scan line ──────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        height: 2, top: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(216,160,22,0.9) 30%, #f9ce5c 50%, rgba(216,160,22,0.9) 70%, transparent 100%)',
        boxShadow: '0 0 18px rgba(216,160,22,0.7), 0 0 36px rgba(216,160,22,0.3)',
        animation: 'scan-sweep 0.55s cubic-bezier(0.4,0,1,1) forwards',
      }} />

      {/* ── Noise grain ────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
      }} />

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(rgba(216,160,22,0.04) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(216,160,22,0.04) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 10%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 10%, transparent 80%)',
      }} />

      {/* ── Ambient glow ───────────────────────────────────────────── */}
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(216,160,22,0.06), transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(10,110,209,0.08), transparent 70%)', top:'30%', right:'20%', filter:'blur(50px)', pointerEvents:'none' }} />

      {/* ── Side data strips ───────────────────────────────────────── */}
      {['left', 'right'].map(side => (
        <div key={side} style={{
          position: 'absolute',
          [side]: 32, top: '50%',
          transform: 'translateY(-50%)',
          width: 1, height: 220,
          background: `linear-gradient(to bottom, transparent, rgba(216,160,22,0.3), rgba(216,160,22,0.5), rgba(216,160,22,0.3), transparent)`,
          opacity: show ? 0.7 : 0,
          transition: 'opacity 0.6s ease 0.6s',
        }} />
      ))}

      {/* ── Logo + HUD frame ───────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        marginBottom: 32,
      }}>
        {/* HUD corner brackets */}
        {[
          { top: -14, left: -14, borderTop: true, borderLeft: true },
          { top: -14, right: -14, borderTop: true, borderRight: true },
          { bottom: -14, left: -14, borderBottom: true, borderLeft: true },
          { bottom: -14, right: -14, borderBottom: true, borderRight: true },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute',
            ...pos as any,
            width: 22, height: 22,
            borderTop:    pos.borderTop    ? '1.5px solid #d8a016' : 'none',
            borderBottom: pos.borderBottom ? '1.5px solid #d8a016' : 'none',
            borderLeft:   pos.borderLeft   ? '1.5px solid #d8a016' : 'none',
            borderRight:  pos.borderRight  ? '1.5px solid #d8a016' : 'none',
            opacity: show ? 1 : 0,
            transform: show ? 'scale(1)' : 'scale(0.7)',
            transition: `all 0.35s ease ${0.1 + i * 0.06}s`,
          }} />
        ))}

        {/* Logo card */}
        <div style={{
          width: 196, height: 84,
          background: '#ffffff',
          borderRadius: 12,
          padding: '11px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: show ? 'glow-gold 3s ease-in-out infinite' : 'none',
        }}>
          <img src="/amw-logo.png" alt="AMW" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>

        {/* Bottom accent line on logo */}
        <div style={{
          position: 'absolute', bottom: -6, left: '10%', right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(216,160,22,0.8), transparent)',
          opacity: show ? 1 : 0,
          transition: 'opacity 0.4s ease 0.5s',
        }} />
      </div>

      {/* ── Typewriter title ───────────────────────────────────────── */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
        fontWeight: 900,
        letterSpacing: '0.32em',
        color: '#d8a016',
        textShadow: '0 0 24px rgba(216,160,22,0.55)',
        minHeight: '2.5rem',
        display: 'flex', alignItems: 'center',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease 0.3s',
      }}>
        {TITLE.slice(0, chars)}
        {chars < TITLE.length && (
          <span style={{ animation: 'cursor-blink 0.7s ease infinite', marginLeft: 3, color: '#d8a016' }}>_</span>
        )}
      </div>

      {/* ── Thin gold separator ────────────────────────────────────── */}
      <div style={{
        width: 260, height: 1, margin: '14px 0',
        background: 'linear-gradient(90deg, transparent, rgba(216,160,22,0.5), rgba(10,110,209,0.5), transparent)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.5s ease 0.7s',
      }} />

      {/* ── Tagline ────────────────────────────────────────────────── */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.68rem', fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'rgba(129,196,255,0.75)',
        marginBottom: 28,
        opacity: show ? 1 : 0,
        transition: 'opacity 0.4s ease 0.9s',
      }}>
        performance-evaluation-form · v0.1.0
      </p>

      {/* ── Progress bar ───────────────────────────────────────────── */}
      <div style={{
        width: 260,
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease 1.0s',
      }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', borderRadius: 999,
            width: `${pct}%`,
            background: 'linear-gradient(90deg, rgba(216,160,22,0.6), #d8a016 60%, #f9ce5c)',
            boxShadow: '0 0 10px rgba(216,160,22,0.7)',
            transition: 'width 0.12s linear',
            position: 'relative',
          }}>
            {/* Shimmer */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease infinite' }} />
          </div>
        </div>

        {/* Boot labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
            {BOOT_SEQ[bootIdx].startsWith('[  OK  ]') ? (
              <>
                <span style={{ color: '#22c55e' }}>[  OK  ]</span>
                <span style={{ color: ready ? '#22c55e' : 'rgba(168,183,204,0.65)', transition: 'color 0.3s ease' }}>
                  {BOOT_SEQ[bootIdx].slice(8)}
                </span>
              </>
            ) : (
              <>
                <span style={{ color: 'rgba(216,160,22,0.7)' }}>[ .... ]</span>
                <span style={{ color: 'rgba(168,183,204,0.65)' }}>{BOOT_SEQ[bootIdx].slice(8)}</span>
              </>
            )}
          </span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.6rem',
            color: 'rgba(216,160,22,0.5)',
          }}>
            {pct.toString().padStart(3, '0')}%
          </span>
        </div>
      </div>

      {/* ── Version badge ──────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: show ? 0.4 : 0,
        transition: 'opacity 0.4s ease 1.2s',
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#d8a016' }} />
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', letterSpacing: '0.08em', color: 'rgba(168,183,204,0.5)' }}>
          root@amw-command:~<span style={{ color: '#22c55e' }}>$</span> _
        </span>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#d8a016' }} />
      </div>

      <style>{`
        @keyframes scan-sweep {
          from { top: -2px; opacity: 1; }
          80%  { opacity: 1; }
          to   { top: 100%; opacity: 0; }
        }
        @keyframes glow-gold {
          0%,100% { box-shadow: 0 0 36px rgba(216,160,22,0.22), 0 0 72px rgba(216,160,22,0.08), 0 18px 48px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 0 56px rgba(216,160,22,0.38), 0 0 100px rgba(216,160,22,0.16), 0 18px 48px rgba(0,0,0,0.6); }
        }
        @keyframes cursor-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position:  200% center; }
        }
      `}</style>
    </div>
  )
}
