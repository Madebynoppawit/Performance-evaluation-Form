import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 700)
    const t2 = setTimeout(() => setPhase('out'),  1900)
    const t3 = setTimeout(onDone,                 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000000',
      opacity:    phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
      pointerEvents: phase === 'out' ? 'none' : 'all',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 80%)',
      }} />

      {/* Ambient orbs */}
      <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,209,0.12), transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', filter: 'blur(40px)', pointerEvents: 'none', animation: 'splash-orb 3s ease infinite' }} />
      <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(231,34,46,0.08), transparent 70%)', bottom: '20%', right: '22%', filter: 'blur(40px)', pointerEvents: 'none', animation: 'splash-orb 4s ease 1s infinite' }} />

      {/* Brand line top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, transparent, #81c4ff, #0a6ed1, #ed1c24, transparent)',
        opacity: phase === 'in' ? 0 : 1,
        transition: 'opacity 0.5s ease 0.5s',
      }} />

      {/* Main content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        position: 'relative', zIndex: 1,
        animation: 'splash-logo-in 0.75s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* Logo card */}
        <div style={{
          width: 180, height: 78,
          background: '#ffffff',
          borderRadius: 18,
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 48px rgba(10,110,209,0.35), 0 0 96px rgba(10,110,209,0.18), 0 24px 60px rgba(0,0,0,0.5)',
          animation: 'splash-glow 2.5s ease infinite',
        }}>
          <img
            src="/amw-logo.png"
            alt="AMW"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Text group */}
        <div style={{
          textAlign: 'center',
          animation: 'splash-text-in 0.5s ease 0.35s both',
        }}>
          <p style={{
            fontSize: '0.68rem', fontWeight: 900,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--sap-blue)', marginBottom: 10,
          }}>
            Performance Intelligence Suite
          </p>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 950,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #81c4ff 0%, #0a6ed1 42%, #16588e 70%, #e7222e 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'splash-gradient-shift 3s ease infinite',
          }}>
            AMW Command
          </h1>
        </div>

        {/* Loading dots */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          animation: 'splash-text-in 0.4s ease 0.65s both',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--sap-blue)',
              boxShadow: '0 0 8px rgba(10,110,209,0.8)',
              animation: `splash-dot 1.3s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Brand line bottom */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: phase === 'in' ? 0 : 0.45,
        transition: 'opacity 0.5s ease 0.8s',
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(168,183,204,0.7)', textTransform: 'uppercase' }}>
          v0.1.0
        </span>
      </div>

      <style>{`
        @keyframes splash-logo-in {
          from { opacity: 0; transform: scale(0.82) translateY(18px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes splash-text-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-glow {
          0%,100% { box-shadow: 0 0 40px rgba(10,110,209,0.32), 0 0 80px rgba(10,110,209,0.14), 0 24px 60px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 64px rgba(10,110,209,0.52), 0 0 120px rgba(10,110,209,0.24), 0 24px 60px rgba(0,0,0,0.5); }
        }
        @keyframes splash-dot {
          0%,100% { transform: scale(1);    opacity: 0.35; }
          50%      { transform: scale(1.5);  opacity: 1; }
        }
        @keyframes splash-orb {
          0%,100% { transform: translate(-50%,-50%) scale(1); }
          50%      { transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes splash-gradient-shift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
