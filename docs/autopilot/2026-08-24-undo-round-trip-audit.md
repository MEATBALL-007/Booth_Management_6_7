# Undo round-trip audit — รอบ 2026-08-24 (0053)

เกณฑ์ที่ตรวจ: `docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md:17`

> Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)

**ผล: เกณฑ์นี้ไม่ผ่านของเดิม — บั๊กจริง แก้แล้ว พิสูจน์ครบทุก action**

รอบนี้ทำซ้ำงานที่รอบ 2026-08-13 ทำเสร็จแล้วแต่ commit ไม่ได้ (เครื่องไม่มี git identity
ตอนนั้น แล้วโดน `checkout --force` ทับ) โดยใช้ `docs/autopilot/2026-08-13-undo-audit-findings.md`
เป็นสเปก — **แต่ยืนยันทุกข้ออ้างของมันกับโค้ดจริงบน branch นี้ก่อน** ไม่ได้ลอกมาเฉยๆ

---

## 1. ยืนยันว่าบั๊กยังมีชีวิตอยู่ (ทำก่อนเขียนอะไรทั้งสิ้น)

| ที่อยู่ (ก่อนแก้) | สิ่งที่เห็น |
|---|---|
| `src/queue/queueActions.ts:36-43` | `orderSnapshot()` คัดลอกเฉพาะ field ที่ `!== undefined` |
| `src/order/ordersRepo.ts:25-27` | `updateOrderStatus` = `updateDoc` ตรงๆ (merge) |
| `src/queue/queueActions.test.ts:47` | ชื่อเทสต์คือ "captures **only defined** mutable fields" |
| `src/screens/QueuePanel.tsx:40` | patch ของ "ยกเลิก" เขียน **inline ในพาเนล** ไม่ได้อยู่ใน `queueActions` |

→ **field ที่ action เป็นคนสร้างขึ้นมาใหม่ รอดจากการ undo เสมอ** เพราะ snapshot ไม่เอ่ยถึงมัน
และ `updateDoc` merge → key ที่ไม่ได้ถูกเอ่ยถึงคงค่าเดิมไว้

ตารางบั๊กต่อ action (ยืนยันตรงกับเอกสาร 0813 ทุกช่อง):

| action | field ที่ค้างอยู่หลัง undo |
|---|---|
| `callNext` / `callSpecific` บนคิวที่**ยังไม่เคยถูกเรียก** | `servingAt`, `announcedAt` |
| `markDone` | `doneAt` |
| `cancel` | `cancelReason` |
| `skip`, `recall`, `reannounce` | ไม่มี — สามตัวนี้เขียนทับของที่มีอยู่แล้ว |

**เหตุที่รอดเทสต์ 133 ตัวมาได้** — fixture ของเทสต์เดิมบังเอิญมี `servingAt` ติดมาอยู่แล้ว
บั๊กกัดเฉพาะ field ที่ action **ประดิษฐ์ขึ้นใหม่** เท่านั้น
และ `objectContaining` / `toHaveBeenCalledWith` **มองข้าม key ที่มีค่า `undefined` เหมือนกันทั้งคู่**
→ ต่อให้มีเทสต์ก็จับไม่ได้ ถ้าไม่ใช้ `toStrictEqual` บน `mock.calls` ทั้งลิสต์

---

## 2. สามสิ่งที่ต้องตัดสิน — ตัดสินแล้ว

### 2.1 "ครบทุก action" คือ action อะไรบ้าง

ไล่จาก `apply()` ใน `QueuePanel.tsx` ว่าใครเรียกบ้าง ไม่ได้เดาจากปุ่ม ได้ **7 action**:
`callNext` · `callSpecific` · `markDone` · `skip` · `recall` · `reannounce` · `cancel`

หกตัวแรกอยู่ใน `queueActions.ts` **ตัวที่เจ็ด (`cancel`) เขียน inline อยู่ในพาเนล**
→ round-trip test ระดับ pure function **มองไม่เห็นมันเลย** ทั้งที่มันเป็น action ที่มีบั๊ก

**ตัดสิน: ย้าย `cancel` ออกมาเป็น `Q.cancel(reason)`** (patch เหมือนเดิมเป๊ะ) เพื่อให้ทุก action
มีบ้านที่เดียวกันและถูกไล่ตรวจได้ครบ พาเนล**ยังเก็บ guard `!reason.trim()` ของตัวเองไว้**
เพราะมันคุมเรื่อง "พาเนลยกเลิกต้องไม่ปิดตัวเอง" ด้วย ไม่ใช่แค่กัน patch ว่าง
→ null branch ของ `Q.cancel` จึงเป็น **ป้อมชั้นสอง** ไม่ใช่การเปลี่ยนพฤติกรรม
(สถานะเดียวกับ guard `status !== 'waiting'` ของ `callSpecific` ที่บัญชีบันทึกไว้แล้วรอบ 0031)

