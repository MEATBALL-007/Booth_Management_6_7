import '@testing-library/jest-dom'

// Tests must never depend on the real deployment values — those live in `.env`,
// which is gitignored and absent on a fresh clone. Fixed fakes keep the suite
// deterministic and keep real identifiers out of the repository.
const env = import.meta.env as unknown as Record<string, string>
env.VITE_PROMPTPAY_ID = '0000000000'
env.VITE_DASHBOARD_PIN = '1234'
