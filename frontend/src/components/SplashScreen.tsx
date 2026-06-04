import { useEffect, useRef, useState } from 'react'

/* ── Boot log content ───────────────────────────────────────────────────── */
const LOG: { t: string; msg: string; type: 'kern'|'info'|'amw'|'ok'|'blank'|'title'|'login' }[] = [
  { t:'[    0.000000]', msg:'Booting AMW Command v0.1.0-gpe (Grand Prix Edition)', type:'kern' },
  { t:'[    0.001423]', msg:'BIOS: UEFI 2.80 · Atelier AMW · Signed-off: Paris', type:'info' },
  { t:'[    0.018234]', msg:'CPU: AMW Octacore Performance @ 4.200GHz, 32T', type:'info' },
  { t:'[    0.034512]', msg:'Memory: 65536MB DDR5-6800 ECC · Registered', type:'info' },
  { t:'[    0.089234]', msg:'PCIe: Performance bridge · 128GT/s · Online', type:'info' },
  { t:'[    0.145678]', msg:'ACPI: Performance states initialized (P0–P8)', type:'info' },
  { t:'[    0.234567]', msg:'NET: Protocol family 2 (TCP/IP) · Registered', type:'info' },
  { t:'[    0.389012]', msg:'KERNEL: amw-gpe 6.1.0 #1 SMP Fri Jun 4 2026', type:'kern' },
  { t:'[    0.456789]', msg:'Mounting performance filesystems...', type:'info' },
  { t:'[    0.567890]', msg:'DB: PostgreSQL 16 · pool 32/32 · Latency 0.4ms', type:'info' },
  { t:'[    0.678901]', msg:'AUTH: RBAC engine loaded · 3 roles registered', type:'info' },
  { t:'[    0.789012]', msg:'JWT: RS256 · Expiry 7d · Rotation enabled', type:'info' },
  { t:'[    0.890123]', msg:'', type:'blank' },
  { t:'[    1.001234]', msg:'AMW/ENGINE: Initializing evaluation core v3.1...', type:'amw' },
  { t:'[    1.112345]', msg:'AMW/ENGINE: Weighted scoring algorithm · Loaded', type:'amw' },
  { t:'[    1.223456]', msg:'AMW/ENGINE: Competency matrix · 5 levels · OK', type:'amw' },
  { t:'[    1.334567]', msg:'AMW/ENGINE: Goal-setting module · Calibrated', type:'amw' },
  { t:'[    1.445678]', msg:'AMW/ENGINE: Attendance tracker · Synchronized', type:'amw' },
  { t:'[    1.556789]', msg:'AMW/THROTTLE: Evaluation response curves · Sport', type:'amw' },
  { t:'[    1.667890]', msg:'AMW/ECU: Grand Prix mode · UNLOCKED', type:'amw' },
  { t:'[    1.778901]', msg:'AMW/AERO: Carbon fibre dashboard · Initialized', type:'amw' },
  { t:'[    1.889012]', msg:'AMW/TELEM: Pit wall uplink · Paris HQ · Active', type:'amw' },
  { t:'[    2.000123]', msg:'AMW/GEAR: 8-speed DCT shift logic · Online', type:'amw' },
  { t:'[    2.111234]', msg:'AMW/HUD: Heads-up display · Calibrated', type:'amw' },
  { t:'[    2.222345]', msg:'', type:'blank' },
  { t:'[    2.333456]', msg:'EVAL: Review workflow manager · Operational', type:'info' },
  { t:'[    2.444567]', msg:'CYCLE: Period scheduler · 360° mode ready', type:'info' },
  { t:'[    2.555678]', msg:'TEMPLATE: Form builder engine · 14 routes', type:'info' },
  { t:'[    2.666789]', msg:'REPORT: Analytics module · Recharts v2.10', type:'info' },
  { t:'[    2.777890]', msg:'API: REST endpoints mounted (14 routes active)', type:'info' },
  { t:'[    2.888901]', msg:'CACHE: Hot data preloaded · 2048 entries', type:'info' },
  { t:'[    2.999012]', msg:'SECURITY: Rate limiter 20req/15min · Armed', type:'info' },
  { t:'[    3.100123]', msg:'SECURITY: ErrorBoundary · React crash guard OK', type:'info' },
  { t:'[    3.211234]', msg:'', type:'blank' },
  { t:'[    3.322345]', msg:'[  OK  ] Started AMW Performance Engine', type:'ok' },
  { t:'[    3.433456]', msg:'[  OK  ] Started Authentication Service', type:'ok' },
  { t:'[    3.544567]', msg:'[  OK  ] Started Evaluation Runtime', type:'ok' },
  { t:'[    3.655678]', msg:'[  OK  ] Started Report Analytics', type:'ok' },
  { t:'[    3.766789]', msg:'[  OK  ] Reached target Grand Prix Ready', type:'ok' },
  { t:'[    3.877890]', msg:'', type:'blank' },
  { t:'[    3.988901]', msg:'AMW Command v0.1.0 · Grand Prix Edition', type:'title' },
  { t:'[    4.000000]', msg:'Atelier AMW · Paris · Monaco · Le Mans', type:'title' },
  { t:'            ', msg:'', type:'blank' },
  { t:'amw login:', msg:' ', type:'login' },
]

