# SUMMARY — รอบวันที่ 2026-08-19

งานของรอบนี้: ทำ acceptance criterion ข้อ **Undo** ซ้ำตามสเปกใน
`docs/autopilot/2026-08-13-undo-audit-findings.md` (รอบก่อนทำเสร็จแล้วแต่ commit ไม่ได้
เพราะเครื่องไม่มี git identity แล้วโค้ดถูก `checkout --force` ทับหาย)

**ผลลัพธ์: บั๊กที่เอกสารระบุไว้มีอยู่จริงในโค้ดบน branch นี้ — แก้แล้ว พิสูจน์ด้วยเทสต์แล้ว
และ commit แล้ว (`d72bbc6`) เกณฑ์ข้อ Undo ถูกติ๊กในไฟล์ `AUTOPILOT.md`**

## What I did

- **แก้ 3 จุดตามเอกสาร** (ยืนยันก่อนว่าโค้ดปัจจุบันยังเป็นเวอร์ชันที่มีบั๊กจริง)
  - `src/queue/queueActions.ts` — `orderSnapshot` คืน field ที่ undo ได้ครบทุกตัว
    (`status`, `servingAt`, `doneAt`, `announcedAt`, `cancelReason`) โดย `undefined`
    แปลว่า "field นี้ไม่เคยมี ให้ลบทิ้ง" + เพิ่ม type `OrderSnapshot` และย้าย patch ของ
    "ยกเลิก" มาเป็น `cancel(reason)` ที่นี่
  - `src/order/ordersRepo.ts` — `updateOrderStatus` แปลง `undefined` ใน patch เป็น
    `deleteField()` (import จาก `firebase/firestore` ที่มีอยู่แล้ว — ไม่เพิ่ม dependency)
  - `src/screens/QueuePanel.tsx` — `confirmCancel` เรียก `Q.cancel(reason)` แทน patch inline
    (พฤติกรรมเดิมทุกประการ: เหตุผลว่าง = ไม่ทำอะไรและไม่ปิด panel)
- **เขียนเทสต์ใหม่ 14 ตัว** (ทั้งชุด 133 → 147: ไฟล์ใหม่ 12 + เพิ่มในไฟล์เดิม 2
  และเขียนเทสต์ `orderSnapshot` เดิมใหม่อีก 1 ตัว ซึ่งนับรวมอยู่แล้ว)
  - `src/queue/undoRoundTrip.test.ts` (ใหม่) — table test 9 เคส ครอบคลุมทุก action ในทุก state
    ที่กดถึงได้: `action → เขียน patch → เขียน snapshot → toStrictEqual(order เดิม)`
  - `src/screens/QueuePanel.undo.test.tsx` (ใหม่) — undo ระดับ UI 3 เคส (เสร็จ / เรียกคิวถัดไป / ยกเลิก)
  - `src/order/ordersRepo.test.ts` — เพิ่ม 1 เคส pin ว่า `undefined` กลายเป็น `deleteField()` จริง
  - `src/queue/queueActions.test.ts` — เพิ่มเคส `cancel` และเขียนเทสต์ `orderSnapshot` ใหม่ให้
    assert พฤติกรรมที่ถูก (`toStrictEqual` แทน `toEqual`)
- **อัปเดต `AUTOPILOT.md`** — ติ๊กข้อ Undo พร้อมชี้ไปที่ commit และไฟล์เทสต์, เขียน "Next task"
  ใหม่เป็นข้อ No-show พร้อมรายชื่อไฟล์ทั้งสองฝั่งที่ต้องอ่าน

## Why

- **ทำไมต้องแก้ที่ repo layer ด้วย:** Firestore ไม่มีแนวคิด "เซ็ตเป็น undefined" และ `updateDoc`
  เป็นการ merge — ถ้าไม่ส่ง sentinel `deleteField()` field ที่ action สร้างขึ้นจะรอดจาก undo เสมอ
  patch ปกติของ action ไม่เคยมี key ที่เป็น `undefined` การเปลี่ยนนี้จึงไม่กระทบ path เดิม
