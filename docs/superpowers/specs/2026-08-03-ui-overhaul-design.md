# 🎨 UI Overhaul — "Neon Clarity" Design System

**Project:** ระบบงานสายสัมพันธ์ ม.6/7 (booth PWA) — full visual/UX upgrade
**Date:** 2026-08-03
**Status:** Approved for planning (pending user review of this spec)

> ยกเครื่องหน้าตาทั้งระบบให้ **สวย + พรีเมียม + อ่านง่าย + เข้ากับทุก device** โดย **ไม่แตะ logic** และ **คงเทสต์ 106 ตัวให้เขียว**

---

## 1. Context / why

ระบบครบ 6 โมดูล ใช้งานได้จริง (deploy แล้ว) แต่ดีไซน์ยัง utilitarian — กรอบเรียบ การ์ดพื้นฐาน ลำดับสายตายังไม่พรีเมียม. ผู้ใช้ต้องการยกระดับ UX/UI "ขั้นสุดยอด" ให้ทั้งสวยและใช้ง่าย และ **ต้องเข้ากับทุกอุปกรณ์** (iPad ที่ซุ้ม, แล็ปท็อป HQ 2 เครื่อง, จอใหญ่, มือถือในอนาคต). ทิศทางที่เลือกผ่าน visual companion คือ **"Neon Clarity"** = พลังเรืองแสงแบบ Neon Arcade + ความสะอาด/อ่านง่ายแบบ Sleek Glass.

## 2. Design language — "Neon Clarity"

**หลักการเดียวที่คุมทุกอย่าง:** *glow เฉพาะ 3 จุดสำคัญ (เลขคิว · ยอดเงิน · ปุ่มหลัก) — ที่เหลือสะอาด คอนทราสต์สูง เว้นที่โปร่ง*

**Tokens (ขยาย PHANTOM CREW เดิม):**
- สีแบรนด์: primary `#FA4616`, accent `#FFC72C` (คงเดิม)
- Neutrals (ใหม่ — คุมความสะอาด): `bg #0a0a0c`, `surface #151517`, `surface-2 #1c1c20`, `line rgba(255,255,255,.09)`, `text #f4f4f6`, `muted #9a9aa2`, `success #3ad35a`
- Radius: `sm 10px · md 14px · lg 16px · xl 20px`
- **Base scale +20%** จากปัจจุบัน (ตัวหนังสือ/ปุ่ม/สเปซ/ตัวเลข ใหญ่ขึ้น 20% ทั้งระบบ — แตะง่าย อ่านไกล)
- Fonts (คงเดิม): Kanit (หัวข้อ), Sarabun (เนื้อหา), JetBrains Mono (ตัวเลข/คิว/เงิน)

**Glow rules:** ใช้ `text-shadow`/`drop-shadow` สีส้ม-เหลืองเฉพาะ: เลขคิวที่กำลังทำ · ตัวเลขเงิน (ยอดรวม/ยอดบริจาค) · ปุ่ม action หลัก. ห้าม glow พื้น/การ์ด/ข้อความทั่วไป.

**Surfaces:** การ์ดพื้น `surface` ขอบ `line` มุมโค้ง `xl` padding โปร่ง. ไม่ใช้ glassmorphism blur หนัก (คงความคมชัด/อ่านง่าย).

**Motion (เพิ่มจากของเดิม, เบา):** pulse จุด LIVE · hover ยกการ์ด `translateY(-2px)` · คงเอฟเฟกต์เดิม (flash+chime ตอนคิวใหม่เข้า serving, error alert). ไม่ทำแอนิเมชันฟุ่มเฟือย.

## 3. Shared UI primitives (ใหม่)

สร้าง layer เล็กๆ ที่ `src/ui/` เพื่อ DRY + คุมความสม่ำเสมอ (แต่ละไฟล์ทำหน้าที่เดียว, มี test):
- `tokens` — ค่าคงที่/type สำหรับสี-สเกล (ผูกกับ Tailwind config ที่ extend)
- `<Button variant="primary|ghost|danger">` — ปุ่มมาตรฐาน (primary = gradient glow)
- `<Panel>` / `<Card>` — พื้นผิวการ์ดมาตรฐาน
- `<StatTile label value accent?>` — การ์ดตัวเลข (Dashboard)
- `<Chip tone="paid|cash|qr|neutral">` — ป้ายสถานะ
- `<QueueNumber size>` — เลขคิว glow (ใช้ทั้ง Display/Order/Queue)

Tailwind config (`tailwind.config.js`) extend: palette neutrals, radius scale, fontSize scale (+20%), boxShadow `glow-o`/`glow-y`. ใช้ utility เป็นหลัก; primitives ห่อ pattern ที่ซ้ำบ่อย.

## 4. Responsive rules (ทุก device)

- **Breakpoints:** mobile `<640` (1 คอลัมน์) · tablet `640–1024` (iPad) · desktop `>1024` (HQ)
- **iPad แนวตั้ง:** คอลัมน์ซ้อนเป็นแถวเดียว · **touch target ≥ 44px**
- **iPad แนวนอน:** 2 คอลัมน์ (เมนู+ตะกร้า / cards)
- **แล็ปท็อป HQ:** Dashboard แผ่เต็มความกว้าง (grid หลายคอลัมน์)
- **จอใหญ่/TV (Display):** เลขคิวสเกลด้วย `clamp()` ให้ใหญ่ตามจอ (เช่น `clamp(96px, 22vw, 320px)`) เห็นสุดห้อง
- **มือถือ:** คอลัมน์เดียว อ่านง่าย (เผื่ออนาคตหน้าเช็คคิวลูกค้า)
- ทุกหน้า: `overflow-x` ไม่มี, ใช้ relative units + flex/grid, รูป/การ์ด `max-width:100%`

