# SUMMARY — รอบวันที่ 2026-08-18

งานของรอบนี้: ทำ acceptance criterion ข้อ **Undo** ซ้ำ ตามสเปกใน
`docs/autopilot/2026-08-13-undo-audit-findings.md` (รอบก่อนทำเสร็จแล้วแต่ commit ไม่ได้)

**ผลลัพธ์: บั๊กยังอยู่จริงตามที่เอกสารระบุ — แก้แล้ว พิสูจน์ด้วยเทสต์ครบทุก action และ commit แล้ว**

## What I did

- **`src/queue/queueActions.ts`** — `orderSnapshot()` คืน field ที่ undo ได้ **ครบทุกตัว**
  (`status`, `servingAt`, `doneAt`, `announcedAt`, `cancelReason`) โดย `undefined` แปลว่า
  "field นี้ไม่เคยมี ให้ลบทิ้ง" + เพิ่ม type `OrderSnapshot` และย้าย patch ของ "ยกเลิก"
  ออกจาก `QueuePanel` มาเป็น `Q.cancel(reason)` (patch เหมือนเดิมทุกประการ)
- **`src/order/ordersRepo.ts`** — `updateOrderStatus()` แปลง key ที่มีค่า `undefined`
  ใน patch เป็น `deleteField()` (import จาก `firebase/firestore` ที่มีอยู่แล้ว — ไม่เพิ่ม dependency)
- **`src/screens/QueuePanel.tsx`** — ใช้ `Q.cancel(reason)` และ type ของ undo state
  เปลี่ยนจาก `Partial<Order>` เป็น `Q.OrderSnapshot`
- **เทสต์ใหม่ 19 ตัว (133 → 152)**
  - `src/queue/undoRoundTrip.test.ts` (ไฟล์ใหม่) — round-trip table test **9 เคส ครบทุก action**:
    `action → apply patch → apply snapshot → toStrictEqual(order เดิม)` + เทสต์ยามที่ยืนยันว่า
    action ที่ export ทุกตัวมีเคส (ถ้าเพิ่ม action ใหม่โดยไม่เขียน undo test จะแดงทันที)
  - `src/screens/QueuePanelUndo.test.tsx` (ไฟล์ใหม่) — 7 เคสระดับ UI ครบทุกปุ่ม
    (เรียกคิวถัดไป / เรียก / เสร็จ / ข้าม / ประกาศซ้ำ / เรียกซ้ำ / ยกเลิก)
  - `src/order/ordersRepo.test.ts` — pin ว่า `undefined` กลายเป็น `deleteField()` จริง
  - `src/queue/queueActions.test.ts` — เทสต์ `cancel()` + เขียนเทสต์ `orderSnapshot` ใหม่
    (ของเดิมชื่อ "captures only defined mutable fields" คือ assert พฤติกรรมที่บั๊ก)
- **ติ๊กข้อ Undo ใน `AUTOPILOT.md`** และตั้ง Next task เป็นข้อ No-show

## Why

- **บั๊กคืออะไร:** Firestore `updateDoc` เป็น merge — field ที่ไม่อยู่ใน patch จะคงค่าเดิม
  `orderSnapshot` เดิมคัดลอกเฉพาะ field ที่มีค่า ผลคือ field ที่ action สร้างขึ้นใหม่
  **รอดจากการ undo เสมอ**: undo ของ "เรียกคิวถัดไป" ทิ้ง `servingAt`+`announcedAt` ไว้บน
  order ที่กลับไปเป็น `waiting`, undo ของ "เสร็จ" ทิ้ง `doneAt`, undo ของ "ยกเลิก" ทิ้ง `cancelReason`
- **ทำไมต้องแก้ที่ repo layer ด้วย:** Firestore ไม่มีแนวคิด "เซ็ตเป็น undefined" — ต้องใช้
  sentinel `deleteField()` ถึงจะลบ field จริง patch ปกติของ action ไม่เคยมี key ที่เป็น
  `undefined` การเปลี่ยนนี้จึงไม่กระทบ path เดิม (เทสต์ `updateOrderStatus` ตัวเดิมยังเขียว)
- **ทำไมเทสต์เดิมจับไม่ได้:** ใช้ `expect.objectContaining` ซึ่งเป็น subset matcher —
  มองไม่เห็น field ส่วนเกินโดยธรรมชาติ (`toHaveBeenCalledWith` ก็ไม่ได้ เพราะมันมองข้าม key
  ที่มีค่า `undefined` ด้วย) เทสต์รอบนี้จึงใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls`
- **ทำไมเทสต์ใหม่อยู่ในไฟล์ใหม่:** ลด merge conflict กับ autopilot branch อื่นที่ยังไม่ merge
  ส่วนที่แก้ไฟล์เทสต์เดิมมีเท่าที่จำเป็นจริง (mock `deleteField`, เทสต์ที่ assert พฤติกรรมบั๊ก,
  assertion undo ตัวเดิมที่อ่อนเกินไป)

## Verification

**Red phase (ก่อนแก้):** รัน `undoRoundTrip.test.ts` กับโค้ดที่ยังไม่แก้ →
`Tests 5 failed | 5 passed` และ 5 เคสที่ล้มคือเคสที่เอกสารทำนายไว้เป๊ะ:
`เรียกคิวถัดไป (fresh waiting)`, `เรียก เจาะจง (fresh waiting)`, `เสร็จ`, `ยกเลิก` ทั้งสองเคส
ส่วน `ข้าม` / `เรียกซ้ำ` / `ประกาศซ้ำ` ผ่านตั้งแต่ก่อนแก้ (action พวกนี้ไม่สร้าง field ใหม่)

**Mutation check (หลังแก้):** เปลี่ยน `orderSnapshot` กลับเป็นเวอร์ชันเดิมชั่วคราว →
`QueuePanelUndo.test.tsx` ล้มทั้ง 7 เคส แล้ว `git checkout --` คืนไฟล์ (เทสต์ชุดใหม่ไม่ใช่ dead weight)

**Verify command (`npm test && npm run build`):**

```
Test Files  41 passed (41)
     Tests  152 passed (152)          <- เดิม 133, เพิ่ม 19
