// src/services/api.js

import { supabase } from '../lib/supabase'

function assertOk({ data, error }, context) {
  if (error) throw new Error(`[${context}] ${error.message}`)
  return data
}

/* ================================================================
   AUTH
================================================================ */
export const AuthService = {
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  onAuthChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => callback(event, session)
    )
    return subscription
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

  async reorder(orderedIds) {
    const updates = orderedIds.map((id, index) =>
      supabase.from('projects').update({ order_index: index }).eq('id', id)
    )
    await Promise.all(updates)
  },

  async uploadMedia(file) {
    const ext  = file.name.split('.').pop()
    const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(path, file, {
        cacheControl: '0',
        upsert: false,
      })

    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data } = supabase.storage
      .from('portfolio')
      .getPublicUrl(path)

    return data.publicUrl + '?t=' + Date.now()
  },

  subscribeToChanges(callback) {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        callback
      )
      .subscribe()

    return channel
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
   CONTENT
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
   PHOTOS
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
    const ext  = file.name.split('.').pop()
    const path = `photos/${type}.${ext}`

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(path, file, {
        cacheControl: '0',
        upsert: true,
      })

    if (error) throw new Error(`Photo upload failed: ${error.message}`)

    const { data } = supabase.storage
      .from('portfolio')
      .getPublicUrl(path)

    const url = data.publicUrl + '?t=' + Date.now()

    const col = type === 'profile' ? 'profile_url' : 'school_url'
    assertOk(
      await supabase.from('photos').update({ [col]: url }).eq('id', 1),
      'PhotoService.upload'
    )

    return url
  },
}