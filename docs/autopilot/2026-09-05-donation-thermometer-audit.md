# Donation thermometer — audit (รอบ `auto/Booth_Management_6_7/2026-09-05_0008`)

เกณฑ์ข้อที่สี่ของ `2026-07-24-hq-comms-crosssell-design.md`:

> Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่

ไฟล์เทสต์: `src/donationThermometer.audit.test.tsx` (17 เทสต์)
**ไม่ได้แก้โค้ด production เลยสักบรรทัด** — `netDonation` เป็น logic บัญชี ซึ่ง Out of scope
ห้ามเปลี่ยน และ `frozenZones` F2 แช่แข็ง `src/dashboard/metrics.ts` แบบ byte-identical อยู่แล้ว

---

## 1. สิ่งที่สำรวจได้ก่อนเขียนเทสต์

| สิ่งที่หา | ผล |
|---|---|
| สูตร | `src/dashboard/metrics.ts:69` — `netDonation: totalSales - totalCost` |
| ตัวกรองรายได้ | `isRevenue()` = `paymentStatus === 'paid' && status !== 'cancelled'` |
| จุดเรนเดอร์ HQ | `DashboardScreen.tsx:68` — `<StatTile testid="net-donation" … accent />` |
| แหล่งข้อมูล realtime | `subscribeAllOrders` + `subscribeAllExpenses` (`DashboardScreen.tsx:34–35`) |
| `donationTarget` | `src/domain/types.ts:91` **เป็นที่เดียวในทั้ง repo** |
| แถบ % / เกจ / progress | **ไม่มีเลย** |
| ยอดบริจาคบน Display | **ไม่มีเลย** |

เกณฑ์นี้จึงแตกออกเป็นสามส่วน ไม่ใช่สอง:

- **F** — "ตรงกับ (ยอด paid − expenses)" · เลขคณิตล้วน พิสูจน์ได้เต็ม
- **U** — "อัปเดตเมื่อมีออเดอร์ใหม่" · snapshot ที่สองต้องขยับตัวเลขที่ HQ วาด
- **T** — คำว่า **"thermometer"** เอง · ซึ่งยังไม่มีอยู่จริง

---

## 2. ช่องว่างที่พบ (บันทึกไว้ ไม่ได้แก้ และไม่ได้แกล้งตีความให้ผ่าน)

### 🚨 GAP-1 — ไม่มี thermometer อยู่จริง

สเปก §4.4 สั่งว่า **"แถบ % + ตัวเลข"** วันนี้มีแต่ **ตัวเลข**

`donationTarget` ถูกประกาศไว้ที่ `src/domain/types.ts:91` แล้ว **ไม่มีโมดูล production ตัวไหน
อ่านมันเลย** (T1 ปักเซ็ตไว้ว่ามีไฟล์เดียวคือไฟล์ที่ประกาศเอง) ไม่มีเป้า = ไม่มีตัวหาร = ไม่มี `%`
ที่จะวาด · T2 ปักว่า DOM ของ HQ ไม่มี `<progress>` ไม่มี `<meter>` ไม่มี `role="progressbar"`
และไม่มี element ไหนถูกกำหนดขนาดเป็นสัดส่วน

**ห้ามแกล้งตีความว่า "ตัวเลขก็คือ thermometer"** — และ **ห้ามไปวาดเกจเอง** ในรอบ audit
การออกแบบ UI ใหม่ไม่ใช่งาน audit และ Out of scope ห้ามแตะ logic บัญชี

### 🚨 GAP-2 — Display ไม่มียอดบริจาคเลย

§4.4 สั่งให้ขึ้นบน **"Display ทุกจอ (มุมล่าง ไม่บังคิว)"** · `DisplayScreen.tsx` ไม่มีเลย
T3 ปักไว้ โดยมี **เลขคิว `B7` เป็น spine ฝั่งบวก** เพื่อไม่ให้เขียวเพราะเรนเดอร์ว่าง

### ⚠️ GAP-3 — การนับต่างจากสูตรตามตัวอักษรของสเปก

สเปกเขียน `Σ orders(paid).total` · production **ตัด `status:'cancelled'` ออกด้วย**
บน fixture ของ F3 ต่างกัน 80฿ (200฿ ของ production เทียบกับ 280฿ ตามตัวอักษร)
การตัดออเดอร์ที่ถูกยกเลิกทิ้ง *ดูเหมือน* เป็นกฎที่ดีกว่า แต่มัน **เป็นการเบี่ยงจากสเปกจริงๆ**
F3 ปักตัวเลขทั้งสองฝั่งไว้ **ให้คนตัดสินว่าโรงเรียนต้องการอันไหน**

> T1 · T2 · T3 เป็นทรงเดียวกับ **E1 (Idempotency) · I1 (PWA) · C5 (alert)**:
> มัน assert สภาพที่ยัง *ไม่มี* อยู่ **ถ้าวันหนึ่งมันแดง แปลว่ามีคนสร้าง thermometer แล้ว
> = นั่นคือการแก้ ไม่ใช่การถดถอย** ให้มาอ่านบันทึกนี้ก่อนจะ "ซ่อม" มัน

---

## 3. สิ่งที่ **ไม่ได้** พิสูจน์ และไม่ได้อ้างว่าพิสูจน์

