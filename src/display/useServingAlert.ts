import { useEffect, useRef, useState } from 'react'
import { newlyServing } from './queueView'
import { playChime } from './chime'

const FLASH_MS = 2500

export function useServingAlert(servingNumbers: string[]): boolean {
  const prev = useRef<string[]>(servingNumbers)
  const first = useRef(true)
  const [flashing, setFlashing] = useState(false)
  const key = servingNumbers.join('|')

  useEffect(() => {
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
      const t = setTimeout(() => setFlashing(false), FLASH_MS)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return flashing
}
