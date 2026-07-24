# 🎪 HQ + Inter-Booth Comms + Cross-Sell — Design Spec

**Project:** ระบบหลังบ้านงานสายสัมพันธ์ ม.6/7 (Booth Management + Queue + Accounting)
**Base spec:** `sai-samphan-booth-system-spec.md` (PHANTOM CREW)
**Date:** 2026-07-24
**Status:** Approved for planning

> เอกสารนี้ **ต่อยอด** สเปคเดิม ไม่ได้แทนที่ — เพิ่ม HQ (2 PC), การคุยข้ามซุ้ม, และ 4 extras
> (Cash reconciliation, Happy-Hour pricing, Donation thermometer, 3-ซุ้ม passport)

---

## 1. Scope (ที่ approve แล้ว)

**รอบนี้ build:**
- **P1 — Core MVP (สเปคเดิม):** Setup → Order Station → Display → Dashboard → queue (waiting→serving→done→cancelled) → Firestore offline persistence → accounting realtime → ธีม PHANTOM CREW + ไทย/อังกฤษ · เลขคิว station-prefix
- **P2 — รอบนี้ด้วย:** HQ presence/broadcast · inter-booth alert+text · Happy-Hour pricing · Donation thermometer · Cash reconciliation · 3-ซุ้ม passport

**P3 (ทีหลัง ไม่อยู่ในรอบนี้):** burn-rate forecast · queue ETA/throughput heatmap · staff leaderboard · smart auto-close · QR เช็คคิวลูกค้า · post-event auto-report

**การตัดสินใจที่ล็อก:**
- HQ = 2 เครื่อง (MacBook + Windows 11) **เหมือนกันทุกอย่าง** เป็น backup ของกัน — เปิด Dashboard mode ผ่าน browser เฉยๆ ไม่ต้องมี backup logic
- Inter-booth comms = **preset alert + พิมพ์ข้อความสั้น (2 ทาง)** ระหว่างซุ้ม↔ซุ้ม↔HQ
- ทุกอย่างต่อผ่าน **Firestore collection เพิ่ม** (ไม่เพิ่ม service อื่น) → ได้ realtime + offline เหมือน core

---

## 2. Architecture Decision

**เลือก: Firestore-only** — ของใหม่ทุกตัวเป็น collection เพิ่มใน Firestore ก้อนเดิม

**เหตุผล:**
- ได้ realtime sync + offline persistence ฟรี (comms/pricing/passport ต้องรอด offline ด้วย)
- HQ 2 เครื่อง sync กันเองผ่าน Firestore listener — ไม่ต้องเขียน replication เอง
- สอดคล้อง stack ที่ล็อกไว้ในสเปคเดิม ไม่เพิ่ม cognitive/ops load

**ทางเลือกที่ตัดทิ้ง:**
- Firebase Realtime Database แยกสำหรับ presence/ephemeral → moving parts เพิ่ม, สอง data source ต้อง reconcile
- WebRTC/LAN P2P → เปราะในสภาพงานจริง (WiFi งานโรงเรียนไม่นิ่ง), setup ยาก

**ข้อควรระวัง (ยกมาจากสเปคเดิม):** PIN REDACTED-PIN เป็น client-side gate เบาๆ พอสำหรับงานโรงเรียน ไม่ใช่ auth ระดับ production — Dashboard/HQ ควรเปิดเฉพาะเครื่องบัญชี/ครู

---

## 3. Data Model (เพิ่มจากสเปคเดิม)

Collection เดิมทั้งหมด (`booths`, `products`, `orders`, `expenses`, `inventory`, `config`, `counters`) คงเดิม เพิ่ม:

