// src/App.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore, useDataStore, useUIStore } from './store'
import { WorkGrid, WorkFilters } from './components/WorkGrid'
import { LoginModal, UploadModal, ContentEditorModal, SocialModal, AdminBar } from './components/Modals'

/* ── Toast ────────────────────────────────────────────────────── */
function Toast({ msg, type, icon, visible }) {
  return (
    <div className={`toast${visible ? ' on' : ''}${type ? ' '+type : ''}`}>
      <span>{icon || 'ℹ️'}</span><span>{msg}</span>
    </div>
  )
}

function useToast() {
  const [state, setState] = useState({ msg:'', type:'', icon:'', visible:false })
  const timer = useRef(null)
  const show = useCallback((msg, type='', icon='ℹ️') => {
    clearTimeout(timer.current)
    setState({ msg, type, icon, visible: true })
    timer.current = setTimeout(() => setState(s => ({ ...s, visible:false })), 3500)
  }, [])
  return { toastState: state, showToast: show }
}

/* ── useScrollSpy ─────────────────────────────────────────────── */
function useScrollSpy(ids) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const fn = () => {
      let cur = ''
      ids.forEach(id => {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 100) cur = id
      })
      setActive(cur)
    }
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [ids])
  return active
}

/* ── Nav ──────────────────────────────────────────────────────── */
function Nav({ onAdminClick }) {
  const isAdmin = useAuthStore(s => s.isAdmin)
  const signOut = useAuthStore(s => s.signOut)
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawer] = useState(false)
  const sections = ['about','studying','skills','services','work','contact']
  const active = useScrollSpy(['hero',...sections])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''}>
        <a href="#hero" className="nav-logo">Aditya<em>.</em></a>
        <ul className="nav-links">
          {sections.map(s => (
            <li key={s}><a href={`#${s}`} className={active===s?'active':''}>{s.charAt(0).toUpperCase()+s.slice(1)}</a></li>
          ))}
        </ul>
        <div className="nav-end">
          <button id="adminBtn" className={isAdmin?'on':''} onClick={() => isAdmin ? signOut() : onAdminClick()}>
            {isAdmin ? '🛠 Admin' : 'Admin'}
          </button>
          <a href="#contact" className="btn-talk">Let's Talk</a>
        </div>
        <button className={`ham${drawerOpen?' open':''}`} onClick={() => setDrawer(d=>!d)}>
          <span/><span/><span/>
        </button>
      </nav>
      <div className={`drawer${drawerOpen?' open':''}`}>
        {sections.map(s => <a key={s} href={`#${s}`} onClick={() => setDrawer(false)}>{s.charAt(0).toUpperCase()+s.slice(1)}</a>)}
        <div className="drawer-cta">
          <button className="btn-g" onClick={() => { setDrawer(false); isAdmin ? signOut() : onAdminClick() }}>
            {isAdmin ? '🛠 Admin' : 'Admin'}
          </button>
          <a href="#contact" className="btn-talk" onClick={() => setDrawer(false)}>Let's Talk</a>
        </div>
      </div>
    </>
  )
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  const isAdmin   = useAuthStore(s => s.isAdmin)
  const content   = useDataStore(s => s.content)
  const openModal = useUIStore(s => s.openModal)
  const c = content || {}

  return (
    <section id="hero">
      <div className="hero-bg"/><div className="orb orb1"/><div className="orb orb2"/>
      <div className="hero-inner">
        <div className="hero-badge"><span className="bdot"/><span>{c.badge || 'Open for collaborations'}</span></div>
        <p className="h-greet">{c.greet || 'Hi! 👋'}</p>
        <h1 className="h-name">Mohamad <em>Aditya</em><br/>Subagja</h1>
        <p className="h-tag">{c.tag || 'And this is my Portfolio'}</p>
        <p className="h-desc">{c.description}</p>
        <div className="h-actions">
          <a href="#work" className="btn-p">View My Work</a>
          <a href="#contact" className="btn-o">Get in Touch</a>
        </div>
      </div>
      <div className="scroll-cue"><span className="scroll-txt">Scroll</span><div className="scroll-line"/></div>
      {isAdmin && <button className="edit-chip vis" onClick={() => openModal('edit-hero')}>✏️ Edit Hero</button>}
    </section>
  )
}

