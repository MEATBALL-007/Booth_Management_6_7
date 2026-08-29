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
- [x] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
      — ✅ **ทำรอบ `_2026-08-29_0037`** โค้ด production ถูกต้องอยู่แล้ว **ไม่ได้แก้อะไรเลย** สิ่งที่ขาดคือเทสต์
      10 เทสต์ใน `src/callSpecific.audit.test.tsx` **แล้ว mutation check เอง 10 ตัว ทำนายก่อนรัน ตรง 10 จาก 10**
      บันทึก: `docs/autopilot/2026-08-29-call-specific-audit.md`
      ⚠️ **selector trap** — มีปุ่มขึ้นต้นด้วย "เรียก" อยู่ 3 ปุ่ม (เรียกคิวถัดไป / เรียก / เรียกซ้ำ)
      `{ name: /เรียก/ }` แบบ regex จับผิดปุ่ม ทำให้ "ไม่มีปุ่มเรียกบนการ์ด skipped" เขียวเพราะเจอ เรียกซ้ำ
      ต้องส่งชื่อเป็น **string ตรงตัว** เสมอ — B3 ปักหมุดกับดักนี้ไว้แล้ว **ห้ามเปลี่ยนเป็น regex**
      ⚠️ **เทสต์ที่มี killer ตัวเดียว ห้ามลบ**: A2 (M1), C2 (M9)
      ⚠️ M6 (บังคับให้ปุ่มเรียก `waiting[0]` เสมอ = ข้ามลำดับไม่ได้) ฆ่าได้แค่ **4 จาก 208 เทสต์ทั้งชุด**
      และ 2 ใน 4 นั้นมาจากไฟล์นี้ — ก่อนรอบนี้ทั้งระบบมีเทสต์กันการถดถอยข้อนี้อยู่แค่ 2 ตัว
- [x] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
      — ✅ **ทำรอบ `_2026-08-30_0004`** ข้อนี้ **มีบั๊กจริงและแก้โค้ด production จริง**
      (ต่างจาก 4 ข้อบน ที่โค้ดถูกอยู่แล้ว) `apply()` ใน `QueuePanel.tsx` เขียนซ้ำได้เพราะ
      guard ใน `queueActions` ตรวจ order จาก render closure ที่เปลี่ยนเฉพาะตอน snapshot มา
      → เป็น **snapshot-state guard ไม่ใช่ write-once guard** วัดแล้ว **แดงครบทั้ง 5 ปุ่ม**
      (เรียก · เรียกคิวถัดไป · เสร็จ · ข้าม · เรียกซ้ำ) — ยืนยันแล้ว ไม่ได้เดาตามแผน
      แก้ด้วย `Set` ใน `useRef` ที่ `QueuePanel.tsx` (ล้างเมื่อ snapshot มา) ไม่แตะ `queueActions.ts`
      14 เทสต์ใน `src/idempotency.audit.test.tsx` · **mutation 8 ตัว ทำนายก่อนรัน ตรง 8 จาก 8**
      บันทึก: `docs/autopilot/2026-08-30-idempotency-audit.md`
      ⚠️ **กันเฉพาะ patch ที่มี `status`** — `ประกาศซ้ำ` ไม่เปลี่ยนสถานะ การกดซ้ำคือตัวฟีเจอร์
      M3 พิสูจน์แล้วว่าถ้ากันมันด้วย เกณฑ์ "ประกาศซ้ำ" พังทันที (C1, C2 + reannounce B2 แดง)
      ⚠️ **ห้ามให้ `ย้อนกลับ` ผ่าน guard** — M8 พิสูจน์ว่าถ้ากัน undo เทสต์ Undo เดิมแดง 8 ตัว
      ⚠️ **เทสต์ที่มี killer ตัวเดียว ห้ามลบ**: A1, A2, B1, B2, B4, B5, C1, C2
      🚨 **"สองเครื่องพร้อมกัน" ยังไม่ถูกปิด — บันทึกไว้เป็นช่องว่าง ไม่ได้แกล้งพิสูจน์**
      guard เป็นของ panel ต่อ instance มองไม่เห็นการกดของอีกเครื่อง E1 ปักหมุดไว้ว่ายังได้ 2 writes
      ปิดจริงต้อง `runTransaction` ซึ่งแตะ repo layer + `firestore.rules` (out of scope)
      E1 **ไม่มี mutation ตัวไหนฆ่าได้เลย** เพราะมันปักช่องว่าง ไม่ได้ปักความถูกต้อง —
      ถ้าวันหนึ่ง E1 แดง แปลว่ามีคนปิด race ได้แล้ว ให้ไปอ่านบันทึก ไม่ใช่บั๊ก
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

