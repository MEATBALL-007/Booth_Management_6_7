# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the PWA shell — a booting React+Vite+TS app with the PHANTOM CREW theme, Firestore (offline-enabled) at the edges, bilingual labels, and a Setup screen that picks booth/mode/station and remembers it — so every later plan has a foundation to build on.

**Architecture:** Vite + React + TypeScript app. Business logic lives in pure, unit-tested functions (`src/domain/`); Firestore is initialized once (`src/lib/firebase.ts`) and used only at the edges. Device choice (booth/mode/station) is persisted to `localStorage` via a small typed store and drives which screen renders. Firestore uses `persistentLocalCache` so reads/writes survive offline.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Firebase (Firestore) v10+, vite-plugin-pwa, Vitest + @testing-library/react + jsdom.

## Global Constraints

- **Stack (locked by base spec):** React + Vite + TypeScript · Tailwind CSS · Firebase Firestore (realtime + `persistentLocalCache` offline) · Firebase Hosting · vite-plugin-pwa. Do not introduce other backends/services.
- **Theme PHANTOM CREW:** primary orange `#FA4616` · accent yellow `#FFC72C` · bg black `#1A1A1A` · text white. Dark theme.
- **Fonts:** Kanit (headings) · Sarabun (body) · JetBrains Mono (numbers/queue codes) — Google Fonts.
- **Bilingual:** every user-facing label shows Thai **and** English (paired).
- **No login:** app opens straight to Setup; choice saved to `localStorage`, changeable in settings later.
- **Booth IDs:** `"photo" | "portrait" | "drinks"`. **Modes:** `"order" | "display" | "dashboard"`. **Stations:** `"A" | "B" | "C"`.
- **PromptPay ID (for later plans):** `REDACTED-PROMPTPAY-ID`. **Dashboard PIN:** `REDACTED-PIN`.
- **Testing:** Vitest. Pure domain logic gets plain unit tests; components get @testing-library/react tests with jsdom. Commit after each task.

---

### Task 1: Project scaffold + test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a runnable Vite app; `App` React component (default export from `src/App.tsx`); working `npm test` (Vitest + jsdom).

