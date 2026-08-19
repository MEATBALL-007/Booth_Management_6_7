# AUTOPILOT

## Goal

ระบบนี้ถูกใช้งานจริงในงานซุ้มของโรงเรียน โค้ดเดินมาถึงจุดที่ feature ครบตาม plan แล้ว
(129 tests เขียว, `npm run build` ผ่าน, merge Queue Pro-Upgrade เมื่อ 4 ส.ค.)
แต่ **acceptance criteria 20 ข้อ ใน `docs/superpowers/specs/*-design.md` ยังไม่เคยถูกตรวจอย่างเป็นระบบเลย
— ติ๊กไปแล้ว 0 จาก 20 ข้อ**

"เสร็จ" คือ: ทุกข้อใน 20 ข้อนั้น **ถูกพิสูจน์ด้วยเทสต์อัตโนมัติที่รันได้จริง** หรือถูกบันทึกไว้อย่างชัดเจน
ว่าเป็นช่องว่างที่ยังขาด พร้อมระบุว่าขาดตรงไหน — ไม่มีข้อไหนถูกทิ้งไว้ในสถานะ "ไม่รู้"

## Acceptance criteria

**จาก `2026-08-04-queue-pro-upgrade-design.md`**

- [ ] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ⚠️ รอบวันที่ 2026-08-13 **ทำงานนี้เสร็จแล้วและเจอบั๊กจริง แต่โค้ดถูกลบทิ้งเพราะบั๊กของ runner เอง**
      (agent commit ไม่ได้เพราะเครื่องไม่มี git identity แล้ว runner สั่ง `checkout --force` ทับ)
      **ผลการวิเคราะห์ทั้งหมดรอดมาแล้วที่ `docs/autopilot/2026-08-13-undo-audit-findings.md`**
      ซึ่งระบุบั๊ก ไฟล์ที่ต้องแก้ และวิธีเขียนเทสต์ไว้ครบ — ใช้เป็นสเปกทำซ้ำได้เลย ไม่ต้องวิเคราะห์ใหม่
