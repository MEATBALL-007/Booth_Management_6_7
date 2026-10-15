# AUTOPILOT

## Goal

ระบบนี้ถูกใช้งานจริงในงานซุ้มของโรงเรียน โค้ดเดินมาถึงจุดที่ feature ครบตาม plan แล้ว
(129 tests เขียว, `npm run build` ผ่าน, merge Queue Pro-Upgrade เมื่อ 4 ส.ค.)
แต่ **acceptance criteria 20 ข้อ ใน `docs/superpowers/specs/*-design.md` ยังไม่เคยถูกตรวจอย่างเป็นระบบเลย
— ติ๊กไปแล้ว 0 จาก 20 ข้อ**

"เสร็จ" คือ: ทุกข้อใน 20 ข้อนั้น **ถูกพิสูจน์ด้วยเทสต์อัตโนมัติที่รันได้จริง** หรือถูกบันทึกไว้อย่างชัดเจน
ว่าเป็นช่องว่างที่ยังขาด พร้อมระบุว่าขาดตรงไหน — ไม่มีข้อไหนถูกทิ้งไว้ในสถานะ "ไม่รู้"

## Acceptance criteria

> ⚠️ **ช่องที่ติ๊กแล้ว หลักฐานกระจายอยู่บน branch ที่ยังไม่ merge** — ไฟล์นี้เป็นบัญชีรวมข้ามรอบ
> ไม่ใช่สถานะของ main ตอนนี้ main มี 131 เทสต์ และยังไม่มีงานของ 3 branch ข้างล่างนี้เลย
> - `2026-08-13_1553` → ข้อ Undo (แก้ `queueActions.*`, `ordersRepo.*`, `QueuePanel.*`)
> - `2026-08-15_0020` → ข้อ No-show (เพิ่มเทสต์ใน `DisplayScreen.test.tsx` + `data-testid` ใน `DisplayScreen.tsx`)
> - `2026-08-15_0031` → ข้อ ประกาศซ้ำ (ไฟล์ใหม่ `DisplayScreen.reannounce.test.tsx` ล้วนๆ ไม่ชนใคร)
> - `2026-08-15_0042` (branch นี้) → ข้อ เรียกเจาะจง (ไฟล์ใหม่ `QueuePanel.callSpecific.test.tsx` ล้วนๆ ไม่ชนใคร)
>
> เลขบรรทัดที่อ้างถึงในช่องที่ติ๊กแล้ว เป็นเลขบรรทัด **บน branch ของรอบนั้น** ไม่ใช่บน main

**จาก `2026-08-04-queue-pro-upgrade-design.md`**

