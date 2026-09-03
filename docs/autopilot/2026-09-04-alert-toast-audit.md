# 🆘 alert toast — audit (รอบ `auto/Booth_Management_6_7/2026-09-04_0006`)

เกณฑ์: **"ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้"**
— ข้อที่สองของ `docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md` (บรรทัด 177)

ไฟล์เทสต์: `src/alertToast.audit.test.tsx` — **21 เทสต์**
**ไม่ได้แก้ `src/` production เลยสักบรรทัด** (เหตุผลใน §3)

---

## 1. โค้ดที่มีอยู่ (อ่านแล้ว ไม่ได้เดา)

| ไฟล์ | หน้าที่ |
|---|---|
| `src/comms/AlertButtons.tsx` | ปุ่ม preset 3 ปุ่ม (`🆘 need_help` · `📦 low_stock` · `✅ cleared`) + ช่องพิมพ์ข้อความ ทุกปุ่มยิง `scope:'all'`, `ackBy:[]` |
| `src/comms/commsRepo.ts` | `sendMessage` = `addDoc` · `subscribeMessages` = `onSnapshot` · `ackMessage` = `updateDoc` + `arrayUnion` |
| `src/comms/commsLogic.ts` | `visibleMessages` กรองสามชั้น (scope · ไม่ใช่เครื่องตัวเอง · ยังไม่ ack) แล้ว sort ใหม่สุดก่อน · `isOnline` threshold 90 วิ |
| `src/comms/CommsToast.tsx` | subscribe ตอน mount → โชว์ `visibleMessages(...)[0]` ตัวเดียว + ปุ่ม `รับทราบ` |

**จุด mount ของ `CommsToast` มีสองที่เท่านั้น** — `DashboardScreen.tsx:55` (HQ) และ
`OrderStation.tsx:72` (ซุ้ม) **ไม่ได้อยู่บน `DisplayScreen`** (จอลูกค้า)

## 2. ช่องว่างที่แท้จริง — ไม่ใช่ "ไม่มีเทสต์" แต่เป็น "เทสต์เดิมยืนคนละชั้น"

เทสต์เดิมมีอยู่ 3+2 ตัว (`AlertButtons.test.tsx`, `CommsToast.test.tsx`) แต่:

1. 🚨 **ใช้ `objectContaining` ทั้งคู่** — field ส่วนเกินล่องหน ซึ่งคือสปีชีส์ของบั๊กที่เกณฑ์
   Undo ปิดไปด้วยความยากลำบาก (M9 ข้างล่างสาธิตให้ดูจริง: เพิ่ม field มั่วเข้าไป
   **เทสต์เดิมเขียวหมด** มีแต่ A1 ที่จับได้)
2. 🚨 **`CommsToast.test.tsx` mock `./commsRepo` ทั้งก้อน** — `commsRepo` ตัวจริงจึงไม่เคยถูกรัน
   ในเทสต์ระดับ component เลย "ข้อความที่ผู้ส่งสร้าง" กับ "ข้อความที่ผู้รับอ่าน" เป็นคนละก้อน
   ที่บังเอิญเขียนให้ตรงกันด้วยมือ
3. **ไม่มีเทสต์ไหนแตะคำว่า "ภายในไม่กี่วิ" เลย** ไม่มีอะไรปักว่าเส้นทางส่งเป็น push ไม่ใช่ poll
4. **ไม่มีเทสต์ไหนปักว่า toast mount อยู่ที่ไหน** — ย้ายไปโผล่บนจอลูกค้าก็ไม่มีใครรู้
5. **ack ยังไม่เคยถูกพิสูจน์ว่า *ปลดล็อกจริง*** — เทสต์เดิมเช็คแค่ว่า `ackMessage` ถูกเรียก
   ซึ่งเป็นกับดัก `unlock-tests-pass-vacuously` เป๊ะๆ: ไม่มีใครดูว่าข้อความ **หายไปไหม**

### วิธีที่ไฟล์นี้ปิดช่องว่าง
**ย้ายเส้น mock ลงไปที่ Firebase SDK** (`firebase/firestore` + `getDb`) แทนที่จะ mock `commsRepo`
→ `AlertButtons` → `commsRepo` → `commsLogic` → `CommsToast` **ทำงานจริงทั้งสาย**
ข้อความที่การกดปุ่มเขียนลง `addDoc` **คือก้อนเดียวกัน** ที่ถูกส่งกลับเข้า snapshot callback ให้ผู้รับอ่าน

