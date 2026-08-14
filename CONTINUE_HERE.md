# 🎪 CONTINUE HERE — Booth Management (งานสายสัมพันธ์ ม.6/7)

> **อ่านไฟล์นี้ก่อนเริ่มทำงานต่อในเซสชันใหม่.** สรุปทุกอย่างที่ต้องรู้เพื่อดำเนินโปรเจกต์ต่อ.
> Working dir: `/Users/meatball_mac/Booth_Management_6_7` · branch `main`
> · remote: **https://github.com/MEATBALL-007/Booth_Management_6_7** (public)
>
> ⚠️ **PromptPay id และ dashboard PIN ไม่อยู่ในโค้ดแล้ว** — ย้ายไป `.env`
> (`VITE_PROMPTPAY_ID`, `VITE_DASHBOARD_PIN`) และประวัติ git ถูกล้างค่าเดิมออกทั้งหมด
> ก่อนเปิด repo เป็นสาธารณะ อย่าเขียนค่าจริงกลับลงไฟล์ใดๆ ที่ถูก commit

---

## 1. โปรเจกต์นี้คืออะไร
ระบบหลังบ้านงานสายสัมพันธ์ ม.6/7 — **PWA จัดการ 3 ซุ้มขายของบริจาค** (คิว + รับเงิน + บัญชีเรียลไทม์ + สื่อสารข้ามซุ้ม) รันบน iPad/คอมผ่านเบราว์เซอร์ ทำงาน offline ได้.

**สถานะ: LIVE + เกือบครบ** — deploy แล้วที่ **https://saisamphan-67.web.app** (Firebase project `saisamphan-67`). **131 tests ผ่าน, build สะอาด, ทุกอย่าง merge เข้า `main` แล้ว.**
> มี PR ค้างอยู่ 1 ใบ (แก้บั๊ก undo, +13 tests → 144) รอรีวิว

## 2. สิ่งที่สร้างเสร็จแล้ว (merged to main)
1. **Foundation** — PWA scaffold, PHANTOM CREW theme, Firestore lazy `getDb()`, offline persistence, i18n, Setup screen
2. **Order Station** — catalog → cart → จ่ายเงินสด/QR (PromptPay) → เลขคิว station-prefix → queue panel
3. **Display** — จอลูกค้า Now Serving/Up Next + เสียง + ไฟกระพริบ
4. **Dashboard** — PIN-gated (`<ดูใน .env: VITE_DASHBOARD_PIN>`) ยอดรวม 3 ซุ้ม + net donation + ฟอร์มต้นทุน (`src/dashboard/*`, `src/expense/*`)
5. **HQ + inter-booth comms** — `src/comms/*`: messages+presence, alerts, toast+ack, presence board, broadcast, heartbeat (บน Order Station + Dashboard เท่านั้น, ไม่ขึ้นจอลูกค้า)
6. **Menu + Options** — เมนูสตรอเบอร์รี่ + ระบบ option ต่อแก้ว (`src/order/options.ts`, cart carries selections)
7. **UI Overhaul "Neon Clarity"** — restyle ทั้งระบบ, tokens ใน tailwind.config, +20% scale, primitives `src/ui/*`, responsive
8. **Queue Pro-Upgrade** — `src/queue/queueActions.ts` (pure guarded: callNext/callSpecific/markDone/skip/recall/reannounce + orderSnapshot), undo, skipped zone, re-announce; Display จัดกลาง + glanceable + "เตรียมตัว" spotlight

## 3. สถาปัตยกรรม & คอนเวนชัน (ต้องทำตาม)
- **Stack:** React 19 + Vite + TypeScript + Tailwind v3 + Firebase Firestore + vite-plugin-pwa. Vitest + @testing-library/react.
- **Firestore อยู่ที่ edges เท่านั้น:** `src/order/ordersRepo.ts`, `src/expense/expensesRepo.ts`, `src/comms/commsRepo.ts`, และ init ที่ `src/lib/firebase.ts` (lazy `getDb()`). โค้ดอื่นทั้งหมด pure/testable ไม่ import `firebase/firestore`.
- **ไม่ใช้ composite index** — sort ฝั่ง client เสมอ (subscribe ทั้ง collection แล้ว sort ในโค้ด).
- **Optimistic writes** — อย่า `await` เพื่อเปลี่ยน UI (Firestore offline promise ค้าง pending); ใช้ `.catch(setError)` โชว์ error.
- **Neon Clarity design system:** tokens ใน `tailwind.config.js` (phantom-bg/surface/surface2/line/text/muted/success/danger + shadow glow-o/glow-y). **+20% scale ผ่าน `html{font-size:120%}` ใน `src/index.css`.** Glow เฉพาะ เลขคิว/เงิน/ปุ่มหลัก. Primitives: `src/ui/` (Button/Panel/Chip/StatTile/QueueNumber; StatTile ส่ง data-testid ลง value; QueueNumber size=display ใช้ clamp).
- **🔒 กฎ restyle:** ห้ามเปลี่ยน **ข้อความที่แสดง / accessible name ของปุ่ม / data-testid** (เทสต์ query สิ่งเหล่านี้) — เปลี่ยนได้แค่ className/layout. เปลี่ยน behavior เมื่อไหร่ = แก้เทสต์ได้ (ถูกต้อง).
- **Bilingual** TH+EN ผ่าน `L()`/`src/i18n/labels.ts`.
- **Tests:** `vi.mock` กับ top-level `const` spy เจอ TDZ → ใช้ `vi.hoisted(() => ({...}))`. รัน `npm run build` (tsc -b) ด้วย ไม่ใช่แค่ vitest.
- **ค่าคงที่:** ราคา photo 35, portrait 25, drinks สตรอเบอร์รี่โยเกิร์ต 35 / นมสด 25 + topping +10. PromptPay `<ดูใน .env: VITE_PROMPTPAY_ID>`, dashboard PIN `<ดูใน .env: VITE_DASHBOARD_PIN>` (`src/domain/appConfig.ts`). เลขคิว station-prefix (A7) นับจาก localStorage `phantom.queue.${booth}.${station}`. OrderStatus: waiting/serving/done/cancelled/skipped.

