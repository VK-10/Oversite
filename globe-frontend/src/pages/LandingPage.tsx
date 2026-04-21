import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

// =============================================================
// COMPONENT ARCHITECTURE
// =============================================================
//
//  1. LOGIC  — useEffect: loads Three.js, builds the WebGL scene
//              (sphere, grid, dots, atmosphere, starfield),
//              owns the ResizeObserver and RAF animation loop.
//
//  2. UI     — Pure JSX: all layout, typography, copy, chips,
//              feature cards, stats, footer. Zero side-effects.
//
//  3. RENDER — <canvas ref={canvasRef}> and its parent
//              <div ref={parentRef}>. Three.js owns the canvas;
//              React only holds refs, never touches it directly.
//
// Responsive strategy
// -------------------
// >= 768px  (desktop): flex row  — copy left, globe right
// <  768px  (mobile):  flex col  — copy top, globe below
// Heading uses clamp() so font never wraps unexpectedly
// Floating chips hidden on mobile (too cramped)
// All spacing uses clamp() or CSS media queries
// Pulse rings use % dimensions so they scale with the globe div
// =============================================================

const LandingPage = () => {
  // ── RENDER refs ──────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // ── LOGIC: globe bootstrap ───────────────────────────────────
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => initGlobe()
    document.head.appendChild(script)

    let animId: number

    // ── LOGIC: Three.js scene setup ───────────────────────────
    function initGlobe() {
      const canvas = canvasRef.current
      const parent = parentRef.current
      if (!canvas || !parent) return

      const THREE = (window as any).THREE

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
      camera.position.z = 2.8

      const R = 1.0
      const globeGroup = new THREE.Group()
      scene.add(globeGroup)

      scene.add(new THREE.AmbientLight(0xffffff, 0.4))
      const sun = new THREE.DirectionalLight(0xe8f5e9, 0.9)
      sun.position.set(4, 3, 5)
      scene.add(sun)

      // Dark base sphere
      globeGroup.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(R * 0.998, 64, 64),
          new THREE.MeshStandardMaterial({ color: 0x05100a, metalness: 0.05, roughness: 0.95 })
        )
      )

      // Lat/lng grid lines
      const dim = new THREE.LineBasicMaterial({ color: 0xa5f3c9, transparent: true, opacity: 0.06 })
      const eq  = new THREE.LineBasicMaterial({ color: 0xa5f3c9, transparent: true, opacity: 0.18 })

      for (let lat = -80; lat <= 80; lat += 20) {
        const phi = THREE.MathUtils.degToRad(lat)
        const pts: any[] = []
        for (let i = 0; i <= 128; i++) {
          const l = (i / 128) * Math.PI * 2
          pts.push(new THREE.Vector3(R * Math.cos(phi) * Math.cos(l), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(l)))
        }
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? eq : dim))
      }
      for (let lng = 0; lng < 360; lng += 20) {
        const lam = THREE.MathUtils.degToRad(lng)
        const pts: any[] = []
        for (let i = 0; i <= 128; i++) {
          const p = (i / 128) * Math.PI * 2 - Math.PI
          pts.push(new THREE.Vector3(R * Math.cos(p) * Math.cos(lam), R * Math.sin(p), R * Math.cos(p) * Math.sin(lam)))
        }
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dim))
      }

      // Fibonacci dot cloud
      const n = 8000
      const pos = new Float32Array(n * 3)
      const vis = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const phi   = Math.acos(1 - 2 * (i + 0.5) / n)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        pos[i * 3]     = R * 1.001 * Math.sin(phi) * Math.cos(theta)
        pos[i * 3 + 1] = R * 1.001 * Math.cos(phi)
        pos[i * 3 + 2] = R * 1.001 * Math.sin(phi) * Math.sin(theta)
        vis[i] = Math.random() > 0.42 ? 1 : 0
      }
      const dotGeo = new THREE.BufferGeometry()
      dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      dotGeo.setAttribute('vis',      new THREE.BufferAttribute(vis, 1))
      globeGroup.add(
        new THREE.Points(
          dotGeo,
          new THREE.ShaderMaterial({
            vertexShader:   `attribute float vis;varying float vV;void main(){vV=vis;gl_PointSize=1.6;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
            fragmentShader: `varying float vV;void main(){if(vV<.5)discard;float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.647,.953,.788,.45-d);}`,
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
          })
        )
      )

      // Atmosphere glow layers
      const addAtmo = (r: number, col: number, c: number, p: number, side = THREE.BackSide) => {
        scene.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(r, 64, 64),
            new THREE.ShaderMaterial({
              vertexShader:   `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
              fragmentShader: `varying vec3 vN;uniform vec3 gc;uniform float co,po;void main(){float i=pow(co-dot(vN,vec3(0,0,1)),po);gl_FragColor=vec4(gc*i,i*0.7);}`,
              side,
              blending:    THREE.AdditiveBlending,
              transparent: true,
              depthWrite:  false,
              uniforms: { gc: { value: new THREE.Color(col) }, co: { value: c }, po: { value: p } },
            })
          )
        )
      }
      addAtmo(R * 1.2,  0x7dd3fc, 0.5, 4.5)
      addAtmo(R * 1.05, 0xa5f3c9, 0.38, 6.5)

      // Starfield
      const sp = new Float32Array(2000 * 3).map(() => (Math.random() - 0.5) * 80)
      const sg = new THREE.BufferGeometry()
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
      scene.add(
        new THREE.Points(sg, new THREE.PointsMaterial({
          color: 0xdde4f0, size: 0.05, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending,
        }))
      )

      // ── LOGIC: responsive resize ────────────────────────────
      const resize = () => {
        const w = parent.clientWidth
        const h = parent.clientHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(parent)

      // ── LOGIC: animation loop ───────────────────────────────
      const loop = () => {
        animId = requestAnimationFrame(loop)
        globeGroup.rotation.y += 0.0015
        renderer.render(scene, camera)
      }
      loop()

      return () => {
        cancelAnimationFrame(animId)
        ro.disconnect()
        renderer.dispose()
      }
    }

    return () => { cancelAnimationFrame(animId) }
  }, [])

  // ── UI + RENDER ───────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", background: '#070b10', color: '#f8fafc', minHeight: '100vh' }}>

      {/*
        Responsive CSS injected as a single <style> tag.
        Keeps breakpoint logic out of inline styles, which can't express @media.
        All custom class names are prefixed "os-" to avoid collisions.
      */}
      <style>{`
        .os-hero {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          min-height: 100vh;
          padding: 0 clamp(20px, 5vw, 52px);
          overflow: hidden;
        }

        /* UI: Copy column */
        .os-copy {
          flex: 0 0 clamp(280px, 44%, 520px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(48px, 8vh, 80px) clamp(0px, 2vw, 24px) clamp(48px, 8vh, 80px) 0;
          z-index: 10;
        }

        /* Fluid heading — never wraps at awkward sizes */
        .os-h1 {
          font-size: clamp(26px, 4.2vw, 52px);
          font-weight: 300;
          line-height: 1.14;
          letter-spacing: -0.04em;
          color: #f8fafc;
          margin: 0 0 20px;
          white-space: nowrap;
        }
        /* Allow wrap on very small screens only */
        @media (max-width: 400px) {
          .os-h1 { white-space: normal; }
        }

        /* RENDER: Globe container */
        .os-globe {
          flex: 1 1 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Ensure it always has height even before Three.js fires */
          min-height: 300px;
        }

        /* Pulse rings scale as % of container width */
        .os-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(165,243,201,0.07);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        /* Floating chips */
        .os-chip {
          position: absolute;
          z-index: 20;
          background: rgba(7,11,16,0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 11px;
          padding: 12px 14px;
          min-width: 130px;
          font-family: inherit;
        }

        /* Stats row */
        .os-stats { display: flex; gap: 0; }

        /* Features grid */
        .os-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .os-hero {
            flex-direction: column;
            min-height: auto;
            padding-top: 48px;
            padding-bottom: 0;
          }
          .os-copy {
            flex: none;
            padding: 0 0 28px;
          }
          .os-globe {
            width: 100%;
            height: 80vw;
            max-height: 380px;
            min-height: 240px;
          }
          /* Chips overlap the globe badly on mobile — hide them */
          .os-chip { display: none; }
          .os-features { grid-template-columns: 1fr; }
          .os-stats { flex-wrap: wrap; gap: 16px; }
          .os-stats > div {
            border-left: none !important;
            padding: 0 !important;
          }
        }

        /* ── Tablet ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .os-copy { flex: 0 0 clamp(280px, 46%, 400px); }
          .os-features { grid-template-columns: repeat(2, 1fr); }
          .os-chip { min-width: 110px; padding: 10px 12px; }
        }
      `}</style>

      {/* ── UI: Hero ── */}
      <section className="os-hero">

        {/* UI: Left copy column */}
        <div className="os-copy">

          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 11, fontWeight: 400, letterSpacing: '0.07em',
            color: '#a5f3c9', textTransform: 'uppercase', marginBottom: 22,
          }}>
            <span style={{ width: 18, height: 1, background: '#a5f3c9', opacity: 0.6, display: 'block', flexShrink: 0 }} />
            Global news intelligence
          </div>

          {/* Heading — all on one logical line, breaks after comma */}
          <h1 className="os-h1">
            The world's events,
            <br />
            <em style={{ fontStyle: 'normal', color: '#a5f3c9' }}>mapped</em>
            {' '}and{' '}
            <strong style={{ fontWeight: 500 }}>live</strong>
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: 'clamp(13px, 1.4vw, 15px)',
            lineHeight: 1.72,
            color: 'rgba(248,250,252,0.55)',
            margin: '0 0 36px',
            maxWidth: 390,
          }}>
            Click any country on the globe to surface curated news, regional signals, and geopolitical context — in seconds.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
            <Link to="/globe" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 500, color: '#070b10',
              background: '#a5f3c9', border: 'none', borderRadius: 9,
              padding: '13px 24px', textDecoration: 'none', fontFamily: 'inherit',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" />
                <path d="M7 1c-1.5 1.5-2.2 3-2.2 6s.7 4.5 2.2 6" />
                <path d="M7 1c1.5 1.5 2.2 3 2.2 6s-.7 4.5-2.2 6" />
                <path d="M1 7h12" />
              </svg>
              Explore the globe
            </Link>
            <a href="#features" style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 13.5, fontWeight: 400, color: 'rgba(248,250,252,0.55)',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 9, padding: '12px 20px', textDecoration: 'none', fontFamily: 'inherit',
            }}>See how it works</a>
          </div>

          {/* Stats */}
          <div className="os-stats">
            {([['195', 'Countries'], ['12k+', 'Sources'], ['Live', 'Updates']] as const).map(([num, label], i) => (
              <div key={label} style={{
                padding: i === 0 ? '0 28px 0 0' : '0 28px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', fontWeight: 300, letterSpacing: '-1px', lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RENDER: Globe mount target ──
            parentRef → ResizeObserver in LOGIC layer
            canvasRef → handed to Three.js WebGLRenderer, never touched by React */}
        <div ref={parentRef} className="os-globe">

          {/* UI: Pulse rings sized in % so they always fit the container */}
          {[55, 72, 90].map((pct, i) => (
            <div key={pct} className="os-ring" style={{
              width:  `${pct}%`,
              height: `${pct}%`,
              opacity: 1 - i * 0.3,
            }} />
          ))}

          {/* RENDER: Three.js renders into this canvas every frame */}
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

          {/* UI: Info chips (hidden on mobile) */}
          <div className="os-chip" style={{ top: '18%', right: '8%' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.3)', marginBottom: 5 }}>Trending now</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1 }}>India</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a5f3c9', marginTop: 4 }}>
              <span style={{ width: 5, height: 5, background: '#a5f3c9', borderRadius: '50%', flexShrink: 0 }} />
              42 new articles
            </div>
          </div>

          <div className="os-chip" style={{ bottom: '20%', right: '12%' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.3)', marginBottom: 5 }}>Latest signal</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1 }}>Brussels</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a5f3c9', marginTop: 4 }}>
              <span style={{ width: 5, height: 5, background: '#a5f3c9', borderRadius: '50%', flexShrink: 0 }} />
              Policy update · 4m ago
            </div>
          </div>
        </div>
      </section>

      {/* ── UI: Features ── */}
      <section id="features" style={{ padding: 'clamp(48px, 8vw, 90px) clamp(20px, 5vw, 52px) 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a5f3c9', marginBottom: 14 }}>Why OverSite</div>
          <h2 style={{ fontSize: 'clamp(20px, 2.8vw, 30px)', fontWeight: 300, letterSpacing: '-0.8px', color: '#f8fafc', lineHeight: 1.25, margin: '0 0 10px' }}>
            Intelligence at <strong style={{ fontWeight: 500 }}>geographic scale</strong>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.55)', lineHeight: 1.7, maxWidth: 420 }}>
            From breaking developments to slow-burn geopolitical shifts — OverSite connects you to what's happening, where it's happening.
          </p>
        </div>

        <div className="os-features">
          {[
            {
              icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#a5f3c9" strokeWidth="1.5"><circle cx="7.5" cy="7.5" r="6.5" /><path d="M7.5 1c-2 2-3 4-3 6.5s1 4.5 3 6.5M7.5 1c2 2 3 4 3 6.5s-1 4.5-3 6.5" /><path d="M1 7.5h13" /></svg>,
              title: 'Interactive 3D globe',
              desc: 'Rotate, zoom, and click any country for instant contextual news drawn from curated regional feeds.',
            },
            {
              icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#a5f3c9" strokeWidth="1.5"><path d="M2 4h11M2 7.5h7M2 11h9" /></svg>,
              title: 'Live RSS aggregation',
              desc: 'Thousands of trusted feeds across politics, finance, climate, and culture — refreshed continuously with no delay.',
            },
            {
              icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#a5f3c9" strokeWidth="1.5"><circle cx="7.5" cy="7.5" r="6" /><path d="M7.5 4.5v3.5l2.5 1.5" /></svg>,
              title: 'Temporal signals',
              desc: 'Track how narratives evolve. Surface emerging stories before they reach mainstream coverage.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 'clamp(16px, 2.5vw, 26px)', transition: 'border-color 0.2s, background 0.2s', cursor: 'default' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.13)'; el.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.04)' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(165,243,201,0.07)', border: '1px solid rgba(165,243,201,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc', marginBottom: 8, letterSpacing: '-0.2px' }}>{title}</div>
              <div style={{ fontSize: 13, color: 'rgba(248,250,252,0.45)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 36, marginTop: 56 }}>
          <div style={{ display: 'flex' }}>
            {['AK', 'RJ', 'MS', '+'].map((av, i) => (
              <div key={av} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '2px solid #070b10', marginLeft: i === 0 ? 0 : -8, fontSize: 11, fontWeight: 500, color: 'rgba(248,250,252,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{av}</div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.55)', lineHeight: 1.5, margin: 0 }}>
            Trusted by <strong style={{ color: '#f8fafc', fontWeight: 500 }}>2,400+ analysts</strong>, journalists, and researchers tracking global events in real time.
          </p>
        </div>
      </section>

      {/* ── UI: Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: `24px clamp(20px, 5vw, 52px)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)' }}>© 2026 OverSite</span>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {['Privacy', 'Terms', 'Docs', 'GitHub'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}

export default LandingPage