# SUMMARY — รอบวันที่ 2026-08-13 (รอบที่สอง)

งานของรอบนี้: ทำข้อ **Undo** ซ้ำ ตามสเปกใน `docs/autopilot/2026-08-13-undo-audit-findings.md`
(รอบก่อนทำเสร็จแล้วแต่โค้ดหายเพราะ commit ไม่ได้)

**ผลลัพธ์: เกณฑ์ Undo ผ่านแล้ว — ติ๊กใน `AUTOPILOT.md` เรียบร้อย (1 จาก 20 ข้อ)**
รอบนี้ commit ได้ตามปกติ (`ecfff72`) — ปัญหา git identity ของรอบก่อนหายไปแล้ว

## What I did

- **แก้ 3 จุดตามสเปก** (ไม่ได้วิเคราะห์ใหม่ ทำตามเอกสาร audit ตรงๆ)
  - `src/queue/queueActions.ts` — `orderSnapshot` คืน field ที่ undo ได้ครบทุกตัว
    (`status`, `servingAt`, `doneAt`, `announcedAt`, `cancelReason`) โดย `undefined`
    แปลว่า "field นี้ไม่เคยมี ให้ลบทิ้ง" + เพิ่ม type `OrderSnapshot` และ action `cancel(reason)`
  - `src/order/ordersRepo.ts` — `updateOrderStatus` แปลง `undefined` ใน patch เป็น
    `deleteField()` (import จาก `firebase/firestore` ที่มีอยู่แล้ว — ไม่เพิ่ม dependency)
  - `src/screens/QueuePanel.tsx` — ย้าย patch ของ "ยกเลิก" ออกมาเป็น `Q.cancel(reason)`
- **เขียนเทสต์ใหม่ 13 ตัว** (129 → 142)
  - `queueActions.test.ts` — round-trip table test 9 เคส: `action → apply patch → apply
    snapshot → toStrictEqual(order เดิม)` ครอบทุก action ในทุก state ที่กดถึงได้จริง
    + เทสต์ `cancel` + เขียน assert ของ `orderSnapshot` ใหม่ให้ใช้ `toStrictEqual`
  - `QueuePanel.test.tsx` — 3 เคสระดับ UI (undo ของ เสร็จ / เรียกคิวถัดไป / ยกเลิก)
  - `ordersRepo.test.ts` — pin ว่า `undefined` ในpatch กลายเป็น `deleteField()` จริง
- **ยืนยัน red phase จริง** — ย้อน `orderSnapshot` กลับเป็นเวอร์ชันบั๊กชั่วคราว แล้วรันเทสต์
  เพื่อพิสูจน์ว่าเทสต์ใหม่จับบั๊กได้จริง ไม่ใช่เทสต์ที่เขียวทั้งก่อนและหลัง
- **อัปเดต `AUTOPILOT.md`** — ติ๊กข้อ Undo และเขียน Next task เป็นข้อ No-show
  พร้อมแยกเกณฑ์นั้นออกเป็น 4 ท่อนไว้ให้รอบหน้า

## Why

**ทำไมบั๊กนี้รอดเทสต์ 129 ข้อมาได้:** เทสต์ undo เดิมใช้ `expect.objectContaining({...})`
ซึ่งโดยธรรมชาติ **ตรวจจับ field ที่หลงเหลือไม่ได้เลย** — เช็คแค่ว่า key ที่คาดหวังมีครบ
ไม่ได้เช็คว่ามี key ส่วนเกินไหม จึงเปลี่ยนไปเช็ค `updateOrderStatus.mock.calls` ด้วย
`toStrictEqual` แทน (`toHaveBeenCalledWith` ก็ใช้ไม่ได้ เพราะมันมองว่า `{a: undefined}`
เท่ากับ `{}` — จะผ่านทั้งที่โค้ดยังพัง)

**ทำไมต้องแก้ที่ repo layer ด้วย:** snapshot อย่างเดียวไม่พอ เพราะ Firestore ไม่มีแนวคิด
"เซ็ตเป็น undefined" — ต้องใช้ sentinel `deleteField()` ถึงจะลบ field ออกจริง
patch ปกติของ action ไม่เคยมี key ที่เป็น `undefined` อยู่แล้ว จึงไม่กระทบ path เดิม

