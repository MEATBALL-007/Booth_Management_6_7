# SUMMARY — รอบวันที่ 2026-08-19

งานของรอบนี้: ทำข้อ **Undo** ซ้ำ ตามสเปกที่รอดมาจากรอบ 2026-08-13
(`docs/autopilot/2026-08-13-undo-audit-findings.md`) ซึ่งรอบนั้นทำเสร็จแล้วแต่โค้ดถูกลบทิ้ง
เพราะ commit ไม่ได้ (เครื่องไม่มี git identity) แล้ว runner สั่ง `checkout --force` ทับ

**ผลลัพธ์: บั๊กถูกแก้แล้ว พิสูจน์ด้วยเทสต์ครบทุก action และ commit เรียบร้อย — ติ๊กเกณฑ์ข้อ Undo แล้ว**

## What I did

- **แก้บั๊ก undo 3 จุด ตามสเปก** (commit `2791ffe`)
  - `src/queue/queueActions.ts` — `orderSnapshot` คืน field ที่ undo ได้ครบทุกตัว
    (`status`, `servingAt`, `doneAt`, `announcedAt`, `cancelReason`) โดย `undefined`
    แปลว่า "field นี้ไม่เคยมี ให้ลบทิ้ง" + เพิ่ม type `OrderSnapshot`
  - `src/order/ordersRepo.ts` — `updateOrderStatus` แปลง `undefined` ใน patch เป็น
    `deleteField()` (import จาก `firebase/firestore` ที่มีอยู่แล้ว — ไม่เพิ่ม dependency)
  - `src/screens/QueuePanel.tsx` — ย้าย patch ของ "ยกเลิก" ที่เขียน inline อยู่ ออกมาเป็น
    `Q.cancel(reason)` (patch เหมือนเดิมทุกประการ รวมทั้ง guard "เหตุผลว่าง → ไม่ทำอะไร")
- **เขียนเทสต์พิสูจน์ 19 เทสต์ใหม่** (129 → 148)
  - `src/queue/undoRoundTrip.test.ts` (ไฟล์ใหม่) — round-trip table test **10 เคส**
    ครอบคลุมทุก action ในทุก state ที่กดถึงได้จริง:
    `action → apply patch → apply snapshot → toStrictEqual(order เดิม)`
  - `src/screens/QueuePanel.undo.test.tsx` (ไฟล์ใหม่) — undo ระดับ UI 3 เคส (เสร็จ / เรียกคิวถัดไป / ยกเลิก)
  - `src/queue/queueActions.test.ts` — เทสต์ `cancel()` + เขียนเทสต์ `orderSnapshot` ใหม่
  - `src/order/ordersRepo.test.ts` — pin ว่า `undefined` ในการ patch กลายเป็น `deleteField()` จริง
  - `src/screens/QueuePanel.test.tsx` — เปลี่ยน assertion ของเทสต์ undo เดิมจาก
    `objectContaining` เป็น `toStrictEqual` บน `mock.calls`
- **ติ๊ก checkbox ข้อ Undo ใน `AUTOPILOT.md`** และตั้ง Next task เป็นข้อ No-show พร้อมชี้เป้าไว้ 4 ท่อน

## Why

**ทำไมบั๊กนี้รอดเทสต์ 129 ข้อมาได้:** เทสต์ undo เดิมใช้ `expect.objectContaining({...})` ซึ่งเป็น
subset matcher — มันเช็คว่า key ที่คาดหวังมีครบ แต่ไม่เคยเช็คว่ามี key ส่วนเกินไหม field ที่ค้างอยู่
จึงมองไม่เห็น (`toHaveBeenCalledWith` ก็เหมือนกัน และยังมองข้าม key ที่มีค่า `undefined` ด้วย)
รอบนี้จึง assert บน `updateOrderStatus.mock.calls` ด้วย `toStrictEqual` ตามที่สเปกกำหนด