- [ ] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ✅ **งานนี้ทำเสร็จแล้วจริง และ commit ไว้เรียบร้อยแล้ว** ที่ branch
      `auto/Booth_Management_6_7/2026-08-13_1553` (commit `5ce7f61` + `cc85ddd`, push ขึ้น origin แล้ว)
      แต่ **ยังไม่ถูก merge เข้า main** — main จึงยังไม่มีโค้ดนี้
      — ⚠️ ข้อความเดิมตรงนี้ที่ว่า "โค้ดถูกลบทิ้งเพราะบั๊กของ runner" **ไม่เป็นความจริง**
      git identity เสียจริงตอนกลางวันของ 2026-08-13 แต่ถูกแก้ในวันเดียวกัน แล้วงานถูก commit
      เมื่อ 15:59 น. ของวันนั้นเอง ข้อความเดิมถูกเขียนจาก SUMMARY ของรอบที่ล้มกลางคัน
      จึงค้างอยู่ที่สถานะ "commit ไม่ได้" และไม่เคยถูกอัปเดตอีกเลย
      — รอบ 2026-08-15 ตรวจสอบแล้ว: เอา source ของ branch นั้นมารันจริง ได้ `npm test` = **144 ผ่าน**
      และ `npm run build` ผ่าน งานนั้นสมบูรณ์และเขียว
      — **ห้ามทำซ้ำ** การทำซ้ำ = เปิด PR ที่แก้ไฟล์ชุดเดียวกันซ้อนกันสองอัน สิ่งที่ต้องทำคือ merge PR นั้น
      ติ๊กช่องนี้ตอน merge เข้า main แล้ว (branch 1553 ติ๊กไว้ให้แล้วใน commit ของมันเอง)
      — `docs/autopilot/2026-08-13-undo-audit-findings.md` ยังเป็นบันทึกการวิเคราะห์ที่ถูกต้องอยู่
      แต่หัวข้อ Risk ข้อ 1 ของมัน (เรื่อง commit ไม่ได้) ล้าสมัยแล้ว
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ ครบทั้ง 4 ส่วน พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0020)
      1. `skip`: serving → skipped — `src/queue/queueActions.test.ts:32`
      2. หายจากจอลูกค้า — `src/screens/DisplayScreen.test.tsx` (เทสต์ใหม่ 2 ตัว: ไม่โผล่ทั้ง
         serving / next-up / upnext และไม่แย่ง spotlight "เตรียมตัว" จาก waiting ที่ใหม่กว่า)
      3. ขึ้นโซนพักไว้ — `src/screens/QueuePanel.test.tsx:93` (ทางอ้อม: ปุ่ม "เรียกซ้ำ" ถูก render
         เฉพาะในโซนพักไว้ ถ้าโซนไม่ขึ้น `getByRole` จะ throw)
      4. `recall` → serving + Display ประกาศ chime+flash — `queueActions.test.ts:37`
         + `DisplayScreen.test.tsx` (เทสต์ใหม่ 2 ตัว: chime 1 ครั้ง + flash ติด แล้วดับเองใน 2500ms)
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ ครบทั้งสามชั้น พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0031)
      1. action: `reannounce` เด้ง `announcedAt` เฉพาะ order ที่ serving — `src/queue/queueActions.test.ts:42`
      2. ปุ่ม 🔔 บนการ์ด serving เรียก action นั้นจริง — `src/screens/QueuePanel.test.tsx:98`
      3. ฟังก์ชันล้วน `newlyAnnounced` ยิงเมื่อ `announcedAt` เด้ง — `src/display/queueView.test.ts:29`
      4. **การต่อสาย (wiring) ระดับหน้าจอ** — `src/screens/DisplayScreen.reannounce.test.tsx` (ไฟล์ใหม่ 4 เทสต์
         บน branch นี้): order ที่ serving อยู่แล้ว พอ `announcedAt` เด้ง 100 → 200 ต้อง chime + flash ซ้ำ,
         เด้งของเลขหนึ่งไม่ลามไปเลขอื่นที่ serving อยู่, snapshot ที่เปลี่ยน `items` เฉยๆ ต้อง **ไม่** chime,
         และ flash ต้องดับเองใน 2500ms
      — mutation-check แล้ว: แก้ `DisplayScreen.tsx:26` เป็น `announcedAt: 0` คงที่ → เทสต์ใหม่แดง 3 จาก 4
      ขณะที่ `DisplayScreen.test.tsx` เดิม **เขียวครบทั้ง 4 ตัว** (นี่คือช่องว่างที่ปิดไปรอบนี้) แล้ว revert แล้ว
