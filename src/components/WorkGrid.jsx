// src/components/WorkGrid.jsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore, useDataStore, useUIStore } from '../store'
import { useFilteredProjects, useDebounce } from '../hooks'

function catLabel(c) { return c.charAt(0).toUpperCase() + c.slice(1) }

function WorkCard({ project, isAdmin, onDelete, onDragStart, onDrop, onClick }) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`wcard ${isAdmin ? 'edit-mode' : 'view'} ${dragOver ? 'drag-target' : ''}`}
      draggable={isAdmin}
      onDragStart={() => onDragStart(project.id)}
      onDragEnd={() => setDragOver(false)}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(project.id) }}
      onClick={e => {
        if (e.target.closest('.w-del,.w-drag')) return
        if (!isAdmin) onClick(project)
      }}
    >
      {isAdmin && <>
        <button className="w-drag vis">☰</button>
        <button className="w-del vis" onClick={e => { e.stopPropagation(); onDelete(project) }}>✕</button>
      </>}

      <div className="wm">
        {project.media_url
          ? (project.media_type === 'video'
              ? <video src={`${project.media_url}?t=${project.updated_at || Date.now()}`} muted loop playsInline preload="metadata" />
              : <img
                  src={`${project.media_url}?t=${project.updated_at || Date.now()}`}
                  alt={project.title}
                  loading="eager"
                />)
          : <div className="wph">{project.emoji || '🎨'}</div>
        }

        <div className="wov">
          <div>
            <div className="wov-t">{project.title}</div>
            <div className="wov-c">{catLabel(project.category)}</div>
          </div>
        </div>
      </div>

      <div className="wmeta">
        <div className="wmt">{project.title}</div>
        <span className="wmb">{catLabel(project.category)}</span>
      </div>
    </div>
  )
}

export function WorkGrid({ onToast }) {
  const isAdmin = useAuthStore(s => s.isAdmin)
  const { deleteProject, reorderProjects } = useDataStore()
  const openModal = useUIStore(s => s.openModal)
  const filtered = useFilteredProjects()

  const [lightbox, setLightbox] = useState({ open: false, project: null })
  const [dragFrom, setDragFrom] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const debouncedReorder = useDebounce(async (orderedIds) => {
    try {
      await reorderProjects(orderedIds)
      onToast?.('Urutan disimpan!', 'ok')
    } catch (e) {
      onToast?.(e.message, 'err')
    }
  }, 400)

  const handleDrop = useCallback((toId) => {
    if (!dragFrom || dragFrom === toId) return
    const ids = filtered.map(p => p.id)
    const from = ids.indexOf(dragFrom)
    const to = ids.indexOf(toId)
    const reordered = [...ids]
    reordered.splice(from, 1)
    reordered.splice(to, 0, dragFrom)
    setDragFrom(null)
    debouncedReorder(reordered)
  }, [dragFrom, filtered, debouncedReorder])

  const confirmDelete = useCallback(async () => {
    if (!confirm) return
    try {
      await deleteProject(confirm.id)
      onToast?.('Karya dihapus.')
    } catch (e) {
      onToast?.(e.message, 'err')
    } finally {
      setConfirm(null)
    }
  }, [confirm, deleteProject, onToast])

  return (
    <>
      <div className="wgrid">
        {!filtered.length && !isAdmin && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 24px', color:'var(--ts)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🎨</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Belum ada karya</div>
            <div style={{ fontSize:13, opacity:.6 }}>Karya akan muncul di sini setelah ditambahkan.</div>
          </div>
        )}

        {filtered.map(p => (
          <WorkCard
            key={p.id}
            project={p}
            isAdmin={isAdmin}
            onDelete={setConfirm}
            onDragStart={setDragFrom}
            onDrop={handleDrop}
            onClick={proj => setLightbox({ open: true, project: proj })}
          />
        ))}

        {isAdmin && (
          <div className="wadd" onClick={() => openModal('upload')}>
            <div className="wadd-c">+</div>
            <span className="wadd-l">Upload Karya</span>
          </div>
        )}
      </div>

      {lightbox.open && (
        <Lightbox
          project={lightbox.project}
          all={filtered}
          onClose={() => setLightbox({ open: false, project: null })}
        />
      )}

      {confirm && (
        <div className="mov open" onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="mb" style={{ maxWidth:360, textAlign:'center' }}>
            <div className="ci">🗑️</div>
            <div className="ct">Hapus karya ini?</div>
            <div className="cm">"{confirm.title}" akan dihapus permanen.</div>
            <div className="cr">
              <button className="btn-c" onClick={() => setConfirm(null)}>Batal</button>
              <button className="btn-d" onClick={confirmDelete}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function WorkFilters() {
  const activeFilter = useUIStore(s => s.activeFilter)
  const setFilter = useUIStore(s => s.setFilter)

  return (
    <div className="filters rv">
      {['all','design','photo','video'].map(f => (
        <button
          key={f}
          className={`fb${activeFilter === f ? ' active' : ''}`}
          onClick={() => setFilter(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  )
}

function Lightbox({ project, all, onClose }) {
  const [idx, setIdx] = useState(() => all.findIndex(p => p.id === project.id))

  const handleKey = useCallback(e => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + all.length) % all.length)
    if (e.key === 'ArrowRight') setIdx(i => (i + 1) % all.length)
  }, [all.length, onClose])

  const ref = useRef()
  ref.current = handleKey

  useEffect(() => {
    const fn = e => ref.current(e)
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const p = all[idx]

  return (
    <div className="lb open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <button className="lb-btn lb-x" onClick={onClose}>✕</button>
      <button className="lb-btn lb-p" onClick={() => setIdx(i => (i - 1 + all.length) % all.length)}>‹</button>
      <button className="lb-btn lb-n" onClick={() => setIdx(i => (i + 1) % all.length)}>›</button>
      <div className="lb-ctr">{idx + 1} / {all.length}</div>

      <div className="lb-in">
        {p.media_url
          ? (p.media_type === 'video'
              ? <video src={`${p.media_url}?t=${p.updated_at || Date.now()}`} controls autoPlay playsInline />
              : <img src={`${p.media_url}?t=${p.updated_at || Date.now()}`} alt={p.title} />)
          : <div style={{ width:'clamp(260px,60vw,460px)', height:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.05)', borderRadius:20, fontSize:80 }}>{p.emoji || '🎨'}</div>
        }

        <div className="lb-cap">
          <div className="lb-cap-t">{p.title}</div>
          <div className="lb-cap-s">
            {catLabel(p.category)}{p.description ? ` · ${p.description}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}