# Offline + sync — audit of the last `hq-comms` criterion

รอบ `auto/Booth_Management_6_7/2026-09-06_0050`

> เกณฑ์: **"ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน"**
> (`docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md`)

ไฟล์เทสต์: `src/offlineSync.audit.test.tsx` — **22 เทสต์**
**ไม่ได้แก้ `src/` production เลยสักบรรทัด**

---

## 1. สเปกพูดถึง offline ตรงไหนบ้าง

`§5 Offline Strategy (ยังรอดครบ)` — ห้าบูลเล็ต:

| § | ข้อความ | สถานะหลัง audit |
|---|---|---|
| §5.1 | Collection ใหม่ทุกตัวใช้ Firestore persistence เดียวกับ core → อ่าน/เขียน offline ได้ | **พิสูจน์แล้ว** (C, D) |
| §5.2 | `messages` ที่ส่งตอน offline → คิวใน local, sync เมื่อเน็ตกลับ | **ครึ่งเดียว** (W2 พิสูจน์ฝั่งแอป · sync พิสูจน์ไม่ได้) |
| §5.3 | `pricingOverrides` cache ในเครื่อง | 🚨 **ช่องว่าง — ฟีเจอร์ไม่มีอยู่จริง** (G1) |
| §5.4 | `passports` stamp idempotent (code+boothId) | 🚨 **ช่องว่าง — ฟีเจอร์ไม่มีอยู่จริง** (G2) |
| §5.5 | `presence` heartbeat หยุดตอน offline → HQ เห็นเป็น "หลุด" | 🚨 **ช่องว่าง — แอปไม่รู้ว่าตัวเอง offline** (G4) |

อ้างอิงเพิ่ม: `§4.3` (Happy-Hour, บรรทัด "Offline: override cache ใน persistence"),
`§4.5` (ปิดซุ้ม → `cashSessions`), `§4.6` (Passport "Offline-safe")

---

## 2. เกณฑ์นี้แตกเป็นสี่ท่อน ไม่ใช่สามอย่างที่แผนคาด

**กับดักของถ้อยคำ** — "ทุกฟีเจอร์ ***ใหม่***" ชี้ไปที่ Happy-Hour · ปิดซุ้ม · Passport
ซึ่ง **ไม่มีอยู่จริงสักบรรทัด** ถ้าอ่านตามตัวอักษรอย่างเดียว เกณฑ์นี้ตอบไม่ได้เลย
จึงแยกเป็นสี่ แล้วให้แต่ละท่อนได้หลักฐานเท่าที่มันรับได้จริง:

1. **การตั้งค่า offline** (กลุ่ม C, D) — มีจริง พิสูจน์ได้เต็ม
2. **"ทำงานตอน offline"** (กลุ่ม W) — พิสูจน์ *ฝั่งแอป* ได้เต็ม
3. **"sync กลับได้"** — 🚫 **พิสูจน์ไม่ได้ในรอบนี้ และไม่ได้แกล้งพิสูจน์**
4. **"โดยข้อมูลไม่ชน"** (กลุ่ม X) — ระบุโมเดล แล้ว **อ้างหมุดเดิม ไม่เปิดศึกใหม่**

---

## 3. สิ่งที่พิสูจน์ได้ และวิธีที่ใช้

### กลุ่ม C — `src/lib/firebase.ts` (§5.1)

`persistentLocalCache({ tabManager: persistentMultipleTabManager() })` — **multi-tab**
ซึ่งเป็นตัวที่ทำให้ "HQ สองเครื่อง/สองแท็บ" ของเกณฑ์อื่นยืนอยู่ได้จริง
(single-tab manager = แท็บเดียวได้ persistent cache ที่เหลือ fallback เงียบๆ)

### กลุ่ม D — census ของ handle

**ทุก** โมดูล production ที่แตะ Firestore ได้ handle จาก `getDb()` ตัวเดียว:

| ไฟล์ | จำนวน `getDb()` |
|---|---|
| `src/comms/commsRepo.ts` | 5 |
| `src/order/ordersRepo.ts` | 4 |
| `src/expense/expensesRepo.ts` | 2 |

🚨 **ทำไม `getFirestore()` ถึงอันตราย** — มันคืน instance **default ที่ไม่ได้ตั้งค่า**
ไม่มี persistent cache ไม่มี offline read ไม่มี queued write — และ **ทำงานได้ปกติทุกอย่าง
ตราบใดที่มีเน็ต** เป็นบั๊กที่ demo ไม่มีทางเจอ D2 สวีปทั้งต้นไม้ว่าไม่มีเลย

