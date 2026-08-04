import { useEffect, useRef, useState } from 'react'
import { newlyAnnounced, type ServingSig } from './queueView'
import { playChime } from './chime'

const FLASH_MS = 2500

export function useServingAlert(serving: ServingSig[], primed = true): boolean {
  const prev = useRef<ServingSig[]>(serving)
  const first = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashing, setFlashing] = useState(false)
  const key = serving.map((s) => `${s.n}@${s.announcedAt}`).join('|')

  useEffect(() => {
    if (!primed) return
    if (first.current) {
      first.current = false
      prev.current = serving
      return
    }
    const fresh = newlyAnnounced(prev.current, serving)
    prev.current = serving
    if (fresh.length > 0) {
      playChime()
      setFlashing(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setFlashing(false), FLASH_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, primed])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return flashing
}