- [ ] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
- [ ] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
- [x] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
      — ✅ รอบ 2026-08-20 (0031): โค้ดถูกอยู่แล้ว ไม่ต้องแก้ production เลย ช่องว่างอยู่ที่เทสต์ล้วนๆ
      เพิ่ม 9 เทสต์ที่ `src/screens/QueuePanel.callSpecific.test.tsx` (4)
      + `src/screens/DisplayScreen.callSpecific.test.tsx` (5) — commit `d2f47b2`, `aa260fc`
      พิสูจน์ว่าไม่ vacuous ด้วยการ break โค้ด 10 แบบ **ทุกเทสต์ทั้ง 9 ตัวถูกฆ่าอย่างน้อย 1 แบบ**
      **หลักฐานว่าช่องว่างเป็นของจริง**: ใส่ `doneAt` ปลอมเข้าไปใน patch ที่ QueuePanel ส่งให้
      `updateOrderStatus` (ระดับ panel ไม่ใช่ระดับ pure function) → เทสต์ใหม่แดง 1 ตัว
      แต่เทสต์เดิมทั้ง `QueuePanel.test.tsx` + `queueActions.test.ts` **เขียวครบ 16 ตัว**
      เพราะ `objectContaining` มองข้าม field ส่วนเกิน (`updateOrderStatus` เป็น merge → ติดลง doc จริง)
      → เทสต์ใหม่ใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls` ทั้งลิสต์แทน
      หมายเหตุ: guard `status !== 'waiting'` ของ `callSpecific` **ไปไม่ถึงจาก UI** เพราะปุ่ม `เรียก`
      ถูก render เฉพาะการ์ด waiting เท่านั้น (มีเทสต์ล็อกไว้แล้ว) — เป็น defence ชั้นสอง
- [x] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
      — ✅ รอบ 2026-08-20 (0042): **เจอบั๊กจริงและแก้แล้ว** ไม่ใช่แค่ช่องว่างเทสต์
      `apply()` เดิมไม่กันกดซ้ำเลย → กด `เรียกคิวถัดไป` สองทีก่อน snapshot echo กลับ
      **ดึง o1 ซ้ำสองครั้ง ส่วน o2 ไม่ถูกเรียกเลย** (พิสูจน์ด้วย diff ของเทสต์ตอนถอด guard ออก:
      `[['o1',…],['o1',…]]`) — พนักงานเข้าใจว่าเรียกลูกค้าไปสองคนทั้งที่เรียกคนเดียว
      แก้ที่ `src/screens/QueuePanel.tsx`: `written = useRef(new Set<string>())` เก็บ id ที่เพิ่งเขียน
      → `apply()` คืน no-op ถ้า id อยู่ในเซ็ต, **ทุก snapshot ล้างเซ็ตทิ้ง** (fail-open:
      write ที่ไม่ลงจะ lock การ์ดค้างไม่ได้) และ lock เป็นราย order ไม่ใช่ทั้ง panel
      เทสต์ 7 ตัวที่ `src/screens/QueuePanel.idempotency.test.tsx` — commit `62a6222`, `02af614`
      break 4 แบบ (ถอด guard / ไม่ล้างเซ็ต / lock ทั้ง panel / ถอด guard ของ callSpecific)
      **ทุกเทสต์ทั้ง 7 ตัวถูกฆ่าอย่างน้อย 1 แบบ**
      ⚠️ **บทเรียน**: เทสต์ "guard ปลดล็อกแล้ว" ฉบับแรก **เขียวทั้งที่ guard ไม่ปลดเลย**
      เพราะไปกด `เรียกคิวถัดไป` ซึ่งเลื่อนไป o2 (คนละ id ไม่เคยถูก lock) —
      ต้องกระทำกับ **order เดิม** คร่อม echo (เรียก o1 → echo → กด เสร็จ o1) ถึงจะจับได้
      ⚠️ **ช่องว่างที่ยังเหลือ (ตั้งใจไม่แก้)**: **สองเครื่องพร้อมกัน**ยังกันไม่ได้
      เครื่อง B ถือ snapshot เก่า → `callSpecific` ที่ B เห็น status เก่าจึงคืน patch ไม่ใช่ null
      → B ทับ servingAt/announcedAt ของ A ปิดช่องนี้ต้องใช้ transaction/compare-and-set
      ที่ Firestore ซึ่ง **`firestore.rules` เป็น out of scope** ล็อกพฤติกรรมปัจจุบันไว้แล้ว
      ด้วยเทสต์ชื่อ `GAP: a device on a stale snapshot still writes`
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

## Next task

ตรวจข้อ **Display: จัดกึ่งกลางทุกจอ** ให้จบ:

> Display: จัดกึ่งกลางทุกจอ (responsive), "เตรียมตัว" callout เด่น, skipped ไม่โชว์

ข้อนี้มี **3 ข้ออ้างย่อย** ต้องพิสูจน์แยกกัน:
1. **จัดกึ่งกลาง + responsive** — `src/screens/DisplayScreen.tsx:31` root เป็น
   `min-h-screen flex flex-col items-center justify-center text-center` และทุก section
   ข้างในเป็น `items-center` อยู่แล้ว (สแกนไว้ให้แล้วรอบ 0042 — **ยังไม่ได้ทดสอบ**)
   jsdom ไม่คำนวณ layout จริง → เทสต์ได้แค่ระดับ class ว่ามีครบ ให้ระบุข้อจำกัดนี้ไว้ใน SUMMARY
   ให้ตรง ไม่ใช่อ้างว่า "พิสูจน์แล้วว่ากึ่งกลางจริงบนทุกจอ"
2. **"เตรียมตัว" callout เด่น** — ดู `DisplayScreen.tsx:75-84` (กรอบเหลือง + `clamp(56px,10vw,140px)`)
3. **skipped ไม่โชว์** — ข้อนี้ **น่าจะมีเทสต์อยู่แล้ว** จากรอบ No-show
   (`src/screens/DisplayScreen.test.tsx`) → **เช็คก่อนเขียนใหม่ อย่าเขียนซ้ำ**
   ถ้ามีแล้วให้อ้างเลขบรรทัดไปเลย

⚠️ เตือนซ้ำ: branch นี้ (0042) แตกจาก `main` เหมือนเดิม → **ไม่มี** ไฟล์เทสต์ของรอบ 0031
(`*.callSpecific.test.tsx`) และจะไม่มีของรอบ 0042 ด้วย เช็ค `git log --all --oneline` ก่อนเสมอ

**กับดักที่เจอแล้ว (อย่าพลาดซ้ำ):**
- ปุ่ม label ไทย `เรียก` / `เรียกคิวถัดไป` / `เรียกซ้ำ` ขึ้นต้นเหมือนกัน → **ต้องใช้ `/^เรียก$/`**
- ใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls` ทั้งลิสต์ ไม่ใช่ `objectContaining`
  — รอบนี้พิสูจน์แล้วว่า `objectContaining` ปล่อย field ส่วนเกินผ่านได้จริง (เทสต์เดิม 16 ตัวเขียวหมด)
  การ assert ทั้งลิสต์ยังจับ "ยิงซ้ำสองครั้ง" ได้ด้วย ซึ่งตรงกับข้อนี้พอดี
- `Date.now` ให้ล็อกด้วย `vi.spyOn(Date, 'now').mockReturnValue(...)` **อย่าใช้ fake timers**
  เพราะ `userEvent` ถือ timer ของตัวเอง สลับแล้วเทสต์ค้าง
- **(ใหม่ รอบ 0042)** เทสต์ที่ยืนยัน "guard ปลดล็อกแล้ว" ต้องกระทำกับ **ตัวเดิม** คร่อม snapshot
  ถ้าเผลอไปกระทำกับตัวอื่น (ที่ไม่เคยถูก lock) เทสต์จะเขียวทั้งที่ guard ไม่ปลดเลย —
  รอบ 0042 เขียนพลาดแบบนี้จริง จับได้ตอน break เท่านั้น

สิ่งที่ต้องทำ: เพิ่มเทสต์ใน **ไฟล์ใหม่แยก** เสมอ (branch อื่นเป็นเจ้าของไฟล์เดิมอยู่)
ถ้าเจอว่าเป็นบั๊กจริงให้แก้ production ด้วย ไม่ใช่แค่บันทึก
**ต้อง break โค้ดดูว่าเทสต์แดงจริงทุกตัว** แล้ว revert

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

⚠️ **เรื่อง branch (สำคัญกว่าตัวงาน)**: runner แตก branch ใหม่จาก `main` ทุกรอบ และ **ไม่เคย merge
กลับ** → **ก่อนเริ่มงาน ให้ `git log --all --oneline` ดูก่อนเสมอ** ว่าเกณฑ์ข้อนั้นมีคนทำไว้แล้วหรือยัง
(รอบนี้เช็คแล้ว: ไม่มี branch ไหนเคยแตะ callSpecific/idempotency เลย)

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "Display: จัดกึ่งกลางทุกจอ")

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