**ทำไม `confirmCancel` ยังมี early return:** ย้าย patch ออกมาเป็น `Q.cancel()` แล้ว
แต่ยังต้อง `return` ก่อนถึง `setCancelId(null)` เมื่อเหตุผลว่าง ไม่งั้น panel จะปิดตัวเอง
ทั้งที่ยังไม่ได้บันทึก — เทสต์เดิม "cancel requires a reason" พึ่งพาพฤติกรรมนี้อยู่

**บั๊กที่พบจริง (ยืนยันด้วย red phase — 9 เทสต์ล้ม):**

| action | field ที่ค้างอยู่หลัง undo (ก่อนแก้) |
|---|---|
| `callNext` / `callSpecific` บน order ที่ยังไม่เคยถูกเรียก | `servingAt`, `announcedAt` |
| `markDone` | `doneAt` |
| `cancel` (ทั้งจาก waiting และ serving) | `cancelReason` |
| `skip`, `recall`, `reannounce` | (ไม่มี — ผ่านอยู่แล้ว) |

ผลกระทบจริงคือความถูกต้องของข้อมูล: order ที่ undo กลับเป็น `waiting` จะพก `servingAt`
กับ `announcedAt` ติดตัวไป, order ที่กลับมาเป็น `serving` จะพก `doneAt`, และ order ที่ยังไม่ถูก
ยกเลิกจะพก `cancelReason` ค้างไว้ ตรงตัวอักษรของเกณฑ์ที่ว่า "คืนสถานะ **+ เวลาเดิม**" คือไม่ผ่าน

## Verification

รัน Verify command ตามที่กำหนด (`npm test && npm run build`):

```
Test Files  39 passed (39)
     Tests  142 passed (142)          <- เดิม 129, เพิ่ม 13
=== BUILD ===
✓ built in 1.21s
PWA v1.3.0
precache  5 entries (845.95 KiB)
```

**Red phase** (ย้อน `orderSnapshot` เป็นเวอร์ชันบั๊กชั่วคราว แล้วรัน 3 ไฟล์ที่แก้):

```
Test Files  2 failed | 1 passed (3)
     Tests  9 failed | 24 passed (33)
```

เคสที่ล้มตรงกับที่เอกสาร audit ทำนายไว้เป๊ะ: `orderSnapshot`, round-trip ของ
`callNext (fresh waiting)` / `callSpecific (fresh waiting)` / `markDone` / `cancel` ทั้งสองเคส
และ UI ทั้ง 3 เคส ส่วน `skip` / `recall` / `reannounce` เขียวตั้งแต่ก่อนแก้
จากนั้น `git checkout -- src/queue/queueActions.ts` คืนโค้ดที่แก้แล้วและรันซ้ำจนเขียว

หมายเหตุ: build จับ type error ที่ผมเขียนพลาดใน test helper (`Record<string, unknown> as Order`)
รอบแรก — แก้เป็น `as unknown as Order` แล้ว build ผ่าน

## What I did NOT do

- **ไม่ได้ติ๊กข้อ "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน"** ถึงแม้รอบนี้จะเขียวและ build ผ่าน
  — ข้อนั้นเป็นเกณฑ์ครอบทั้งงาน ควรติ๊กตอนตรวจครบทุกข้อแล้ว ไม่ใช่ติ๊กจากรอบเดียว
- **ไม่ได้แตะ idempotency guard ของ `cancel`** — action อื่นทุกตัวมี guard คืน `null`
  เมื่อ status ไม่ตรง แต่ `cancel` มีแค่ guard "เหตุผลว่าง" ซึ่งตรงกับพฤติกรรมเดิมของ panel เป๊ะ
  จงใจไม่แตะเพราะ **Idempotency เป็น acceptance criterion แยกอีกข้อ** ที่ยังไม่ถึงคิว
  การใส่ guard ตอนนี้จะเป็นการแก้ล่วงหน้าโดยไม่มีเทสต์รองรับ
  (ในทางปฏิบัติปุ่มยกเลิกแสดงเฉพาะบนการ์ด waiting/serving อยู่แล้ว จึงยังกดผิดสถานะไม่ได้)
