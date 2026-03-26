import { useCallback, useRef, useState } from 'react'
import { useAuthStore, useUIStore } from '../store'

export function useFilteredProjects(projects) {
  const activeFilter = useUIStore(s => s.activeFilter)

  return (projects || [])
    .filter(p => activeFilter === 'all' || p.category === activeFilter)
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
}

export function useGuard() {
  const isAdmin = useAuthStore(s => s.isAdmin)

  return useCallback(
    (fn) =>
      (...args) => {
        if (!isAdmin) throw new Error('Unauthorized')
        return fn(...args)
      },
    [isAdmin]
  )
}

export function useDebounce(fn, delay) {
  const timer = useRef(null)

  return useCallback(
    (...args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => fn(...args), delay)
    },
    [fn, delay]
  )
}

export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, run }
}