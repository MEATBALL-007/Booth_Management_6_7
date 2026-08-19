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
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ รอบ 2026-08-20 (0020): โค้ดถูกอยู่แล้ว ไม่ต้องแก้ production เลย ช่องว่างอยู่ที่เทสต์ล้วนๆ
      เพิ่ม 12 เทสต์ที่ `src/screens/DisplayScreen.reannounce.test.tsx` (7)
      + `src/screens/QueuePanel.reannounce.test.tsx` (5) — commit `219d80d`
      พิสูจน์ว่าไม่ vacuous ด้วยการ break โค้ด 5 แบบ ทุกแบบทำให้เทสต์ที่ตรงกันแดง
      **หลักฐานว่าช่องว่างเป็นของจริง**: ใส่ `status` ปลอมเข้าไปใน patch ของ `reannounce`
      → เทสต์ใหม่แดง 3 ตัว แต่ `QueuePanel.test.tsx` เดิม **เขียวครบ 8 ตัว** เพราะใช้
      `objectContaining` ซึ่งมองข้าม field ส่วนเกิน (`updateDoc` เป็น merge → field ส่วนเกินติดลง doc จริง)
      หมายเหตุ: `useServingAlert` key จาก **serving set เท่านั้น** — order ที่ waiting เปลี่ยนไม่ re-run effect
      เคสที่แตะ `newlyAnnounced` จริงจึงต้องเปลี่ยน serving set (เทสต์ "finishing one serving order")
      ซึ่งเป็นเทสต์ตัวเดียวที่จับ mutation `>` → `>=` ได้
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

ตรวจข้อ **เรียกเจาะจง** ให้จบ:

> กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)

สถานะที่สำรวจไว้แล้วรอบ 2026-08-20 (0020) — **สำรวจบน branch นี้เอง ไม่ต้องสำรวจซ้ำ**:
- `Q.callSpecific(o, now)` คืน `{ status:'serving', servingAt:now, announcedAt:now }` เฉพาะตอน `waiting`
  มีเทสต์ pure function ครบทั้งสองขาแล้วที่ `src/queue/queueActions.test.ts:22-25`
- **มีเทสต์ระดับ UI อยู่แล้ว** ที่ `src/screens/QueuePanel.test.tsx:73-83`
  ("call button on a waiting order serves that specific number") ซึ่งกดปุ่มของ waiting **ตัวที่สอง**
  แล้ว assert ว่า `o2` ถูกเรียก — ข้อนี้จึงครอบคลุมคำว่า "ข้ามลำดับได้" ในระดับหนึ่งแล้ว
  ⚠️ รอบ 2026-08-18 (`c145ef3`) เขียน handoff ไว้ว่า "QueuePanel.test.tsx ไม่มีเทสต์ callSpecific เลย"
  — **ข้อความนั้นผิดสำหรับ branch นี้** ตรวจไฟล์เองก่อนเชื่อ

**ช่องว่างที่เหลือจริงๆ มี 3 จุด:**
1. เทสต์เดิมใช้ `objectContaining({ status: 'serving' })` → ไม่ได้พิสูจน์ว่า `servingAt`/`announcedAt`
   ถูกตั้ง และไม่กัน field ส่วนเกิน (คลาสเดียวกับบั๊กที่รอบ ประกาศซ้ำ เพิ่งพิสูจน์ว่าซ่อนได้จริง)
   → ใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls` แทน
2. ไม่มีเทสต์ว่าเรียกเลขท้ายแถวแล้ว **เลขที่อยู่ก่อนหน้ายังคง waiting** (ไม่ถูกดึงตามไปด้วย)
   และ `เรียกคิวถัดไป` หลังจากนั้นยังหยิบตัวที่เก่าที่สุดที่เหลือได้ถูกต้อง
3. ไม่มีเทสต์ระดับ **DisplayScreen** ว่าเลขที่ถูกเรียกข้ามลำดับขึ้นจอ + ประกาศ (chime+flash)
   — เส้นทางนี้คือ branch `was === undefined` ของ `newlyAnnounced` ซึ่งรอบ No-show แตะแล้ว
   แต่ยังไม่เคยแตะจากทาง callSpecific

**กับดักที่เจอแล้ว (อย่าพลาดซ้ำ):**
- ปุ่มนี้ label ไทยคือ `เรียก` เฉยๆ ส่วน `เรียกคิวถัดไป` (callNext) กับ `เรียกซ้ำ` (recall)
  ก็ขึ้นต้นด้วย "เรียก" → **ต้องใช้ regex `/^เรียก$/`** ไม่งั้น query ชนกันเงียบๆ
- `useServingAlert` key จาก serving set เท่านั้น — ถ้าจะทดสอบเคส "ไม่ควรประกาศ" ต้องทำให้
  serving set เปลี่ยน ไม่งั้น effect ไม่ re-run แล้วเทสต์เขียวหลอก

สิ่งที่ต้องทำ: เพิ่ม `src/screens/QueuePanel.callSpecific.test.tsx` (+ ถ้าไหว
`src/screens/DisplayScreen.callSpecific.test.tsx`) **เป็นไฟล์ใหม่แยก** จะได้ไม่ชนกับ branch อื่น
ถ้าโค้ดถูกอยู่แล้วก็แค่เพิ่มเทสต์ที่พิสูจน์มัน **แต่ต้อง break โค้ดดูว่าเทสต์แดงจริง** แล้ว revert

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

⚠️ **เรื่อง branch (สำคัญกว่าตัวงาน)**: runner แตก branch ใหม่จาก `main` ทุกรอบ และ **ไม่เคย merge
กลับ** ทำให้แต่ละรอบทำงานซ้ำของรอบก่อนบน branch ที่มองไม่เห็นกัน — ข้อ Undo ถูกทำ 2 รอบ
(`d72bbc6`, `2791ffe`), No-show 2 รอบ (`50c9762`, `38cb57c`), ประกาศซ้ำ 2 รอบ (`0f14c87`, `219d80d`)
**ก่อนเริ่มงาน ให้ `git log --all --oneline` ดูก่อนเสมอว่าเกณฑ์ข้อนั้นมีคนทำไว้แล้วหรือยัง**
ทางแก้ที่แท้จริงคือ merge branch เหล่านี้เข้า `main` ซึ่งอยู่นอกมือ agent (push ไม่ได้)

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "Idempotency")

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "ประกาศซ้ำ")

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