**ทำไมต้องแก้ที่ repo layer ด้วย:** snapshot อย่างเดียวไม่พอ เพราะ Firestore ไม่มีแนวคิด
"เซ็ตเป็น undefined" และ `updateDoc` เป็นการ merge — key ที่ไม่อยู่ใน patch จะคงค่าเดิมไว้
ต้องใช้ sentinel `deleteField()` ถึงจะลบ field ออกจริง patch ปกติของ action ไม่เคยมี key
ที่เป็น `undefined` อยู่แล้ว การเปลี่ยนนี้จึงไม่กระทบ path เดิม (เทสต์ `updateOrderStatus` เดิมยังเขียว)

**ทำไมต้องดึง `cancel` ออกมา:** action เดียวที่ patch เขียน inline อยู่ใน JSX handler คือ "ยกเลิก"
ซึ่งไม่มีรอยต่อให้ unit test เข้าถึง — และมันคือ action ที่ทิ้ง field ค้างไว้ 100% ของเวลา

**บั๊กที่พบจริง (ยืนยันจาก red phase — 5 ใน 10 เคสแดงก่อนแก้ ตรงกับที่สเปกทำนายไว้เป๊ะ):**

| action | field ที่ค้างอยู่หลัง undo (ก่อนแก้) |
|---|---|
| `callNext` / `callSpecific` บน order ที่ยังไม่เคยถูกเรียก | `servingAt`, `announcedAt` |
| `markDone` | `doneAt` |
| `cancel` (ทั้งจาก waiting และ serving) | `cancelReason` |
| `skip`, `recall`, `reannounce` | (ไม่มี — ผ่านอยู่แล้ว) |

เหตุผลที่ 3 ตัวหลังผ่านอยู่แล้ว: action จะทิ้งขยะไว้ก็ต่อเมื่อมัน **สร้าง field ที่ยังไม่มี**
ถ้าเขียนทับ field ที่มีอยู่แล้ว snapshot ก็พาค่าเดิมกลับมาได้ครบ

## Verification

รัน Verify command ตามที่กำหนด (`npm test && npm run build`) — ผลล่าสุดหลังแก้ครบ:

```
Test Files  41 passed (41)
     Tests  148 passed (148)          <- เดิม 129, เพิ่ม 19
=== BUILD ===
✓ built in 1.12s
PWA v1.3.0
precache  5 entries (846.11 KiB)
```

**Red phase (ยืนยันว่าเทสต์ไม่ vacuous):** ก่อนแตะโค้ด production รันเทสต์ใหม่ทั้งหมดแล้วได้
`12 failed | 23 passed` และเคสที่แดงคือเคสที่สเปกทำนายไว้พอดี — `callNext (fresh waiting)`,
`callSpecific (fresh waiting)`, `markDone`, `cancel` ทั้ง 2 เคส, undo ระดับ UI ทั้ง 3 เคส,
เทสต์ undo เดิมที่เพิ่งขันให้แน่น, `cancel()`, `orderSnapshot` และ `deleteField` mapping
ส่วน `skip` / `recall` / `reannounce` / เคสที่ order มี timestamp เดิมอยู่แล้ว เขียวตั้งแต่ก่อนแก้
นอกจากนี้ round-trip test แต่ละเคสมี `expect(after).not.toStrictEqual(order)` กันเคสที่
action ไม่ได้เปลี่ยนอะไรเลยแล้วเทสต์ผ่านฟรีๆ

ระหว่างทาง `tsc -b` จับ error ในไฟล์เทสต์ใหม่ (cast `Record<string, unknown>` → `Order`)
แก้แล้วและ build ผ่าน — เทสต์ผ่านตั้งแต่ก่อนแก้จุดนี้ เพราะ vitest ไม่ได้ type-check

## What I did NOT do

