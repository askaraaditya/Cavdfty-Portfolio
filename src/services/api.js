// src/services/api.js
//
// ALL Supabase calls live here. Components and stores never import
// supabase directly — they call these service functions.
// This means: if Supabase changes, only this file changes.

import { supabase } from '../lib/supabase'

/* ── helpers ───────────────────────────────────────────────── */
function assertOk({ data, error }, context) {
  if (error) throw new Error(`[${context}] ${error.message}`)
  return data
}

/* ================================================================
   AUTH
   ================================================================ */
export const AuthService = {
  // Called on app mount — restores session from cookie/localStorage
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Returns { session, user } on success; throws on failure
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  // Listener for auth state changes (token refresh, signout from other tab)
  onAuthChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => callback(event, session)
    )
    return subscription // call subscription.unsubscribe() to clean up
  },
}

/* ================================================================
   PROJECTS
   ================================================================ */
export const ProjectService = {
  async getAll() {
    const data = assertOk(
      await supabase.from('projects').select('*').order('order_index', { ascending: true }),
      'ProjectService.getAll'
    )
    return data ?? []
  },

  async insert(project) {
    const data = assertOk(
      await supabase.from('projects').insert(project).select().single(),
      'ProjectService.insert'
    )
    return data
  },

  async update(id, patch) {
    const data = assertOk(
      await supabase.from('projects').update(patch).eq('id', id).select().single(),
      'ProjectService.update'
    )
    return data
  },

  async delete(id) {
    assertOk(
      await supabase.from('projects').delete().eq('id', id),
      'ProjectService.delete'
    )
  },

  // Batch-update order_index for all items after a drag-drop
  async reorder(orderedIds) {
    const updates = orderedIds.map((id, index) =>
      supabase.from('projects').update({ order_index: index }).eq('id', id)
    )
    await Promise.all(updates)
  },

  // Upload file → Supabase Storage → return public URL
  async uploadMedia(file) {
    const ext  = file.name.split('.').pop()
    const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from('portfolio')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(data.path)

    return publicUrl
  },

  // Real-time subscription for project changes
  subscribeToChanges(callback) {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        callback
      )
      .subscribe()

    return channel // call supabase.removeChannel(channel) to unsubscribe
  },
}

/* ================================================================
   SOCIALS
   ================================================================ */
export const SocialService = {
  async getAll() {
    const data = assertOk(
      await supabase.from('socials').select('*').order('order_index', { ascending: true }),
      'SocialService.getAll'
    )
    return data ?? []
  },

  async insert(social) {
    const data = assertOk(
      await supabase.from('socials').insert(social).select().single(),
      'SocialService.insert'
    )
    return data
  },

  async delete(id) {
    assertOk(
      await supabase.from('socials').delete().eq('id', id),
      'SocialService.delete'
    )
  },

  subscribeToChanges(callback) {
    const channel = supabase
      .channel('socials-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socials' }, callback)
      .subscribe()
    return channel
  },
}

/* ================================================================
   CONTENT (singleton row, id = 1)
   ================================================================ */
export const ContentService = {
  async get() {
    const data = assertOk(
      await supabase.from('content').select('*').single(),
      'ContentService.get'
    )
    return data
  },

  async update(patch) {
    const data = assertOk(
      await supabase.from('content').update(patch).eq('id', 1).select().single(),
      'ContentService.update'
    )
    return data
  },

  subscribeToChanges(callback) {
    const channel = supabase
      .channel('content-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'content' }, callback)
      .subscribe()
    return channel
  },
}

/* ================================================================
   PHOTOS (singleton row, id = 1)
   ================================================================ */
export const PhotoService = {
  async get() {
    const data = assertOk(
      await supabase.from('photos').select('*').single(),
      'PhotoService.get'
    )
    return data
  },

  async upload(type, file) {
    // type: 'profile' | 'school'
    const ext  = file.name.split('.').pop()
    const path = `photos/${type}.${ext}`

    // upsert: true → replaces if exists
    const { data, error } = await supabase.storage
      .from('portfolio')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    if (error) throw new Error(`Photo upload failed: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(data.path)

    // Bust cache with timestamp
    const url = `${publicUrl}?t=${Date.now()}`

    const col = type === 'profile' ? 'profile_url' : 'school_url'
    assertOk(
      await supabase.from('photos').update({ [col]: url }).eq('id', 1),
      'PhotoService.upload'
    )

    return url
  },
}