/* ── About ────────────────────────────────────────────────────── */
function About() {
  const isAdmin     = useAuthStore(s => s.isAdmin)
  const content     = useDataStore(s => s.content)
  const photos      = useDataStore(s => s.photos)
  const uploadPhoto = useDataStore(s => s.uploadPhoto)
  const openModal   = useUIStore(s => s.openModal)
  const fileRef     = useRef()
  const c = content || {}

  return (
    <section id="about">
      <div className="container"><div className="about-grid">
        <div className="rv-l"><div className="fw">
          <div className="af">
            {photos?.profile_url
              ? <img src={photos.profile_url} alt="Profile" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
              : <div className="af-ph">🎨</div>
            }
          </div>
          <div className="nc"><div className="nc-n">Mohamad Aditya Subagja</div><div className="nc-r">Graphic Designer · Cirebon, ID</div></div>
          {isAdmin && <>
            <button className="photo-btn vis" onClick={() => fileRef.current?.click()}>📷 Ganti Foto</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={async e => {
                const f = e.target.files[0]; if (!f) return
                await uploadPhoto('profile', f)
                e.target.value = ''
              }} />
          </>}
        </div></div>
        <div className="rv-r">
          <span className="tag">About Me</span>
          <h2 className="st">Creative Mind,<br/>Precise Execution</h2>
          <p className="abt">{c.about}</p>
          <div className="stats">
            <div className="stat rv d1"><div className="stat-n">7+</div><div className="stat-l">Tools</div></div>
            <div className="stat rv d2"><div className="stat-n">3+</div><div className="stat-l">Services</div></div>
            <div className="stat rv d3"><div className="stat-n">∞</div><div className="stat-l">Ideas</div></div>
          </div>
          {isAdmin && <button className="btn-g about-edit-btn vis" style={{ marginTop:20 }} onClick={() => openModal('edit-about')}>✏️ Edit About</button>}
        </div>
      </div></div>
    </section>
  )
}

/* ── Studying ─────────────────────────────────────────────────── */
function Studying() {
  const isAdmin     = useAuthStore(s => s.isAdmin)
  const content     = useDataStore(s => s.content)
  const photos      = useDataStore(s => s.photos)
  const uploadPhoto = useDataStore(s => s.uploadPhoto)
  const openModal   = useUIStore(s => s.openModal)
  const fileRef     = useRef()
  const c = content || {}

  return (
    <section id="studying">
      <div className="container" style={{ textAlign:'center' }}>
        <span className="tag rv">Education</span>
        <h2 className="st rv">Where I Learn &amp;<br/>Grow Every Day</h2>
        <div className="sc rv">
          <div className="si">
            {photos?.school_url
              ? <img src={photos.school_url} alt="School" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
              : <div className="si-ph">🏫</div>
            }
            {isAdmin && <>
              <button className="school-img-btn vis" onClick={() => fileRef.current?.click()}>📷 Ganti Foto</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={async e => {
                  const f = e.target.files[0]; if (!f) return
                  await uploadPhoto('school', f)
                  e.target.value = ''
                }} />
            </>}
          </div>
          <div className="sinfo" style={{ textAlign:'left' }}>
            <span className="sb">🎓 Active Student</span>
            <h3>{c.school_name || 'SMAN 8 Kota Cirebon'}</h3>
            <p>{c.school_desc}</p>
            {isAdmin && <button className="btn-g study-edit-btn vis" style={{ marginTop:16 }} onClick={() => openModal('edit-study')}>✏️ Edit</button>}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Skills ───────────────────────────────────────────────────── */
const SKILLS = [
  { icon:'🎨', name:'Canva',       tag:'Fast & Creative', level:92 },
  { icon:'🅰️', name:'Adobe Suite', tag:'Professional',    level:85 },
  { icon:'🔷', name:'CorelDRAW',   tag:'Vector',          level:80 },
  { icon:'📊', name:'Excel',       tag:'Data',            level:75 },
  { icon:'📝', name:'Word',        tag:'Docs',            level:88 },
  { icon:'📑', name:'PowerPoint',  tag:'Slides',          level:90 },
  { icon:'🧊', name:'Blender',     tag:'3D',              level:60 },
]

function Skills() {
  const [vis, setVis] = useState({})
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVis(v => ({ ...v, [e.target.dataset.idx]: true })) })
    }, { threshold:.12 })
    document.querySelectorAll('.sk-card').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
  return (
    <section id="skills"><div className="container">
      <div style={{ textAlign:'center' }}>
        <span className="tag rv">Toolkit</span><h2 className="st rv">My Skills</h2>
        <p className="ss rv" style={{ margin:'0 auto' }}>Each tool represents a different approach to solving visual problems efficiently.</p>
      </div>
      <div className="sk-grid">
        {SKILLS.map((s,i) => (
          <div key={s.name} className={`sk-card d${(i%6)+1}${vis[i]?' on':''}`} data-idx={i}>
            <span className="ski">{s.icon}</span><div className="skn">{s.name}</div><div className="skt">{s.tag}</div>
            <div className="sk-bar"><div className="sk-fill" style={{ width: vis[i] ? `${s.level}%` : '0%' }}/></div>
          </div>
        ))}
      </div>
    </div></section>
  )
}

/* ── Services ─────────────────────────────────────────────────── */
const SERVICES = [
  { icon:'🎨', title:'Graphic Design', desc:'Creating compelling visuals that communicate your brand identity clearly across all digital and print touchpoints.' },
  { icon:'🎬', title:'Photo & Video Editing', desc:'Professional post-production that elevates your content to a polished, broadcast-ready finish.' },
  { icon:'💡', title:'Creative Projects', desc:'End-to-end creative direction for campaigns, content series, and multimedia projects that leave a lasting impression.' },
]

