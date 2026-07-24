# 🎪 ระบบหลังบ้านงานสายสัมพันธ์ — ม.6/7
### Booth Management + Queue + Accounting System
**Full Spec & Claude Code Build Prompt** · PHANTOM CREW design system

---

## 0. สรุป requirement ที่ล็อกไว้แล้ว (จากที่ตอบมา)

| # | หัวข้อ | เลือก |
|---|--------|-------|
| 1 | Backend/DB | **Firebase (Firestore realtime)** |
| 2 | อุปกรณ์ต่อซุ้ม | **iPad โชว์คิว + iPad คุมคิว** (เฉลี่ย 3–4 เครื่อง/ซุ้ม) |
| 3 | QR ชำระเงิน | **Dynamic QR แยกยอดตามออเดอร์** (PromptPay) |
| 4 | ความเชื่อมของ 3 ซุ้ม | **แยกคุมเอง + dashboard รวมให้ครู/ผู้จัดดูภาพรวม** |
| 5 | ระบบบัญชี | **Real-time อัปเดตทันที** |
| 6 | ธีม | **PHANTOM CREW** (ส้ม `#FA4616` / เหลือง `#FFC72C` / ดำ `#1A1A1A`) |
| 7 | ภาษา | **ไทย + อังกฤษ** |
| 8 | เน็ตหลุด | **ต้องมี offline mode** |
| 9 | Login | **เปิดเข้าได้เลย ไม่ต้อง login** (scope ต่อเครื่อง) · **Dashboard ล็อก PIN `REDACTED-PIN`** |
| 10 | หลักฐานลูกค้า | **โชว์เลขคิวบนจอ iPad** (+ QR เช็คคิวเอง = Phase 2) |

**ฟีเจอร์เสริมที่เอา:** ครบทั้ง 1–10

---

## 1. ภาพรวมระบบ

ระบบเดียว (1 web app / PWA) ที่รันบน iPad ทุกเครื่องผ่าน browser (เพิ่มลง Home Screen ได้ = เต็มจอ ทำงาน offline ได้) แต่ละเครื่องเปิดมาแล้ว **เลือก "ซุ้ม + โหมด"** ครั้งเดียว จำค่าไว้ใน localStorage

**3 ซุ้ม ทำงานแยกกันสมบูรณ์** แต่ข้อมูลไหลเข้า Firestore ก้อนเดียว → บัญชี/คิว/สต็อก อัปเดต real-time ทุกเครื่อง และ **Dashboard รวม** ดึงภาพรวมทั้งงานให้ครู/คนคุมบัญชีดู

**36 คน แบ่งเป็น:**
- 🖼️ Photo booth — 13 คน
- ✏️ วาดภาพเสมือน — 8 คน (5 วาด + 3 หลังบ้าน)
- 🥤 น้ำปั่น — 14 คน
- 📊 บัญชี — 1 คน (คุม Dashboard + Export)

---

## 2. Tech Stack

| ส่วน | ใช้ | เหตุผล |
|------|-----|--------|
| Frontend | **React + Vite + TypeScript** | state เยอะ, realtime, หลายโหมด |
| Styling | **Tailwind CSS** | เร็ว, ทำธีม PHANTOM CREW ง่าย |
| Database | **Firebase Firestore** | realtime sync + offline persistence built-in |
| Hosting | **Firebase Hosting** | deploy คำสั่งเดียว, HTTPS ฟรี |
| PWA | **vite-plugin-pwa** | ติดตั้งลง iPad, cache app shell, ทำงาน offline |
| QR | **`promptpay-qr` + `qrcode`** | สร้าง PromptPay QR แยกยอด (คำนวณฝั่ง client → ทำงาน offline ได้) |
| Export | **`xlsx` (SheetJS)** + print-to-PDF | ออกรายงาน Excel/PDF ท้ายงาน |
| Sound | **Web Audio API** | เสียงเรียกคิว |
| Fonts | **Kanit / Sarabun / JetBrains Mono** (Google Fonts) | ตาม design system |

---

## 3. โครงสร้างข้อมูล Firestore