### กลุ่ม W — เขียนแล้วค้าง หน้าจอต้องไม่ค้างตาม

**นิยาม offline ที่ใช้**: `addDoc`/`updateDoc`/`setDoc` คืน promise ที่ **ไม่ settle เลย**
ซึ่งคือพฤติกรรมจริงของ SDK ตอนไม่มีเน็ต (local cache รับไปแล้ว แต่ ack จากเซิร์ฟเวอร์ไม่มา)
**ไม่มี `mockResolvedValue` ในไฟล์นี้เลยสักตัว**

- **W1** ออเดอร์ที่รับตอน offline **ยังออกเลขคิว `A1`** ให้ลูกค้าที่ยืนอยู่ตรงหน้า
- **W2** 🆘 กดตอน offline → ส่งออกไป และ **ไม่ขึ้นว่า error** (เพราะยังไม่ได้พัง)
- **W3** กด `เสร็จ` ตอน offline → **undo ถูกบันทึก** ปุ่มย้อนกลับขึ้น
- **W4c** สวีปซอร์ส: **ไม่มี call site ไหน `await` การเขียนก่อนเดินหน้าจอ** (8 จุด)

---

## 4. สิ่งที่ **ไม่ได้** พิสูจน์ — เขียนไว้ตรงๆ

🚨 **sync ไม่ได้ถูกทดสอบ และไม่ได้อ้างว่าทดสอบ**
การคิวการเขียนตอน offline แล้ว flush ตอนเน็ตกลับ เป็น semantics ของ **Firestore SDK +
เซิร์ฟเวอร์** รอบนี้ไม่มีเน็ต ไม่มี emulator และ **jsdom ถือ cache ไม่ได้ด้วยซ้ำ** —
suite พิมพ์ `Falling back to memory cache` ทุกครั้งที่รัน ด้วยเหตุผลนี้เป๊ะ
สิ่งที่พิสูจน์คือ **แอป *ขอ* ให้มันเกิด** และ **ใช้งานได้ระหว่างที่คำขอยังค้าง**
ทรงเดียวกับ `alert D3` (arrayUnion dedupe) และ `donation U4` (realtime)
🚫 **เทสต์ที่ mock SDK แล้วอ้างว่า "sync ทำงาน" คือการทดสอบ mock — ไฟล์นี้ไม่มีแบบนั้น**

🚨 **ไม่มี conflict ตัวไหนถูกแก้ และไม่มีตัวไหนถูกจำลอง** — X0 ระบุ *โมเดลที่อยู่ในโค้ด*
(last-write-wins, ไม่มี transaction ที่ไหนเลย) ส่วนคำถามว่า LWW ถูกต้องไหมสำหรับสองซุ้ม
ที่แก้ order เดียวกัน **`idempotency E1` ปักไว้แล้ว** และปิดจริงต้อง `runTransaction`
ซึ่งแตะ repo layer + `firestore.rules` (**out of scope**)

🚨 ไม่มี IndexedDB ถูกเปิด ไม่มี quota ถูกทดสอบ ไม่มีการ reconnect

---

## 5. ช่องว่างที่พบ (บันทึกไว้ **ไม่ได้แก้**)

| # | เทสต์ | ช่องว่าง |
|---|---|---|
| GAP-1 | G1 | §5.3 `pricingOverrides` — **ไม่มีไฟล์ production ไหนเอ่ยถึงเลย** |
| GAP-2 | G2 | §5.4 `passports` / `stampedBooths` — **ศูนย์ไฟล์** |
| GAP-3 | G3 | §4.5 `cashSessions` / `countedCash` — **ศูนย์ไฟล์** |
| GAP-4 | G4 | §5.5 heartbeat ไม่หยุดตอน offline — **แอปไม่มีทางรู้ว่าตัวเอง offline** |
| GAP-5 | G5 | **ไม่มีอะไรแยก "เขียนค้างอยู่" ออกจาก "sync แล้ว"** — `hasPendingWrites` ไม่ถูกอ่านที่ไหนเลย |
| GAP-6 | G6 | 4 ใน 8 call site ของการเขียน **ไม่มี `.catch(` เลย** |

