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
      และ `npm run build` ผ่าน (main = 131) งานนั้นสมบูรณ์และเขียว
      — **ห้ามทำซ้ำ** การทำซ้ำ = เปิด PR ที่แก้ไฟล์ชุดเดียวกันซ้อนกันสองอัน สิ่งที่ต้องทำคือ merge PR นั้น
      ติ๊กช่องนี้ตอน merge เข้า main แล้ว (branch 1553 ติ๊กไว้ให้แล้วใน commit ของมันเอง)
      — `docs/autopilot/2026-08-13-undo-audit-findings.md` ยังเป็นบันทึกการวิเคราะห์ที่ถูกต้องอยู่
      แต่หัวข้อ Risk ข้อ 1 ของมัน (เรื่อง commit ไม่ได้) ล้าสมัยแล้ว
- [ ] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
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

**งานของคน ไม่ใช่ของ agent: merge branch `auto/Booth_Management_6_7/2026-08-13_1553` เข้า main**

branch นั้นมีข้อ Undo ครบแล้วทั้งหมด (โค้ด 3 ไฟล์ + เทสต์ใหม่ 13 ตัว + ติ๊ก checkbox ให้แล้ว)
push ขึ้น origin แล้วตั้งแต่ 2026-08-13 และรอบ 2026-08-15 ตรวจซ้ำแล้วว่า **144 tests เขียว + build ผ่าน**
agent push เองไม่ได้ (ไม่มีสิทธิ์ push/gh) จึงต้องให้คนหรือ runner เป็นคน merge

**เมื่อ merge แล้ว** เกณฑ์ข้อถัดไปคือ **No-show**:

> ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)

ครึ่งแรกฝั่ง logic (`skip` / `recall` ใน `src/queue/queueActions.ts`) มีเทสต์ครอบอยู่แล้ว
ส่วนที่ยัง **ไม่เคยถูกตรวจ** คือฝั่ง Display ใน `src/screens/DisplayScreen.tsx`:
(ก) order สถานะ `skipped` ต้องไม่โผล่บนจอลูกค้า และ (ข) `recall` ต้องทำให้ Display ประกาศซ้ำ
(chime + flash) ให้เริ่มจากอ่าน `src/screens/DisplayScreen.test.tsx` ว่าคลุมอะไรไปแล้วบ้าง

**ถ้ารอบถัดไปยังเห็นบรรทัดนี้อยู่ และ 1553 ยังไม่ถูก merge** — อย่าทำข้อ Undo ซ้ำเด็ดขาด
ให้ข้ามไปทำ No-show ได้เลย โดยแตกจาก main ตามปกติ แต่พึงรู้ว่า 1553 แก้ `queueActions.ts`,
`queueActions.test.ts`, `QueuePanel.tsx`, `QueuePanel.test.tsx`, `ordersRepo.*` ค้างไว้อยู่
ถ้างาน No-show ต้องแตะไฟล์เดียวกัน จะ conflict ตอน merge — เลี่ยงได้ให้เลี่ยง

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