### 2.2 `undefined` ใน patch หมายถึงอะไร

Firestore ไม่มีแนวคิด "เซ็ตเป็น undefined" — มีแค่สองอย่างคือ *เขียนทับ* กับ *ไม่เอ่ยถึง (merge)*
Undo ต้องการอย่างที่สาม: **"field นี้ไม่ควรมีอยู่"** ซึ่งคือ sentinel `deleteField()`

**การเปลี่ยนสอง จุดนี้ผูกกันแน่น ไม่ใช่ทางเลือก**: `src/lib/firebase.ts` **ไม่ได้ตั้ง
`ignoreUndefinedProperties`** → พอ `orderSnapshot` เริ่มเอ่ยถึง field ที่ไม่มี
`updateDoc` จะ **reject การเขียนทิ้งทั้งก้อน** ถ้าไม่มีตัวแปลงที่ repo layer
เขียนไว้ตรงนี้เพราะรอบหน้าอาจเห็นสองไฟล์นี้แล้วคิดว่าแยกกันแก้ได้

**ไม่แตะ logic บัญชี** — `updateOrderStatus` เป็น repo กลางของ `orders` ซึ่งมี field เงินอยู่ด้วย
จึง grep caller ใน production ซ้ำเองรอบนี้ (ไม่เชื่อผลรอบ 0036 ลอยๆ):

```
src/screens/QueuePanel.tsx:27   updateOrderStatus(order.id, patch)      <- patch จาก queueActions
src/screens/QueuePanel.tsx:36   updateOrderStatus(undo.id, undo.before) <- snapshot
```

**มีแค่สองจุด ทั้งคู่ส่งเฉพาะ status/timestamp/cancelReason** ไม่มีทางส่ง `{total: undefined}`
เข้าไปได้ และตัวแปลง **แตะเฉพาะ key ที่มีค่าเป็น `undefined`** — key ที่มีค่าจริงผ่านไปเหมือนเดิม
ล็อกไว้ด้วยเทสต์ D3 (ยิง `total`/`paymentStatus` เข้าไปแล้วต้องออกมาเท่าเดิม และ
`deleteField` ต้องไม่ถูกเรียกเลย) และ D5 (`createOrder` ไม่ผ่านตัวแปลง)

### 2.3 จะพิสูจน์ที่ระดับไหน — **ทั้งสองระดับ**

- **A (pure function)** `action → patch → snapshot → toStrictEqual(order เดิม)` — แข็งและอ่านง่าย
  แต่เห็นเฉพาะ patch ที่อยู่ใน `queueActions`
- **B (panel)** กดปุ่มจริง แล้ว `toStrictEqual` บน `updateOrderStatus.mock.calls` **ทั้งลิสต์**
  จับ field ส่วนเกินที่พาเนลเติมเอง และจับ "ยิงซ้ำสองครั้ง" ซึ่ง matcher ที่ดูครั้งเดียวมองไม่เห็น

M6 พิสูจน์ว่าการมีทั้งสองระดับไม่ใช่ของฟุ่มเฟือย: mutation ที่พาเนลฆ่า B1–B7 ครบ
ขณะที่ **section A ทั้งหมดเขียว** และเทสต์ undo เดิมใน `QueuePanel.test.tsx` ก็เขียว

---

## 3. สิ่งที่แก้

| ไฟล์ | การเปลี่ยน |
|---|---|
| `src/queue/queueActions.ts` | `orderSnapshot` คืน **ทุก** field ที่ undo ได้ (`undefined` = "ไม่เคยมี") + type `OrderSnapshot` + `cancel()` |
| `src/order/ordersRepo.ts` | `withDeletions()` แปลง `undefined` → `deleteField()` (import จาก `firebase/firestore` ที่ใช้อยู่แล้ว — **ไม่เพิ่ม dependency**) |
| `src/screens/QueuePanel.tsx` | ใช้ `Q.cancel(reason)` แทน patch inline; undo state เป็น `Q.OrderSnapshot` |
| `src/queue/queueActions.test.ts` | เทสต์ `:47` ที่ **ล็อกตัวบั๊กไว้** — เปลี่ยนชื่อให้ตรงความจริงและใช้ `toStrictEqual` |

เทสต์ใหม่ 36 ตัวใน **ไฟล์ใหม่ 2 ไฟล์** (ไม่ชน branch อื่น):
`src/undoRoundTrip.audit.test.tsx` (31) · `src/undoDeleteField.audit.test.ts` (5)