**GAP-1/2/3 ทรงเดียวกับ `hq G0` · `pwa I1` · `alert C5` · `donation T1–T3`**
🚨 **ถ้าวันหนึ่งมันแดง แปลว่ามีคนสร้างฟีเจอร์แล้ว = นั่นคือการแก้ ไม่ใช่การถดถอย ห้ามลบ**

**GAP-4 ต้องอ่านให้ครบ ไม่งั้นจะสรุปผิด** — §5.5 ต้องการ *observable* ว่า HQ เห็นเครื่องที่
หลุดเป็น "หลุด" ซึ่ง **วันนี้เป็นจริง** แต่เป็นจริงเพราะ *ท่อ* ไม่ใช่เพราะโค้ดทำตาม §5.5:
beat ที่ยิงตอน offline ไปกองอยู่ใน local queue ไม่เคยถึง HQ → `lastSeen` ของ HQ ค้าง → "หลุด" ✅
แต่ **บนจอของเครื่องที่หลุดเอง** beat ลง local cache แล้ว **มันเห็นตัวเองออนไลน์อยู่**

**GAP-5 คือช่องว่างที่คมที่สุดใต้คำว่า "sync กลับได้"** — คนคุมซุ้มที่เน็ตตาย
เห็นหน้าจอที่ **แยกไม่ออกจากหน้าจอปกติ** ทั้งที่ Firestore ยื่น `metadata.hasPendingWrites`
ให้ฟรีอยู่แล้ว

---

## 6. ตาราง mutation — **ทำนายก่อนรัน**

commit ตารางนี้ **ก่อน** รัน mutation ตัวแรก (กติกาที่ `_0041` → `_0012` พิสูจน์ว่าคุ้ม)
baseline = **57 ไฟล์ · 417 เทสต์**

คอลลาเทอรัลที่คาดตามกฎที่สะสมมา: ไฟล์ production ที่ **ไม่อยู่ใน `PRODUCTION_CHANGES`**
→ `fz P1` · `.ts` นอก `presentation` → `+ ds S2` · ไฟล์ที่อยู่ในลิสต์แล้ว → **P1 เขียว**
· mutation ในไฟล์เทสต์เอง → **ไม่มีคอลลาเทอรัลเลย**
ทุก mutation เขียนให้ **จำนวนบรรทัดเท่าเดิม** เพื่อไม่ให้ canary แบบ `file:line` ของ audit อื่นขยับ

| # | ไฟล์ | mutation | ทำนายว่าแดง |
|---|---|---|---|
| M1 | `lib/firebase.ts` | `persistentMultipleTabManager()` → `persistentSingleTabManager()` | C1 · C2 · fz C1 · ds S2 |
| M2 | `lib/firebase.ts` | `initializeFirestore(app, {` → `getFirestore(app, {` | C1 · D2 · fz C1 · ds S2 |
| M3 | `order/ordersRepo.ts` | `getDb` → alias `g` ทั้ง 4 จุด (import ด้วย) | D1 |
| M4 | `screens/OrderStation.tsx` | สลับให้ `await createOrder(order)` มา**ก่อน** `setIssued` | W1 · W4c · G6 · fz P1 |
| M5 | `comms/AlertButtons.tsx` | `setError(false)` → `setError(true)` ใน `fire()` | W2 · fz P1 |
| M6 | `screens/QueuePanel.tsx` | ถอด `setUndo({...})` ออกจาก `apply()` | W3 · undo A-group เพียบ |
| M7 | `comms/useHeartbeat.ts` | `setInterval` → `setTimeout` | G4 · fz P1 · ds S2 |
| M8 | `comms/useHeartbeat.ts` | `lastSeen: Date.now()` → `lastSeen: 0` | X1 · fz P1 · ds S2 · hq บางตัว |
| M9 | **ไฟล์เทสต์เอง** | `cacheViolations` ตาบอด (`return []`) | **C0 เท่านั้น** |
| M10 | **ไฟล์เทสต์เอง** | `filesMentioning` ตาบอด (`return []`) | **G0 เท่านั้น** |
| M11 | **ไฟล์เทสต์เอง** | `productionFiles()` เดินเฉพาะ `src/comms` | D1 · W4b · G6 |
| M12 | **ไฟล์เทสต์เอง** | `sitesInSource` ตาบอด (`return []`) | W4a · W4b · G6 |
| M13 | **ไฟล์เทสต์เอง** | `stillPending` คืน `true` เสมอ | **W0 เท่านั้น** |
| M14 | **ไฟล์เทสต์เอง** | harness ไม่ offline (`mockResolvedValue` ทั้งสาม) | W0 · W1 · W2 · W3 |
| M15 | `comms/CommsToast.tsx` | ใส่ `.catch(() => {})` ให้ `ackMessage` | G6 · fz P1 |
| M16 | `expense/expensesRepo.ts` | `collection(getDb(), 'expenses')` ตัวแรก → `getFirestore()` | D1 · D2 · เทสต์ expense · fz P1 · ds S2 |