ทำเกณฑ์ข้อ **"Display: จัดกึ่งกลางทุกจอ (responsive), 'เตรียมตัว' callout เด่น, skipped ไม่โชว์"**

### 🚨 อ่านก่อนเริ่ม: เช็คว่า branch ที่ยืนอยู่มีอะไรบ้าง (อย่าเชื่อข้อความนี้)

ข้อความ handoff เขียนตอนจบรอบก่อน แล้วบรรยาย branch *ของรอบนั้น* พอ runner ตัด branch ใหม่
จาก main ข้อความก็ผิดทันที **โดนมาแล้วสามรอบติด** (`_0014`, `_0037`, `_0004`): handoff บอกว่า
branch มีเกณฑ์ครบแล้ว ความจริงคือ branch เพิ่งถูกตัดจาก main เปล่าๆ และมี 0 ข้อ
รอบ `_0004` ก็โดนอีก — เสียเวลาไปกับการยกของก่อนเริ่มงานจริง **คาดไว้เลยว่าจะต้องยก**

เช็คด้วยสามคำสั่งนี้ **ก่อนทำอะไรทั้งสิ้น**:

```
git log --oneline -3        # ถ้าได้ 735de75 = ยังเป็น main เปล่าๆ ไม่มีอะไรถูกยกมา
ls src/*.audit.test.*       # ต้องเห็น 6 ไฟล์ ถ้า branch ครบ 5 เกณฑ์
npm test                    # 222 = ครบ 5 เกณฑ์ / 131 = main เปล่าๆ
```

ถ้ายังไม่ครบ ให้ยกมาจาก branch `auto/Booth_Management_6_7/2026-08-30_0004` — branch นั้น
ครบทั้ง 5 เกณฑ์แล้ว (222 เทสต์) ยกด้วย **`git checkout <sha> -- <ระบุ path ทีละไฟล์>`**
ไฟล์ที่ต้องยก: `src/{noShowRecall,reannounce,undoRoundTrip,callSpecific,idempotency}.audit.test.tsx`,
`src/undoDeleteField.audit.test.ts`, `src/{order/ordersRepo,queue/queueActions,queue/queueActions.test}.ts`,
`src/screens/QueuePanel.tsx`, และ `docs/autopilot/2026-08-2{4,8,9}-*.md` + `docs/autopilot/2026-08-30-*.md`

🚨 **ห้าม `git checkout <sha> -- src/` แบบกวาดทั้งโฟลเดอร์** — จะลบไฟล์ที่ commit นั้นไม่มีทิ้งเงียบๆ
แล้วเทสต์จะยัง "เขียว" ที่จำนวนน้อยลง ดูเหมือนไม่มีอะไรผิด
(`git merge` กับ `git cherry-pick` โดน sandbox ปฏิเสธ ใช้ไม่ได้ — checkout เป็น path ใช้ได้)

### ตัวงานจริง

เกณฑ์มี **3 ส่วน** ต้องแยกพิสูจน์ทีละส่วน อย่าเหมารวม:

1. **จัดกึ่งกลางทุกจอ (responsive)** — spec §4 บอก "จัด **กึ่งกลางจอทั้งแนวตั้ง-นอน**, responsive ทุกขนาด"
2. **"เตรียมตัว" callout เด่น** — waiting ตัวแรกต้องเป็น **การ์ดเหลือง** กึ่งกลาง พร้อมป้าย "เตรียมตัว"
   ส่วน waiting ที่เหลือเป็น **เม็ดเล็ก** — ต้องต่างกันจริง ไม่ใช่แค่มีข้อความ