"สองเครื่อง" จำลองด้วยการสลับ `localStorage['phantom.deviceId']` ระหว่าง render
เพราะ `getDeviceId()` อ่านจาก localStorage และ jsdom หนึ่ง document มีได้ชุดเดียว
ทุกเทสต์ข้ามเครื่องจึง `unmount()` ก่อนเปลี่ยนตัวตนเสมอ

## 3. ทำไมรอบนี้ไม่แก้ production เลย

เกณฑ์นี้ **ชนกับ Out of scope ข้อ "ห้ามเปลี่ยน logic comms" เต็มๆ** และ
`frozenZones` F2 แช่แข็ง `commsLogic.ts` + `commsRepo.ts` ไว้แบบ byte-identical
โค้ดที่อ่านแล้ว **ถูกต้องตามเกณฑ์อยู่แล้วทั้งสี่ท่อน** จึงไม่มีเหตุให้แตะ
ส่วนที่ *ขาด* จริงสองข้อถูกบันทึกเป็นช่องว่าง ไม่ได้แอบแก้ (ดู §6)

## 4. สี่ท่อนของเกณฑ์ พิสูจน์คนละแบบ

| กลุ่ม | ท่อน | พิสูจน์ยังไง |
|---|---|---|
| **A** (5) | "ซุ้มกดปุ่ม 🆘" | `toStrictEqual` บนเอกสารที่ `addDoc` ได้รับจริง — ครบทุก field และ **ไม่มี field เกิน** |
| **B** (5) | "HQ + ซุ้มอื่นเห็น toast" | เครื่องคนละตัวจริงๆ + **ครึ่งที่หลอกง่าย**: เครื่องผู้ส่ง *ต้องไม่เห็น* (B3) + census จุด mount (B5) |
| **C** (6) | "ภายในไม่กี่วิ (เมื่อ online)" | **รูปทรง ไม่ใช่นาฬิกา** — push ไม่ใช่ poll + `isOnline` ประเมินเป็นเลขคณิต |
| **D** (5) | "ack ได้" | ack **id เดิม** แล้วดูว่ามันหายไป (ข้าม barrier) + ack ของเครื่องอื่นต้องไม่ปิดของเรา |

### 🚨 สิ่งที่ **ไม่ได้** พิสูจน์ (เขียนไว้ตรงๆ)
- **"ภายในไม่กี่วิ" ไม่ได้ถูกวัด และไม่ได้อ้างว่าวัด** ไม่มีเน็ต ไม่มี Firestore จริง
  การจับเวลา mock คือการจับเวลา mock สิ่งที่พิสูจน์คือ **รูปทรงที่ทำให้ "ไม่กี่วิ" เป็นไปได้** —
  subscription แบบ push โดยไม่มี poll interval คั่นระหว่างการเขียนกับการวาด
  **ความหน่วงจริงเป็นสมบัติของ Firestore กับ wifi ในงาน ต้องมีคนถือสองเครื่องยืนวัด**
- **`arrayUnion` dedupe เป็นสมมติฐาน ไม่ใช่การพิสูจน์** — D3 พิสูจน์ว่า *เรียก* `arrayUnion`
  ส่วนที่ union ไม่บวมเมื่อกดซ้ำเป็น server-side semantics ของ Firestore ที่ไม่มีเทสต์ไหนใน repo นี้รันได้
- **ไม่มีเสียงไหนถูกเล่นหรือถูก assert** (ดู GAP-1)

## 5. Mutation check — **ตารางทำนาย เขียนและ commit ก่อนรันตัวแรก**

กติกา: ทุก mutation ที่แตะไฟล์ production จะพา **`frozenZones` P1** และ
**`uiOverhaulDiffScope` S1** แดงเสมอ (ไฟล์ที่เปลี่ยนไม่ตรงลิสต์ที่ประกาศ) และถ้าไฟล์นั้นเป็น
`.ts` ใน `src/comms/` จะพา **`frozenZones` F2** (byte-identical) + **`uiOverhaulDiffScope` S2**
(bucket `other` ที่ไม่ได้ประกาศ) แดงเพิ่มอีก นับรวมไว้ในคอลัมน์ "แดงที่อื่น" แล้ว

