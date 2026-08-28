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
      — ✅ **อยู่บน branch นี้แล้ว** ยก `ca1179f` (จาก `_2026-08-28_0009`) มาแบบระบุ path ทีละไฟล์
      บั๊กจริงที่เจอและแก้แล้ว: `orderSnapshot` เก็บเฉพาะ field ที่มีค่า แต่ `updateDoc` เป็น merge
      → field ที่ action สร้างขึ้นเองรอดจาก undo เสมอ แก้ที่ `queueActions.ts` (snapshot ครบทุก field,
      `undefined` = ไม่เคยมี), `ordersRepo.ts` (`undefined` → `deleteField()`), `QueuePanel.tsx` (`Q.cancel`)
      พิสูจน์ด้วย 36 เทสต์ใน `src/undoRoundTrip.audit.test.tsx` + `src/undoDeleteField.audit.test.ts`
      **แล้ว mutation check เอง 11 ตัว ทำนายก่อนรัน ตรง 10 จาก 11**
      บันทึก: `docs/autopilot/2026-08-29-undo-carry-and-mutation-check.md`
      (ที่มา: `docs/autopilot/2026-08-13-undo-audit-findings.md`, `2026-08-24-undo-round-trip-audit.md`)
      ⚠️ **A2 คือ spine ของ A1** — M7 พิสูจน์แล้วว่าถ้าทุก action คืน `{}` เทสต์ A1 ทั้ง 10 ตัวเขียวหมด
      (undo ของ action ที่ไม่ทำอะไร ย่อมคืนค่าได้สมบูรณ์แบบ) มีแต่ A2 ที่จับได้ **ห้ามลบ A2**
      ⚠️ **เทสต์ที่มี killer ตัวเดียว ห้ามลบ**: A2, A5, B8, D2, D3, D5
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ **อยู่บน branch นี้แล้ว** โค้ด production ถูกต้องอยู่แล้ว สิ่งที่ขาดคือเทสต์
      ยก `src/noShowRecall.audit.test.tsx` (14 เทสต์) มาจาก `5c17e92` (`_2026-08-28_0044`)
      บันทึก + ตาราง mutation 8 ตัว: `docs/autopilot/2026-08-28-no-show-recall-audit.md`
      ⚠️ **ห้ามลบเทสต์ D1** — M3 พิสูจน์แล้วว่าถ้า `recall()` ไม่ใส่ `announcedAt`
      เทสต์ Display (D2–D4) เขียวหมด มีแต่ D1 ที่จับได้
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ **อยู่บน branch นี้แล้ว** โค้ด production ถูกต้องอยู่แล้ว สิ่งที่ขาดคือเทสต์
      ยก `src/reannounce.audit.test.tsx` (15 เทสต์) มาจาก `5c17e92` (`_2026-08-28_0044`)
      บันทึก + ตาราง mutation 9 ตัว: `docs/autopilot/2026-08-28-reannounce-audit.md`
      ⚠️ **B3 เกือบเขียวฟรี** — M1–M8 ฆ่ามันไม่ได้เลย ต้องเพิ่ม M9 มาเล่นงานโดยเฉพาะ
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

ทำเกณฑ์ข้อ **"เรียกเจาะจง"** — กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)

### 🚨 อ่านก่อนเริ่ม: เช็คว่า branch ที่ยืนอยู่มีอะไรบ้าง (อย่าเชื่อข้อความนี้)

ข้อความ handoff เขียนตอนจบรอบก่อน แล้วบรรยาย branch *ของรอบนั้น* พอ runner ตัด branch ใหม่
จาก main ข้อความก็ผิดทันที **รอบ 2026-08-29_0014 โดนเข้าเต็มๆ**: handoff บอกว่า branch มี
No-show + ประกาศซ้ำ อยู่แล้ว (162 เทสต์) ความจริงคือ branch เพิ่งถูกตัดจาก main และมี 0 จาก 3

เช็คด้วยสองคำสั่งนี้ **ก่อนทำอะไรทั้งสิ้น**:

```
git log --oneline -3        # ถ้าได้ 735de75 = ยังเป็น main เปล่าๆ ไม่มีอะไรถูกยกมา
ls src/*.audit.test.*       # ต้องเห็น 4 ไฟล์ ถ้า branch ครบ 3 เกณฑ์
npm test                    # 198 = ครบ 3 เกณฑ์ / 131 = main เปล่าๆ
```