- **ทำไมเทสต์ใหม่ต้องใช้ `toStrictEqual` บน `mock.calls`:** `objectContaining`,
  `toHaveBeenCalledWith` และ `toEqual` มองข้าม key ส่วนเกินและ key ที่มีค่า `undefined` ทั้งหมด
  — นั่นคือเหตุผลที่บั๊กนี้รอดเทสต์ชุดเดิมมาได้ ต้องเทียบ argument ดิบทั้งก้อนเท่านั้น
- **ทำไมเทสต์ round-trip อยู่ไฟล์ใหม่ (ไม่ใช่ `queueActions.test.ts` ตามที่เอกสารเขียน):**
  branch autopilot อื่นที่ยังไม่ merge เป็นเจ้าของไฟล์เทสต์เดิม ไฟล์ใหม่จึงไม่ชนกับใคร
  ส่วนที่จำเป็นต้องแก้ในไฟล์เดิมคือเทสต์ `orderSnapshot` เก่า ซึ่ง assert พฤติกรรมที่บั๊กอยู่ — เลี่ยงไม่ได้
- **เพิ่มเคสที่เอกสารไม่ได้ระบุ 1 เคส:** callNext บน waiting order ที่พก `servingAt`/`announcedAt`
  เก่าติดมา (เอกสารรุ่นก่อนหน้า/ข้อมูลเก่าจากก่อนแก้) — พิสูจน์ว่า undo **คืนค่าเดิม** ไม่ใช่ลบทิ้งเสมอ

**บั๊กที่พบจริง (ตรงกับตารางในเอกสารทุกช่อง):**

| action | field ที่ค้างอยู่หลัง undo (ก่อนแก้) |
|---|---|
| `callNext` / `callSpecific` บน order ที่ยังไม่เคยถูกเรียก | `servingAt`, `announcedAt` |
| `markDone` | `doneAt` |
| `cancel` | `cancelReason` |
| `skip`, `recall`, `reannounce` | (ไม่มี — ผ่านอยู่แล้ว) |

## Verification

รัน red phase ก่อนแก้โค้ด — ล้มจริง 6 เคส + 1 ไฟล์ (import `cancel` ที่ยังไม่มี):

```
FAIL src/queue/undoRoundTrip.test.ts [ import cancel ]
FAIL src/order/ordersRepo.test.ts > updateOrderStatus turns an explicit undefined ... deleteField()
FAIL src/queue/queueActions.test.ts > cancel records the trimmed reason ...
FAIL src/queue/queueActions.test.ts > orderSnapshot captures every mutable field ...
FAIL src/screens/QueuePanel.undo.test.tsx > undo of "เสร็จ" ...
FAIL src/screens/QueuePanel.undo.test.tsx > undo of "เรียกคิวถัดไป" ...
FAIL src/screens/QueuePanel.undo.test.tsx > undo of "ยกเลิก" ...
Test Files  4 failed (4)   Tests  6 failed | 11 passed (17)
```

หลังแก้ รัน Verify command ตามที่กำหนด (`npm test && npm run build`):

```
Test Files  41 passed (41)
     Tests  147 passed (147)
=== BUILD ===
tsc -b ผ่าน
✓ built in 4.19s
PWA v1.3.0  precache 5 entries (846.08 KiB)
```

## What I did NOT do

- ไม่ได้ติ๊กข้อ "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน" ถึงแม้รอบนี้จะเขียวและ build ผ่าน —
  ข้อนั้นเป็นเกณฑ์ครอบทั้งงาน ควรติ๊กตอนตรวจครบทุกข้อแล้ว (เหตุผลเดียวกับรอบ 13 ส.ค.)
