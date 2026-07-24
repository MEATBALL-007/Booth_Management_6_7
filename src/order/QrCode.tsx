import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ payload }: { payload: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(payload, { width: 240, margin: 1 })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc('') })
    return () => { alive = false }
  }, [payload])

  if (!src) return <div className="text-sm opacity-70">กำลังสร้าง QR… / Generating…</div>
  return <img src={src} alt="PromptPay QR" width={240} height={240} className="rounded-lg bg-white p-2" />
}