- 🚨 **"realtime" ไม่ได้ถูกวัด** ไม่มีเน็ต ไม่มี Firestore จริง การจับเวลา mock คือการจับเวลา mock
  สิ่งที่ U4 พิสูจน์คือ **รูปทรง** ที่ทำให้ realtime เป็นไปได้ — subscription แบบ push ที่ไม่มี poll
  คั่นระหว่าง snapshot กับการวาด ความหน่วงจริงเป็นเรื่องของ Firestore กับ wifi ในงาน
- 🚨 **ไม่มีพิกเซลไหนถูกวัด** กลุ่ม T ถามว่า *มีแถบอยู่ใน DOM ไหม* ไม่ได้ถามว่าอ่านง่ายหรือวางถูกที่
- **ไม่ได้พิสูจน์ว่าตัวเลขใน Firestore ถูก** ไฟล์นี้พิสูจน์ฟังก์ชันบนข้อมูลที่ป้อนให้เท่านั้น

---

## 4. ตาราง mutation — **ทำนายก่อนรัน** (commit นี้เขียนก่อนรันทุกตัว)

กติกาเดิม: mutate หนึ่งอย่าง รันเทสต์ จด red set จริง เทียบกับที่ทำนาย แล้ว revert
คอลลาเทอรัลที่คาดไว้ล่วงหน้า (จากบทเรียนรอบ `_0027`):

- แก้ `src/dashboard/metrics.ts` (แช่แข็ง + ไม่ได้ประกาศ) → `fz F2` · `fz P1` · `ds S2`
- แก้ `src/screens/DashboardScreen.tsx` (ไม่แช่แข็ง · presentation · ไม่ได้ประกาศ) → `fz P1`
- แก้ `src/screens/DisplayScreen.tsx` (ประกาศไว้แล้วใน `PRODUCTION_CHANGES`) → ไม่มี
- แก้เฉพาะไฟล์เทสต์ของรอบนี้ → ไม่มี

| # | mutation | ทำนายว่าแดง (เฉพาะไฟล์นี้) |
|---|---|---|
| M1 | `metrics.ts`: `netDonation: totalSales` (ลืมลบรายจ่าย) | F1 · F3 · F4 · F5 · U0 · U1 · U2 · T2 · T4 |
| M2 | `isRevenue`: ตัดเงื่อนไข `paymentStatus === 'paid'` | F1 · F2 · F3 · U0 |
| M3 | `isRevenue`: ตัดเงื่อนไข `status !== 'cancelled'` (= สูตรตามตัวอักษร) | F1 · F3 · U0 |
| M4 | `totalCost`: นับเฉพาะรายจ่ายของซุ้ม `photo` | F1 · F3 · F4 · U0 |
| M5 | `netDonation: Math.max(0, totalSales - totalCost)` (clamp) | **F5 ตัวเดียว** |
| M6 | `DashboardScreen`: รับเฉพาะ snapshot แรกของ orders | U1 · U3 · U4 |
| M7 | `DashboardScreen`: snapshot สะสมแทนที่จะแทนที่ | U1 · U3 · U4 |
| M8 | `DashboardScreen`: ไม่ยกเลิก subscription ตอน unmount | **U5 ตัวเดียว** |
| M9 | `DashboardScreen`: `setInterval` แอบเติมออเดอร์ผีทุก 60 วิ | **U4 ตัวเดียว** |
| M10 | `DashboardScreen`: ผูก tile `net-donation` เข้ากับ `m.totalSales` | U0 · U1 · U2 · T2 |
| M11 | ไฟล์เทสต์: `productionSources()` คืน `[]` (อ่านไม่เจอไฟล์) | T0 · T1 |
| M12 | ไฟล์เทสต์: `isProportional` คืน `false` เสมอ (ตัวตรวจตาบอด) | **T2 ตัวเดียว** — เพราะมี control |
| M12b | M12 + ถอด control ของ T2 ออก | **ไม่มีเลย** (นี่คือกับดักที่ control กันไว้) |
| M13 | `DisplayScreen`: เพิ่มบรรทัด `ยอดบริจาค …฿` (= ช่องว่างถูกปิด) | **T3 ตัวเดียว** |
| M14 | `metrics.ts`: อ่าน `donationTarget` (= เป้าถูกต่อสาย) | T1 · T4 |
| M15 | ไฟล์เทสต์: `o()` default เป็น `paymentStatus: 'pending'` (fixture เน่า) | F0 · F2 · F4 · F5 · U1 · U2 · U3 · U4 · T2 |

**ทำนายไว้ล่วงหน้าด้วยว่า ทุกเทสต์ใน 17 ตัวมี killer อย่างน้อยหนึ่งตัว**
และตัวที่ทำนายว่า **มี killer ตัวเดียว** คือ **U5 (M8) · T0 (M11) · T3 (M13)**
ส่วน **F5** มี M1/M15 ฆ่าได้ด้วย แต่ **M5 คือ killer ที่เจาะจงมัน** — clamp ที่ 0 คือ
สปีชีส์บั๊กที่ thermometer มักเป็น และ **ไม่มีเทสต์อื่นในทั้ง repo ที่จับได้**

---

## 5. ผลการรันจริง

*(เติมหลังรัน — ห้ามเติมก่อน)*