```
/booths/{boothId}                      // "photo" | "portrait" | "drinks"
    name, nameEn
    active: boolean

/products/{sku}
    boothId
    name, nameEn
    price: number                      // ราคาขาย
    cost:  number                      // ต้นทุนต่อหน่วย (สำหรับคำนวณกำไร live)
    active: boolean

/orders/{orderId}
    boothId
    queueNumber: string                // station-prefixed เช่น "A7", "B3"
    station: string                    // "A" | "B" | "C" (เครื่องที่รับออเดอร์)
    items: [ { sku, name, qty, unitPrice, subtotal } ]
    total: number
    paymentMethod: "cash" | "qr"
    paymentStatus: "pending" | "paid"
    status: "waiting" | "serving" | "done" | "cancelled"
    staffName?: string                 // เลือกชื่อตอนเข้ากะ (optional, ไม่บังคับ)
    servedBy?: string
    cancelReason?: string              // ถ้ายกเลิก/แก้ไข ต้องใส่เหตุผล
    createdAt, paidAt, servingAt, doneAt   // timestamps

/expenses/{expenseId}                  // ต้นทุนที่จ่ายจริง (ฟิล์ม, ยาคูลท์ ฯลฯ)
    boothId
    description                        // "ฟิล์ม 1 ม้วน", "ยาคูลท์ 5 แพ็ค"
    amount: number
    createdAt

/inventory/{itemId}                    // สต็อกวัตถุดิบ
    boothId
    name
    unit                               // "ขวด", "ใบ", "ม้วน"
    stock: number                      // เหลือ
    lowThreshold: number               // ต่ำกว่านี้ = เตือน
    linkedSku?: string                 // ตัดสต็อกอัตโนมัติเมื่อขาย sku นี้

/config/global
    promptpayId: "REDACTED-PROMPTPAY-ID"          // เบอร์ PromptPay สำหรับ QR
    dashboardPin: "REDACTED-PIN"               // PIN เปิด Dashboard (บัญชี/ครู)
    donationTarget?: number            // เป้าบริจาค (optional)

/counters/{boothId}                    // (สำรอง ถ้าจะใช้เลขคิวรวมแทน prefix)
    lastQueueNumber
```

> **เลขคิวใช้ระบบ station-prefix (`A7`, `B3`)** ไม่ใช่เลขรวม → **สำคัญมากสำหรับ offline**: แต่ละเครื่องรับออเดอร์ (station A/B/C) นับเลขของตัวเอง ไม่ต้องรอ counter กลาง → ไม่มีวันชนกัน + ทำงานได้แม้เน็ตหลุด + ลูกค้ารู้ว่าต้องกลับไปที่เครื่องไหน

---

## 4. โหมดหน้าจอ (Screens)

เปิด app → หน้า **Setup** เลือก `ซุ้ม` + `โหมด` (+ ถ้าเป็นเครื่องรับออเดอร์ เลือก `station A/B/C`) → จำไว้ localStorage

### 🅰️ Order Station (เครื่องคุมคิว / รับเงิน)
- เลือกสินค้า → ตะกร้า → ยอดรวม
- เลือกจ่าย: **เงินสด** (กดยืนยัน) หรือ **QR** (สร้าง PromptPay QR ยอดเป๊ะ → ลูกค้าสแกน → กดยืนยันชำระ)
- จ่ายแล้ว → ออก **เลขคิว** (station-prefix) → status `waiting`
- ปุ่ม **เรียกคิวถัดไป** → ดึงคิว `waiting` ตัวแรก → `serving` (จอโชว์คิวเด้ง + เสียง)
- ปุ่ม **เสร็จ** → `done`
- ปุ่ม **ยกเลิก/แก้ไข** → ต้องใส่เหตุผล → `cancelled`