ถ้ายังไม่ครบ ให้ยกมาจาก branch `auto/Booth_Management_6_7/2026-08-29_0014` ก่อน — branch นั้น
ครบทั้ง 3 เกณฑ์แล้ว (198 เทสต์) ยกด้วย **`git checkout <sha> -- <ระบุ path ทีละไฟล์>`**
ไฟล์ที่ต้องยก: `src/{noShowRecall,reannounce,undoRoundTrip}.audit.test.tsx`,
`src/undoDeleteField.audit.test.ts`, `src/{order/ordersRepo,queue/queueActions,queue/queueActions.test}.ts`,
`src/screens/QueuePanel.tsx`, และ `docs/autopilot/2026-08-2{4,8,9}-*.md`

🚨 **ห้าม `git checkout <sha> -- src/` แบบกวาดทั้งโฟลเดอร์** — จะลบไฟล์ที่ commit นั้นไม่มีทิ้งเงียบๆ
แล้วเทสต์จะยัง "เขียว" ที่จำนวนน้อยลง ดูเหมือนไม่มีอะไรผิด
(`git merge` กับ `git cherry-pick` โดน sandbox ปฏิเสธ ใช้ไม่ได้ — checkout เป็น path ใช้ได้)

### ตัวงานจริง

`callSpecific` มีอยู่แล้วใน `src/queue/queueActions.ts:11` และปุ่ม "เรียก" อยู่บนการ์ด waiting
ที่ `src/screens/QueuePanel.tsx:88` — **น่าจะไม่ต้องแก้ production code เลย เหมือนข้อ No-show
กับ ประกาศซ้ำ** สิ่งที่ขาดคือเทสต์ที่พิสูจน์เกณฑ์ข้อนี้โดยตรง

มีหลักฐานบางส่วนอยู่แล้ว (อย่าเขียนซ้ำ ให้ต่อยอด): `undoRoundTrip.audit.test.tsx` เคส A1/A2
`callSpecific ...` 2 เคส และ B2 กดปุ่ม "เรียก" บนเลขที่ **ไม่ใช่** คิวแรก แล้ว assert ว่าเขียนที่ `o2`
— นั่นคือ "ข้ามลำดับได้" ครึ่งหนึ่งแล้ว

สิ่งที่ยังไม่มีใครพิสูจน์ และเป็นแก่นของข้อนี้:
1. เรียกเลขที่อยู่ **ท้ายแถว** ได้ ทั้งที่มี waiting คั่นหลายใบ (ไม่ใช่แค่ใบที่ 2)
2. เรียกเจาะจงแล้ว **คิวอื่นไม่ถูกแตะ** — assert `updateOrderStatus.mock.calls` ทั้ง list ด้วย
   `toStrictEqual` ว่ามีการเขียนครั้งเดียว
3. ปุ่ม "เรียก" **ไม่โผล่บนการ์ด serving / skipped** (โผล่เฉพาะ waiting)
4. `callSpecific` บน order ที่ไม่ใช่ `waiting` คืน `null` → กดแล้วไม่เขียนอะไรเลย
5. Display: เลขที่ถูกเรียกเจาะจงขึ้นเป็น "กำลังเรียก" และประกาศ (`announcedAt` ถูกตั้ง)

เขียนลงไฟล์ **ใหม่** `src/callSpecific.audit.test.tsx` (อย่าแก้ไฟล์เทสต์เดิม — branch อื่นถือไฟล์นั้นอยู่)

### กติกาที่รอบก่อนๆ เรียนมาแพงแล้ว

- **mutation check เอง อย่าเชื่อเทสต์ที่ยกมา** ทำนายชุดที่จะแดง *ก่อน* รัน แล้วเทียบ
- ใช้เครื่องมือแก้ไฟล์แบบ **match-or-fail** (Edit tool) อย่าใช้ sed/regex — รอบ `_0044`
  มี mutation ที่ไม่ match เพราะไฟล์เป็น CRLF แล้วเกือบอ่านผลผิดว่า "เทสต์ไร้ค่า"
- **รัน mutation ครบชุดแล้วเขียวไม่ใช่จบ** ต้องเช็คว่า union ของ red set คลุมครบ *ทุก* เทสต์
  รอบนี้เจอช่องโหว่แบบนี้อีก (A1 เคส 6 กับ 8 ไม่มี killer จนต้องเพิ่ม M10/M11)
- **commit ก่อน mutation check** — `git checkout -- src` ลบงานที่ยังไม่ commit ทิ้งด้วย
- เขียนบันทึกลง `docs/autopilot/` พร้อมหัวข้อ **"ขอบเขตของหลักฐาน"** ว่าอะไรที่ *ไม่* ได้พิสูจน์
  ดูรูปแบบที่ `docs/autopilot/2026-08-29-undo-carry-and-mutation-check.md`

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ Idempotency)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