**คำทำนายที่เป็นเดิมพันจริงของรอบนี้** (ถ้าผิดคือเจอของ):

- **M9 · M10 · M12 · M13 คือกลุ่ม (ฐ)** — "สวีปตาบอดกับสวีปสะอาดให้ผลเหมือนกันเป๊ะ"
  ทำนายว่า **เทสต์ที่ *ชื่อ* มันคือตัวเกณฑ์ (C1 · G1–G3 · G5 · W4c) จะเขียวหมด**
  และมีแต่ **control** (C0 · G0 · W4a · W0) ที่จับได้ ถ้าทำนายนี้ถูก แปลว่า control
  สี่ตัวนั้นคือด่านเดียวจริงๆ ของทั้งไฟล์ — **ห้ามลบ**
- **M10 คาดว่าฆ่าได้ตัวเดียว ทั้งที่ทำให้เทสต์ช่องว่าง 5 ตัวไร้ความหมายพร้อมกัน**
- **M13/M14 คู่กัน**: M14 (harness ไม่ offline) ต้องฆ่า W0–W3 ทั้งสี่ ถ้ามีตัวไหนรอด
  แปลว่าเทสต์ตัวนั้น **ไม่ได้ทดสอบ offline จริง** แค่ทดสอบ happy path ที่ใส่ชื่อว่า offline

---

## 7. ผลรันจริง — **19 แถว · ทำนายตรง 10 จาก 19**

harness: `C:/PHANTOM-AUTOPILOT/mutate-0050.mjs` (**อยู่นอก repo** ตามกฎ (ฎ))
`--reporter=json --outputFile` เขียนออกนอก repo · baseline ตรวจซ้ำทุกชุด = **417 เขียว**
ทุกแถว tally = 417 (ไม่มี mutation ไหนทำไฟล์พังตอน import)

| # | ฆ่าได้ | ตรงตามทำนาย? |
|---|---|---|
| M1 | C1 · C2 · `fz P1` · `ds S2` · **`App.test`** | ❌ ทำนาย `fz C1` แต่ได้ `fz P1` และไม่ได้ทำนาย `App.test` |
| M2 | C1 · D2 · `fz P1` · `ds S2` · **`App.test`** | ❌ เหตุผลเดียวกัน |
| M3 | **D1** | ✅ |
| M4 | W1 · W4c · G6 · `fz P1` · **`OrderStation.test` (error alert)** | ❌ ตกตัวสุดท้าย |
| M5 | **W2 · `fz P1`** | ✅ |
| M6 | W3 + undo 8 + idempotency D2/D3 + `QueuePanel.test` (รวม 12) | ❌ ทำนายไว้กว้างเกินไป ไม่ใช่เซ็ต |
| M7 | G4 · **`fz F2`** · `fz P1` · `ds S2` · `hq H1` · `useHeartbeat.test` | ❌ ตก 3 ตัว |
| M8 | X1 · **`fz F2`** · `fz P1` · `ds S2` · `hq H0` | ❌ ตก `fz F2` |
| M9 | **C0 เท่านั้น** | ✅ |
| M10 | **G0 เท่านั้น** | ✅ |
| M11 | **D1 · W4b · G6** | ✅ |
| M12 | **W4a · W4b · G6** | ✅ |
| M13 | **W0 เท่านั้น** | ✅ |
| M14 | W1 · W2 · W3 — **W0 รอด** | ❌ **และนี่คือแถวที่มีค่าที่สุดของรอบ** |
| M15 | **G6 · `fz P1`** | ✅ |
| M16 | D1 · D2 · `expensesRepo.test` · **`fz F2`** · `fz P1` · `ds S2` | ❌ ตก `fz F2` |
| M17 | **D0 · D1** | ✅ |
| M18 | G1 · **`fz F2`** · `fz P1` · `ds S2` | ❌ ตก `fz F2` |
| M19 | X0 · **`fz F2`** · `fz P1` · `ds S2` | ❌ ตก `fz F2` |

