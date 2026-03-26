// src/components/Modals.jsx
import { useState, useCallback, useRef } from 'react'
import { useAuthStore, useDataStore, useUIStore } from '../store'
import { useAsyncAction } from '../hooks'

/* ── LoginModal ───────────────────────────────────────────────── */
export function LoginModal({ onToast }) {
  const modal      = useUIStore(s => s.modal)
  const closeModal = useUIStore(s => s.closeModal)
  const signIn     = useAuthStore(s => s.signIn)
  const authError  = useAuthStore(s => s.error)

  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const { loading, run }  = useAsyncAction()

  const submit = useCallback(async () => {
    const ok = await run(() => signIn(email, pass))
    if (ok) {
      closeModal()
      setEmail(''); setPass('')
      onToast?.('Login berhasil! Selamat datang 👋', 'ok')
    } else {
      setPass('')
    }
  }, [email, pass, signIn, closeModal, run, onToast])

  if (modal !== 'login') return null
  return (
    <div className="mov open" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
      <div className="mb">
        <button className="mx" onClick={closeModal}>✕</button>
        <div className="mt2">Admin Login</div>
        <div className="ms2">Masukkan kredensial admin Supabase kamu.</div>
        <form autoComplete="off" onSubmit={e => { e.preventDefault(); submit() }}>
          <div className="fg">
            <label className="fl">Email</label>
            <input type="email" className="fi" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div className="fg">
            <label className="fl">Password</label>
            <input type="password" className="fi" value={pass}
              onChange={e => setPass(e.target.value)} autoComplete="new-password" />
            {authError && <div className="ferr on">{authError}</div>}
          </div>
          <button type="submit" className="btn-full" disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── UploadModal ──────────────────────────────────────────────── */
export function UploadModal({ onToast }) {
  const modal       = useUIStore(s => s.modal)
  const closeModal  = useUIStore(s => s.closeModal)
  const setUploading = useUIStore(s => s.setUploading)
  const addProject  = useDataStore(s => s.addProject)
  const isAdmin     = useAuthStore(s => s.isAdmin)

  const [title,   setTitle]   = useState('')
  const [cat,     setCat]     = useState('design')
  const [desc,    setDesc]    = useState('')
  const [emoji,   setEmoji]   = useState('')
  const [file,    setFile]    = useState(null)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef()

  const handleFile = useCallback(f => {
    if (!f) return
    const allowed = ['image/jpeg','image/png','image/webp','video/mp4']
    if (!allowed.includes(f.type)) { onToast?.('Format tidak didukung.','err'); return }
    if (f.size > 50 * 1024 * 1024) { onToast?.('File terlalu besar. Maks 50MB.','err'); return }
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview({ src: e.target.result, type: f.type.startsWith('video') ? 'video' : 'image' })
    reader.readAsDataURL(f)
  }, [onToast])

  const reset = () => {
    setTitle(''); setCat('design'); setDesc(''); setEmoji('')
    setFile(null); setPreview(null); setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = useCallback(async () => {
    if (!file || !title) return
    setSubmitting(true)
    setUploading(true, 0)

    // Simulate progress during upload
    const tick = setInterval(() => {
      setProgress(p => { const n = Math.min(p + Math.random() * 15, 85); setUploading(true, n); return n })
    }, 200)

    try {
      await addProject({
        title,
        category: cat,
        description: desc,
        emoji: emoji || (file.type.startsWith('video') ? '🎬' : '🎨'),
      }, file)

      clearInterval(tick)
      setUploading(false, 100)
      closeModal()
      reset()
      onToast?.('Karya berhasil ditambahkan! 🎉', 'ok')
    } catch (err) {
      clearInterval(tick)
      onToast?.(err.message, 'err')
    } finally {
      setSubmitting(false)
      setUploading(false, 0)
    }
  }, [file, title, cat, desc, emoji, addProject, closeModal, setUploading, onToast])

  if (modal !== 'upload') return null
  return (
    <div className="mov open" onClick={e => { if (e.target === e.currentTarget) { closeModal(); reset() } }}>
      <div className="mb mb-w">
        <button className="mx" onClick={() => { closeModal(); reset() }}>✕</button>
        <div className="mt2">Upload Karya</div>
        <div className="ms2">File diunggah ke Supabase Storage — persisten dan global.</div>

        <div className="fg"><label className="fl">Judul *</label>
          <input type="text" className="fi" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Brand Identity for Startup X" />
        </div>
        <div className="fg"><label className="fl">Kategori</label>
          <select className="fi" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="design">Design</option>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div className="fg"><label className="fl">Deskripsi</label>
          <textarea className="fi" rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ceritakan tentang karya ini..." />
        </div>
        <div className="fg">
          <label className="fl">File Media * (JPG·PNG·WEBP·MP4 — maks 50MB)</label>
          <div className="dz"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          >
            <div className="dz-i">{preview?.type === 'video' ? '🎬' : file ? '🖼️' : '📂'}</div>
            <div className="dz-t">Drag & drop atau klik untuk pilih</div>
            <div className="dz-s">Upload langsung ke Supabase Storage</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4"
            style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />

          {preview && (
            <div style={{ marginTop:14 }}>
              {preview.type === 'video'
                ? <video src={preview.src} controls style={{ maxHeight:140, margin:'0 auto', borderRadius:12 }} />
                : <img src={preview.src} alt="preview" style={{ maxHeight:140, margin:'0 auto', display:'block', borderRadius:12 }} />
              }
            </div>
          )}

          {submitting && (
            <div className="pg-w on" style={{ marginTop:14 }}>
              <div className="pg-l"><span>Mengunggah ke Supabase Storage...</span><span>{Math.round(progress)}%</span></div>
              <div className="pg-b"><div className="pg-f" style={{ width:`${progress}%` }} /></div>
            </div>
          )}
        </div>
        <div className="fg"><label className="fl">Emoji (opsional)</label>
          <input type="text" className="fi" value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🎨" maxLength={4} style={{ fontSize:18 }} />
        </div>
        <button className="btn-full" onClick={submit} disabled={submitting || !file || !title}>
          {submitting ? 'Mengunggah...' : '✅ Upload & Tambahkan'}
        </button>
        <button className="btn-gf" onClick={() => { closeModal(); reset() }}>Batal</button>
      </div>
    </div>
  )
}

/* ── ContentEditorModal ───────────────────────────────────────── */
const SCHEMAS = {
  'edit-hero': {
    title: 'Edit Hero', sub: 'Ubah teks bagian atas.',
    fields: [
      { key:'badge',       label:'Badge',       type:'text' },
      { key:'greet',       label:'Greeting',    type:'text' },
      { key:'tag',         label:'Tagline',     type:'text' },
      { key:'description', label:'Deskripsi',   type:'textarea' },
    ],
  },
  'edit-about': {
    title: 'Edit About', sub: 'Ubah deskripsi About.',
    fields: [{ key:'about', label:'Teks About', type:'textarea' }],
  },
  'edit-study': {
    title: 'Edit Education', sub: 'Ubah info sekolah.',
    fields: [
      { key:'school_name', label:'Nama Sekolah', type:'text' },
      { key:'school_desc', label:'Deskripsi',    type:'textarea' },
    ],
  },
}

export function ContentEditorModal({ onToast }) {
  const modal          = useUIStore(s => s.modal)
  const closeModal     = useUIStore(s => s.closeModal)
  const content        = useDataStore(s => s.content)
  const updateContent  = useDataStore(s => s.updateContent)
  const { loading, run } = useAsyncAction()

  const schema = SCHEMAS[modal]
  const [values, setValues] = useState({})

  // Pre-fill when modal opens
  if (schema && content && Object.keys(values).length === 0) {
    setValues(Object.fromEntries(schema.fields.map(f => [f.key, content[f.key] || ''])))
  }

  const save = useCallback(async () => {
    await run(() => updateContent(values))
    closeModal()
    setValues({})
    onToast?.('Konten disimpan dan live! 💾', 'ok')
  }, [values, updateContent, closeModal, run, onToast])

  if (!schema || !content) return null
  return (
    <div className="mov open" onClick={e => { if (e.target === e.currentTarget) { closeModal(); setValues({}) } }}>
      <div className="mb mb-w">
        <button className="mx" onClick={() => { closeModal(); setValues({}) }}>✕</button>
        <div className="mt2">{schema.title}</div>
        <div className="ms2">{schema.sub}</div>
        {schema.fields.map(f => (
          <div key={f.key} className="fg">
            <label className="fl">{f.label}</label>
            {f.type === 'textarea'
              ? <textarea className="fi" rows={3} value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
              : <input type="text" className="fi" value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
            }
          </div>
        ))}
        <button className="btn-full" onClick={save} disabled={loading}>
          {loading ? 'Menyimpan...' : '💾 Simpan'}
        </button>
        <button className="btn-gf" onClick={() => { closeModal(); setValues({}) }}>Batal</button>
      </div>
    </div>
  )
}

/* ── SocialModal ──────────────────────────────────────────────── */
export function SocialModal({ onToast }) {
  const modal       = useUIStore(s => s.modal)
  const closeModal  = useUIStore(s => s.closeModal)
  const socials     = useDataStore(s => s.socials)
  const { addSocial, deleteSocial } = useDataStore()
  const { loading, run } = useAsyncAction()

  const [name,  setName]   = useState('')
  const [handle,setHandle] = useState('')
  const [url,   setUrl]    = useState('')
  const [icon,  setIcon]   = useState('')
  const [color, setColor]  = useState('')

  const add = useCallback(async () => {
    if (!name || !url) { onToast?.('Nama dan URL wajib diisi.','err'); return }
    await run(() => addSocial({ name, handle, url, icon: icon||'🔗', color: color||'#f0f4ff' }))
    setName(''); setHandle(''); setUrl(''); setIcon(''); setColor('')
    onToast?.(`${icon||'🔗'} ${name} ditambahkan!`, 'ok')
  }, [name, handle, url, icon, color, addSocial, run, onToast])

  const remove = useCallback(async (id, sName) => {
    await run(() => deleteSocial(id))
    onToast?.(`${sName} dihapus.`, '', '🗑️')
  }, [deleteSocial, run, onToast])

  if (modal !== 'socials') return null
  return (
    <div className="mov open" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
      <div className="mb mb-w">
        <button className="mx" onClick={closeModal}>✕</button>
        <div className="mt2">Manage Socials</div>
        <div className="ms2">Perubahan langsung tampil untuk semua pengunjung.</div>
        <p className="sm-sec">Akun Saat Ini</p>
        <div className="sm-list">
          {!socials.length
            ? <p style={{ fontSize:13, color:'var(--gray)', textAlign:'center', padding:10 }}>Belum ada akun.</p>
            : socials.map(s => (
              <div key={s.id} className="sm-item">
                <span className="sm-i">{s.icon}</span>
                <span className="sm-n">{s.name}</span>
                <span className="sm-h2">{s.handle}</span>
                <button className="sm-d" onClick={() => remove(s.id, s.name)}>🗑</button>
              </div>
            ))
          }
        </div>
        <div className="divider"><span>Tambah Baru</span></div>
        <div className="g2">
          <div className="fg" style={{ marginBottom:0 }}><label className="fl">Platform *</label><input type="text" className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="Instagram" /></div>
          <div className="fg" style={{ marginBottom:0 }}><label className="fl">Emoji</label><input type="text" className="fi" value={icon} onChange={e => setIcon(e.target.value)} placeholder="📸" maxLength={4} /></div>
        </div>
        <div className="fg" style={{ marginTop:12 }}><label className="fl">Handle</label><input type="text" className="fi" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@mhmdadityyy" /></div>
        <div className="fg"><label className="fl">URL *</label><input type="url" className="fi" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://instagram.com/mhmdadityyy" /></div>
        <div className="fg"><label className="fl">Warna BG (hex)</label><input type="text" className="fi" value={color} onChange={e => setColor(e.target.value)} placeholder="#fce4ec" /></div>
        <button className="btn-full" onClick={add} disabled={loading}>➕ Tambahkan</button>
      </div>
    </div>
  )
}

/* ── AdminBar ─────────────────────────────────────────────────── */
export function AdminBar({ onToast }) {
  const isAdmin   = useAuthStore(s => s.isAdmin)
  const signOut   = useAuthStore(s => s.signOut)
  const openModal = useUIStore(s => s.openModal)
  const [confirmLogout, setConfirmLogout] = useState(false)

  if (!isAdmin) return null
  return (
    <>
      <div className="admin-bar vis">
        <span className="ab-l"><span className="ab-dot" />Admin Mode — Live</span>
        <button className="ab ab-b" onClick={() => openModal('upload')}>+ Upload</button>
        <button className="ab ab-g" onClick={() => openModal('edit-hero')}>Edit Hero</button>
        <button className="ab ab-g" onClick={() => openModal('edit-about')}>Edit About</button>
        <button className="ab ab-g" onClick={() => openModal('socials')}>Socials</button>
        <button className="ab ab-r" onClick={() => setConfirmLogout(true)}>Logout</button>
      </div>

      {confirmLogout && (
        <div className="mov open" onClick={e => { if (e.target === e.currentTarget) setConfirmLogout(false) }}>
          <div className="mb" style={{ maxWidth:360, textAlign:'center' }}>
            <div className="ci">🔐</div><div className="ct">Logout Admin?</div>
            <div className="cm">Kamu akan keluar dari mode admin.</div>
            <div className="cr">
              <button className="btn-c" onClick={() => setConfirmLogout(false)}>Batal</button>
              <button className="btn-d" onClick={async () => {
                await signOut()
                setConfirmLogout(false)
                onToast?.('Berhasil logout.', '', '👋')
              }}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