### 🅱️ Display (จอโชว์คิว — ลูกค้าดู)
- อ่านอย่างเดียว, ตัวใหญ่, เต็มจอ
- Section **"กำลังทำ / Now Serving"** — โชว์ทุกเลขที่ `serving` พร้อมกัน (หลายเครื่อง/หลายคนทำขนานกันได้)
- Section **"คิวถัดไป / Up Next"** — เลข `waiting` เรียงตามเวลา
- เมื่อมีเลขใหม่เข้า serving → **ไฟกระพริบ + เสียงเรียก** (ฟีเจอร์ 6)
- มุมจอ: โลโก้ซุ้ม + ธีม PHANTOM CREW

### 📊 Dashboard (คนบัญชี / ครู / ผู้จัด)
- URL/โหมดแยก — ดูภาพรวม **ทั้ง 3 ซุ้ม** real-time (รายละเอียด §6 ฟีเจอร์ 2)

---

## 5. Flow การทำงาน (1 ออเดอร์)

```
ลูกค้าสั่ง → [Order Station] เลือกสินค้า → ยอดรวม
   → เลือกจ่าย  ├─ เงินสด → กด "รับเงินแล้ว"
                └─ QR → โชว์ PromptPay QR (ยอดเป๊ะ) → ลูกค้าสแกนจ่าย → กด "ยืนยันชำระ"
   → paymentStatus = paid → ออกเลขคิว (เช่น A7) → status = waiting → โชว์บนจอ
   → พนักงานว่าง กด "เรียกคิวถัดไป" → A7 = serving (จอเด้ง + เสียง 🔔)
   → ทำเสร็จ/ส่งของ กด "เสร็จ" → done
   → บัญชี + สต็อก + dashboard อัปเดตทันที
```

---

## 6. ฟีเจอร์เสริม 1–10 (วิธี implement)

| # | ฟีเจอร์ | วิธีทำ |
|---|---------|--------|
| 1 | **สต็อกวัตถุดิบ** | `/inventory` ตัดสต็อกอัตโนมัติเมื่อขาย sku ที่ผูกไว้ (ยาคูลท์/ปีโป้/น้ำอัดลม/ฟิล์ม) เหลือต่ำกว่า `lowThreshold` → แถบเตือนสีแดง |
| 2 | **Dashboard รวม 3 ซุ้ม** | ยอดขายรวม + แยกซุ้ม + เงินสด vs โอน + จำนวนออเดอร์/คิวเสร็จ + สินค้าขายดี + ต้นทุนรวม + **ยอดบริจาคสุทธิ** + **เงินสดที่ควรมีในลิ้นชัก** (ไว้เช็คกับเงินจริง) — realtime |
| 3 | **แยกเงินสด/โอนอัตโนมัติ** | group by `paymentMethod` ไม่ต้องนับมือ |
| 4 | **ยอดบริจาคสุทธิ** | `Σ orders(paid).total − Σ expenses.amount` |
| 5 | **Export Excel/PDF** | ปุ่มใน Dashboard → SheetJS ออก `.xlsx` (ทุกออเดอร์ + สรุป) / print → PDF ส่งครู |
| 6 | **เรียกคิว เสียง+ไฟ** | เลขเข้า serving → Web Audio เล่นเสียง + จอกระพริบ 2–3 วิ ไม่ต้องจ้องจอ |
| 7 | **Log ทุกออเดอร์** | ทุก order เก็บถาวร (ใคร/station/เวลา/รายการ) ตรวจย้อนหลังได้ถ้ายอดไม่ตรง |
| 8 | **ยกเลิก/แก้ไข ต้องใส่เหตุผล** | `status=cancelled` + บังคับกรอก `cancelReason` กันพลาด/กันโกง |
| 9 | **Privacy ต่อซุ้ม** | app scope ต่อเครื่อง → เครื่องซุ้มไหนเห็นแค่ข้อมูลซุ้มนั้น, Dashboard รวมเปิดแค่ที่เครื่องบัญชี/ครู *(ดู caveat §8)* |
| 10 | **QR เช็คคิวเอง (Phase 2)** | หน้า public read-only โชว์คิวสด, ลูกค้าสแกน QR หน้าบูธเปิดดูในมือถือ |

---

## 7. รายละเอียด 3 ซุ้ม + ราคา