- [x] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
      — ✅ พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0042) **ไม่ได้แก้โค้ด production เลย
      `QueuePanel.tsx` เหมือน main ทุก byte** — ฟีเจอร์ถูกอยู่แล้ว ที่ขาดคือ *หลักฐาน*
      1. action: `callSpecific` → serving + servingAt + announcedAt, และคืน `null` ถ้าไม่ใช่ waiting
         — `src/queue/queueActions.test.ts:22`
      2. **การต่อสาย (wiring)** — `src/screens/QueuePanel.callSpecific.test.tsx` (ไฟล์ใหม่ 5 เทสต์):
         คิวรอ **3 ใบ** กดใบกลาง → เรียก `o2` ใบเดียว, วนกดครบทั้ง 3 ใบ ใบไหนก็เรียกเลขของตัวเอง,
         กดใบสุดท้ายก่อนแล้วค่อยใบแรก → ลำดับ `['o3','o1']` (นี่คือ "ข้ามลำดับได้" ตรงตัว),
         ปุ่ม "เรียก" ขึ้นเฉพาะ waiting, และไม่ข้ามสถานี
      — ⚠️ **ช่องว่างที่เจอและปิดไปรอบนี้:** เทสต์เดิม `QueuePanel.test.tsx:73` ใช้คิวรอแค่ **2 ใบ**
      แล้วกดใบที่ 2 — บน fixture 2 ใบ "ใบที่กด" กับ "ใบสุดท้าย" **แยกกันไม่ออก**
      mutation-check: แก้ `QueuePanel.tsx:88` ให้ปุ่มส่ง `waiting[waiting.length-1]` เสมอ
      → **เทสต์ทั้ง 131 ตัวของ main เขียวหมด** ทั้งที่ปุ่มพังแล้ว
      ส่วนไฟล์ใหม่แดง 3 จาก 5 ทันที (แก้เป็น `waiting[0]` ก็แดง 3 จาก 5 เหมือนกัน) — revert แล้ว
      — เทสต์ใหม่ยืนยันบน `updateOrderStatus.mock.calls` ด้วย `toStrictEqual` ไม่ใช่ `objectContaining`
      จึงจับได้ทั้ง id ที่ผิด, จำนวนครั้งที่เรียก, และ field ส่วนเกินใน patch
- [ ] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
- [ ] Display: จัดกึ่งกลางทุกจอ (responsive), "เตรียมตัว" callout เด่น, skipped ไม่โชว์
- [ ] Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ (สี+ไอคอน+ขนาด; ไทยเด่น อังกฤษรอง)
- [ ] เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms

**จาก `2026-08-03-ui-overhaul-design.md`**

- [ ] ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)
- [ ] อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ — ไม่มี horizontal scroll, touch target ≥44px
- [ ] tests เขียวครบ + `npm run build` ผ่าน + PWA generate
- [ ] Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)
- [ ] Display เลขคิวสเกลใหญ่ตามจอด้วย clamp

**จาก `2026-07-24-hq-comms-crosssell-design.md`**

- [ ] HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime; ปิดเครื่องนึง อีกเครื่องทำงานครบ
- [ ] ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้
- [ ] HQ toggle Happy-Hour → Order Station คิดราคาใหม่ + Display ขึ้นป้าย; order บันทึก unitPrice จริง
- [ ] Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่
- [ ] ปิดซุ้ม → expectedCash ตรงกับ Σ เงินสด, กรอกเงินจริง → diff บันทึกถูก
- [ ] Passport: สแกนครบ 3 ซุ้ม → ขึ้นรางวัล; สแกนซุ้มเดิมซ้ำไม่เพิ่มแสตมป์; offline แล้ว sync ได้
- [ ] ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน

## Verify

```
npm test && npm run build
```

## Out of scope

- **ห้ามแก้ `firestore.rules` และ `firestore.indexes.json`** — เป็นความปลอดภัยของข้อมูลจริง
- **ห้ามเปลี่ยน logic บัญชี / เมนู / comms** — spec เองระบุข้อนี้เป็นเกณฑ์
- **ห้ามแก้ไฟล์ใน `docs/superpowers/specs/`** — เป็นเกณฑ์อ้างอิงที่ใช้ตัดสิน ห้ามแก้เกณฑ์ให้เข้ากับโค้ด
- ห้ามเพิ่ม dependency ใหม่
- ห้ามแตะ `.env*`, `.firebaserc`
- อย่าติ๊ก checkbox ใน `docs/` (ธรรมเนียมนี้ไม่ถูกใช้ในโปรเจคนี้ — ติ๊กที่ไฟล์นี้ไฟล์เดียว)

## Next task — do ONLY this