const TITLE = 'AMW  COMMAND'
const F1_PHASES = ['IGNITION', 'LAUNCH CONTROL', 'THROTTLE : ENGAGED']

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  /* ── Phase 1: F1 splash ─── */
  const [step,     setStep]     = useState(0)
  const [chars,    setChars]    = useState(0)
  const [progress, setProgress] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)

  /* ── Phase 2: terminal ─── */
  const [showTerm, setShowTerm] = useState(false)
  const [logLines, setLogLines] = useState<typeof LOG>([])
  const [fadeOut,  setFadeOut]  = useState(false)
  const termRef = useRef<HTMLDivElement>(null)

  /* Main timeline — 30 s total */
  useEffect(() => {
    /* Phase 1 animation steps */
    const ts = [
      setTimeout(() => setStep(1),        180),
      setTimeout(() => setStep(2),        600),
      setTimeout(() => setStep(3),       1000),
      setTimeout(() => setPhaseIdx(1),   1400),
      setTimeout(() => setPhaseIdx(2),   1900),
      setTimeout(() => setStep(4),       2100),
    ]
    /* Transition to terminal at 3 s */
    const t_term = setTimeout(() => setShowTerm(true), 3000)

    /* Append log lines every 640 ms starting at 3 200 ms
       44 lines × 640 ms = 28 160 ms + 3 200 ms = 31 360 ms — trim back */
    const logTimers = LOG.map((line, i) =>
      setTimeout(() => setLogLines(prev => [...prev, line]), 3200 + i * 630)
    )

    /* Fade + done at 30 s */
    const t_fade = setTimeout(() => setFadeOut(true), 29000)
    const t_done = setTimeout(onDone,                 30000)

    return () => {
      [...ts, t_term, t_fade, t_done, ...logTimers].forEach(clearTimeout)
    }
  }, [onDone])

  /* Typewriter */
  useEffect(() => {
    if (step < 2 || chars >= TITLE.length) return
    const t = setTimeout(() => setChars(c => c + 1), 54)
    return () => clearTimeout(t)
  }, [step, chars])

  /* Progress */
  useEffect(() => {
    if (step < 3 || progress >= 100) return
    const t = setTimeout(() => setProgress(p => Math.min(p + 1.5, 100)), 12)
    return () => clearTimeout(t)
  }, [step, progress])

  /* Auto-scroll terminal */
  useEffect(() => {
    if (termRef.current)
      termRef.current.scrollTop = termRef.current.scrollHeight
  }, [logLines])

  const pct    = Math.round(progress)
  const arcLen = 276
  const arcOff = arcLen - (pct / 100) * arcLen

  /* ─────────────────────────────────────────────────────────────────── */
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

      {/* Carbon fiber */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage: [
          'repeating-linear-gradient(45deg,  rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 7px)',
          'repeating-linear-gradient(-45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 7px)',
        ].join(','),
      }} />

      {/* Tricolor top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', flexDirection:'column', opacity: step >= 1 ? 1 : 0, transition:'opacity 0.5s ease 0.2s' }}>
        <div style={{ height:2, background:'#0032a0', opacity:0.85 }} />
        <div style={{ height:2, background:'#f0f0f0', opacity:0.5  }} />
        <div style={{ height:2, background:'#e10600', opacity:0.9  }} />
      </div>

      {/* Speed lines */}
      {step === 1 && <>
        <div style={{ position:'absolute', top:'38%', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#e10600,#ff4444,#e10600,transparent)', animation:'speed-blast 0.45s ease-out forwards' }} />
        <div style={{ position:'absolute', top:'62%', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#e10600,#ff4444,#e10600,transparent)', animation:'speed-blast 0.45s ease-out 0.06s forwards' }} />
      </>}

      {/* Ambient glow */}
      <div style={{ position:'absolute', width:600, height:300, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(225,6,0,0.07), transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', filter:'blur(30px)', pointerEvents:'none', opacity: step >= 1 ? 1 : 0, transition:'opacity 0.6s ease' }} />

      {/* ── PHASE 1: F1 visual (opacity fades when terminal shows) ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: showTerm ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: showTerm ? 'none' : 'all',
        position: showTerm ? 'absolute' : 'relative',
      }}>
        {/* Logo + HUD */}
        <div style={{ position:'relative', marginBottom:28, opacity: step>=1?1:0, transform: step>=1?'translateY(0)':'translateY(-20px)', transition:'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.2,0.64,1)' }}>
          {[
            { top:-10, left:-10 }, { top:-10, right:-10 },
            { bottom:-10, left:-10 }, { bottom:-10, right:-10 },
          ].map((pos,i) => (
            <div key={i} style={{
              position:'absolute', ...pos, width:16, height:16,
              borderTop:    i<2  ? '2px solid #e10600' : 'none',
              borderBottom: i>=2 ? '2px solid #e10600' : 'none',
              borderLeft:   i%2===0 ? '2px solid #e10600' : 'none',
              borderRight:  i%2===1 ? '2px solid #e10600' : 'none',
              opacity: step>=1?1:0, transition:`opacity 0.3s ease ${0.1+i*0.05}s`,
            }} />
          ))}
          <div style={{ position:'absolute', left:-20, top:'15%', width:3, height:'70%', background:'linear-gradient(to bottom,transparent,#e10600,transparent)', opacity:step>=1?1:0, transition:'opacity 0.4s ease 0.3s' }} />
          <div style={{ position:'absolute', right:-20, top:'15%', width:3, height:'70%', background:'linear-gradient(to bottom,transparent,#e10600,transparent)', opacity:step>=1?1:0, transition:'opacity 0.4s ease 0.3s' }} />
          <div style={{ width:192, height:80, background:'linear-gradient(160deg,#ffffff,#f0f0f0)', borderRadius:4, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'center', animation:step>=1?'red-glow-pulse 2.8s ease infinite':'none', boxShadow:'0 0 40px rgba(225,6,0,0.25),0 0 80px rgba(225,6,0,0.1),0 2px 0 rgba(255,255,255,0.9) inset,0 20px 50px rgba(0,0,0,0.7)' }}>
            <img src="/amw-logo.png" alt="AMW" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
        </div>

        <div style={{ fontFamily:'"Inter",sans-serif', fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:800, letterSpacing:'0.38em', color:'#ececec', textShadow:'0 0 30px rgba(225,6,0,0.35)', minHeight:'2.4rem', display:'flex', alignItems:'center', opacity:step>=2?1:0, transition:'opacity 0.4s ease' }}>
          {TITLE.slice(0, chars)}
          {chars < TITLE.length && step >= 2 && <span style={{ animation:'cursor-blink 0.6s ease infinite', marginLeft:3, color:'#e10600' }}>|</span>}
        </div>

        <div style={{ width:step>=2?300:0, height:1, margin:'12px 0', background:'linear-gradient(90deg,transparent,#e10600 30%,#c9a84c 50%,#e10600 70%,transparent)', boxShadow:'0 0 8px rgba(225,6,0,0.5)', transition:'width 0.6s cubic-bezier(0.4,0,0.2,1) 0.4s' }} />

        <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', fontWeight:500, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(201,168,76,0.8)', marginBottom:28, marginTop:4, opacity:step>=2?1:0, transition:'opacity 0.5s ease 0.6s' }}>
          Engineered for Performance · Paris · Monaco
        </p>

        <div style={{ position:'relative', width:200, height:100, opacity:step>=3?1:0, transition:'opacity 0.4s ease' }}>
          <svg width="200" height="100" viewBox="0 0 200 100" style={{ overflow:'visible' }}>
            <path d="M 10,95 A 90,90 0 0,1 190,95" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
            <path d="M 10,95 A 90,90 0 0,1 190,95" fill="none" stroke="url(#rpmGrad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${arcLen}`} strokeDashoffset={arcOff} style={{ transition:'stroke-dashoffset 0.12s linear' }} />
            {Array.from({length:11}).map((_,i) => {
              const a = (-180 + i*18) * Math.PI / 180
              return <line key={i} x1={100+90*Math.cos(a)} y1={95+90*Math.sin(a)} x2={100+82*Math.cos(a)} y2={95+82*Math.sin(a)} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            })}
            <defs>
              <linearGradient id="rpmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#e10600" />
                <stop offset="60%"  stopColor="#e10600" />
                <stop offset="100%" stopColor="#c9a84c" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
            <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'1.1rem', fontWeight:900, color:'#ececec', letterSpacing:'0.06em' }}>
              {pct}<span style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.4)', marginLeft:2 }}>%</span>
            </span>
          </div>
        </div>

        <div style={{ marginTop:16, fontFamily:'"JetBrains Mono",monospace', fontSize:'0.62rem', letterSpacing:'0.14em', display:'flex', alignItems:'center', gap:8, opacity:step>=3?1:0, transition:'opacity 0.3s ease' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:phaseIdx===2?'#22c55e':phaseIdx===1?'#f59e0b':'#e10600', boxShadow:phaseIdx===2?'0 0 8px #22c55e':phaseIdx===1?'0 0 8px #f59e0b':'0 0 8px #e10600', transition:'all 0.3s ease', animation:'dot-pulse 1s ease infinite' }} />
          <span style={{ color:phaseIdx===2?'#22c55e':'rgba(236,236,236,0.65)', transition:'color 0.3s ease' }}>{F1_PHASES[phaseIdx]}</span>
        </div>
      </div>

      {/* ── PHASE 2: Terminal boot log ────────────────────────────── */}
      <div style={{
        position: showTerm ? 'relative' : 'absolute',
        opacity: showTerm ? 1 : 0,
        transition: 'opacity 0.7s ease',
        width: '100%', maxWidth: 820,
        padding: '0 24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Terminal title bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', gap:6 }}>
            {['#e10600','#f59e0b','#22c55e'].map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.8 }} />)}
          </div>
          <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.65rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em' }}>
            amw-command — boot log · Grand Prix Edition
          </span>
        </div>

        {/* Scrolling log */}
        <div ref={termRef} style={{ maxHeight:'70vh', overflowY:'auto', scrollbarWidth:'none' }}>
          {logLines.map((line, i) => {
            const isLast  = i === logLines.length - 1
            const opacity = 0.35 + (i / Math.max(logLines.length - 1, 1)) * 0.65

            let tColor   = 'rgba(74,222,128,0.35)'
            let msgColor = 'rgba(74,222,128,0.75)'

            if (line.type === 'ok')    { tColor = 'rgba(74,222,128,0.35)'; msgColor = '#22c55e' }
            if (line.type === 'amw')   { tColor = 'rgba(201,168,76,0.35)'; msgColor = 'rgba(201,168,76,0.9)' }
            if (line.type === 'kern')  { tColor = 'rgba(255,255,255,0.25)'; msgColor = 'rgba(255,255,255,0.65)' }
            if (line.type === 'title') { tColor = 'rgba(201,168,76,0.4)';  msgColor = '#f5f5f5' }
            if (line.type === 'login') { tColor = 'rgba(255,255,255,0.5)'; msgColor = '#ffffff' }
            if (line.type === 'blank') return <div key={i} style={{ height:'0.9rem' }} />

            return (
              <div key={i} style={{ display:'flex', gap:14, lineHeight:'1.75', opacity }}>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.68rem', color:tColor, flexShrink:0, userSelect:'none' }}>
                  {line.t}
                </span>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.68rem', color:msgColor }}>
                  {line.msg}
                  {isLast && line.type === 'login' && (
                    <span style={{ animation:'cursor-blink 0.8s ease infinite', color:'#22c55e' }}>█</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tricolor bottom */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', flexDirection:'column', opacity:step>=1?1:0, transition:'opacity 0.5s ease 0.8s' }}>
        <div style={{ height:2, background:'#e10600', opacity:0.9 }} />
        <div style={{ height:2, background:'#f0f0f0', opacity:0.5 }} />
        <div style={{ height:2, background:'#0032a0', opacity:0.85 }} />
      </div>

      <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', opacity:step>=2?0.4:0, transition:'opacity 0.4s ease 1.2s', whiteSpace:'nowrap' }}>
        <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.55rem', letterSpacing:'0.14em', color:'rgba(201,168,76,0.9)' }}>
          AMW PERFORMANCE  ·  v0.1.0  ·  GRAND PRIX EDITION
        </span>
      </div>

      <style>{`
        @keyframes speed-blast {
          0%   { clip-path: inset(0 100% 0 0); opacity:1; }
          60%  { clip-path: inset(0 0% 0 0);   opacity:1; }
          100% { clip-path: inset(0 0% 0 0);   opacity:0; }
        }
        @keyframes red-glow-pulse {
          0%,100% { box-shadow: 0 0 32px rgba(225,6,0,0.2),  0 0 64px rgba(225,6,0,0.08),  0 20px 50px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 52px rgba(225,6,0,0.36), 0 0 100px rgba(225,6,0,0.16), 0 20px 50px rgba(0,0,0,0.7); }
        }
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dot-pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  )
}