- **ไม่ได้แตะ idempotency guard ของ `cancel`** — action อื่นทุกตัวมี guard คืน `null` เมื่อ status
  ไม่ตรง แต่ `cancel` มีแค่ guard "เหตุผลว่าง" ซึ่งตรงกับพฤติกรรมเดิมของ panel เป๊ะ
  จงใจไม่แตะเพราะ Idempotency เป็น acceptance criterion แยกอีกข้อที่ยังไม่ถึงคิว
- ไม่ได้อัปเดตเลข "129 automated tests" ในหัวข้อ Portfolio ท้าย `AUTOPILOT.md` (ตอนนี้ 147)
  — ไม่ใช่งานของรอบนี้ และเลขจะขยับอีกทุกรอบ
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`, `.env*`,
  `.firebaserc` — ไม่ได้เพิ่ม dependency — ไม่ได้แตะ logic บัญชี / เมนู / comms
- ไม่ได้ลบหรือแก้เทสต์ไหนให้อ่อนลง (เทสต์ `orderSnapshot` เดิมถูกเขียนใหม่ให้ **เข้มขึ้น**)

## Risk

**1. `deleteField()` ยังไม่เคยถูกใช้กับ Firestore ตัวจริงในโปรเจคนี้**
เทสต์ mock `firebase/firestore` ทั้งก้อน จึงพิสูจน์ได้แค่ว่า "เราส่ง sentinel ที่ถูกต้องออกไป"
ไม่ได้พิสูจน์พฤติกรรมของ Firestore จริง reviewer ควรดู `firestore.rules` ประกอบว่ามี validation ที่
บังคับให้ field ต้องมีอยู่หรือไม่ (ผมห้ามแก้ rules จึงไม่ได้แตะ) และควรกดจริงบนเครื่องหนึ่งเครื่อง
ก่อนใช้งานวันงาน — โดยเฉพาะตอน offline แล้ว sync กลับ

**2. round-trip test ใช้ helper `write()` ที่จำลอง semantics ของ Firestore เอง**
(key ที่มีค่า = เขียนทับ, key ที่เป็น `undefined` = ลบ) helper นี้ไม่ใช่โค้ด production
ความถูกต้องของมันผูกกับเทสต์ใน `ordersRepo.test.ts` ที่ pin การแปลง `undefined → deleteField()`
ถ้าใครแก้ `updateOrderStatus` ให้เลิกแปลง เทสต์ ordersRepo จะจับได้ แต่ round-trip test
จะยังเขียวอยู่ — เป็นคู่ที่ต้องอ่านด้วยกัน (เขียนหมายเหตุนี้ไว้ในหัวไฟล์เทสต์แล้ว)

**3. `updateOrderStatus` ตอนนี้สร้าง object ใหม่ทุกครั้งแทนที่จะส่ง patch ตรงๆ**
เป็นการเปลี่ยน hot path ที่ทุกการเขียน order ผ่าน — ตรวจแล้วว่าเทสต์ `ordersRepo` เดิม
(`{ status: 'serving', servingAt: 42 }`) ยังผ่านและได้ payload หน้าตาเดิม แต่ reviewer
ควรยืนยันว่าไม่มีที่ไหนส่ง `Partial<Order>` ที่มี key `undefined` มาโดยตั้งใจให้ Firestore ข้าม
(ตรวจแล้วไม่พบ — patch ทุกตัวสร้างจาก `queueActions`)

**4. UI เทสต์ผูกกับข้อความปุ่มภาษาไทย** (`ยกเลิก/แก้ไข`, `ย้อนกลับ`) เหมือนเทสต์เดิมในไฟล์
`QueuePanel.test.tsx` — ถ้ามีรอบไหนแก้ label ใน `src/i18n/labels.ts` เทสต์ชุดนี้จะแดงทันที
ซึ่งเป็นพฤติกรรมที่ตั้งใจ (ให้รู้ตัว) แต่ reviewer ควรรู้ว่ามันไม่ใช่บั๊กของ logic
