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
      — ✅ **พิสูจน์แล้วบน branch `auto/Booth_Management_6_7/2026-08-28_0009` (commit `ca1179f`)
      — ⚠️ ยังไม่ได้อยู่บน branch นี้ และยังไม่ได้อยู่บน main** เจอบั๊กจริงและแก้แล้ว: `orderSnapshot` เก็บเฉพาะ
      field ที่มีค่า แต่ `updateDoc` เป็น merge → field ที่ action สร้างขึ้นเองรอดจาก undo เสมอ
      แก้ที่ `queueActions.ts` (snapshot ครบทุก field, `undefined` = ไม่เคยมี),
      `ordersRepo.ts` (`undefined` → `deleteField()`), `QueuePanel.tsx` (`Q.cancel`)
      พิสูจน์ด้วย 36 เทสต์ใน `src/undoRoundTrip.audit.test.tsx` + `src/undoDeleteField.audit.test.ts`
      บันทึกการวิเคราะห์: `docs/autopilot/2026-08-24-undo-round-trip-audit.md`
      (สเปกตั้งต้น: `docs/autopilot/2026-08-13-undo-audit-findings.md`)
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ **ผ่านแล้วบน branch นี้ (2026-08-28)** โค้ดถูกต้องอยู่แล้ว ไม่ต้องแก้ production เลย
      สิ่งที่ขาดคือเทสต์ ยกไฟล์ `src/noShowRecall.audit.test.tsx` (14 เทสต์) มาจาก `4fdcf2b`
      (branch `_2026-08-25_0002` ซึ่งแตกจาก `735de75` จุดเดียวกับ branch นี้ จึงยกมาได้สะอาด)
      **แล้ว mutation check เองครบ 8 ตัว ทำนายไว้ก่อนรัน ตรงทั้ง 8 ตัว** — เทสต์ทั้ง 14 ตัว
      มีอย่างน้อย 1 mutation ที่ฆ่ามันได้ ไม่มีตัวไหนเขียวฟรี
      บันทึกการวิเคราะห์ + ตาราง mutation + ขอบเขตของหลักฐาน:
      `docs/autopilot/2026-08-28-no-show-recall-audit.md`
      ⚠️ **ห้ามลบเทสต์ D1** — M3 พิสูจน์แล้วว่าถ้า `recall()` ไม่ใส่ `announcedAt`
      เทสต์ Display (D2–D4) เขียวหมด มีแต่ D1 ที่จับได้
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ **ผ่านแล้วบน branch นี้ (2026-08-28 รอบ `_0044`)** โค้ดถูกต้องอยู่แล้ว ไม่ต้องแก้ production เลย
      สิ่งที่ขาดคือเทสต์ ยกไฟล์ `src/reannounce.audit.test.tsx` (15 เทสต์) มาจาก `68eb1c4`
      (branch `_2026-08-25_0030` ซึ่งแตกจาก `735de75` จุดเดียวกับ branch นี้ จึงยกมาได้สะอาด)
      **แล้ว mutation check เอง 9 ตัว ทำนายไว้ก่อนรัน ตรงทั้ง 9 ตัว** — เทสต์ทั้ง 15 ตัว
      มีอย่างน้อย 1 mutation ที่ฆ่ามันได้ ไม่มีตัวไหนเขียวฟรี
      บันทึกการวิเคราะห์ + ตาราง mutation + ขอบเขตของหลักฐาน:
      `docs/autopilot/2026-08-28-reannounce-audit.md`
      ⚠️ **B3 เกือบเขียวฟรี** — M1–M8 ฆ่ามันไม่ได้เลย ต้องเพิ่ม M9 (ทำให้ปุ่ม 🔔 โผล่บนการ์ด waiting)
      มาเล่นงานมันโดยเฉพาะ บทเรียน: รัน mutation ครบชุดแล้วเขียวไม่ใช่จบ —
      ต้องเช็คว่า union ของ red set คลุมครบ *ทุก* เทสต์
      ⚠️ **M6 ตอนแรกไม่ match เลย** (ไฟล์เป็น CRLF แต่ pattern ลงท้าย `return null\n`)
      ถ้า harness ไม่ได้ป้องกันไว้ จะอ่านผลผิดว่า "A2 ไร้ค่า" ทั้งที่ความจริงตรงกันข้าม
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

**ยก Undo (`ca1179f`) มารวมบน branch นี้** ให้ครบ 3 ข้อ — อย่าเพิ่งไปเกณฑ์ข้อใหม่

ตอนนี้ branch นี้มี **No-show ✅ + ประกาศซ้ำ ✅** แล้ว (162 เทสต์) เหลือ Undo ข้อเดียว
ก็จะครบทั้ง 3 ข้อของ queue-pro บน branch เดียว ซึ่งเป็นครั้งแรกที่จะเกิดขึ้น

**ข้อนี้ยากกว่า 2 รอบที่แล้วจริง — เพราะแตะ production code** (2 รอบก่อนเป็นเทสต์ล้วน)
`git show --stat ca1179f` (เช็คแล้วในรอบ `_0044`) แตะ 6 ไฟล์:
`src/order/ordersRepo.ts`, `src/queue/queueActions.ts`, `src/screens/QueuePanel.tsx`,
`src/queue/queueActions.test.ts` (แก้), และเพิ่ม `src/undoRoundTrip.audit.test.tsx`
+ `src/undoDeleteField.audit.test.ts`