### 🚨 M14 — ตัวที่ทำนายพลาด และเป็นผลลัพธ์หลักของรอบนี้

M14 เปลี่ยน harness กลับเป็น **online** (`mockResolvedValue` ทั้งสาม) ทำนายว่า W0–W3 แดงหมด
ผลจริง: **W1/W2/W3 แดง แต่ W0 เขียว** — และ W0 คือเทสต์ที่มี**หน้าที่เดียว**
คือยืนยันว่า harness เป็น offline จริง

ต้นเหตุ: `stillPending` เดิมเขียนว่า `Promise.race([p, Promise.resolve(MARKER)])`
🚨 **marker ที่ resolve แล้ว ชนะ promise ที่ต้องการ microtask เพิ่มอีกแค่ *หนึ่ง* tick เสมอ**
และ `createOrder` เป็น `async` จึงต้องการหนึ่ง tick เสมอ → เวอร์ชันนั้นเรียก promise
ที่ settle ในอีกแป๊บเดียวว่า "pending" ส่วน **clause ที่เป็น control** ของมัน
(`stillPending(Promise.resolve('acked')) === false`) ผ่านได้เพราะ
**`Promise.race` ตัดสินเสมอด้วยลำดับใน array** — promise ของ mock บังเอิญอยู่ก่อน

แก้เป็น: ผูก `.then` ลง flag แล้ว **ไล่ microtask queue 20 รอบ** ค่อยถาม
รันซ้ำเป็น **M14b → W0 · W1 · W2 · W3 แดงครบตามทำนาย** และ M13b ยังได้ W0 ตัวเดียวเหมือนเดิม

➡️ **บทเรียน: control ที่ *ผ่าน* ไม่ได้แปลว่ามันแยกสองกรณีออกจากกันจริง**
`Promise.race` กับสอง promise ที่พร้อมทั้งคู่ ตัดสินด้วยลำดับ ไม่ใช่ด้วยเวลา
ถ้าไม่มี M14 บรรทัดนั้นจะอยู่ในหลักประกันถาวรโดยไม่มีใครรู้ว่ามันวัดผิด

### 🚨 รากของ mutation ที่ทำนายพลาด **ห้าใน เก้า ตัว คือเรื่องเดียวกัน: `frozenZones F2`**

ทำนายไว้ว่า F2 แช่แข็งแค่ `commsLogic.ts` / `commsRepo.ts` / `metrics.ts`
**ผิด** — `FROZEN` มี **12 ไฟล์ ใน 6 โซน** และในนั้นมี `useHeartbeat.ts` ·
`expensesRepo.ts` · `domain/types.ts` ซึ่งเป็นเป้าของ M7/M8/M16/M18/M19 พอดี

➡️ **นี่คือกฎ (ด) ซ้ำอีกครั้ง: อย่าทำนายจาก *ชื่อ* หรือจากบันทึกเก่า — เปิดไฟล์อ่านลิสต์**
รอบหน้าที่แตะไฟล์ใดๆ ใน 12 ไฟล์นี้ ให้บวก **`fz F2` + `fz P1` + `ds S2`** เข้าไปในคำทำนายทันที:

```
metrics.ts · pinStore.ts · expensesRepo.ts · buildOrder.ts · cart.ts · promptpay.ts
catalog.ts · options.ts · commsLogic.ts · commsRepo.ts · useHeartbeat.ts · comms/types.ts
domain/types.ts
```

📌 และ **`src/lib/firebase.ts` จัดเป็น `production`** (M1/M2 วัดแล้ว) ไม่ใช่ `other`
อย่างที่บันทึกของ `_0037` เดาไว้ → แตะเมื่อไรได้ **`fz P1`** ไม่ใช่ `fz C1`
📌 **การแตะ `lib/firebase.ts` ทำ `App.test` แดงด้วย** — เป็นไฟล์เดียวในสวีปที่ boot Firestore จริง

### เทสต์ที่มี killer ตัวเดียว — **ห้ามลบ** (วัดจริง ไม่ใช่เดา)

