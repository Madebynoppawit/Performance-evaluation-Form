import { useEffect, useState } from 'react'

const TITLE = 'AMW  COMMAND'
const PHASES = ['IGNITION', 'LAUNCH CONTROL', 'THROTTLE : ENGAGED']

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [step,     setStep]     = useState(0)   // animation step
  const [chars,    setChars]    = useState(0)   // typewriter
  const [progress, setProgress] = useState(0)  // 0-100
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [fadeOut,  setFadeOut]  = useState(false)

  useEffect(() => {
    const ts = [
      setTimeout(() => setStep(1),        180),   // logo in
      setTimeout(() => setStep(2),        600),   // title
      setTimeout(() => setStep(3),       1000),   // progress start
      setTimeout(() => setPhaseIdx(1),   1400),
      setTimeout(() => setPhaseIdx(2),   1900),
      setTimeout(() => setStep(4),       2100),   // final hold
      setTimeout(() => setFadeOut(true), 2500),
      setTimeout(onDone,                 3100),
    ]
    return () => ts.forEach(clearTimeout)
  }, [onDone])

  useEffect(() => {
    if (step < 2 || chars >= TITLE.length) return
    const t = setTimeout(() => setChars(c => c + 1), 54)
    return () => clearTimeout(t)
  }, [step, chars])

  useEffect(() => {
    if (step < 3 || progress >= 100) return
    const t = setTimeout(() => setProgress(p => Math.min(p + 1.5, 100)), 12)
    return () => clearTimeout(t)
  }, [step, progress])

  const pct = Math.round(progress)
  /* RPM arc: semicircle r=88, circumference ≈ 276 */
  const arcLen = 276
  const arcOffset = arcLen - (pct / 100) * arcLen

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      overflow: 'hidden',
      background: '#060606',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
      pointerEvents: fadeOut ? 'none' : 'all',
    }}>

      {/* ── Carbon fiber weave ─────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'repeating-linear-gradient(45deg,  rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 7px)',
          'repeating-linear-gradient(-45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 7px)',
        ].join(','),
      }} />

      {/* ── French tricolor stripe (top) ───────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 2, background: '#0032a0', opacity: step >= 1 ? 0.85 : 0, transition: 'opacity 0.5s ease 0.2s' }} />
        <div style={{ height: 2, background: '#f0f0f0', opacity: step >= 1 ? 0.5  : 0, transition: 'opacity 0.5s ease 0.3s' }} />
        <div style={{ height: 2, background: '#e10600', opacity: step >= 1 ? 0.9  : 0, transition: 'opacity 0.5s ease 0.4s' }} />
      </div>

      {/* ── Speed lines (blast on load) ────────────────────────────── */}
      <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, #e10600 40%, #ff4444 50%, #e10600 60%, transparent 100%)', opacity: step === 1 ? 1 : 0, transition: 'opacity 0.4s ease', animation: step === 1 ? 'speed-blast 0.45s ease-out forwards' : 'none' }} />
      <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, #e10600 40%, #ff4444 50%, #e10600 60%, transparent 100%)', opacity: step === 1 ? 1 : 0, transition: 'opacity 0.4s ease', animation: step === 1 ? 'speed-blast 0.45s ease-out 0.06s forwards' : 'none' }} />

      {/* ── Ambient red glow center ─────────────────────────────────── */}
      <div style={{ position: 'absolute', width: 600, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(225,6,0,0.07), transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', filter: 'blur(30px)', pointerEvents: 'none', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.6s ease' }} />

      {/* ── Logo + angular frame ────────────────────────────────────── */}
      <div style={{
        position: 'relative', marginBottom: 28,
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        {/* Angular corner marks (sharper than before — F1 style) */}
        {[
          { top: -10, left: -10 },
          { top: -10, right: -10 },
          { bottom: -10, left: -10 },
          { bottom: -10, right: -10 },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: 16, height: 16,
            borderTop:    i < 2  ? '2px solid #e10600' : 'none',
            borderBottom: i >= 2 ? '2px solid #e10600' : 'none',
            borderLeft:   i % 2 === 0 ? '2px solid #e10600' : 'none',
            borderRight:  i % 2 === 1 ? '2px solid #e10600' : 'none',
            opacity: step >= 1 ? 1 : 0,
            transition: `opacity 0.3s ease ${0.1 + i * 0.05}s`,
          }} />
        ))}

        {/* Red side accent bars */}
        <div style={{ position: 'absolute', left: -20, top: '15%', width: 3, height: '70%', background: 'linear-gradient(to bottom, transparent, #e10600, transparent)', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s ease 0.3s' }} />
        <div style={{ position: 'absolute', right: -20, top: '15%', width: 3, height: '70%', background: 'linear-gradient(to bottom, transparent, #e10600, transparent)', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s ease 0.3s' }} />

        {/* Logo card — brushed chrome feel */}
        <div style={{
          width: 192, height: 80,
          background: 'linear-gradient(160deg, #ffffff 0%, #f0f0f0 100%)',
          borderRadius: 4,
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(225,6,0,0.25), 0 0 80px rgba(225,6,0,0.1), 0 2px 0 rgba(255,255,255,0.9) inset, 0 20px 50px rgba(0,0,0,0.7)',
          animation: step >= 1 ? 'red-glow-pulse 2.8s ease infinite' : 'none',
        }}>
          <img src="/amw-logo.png" alt="AMW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>

      {/* ── Typewriter title ─────────────────────────────────────────── */}
      <div style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: 'clamp(1.4rem, 3vw, 2rem)',
        fontWeight: 800,
        letterSpacing: '0.38em',
        color: '#ececec',
        textShadow: '0 0 30px rgba(225,6,0,0.35)',
        minHeight: '2.4rem',
        display: 'flex', alignItems: 'center',
        opacity: step >= 2 ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {TITLE.slice(0, chars)}
        {chars < TITLE.length && step >= 2 && (
          <span style={{ animation: 'cursor-blink 0.6s ease infinite', marginLeft: 3, color: '#e10600' }}>|</span>
        )}
      </div>

      {/* ── Red separator ──────────────────────────────────────────── */}
      <div style={{
        width: step >= 2 ? 300 : 0,
        height: 1,
        margin: '12px 0',
        background: 'linear-gradient(90deg, transparent, #e10600 30%, #c9a84c 50%, #e10600 70%, transparent)',
        boxShadow: '0 0 8px rgba(225,6,0,0.5)',
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1) 0.4s',
      }} />

      {/* ── Tagline ────────────────────────────────────────────────── */}
      <p style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: '0.68rem', fontWeight: 500,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(201,168,76,0.8)',
        marginBottom: 28, marginTop: 4,
        opacity: step >= 2 ? 1 : 0,
        transition: 'opacity 0.5s ease 0.6s',
      }}>
        Engineered for Performance · Paris · Monaco
      </p>

      {/* ── RPM arc (SVG) ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: 200, height: 100, opacity: step >= 3 ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <svg width="200" height="100" viewBox="0 0 200 100" style={{ overflow: 'visible' }}>
          {/* Track */}
          <path d="M 10,95 A 90,90 0 0,1 190,95" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
          {/* Fill — red to gold */}
          <path d="M 10,95 A 90,90 0 0,1 190,95" fill="none"
            stroke="url(#rpmGrad)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${arcLen}`}
            strokeDashoffset={arcOffset}
            style={{ transition: 'stroke-dashoffset 0.12s linear' }}
          />
          {/* Tick marks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const angle = -180 + i * 18
            const rad   = (angle * Math.PI) / 180
            const cx    = 100 + 90 * Math.cos(rad)
            const cy    = 95  + 90 * Math.sin(rad)
            const cx2   = 100 + 82 * Math.cos(rad)
            const cy2   = 95  + 82 * Math.sin(rad)
            return <line key={i} x1={cx} y1={cy} x2={cx2} y2={cy2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          })}
          <defs>
            <linearGradient id="rpmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#e10600" />
              <stop offset="60%"  stopColor="#e10600" />
              <stop offset="100%" stopColor="#c9a84c" />
            </linearGradient>
          </defs>
        </svg>

        {/* Percentage readout */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem', fontWeight: 900, color: '#ececec', letterSpacing: '0.06em' }}>
            {pct}<span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>%</span>
          </span>
        </div>
      </div>

      {/* ── Phase status ───────────────────────────────────────────── */}
      <div style={{
        marginTop: 16,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.62rem', letterSpacing: '0.14em',
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: step >= 3 ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: phaseIdx === 2 ? '#22c55e' : phaseIdx === 1 ? '#f59e0b' : '#e10600',
          boxShadow: phaseIdx === 2 ? '0 0 8px #22c55e' : phaseIdx === 1 ? '0 0 8px #f59e0b' : '0 0 8px #e10600',
          transition: 'all 0.3s ease',
          animation: 'dot-pulse 1s ease infinite',
        }} />
        <span style={{ color: phaseIdx === 2 ? '#22c55e' : 'rgba(236,236,236,0.65)', transition: 'color 0.3s ease' }}>
          {PHASES[phaseIdx]}
        </span>
      </div>

      {/* ── Bottom rule + location ──────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        opacity: step >= 1 ? 1 : 0,
        transition: 'opacity 0.5s ease 0.8s',
      }}>
        {/* Tricolor bottom (reversed: red-white-blue) */}
        <div style={{ height: 2, background: '#e10600', opacity: 0.9 }} />
        <div style={{ height: 2, background: '#f0f0f0', opacity: 0.5 }} />
        <div style={{ height: 2, background: '#0032a0', opacity: 0.85 }} />
      </div>

      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 10,
        opacity: step >= 2 ? 0.45 : 0,
        transition: 'opacity 0.4s ease 1.2s',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.14em', color: 'rgba(201,168,76,0.9)' }}>
          AMW PERFORMANCE  ·  v0.1.0  ·  GRAND PRIX EDITION
        </span>
      </div>

      <style>{`
        @keyframes speed-blast {
          0%   { clip-path: inset(0 100% 0 0); opacity: 1; }
          60%  { clip-path: inset(0 0% 0 0);   opacity: 1; }
          100% { clip-path: inset(0 0% 0 0);   opacity: 0; }
        }
        @keyframes red-glow-pulse {
          0%,100% { box-shadow: 0 0 32px rgba(225,6,0,0.2),  0 0 64px rgba(225,6,0,0.08),  0 20px 50px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 52px rgba(225,6,0,0.36), 0 0 100px rgba(225,6,0,0.16), 0 20px 50px rgba(0,0,0,0.7); }
        }
        @keyframes cursor-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes dot-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
