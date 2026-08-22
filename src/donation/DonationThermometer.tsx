import { L } from '../i18n/labels'
import { donationProgress } from './donationProgress'

/**
 * The donation thermometer: how much has been raised, and how far that is
 * along the goal.
 *
 * Deliberately position-agnostic — it draws a self-contained card and lets the
 * screen decide where that card sits. The Display parks it in a corner so it
 * cannot push the queue off centre; HQ drops it into the normal page flow.
 *
 * `variant` only scales type and spacing. Both variants render the same
 * elements with the same testids, so the two screens can never drift into
 * showing different things.
 */
export function DonationThermometer({
  amount,
  target,
  variant,
}: {
  amount: number
  target?: number | null
  variant: 'display' | 'hq'
}) {
  const { pct, barPct, target: goal } = donationProgress(amount, target)
  const big = variant === 'hq'

  return (
    <div
      data-testid="donation-thermometer"
      className={`flex flex-col gap-2 rounded-2xl border border-phantom-line bg-phantom-surface2 ${
        big ? 'px-5 py-4' : 'px-4 py-3'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={`font-kanit font-semibold text-phantom-muted ${big ? 'text-base' : 'text-sm'}`}>
          {L('dashboard.netDonation').th}
          <span className={`ml-1.5 font-normal text-phantom-muted/70 ${big ? 'text-sm' : 'text-xs'}`}>
            {L('dashboard.netDonation').en}
          </span>
        </span>
        <span
          data-testid="donation-amount"
          className={`font-mono font-extrabold text-phantom-yellow ${big ? 'text-3xl' : 'text-xl'}`}
        >
          {amount}฿
        </span>
      </div>

      {barPct !== null && (
        <>
          <div
            data-testid="donation-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(barPct)}
            className={`w-full overflow-hidden rounded-full bg-phantom-bg ${big ? 'h-4' : 'h-2.5'}`}
          >
            {/* The width has to be an inline style: it is a runtime number, so
                there is no Tailwind class that could carry it. */}
            <div
              data-testid="donation-fill"
              style={{ width: `${barPct}%` }}
              className="h-full rounded-full bg-phantom-yellow transition-[width] duration-500"
            />
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            {/* Floored, never rounded: at 99.6% of the goal this must still read
                99%, because "100%" on a fundraiser board is a claim that the
                goal has actually been reached. */}
            <span
              data-testid="donation-pct"
              className={`font-mono font-bold text-phantom-yellow ${big ? 'text-xl' : 'text-sm'}`}
            >
              {Math.floor(pct as number)}%
            </span>
            <span
              data-testid="donation-target"
              className={`font-kanit text-phantom-muted ${big ? 'text-sm' : 'text-xs'}`}
            >
              {L('donation.goal').th}
              <span className="ml-1 text-phantom-muted/70">{L('donation.goal').en}</span> {goal}฿
            </span>
          </div>
        </>
      )}
    </div>
  )
}