- **คอลลาเทอรัล X** = `fz F2` · `fz P1` · `ds S1` · `ds S2` (แก้ `.ts` ใน `src/comms/`)
- **คอลลาเทอรัล Y** = `fz P1` · `ds S1` (แก้ `.tsx` ใน `src/comms/` — presentation จึงไม่โดน S2)
- **คอลลาเทอรัล Z** = ไม่มี (แก้ไฟล์ audit test ของรอบนี้เอง)

| # | ไฟล์ | mutation | ทำนายว่าไฟล์นี้แดง | แดงที่อื่น (ทำนาย) |
|---|---|---|---|---|
| M1 | `commsLogic.ts` | ถอด filter `fromDeviceId !== myDeviceId` | **B3** | `CommsToast.test` (own message) · `commsLogic.test` (excludes my own) · X |
| M2 | `commsLogic.ts` | ถอด filter `!ackBy.includes(me)` | **D2 · D4** | `commsLogic.test` (excludes … acked) · X |
| M3 | `commsLogic.ts` | ถอด filter scope | **B4** | `commsLogic.test` (respects scope) · X |
| M4 | `commsLogic.ts` | sort กลับด้าน (เก่าสุดขึ้นก่อน) | **D4** | `commsLogic.test` (sorts newest first) · X |
| M5 | `commsLogic.ts` | threshold `90_000` → `900_000` | **C4** | `commsLogic.test` (90s threshold) · X |
| M6 | `commsRepo.ts` | `arrayUnion(deviceId)` → `[deviceId]` | **D1 · D3** | `commsRepo.test` (ackMessage arrayUnions) · X |
| M7 | `commsRepo.ts` | แทรก `setInterval` เข้าไปในเส้นทาง subscribe | **C1 · C2** | X |
| M8 | `AlertButtons.tsx` | `scope:'all'` → `scope:'drinks'` | **A1 · A3 · B1 · B2** | `AlertButtons.test` (preset sends) · Y |
| M9 | `AlertButtons.tsx` | เพิ่ม field เกิน `seen:false` ลงใน `base()` | **A1 เท่านั้น** | Y — 🚨 `AlertButtons.test` **เขียว** เพราะใช้ `objectContaining` |
| M10 | `AlertButtons.tsx` | icon `🆘` → `❗` | **A0 · A1 · A2 · A3 · A4 · B1 · B2 · B3** | Y — `AlertButtons.test` **เขียว** เพราะใช้ regex `/ขอคนช่วย/` |
| M11 | `CommsToast.tsx` | `visibleMessages(...)[0]` → `[1]` | **B1 · B2 · C2 · D1 · D2 · D3 · D4 · D5** | `CommsToast.test` (shows a visible alert) · Y |
| M12 | `CommsToast.tsx` | `ackMessage(top.id, me)` → `ackMessage('constant-id', me)` | **D1 เท่านั้น** | `CommsToast.test` (ack calls) · Y |
| M13 | `CommsToast.tsx` | `role="status"` → `role="note"` | **B1 · B2 · C2 · C5 · D2 · D4 · D5** | Y — 🚨 **B3 เขียว** (มันหา `status` ที่ไม่ควรมีอยู่แล้ว) |
| M14 | `alertToast.audit` | `POLL_SHAPE` → `/$^/` (สแกนเนอร์ตาบอด) | **C0 เท่านั้น** | Z — 🚨 **C1 เขียวทั้งที่ไม่ได้ตรวจอะไรเลย** |
| M15 | `alertToast.audit` | regex ของ census B5 → ไม่แมตช์อะไรเลย | **B5 เท่านั้น** | Z |
| M16 | `alertToast.audit` | `read()` คืน `''` (แต่ยังผ่าน guard) | **B5 · C1 · C5** | Z |
| M17 | `CommsToast.tsx` | `useEffect(() => subscribeMessages(...))` ทิ้ง cleanup | **C3 เท่านั้น** | Y |

**เทสต์ที่ทำนายว่ามี killer ตัวเดียว (ห้ามลบ):**
A0 (M10) · A2 (M10) · A4 (M10) · B3 (M1) · B4 (M3) · B5 (M15/M16 — สองตัว) ·
C0 (M14) · C3 (M17) · C4 (M5) · C5 (M13/M16)