**ทำไมต้องสองไฟล์**: section B ต้อง `vi.mock('./order/ordersRepo')` ทั้งโมดูล ซึ่งทำให้
เทสต์ที่ต้องเรียก `updateOrderStatus` **ตัวจริง** อยู่ไฟล์เดียวกันไม่ได้

**หมายเหตุเรื่องเทสต์เดิมที่แก้**: ของเดิมใช้ `toEqual` ซึ่ง **มองข้าม key ที่มีค่า `undefined`**
→ มัน**ยังเขียวอยู่**หลังแก้ production ด้วยซ้ำ ที่ต้องแก้คือ **ชื่อ**ของมัน ซึ่งประกาศสัญญาที่
เป็นเท็จไปแล้ว ("captures only defined mutable fields" = คำบรรยายของตัวบั๊ก) เปลี่ยนเป็น
`toStrictEqual` ด้วย = **เข้มขึ้น ไม่ได้อ่อนลง**

---

## 4. Mutation check — break 13 แบบ ทำนายไว้ก่อนทุกแบบ

| # | ทำอะไร | ทำนาย | ผลจริง |
|---|---|---|---|
| M1 | คืน `orderSnapshot` เป็นของเดิม (= ตัวบั๊ก) | A1×5, A3, A4, B1–B7, เทสต์เดิม = 15 | **ตรง 15** |
| M2 | ถอดตัวแปลง `deleteField` ทิ้ง | D1, D4 | ตรง (**D2 เขียว**) |
| M3 | ใส่ `deleteField` ให้ **ทุก** key | D1, D3 | ตรง + เทสต์ `ordersRepo` เดิม |
| M4 | `cancel` เลิก trim/guard | A5 | **ตรง A5 ตัวเดียว** |
| M5 | ทำให้ `markDone` คืน patch ว่าง | A2(markDone), B3 | ตรง + A3 + เทสต์เดิม |
| M6 | พาเนลกรอง `undefined` ทิ้งก่อนส่ง undo | B1–B7 | **ตรง 7 · A และ D เขียวหมด** |
| M7 | ทำให้ตัวสแกนของ A3 ตาบอด (อ่านเคสเดียว) | A3 | ตรง |
| M8 | `write()` เลิกลบ field (= merge ที่ไม่เคยลบ) | A1×5 | ตรง |
| M9 | `orderSnapshot` ลืม `status` | A1×10, A3, A4, B1–B7 | **ตรง 19** |
| M10 | `write()` เมิน patch ทั้งก้อน | A2×10 แดง, **A1×10 เขียว** | **ตรงเป๊ะ** |
| M11 | ตัด key ที่เป็น `undefined` ทิ้งแทนที่จะส่ง sentinel | D1, D2, D4 | ตรง |
| M12 | เอาตัวแปลงไปใส่ `createOrder` ด้วย | D5 | ตรง |
| M13 | `runUndo` ไม่ล้างแถบ undo | B8 | ตรง |

**ทุกเทสต์ทั้ง 36 ตัวถูกฆ่าอย่างน้อย 1 แบบ**

### สิ่งที่ mutation check สอน (สำคัญกว่าตัวเลข)

1. **M1 คือหลักฐานว่าช่องว่างเป็นของจริง** — บั๊กกลับมาเต็มรูปแบบ แต่ `Test Files 2 failed | 39 passed`
   → **ไฟล์เทสต์เดิมทั้ง 39 ไฟล์เขียวหมด** แดงเฉพาะสองไฟล์ที่เขียนรอบนี้
2. **M10 คือคู่หูของ M5 และเป็นบทเรียนที่คุ้มที่สุด** — พอ `write()` เมิน patch
   **A1 ทั้ง 10 เคสเขียว** ทั้งที่ไม่มีอะไรเกิดขึ้นเลย (`undone === before` จริงเสมอเมื่อไม่มีการกระทำ)
   → เทสต์ตระกูล "ของกลับมาเหมือนเดิม" **เป็น vacuous โดยธรรมชาติ** ต้องมี A2 คู่เสมอ
3. **M2 เปิดโปงว่า D2 เพียงลำพังไม่มีฟัน** — ถอดตัวแปลงทิ้ง D2 ยังเขียว (key ยังครบ)
   มันมีค่าเฉพาะตอนจับคู่กับ D1 และเพิ่งมาแดงจริงตอน M11 (ตัด key ทิ้ง) ซึ่งเป็นเคสที่ D1/D4 ก็จับได้
   → D2 เป็นตัว**อธิบายเจตนา** มากกว่าตัวจับบั๊ก บันทึกไว้ตามตรง
