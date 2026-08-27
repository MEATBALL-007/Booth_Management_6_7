# SUMMARY — รอบวันที่ 2026-08-28

งานของรอบนี้: acceptance criterion ข้อ **Undo** ของ `2026-08-04-queue-pro-upgrade-design.md`

> Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)

**ผลลัพธ์: ผ่านแล้ว — บั๊กจริงถูกแก้ และพิสูจน์ด้วยเทสต์ 36 ตัวที่ mutation check เองแล้วว่าฆ่าโค้ดพังได้จริง**

## What I did

- **เจอว่างานนี้เคยทำเสร็จแล้ว แต่อยู่บน branch ที่ไม่เคย merge** — `git log --all` ชี้ว่า commit
  `6c2dafa` (branch `auto/…/2026-08-24_0053`) implement ตามสเปกใน
  `docs/autopilot/2026-08-13-undo-audit-findings.md` ครบทุกข้อแล้ว แต่ main ยังไม่มี
  จึง **ยกโค้ดที่พิสูจน์แล้วมาแทนที่จะเขียนใหม่** (เฉพาะ path ใน `src/` — ไม่เอา AUTOPILOT.md
  ของ branch นั้นมาด้วย เพราะ ledger เดินไปคนละทาง)
- **แก้ 3 จุดตามสเปก** — `orderSnapshot` คืนทุก field ที่ undo ได้ โดย `undefined` = "ไม่เคยมี",
  `updateOrderStatus` แปลง `undefined` → `deleteField()`, และย้าย patch ของ "ยกเลิก"
  ออกจาก `QueuePanel` มาเป็น `Q.cancel(reason)`
- **เพิ่มเทสต์ 36 ตัว 2 ไฟล์ใหม่** — `src/undoRoundTrip.audit.test.tsx` (round-trip
  ทุก action ทั้ง 10 คู่ action/state + ขับผ่านปุ่มจริงของ panel) และ
  `src/undoDeleteField.audit.test.ts` (pin การแปลง `undefined` → sentinel)
- **mutation check 2 รอบ โดยทำนายผลไว้ก่อนรัน** (รายละเอียดใน Verification)
- ยก `docs/autopilot/2026-08-24-undo-round-trip-audit.md` มาด้วย เพื่อให้ branch นี้มี
  บันทึกการวิเคราะห์อยู่คู่กับโค้ด และติ๊กข้อ Undo + เขียน Next task เป็นข้อ No-show

## Why

**ทำไมยกของเดิมมาแทนที่จะเขียนใหม่:** สเปกสั่งว่า "อย่าวิเคราะห์ใหม่ ให้ลงมือทำตามนั้นเลย"
และของที่ `6c2dafa` ทำไว้ ตรงกับสเปกทุกข้อรวมถึงข้อ 4 (ใช้ `toStrictEqual` บน
`updateOrderStatus.mock.calls` ไม่ใช้ `objectContaining`) การเขียนใหม่ให้เหมือนเดิม
คือเผาเวลารอบโดยได้ผลลัพธ์ด้อยกว่า **แต่ไม่ได้เชื่อมันเฉยๆ** — จึงพิสูจน์ซ้ำเองด้วย mutation check

**บั๊กที่แก้ (ยืนยันด้วย mutation check ว่ามีอยู่จริง):** Firestore `updateDoc` เป็น merge
ทำให้ key มี 3 สถานะ (มีค่า = ทับ / ไม่มี key = คงเดิม / ต้องไม่มี = ลบ) แต่ JS object
ให้แค่ 2 — `undefined` ยุบรวมกับ "ไม่มี key" ผลคือ field ที่ action สร้างขึ้นเอง
รอดจาก undo เสมอ ต้องใช้ sentinel `deleteField()` มาแทนสถานะที่สาม