## 5. Per-screen application

ทุกหน้า restyle ตาม design language ข้างบน โดย **คงข้อความ/role/testid เดิมทั้งหมด** (ดู §6):
1. **Setup** — เลือกซุ้ม/โหมด/station เป็นการ์ดใหญ่แตะง่าย, chip เลือกได้ชัด, ปุ่มยืนยัน primary
2. **Order Station** — เมนูการ์ด (ป้าย "มีตัวเลือก"), ตะกร้าโชว์ option ต่อบรรทัด, ยอดรวม glow, ปุ่มจ่าย primary/ghost, เลขคิวที่ออก glow, option picker เป็น modal/inline สะอาด
3. **Display** — จอลูกค้า: NOW SERVING เลขใหญ่ glow + รายละเอียดเมนูใต้เลข, UP NEXT pills สะอาด, header ซุ้ม + LIVE dot, คง flash+chime
4. **QueuePanel** — serving/waiting cards + สรุปรายการ+option ให้คนทำ, ปุ่มเรียก/เสร็จ/ยกเลิก มาตรฐาน
5. **Dashboard / HQ** — StatTile grid (ยอดบริจาคสุทธิเน้น glow เหลือง), by-booth, best-sellers, ฟอร์มต้นทุน, presence board, broadcast — layout กว้างบน HQ
6. **PIN gate** — หน้าจอ lock สะอาด, ช่อง PIN ใหญ่ mono, error ชัด
7. **Comms** — toast แจ้งเตือน + ปุ่ม ack, ปุ่ม alert (🆘/📦/✅) เป็น primitives
8. **App chrome** — ปุ่ม "← ตั้งค่า" + confirm dialog (มีแล้ว) restyle ให้เข้าชุด

## 6. Hard constraint — keep the 106 tests green

เทสต์ query ด้วย **ข้อความไทย/อังกฤษ, accessible name ของปุ่ม, และ `data-testid`** — ไม่ได้ query class/layout. ดังนั้น:
- ✅ เปลี่ยนได้อิสระ: className, โครง layout, wrapper, สไตล์, มุมโค้ง, สี, สเปซ, แอนิเมชัน
- 🚫 ห้ามเปลี่ยน: ข้อความที่แสดง (label ไทย/อังกฤษ), accessible name ของปุ่ม (เช่น `รับเงินแล้ว`, `เพิ่มลงตะกร้า`, `เรียกคิวถัดไป`, `ยืนยัน`), และ `data-testid` เดิม (`cart-total`, `issued-queue`, `net-donation`, `serving`, `upnext`, `presence-row`, …)
- ปุ่ม primitives ต้องส่ง `children`/`aria-label`/`data-testid` ผ่านทะลุได้
- รันเทสต์เต็ม + `npm run build` ทุก task; ถ้าเทสต์ที่ query ข้อความพังเพราะแก้ข้อความ = ถือว่าผิด constraint

## 7. Architecture / approach

- **Tailwind-first** (มี Tailwind v3 อยู่แล้ว): extend config เป็น single source of truth ของ tokens
- **Primitives layer** (`src/ui/`) ห่อ pattern ซ้ำ — screens ประกอบจาก primitives + utility
- **Firestore/logic ไม่แตะ** — เปลี่ยนแค่ presentation. ไม่แก้ repo, metrics, cart logic, comms logic
- **เฟสการทำ (จะแตกใน implementation plan):**
  - P1 — Design-system foundation: Tailwind tokens + `src/ui/` primitives (+ tests)
  - P2 — ไล่ restyle ทีละหน้า (Setup → Order Station → Display → QueuePanel → Dashboard → PIN/Comms/chrome), หน้าละ task, คงเทสต์เขียว
  - P3 — Responsive polish + ตรวจทุก breakpoint + จอใหญ่ (Display clamp)

## 8. Success criteria

- [ ] ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)
- [ ] ใช้งานได้สวย/อ่านง่ายบน: iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ — ไม่มี horizontal scroll, touch target ≥44px
- [ ] 106 tests เขียวครบ + `npm run build` ผ่าน + PWA generate
- [ ] Firestore/logic ไม่มีการเปลี่ยนแปลง (diff เฉพาะ presentation + Tailwind config + src/ui)
- [ ] Display เลขคิวสเกลใหญ่ตามจอด้วย clamp

## 9. Out of scope

เพิ่มฟีเจอร์ใหม่ (Happy-hour, thermometer, cash reconciliation, passport, Export = Plan 6) · เปลี่ยน logic/ราคา/เมนู · dark/light theme switch (คงธีมมืด PHANTOM CREW อย่างเดียว)

---

*Design approved via visual companion (direction A "Neon Arcade" + B "Sleek Glass" clarity, +20% scale) · ต่อยอดจากระบบ 6 โมดูล · ม.6/7 · PHANTOM CREW*