| เทสต์ | killer เดียว |
|---|---|
| **C0** | M9 |
| **C2** | M1 |
| **W4a** | M12 |
| **W4c** | M4 |
| **G0** | M10 |
| **G4** | M7 |
| **X1** | M8 |

### เทสต์ที่ **ไม่มี killer เลย — และตั้งใจ**

**G1 · G2 · G3 · G5 · X0** ปัก *ความไม่มี* ไว้ ไม่มี mutation ใดใน production วันนี้ฆ่าได้
เพราะจะฆ่ามันต้อง **สร้างฟีเจอร์ขึ้นมา** ทรงเดียวกับ `idempotency E1` · `pwa I1` ·
`alert C5` · `donation T1–T3` · `hq G0`

🚨 **แต่ "ไม่มี killer" ไม่ได้แปลว่า vacuous — และรอบนี้พิสูจน์แทนที่จะอ้าง**
- **M18** = อนาคตที่มีคนสร้าง Happy-Hour (เพิ่ม `pricingOverrides` ลง `domain/types.ts`)
  → **G1 แดงจริง** ตามที่หัวไฟล์สัญญาไว้
- **M19** = อนาคตที่มีคนใช้ `runTransaction` → **X0 แดงจริง**
➡️ **ถ้าวันหนึ่ง G1/G2/G3/G5/X0 แดง ให้มาอ่านบันทึกนี้ก่อน มันคือการแก้ ไม่ใช่การถดถอย**

### 🚨 M9 · M10 · M12 · M13 — เดิมพันหลักของรอบนี้ **ถูกทั้งสี่**

| mutation | ตัวตรวจที่ถูกทำให้ตาบอด | เทสต์ที่ *ชื่อ* มันคือตัวเกณฑ์ | ใครจับได้ |
|---|---|---|---|
| M9 | `cacheViolations` | **C1 เขียว** | **C0 เท่านั้น** |
| M10 | `filesMentioning` | **G1 · G2 · G3 · G4 · G5 · X0 · X1 เขียวหมด** | **G0 เท่านั้น** |
| M12 | `sitesInSource` | **W4c เขียว** | W4a · W4b · G6 |
| M13 | `stillPending` | **W1 · W2 · W3 เขียว** | **W0 เท่านั้น** |

🚨 **M10 คือภาพที่ชัดที่สุดที่โปรเจคนี้เคยมี**: ทำ `filesMentioning` คืนลิสต์ว่างเสมอ
แล้ว **เทสต์ช่องว่างเจ็ดตัวเขียวพร้อมกัน** ทั้งที่ตัวตรวจไม่ได้ตรวจอะไรเลย
มีแต่ **G0** — เทสต์ที่ป้อน fixture ที่ *ต้องเจอ* ให้ predicate ตัวเดียวกัน — ที่จับได้
**เป็นสปีชีส์เดียวกับ `neon G1` · `pwa V1` · `fz F2` · `rtt T3` · `donation T2` — ครั้งที่หก**

📌 **M11 บอกขอบเขตของ control**: ทำ `productionFiles()` เดินเฉพาะ `src/comms`
→ D1 · W4b · G6 แดง แต่ **G0 เขียว** (ไฟล์ที่ G0 คาดหวังอยู่ใน `comms` ทั้งสามตัวพอดี)
➡️ **control กัน "predicate ตาบอด" ได้ แต่กัน "เซ็ตอินพุตหด" ไม่ได้ — ต้องมี census คู่เสมอ**

### ตารางคอลลาเทอรัลที่ใช้ทำนายรอบหน้าได้

| ชนิดของ mutation | คอลลาเทอรัล |
|---|---|
| ไฟล์ใน `PRODUCTION_CHANGES` (`ordersRepo` · `QueuePanel` · …) | **ไม่มีเลย** (M3 · M6) |
| `.tsx` production นอกลิสต์ (`AlertButtons` · `CommsToast` · `OrderStation`) | `fz P1` |
| `.ts` production นอกลิสต์ และ **ไม่** อยู่ใน `FROZEN` (`lib/firebase.ts`) | `fz P1` + `ds S2` |
| `.ts` ที่อยู่ใน `FROZEN` (`useHeartbeat` · `expensesRepo` · `domain/types`) | `fz F2` + `fz P1` + `ds S2` |
| mutation ในไฟล์เทสต์เอง | **ไม่มีเลย** (M9–M14 · M17) |