**ทำไมเทสต์เดิมจับไม่ได้:** `objectContaining` และ `toHaveBeenCalledWith` **มองข้าม key
ที่มีค่า `undefined` ทั้งคู่** ซึ่งเป็นความต่างที่บั๊กนี้ตั้งอยู่พอดี — มันจึงเขียวทับโค้ดที่พัง
`toStrictEqual` เป็น matcher เดียวที่แยก `{a: undefined}` ออกจาก `{}` ได้

## Verification

รัน Verify command ตามที่กำหนด (`npm test && npm run build`) — ผ่านทั้งคู่:

```
Test Files  41 passed (41)
     Tests  169 passed (169)        <- เดิม 133, เพิ่ม 36
tsc -b && vite build → ✓ built in 6.93s
PWA v1.3.0  precache 5 entries (846.13 KiB)
```

**mutation check — ทำนายก่อนรัน แล้วผลตรงเป๊ะทั้งชื่อเทสต์ ไม่ใช่แค่จำนวน:**

1. เอา `orderSnapshot` กลับไปเป็นเวอร์ชันบั๊ก (เก็บเฉพาะ field ที่มีค่า)
   ทำนายว่าจะแดง 15 ตัว → **แดง 15 ตัว ตรงตามรายชื่อที่ทำนายทุกตัว**:
   A1 เฉพาะ 5 เคสที่ action เป็นคนสร้าง field ขึ้นมาเอง (`callNext`/`callSpecific`
   บนคิวที่ไม่เคยถูกเรียก, `markDone`, `cancel` ทั้งสองเคส), A3, A4,
   เทสต์ `orderSnapshot` ใน `queueActions.test.ts` และ B1–B7
   ส่วนเคสที่ **ยังเขียว** คือเคสที่ field มีค่าอยู่ก่อนแล้ว (`skip`, `recall`,
   `reannounce`, และ callNext/callSpecific บน order ที่มี timestamp เดิมติดมา)
   — ตรงกับตารางบั๊กใน `2026-08-13-undo-audit-findings.md` พอดี
2. ทำให้ `withDeletions` เป็น identity (เลิกแปลงเป็น `deleteField()`)
   ทำนายว่าจะแดงเฉพาะไฟล์ deleteField → **แดง 2 ตัว (D1, D4) ส่วน round-trip เขียวหมด**
   ยืนยันด้วยตัวเองว่าคำเตือนใน audit doc ที่ว่า "สองไฟล์นี้เป็นคู่ ต้องอ่านด้วยกัน" เป็นจริง

โค้ด production ถูก `git checkout --` คืนสภาพหลัง mutation ทั้งสองรอบ และ commit ตัวจริง
ถูกทำ **ก่อน** เริ่ม mutation check

## What I did NOT do

- **ไม่ได้ทำข้ออื่น** — No-show กับ ประกาศซ้ำ ก็เคยถูกพิสูจน์บน branch อื่นแล้วเหมือนกัน
  (`4fdcf2b`, `68eb1c4`) และยกมารวมได้ไม่ยาก แต่ hard rule ข้อ 1 บอกให้ทำงานเดียว
  จึงเขียน path ที่ชัดเจนไว้ใน Next task แทน
- **ไม่ได้แก้ตัวเลข "129 automated tests"** ท้าย AUTOPILOT.md — และพบว่าตัวเลข "131 on main"
  ในหัวข้อ Portfolio ก็เก่าไปแล้ว (ของจริงก่อนรอบนี้คือ 133) ไม่ได้แก้เพราะไม่ใช่งานของรอบนี้