### 🖼️ ซุ้ม 1 — Photo Booth (13 คน)
- **สินค้า:** ถ่าย 3 ช็อต → ปริ้น **2 copy แนวตั้ง** (หน้าตาเหมือนกัน, เครื่องตัดให้เอง) = ลูกค้าได้ 2 ใบ/ครั้ง
- **ราคาขาย:** **35 บาท/เซ็ต** ✅
- **ต้นทุนฟิล์ม:** 5,500 บาท/ม้วน, **700 ครั้ง/ม้วน** (1 ครั้ง = 1 เซ็ต 2 copy) → **ต้นทุน = 7.86 บาท/เซ็ต** → กำไร 27 บาท/เซ็ต
- 🚨 **จุดคุ้มทุนสำคัญ:** ฟิล์มจ่ายเป็นม้วน (5,500 ก้อนเดียว) → **ต้องขาย ≥ 157 เซ็ต (5,500÷35) ถึงคุ้มค่าฟิล์ม 1 ม้วน** ต่ำกว่านี้ = ขาดทุน
- **เพดาน/ม้วน:** 700 เซ็ต = ขายได้สูงสุด 700 คน → กำไรสุทธิสูงสุด ~19,000 บาท/ม้วน (900 คนคงไม่เกิน 1 ม้วน)
- **สต็อก:** ตัดฟิล์ม 1 ครั้ง/ออเดอร์ → เตือนเมื่อใกล้หมดม้วน (เหลือ <50 ครั้ง)
- **iPad ~3–4:** 1 จอโชว์คิว + 2–3 order station (A/B/C)

### ✏️ ซุ้ม 2 — วาดภาพเสมือน / Caricature (8 คน = 5 วาด + 3 หลังบ้าน)
- **สินค้า:** วาดหน้าลูกค้าแบบ **ล้อเลียน (caricature) วาดสด 6–10 นาที/คน** — ราคาปัจจุบัน **25 บาท/รูป**
- **Flow:** 3 หลังบ้านรับออเดอร์+เก็บเงิน+คุมคิว → ปล่อยคิวให้ 5 นักวาด (วาดขนานกัน → จอโชว์ "กำลังทำ" ได้หลายเลขพร้อมกัน)
- **iPad ~3–4:** 1 จอโชว์คิว + 2 order station (ให้ 3 หลังบ้านหมุนใช้)
- **ต้นทุน:** กระดาษ/ปากกา ~3 บาท/รูป (ประมาณ) → บันทึกใน `/expenses`
- ⚠️ **คอขวด = เวลา ล้วนๆ** (5 คน × 6–10 นาที): เพดานสูงสุดต่องาน
  | งานยาว | 6 นาที | 8 นาที | 10 นาที |
  |---|---|---|---|
  | 4 ชม. | 200 | 150 | 120 |
  | 5 ชม. | 250 | 188 | 150 |
  | 6 ชม. | 300 | 225 | 180 |
- 💰 **25 บาทถูกไปมากสำหรับ caricature** (อีเวนต์ทั่วไป 50–150 บาท) → เพราะติดเพดานเวลา **การขึ้นราคาเป็น 40–50 คือวิธีเดียวที่เพิ่มเงินบริจาคได้จริง** ที่ 150 รูป: 25฿=3,750 / 40฿=6,000 / 50฿=7,500
- 🚦 **ต้องมีระบบ "ปิดรับคิวเมื่อครบเพดาน"** — throughput แค่ ~37 รูป/ชม. คนแห่มาช่วงแรกจะรอนาน ตั้ง max queue (เช่น 150) แล้วขึ้นป้ายปิดรับ กันลูกค้ารอ 2 ชม.

### 🥤 ซุ้ม 3 — น้ำปั่น (14 คน)
- **สินค้า + ราคาแนะนำ** (ต้นทุนเป็นค่าประมาณ — ใส่ราคาซื้อจริงเพื่อความแม่น):
  - ยาคูลท์ปีโป้ปั่น: **30 บาท** (ต้นทุน ~12 → กำไร ~18)
  - น้ำอัดลมปั่น: **25 บาท** (ต้นทุน ~9 → กำไร ~16)