4. **M6 คือเหตุผลที่ section B ต้องมีอยู่** — บั๊กที่พาเนล มองไม่เห็นเลยจาก pure function
5. **M8 ยืนยัน Risk ข้อ 3 ของเอกสาร 0813** — พลังของ A1 มาจาก helper `write()` ที่เทสต์เขียนเอง
   ไม่ใช่โค้ด production → ความถูกต้องของมันฝากไว้กับ D1/D2/D4 ในอีกไฟล์ **ต้องอ่านคู่กัน**

---

## 5. Verification

```
npm test    → Test Files  41 passed (41)
              Tests  169 passed (169)          (เดิม 133/39 — เพิ่ม 36 เทสต์ 2 ไฟล์)
npm run build → tsc -b ผ่าน · ✓ built in 2.72s
              PWA v1.3.0 · mode generateSW · precache 5 entries
              (!) warning "chunk > 500 kB" — มีมาก่อนรอบนี้ จงใจไม่แตะ เป็น warning ไม่ใช่ error
```

**red phase ก่อนแก้: `19 failed | 17 passed`** และเคสที่แดงตรงกับตารางบั๊กใน §1 เป๊ะ
(`skip`/`recall`/`reannounce` ระดับ A1 **ผ่านตั้งแต่ก่อนแก้** ตามที่ทำนาย)

**เช็ค isolation ด้วย ไม่ได้ดูแค่สีเขียว**: `grep -ci "@firebase\|GrpcConnection"` บน log
ของสองไฟล์ใหม่ = **0** → ไม่มีการหลุดไปคุย Firestore จริง

---

## 6. ขอบเขตของหลักฐาน (อ่านก่อนเชื่อ)

- **ไม่เคยเขียน Firestore จริงเลย** ทั้ง `ordersRepo` (section B) และ `firebase/firestore`
  (ไฟล์ D) ถูก mock → พิสูจน์ได้แค่ว่า **เราส่ง sentinel ที่ถูกต้องออกไป**
  **ไม่ได้พิสูจน์ว่า field หายไปจากเอกสารจริง** ไม่เคยเปิดเบราว์เซอร์ ไม่เคยกดปุ่มจริง
- `deleteField()` **ไม่เคยถูกใช้กับ Firestore ตัวจริงในโปรเจคนี้มาก่อน** — ถ้า `firestore.rules`
  มี validation ที่บังคับว่า field ต้องมีอยู่ การลบอาจถูก reject
  (**ห้ามแก้ rules** ตาม Out of scope → reviewer ควรเปิดดู rules ประกอบก่อนใช้งานวันงาน)
- helper `write()` ใน section A **จำลอง semantics ของ Firestore เอง** ไม่ใช่โค้ด production
  ถ้าใครแก้ `updateOrderStatus` ให้เลิกแปลง → D1/D2/D4 แดง แต่ **A1 จะยังเขียว** (M2 พิสูจน์แล้ว)
- B4/B5/B6 (`skip`/`recall`/`reannounce`) แดงใน red phase เพราะ **รูปร่างของ patch**
  ไม่ใช่เพราะ undo ของสามตัวนี้ทำข้อมูลหาย — §1 ระบุไว้แล้วว่าสามตัวนี้ไม่มีบั๊ก field ค้าง
  เทสต์เรียกร้อง patch ที่ครบถ้วน ซึ่งเป็นตัวการออกแบบ ไม่ใช่การรายงานบั๊กเพิ่ม **อย่าอ่านเกินจริง**

## 7. สิ่งที่จงใจไม่ทำ

- **ไม่ใส่ idempotency guard ให้ `cancel`** (action อื่นทุกตัวคืน `null` เมื่อ status ไม่ตรง)
  Idempotency เป็น **เกณฑ์แยกอีกข้อหนึ่ง** ซึ่งบัญชีระบุว่าปิดไปแล้วรอบ 0042 **บน branch อื่น**
  การใส่ตอนนี้คือแก้ล่วงหน้าโดยไม่มีเทสต์รองรับ และจะชนกับงานของ branch นั้นตอน merge
  ในทางปฏิบัติปุ่มยกเลิก render เฉพาะการ์ด waiting/serving อยู่แล้ว
- ไม่แตะ `firestore.rules` · `firestore.indexes.json` · `docs/superpowers/specs/` · `.env*` · `.firebaserc`
- ไม่เพิ่ม dependency · ไม่แตะ logic บัญชี / เมนู / comms
- ไม่แก้ warning "chunk > 500 kB" (เป็น warning และอยู่นอกงานนี้ — รอบ 0020/0031/0036 ตัดสินเหมือนกัน)
