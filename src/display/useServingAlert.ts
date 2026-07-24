import { useEffect, useRef, useState } from 'react'
import { newlyServing } from './queueView'
import { playChime } from './chime'

const FLASH_MS = 2500

export function useServingAlert(servingNumbers: string[], primed = true): boolean {
  const prev = useRef<string[]>(servingNumbers)
  const first = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashing, setFlashing] = useState(false)
  const key = servingNumbers.join('|')

  useEffect(() => {
    if (!primed) return
    if (first.current) {
      first.current = false
      prev.current = servingNumbers
      return
    }
    const fresh = newlyServing(prev.current, servingNumbers)
    prev.current = servingNumbers
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