```
/messages/{id}                     // คุยข้ามซุ้ม + HQ broadcast
    fromBooth: string              // "photo" | "portrait" | "drinks" | "hq"
    fromMode:  string              // "order" | "display" | "dashboard"
    scope:     "all" | boothId     // ส่งถึงทุกเครื่อง หรือเจาะซุ้ม
    kind:      "alert" | "text" | "broadcast"
    presetCode?: "need_help" | "low_stock" | "cleared"
    text?:     string              // ข้อความสั้น (จำกัดความยาว เช่น ≤120 ตัวอักษร)
    createdAt: timestamp
    ackBy:     string[]            // deviceId ที่กดรับทราบแล้ว

/presence/{deviceId}               // ใครออนไลน์อยู่
    booth: string
    mode:  string
    station?: string               // "A" | "B" | "C" (ถ้าเป็น Order Station)
    lastSeen: timestamp            // heartbeat ทุก ~20-30 วิ; ถือ offline ถ้าเกิน ~90 วิ

/pricingOverrides/{boothId}        // Happy-Hour: HQ push ราคาชั่วคราว
    active:   boolean
    priceMap: { [sku: string]: number }   // ราคาใหม่รายสินค้า
    label:    string               // "Happy Hour! ลด 5฿", แสดงบน Display
    startAt:  timestamp
    endAt?:   timestamp            // optional; ปิดเองเมื่อถึงเวลา

/passports/{code}                  // 3-ซุ้ม cross-sell
    stampedBooths: string[]        // เช่น ["photo","drinks"]
    rewardClaimed: boolean
    createdAt: timestamp
    lastStampAt: timestamp

/cashSessions/{id}                 // ปิดซุ้ม / cash reconciliation
    boothId:  string
    station?: string
    expectedCash: number           // Σ orders(paid, cash) ของ session
    countedCash:  number           // เงินจริงที่นับได้
    diff:     number               // countedCash - expectedCash
    note?:    string
    closedAt: timestamp

/config/global (เพิ่ม field)
    donationTarget: number         // เป้าบริจาค (สำหรับ thermometer)
```

---

## 4. Component Design (รายละเอียดต่อ feature)

### 4.1 HQ (Dashboard mode บน PC)

**นิยาม:** HQ = Dashboard mode เดิม เปิดบน desktop browser (MacBook/Windows) — layout responsive ใช้พื้นที่จอใหญ่ได้ดีขึ้น. **2 เครื่องเหมือนกันทุกปุ่ม** (ทั้งคู่ view + export + broadcast + control ได้ครบ)

**เพิ่มจาก Dashboard เดิม:**
- **Broadcast bar** — พิมพ์/เลือกข้อความ → ส่ง `messages{kind:"broadcast", scope:"all", fromBooth:"hq"}`
- **Presence board** — grid เครื่องทั้งหมด (ซุ้ม/โหมด/station) เขียว=online แดง=หลุด (จาก `/presence` lastSeen)
- **Message feed** — รวมทุก alert/text จากทุกซุ้ม เรียงเวลา, กด ack ได้
- **Happy-Hour panel** — ต่อซุ้ม: toggle active + ตั้ง priceMap + label
- **ปิดงาน/Reconcile** — เข้าถึงสรุป cashSessions ทุกซุ้ม
- **Donation thermometer** (ใหญ่) + Export (.xlsx/PDF) เดิม

**Interface/deps:** อ่าน `orders`, `expenses`, `presence`, `messages`, `cashSessions`, `pricingOverrides`, `config`. เขียน `messages`, `pricingOverrides`, `config`

### 4.2 Inter-Booth Comms

**Order Station เพิ่ม:**
- ปุ่มลัด 3 ปุ่ม: 🆘 ขอคนช่วย · 📦 ของใกล้หมด · ✅ เคลียร์แล้ว → สร้าง `messages{kind:"alert", presetCode, scope:"all"}`
- ช่องพิมพ์ข้อความสั้น (≤120 ตัว) → `messages{kind:"text"}`

**ทุกโหมด (Order/Display/HQ) รับ:**
- Listener บน `/messages` (ล่าสุด ~เวลาปัจจุบัน) → toast เด้ง + เสียงเบา (ต่างจากเสียงเรียกคิว) + ปุ่ม ✔ ack (เพิ่ม deviceId เข้า `ackBy`)
- Display: alert สำคัญขึ้นแถบบนจอสั้นๆ ไม่รบกวนการโชว์คิว

**Interface/deps:** เขียน+อ่าน `messages`, เขียน `presence` heartbeat

### 4.3 Happy-Hour Pricing

- HQ toggle → `pricingOverrides/{boothId}.active=true` + priceMap
- **Order Station:** ตอนคำนวณ subtotal ถ้า override active และมี sku ใน priceMap → ใช้ราคา override (บันทึก `unitPrice` จริงที่ใช้ลง order เพื่อให้ audit ตรง)
- **Display:** ถ้า active → ขึ้นป้าย `label` ("Happy Hour!")
- **Offline:** override cache ใน persistence; ถ้าเครื่อง offline ตอน HQ toggle จะได้ตอน sync กลับ (acceptable — เป็น promo ไม่ใช่ critical path)

