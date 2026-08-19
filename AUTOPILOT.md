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

- [x] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ✅ รอบ 2026-08-19: เจอบั๊กจริงและแก้แล้ว (`orderSnapshot` เก็บไม่ครบ + `updateDoc` เป็น merge
      ทำให้ field ที่ action สร้างขึ้นรอดจาก undo) พิสูจน์ด้วย round-trip test 10 เคส ครบทุก action
      ในทุก state ที่กดถึงได้จริง ที่ `src/queue/undoRoundTrip.test.ts` + UI 3 เคสที่
      `src/screens/QueuePanel.undo.test.tsx` — commit `2791ffe`
      (สเปกที่ใช้: `docs/autopilot/2026-08-13-undo-audit-findings.md` จากรอบที่โค้ดถูกลบทิ้ง)
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ รอบ 2026-08-20: โค้ดถูกอยู่แล้ว ไม่มีบั๊ก แต่ 3 ใน 4 ท่อนไม่เคยมีเทสต์ยืนยัน เพิ่มเทสต์ 10 ตัว
      ที่ `src/screens/DisplayScreen.noshow.test.tsx` (5) + `src/screens/QueuePanel.noshow.test.tsx` (5)
      พิสูจน์ว่าไม่ vacuous ด้วยการ break โค้ด 6 แบบ ทุกแบบทำให้เทสต์ที่ตรงกันแดง
      หมายเหตุ: `skipped` หายจากจอเพราะ `queueView` filter **เอาเข้า** (`=== 'serving'`/`=== 'waiting'`)
      ไม่ได้ตัด skipped ออกตรงๆ — เทสต์ใหม่จึงเป็น regression guard ของพฤติกรรมนี้
- [ ] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
- [ ] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
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

## Next task

ตรวจข้อ **ประกาศซ้ำ** ให้จบ:

> กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

สถานะที่สำรวจไว้แล้วรอบ 2026-08-20 (ไม่ต้องสำรวจซ้ำ):
- `Q.reannounce(o, now)` คืน `{ announcedAt: now }` เฉพาะตอน status เป็น `serving`
  — มีเทสต์ระดับ pure function แล้วที่ `src/queue/queueActions.test.ts:41`
- `newlyAnnounced` กับ `useServingAlert` มีเทสต์ระดับ unit แล้วที่ `src/display/queueView.test.ts:29`
  และ `src/display/useServingAlert.test.ts:28` (**แต่ตัวหลังเช็คแค่ chime ไม่ได้เช็ค flash**)
- **ช่องว่างจริงคือ**: ยังไม่มีเทสต์ระดับ **DisplayScreen** ที่พิสูจน์เส้นทาง "เลขเดิมที่ serving อยู่แล้ว
  แล้ว announcedAt เด้ง" ซึ่งเป็น **คนละ branch** กับที่รอบ No-show ทำไป
  (รอบนั้นเลขหายไปแล้วกลับมา = branch `was === undefined`; รอบนี้คือ branch `s.announcedAt > was`)
- **ช่องว่างจริงข้อสอง**: ยังไม่มีเทสต์ระดับ QueuePanel ที่กดปุ่ม 🔔 ประกาศซ้ำ แล้ว assert ว่า patch
  ที่ส่งคือ `{ announcedAt }` **เท่านั้น** — ต้องไม่มี `status` ติดไปด้วย (ถ้ามี = เขียนทับสถานะจริง)

สิ่งที่ต้องทำ:
1. `src/screens/DisplayScreen.reannounce.test.tsx` — emit เลขเดิม status `serving` สองครั้ง
   โดยครั้งที่สอง `announcedAt` สูงกว่า → assert chime 1 ครั้ง + root มี `animate-pulse`
   ใช้ `rootOf(container) = container.firstElementChild` (อย่า query `.animate-pulse` ทั้งหน้า
   เพราะจุดไฟ live ใน header มี `animate-pulse` ถาวร — จะได้เทสต์ที่เขียวหลอก)
2. `src/screens/QueuePanel.reannounce.test.tsx` — กดปุ่ม 🔔 บน serving card แล้วเช็ค
   `Object.keys(patch)` ให้เท่ากับ `['announcedAt']` เป๊ะๆ (**ห้ามใช้ `objectContaining`**)
   และเช็คว่าปุ่มนี้ไม่มีบน waiting card / บนการ์ดในโซนพักไว้

ทำแบบเดียวกับรอบ No-show: ถ้าโค้ดถูกอยู่แล้วก็แค่เพิ่มเทสต์ที่พิสูจน์มัน
**แต่ต้องพิสูจน์ว่าเทสต์ไม่ vacuous** — break โค้ดชั่วคราว (เช่น ให้ `reannounce` คืน `{}` ,
ถอด `animate-pulse` ออกจาก DisplayScreen, ปิด `playChime()`) แล้วดูว่าเทสต์แดงตรงข้อ จากนั้น revert
**เทสต์ใหม่ให้แยกไฟล์** จะได้ไม่ชนกับ branch อื่น

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "เรียกเจาะจง")

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "ประกาศซ้ำ")

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