=== BUILD ===
PWA v1.3.0
precache  5 entries (846.07 KiB)
files generated  dist/sw.js, dist/workbox-9c191d2f.js
```

(รอบแรกที่รัน build ล้มด้วย TS2352 ใน test helper — cast `Record<string, unknown> → Order`
ผ่าน `unknown` แล้วผ่าน ไม่ได้แตะ verify command)

commit ทั้งหมด 4 ตัว (แยก refactor / fix+test / UI test / เอกสาร)

## What I did NOT do

- **ไม่ได้ติ๊กข้อ "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน"** ถึงแม้รอบนี้จะเขียวและ build ผ่าน —
  ข้อนั้นเป็นเกณฑ์ครอบทั้งงาน ควรติ๊กตอนตรวจครบทุกข้อแล้ว
- **ไม่ได้แตะ idempotency guard ของ `cancel`** — action อื่นทุกตัวมี guard คืน `null` เมื่อ status
  ไม่ตรง แต่ `cancel` มีแค่ guard "เหตุผลว่าง" (ตรงกับพฤติกรรมเดิมของ panel เป๊ะ)
  จงใจไม่แตะเพราะ **Idempotency เป็น acceptance criterion แยกอีกข้อ** ที่ยังไม่ถึงคิว
- ไม่ได้อัปเดตเลข "129 automated tests" ในหัวข้อ Portfolio ท้าย `AUTOPILOT.md` (ตอนนี้ 152)
  — ไม่ใช่งานของรอบนี้ และตัวเลขนั้นสะท้อน main ไม่ใช่ branch นี้
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`, `.env*`,
  `.firebaserc` — ไม่ได้เพิ่ม dependency — ไม่ได้แตะ logic บัญชี / เมนู / comms

## Risk

1. **`deleteField()` ไม่เคยถูกใช้กับ Firestore ตัวจริงในโปรเจคนี้มาก่อน** เทสต์ mock
   `firebase/firestore` ทั้งก้อน จึงพิสูจน์ได้แค่ว่า "เราส่ง sentinel ที่ถูกต้องออกไป"
   ไม่ได้พิสูจน์พฤติกรรมของ Firestore จริง ประเด็นที่ reviewer ควรดู: ถ้า `firestore.rules`
   มี validation ที่บังคับว่า field ต้องมีอยู่ การลบ field อาจถูก reject (ห้ามแก้ rules จึงไม่ได้แตะ)
   ควรกดจริงบนเครื่องหนึ่งเครื่องก่อนวันงาน
2. **round-trip test ใช้ helper `write()` ที่จำลอง semantics ของ Firestore เอง**
   (key ที่มีค่า = เขียนทับ, `undefined` = ลบ, key ที่ไม่มี = ไม่แตะ) helper นี้ไม่ใช่โค้ด production
   ความถูกต้องของมันผูกกับเทสต์ `ordersRepo.test.ts` ที่ pin การแปลง `undefined → deleteField()`
   ถ้าใครแก้ `updateOrderStatus` ให้เลิกแปลง เทสต์ ordersRepo จะจับได้ แต่ round-trip test
   จะยังเขียวอยู่ — เป็นคู่ที่ต้องอ่านด้วยกัน (เขียนหมายเหตุนี้ไว้ในหัวไฟล์แล้ว)
3. **undo เป็น single-step และไม่ตรวจว่า order เปลี่ยนไปแล้วหรือยัง** — ถ้าเครื่องอื่นแก้ order
   เดียวกันหลังจากเรากด action แล้วเรากด "ย้อนกลับ" เราจะเขียนทับของเครื่องอื่น พฤติกรรมนี้
   **เหมือนเดิมทุกประการ ไม่ได้เปลี่ยนในรอบนี้** และเกี่ยวกับเกณฑ์ข้อ Idempotency มากกว่า
   แต่ตอนนี้ผลกระทบ "แรงขึ้น" เพราะ undo ลบ field ได้จริงแล้ว (เดิมมันแค่ merge)
4. `orderSnapshot` ครอบเฉพาะ 5 field ที่ queue action แตะ ถ้าอนาคตมี action ที่เขียน field อื่น
   (เช่น `servedBy`) undo จะไม่คืนค่านั้น — เทสต์ยาม "every queue action has a round-trip case"
   จับได้แค่ว่า *action* ใหม่ไม่มีเคส ไม่ได้จับว่า *field* ใหม่ไม่อยู่ใน snapshot