function Services() {
  return (
    <section id="services"><div className="container">
      <div style={{ textAlign:'center' }}>
        <span className="tag rv">What I Offer</span><h2 className="st rv">My Services</h2>
        <p className="ss rv" style={{ margin:'0 auto' }}>Every project handled with attention to detail — clean, modern, on point.</p>
      </div>
      <div className="svc-grid">
        {SERVICES.map((s,i) => (
          <div key={s.title} className={`svc rv d${i+1}`}>
            <span className="sv-i">{s.icon}</span><div className="sv-t">{s.title}</div><div className="sv-d">{s.desc}</div>
          </div>
        ))}
      </div>
    </div></section>
  )
}

/* ── Work ─────────────────────────────────────────────────────── */
function Work({ onToast }) {
  const isAdmin   = useAuthStore(s => s.isAdmin)
  const openModal = useUIStore(s => s.openModal)
  return (
    <section id="work"><div className="container">
      <div className="w-hdr">
        <div>
          <span className="tag rv">Portfolio</span><h2 className="st rv">My Work</h2>
          <WorkFilters />
        </div>
        <p className="ss rv" style={{ maxWidth:260, paddingTop:60 }}>A collection of selected works reflecting my growth and style.</p>
      </div>
      {isAdmin && (
        <div className="work-toolbar vis">
          <span className="tb-l">🛠 Admin Mode — Changes are live globally</span>
          <span className="drag-hint">☰ Drag untuk reorder</span>
          <button className="ab ab-b" onClick={() => openModal('upload')}>+ Upload</button>
          <button className="ab ab-g" onClick={() => openModal('socials')}>Socials</button>
        </div>
      )}
      <WorkGrid onToast={onToast} />
    </div></section>
  )
}

/* ── Contact ──────────────────────────────────────────────────── */
function Contact() {
  const socials = useDataStore(s => s.socials)
  const copyEmail = () => {
    navigator.clipboard?.writeText('mhmdadity27@gmail.com')
      .catch(() => prompt('Copy:', 'mhmdadity27@gmail.com'))
  }
  return (
    <section id="contact"><div className="container"><div className="cg">
      <div>
        <span className="tag rv">Get in Touch</span>
        <h2 className="st rv">Let's Create<br/>Something Together</h2>
        <p className="cb rv">Let's collaborate and create something impactful.</p>
        <div className="sl rv">
          {socials.map(s => (
            <a key={s.id} className="sc2" href={s.url} target={s.url.startsWith('mailto')?'_self':'_blank'} rel="noopener noreferrer">
              <div className="si2" style={{ background:s.color||'#f0f0f0' }}>{s.icon}</div>
              <div className="sinfo2"><div className="sn2">{s.name}</div><div className="sh2">{s.handle}</div></div>
              <span className="sarr">→</span>
            </a>
          ))}
        </div>
      </div>
      <div className="rv-r"><div className="ctab">
        <h3>Ready to Start?</h3>
        <p>Have a project in mind? Let's discuss how I can bring your vision to life.</p>
        <button className="btn-w" onClick={copyEmail}>📧 Copy Email</button>
        <div className="cta-ls">
          <a href="https://wa.me/62895413221603" target="_blank" rel="noopener" className="cta-a">💬 WhatsApp Me</a>
          <a href="mailto:mhmdadity27@gmail.com" className="cta-a">✉️ Send Email</a>
        </div>
      </div></div>
    </div></div></section>
  )
}

/* ── App Root ─────────────────────────────────────────────────── */
export default function App() {
  const { init: initAuth }  = useAuthStore()
  const { loadAll, subscribeRealtime } = useDataStore()
  const openModal = useUIStore(s => s.openModal)
  const [ready, setReady] = useState(false)
  const { toastState, showToast } = useToast()

  useEffect(() => {
    Promise.all([initAuth(), loadAll()]).then(() => setReady(true))
  }, [])

  // Start realtime subscriptions once data is loaded
  useEffect(() => {
    if (!ready) return
    const cleanup = subscribeRealtime()
    return cleanup
  }, [ready, subscribeRealtime])

  // Scroll reveal
  useEffect(() => {
    if (!ready) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on') })
    }, { threshold:.12 })
    document.querySelectorAll('.rv,.rv-l,.rv-r').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [ready])

  if (!ready) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif', color:'var(--ts)', fontSize:14 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div>Memuat data...</div>
      </div>
    </div>
  )

  return (
    <>
      <div id="curtain"/>
      <Nav onAdminClick={() => openModal('login')} />
      <Hero />
      <About />
      <Studying />
      <Skills />
      <Services />
      <Work onToast={showToast} />
      <Contact />
      <footer>
        <div className="f-logo">Aditya<em>.</em></div>
        <p>© 2025 Mohamad Aditya Subagja · Crafted with precision & passion</p>
        <div className="f-links">
          <a href="#about">About</a><a href="#work">Work</a><a href="#contact">Contact</a>
          <a href="mailto:mhmdadity27@gmail.com">Email</a>
          <a href="https://instagram.com/mhmdadityyy" target="_blank" rel="noopener">Instagram</a>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal onToast={showToast} />
      <UploadModal onToast={showToast} />
      <ContentEditorModal onToast={showToast} />
      <SocialModal onToast={showToast} />
      <AdminBar onToast={showToast} />
      <Toast {...toastState} />
    </>
  )
}