- **iPad ~3–4:** 1 จอโชว์คิว + 2–3 order station
- **สต็อก:** ยาคูลท์/ปีโป้/น้ำอัดลม/แก้ว → ตัดอัตโนมัติ + เตือนใกล้หมด
- 💡 ซุ้มนี้คือ **ตัวทำเงินหลัก** (14 คน + ราคาถูก + ซื้อง่าย = ปริมาณเยอะสุด)

---

## 8. Offline strategy + Privacy caveat (อ่านให้ครบ)

**Offline (ตอบข้อ 8 = A):**
- เปิด **Firestore offline persistence** → อ่าน/เขียนได้แม้เน็ตหลุด, ออเดอร์ค้างในเครื่อง แล้ว sync เองเมื่อเน็ตกลับ
- **PWA service worker** cache ตัว app → เปิดใช้ได้แม้ออฟไลน์
- **เลขคิว station-prefix** = ไม่ชนกันแม้หลายเครื่องออฟไลน์พร้อมกัน ✅
- QR สร้างฝั่ง client → ออกได้แม้ออฟไลน์ (ตัวลูกค้าจ่ายเองใช้เน็ตมือถือลูกค้า)
- 💡 แนะนำ: เตรียม **hotspot สำรอง 1–2 ตัว** ต่อโซน เผื่อ WiFi งานล่ม

**Privacy (ตอบข้อ 9 = ไม่ login + Dashboard ล็อก PIN):**
- เครื่องซุ้ม (Order Station / Display) → **เปิดเข้าได้เลย ไม่ต้อง PIN** เห็นแค่ข้อมูลซุ้มตัวเอง
- **Dashboard → ใส่ PIN `REDACTED-PIN` ก่อนเข้า** (เฉพาะบัญชี/ครู) กันเด็กซุ้มอื่นแอบดูยอดรวม
- PIN นี้เป็น gate เบาๆ ฝั่ง client (เก็บใน `config/global.dashboardPin`) — กันคนทั่วไป พอสำหรับงานโรงเรียน ไม่ใช่ auth ระดับ production
- 💡 หลังใส่ PIN ถูก 1 ครั้ง จำไว้ใน localStorage เครื่องนั้น จะได้ไม่ต้องพิมพ์ซ้ำทั้งวัน

---

## 9. ⚠️ ต้องเติมก่อน launch (Decision list)

- ✅ Photo booth = 35 บาท/เซ็ต · ฟิล์ม 700 ครั้ง/ม้วน (7.86 บาท/เซ็ต) · จุดคุ้มทุน 157 เซ็ต
- ✅ วาดภาพเสมือน = 25 บาท/รูป (พิจารณาขยับ 30–40 เพราะคอขวดคือเวลา)
- ✅ PromptPay = REDACTED-PROMPTPAY-ID

**ยังต้องเติม:**
1. **ยืนยันราคาน้ำปั่น** — แนะนำ ยาคูลท์ปีโป้ 30 / น้ำอัดลม 25 (จะเอาตามนี้ไหม?)
2. **ต้นทุนน้ำปั่นจริง** — ยาคูลท์/ปีโป้/น้ำอัดลม/แก้ว ราคาซื้อจริงเท่าไหร่ (ตอนนี้ประมาณ 12/9 บาท/แก้ว)
3. ต้นทุนตั้งต้นทั้งหมดที่ซื้อมา (ฟิล์มกี่ม้วน, วัตถุดิบน้ำปั่นกี่แพ็ค, กระดาษวาด) → ใส่ `/expenses` เพื่อคำนวณยอดบริจาคสุทธิให้เป๊ะ

---

## 10. แผน Build เป็นเฟส (ทำทันช่วงสอบ)

**MVP (ให้จัดงานได้):**
1. Setup screen (เลือกซุ้ม/โหมด/station)
2. Order Station: เลือกสินค้า → จ่าย (เงินสด+QR) → ออกเลขคิว
3. Display: Now Serving + Up Next + เสียง/ไฟ
4. คิว waiting→serving→done + ยกเลิกใส่เหตุผล
5. Firestore + offline persistence + station-prefix number
6. Dashboard: ยอดรวม/แยกซุ้ม/เงินสด-โอน/ยอดบริจาคสุทธิ
7. ธีม PHANTOM CREW + ไทย/อังกฤษ

