import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const LandingPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load Geist font
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap'
    document.head.appendChild(link)

    // Dynamically load Three.js then init globe
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => initGlobe()
    document.head.appendChild(script)

    let animId: number

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

      globeGroup.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(R * 0.998, 64, 64),
          new THREE.MeshStandardMaterial({ color: 0x05100a, metalness: 0.05, roughness: 0.95 })
        )
      )

      const dim = new THREE.LineBasicMaterial({ color: 0xa5f3c9, transparent: true, opacity: 0.06 })
      const eq = new THREE.LineBasicMaterial({ color: 0xa5f3c9, transparent: true, opacity: 0.18 })

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

      const n = 8000
      const pos = new Float32Array(n * 3)
      const vis = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / n)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        pos[i * 3] = R * 1.001 * Math.sin(phi) * Math.cos(theta)
        pos[i * 3 + 1] = R * 1.001 * Math.cos(phi)
        pos[i * 3 + 2] = R * 1.001 * Math.sin(phi) * Math.sin(theta)
        vis[i] = Math.random() > 0.42 ? 1 : 0
      }
      const dotGeo = new THREE.BufferGeometry()
      dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      dotGeo.setAttribute('vis', new THREE.BufferAttribute(vis, 1))
      globeGroup.add(
        new THREE.Points(
          dotGeo,
          new THREE.ShaderMaterial({
            vertexShader: `attribute float vis;varying float vV;void main(){vV=vis;gl_PointSize=1.6;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
            fragmentShader: `varying float vV;void main(){if(vV<.5)discard;float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.647,.953,.788,.45-d);}`,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        )
      )

      const addAtmo = (r: number, col: number, c: number, p: number, side = THREE.BackSide) => {
        scene.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(r, 64, 64),
            new THREE.ShaderMaterial({
              vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
              fragmentShader: `varying vec3 vN;uniform vec3 gc;uniform float co,po;void main(){float i=pow(co-dot(vN,vec3(0,0,1)),po);gl_FragColor=vec4(gc*i,i*0.7);}`,
              side,
              blending: THREE.AdditiveBlending,
              transparent: true,
              depthWrite: false,
              uniforms: { gc: { value: new THREE.Color(col) }, co: { value: c }, po: { value: p } },
            })
          )
        )
      }
      addAtmo(R * 1.2, 0x7dd3fc, 0.5, 4.5)
      addAtmo(R * 1.05, 0xa5f3c9, 0.38, 6.5)

      const sp = new Float32Array(2000 * 3).map(() => (Math.random() - 0.5) * 80)
      const sg = new THREE.BufferGeometry()
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
      scene.add(
        new THREE.Points(
          sg,
          new THREE.PointsMaterial({ color: 0xdde4f0, size: 0.05, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
        )
      )

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

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", background: '#070b10', color: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 52px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(7,11,16,0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 500, letterSpacing: '-0.2px' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'rgba(165,243,201,0.12)',
            border: '1px solid rgba(165,243,201,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#a5f3c9" strokeWidth="1.4">
              <circle cx="6.5" cy="6.5" r="5.5" />
              <path d="M6.5 1c-1.6 1.6-2.4 3.2-2.4 5.5s.8 3.9 2.4 5.5" />
              <path d="M6.5 1c1.6 1.6 2.4 3.2 2.4 5.5s-.8 3.9-2.4 5.5" />
              <path d="M1 6.5h11" />
            </svg>
          </div>
          OverSite
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['Features', 'Coverage', 'API', 'Pricing'].map(item => (
            <a key={item} href="#" style={{
              fontSize: 13, fontWeight: 400, color: 'rgba(248,250,252,0.55)',
              textDecoration: 'none', padding: '6px 12px', borderRadius: 6,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f8fafc'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(248,250,252,0.55)'; (e.target as HTMLElement).style.background = 'transparent' }}
            >{item}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            fontSize: 13, fontWeight: 400, color: 'rgba(248,250,252,0.55)',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 7, padding: '7px 16px', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}>Sign in</button>
          <Link to="/globe" style={{
            fontSize: 13, fontWeight: 500, color: '#070b10',
            background: '#a5f3c9', border: 'none',
            borderRadius: 7, padding: '8px 18px', cursor: 'pointer',
            fontFamily: 'inherit', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}>Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        display: 'flex', minHeight: 'calc(100vh - 65px)',
        padding: '0 52px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Left */}
        <div style={{ flex: '0 0 520px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 60px', zIndex: 10 }}>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 400, letterSpacing: '0.06em', color: '#a5f3c9', textTransform: 'uppercase', marginBottom: 24 }}>
            <span style={{ width: 18, height: 1, background: '#a5f3c9', opacity: 0.6, display: 'block' }} />
            Global news intelligence
          </div>

          <h1 style={{ fontSize: 50, fontWeight: 300, lineHeight: 1.14, letterSpacing: '-2px', color: '#f8fafc', margin: '0 0 22px' }}>
            The world's events,<br />
            <em style={{ fontStyle: 'normal', color: '#a5f3c9' }}>mapped</em>
            {' '}and{' '}
            <strong style={{ fontWeight: 500 }}>live</strong>
          </h1>

          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(248,250,252,0.55)', margin: '0 0 40px', maxWidth: 390, letterSpacing: '0.01em' }}>
            Click any country on the globe to surface curated news, regional signals, and geopolitical context — in seconds.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 56 }}>
            <Link to="/globe" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 500, letterSpacing: '-0.1px',
              color: '#070b10', background: '#a5f3c9',
              border: 'none', borderRadius: 9, padding: '13px 26px',
              textDecoration: 'none', fontFamily: 'inherit', transition: 'all 0.18s',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="7" cy="7" r="6" /><path d="M7 1c-1.5 1.5-2.2 3-2.2 6s.7 4.5 2.2 6" /><path d="M7 1c1.5 1.5 2.2 3 2.2 6s-.7 4.5-2.2 6" /><path d="M1 7h12" />
              </svg>
              Explore the globe
            </Link>
            <a href="#features" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13.5, fontWeight: 400, color: 'rgba(248,250,252,0.55)',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 9, padding: '12px 22px', textDecoration: 'none',
              fontFamily: 'inherit', transition: 'all 0.18s',
            }}>See how it works</a>
          </div>

          <div style={{ display: 'flex', gap: 0 }}>
            {[['195', 'Countries'], ['12k+', 'Sources'], ['Live', 'Updates']].map(([num, label], i) => (
              <div key={label} style={{
                padding: i === 0 ? '0 28px 0 0' : '0 28px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-1px', lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(248,250,252,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Globe */}
        <div ref={parentRef} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulse rings */}
          {[460, 600, 740].map((size, i) => (
            <div key={size} style={{
              position: 'absolute', width: size, height: size, borderRadius: '50%',
              border: '1px solid rgba(165,243,201,0.07)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              opacity: 1 - i * 0.3, pointerEvents: 'none',
            }} />
          ))}

          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

          {/* Floating chips */}
          <div style={{
            position: 'absolute', top: '20%', right: '6%', zIndex: 20,
            background: 'rgba(7,11,16,0.88)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.13)', borderRadius: 11,
            padding: '12px 15px', minWidth: 140, fontFamily: 'inherit',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.3)', marginBottom: 5 }}>Trending now</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1 }}>India</div>
            <div style={{ fontSize: 11, color: '#a5f3c9', marginTop: 3 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, background: '#a5f3c9', borderRadius: '50%', marginRight: 5, verticalAlign: 'middle' }} />
              42 new articles
            </div>
          </div>

          <div style={{
            position: 'absolute', bottom: '22%', right: '14%', zIndex: 20,
            background: 'rgba(7,11,16,0.88)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.13)', borderRadius: 11,
            padding: '12px 15px', minWidth: 140, fontFamily: 'inherit',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.3)', marginBottom: 5 }}>Latest signal</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1 }}>Brussels</div>
            <div style={{ fontSize: 11, color: '#a5f3c9', marginTop: 3 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, background: '#a5f3c9', borderRadius: '50%', marginRight: 5, verticalAlign: 'middle' }} />
              Policy update · 4m ago
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '90px 52px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a5f3c9', marginBottom: 14 }}>Why OverSite</div>
          <h2 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-0.8px', color: '#f8fafc', lineHeight: 1.25, margin: '0 0 10px' }}>
            Intelligence at <strong style={{ fontWeight: 500 }}>geographic scale</strong>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.55)', lineHeight: 1.7, maxWidth: 420 }}>
            From breaking developments to slow-burn geopolitical shifts — OverSite connects you to what's happening, where it's happening.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
            <div key={title} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: 26, transition: 'border-color 0.2s, background 0.2s', cursor: 'default',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.13)'; el.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.04)' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(165,243,201,0.07)',
                border: '1px solid rgba(165,243,201,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc', marginBottom: 8, letterSpacing: '-0.2px' }}>{title}</div>
              <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(248,250,252,0.45)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 36, marginTop: 64 }}>
          <div style={{ display: 'flex' }}>
            {['AK', 'RJ', 'MS', '+'].map((av, i) => (
              <div key={av} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)', border: '2px solid #070b10',
                marginLeft: i === 0 ? 0 : -8,
                fontSize: 11, fontWeight: 500, color: 'rgba(248,250,252,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{av}</div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.55)', lineHeight: 1.5, margin: 0 }}>
            Trusted by <strong style={{ color: '#f8fafc', fontWeight: 500 }}>2,400+ analysts</strong>, journalists, and researchers tracking global events in real time.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '24px 52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)' }}>© 2026 OverSite</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Docs', 'GitHub'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}

export default LandingPage