### 4.4 Donation Thermometer

- อ่าน `donationTarget` เทียบ **ยอดบริจาคสุทธิ = Σ orders(paid).total − Σ expenses.amount** (สูตรเดิมจากสเปค §6)
- แถบ % + ตัวเลข → บน **Display ทุกจอ** (มุมล่าง ไม่บังคิว) + **HQ** (ใหญ่)
- อัปเดต realtime ตามยอดที่เข้า

### 4.5 Cash Reconciliation

- ปุ่ม **"ปิดซุ้ม"** ที่ Order Station (หรือ HQ)
- ระบบคำนวณ `expectedCash = Σ orders(paid, paymentMethod:"cash")` ของ scope นั้น
- กรอก `countedCash` (เงินจริงในลิ้นชัก) → บันทึก `cashSessions` พร้อม `diff`
- แสดงผลทันที: ขาด/เกิน/ตรง → HQ เห็นสรุปทุกซุ้ม

### 4.6 3-ซุ้ม Passport (Cross-Sell)

- ออก **code + QR** ให้ลูกค้า (สร้างฝั่ง client, ทำงาน offline) — 1 code/ลูกค้า
- แต่ละซุ้มตอนขาย: สแกน/กรอก code → เพิ่ม boothId เข้า `stampedBooths` (กันซ้ำ: ถ้ามี boothId แล้ว ไม่เพิ่ม)
- ครบ 3 ซุ้ม → Order Station/Display ขึ้น "🎉 ครบ 3 ซุ้ม! ลุ้นรางวัล" → กดรับ → `rewardClaimed=true`
- **Offline-safe:** แสตมป์เขียน local persistence, sync ทีหลัง; กันซ้ำด้วย (code, boothId) — idempotent

---

## 5. Offline Strategy (ยังรอดครบ)

- Collection ใหม่ทุกตัวใช้ Firestore persistence เดียวกับ core → อ่าน/เขียน offline ได้
- `messages` ที่ส่งตอน offline → คิวใน local, sync เมื่อเน็ตกลับ (alert อาจถึงช้า — acceptable)
- `pricingOverrides` cache ในเครื่อง — Order Station ใช้ราคาล่าสุดที่ sync มา
- `passports` stamp เป็น idempotent (code+boothId) → sync ซ้ำไม่พัง
- `presence` heartbeat หยุดตอน offline → HQ เห็นเป็น "หลุด" ถูกต้อง
- **แนะนำ (จากสเปคเดิม):** hotspot สำรอง 1–2 ตัว/โซน

---

## 6. Build Phases

| Phase | สิ่งที่ทำ | Gate |
|---|---|---|
| **P1** | Core MVP ตามสเปคเดิม (Setup/Order/Display/Dashboard/queue/offline/accounting/ธีม) | จัดงานได้จริงด้วย core |
| **P2** | HQ presence+broadcast · inter-booth alert+text · Happy-Hour · Donation thermometer · Cash reconciliation · Passport | รอบนี้ครบ |
| **P3** | burn-rate · ETA/heatmap · leaderboard · auto-close · QR ลูกค้า · post-event report | ทีหลัง |

**ลำดับแนะนำใน P2:** presence/heartbeat + broadcast (ฐานของ comms) → inter-booth alert → donation thermometer (อ่านอย่างเดียว ง่าย) → happy-hour → cash reconciliation → passport

---

## 7. Success Criteria

- [ ] HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime; ปิดเครื่องนึง อีกเครื่องทำงานครบ
- [ ] ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้
- [ ] HQ toggle Happy-Hour → Order Station คิดราคาใหม่ + Display ขึ้นป้าย; order บันทึก unitPrice จริง
- [ ] Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่
- [ ] ปิดซุ้ม → expectedCash ตรงกับ Σ เงินสด, กรอกเงินจริง → diff บันทึกถูก
- [ ] Passport: สแกนครบ 3 ซุ้ม → ขึ้นรางวัล; สแกนซุ้มเดิมซ้ำไม่เพิ่มแสตมป์; ทำงาน offline แล้ว sync ได้
- [ ] ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน

---

*Design approved 2026-07-24 · ต่อยอดจาก sai-samphan-booth-system-spec.md · ม.6/7 · PHANTOM CREW*
