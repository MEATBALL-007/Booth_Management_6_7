import { useState } from 'react'
import { BOOTH_IDS, MODES, STATIONS, type BoothId, type Mode, type Station } from '../domain/types'
import { saveDeviceConfig, isConfigValid, type DeviceConfig } from '../device/deviceConfig'
import { L } from '../i18n/labels'
import { BiLabel } from '../i18n/BiLabel'

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    className={`rounded-xl px-4 py-3 font-kanit border-2 ${
      active
        ? 'bg-phantom-orange border-phantom-orange text-white'
        : 'border-white/20 text-white'
    }`}
  >
    {children}
  </button>
)

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const [booth, setBooth] = useState<BoothId | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [station, setStation] = useState<Station | undefined>(undefined)

  const draft: DeviceConfig | null =
    booth && mode ? { booth, mode, station } : null
  const valid = draft ? isConfigValid(draft) : false

  const confirm = () => {
    if (!draft || !valid) return
    saveDeviceConfig(draft)
    onDone()
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6 max-w-xl mx-auto">
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('setup.title').th} · {L('setup.title').en}
      </h1>

      <section>
        <p className="mb-2 opacity-80">
          <BiLabel k="setup.chooseBooth" />
        </p>
        <div className="flex flex-wrap gap-3">
          {BOOTH_IDS.map((b) => (
            <Chip key={b} active={booth === b} onClick={() => setBooth(b)}>
              <BiLabel k={`booth.${b}`} />
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 opacity-80">
          <BiLabel k="setup.chooseMode" />
        </p>
        <div className="flex flex-wrap gap-3">
          {MODES.map((m) => (
            <Chip
              key={m}
              active={mode === m}
              onClick={() => {
                setMode(m)
                if (m !== 'order') setStation(undefined)
              }}
            >
              <BiLabel k={`mode.${m}`} />
            </Chip>
          ))}
        </div>
      </section>

      {mode === 'order' && (
        <section>
          <p className="mb-2 opacity-80">
            <BiLabel k="setup.chooseStation" />
          </p>
          <div className="flex gap-3">
            {STATIONS.map((s) => (
              <Chip key={s} active={station === s} onClick={() => setStation(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <button
        onClick={confirm}
        disabled={!valid}
        className="mt-auto rounded-xl py-4 font-kanit text-lg bg-phantom-yellow text-phantom-bg disabled:opacity-40"
      >
        {L('setup.confirm').th} · {L('setup.confirm').en}
      </button>
    </div>
  )
}