## 4. Workflow ที่ใช้ (ทำต่อแบบนี้)
ทุกฟีเจอร์ผ่าน superpowers: **brainstorming → writing-plans → subagent-driven-development**.
- spec ไป `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- plan ไป `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- execute บน branch `feat/<name>` ด้วย subagent-driven-development (dispatch subagent ต่อ task + review ระหว่างทาง + whole-branch review ด้วย opus ตอนจบ) → merge to `main`
- ledger ที่ `.superpowers/sdd/progress.md` (gitignored). scripts: `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.1/skills/subagent-driven-development/scripts/{task-brief,review-package}`
- model tiering: haiku=transcription/pure logic, sonnet=integration/screens, opus=whole-branch review.

## 5. คำสั่งที่ใช้
```bash
npm test            # full suite (ต้องเขียวครบ)
npm run build       # tsc -b && vite build (+ PWA)
npm run dev         # local preview
# deploy เว็บจริง:
npm run build && npx firebase-tools deploy --only hosting
# deploy security rules:
npx firebase-tools deploy --only firestore:rules
```
- `firebase login` ทำในเทอร์มินัลจริง (Ghostty) แล้ว — credential cached. คำสั่งลบข้อมูล live ถูก classifier บล็อก ให้ผู้ใช้รันเองด้วย `!` prefix.

## 6. สิ่งที่ยังไม่ได้ทำ (backlog / Plan 6 extras)
- **Happy-hour pricing** — HQ กด push ราคาชั่วคราว (collection `/pricingOverrides`)
- **Donation thermometer** — ต้องเพิ่ม `donationTarget` ใน `APP_CONFIG` (และ annotate `APP_CONFIG: GlobalConfig`)
- **Cash reconciliation** (ปิดซุ้ม/นับเงิน) — reuse `metrics.expectedCash`
- **3-booth passport** (แสตมป์ครบ 3 ซุ้ม cross-sell)
- **Export Excel/PDF** ใน Dashboard — ต้องเพิ่ม dep `xlsx`; reuse orders/expenses ที่ subscribe อยู่; แนะนำ extract `useDashboardData()` hook ก่อน
- เล็กๆ ที่ deferred: queue ETA, max-queue auto-close (ซุ้มวาดคอขวดเวลา), QR ให้ลูกค้าเช็คคิวเอง, staff leaderboard, PWA app icons (`manifest.icons:[]` ตอนนี้ว่าง)

## 7. Reminders / action items ค้าง
1. **แก้วันที่ใน `firestore.rules`** (ตอนนี้ `2026, 9, 30`) → เป็นหลังวันงานจริง แล้ว deploy rules → ฐานข้อมูลล็อกอัตโนมัติหลังงาน
2. **ต้นทุนน้ำปั่นเป็น placeholder** (14/10 ใน `src/domain/catalog.ts`) — ใส่ราคาซื้อจริงเพื่อ net donation แม่น (หรือใช้ Dashboard expenses)
3. **งบ backdrop/prop/วัตถุดิบใน `docs/report/class-briefing.html` เป็นประมาณการ** — ปรับตามจริงได้
4. **รีเซ็ตข้อมูล live เป็น 0:** ผู้ใช้รันเอง (assistant ถูกบล็อก): `! npx firebase-tools firestore:delete orders --recursive --force` (+ expenses/messages/presence). เลขคิวอยู่ localStorage `phantom.queue.*` ต่อเครื่อง → clear site data เพื่อเริ่ม A1 ใหม่
5. `.env` มีคีย์ Firebase จริง (gitignored). `.env.example` เป็น placeholder เท่านั้น. `.firebaserc` = `saisamphan-67`.

## 8. เอกสาร/ไฟล์สำคัญ
- Specs: `docs/superpowers/specs/*` · Plans: `docs/superpowers/plans/*`
- รายงานครู: `docs/report/booth-system-report.html` (สรุประบบ 2 หน้า) · `docs/report/class-briefing.html` (6 หน้า: แบ่งกลุ่ม+อุปกรณ์+งบ 3 ซุ้ม) → เปิด Chrome → Print → Save as PDF (เปิด Background graphics)
- Memory (โหลดอัตโนมัติทุกเซสชัน): `~/.claude/projects/-Users-meatball-mac-Booth-Management-6-7/memory/booth-system-conventions.md`

## 9. วิธีทำต่อ (หลัง /clear)
เปิดเซสชันใหม่ → บอกว่าจะทำอะไร (เช่น "อ่าน CONTINUE_HERE.md แล้วทำ Plan 6 Happy-hour ต่อ" / "เพิ่ม Export Excel" / "แก้บั๊ก X"). ใช้ workflow brainstorming→plan→subagent เสมอ, อ่าน spec/plan ที่เกี่ยวข้องก่อน, และ **เทสต์ต้องเขียวครบตลอด**.

---
*ม.6/7 · PHANTOM CREW · อัปเดตล่าสุด: หลัง Queue Pro-Upgrade + deploy*