- **ไม่ได้แตะ idempotency guard ของ `cancel`** — action อื่นทุกตัวคืน `null` เมื่อ status ไม่ตรง
  แต่ `cancel` มีแค่ guard "เหตุผลว่าง" (ตรงกับพฤติกรรมเดิมของ panel เป๊ะ) จงใจไม่แตะเพราะ
  **Idempotency เป็น acceptance criterion แยกอีกข้อหนึ่ง** ที่ยังไม่ถึงคิว การใส่ guard ตอนนี้
  คือแก้ล่วงหน้าโดยไม่มีเทสต์รองรับ (ปุ่มยกเลิกแสดงเฉพาะบนการ์ด waiting/serving อยู่แล้ว)
- ไม่ได้ติ๊กข้อ "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน" ถึงแม้รอบนี้จะเขียวและ build ผ่าน —
  ข้อนั้นเป็นเกณฑ์ครอบทั้งงาน ควรติ๊กตอนตรวจครบทุกข้อแล้ว
- ไม่ได้อัปเดตเลข "129 automated tests" ในหัวข้อ Goal/Portfolio ของ `AUTOPILOT.md` (ตอนนี้ 148)
  — รอบก่อนก็จงใจไม่แตะ ไม่ใช่งานของรอบนี้ และมันจะเก่าอีกทุกรอบ
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc` — ไม่ได้เพิ่ม dependency — ไม่ได้แตะ logic บัญชี / เมนู / comms

## Risk

**1. `deleteField()` ยังไม่เคยถูกใช้กับ Firestore ตัวจริงในโปรเจคนี้** — เทสต์ mock
`firebase/firestore` ทั้งก้อน จึงพิสูจน์ได้แค่ว่า "เราส่ง sentinel ที่ถูกต้องออกไป" ไม่ได้พิสูจน์
พฤติกรรมของ Firestore จริง ประเด็นที่ reviewer ควรดู: ถ้า `firestore.rules` มี validation ที่บังคับว่า
field ต้องมีอยู่ การลบ field อาจถูก reject (ผมห้ามแก้ rules จึงไม่ได้แตะ — ควรเปิดดู rules ประกอบ)
Firestore offline queue รองรับ `deleteField()` ปกติ แต่ควรลองกดจริงสัก 1 เครื่องก่อนวันงาน

**2. round-trip test ใช้ helper `write()` ที่จำลอง semantics ของ Firestore เอง**
(key ที่มีค่า = เขียนทับ, key ที่เป็น `undefined` = ลบ) helper นี้ไม่ใช่โค้ด production
ความถูกต้องของมันผูกกับเทสต์ใน `ordersRepo.test.ts` ที่ pin การแปลง `undefined → deleteField()`
ถ้าใครแก้ `updateOrderStatus` ให้เลิกแปลง เทสต์ ordersRepo จะจับได้ แต่ round-trip test
จะยังเขียวอยู่ — เป็นคู่ที่ต้องอ่านด้วยกัน (มีคอมเมนต์โยงกันไว้แล้วในทั้งสองไฟล์)

**3. เทสต์ `orderSnapshot` เดิมถูกเขียนใหม่ (ไม่ได้ถูกลบ)** — ของเดิมชื่อ
"captures only defined mutable fields" ซึ่ง assert พฤติกรรมที่เป็นบั๊กเอาไว้ ตอนนี้เป็น
"captures every mutable field, undefined meaning was absent" และใช้ `toStrictEqual` แทน
`toEqual` — **เข้มขึ้น ไม่ได้อ่อนลง** แต่ reviewer ควรยืนยันจุดนี้ด้วยตาเอง เพราะเป็นการแก้เทสต์เดิม

**4. `orderSnapshot` เปลี่ยน return type จาก `Partial<Order>` เป็น `OrderSnapshot`**
ตอนนี้มีผู้ใช้แค่ `QueuePanel` ที่เดียว (`tsc -b` ผ่าน) แต่ถ้ามี branch อื่นที่ยังไม่ merge
เรียกใช้อยู่ อาจต้องปรับตอน merge