- **ไม่ได้แตะ idempotency guard ของ `cancel`** — `Q.cancel` มีแค่ guard "เหตุผลว่าง"
  ซึ่งตรงกับพฤติกรรมเดิมของ panel เป๊ะ ส่วน guard เช็ค status เป็นเรื่องของ acceptance
  criterion ข้อ Idempotency ที่ยังไม่ถึงคิว
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc` — ไม่ได้เพิ่ม dependency — ไม่ได้แตะ logic บัญชี / เมนู / comms
  (diff ของรอบนี้อยู่ใน `src/queue/`, `src/order/ordersRepo.ts`, `src/screens/QueuePanel.tsx`,
  เทสต์ใหม่ 2 ไฟล์, `docs/autopilot/`, `AUTOPILOT.md`, `SUMMARY.md` เท่านั้น)

## Risk

**1. `deleteField()` ยังไม่เคยถูกยิงใส่ Firestore ตัวจริงในโปรเจคนี้**
เทสต์ mock `firebase/firestore` ทั้งก้อน จึงพิสูจน์ได้แค่ว่า *เราส่ง sentinel ที่ถูกต้องออกไป*
ไม่ได้พิสูจน์ว่า field หายจริงจาก document — ผมไม่ได้แตะ Firestore เลยแม้แต่ครั้งเดียว
reviewer ควรดู `firestore.rules` ประกอบว่ามี validation ที่บังคับให้ field ต้องมีอยู่หรือไม่
(ถ้ามี การลบ field อาจถูก reject — ผมห้ามแก้ rules จึงไม่ได้ตรวจ) และควรกดจริงบนเครื่องหนึ่ง
เครื่องก่อนใช้งานวันงาน

**2. round-trip test ใช้ helper `write()` ที่จำลอง semantics ของ Firestore เอง**
ความถูกต้องของมันผูกกับ `undoDeleteField.audit.test.ts` — และ mutation check รอบที่ 2
ข้างบน **ยืนยันช่องว่างนี้ด้วยตัวเลขแล้ว**: ถ้าใครถอดการแปลง `undefined → deleteField()` ออก
round-trip test ทั้ง 31 ตัวจะยังเขียว มีแค่ D1/D4 ที่แดง สองไฟล์นี้จึงต้องอยู่ด้วยกันเสมอ
ห้ามลบไฟล์ใดไฟล์หนึ่งทิ้งโดยคิดว่าอีกไฟล์คุ้มครองอยู่แล้ว

**3. เทสต์ `orderSnapshot` เดิมถูกเขียนใหม่ (ไม่ได้ถูกลบ)** — ของเดิมชื่อ "captures only
defined mutable fields" ซึ่ง assert พฤติกรรมที่เป็นบั๊ก ตอนนี้เป็น "captures every mutable
field, undefined meaning it was absent" และใช้ `toStrictEqual` แทน `toEqual` — **เข้มขึ้น
ไม่ได้อ่อนลง** แต่เป็นการแก้เทสต์ที่มีอยู่แล้ว reviewer ควรยืนยันจุดนี้ด้วยตาตัวเอง

**4. โค้ดส่วนใหญ่ของรอบนี้ไม่ได้เขียนขึ้นใหม่ แต่ยกมาจาก `6c2dafa`**
ผมอ่านมันทั้งหมดก่อนใช้ และ mutation check ยืนยันว่าเทสต์ฆ่าโค้ดพังได้จริง (ไม่ได้เขียวลอยๆ)
แต่ reviewer ที่อยากตรวจซ้ำสามารถ `git diff 6c2dafa HEAD -- src/` เพื่อดูว่าผมไม่ได้แก้อะไรเพิ่ม

**5. ปัญหาเชิงระบบที่ใหญ่กว่าเกณฑ์ข้อนี้ — branch ไม่เคยถูก merge**
`auto/*` แต่ละ branch แตกจาก main แล้วไม่เคยกลับ ทำให้ main ยังไม่มีทั้ง Undo, No-show
และ ประกาศซ้ำ ทั้งที่ทั้งสามข้อถูกพิสูจน์ไปแล้วคนละ branch งานเดิมจึงถูกทำซ้ำหลายรอบ
**ถ้าไม่มีใคร merge branch เหล่านี้ การติ๊ก 20 ข้อจะไม่มีวันจบ** — reviewer ควรตัดสินใจ
เรื่องนี้ก่อนสั่งรอบถัดไป
