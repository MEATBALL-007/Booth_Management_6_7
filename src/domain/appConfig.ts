// Deployment-specific values. The real ones live in `.env` (gitignored) and are
// injected at build time — they are deliberately not in source, because this
// repository is public and the PromptPay id is a personal phone number.
//
// This is a client-side app: whatever lands here is compiled into the shipped
// bundle and is readable by anyone using the deployed site. `dashboardPin` is
// therefore a convenience gate against mis-taps, NOT a security control — the
// thing that actually protects the data is `firestore.rules`.
export const APP_CONFIG = {
  promptpayId: import.meta.env.VITE_PROMPTPAY_ID ?? '',
  dashboardPin: import.meta.env.VITE_DASHBOARD_PIN ?? '',
} as const
