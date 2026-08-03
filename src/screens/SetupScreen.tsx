import { useState } from 'react'
import { BOOTH_IDS, MODES, STATIONS, type BoothId, type Mode, type Station } from '../domain/types'
import { saveDeviceConfig, isConfigValid, type DeviceConfig } from '../device/deviceConfig'
import { L } from '../i18n/labels'
import { BiLabel } from '../i18n/BiLabel'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

const ChoiceChip = ({
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
    className={`min-h-[44px] min-w-[44px] rounded-xl px-5 py-3 font-kanit border-2 transition-colors ${
      active
        ? 'bg-phantom-orange/15 border-phantom-orange text-phantom-text'
        : 'border-phantom-line text-phantom-text hover:border-phantom-orange/40'
    }`}
  >
    {children}
  </button>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 font-kanit text-sm font-semibold uppercase tracking-wide text-phantom-muted">
    {children}
  </p>
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl flex flex-col gap-8">
        <h1 className="font-kanit text-3xl text-phantom-yellow text-center">
          {L('setup.title').th} · {L('setup.title').en}
        </h1>

        <Panel className="flex flex-col gap-8">
          <section>
            <SectionLabel>
              <BiLabel k="setup.chooseBooth" />
            </SectionLabel>
            <div className="flex flex-wrap gap-3">
              {BOOTH_IDS.map((b) => (
                <ChoiceChip key={b} active={booth === b} onClick={() => setBooth(b)}>
                  <BiLabel k={`booth.${b}`} />
                </ChoiceChip>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>
              <BiLabel k="setup.chooseMode" />
            </SectionLabel>
            <div className="flex flex-wrap gap-3">
              {MODES.map((m) => (
                <ChoiceChip
                  key={m}
                  active={mode === m}
                  onClick={() => {
                    setMode(m)
                    if (m !== 'order') setStation(undefined)
                  }}
                >
                  <BiLabel k={`mode.${m}`} />
                </ChoiceChip>
              ))}
            </div>
          </section>

          {mode === 'order' && (
            <section>
              <SectionLabel>
                <BiLabel k="setup.chooseStation" />
              </SectionLabel>
              <div className="flex flex-wrap gap-3">
                {STATIONS.map((s) => (
                  <ChoiceChip key={s} active={station === s} onClick={() => setStation(s)}>
                    {s}
                  </ChoiceChip>
                ))}
              </div>
            </section>
          )}

          <Button
            variant="primary"
            onClick={confirm}
            disabled={!valid}
            className="w-full text-lg"
          >
            {L('setup.confirm').th} · {L('setup.confirm').en}
          </Button>
        </Panel>
      </div>
    </div>
  )
}
