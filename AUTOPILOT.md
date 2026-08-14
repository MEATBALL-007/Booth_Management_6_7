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

## Next task — do ONLY this

ทำเกณฑ์ **ประกาศซ้ำ** ฝั่ง Display:

> ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

สถานะตอนนี้ (ตรวจแล้วรอบ 0020):
- ฝั่ง logic เขียวแล้ว — `reannounce` มีเทสต์ที่ `src/queue/queueActions.test.ts:41`
  และปุ่ม 🔔 ประกาศซ้ำ มีเทสต์ที่ `src/screens/QueuePanel.test.tsx:98`
- ฟังก์ชันล้วน `newlyAnnounced` ก็เขียวแล้วทั้งสองสาขา — `src/display/queueView.test.ts:29-37`
  ครอบทั้ง `was === undefined` (เลขใหม่เข้า serving) และ `s.announcedAt > was` (เลขเดิม announcedAt เด้ง)
- **ช่องว่างที่เหลืออยู่คือการต่อสาย (wiring) ระดับหน้าจอ**: ไม่มีเทสต์ตัวไหนใน
  `src/screens/DisplayScreen.test.tsx` ที่ยิงโดนสาขา `s.announcedAt > was` เลย
  เทสต์ระดับหน้าจอที่มีอยู่ทุกตัว (รวม 4 ตัวที่เพิ่มรอบ 0020) เป็นเคส "เลขใหม่เข้ามา serving" ทั้งหมด
  จึงยังไม่มีอะไรพิสูจน์ว่า `DisplayScreen` → `useServingAlert` ส่ง `announcedAt` ที่เด้งแล้วต่อไปจริง
  (เช่นถ้า `DisplayScreen.tsx:26` เปลี่ยนเป็น `announcedAt: 0` คงที่ เทสต์ระดับหน้าจอตอนนี้ยังเขียวหมด)

สิ่งที่ต้องทำ: เพิ่มเทสต์ใน `src/screens/DisplayScreen.test.tsx` ว่า order ที่ serving อยู่แล้ว
(อยู่บนจอไม่หายไปไหน) พอ `announcedAt` เด้งจาก 100 → 200 แล้ว Display ต้อง chime + flash ซ้ำ
และถ้า announcedAt ไม่เปลี่ยน (snapshot เด้งเพราะ field อื่น เช่น items) ต้อง **ไม่** chime
— ใช้ helper `flashing()` ที่มีอยู่แล้วในไฟล์นั้น

**ก่อนติ๊กช่อง ให้ mutation-check เสมอ**: แก้ `DisplayScreen.tsx:26` ให้ส่ง `announcedAt: 0` คงที่
ชั่วคราว ถ้าเทสต์ใหม่ไม่แดง แปลว่าเทสต์ยังพิสูจน์การต่อสายไม่ได้ แล้วอย่าลืม revert

หมายเหตุ: งานนี้แตะแค่ `DisplayScreen.test.tsx` ไม่ชนกับไฟล์ที่ branch 1553 ค้างไว้

---

### ค้างอยู่ที่คน ไม่ใช่ agent (ทำคู่ขนานได้ ไม่บล็อกงานข้างบน)

merge branch `auto/Booth_Management_6_7/2026-08-13_1553` (ข้อ Undo) และ
`auto/Booth_Management_6_7/2026-08-15_0008` (แก้ข้อความ plan) เข้า main
— agent push เองไม่ได้ (ไม่มีสิทธิ์ push/gh) **อย่าทำข้อ Undo ซ้ำเด็ดขาด** ไม่ว่ารอบไหน
1553 ค้างการแก้ `queueActions.ts`, `queueActions.test.ts`, `QueuePanel.tsx`,
`QueuePanel.test.tsx`, `ordersRepo.*` ไว้ ถ้างานรอบถัดไปต้องแตะไฟล์เดียวกัน จะ conflict ตอน merge
— เลี่ยงได้ให้เลี่ยง

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
