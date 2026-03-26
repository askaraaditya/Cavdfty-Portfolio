// src/store/index.js
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  AuthService,
  ProjectService,
  SocialService,
  ContentService,
  PhotoService,
} from '../services/api'
import { supabase } from '../lib/supabase'

/* ================================================================
   AUTH STORE
   ================================================================ */
export const useAuthStore = create(
  immer((set) => ({
    session:  null,
    isAdmin:  false,
    loading:  true,
    error:    null,

    init: async () => {
      // Restore session from Supabase cookie
      const session = await AuthService.getSession()
      set(s => { s.session = session; s.isAdmin = !!session; s.loading = false })

      // Listen for auth changes: token refresh, sign-out from other tab
      AuthService.onAuthChange((event, session) => {
        set(s => { s.session = session; s.isAdmin = !!session })
      })
    },

    signIn: async (email, password) => {
      set(s => { s.error = null })
      try {
        const { session } = await AuthService.signIn(email, password)
        set(s => { s.session = session; s.isAdmin = true })
        return true
      } catch (err) {
        set(s => { s.error = err.message })
        return false
      }
    },

    signOut: async () => {
      await AuthService.signOut()
      set(s => { s.session = null; s.isAdmin = false })
    },
  }))
)

/* ================================================================
   DATA STORE — projects, socials, content, photos
   ================================================================ */
export const useDataStore = create(
  immer((set, get) => ({
    projects: [],
    socials:  [],
    content:  null,
    photos:   { profile_url: null, school_url: null },
    loading:  false,

    /* ── LOAD ALL ───────────────────────────────────────────── */
    loadAll: async () => {
      set(s => { s.loading = true })
      const [projects, socials, content, photos] = await Promise.all([
        ProjectService.getAll(),
        SocialService.getAll(),
        ContentService.get(),
        PhotoService.get(),
      ])
      set(s => {
        s.projects = projects
        s.socials  = socials
        s.content  = content
        s.photos   = photos ?? { profile_url: null, school_url: null }
        s.loading  = false
      })
    },

    /* ── REALTIME SETUP ─────────────────────────────────────── */
    // Call once on mount. Returns cleanup function for useEffect.
    subscribeRealtime: () => {
      const projectChannel = ProjectService.subscribeToChanges((payload) => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') {
            s.projects = [...s.projects, row].sort((a,b) => a.order_index - b.order_index)
          } else if (eventType === 'UPDATE') {
            s.projects = s.projects.map(p => p.id === row.id ? row : p)
              .sort((a,b) => a.order_index - b.order_index)
          } else if (eventType === 'DELETE') {
            s.projects = s.projects.filter(p => p.id !== old.id)
          }
        })
      })

      const socialChannel = SocialService.subscribeToChanges((payload) => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT')       s.socials = [...s.socials, row]
          else if (eventType === 'UPDATE')  s.socials = s.socials.map(x => x.id === row.id ? row : x)
          else if (eventType === 'DELETE')  s.socials = s.socials.filter(x => x.id !== old.id)
        })
      })

      const contentChannel = ContentService.subscribeToChanges((payload) => {
        set(s => { s.content = payload.new })
      })

      // Cleanup: remove all realtime channels on unmount
      return () => {
        supabase.removeChannel(projectChannel)
        supabase.removeChannel(socialChannel)
        supabase.removeChannel(contentChannel)
      }
    },

    /* ── PROJECTS ───────────────────────────────────────────── */
    addProject: async (projectData, file) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')

      // 1. Upload file to Storage → get URL
      const mediaUrl  = await ProjectService.uploadMedia(file)
      const mediaType = file.type.startsWith('video') ? 'video' : 'image'

      // 2. Insert row (realtime will update state automatically)
      const newProject = await ProjectService.insert({
        ...projectData,
        media_url:   mediaUrl,
        media_type:  mediaType,
        order_index: 0,
      })

      return newProject
    },

    deleteProject: async (id) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      // Optimistic delete
      const snapshot = get().projects
      set(s => { s.projects = s.projects.filter(p => p.id !== id) })
      try {
        await ProjectService.delete(id)
      } catch (err) {
        set(s => { s.projects = snapshot }) // rollback
        throw err
      }
    },

    reorderProjects: async (orderedIds) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      // Optimistic reorder
      set(s => {
        const map = Object.fromEntries(s.projects.map(p => [p.id, p]))
        s.projects = orderedIds.map((id, i) => ({ ...map[id], order_index: i }))
      })
      await ProjectService.reorder(orderedIds)
    },

    /* ── SOCIALS ────────────────────────────────────────────── */
    addSocial: async (socialData) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      await SocialService.insert({
        ...socialData,
        order_index: get().socials.length,
      })
      // Realtime handles state update
    },

    deleteSocial: async (id) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      const snapshot = get().socials
      set(s => { s.socials = s.socials.filter(x => x.id !== id) })
      try {
        await SocialService.delete(id)
      } catch (err) {
        set(s => { s.socials = snapshot })
        throw err
      }
    },

    /* ── CONTENT ────────────────────────────────────────────── */
    updateContent: async (patch) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      const snapshot = get().content
      set(s => { s.content = { ...s.content, ...patch } })
      try {
        await ContentService.update(patch)
        // Realtime confirms the update globally
      } catch (err) {
        set(s => { s.content = snapshot })
        throw err
      }
    },

    /* ── PHOTOS ─────────────────────────────────────────────── */
    uploadPhoto: async (type, file) => {
      if (!useAuthStore.getState().isAdmin) throw new Error('Unauthorized')
      const url = await PhotoService.upload(type, file)
      const col = type === 'profile' ? 'profile_url' : 'school_url'
      set(s => { s.photos[col] = url })
      return url
    },
  }))
)

/* ================================================================
   UI STORE — transient, never persisted
   ================================================================ */
export const useUIStore = create((set) => ({
  activeFilter: 'all',
  modal:        null,  // 'login' | 'upload' | 'edit-hero' | 'edit-about' | 'edit-study' | 'socials'
  uploading:    false,
  uploadProgress: 0,

  setFilter:       (f)    => set({ activeFilter: f }),
  openModal:       (name) => set({ modal: name }),
  closeModal:      ()     => set({ modal: null }),
  setUploading:    (v, p) => set({ uploading: v, uploadProgress: p ?? 0 }),
}))