**ทำนายว่าไม่มีเทสต์ตัวไหนไม่มี killer** — ถ้าผลจริงมีตัวที่ไม่มีใครฆ่าได้ ต้องเขียนไว้ว่าตัวไหน
และมันปักอะไรอยู่ (แบบเดียวกับ E1 ของ Idempotency ที่ปัก *ช่องว่าง* ไม่ใช่ *ความถูกต้อง*)

### 🚨 mutation ที่มีค่าที่สุดคือ M9 · M14 · M13
- **M9** สาธิต `objectContaining` vs `toStrictEqual` ให้ดูจริง — เทสต์เดิมเขียวหมด
- **M14** สาธิตกับดัก "สวีปตาบอด = สวีปสะอาด" เป็นรอบที่ห้า
- **M13** สาธิตว่า **negative assertion เขียวได้ฟรี**: B3 หา `role="status"` ที่ไม่ควรมี
  พอ role เปลี่ยนชื่อ มันก็ยังไม่เจอ → เขียว **ทั้งที่ toast พังทั้งจอ**

## 6. ช่องว่างที่พบ — บันทึกไว้ ไม่ได้แก้

### GAP-1 — toast ไม่มีเสียง (สเปก §117 สั่งไว้)
§117 เขียนว่า `toast เด้ง + เสียงเบา (ต่างจากเสียงเรียกคิว) + ปุ่ม ✔ ack`
`CommsToast.tsx` **ไม่มีเส้นทางเสียงเลยสักบรรทัด** — ไม่มี `Audio`, ไม่มี `.play()`
**C5 ปักความ *ไม่มี* นี้ไว้** ทรงเดียวกับ E1 ของ Idempotency และ I1 ของ PWA:
🚨 **ถ้าวันหนึ่ง C5 แดง แปลว่ามีคนใส่เสียงเข้ามาแล้ว = นั่นคือการแก้ ไม่ใช่การถดถอย**
ให้เลื่อนขั้น C5 เป็น assertion เรื่องเสียงจริงๆ แล้วอัปเดตบันทึกนี้ **ห้ามลบ**
ไม่แก้รอบนี้เพราะ: ถ้อยคำของ *เกณฑ์* พูดถึง toast กับ ack เท่านั้น ส่วนเสียงเป็นราย
ละเอียดใน §117 และการเพิ่มเสียงคือการแตะ logic comms ซึ่ง Out of scope ห้ามไว้

### GAP-2 — Display ไม่มีแถบ alert (สเปก §118 สั่งไว้)
§118 เขียนว่า `Display: alert สำคัญขึ้นแถบบนจอสั้นๆ ไม่รบกวนการโชว์คิว`
`DisplayScreen` **ไม่ได้ mount comms UI อะไรเลย** — B5 ปักไว้ว่ามันไม่มี
**ไม่ได้ตัดสินว่าเป็นบั๊ก** เพราะ: (ก) ตัว *เกณฑ์* ระบุผู้รับไว้ว่า "HQ + ซุ้มอื่น" ไม่ได้พูดถึงจอลูกค้า
(ข) จอลูกค้าควรเห็น alert ของพนักงานไหม **เป็นการตัดสินใจเชิงดีไซน์ของคน** ไม่ใช่ของ audit
ที่รันแบบ unattended B5 ทำให้สถานะปัจจุบันเป็น *การตัดสินใจที่บันทึกไว้* แทนที่จะเป็นความเงียบ

### 📌 ข้อสังเกตระหว่างทาง (ไม่ได้ assert)
`AlertButtons` ส่ง `scope:'all'` เสมอทั้งสาม preset — ยังไม่มี UI ให้เลือกส่งเจาะจงซุ้ม
ทั้งที่ `Message.scope` รองรับ `BoothId` อยู่แล้ว และ `visibleMessages` ก็กรองให้ถูกแล้ว
(B4 ปักว่ากลไกฝั่งรับทำงาน) — เป็นฟีเจอร์ที่ *เขียนไว้ครึ่งเดียว* ไม่ใช่บั๊ก

## 7. ผลรันจริง

_(เติมหลังรัน mutation ครบ — §5 ถูก commit ไปก่อนแล้ว)_