3. **skipped ไม่โชว์บนจอลูกค้า** — ข้อนี้ `noShowRecall.audit.test.tsx` **อาจครอบไปแล้ว**
   ไปอ่านก่อน ถ้าครอบแล้วให้อ้างอิงแทนที่จะเขียนซ้ำ (แล้วบอกใน SUMMARY ว่าอ้างอิงตัวไหน)

🚨 **ข้อนี้เป็นเกณฑ์ layout — jsdom วัดพิกเซลไม่ได้** อย่าเขียนเทสต์ที่แกล้งทำเป็นวัดได้
ต้องพูดออกมาตรงๆ ในบันทึกว่า "ไม่มีพิกเซลไหนถูกวัด" สิ่งที่พิสูจน์ได้จริงคือ **คลาสบนสาย ancestor**
- อ่าน `docs/autopilot/` ที่มีอยู่ก่อน — มีบทเรียนเรื่อง jsdom layout เขียนไว้แล้ว
- **การเช็คคลาสที่ root อย่างเดียวไม่พิสูจน์อะไร** ต้องเดินสาย flex ancestor ทุกชั้น
  แล้ว encode กฎแกน `flex-col` (แนวตั้ง) กับ row ให้ถูก — `items-center` บน `flex-col`
  จัดกึ่งกลางแนวนอน แต่บน row จัดแนวตั้ง คนละความหมาย
- **`body.firstElementChild` คือ wrapper ของ Testing Library** ไม่มีคลาสเลย
  `not.toContain('...')` จะผ่านกับ `""` เสมอ → ใช้ `container` ที่ `render()` คืนมา
  และจับคู่ทุก assertion แบบ negative กับ **spine เชิงบวก** เสมอ

เขียนลงไฟล์ **ใหม่** `src/displayCentering.audit.test.tsx` (อย่าแก้ไฟล์เทสต์เดิม — branch อื่นถือไฟล์นั้นอยู่)

### กติกาที่รอบก่อนๆ เรียนมาแพงแล้ว

- **mutation check เอง อย่าเชื่อเทสต์ที่ยกมา** ทำนายชุดที่จะแดง *ก่อน* รัน แล้วเทียบ
  รอบ `_0004` ทำนาย 8 ตัว ตรง 8 — ทำได้ถ้าอ่านโค้ดจริงก่อนทำนาย
- ใช้เครื่องมือแก้ไฟล์แบบ **match-or-fail** (Edit tool) อย่าใช้ sed/regex — รอบ `_0044`
  มี mutation ที่ไม่ match เพราะไฟล์เป็น CRLF แล้วเกือบอ่านผลผิดว่า "เทสต์ไร้ค่า"
- **รัน mutation ครบชุดแล้วเขียวไม่ใช่จบ** ต้องเช็คว่า union ของ red set คลุมครบ *ทุก* เทสต์
  รอบ `_0004` เจอว่า E1 ไม่มี killer เลย — แต่ตรวจแล้วว่า **ตั้งใจ** (มันปักช่องว่าง ไม่ใช่ความถูกต้อง)
  ถ้าเจอเทสต์ไม่มี killer ต้องตอบให้ได้ว่าเป็นแบบไหน อย่าปล่อยผ่าน
- **mutation ที่ทำนายว่า "เขียว" แล้วเขียวจริง = เจอ dead code ไม่ใช่เทสต์อ่อน**
  ให้บันทึกไว้ตรงๆ อย่าไปเค้นเขียนเทสต์ปลอมให้มันแดง
- **`toEqual` มองไม่เห็น key ที่เป็น `undefined`** → ใช้ `toStrictEqual` บน `mock.calls` ทั้ง list เสมอ
- **commit ก่อน mutation check** — `git checkout -- src` ลบงานที่ยังไม่ commit ทิ้งด้วย
- เขียนบันทึกลง `docs/autopilot/` พร้อมหัวข้อ **"ขอบเขตของหลักฐาน"** ว่าอะไรที่ *ไม่* ได้พิสูจน์
  ดูรูปแบบที่ `docs/autopilot/2026-08-30-idempotency-audit.md`

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ Display glanceable)