- ไม่ได้อัปเดตเลข "129 automated tests" ในหัวข้อ Portfolio ท้าย `AUTOPILOT.md` (ตอนนี้ 142)
  — ไม่ใช่งานของรอบนี้ และแตะแล้วจะเป็น scope creep
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc` — ไม่ได้เพิ่ม dependency — ไม่ได้แตะ logic บัญชี / เมนู / comms

## Risk

**1. `deleteField()` ไม่เคยถูกใช้กับ Firestore ตัวจริงในโปรเจคนี้มาก่อน**
เทสต์ mock `firebase/firestore` ทั้งก้อน จึงพิสูจน์ได้แค่ว่า "เราส่ง sentinel ที่ถูกต้องออกไป"
ไม่ได้พิสูจน์พฤติกรรมของ Firestore จริง ประเด็นที่ควรดู: ถ้า `firestore.rules` มี validation
ที่บังคับว่า field ต้องมีอยู่ การลบ field อาจถูก reject (ห้ามแก้ rules จึงไม่ได้แตะ —
reviewer ควรเปิดดู rules ประกอบ) และควรลองกดจริงบนเครื่องหนึ่งเครื่องก่อนใช้งานวันงาน

**2. round-trip test ใช้ helper `write()` ที่จำลอง semantics ของ Firestore เอง**
(key ที่มีค่า = เขียนทับ, key ที่เป็น `undefined` = ลบ) helper นี้ไม่ใช่โค้ด production
ความถูกต้องของมันผูกกับเทสต์ใน `ordersRepo.test.ts` ที่ pin การแปลง `undefined → deleteField()`
ถ้าใครแก้ `updateOrderStatus` ให้เลิกแปลง เทสต์ ordersRepo จะจับได้ แต่ round-trip test
ใน `queueActions.test.ts` จะยังเขียวอยู่ — เป็นคู่ที่ต้องอ่านด้วยกัน (ผมเขียน comment โยงไว้แล้ว)

**3. เทสต์ `orderSnapshot` เดิมถูกเขียนใหม่ (ไม่ได้ถูกลบ)**
ของเดิมชื่อ "captures only defined mutable fields" ซึ่งเป็นการ assert พฤติกรรมที่บั๊ก
ตอนนี้เปลี่ยนเป็น "captures every mutable field, undefined meaning was absent" และใช้
`toStrictEqual` แทน `toEqual` — **เข้มขึ้น ไม่ได้อ่อนลง** reviewer ควรยืนยันจุดนี้เอง
นี่เป็นการแก้เทสต์เพียงจุดเดียวในรอบนี้ และเหตุผลคือเทสต์เดิม assert พฤติกรรมผิด

**4. เทสต์ undo ระดับ UI 3 ตัวใหม่ ไม่ได้ทับซ้อนกับเทสต์ undo เดิม — มันแทนที่**
เทสต์เดิมชื่อ "undo restores the prior state of the last action" (ใช้ `objectContaining`)
ถูกแทนด้วย "undo of เสร็จ..." ที่ครอบเคสเดียวกันแต่เข้มกว่า จำนวนเทสต์จึงเพิ่มสุทธิ 13 ไม่ใช่ 14

**5. เกณฑ์ Undo ถูกติ๊กจากหลักฐานระดับ unit/component ไม่ใช่การกดจริงบนเครื่องจริง**
round-trip พิสูจน์ที่ระดับ patch semantics + UI wiring ครบทุก action แต่ไม่มีใคร
กดปุ่มบนอุปกรณ์จริงต่อ Firestore จริงในรอบนี้ (headless server, ไม่มี network) —
ตรงกับนิยาม "เสร็จ" ใน Goal ที่ระบุว่าต้องพิสูจน์ด้วย **เทสต์อัตโนมัติที่รันได้จริง**
แต่ reviewer ควรรู้ว่าขอบเขตของหลักฐานอยู่แค่ไหน
