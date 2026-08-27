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
      — ✅ **ผ่านแล้วบน branch นี้ (2026-08-28)** เจอบั๊กจริงและแก้แล้ว: `orderSnapshot` เก็บเฉพาะ
      field ที่มีค่า แต่ `updateDoc` เป็น merge → field ที่ action สร้างขึ้นเองรอดจาก undo เสมอ
      แก้ที่ `queueActions.ts` (snapshot ครบทุก field, `undefined` = ไม่เคยมี),
      `ordersRepo.ts` (`undefined` → `deleteField()`), `QueuePanel.tsx` (`Q.cancel`)
      พิสูจน์ด้วย 36 เทสต์ใน `src/undoRoundTrip.audit.test.tsx` + `src/undoDeleteField.audit.test.ts`
      บันทึกการวิเคราะห์: `docs/autopilot/2026-08-24-undo-round-trip-audit.md`
      (สเปกตั้งต้น: `docs/autopilot/2026-08-13-undo-audit-findings.md`)
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

ทำข้อ **No-show** — ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้);
เรียกซ้ำ → serving + Display ประกาศ (chime+flash)

**อ่านก่อนเริ่ม — งานนี้เคยทำเสร็จแล้วบน branch อื่นที่ไม่เคย merge เข้า main**
commit `4fdcf2b test(queue): prove a skipped order leaves the customer screen for the parked zone,
and comes back announced` อยู่บน `auto/Booth_Management_6_7/2026-08-25_0002`
วิธีที่เร็วและเสี่ยงน้อยที่สุด (รอบ 2026-08-28 ใช้วิธีนี้กับข้อ Undo แล้วได้ผล):

1. `git show --stat 4fdcf2b` ดูว่าแตะไฟล์ไหนบ้าง
2. `git checkout 4fdcf2b -- <เฉพาะ path ใน src/ และ docs/autopilot/>` — **อย่าเอา AUTOPILOT.md มาด้วย**
   เพราะ ledger ของ branch นั้นเดินไปคนละทางกับไฟล์นี้
3. `npm test` ให้เขียว แล้ว **commit ทันที**
4. **อย่าเชื่อของที่ยกมาเฉยๆ — ต้อง mutation check เอง**: ทำนายชุดเทสต์ที่จะแดงก่อน
   แล้วพังโค้ด production ที่มันอ้างว่าคุ้มครอง ดูว่าแดงตรงตามที่ทำนายจริงไหม
   (ถ้าไม่แดง แปลว่าเทสต์นั้นไม่ได้พิสูจน์อะไร ให้เขียนใหม่)

**หมายเหตุสำคัญเรื่องสถานะโครงการ:** branch `auto/*` แต่ละอันแตกจาก main แล้วไม่เคย merge กลับ
main จึงยังไม่มีทั้ง Undo, No-show, ประกาศซ้ำ ถึงแม้ทั้งสามข้อจะเคยถูกพิสูจน์บน branch ไปแล้ว
ข้อที่เหลือและ branch ที่ทำไว้แล้ว: **ประกาศซ้ำ** → `68eb1c4` (branch `_2026-08-25_0030`)
รอบถัดๆ ไปควรยก 2 ข้อนี้มารวมบน branch เดียวกันให้ครบก่อน แล้วค่อยไปข้อใหม่

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ ประกาศซ้ำ)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
