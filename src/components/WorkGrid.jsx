import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore, useDataStore, useUIStore } from '../store'
import { useFilteredProjects, useDebounce } from '../hooks'

function catLabel(c) {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

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
      {isAdmin && (
        <>
          <button className="w-drag vis">☰</button>
          <button className="w-del vis" onClick={e => { e.stopPropagation(); onDelete(project) }}>✕</button>
        </>
      )}

      <div className="wm">
        {project.media_url ? (
          project.media_type === 'video' ? (
            <video
              key={project.id}
              src={project.media_url}
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <img
              key={project.id}
              src={project.media_url}
              alt={project.title}
              loading="eager"
            />
          )
        ) : (
          <div className="wph">{project.emoji || '🎨'}</div>
        )}

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
  const projects = useDataStore(s => s.projects)
  const openModal = useUIStore(s => s.openModal)

  const filtered = useFilteredProjects(projects)

  const [lightbox, setLightbox] = useState({ open: false, project: null })
  const [dragFrom, setDragFrom] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const debouncedReorder = useDebounce(async (orderedIds) => {
    try {
      await reorderProjects(orderedIds)
      onToast?.('Urutan disimpan!', 'ok', '↕️')
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
      onToast?.('Karya dihapus.', '', '🗑️')
    } catch (e) {
      onToast?.(e.message, 'err')
    } finally {
      setConfirm(null)
    }
  }, [confirm, deleteProject, onToast])

  return (
    <>
      <div className="wgrid">
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
          <div className="mb">
            <div className="ci">🗑️</div>
            <div className="ct">Hapus karya ini?</div>
            <div className="cm">"{confirm.title}" akan dihapus permanen.</div>
            <div className="cr">
              <button onClick={() => setConfirm(null)}>Batal</button>
              <button onClick={confirmDelete}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Lightbox({ project, all, onClose }) {
  const [idx, setIdx] = useState(() => all.findIndex(p => p.id === project.id))

  const handleKey = useCallback(e => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + all.length) % all.length)
    if (e.key === 'ArrowRight') setIdx(i => (i + 1) % all.length)
  }, [all.length, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const p = all[idx]

  return (
    <div className="lb open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <button onClick={onClose}>✕</button>

      {p.media_type === 'video' ? (
        <video src={p.media_url} controls autoPlay />
      ) : (
        <img src={p.media_url} alt={p.title} />
      )}
    </div>
  )
}