**Phase 2 (เสริม):**
8. สต็อกวัตถุดิบ + เตือนใกล้หมด
9. Export Excel/PDF
10. QR ให้ลูกค้าเช็คคิวเองในมือถือ
11. เงินสดที่ควรมีในลิ้นชัก (cash reconciliation ตอนปิดซุ้ม)

---

# 📋 PROMPT พร้อม paste ลง Claude Code

> คัดลอกทั้งบล็อกนี้ไปเริ่ม project ได้เลย (เติม §9 ก่อน)

```
สร้าง web app (PWA) ระบบหลังบ้านงานสายสัมพันธ์โรงเรียน สำหรับ 3 ซุ้มขายของบริจาค
ของห้อง ม.6/7 รันบน iPad ผ่าน browser เพิ่มลง Home Screen ได้ ทำงาน offline ได้

=== STACK ===
React + Vite + TypeScript, Tailwind CSS, Firebase Firestore (realtime + offline
persistence), Firebase Hosting, vite-plugin-pwa. QR ใช้ promptpay-qr + qrcode.
Export ใช้ xlsx (SheetJS). เสียงใช้ Web Audio API.
Fonts: Kanit (หัวข้อ), Sarabun (เนื้อหา), JetBrains Mono (ตัวเลข/โค้ด).

=== ธีม PHANTOM CREW ===
ส้ม #FA4616 (primary), เหลือง #FFC72C (accent), ดำ #1A1A1A (bg), ตัวอักษรขาว.
Dark theme, ทันสมัย, ตัวเลขคิวใหญ่อ่านง่ายจากไกล. UI สองภาษา ไทย+อังกฤษ (label คู่กัน).

=== 3 ซุ้ม (ทำงานแยกกัน) ===
1) photo — Photo Booth: ถ่าย 3 ช็อต ปริ้น 2 copy แนวตั้ง = 1 เซ็ต, ราคา 35 บาท,
   ต้นทุนฟิล์ม 7.86 บาท/เซ็ต (5500/ม้วน, 700 ครั้ง/ม้วน — ตัดสต็อกเป็นจำนวนครั้ง)
2) portrait — วาดภาพเสมือน (caricature ล้อเลียน วาดสด 6-10 นาที/คน): 25 บาท/รูป,
   ต้นทุน ~3 บาท/รูป, 5 นักวาดทำขนานกัน. คอขวดคือเวลา → ต้องมีระบบปิดรับคิวเมื่อครบเพดาน
3) drinks — น้ำปั่น: ยาคูลท์ปีโป้ปั่น 30 บาท (ทุน ~12), น้ำอัดลมปั่น 25 บาท (ทุน ~9) *รอยืนยัน*

=== ไม่มี login ===
เปิด app → หน้า Setup เลือก "ซุ้ม" + "โหมด" (+ ถ้า Order Station เลือก station A/B/C)
→ เก็บ localStorage. เปลี่ยนได้ในหน้า settings.

=== 3 โหมด ===
A) Order Station: เลือกสินค้า→ตะกร้า→ยอดรวม→เลือกจ่าย
   - เงินสด: กด "รับเงินแล้ว"
   - QR: สร้าง PromptPay QR ยอดเป๊ะ (จาก config.promptpayId) โชว์ให้สแกน → กด "ยืนยันชำระ"
   จ่ายแล้ว→ออกเลขคิว station-prefix (เช่น A7)→status waiting→โชว์บนจอ
   ปุ่ม "เรียกคิวถัดไป" (waiting ตัวแรก→serving), "เสร็จ" (→done),
   "ยกเลิก/แก้ไข" (บังคับใส่เหตุผล→cancelled)
B) Display (อ่านอย่างเดียว เต็มจอ): section "กำลังทำ/Now Serving" โชว์ทุกเลข serving
   พร้อมกัน + "คิวถัดไป/Up Next" เลข waiting. เลขใหม่เข้า serving → เสียง + จอกระพริบ 2-3 วิ
C) Dashboard (คนบัญชี/ครู): ต้องใส่ PIN REDACTED-PIN ก่อนเข้า (เทียบ config.dashboardPin,
   ถูกแล้วจำ localStorage เครื่องนั้น). เข้าแล้วเห็น realtime ทั้ง 3 ซุ้ม — ยอดขายรวม, แยกซุ้ม, เงินสด vs โอน,
   จำนวนออเดอร์/คิวเสร็จ, สินค้าขายดี, ต้นทุนรวม (จาก /expenses),
   ยอดบริจาคสุทธิ = ยอดขาย paid − ต้นทุน, เงินสดที่ควรมีในลิ้นชัก (Σ เงินสด).
   ปุ่ม Export .xlsx + print PDF.

=== เลขคิว = station-prefix (สำคัญมากสำหรับ offline) ===
แต่ละ Order Station (A/B/C) นับเลขของตัวเอง (A1,A2.../B1,B2...) ไม่ใช้ counter กลาง
→ ไม่ชนกันแม้หลายเครื่องออฟไลน์ + ลูกค้ารู้ว่ากลับไปเครื่องไหน

=== Firestore schema ===
booths{boothId}: name,nameEn,active
products{sku}: boothId,name,nameEn,price,cost,active
orders{orderId}: boothId,queueNumber,station,items[],total,paymentMethod(cash|qr),
   paymentStatus(pending|paid),status(waiting|serving|done|cancelled),
   staffName?,servedBy?,cancelReason?,createdAt,paidAt,servingAt,doneAt
expenses{id}: boothId,description,amount,createdAt
inventory{id}: boothId,name,unit,stock,lowThreshold,linkedSku?
config/global: promptpayId,dashboardPin("REDACTED-PIN"),donationTarget?

=== ฟีเจอร์ ===
1 สต็อก: /inventory ตัดอัตโนมัติเมื่อขาย linkedSku, เตือนเมื่อ stock<lowThreshold (แถบแดง)
2 Dashboard รวม (ตามด้านบน)
3 แยกเงินสด/โอนอัตโนมัติ (group by paymentMethod)
4 ยอดบริจาคสุทธิ
5 Export Excel/PDF (ทุกออเดอร์ + สรุป)
6 เรียกคิว เสียง+จอกระพริบ
7 Log ทุกออเดอร์ถาวร (ตรวจย้อนหลัง)
8 ยกเลิก/แก้ไข บังคับใส่เหตุผล
9 privacy: เครื่องซุ้มเปิดเข้าเลยเห็นแค่ข้อมูลซุ้มตัวเอง, Dashboard ล็อก PIN REDACTED-PIN
10 (Phase 2) หน้า public read-only ให้ลูกค้าสแกน QR เช็คคิวเองในมือถือ
11 Max queue (ซุ้มวาดภาพ): ตั้งเพดานคิวได้ (เช่น 150). เมื่อ waiting+serving ครบเพดาน
   → Order Station ขึ้น "ปิดรับคิว" หยุดรับออเดอร์ใหม่ + จอ Display ขึ้นป้ายปิดรับ

=== Offline ===
เปิด Firestore persistentLocalCache. PWA service worker cache app shell.
ออเดอร์ที่สร้างตอนออฟไลน์ต้อง sync อัตโนมัติเมื่อเน็ตกลับ.

=== ทำ MVP ก่อน (ข้อ 1-7 ด้านบนของ Order/Display/Dashboard core + offline + ธีม)
แล้วค่อยต่อ Phase 2 (สต็อก, export, QR ลูกค้า, cash reconciliation) ===

เริ่มจากวางโครงสร้างโปรเจกต์ + Firebase config (ใส่ placeholder) + หน้า Setup +
Order Station ก่อน แล้วให้ฉันเทสต์ทีละส่วน
```

---

*สร้างโดย Claude สำหรับ MEATBALL · ห้อง ม.6/7 · PHANTOM CREW*