ตรวจเกณฑ์ **Idempotency** ให้จบ:

> Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)

สถานะตอนนี้ (สำรวจแล้วรอบ 0042 ตอนอ่านโค้ด แต่ **ยังไม่ได้ mutation-check** จึงยังไม่ติ๊กให้):
- **ชั้น action เขียวครบแล้ว** — ทุกตัวคืน `null` เมื่อสถานะไม่ตรง มีเทสต์ครบใน
  `src/queue/queueActions.test.ts` (`callNext`:18, `callSpecific`:22, `markDone`:27,
  `skip`:32, `recall`:37, `reannounce`:42) — ชั้นนี้ไม่ต้องทำอะไรเพิ่ม
- **ชั้นที่ยังไม่มีเทสต์เลยคือ `QueuePanel.apply()`** ที่ `src/screens/QueuePanel.tsx:24-28`
  บรรทัด `if (!patch) return` คือ guard ตัวจริงฝั่ง UI และ **ลำดับสำคัญมาก**: `setUndo(...)`
  อยู่ *หลัง* guard ถ้า guard หลุด แถบ "ย้อนกลับ" จะโผล่ให้กดทั้งที่ไม่มีอะไรเกิดขึ้น
  → undo ปลอมนี่แหละคือทางที่ข้อมูลจะเพี้ยนจริง

สิ่งที่ต้องทำ:
1. เขียนเทสต์ **ในไฟล์ใหม่** `src/screens/QueuePanel.idempotency.test.tsx`
   (**ห้ามแก้ `QueuePanel.test.tsx`** — branch 1553 ค้างการแก้ไฟล์นั้นไว้)
   - กดปุ่มเดิมซ้ำเร็วๆ 2 ครั้ง (เช่น "เสร็จ" บนการ์ด serving) โดยยังไม่ปล่อย snapshot ใหม่ออกมา
     → ยืนยันด้วย `updateOrderStatus.mock.calls` ว่า **ไม่มีการยิงครั้งที่ 2 ที่ผิด**
   - กด action บน order ที่สถานะเปลี่ยนไปแล้ว (emit snapshot ใหม่ก่อน) → `mock.calls` ต้องว่าง
     **และแถบ "ย้อนกลับ" ต้องไม่โผล่** (`queryByRole('button', { name: /ย้อนกลับ/ })` เป็น null)
2. mutation-check: ลบ `if (!patch) return` ที่ `QueuePanel.tsx:25` ทิ้ง → เทสต์ใหม่ต้องแดง
   ถ้าไม่แดงแปลว่ายังพิสูจน์ไม่ได้ — **revert ทุกครั้ง**
3. **ส่วน "สองเครื่องพร้อมกัน" ให้ตรวจแล้วบันทึกตามจริง อย่าเดา** — อ่าน
   `src/order/ordersRepo.ts` ว่า `updateOrderStatus` ใช้ `updateDoc` เฉยๆ หรือใช้ `runTransaction`
   ถ้าเป็น `updateDoc` เฉยๆ = **ไม่มี guard ฝั่งเซิร์ฟเวอร์** guard ทั้งหมดเป็น client-side
   ให้เขียนลงช่องนี้ตรงๆ ว่าส่วนนี้ยัง **พิสูจน์ไม่ได้ด้วยเทสต์ระดับนี้** พร้อมระบุว่าขาดตรงไหน
   (เกณฑ์ใน Goal ยอมรับ "บันทึกว่าเป็นช่องว่าง" — แต่ไม่ยอมรับสถานะ "ไม่รู้")
   หมายเหตุที่สำรวจไว้แล้ว: `callNext` หยิบ waiting ที่ `createdAt` น้อยสุดเสมอ ดังนั้นสองเครื่อง
   ที่กดพร้อมกันจะเลือก order **ใบเดียวกัน** ไม่ใช่คนละใบ — จึงไม่ "ดึงซ้อน" สองใบ
   แต่จะเขียนทับ `servingAt`/`announcedAt` ซ้ำ (ผลคือประกาศซ้ำ) — ยืนยันข้อนี้ด้วยเทสต์ได้