- [ ] **Step 1: Scaffold and install deps**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Write the failing test `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('App renders the project name', () => {
  render(<App />)
  expect(screen.getByText(/สายสัมพันธ์/)).toBeInTheDocument()
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — App does not contain the text yet.

- [ ] **Step 7: Replace `src/App.tsx` with minimal content**

```tsx
export default function App() {
  return <h1>ระบบงานสายสัมพันธ์ · Sai Samphan</h1>
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS app with Vitest harness"
```

---

### Task 2: PHANTOM CREW theme (Tailwind + fonts)

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css`
- Modify: `src/main.tsx` (import `./index.css`), `index.html` (Google Fonts links)
- Test: `src/theme.test.ts`

**Interfaces:**
- Consumes: Task 1 app shell.
- Produces: Tailwind classes `bg-phantom-bg`, `text-phantom-orange`, `text-phantom-yellow`, font families `font-kanit`, `font-sarabun`, `font-mono`; exported `THEME` constant from `src/theme.ts`.

- [ ] **Step 1: Install Tailwind**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Write the failing test `src/theme.test.ts`**

```ts
import { THEME } from './theme'

test('PHANTOM CREW palette is exact', () => {
  expect(THEME.orange).toBe('#FA4616')
  expect(THEME.yellow).toBe('#FFC72C')
  expect(THEME.bg).toBe('#1A1A1A')
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/theme.ts` does not exist.

- [ ] **Step 4: Create `src/theme.ts`**

```ts
export const THEME = {
  orange: '#FA4616',
  yellow: '#FFC72C',
  bg: '#1A1A1A',
  text: '#FFFFFF',
} as const
```

- [ ] **Step 5: Configure `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'phantom-orange': '#FA4616',
        'phantom-yellow': '#FFC72C',
        'phantom-bg': '#1A1A1A',
      },
      fontFamily: {
        kanit: ['Kanit', 'sans-serif'],
        sarabun: ['Sarabun', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 6: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-phantom-bg text-white font-sarabun; }
```

- [ ] **Step 7: Wire up fonts + css**

In `index.html` `<head>` add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Sarabun:wght@400;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
```
In `src/main.tsx` add near the top: `import './index.css'`.

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add PHANTOM CREW theme (Tailwind palette + fonts)"
```

---

### Task 3: Domain types (Firestore schema)

**Files:**
- Create: `src/domain/types.ts`
- Test: `src/domain/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: exported types `BoothId`, `Mode`, `Station`, `Order`, `Product`, `OrderItem`, `PaymentMethod`, `OrderStatus`, `PaymentStatus`, `Expense`, `InventoryItem`, `GlobalConfig`; constants `BOOTH_IDS`, `MODES`, `STATIONS`.

- [ ] **Step 1: Write the failing test `src/domain/types.test.ts`**

```ts
import { BOOTH_IDS, MODES, STATIONS } from './types'

test('domain enums match the spec', () => {
  expect(BOOTH_IDS).toEqual(['photo', 'portrait', 'drinks'])
  expect(MODES).toEqual(['order', 'display', 'dashboard'])
  expect(STATIONS).toEqual(['A', 'B', 'C'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/domain/types.ts` does not exist.

- [ ] **Step 3: Create `src/domain/types.ts`**

```ts
export const BOOTH_IDS = ['photo', 'portrait', 'drinks'] as const
export const MODES = ['order', 'display', 'dashboard'] as const
export const STATIONS = ['A', 'B', 'C'] as const

export type BoothId = (typeof BOOTH_IDS)[number]
export type Mode = (typeof MODES)[number]
export type Station = (typeof STATIONS)[number]

export type PaymentMethod = 'cash' | 'qr'
export type PaymentStatus = 'pending' | 'paid'
export type OrderStatus = 'waiting' | 'serving' | 'done' | 'cancelled'

export interface OrderItem {
  sku: string
  name: string
  qty: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  boothId: BoothId
  queueNumber: string
  station: Station
  items: OrderItem[]
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: OrderStatus
  staffName?: string
  servedBy?: string
  cancelReason?: string
  createdAt: number
  paidAt?: number
  servingAt?: number
  doneAt?: number
}

export interface Product {
  sku: string
  boothId: BoothId
  name: string
  nameEn: string
  price: number
  cost: number
  active: boolean
}

export interface Expense {
  id: string
  boothId: BoothId
  description: string
  amount: number
  createdAt: number
}

export interface InventoryItem {
  id: string
  boothId: BoothId
  name: string
  unit: string
  stock: number
  lowThreshold: number
  linkedSku?: string
}

export interface GlobalConfig {
  promptpayId: string
  dashboardPin: string
  donationTarget?: number
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add domain types matching Firestore schema"
```

---

### Task 4: Firebase init with offline persistence

**Files:**
- Create: `src/lib/firebase.ts`, `.env.example`
- Modify: `src/vite-env.d.ts` (typed env)
- Test: `src/lib/firebase.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: exported `db` (Firestore instance) and `getFirebaseConfig()` from `src/lib/firebase.ts`. `db` is created with `initializeFirestore(app, { localCache: persistentLocalCache(...) })`.

- [ ] **Step 1: Install Firebase**

Run: `npm install firebase`

- [ ] **Step 2: Create `.env.example`**

```
VITE_FB_API_KEY=your-api-key
VITE_FB_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FB_PROJECT_ID=your-project-id
VITE_FB_STORAGE_BUCKET=your-project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=000000000000
VITE_FB_APP_ID=1:000:web:abc
```

- [ ] **Step 3: Type the env in `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FB_API_KEY: string
  readonly VITE_FB_AUTH_DOMAIN: string
  readonly VITE_FB_PROJECT_ID: string
  readonly VITE_FB_STORAGE_BUCKET: string
  readonly VITE_FB_MESSAGING_SENDER_ID: string
  readonly VITE_FB_APP_ID: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 4: Write the failing test `src/lib/firebase.test.ts`**

```ts
import { getFirebaseConfig } from './firebase'

test('getFirebaseConfig reads all required VITE_FB_ keys', () => {
  const cfg = getFirebaseConfig()
  expect(cfg).toHaveProperty('projectId')
  expect(cfg).toHaveProperty('apiKey')
  expect(cfg).toHaveProperty('appId')
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/lib/firebase.ts` does not exist.

- [ ] **Step 6: Create `src/lib/firebase.ts`**

```ts
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

export function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FB_APP_ID,
  }
}

const app = initializeApp(getFirebaseConfig())

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS. (Env values are empty strings in test, but the keys resolve — the assertions check property presence.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: init Firebase Firestore with persistent offline cache"
```

---

### Task 5: Bilingual label helper (i18n)

**Files:**
- Create: `src/i18n/labels.ts`, `src/i18n/BiLabel.tsx`
- Test: `src/i18n/labels.test.ts`, `src/i18n/BiLabel.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `L(key)` returning `{ th, en }` from `src/i18n/labels.ts`; `<BiLabel k="..." />` component rendering both languages (`th` primary line, `en` secondary line).

- [ ] **Step 1: Write the failing test `src/i18n/labels.test.ts`**

```ts
import { L } from './labels'

test('L returns a th/en pair', () => {
  expect(L('setup.chooseBooth')).toEqual({
    th: 'เลือกซุ้ม',
    en: 'Choose booth',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/i18n/labels.ts` does not exist.

- [ ] **Step 3: Create `src/i18n/labels.ts`**

```ts
const LABELS = {
  'setup.title': { th: 'ตั้งค่าเครื่อง', en: 'Device setup' },
  'setup.chooseBooth': { th: 'เลือกซุ้ม', en: 'Choose booth' },
  'setup.chooseMode': { th: 'เลือกโหมด', en: 'Choose mode' },
  'setup.chooseStation': { th: 'เลือกเครื่อง (station)', en: 'Choose station' },
  'setup.confirm': { th: 'ยืนยัน', en: 'Confirm' },
  'booth.photo': { th: 'โฟโต้บูธ', en: 'Photo booth' },
  'booth.portrait': { th: 'วาดภาพเสมือน', en: 'Caricature' },
  'booth.drinks': { th: 'น้ำปั่น', en: 'Blended drinks' },
  'mode.order': { th: 'รับออเดอร์', en: 'Order station' },
  'mode.display': { th: 'จอโชว์คิว', en: 'Display' },
  'mode.dashboard': { th: 'แดชบอร์ด', en: 'Dashboard' },
} as const

export type LabelKey = keyof typeof LABELS

export function L(key: LabelKey): { th: string; en: string } {
  return LABELS[key]
}
```

- [ ] **Step 4: Write the failing test `src/i18n/BiLabel.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { BiLabel } from './BiLabel'

test('BiLabel shows both Thai and English', () => {
  render(<BiLabel k="setup.chooseBooth" />)
  expect(screen.getByText('เลือกซุ้ม')).toBeInTheDocument()
  expect(screen.getByText('Choose booth')).toBeInTheDocument()
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/i18n/BiLabel.tsx` does not exist.

- [ ] **Step 6: Create `src/i18n/BiLabel.tsx`**

```tsx
import { L, type LabelKey } from './labels'

export function BiLabel({ k }: { k: LabelKey }) {
  const { th, en } = L(k)
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="font-kanit">{th}</span>
      <span className="text-xs opacity-70">{en}</span>
    </span>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add bilingual label helper and BiLabel component"
```

---

### Task 6: Device config store (localStorage)

**Files:**
- Create: `src/device/deviceConfig.ts`
- Test: `src/device/deviceConfig.test.ts`

**Interfaces:**
- Consumes: `BoothId`, `Mode`, `Station` from `src/domain/types.ts`.
- Produces: `type DeviceConfig = { booth: BoothId; mode: Mode; station?: Station }`; `loadDeviceConfig(): DeviceConfig | null`; `saveDeviceConfig(cfg: DeviceConfig): void`; `clearDeviceConfig(): void`; `isConfigValid(cfg): boolean` (order mode requires a station).

- [ ] **Step 1: Write the failing test `src/device/deviceConfig.test.ts`**

```ts
import {
  saveDeviceConfig,
  loadDeviceConfig,
  clearDeviceConfig,
  isConfigValid,
} from './deviceConfig'

beforeEach(() => localStorage.clear())

test('save then load round-trips the config', () => {
  saveDeviceConfig({ booth: 'drinks', mode: 'order', station: 'A' })
  expect(loadDeviceConfig()).toEqual({ booth: 'drinks', mode: 'order', station: 'A' })
})

test('load returns null when nothing saved', () => {
  expect(loadDeviceConfig()).toBeNull()
})

test('clear removes the config', () => {
  saveDeviceConfig({ booth: 'photo', mode: 'display' })
  clearDeviceConfig()
  expect(loadDeviceConfig()).toBeNull()
})

test('order mode requires a station', () => {
  expect(isConfigValid({ booth: 'photo', mode: 'order' })).toBe(false)
  expect(isConfigValid({ booth: 'photo', mode: 'order', station: 'B' })).toBe(true)
  expect(isConfigValid({ booth: 'photo', mode: 'display' })).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/device/deviceConfig.ts` does not exist.

- [ ] **Step 3: Create `src/device/deviceConfig.ts`**

```ts
import type { BoothId, Mode, Station } from '../domain/types'

const KEY = 'phantom.device'

export interface DeviceConfig {
  booth: BoothId
  mode: Mode
  station?: Station
}

export function saveDeviceConfig(cfg: DeviceConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function loadDeviceConfig(): DeviceConfig | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DeviceConfig
  } catch {
    return null
  }
}

export function clearDeviceConfig(): void {
  localStorage.removeItem(KEY)
}

export function isConfigValid(cfg: DeviceConfig): boolean {
  if (cfg.mode === 'order') return !!cfg.station
  return true
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add device config store (localStorage booth/mode/station)"
```

---

### Task 7: Setup screen

**Files:**
- Create: `src/screens/SetupScreen.tsx`
- Test: `src/screens/SetupScreen.test.tsx`

**Interfaces:**
- Consumes: `BOOTH_IDS`, `MODES`, `STATIONS` from types; `saveDeviceConfig`, `isConfigValid` from deviceConfig; `BiLabel` / `L` from i18n.
- Produces: `<SetupScreen onDone={() => void} />` — user picks booth + mode (+ station when mode is order), Confirm is disabled until `isConfigValid`, on Confirm it saves config and calls `onDone`.

- [ ] **Step 1: Write the failing test `src/screens/SetupScreen.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupScreen } from './SetupScreen'
import { loadDeviceConfig } from '../device/deviceConfig'

beforeEach(() => localStorage.clear())

test('confirm is disabled until a valid choice is made', async () => {
  const user = userEvent.setup()
  render(<SetupScreen onDone={() => {}} />)

  const confirm = screen.getByRole('button', { name: /ยืนยัน/ })
  expect(confirm).toBeDisabled()

  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  expect(confirm).toBeEnabled()
})

test('confirming an order station saves booth+mode+station and calls onDone', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<SetupScreen onDone={onDone} />)

  await user.click(screen.getByRole('button', { name: /โฟโต้บูธ/ }))
  await user.click(screen.getByRole('button', { name: /รับออเดอร์/ }))
  await user.click(screen.getByRole('button', { name: /^A$/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  expect(loadDeviceConfig()).toEqual({ booth: 'photo', mode: 'order', station: 'A' })
  expect(onDone).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/screens/SetupScreen.tsx` does not exist.

- [ ] **Step 3: Create `src/screens/SetupScreen.tsx`**

```tsx
import { useState } from 'react'
import { BOOTH_IDS, MODES, STATIONS, type BoothId, type Mode, type Station } from '../domain/types'
import { saveDeviceConfig, isConfigValid, type DeviceConfig } from '../device/deviceConfig'
import { L } from '../i18n/labels'

const boothLabel = (b: BoothId) => L(`booth.${b}`)
const modeLabel = (m: Mode) => L(`mode.${m}`)

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

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6 max-w-xl mx-auto">
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('setup.title').th} · {L('setup.title').en}
      </h1>

      <section>
        <p className="mb-2 opacity-80">{L('setup.chooseBooth').th}</p>
        <div className="flex flex-wrap gap-3">
          {BOOTH_IDS.map((b) => (
            <Chip key={b} active={booth === b} onClick={() => setBooth(b)}>
              {boothLabel(b).th}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 opacity-80">{L('setup.chooseMode').th}</p>
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
              {modeLabel(m).th}
            </Chip>
          ))}
        </div>
      </section>

      {mode === 'order' && (
        <section>
          <p className="mb-2 opacity-80">{L('setup.chooseStation').th}</p>
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
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Setup screen (choose booth/mode/station)"
```

---

### Task 8: App shell routing by mode + PWA config

**Files:**
- Modify: `src/App.tsx`, `vite.config.ts`
- Create: `public/manifest.webmanifest` (via plugin config)
- Test: `src/App.test.tsx` (replace Task 1 smoke test)

**Interfaces:**
- Consumes: `loadDeviceConfig`, `clearDeviceConfig` from deviceConfig; `SetupScreen`.
- Produces: `App` that shows `SetupScreen` when no config, otherwise a placeholder screen per mode with a "เปลี่ยนค่า / Change setup" button that clears config and returns to Setup. Later plans replace the per-mode placeholders with real screens.

- [ ] **Step 1: Install PWA plugin**

Run: `npm install -D vite-plugin-pwa`

- [ ] **Step 2: Configure PWA in `vite.config.ts`**

Add the plugin (keep the existing `test` block):
```ts
import { VitePWA } from 'vite-plugin-pwa'

// inside plugins: [ react(), VitePWA({ ... }) ]
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'สายสัมพันธ์ ม.6/7',
    short_name: 'Sai Samphan',
    theme_color: '#1A1A1A',
    background_color: '#1A1A1A',
    display: 'standalone',
    icons: [],
  },
})
```

- [ ] **Step 3: Replace `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => localStorage.clear())

test('shows Setup when no device config', () => {
  render(<App />)
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})

test('after setup, shows the chosen mode placeholder and can reset', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  expect(screen.getByText(/โหมด: display/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /เปลี่ยนค่า/ }))
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `App` still renders the old heading.

- [ ] **Step 5: Rewrite `src/App.tsx`**

```tsx
import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { loadDeviceConfig, clearDeviceConfig, type DeviceConfig } from './device/deviceConfig'

export default function App() {
  const [config, setConfig] = useState<DeviceConfig | null>(() => loadDeviceConfig())

  if (!config) {
    return <SetupScreen onDone={() => setConfig(loadDeviceConfig())} />
  }

  const reset = () => {
    clearDeviceConfig()
    setConfig(null)
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">
        ซุ้ม: {config.booth} · โหมด: {config.mode}
        {config.station ? ` · station ${config.station}` : ''}
      </p>
      <p className="opacity-60">หน้าจริงของโหมดนี้จะถูกสร้างในแผนถัดไป</p>
      <button
        onClick={reset}
        className="self-start rounded-lg px-4 py-2 border border-white/30 font-kanit"
      >
        เปลี่ยนค่า / Change setup
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify build works**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: route by device mode + PWA manifest; setup/reset flow"
```

---

## Self-Review

**Spec coverage (Foundation slice of the base + design spec):**
- Stack (React/Vite/TS/Tailwind/Firebase/PWA) → Tasks 1, 2, 4, 8 ✓
- PHANTOM CREW theme + fonts → Task 2 ✓
- Firestore offline `persistentLocalCache` → Task 4 ✓
- Bilingual labels → Task 5 ✓
- No-login Setup (booth/mode/station) saved to localStorage, changeable → Tasks 6, 7, 8 ✓
- Domain schema types (used by all later plans) → Task 3 ✓
- Deferred by design to later plans: Order Station, Display, Dashboard, queue logic, accounting, QR, HQ/comms, extras — each is its own plan.

**Placeholder scan:** No TBD/TODO. The App "mode placeholder" in Task 8 is intentional and explicitly labeled as replaced by later plans — it ships as working, testable software (routing + reset flow), not a stub of unfinished work.

**Type consistency:** `DeviceConfig` (Task 6) is imported unchanged in Tasks 7 and 8. `BoothId`/`Mode`/`Station` (Task 3) flow into deviceConfig, SetupScreen, and labels. `L(key)` / `LabelKey` (Task 5) used consistently. `getFirebaseConfig`/`db` (Task 4) exports match their test. No signature drift found.

---

*Plan 1 of 6 · Foundation · ต่อยอดจาก 2026-07-24-hq-comms-crosssell-design.md · ม.6/7 · PHANTOM CREW*