1. 🚨 **ห้ามสั่ง `git checkout ca1179f -- src/` แบบกวาดทั้งโฟลเดอร์เด็ดขาด**
   `ca1179f` แตกจาก `735de75` ซึ่ง **ไม่มี** ไฟล์ audit ทั้งสองของ branch นี้
   การกวาดทั้งโฟลเดอร์จะ **ลบ `src/noShowRecall.audit.test.tsx` และ
   `src/reannounce.audit.test.tsx` ทิ้งเงียบๆ** (งาน 2 รอบเต็ม) แล้วเทสต์จะยัง "เขียว"
   ที่จำนวนน้อยลง ดูเหมือนไม่มีอะไรผิด
2. วิธีที่ควรใช้คือ **`git cherry-pick ca1179f`** — ไม่ใช่ checkout เป็น path
   เพราะข้อนี้ต้องการ production code ด้วย ไม่ใช่แค่ไฟล์เทสต์
   branch นี้ยังไม่ได้แก้ `src/` เลยนอกจาก *เพิ่ม* ไฟล์เทสต์ 2 ไฟล์ ดังนั้นน่าจะ
   apply สะอาด ถ้าติด conflict ให้แก้ทีละไฟล์ **อย่า `checkout --theirs` ทั้งโฟลเดอร์**
3. หลัง cherry-pick ให้เช็คว่าไฟล์ audit ทั้ง 2 ยังอยู่ และ `npm test` เขียว
   คาดว่าจะได้ **162 + (undo 36 ตัว) = ~198** ถ้าได้น้อยกว่า 162 แปลว่ามีไฟล์หาย
   แล้ว **commit ทันที**
4. ⚠️ **Undo แก้ `queueActions.ts` + `QueuePanel.tsx` ซึ่งเป็นไฟล์เดียวกับที่
   เทสต์ประกาศซ้ำ (B1/B2/B4 ยืนยัน `updateOrderStatus.mock.calls` แบบ strict) จับอยู่**
   ถ้า 2 ไฟล์นั้นแดงหลัง cherry-pick **อย่าลบหรือผ่อนเทสต์** ให้อ่านว่า Undo
   เปลี่ยน call list ไปยังไง แล้วตัดสินว่าเป็นบั๊กจริงหรือเทสต์ต้องอัปเดตให้ตรงพฤติกรรมใหม่
5. **อย่าเชื่อของที่ยกมาเฉยๆ — ต้อง mutation check เอง** ทำนายชุดที่จะแดงก่อนรัน
   mutation ที่ต้องลองแน่ๆ: ทำให้ `orderSnapshot` กลับไปเก็บเฉพาะ field ที่มีค่า
   (บั๊กเดิม), และเอา `deleteField()` ออกจาก `ordersRepo` ให้ส่ง `undefined` ตรงๆ
   🚨 **บทเรียนจากรอบ `_0044`: ต้องเช็คว่า mutation *match จริง*** — M6 รอบที่แล้ว
   ไม่ match เพราะไฟล์เป็น CRLF แต่ pattern ลงท้าย `return null\n` ถ้า harness
   ไม่ฟ้อง จะอ่านผลผิดว่าเทสต์ไร้ค่า และต้อง **anchor** pattern ด้วย เพราะบรรทัด
   `if (order.status !== 'serving') return null` มีซ้ำใน `markDone`/`skip`
   และเช็คว่า union ของ red set คลุมครบทุกเทสต์ (รอบที่แล้ว B3 เกือบหลุด)
6. เขียนบันทึกลง `docs/autopilot/` บอก **ขอบเขตของหลักฐาน** ด้วย — ดูรูปแบบที่
   `docs/autopilot/2026-08-28-reannounce-audit.md`
   (สเปกตั้งต้นของ Undo: `docs/autopilot/2026-08-13-undo-audit-findings.md`
   และบันทึกของรอบที่ทำ: `docs/autopilot/2026-08-24-undo-round-trip-audit.md` บน `_0009`)

**หมายเหตุสำคัญเรื่องสถานะโครงการ:** branch `auto/*` แต่ละอันแตกจาก main แล้วไม่เคย merge กลับ
main จึงยังไม่มีทั้ง Undo, No-show, ประกาศซ้ำ ถึงแม้ทั้งสามข้อจะเคยถูกพิสูจน์บน branch ไปแล้ว
สถานะบน branch นี้: **No-show ✅** และ **ประกาศซ้ำ ✅** (ยกมาแล้วทั้งคู่ + mutation check เองแล้ว),
**Undo ❌ ยังไม่มี** (อยู่บน `_0009`, commit `ca1179f`)
ถ้ารอบหน้ายก Undo สำเร็จ branch นี้จะเป็น branch แรกที่ครบ 3 ข้อ — **ควรค่าแก่การ merge เข้า main
มากกว่าการไปเปิดเกณฑ์ข้อใหม่** เพราะทุกวันนี้ main ยังไม่ได้อะไรเลยจากงานหลายสิบรอบ

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ยก Undo `ca1179f` มารวม)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