หมายเหตุวิธีทำงานที่ได้ผลสองรอบติด (0031, 0042) และควรทำต่อ: เมื่อช่องว่างอยู่ที่ **การต่อสาย**
ให้เขียนเทสต์ไว้ในไฟล์ใหม่ และหลีกเลี่ยงการเพิ่ม `data-testid` ลงในไฟล์ component
(อ่านจาก `container`/role ที่ `render()` คืนมาแทน) วิธีนี้ได้หลักฐานครบโดยไม่แตะไฟล์ที่ branch อื่น
ค้างไว้เลย — merge ได้สะอาด **และให้ยืนยันด้วย `toStrictEqual` บน `mock.calls` เสมอ**
เพราะ `objectContaining`/`toHaveBeenCalledWith` มองข้ามทั้ง field ส่วนเกินและจำนวนครั้งที่เรียก

---

### ค้างอยู่ที่คน ไม่ใช่ agent (ทำคู่ขนานได้ ไม่บล็อกงานข้างบน)

**ตอนนี้มี branch ค้างรอ merge 5 อัน กองสูงขึ้นทุกรอบ** — agent push/merge เองไม่ได้ (ไม่มีสิทธิ์ push/gh)
แนะนำให้ merge ตามลำดับนี้ (เรียงจากชนน้อยไปมาก):

1. `auto/Booth_Management_6_7/2026-08-15_0008` — แก้ข้อความ plan อย่างเดียว (แตะแค่ `AUTOPILOT.md`, `SUMMARY.md`)
2. `auto/Booth_Management_6_7/2026-08-13_1553` — ข้อ **Undo** แตะ `queueActions.*`, `ordersRepo.*`, `QueuePanel.*`
3. `auto/Booth_Management_6_7/2026-08-15_0020` — ข้อ **No-show** แตะ `DisplayScreen.tsx` + `DisplayScreen.test.tsx`
4. `auto/Booth_Management_6_7/2026-08-15_0031` — ข้อ **ประกาศซ้ำ** เพิ่มไฟล์ใหม่ไฟล์เดียว ไม่ชนโค้ดกับใครเลย
5. `auto/Booth_Management_6_7/2026-08-15_0042` — ข้อ **เรียกเจาะจง** เพิ่มไฟล์ใหม่ไฟล์เดียว ไม่ชนโค้ดกับใครเลย

ทุกอันจะ conflict กันที่ `AUTOPILOT.md` และ `SUMMARY.md` เท่านั้น (ทุก branch เขียนสองไฟล์นี้)
วิธีแก้: เอาของ branch ที่ใหม่กว่าเสมอ — ของ 0042 เป็น superset ของ 0031, 0020 และ 0008 อยู่แล้ว
ฝั่ง **โค้ด** ไม่ชนกันเลยสักคู่ (1553 = queue/order, 0020 = DisplayScreen, 0031 + 0042 = ไฟล์ใหม่ล้วน)

⚠️ **ข้อควรระวังตอน merge 1553 เข้ากับ 0042:** 1553 แก้ `QueuePanel.tsx` (ย้าย patch ของ "ยกเลิก"
ไปเป็น `Q.cancel(reason)`) ส่วน 0042 **ไม่ได้แก้ `QueuePanel.tsx` เลย** จึงไม่ conflict กัน
แต่เทสต์ใหม่ของ 0042 ยืนยัน `updateOrderStatus.mock.calls` แบบตรงตัว — ถ้า 1553 ทำให้ patch
ของปุ่ม "เรียก" เปลี่ยนรูป เทสต์จะแดงทันที (ซึ่งเป็นเรื่องดี ไม่ใช่ conflict)

**อย่าทำข้อ Undo ซ้ำเด็ดขาด** ไม่ว่ารอบไหน — งานนั้นเสร็จแล้วที่ 1553

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 136 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
