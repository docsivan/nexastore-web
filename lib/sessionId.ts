export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('haya_session_id')
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('haya_session_id', id)
  }
  return id
}
