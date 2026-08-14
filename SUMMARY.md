# SUMMARY — รอบ 2026-08-15_0020

## What I did

- **ข้าม Undo ตามที่ plan สั่ง** — ตรวจแล้วว่า branch `auto/Booth_Management_6_7/2026-08-13_1553`
  ยังไม่ถูก merge เข้า main (`git log main..1553` = `5ce7f61`, `cc85ddd`) งาน merge เป็นของคน/runner
  ไม่ใช่ของ agent จึงข้ามไปทำเกณฑ์ถัดไปคือ **No-show** ตามที่ plan เขียนไว้ว่าให้ทำแบบนี้พอดี
- **เพิ่มเทสต์ 4 ตัวใน `src/screens/DisplayScreen.test.tsx`** ปิดช่องว่างฝั่ง Display ของเกณฑ์ No-show:
  order สถานะ `skipped` ต้องหายจากจอลูกค้าทั้ง 3 โซน (serving / next-up / upnext) และไม่โผล่ที่อื่นบนจอ;
  skipped ที่เก่ากว่า waiting ต้องไม่แย่ง spotlight "เตรียมตัว"; recall ต้องพาเลขกลับขึ้นจอพร้อม
  chime 1 ครั้ง + flash; และ flash ต้องดับเองใน 2500ms
- **เพิ่ม `data-testid="display-root"` บน root div ของ `DisplayScreen.tsx`** (แก้ source แค่บรรทัดเดียว
  ไม่ใช่ logic) เพื่ออ่านสถานะ flash ได้โดยไม่ต้องไปจับ Tailwind class ตามตำแหน่ง
- **ติ๊กเกณฑ์ No-show ใน `AUTOPILOT.md`** พร้อมอ้างอิงว่าแต่ละส่วนใน 4 ส่วนของเกณฑ์
  ถูกพิสูจน์ที่ไฟล์ไหนบรรทัดไหน
- **ซ่อม plan ที่ค้างเก่าบน branch นี้** — `AUTOPILOT.md` บน disk ยังเป็นเวอร์ชันก่อนแก้ ที่บอกว่า
  "ให้ทำ Undo ซ้ำ เพราะโค้ดถูกลบทิ้ง" ซึ่งไม่จริง (ข้อความที่แก้แล้วอยู่แต่บน branch `0008`
  ที่ยังไม่ merge) จึง port ข้อความที่ถูกต้องมาใส่ ไม่งั้นรอบหน้าที่อ่านไฟล์บน disk จะทำ Undo ซ้ำ

## Why

- **ทำไมข้าม Undo:** plan เขียนไว้ตรงๆ ว่า "ถ้ารอบถัดไปยังเห็นบรรทัดนี้อยู่ และ 1553 ยังไม่ถูก merge
  — อย่าทำข้อ Undo ซ้ำเด็ดขาด ให้ข้ามไปทำ No-show ได้เลย" การทำซ้ำ = PR สองอันแก้ไฟล์ชุดเดียวกัน
- **ทำไมแตะแค่ `DisplayScreen.*`:** branch 1553 ค้างการแก้ `queueActions.ts`, `QueuePanel.tsx`,
  `ordersRepo.*` ไว้ การเลี่ยงไฟล์เหล่านั้นทำให้ merge ทีหลังไม่ conflict — รอบนี้ไม่แตะเลยสักไฟล์
- **ทำไมใส่ `data-testid` แทนการ match class:** ถ้าเทสต์ไปจับ `bg-phantom-orange/30` ตรงๆ
  การปรับสีตอนทำเกณฑ์ UI overhaul (ที่ยังค้างอยู่) จะทำให้เทสต์แดงโดยที่ behaviour ไม่ได้พัง
- **ทำไมต้อง mutation-check:** เทสต์ที่ "เขียวตั้งแต่เขียนเสร็จ" อาจไม่ได้พิสูจน์อะไรเลย
  เป้าหมายของ plan คือ "ถูกพิสูจน์ด้วยเทสต์ที่รันได้จริง" ไม่ใช่ "มีเทสต์ชื่อตรงกับเกณฑ์"

## Verification

- Verify command เต็ม (`npm test && npm run build`) รันเองแล้ว **ผ่านทั้งคู่**
  - `npm test` → `Test Files 39 passed (39)` / `Tests 135 passed (135)` (baseline ก่อนแก้คือ 131)
  - `npm run build` → `✓ built in 1.11s` + PWA `generateSW` สร้าง `dist/sw.js` ครบ
    (มี warning chunk > 500 kB แต่มีมาก่อนหน้านี้แล้ว ไม่ใช่ของรอบนี้)
- **Mutation-check ว่าเทสต์ใหม่ไม่ใช่เทสต์หลอก** (ทุกอันย้อนกลับหมดแล้ว — `git diff src/` สะอาด):
  - ทำให้ `servingOrders` รับ `skipped` ด้วย → เทสต์ "a skipped order vanishes…" **แดง** (1 failed)
  - กลับสาขา `was === undefined ||` เป็น `was !== undefined &&` ใน `newlyAnnounced`
    → เทสต์ recall ทั้งชุด **แดง** (3 failed)
- **ตรวจข้ออ้างใน plan ก่อนเขียนลงไป:** ตอนแรกเขียนว่า "สาขา `s.announcedAt > was` ไม่มีเทสต์"
  แล้วไปเจอว่า `src/display/queueView.test.ts:35` ครอบไว้แล้ว จึงแก้ข้อความให้ตรงความจริง
  (ช่องว่างจริงคือ *การต่อสายระดับหน้าจอ* ไม่ใช่ตัวฟังก์ชัน) แล้วพิสูจน์ข้อความใหม่ด้วยการ
  hardcode `announcedAt: 0` ที่ `DisplayScreen.tsx:26` → เทสต์ระดับหน้าจอ **ผ่านหมด 8 ตัว**
  ยืนยันว่าช่องว่างนั้นมีจริง (revert แล้ว)

## What I did NOT do

- **ไม่ merge branch 1553 และ 0008** — agent ไม่มีสิทธิ์ push/gh งานนี้ยังค้างอยู่ที่คน
  บันทึกไว้ในหัวข้อแยกท้าย `## Next task` แล้วว่าเป็นงานคน ทำคู่ขนานได้ ไม่บล็อกงาน agent รอบหน้า
- **ไม่ทำข้อ Undo ซ้ำ** ตามคำสั่งใน plan
- **ไม่แตะเกณฑ์ "ประกาศซ้ำ"** ทั้งที่อยู่ไฟล์เดียวกันและเพิ่มได้ในไม่กี่บรรทัด — กฎ "หนึ่งงานต่อรอบ"
  ตั้งไว้แล้ว จึงเขียนเป็น Next task พร้อมระบุช่องว่างที่ตรวจเจอและวิธี mutation-check ให้รอบหน้าแทน
- **ไม่แตะ `queueActions.ts` / `QueuePanel.*` / `ordersRepo.*` / `firestore.*` / `docs/superpowers/specs/`**
  และไม่เพิ่ม dependency ใหม่

## Risk

1. **การติ๊กข้อ No-show อาศัยหลักฐานทางอ้อม 1 จุด** — ส่วน "ขึ้นโซนพักไว้" ไม่มีเทสต์ที่ assert
   หัวข้อโซน "พักไว้ · Parked" ตรงๆ มีแต่ `QueuePanel.test.tsx:93-94` ที่กดปุ่ม "เรียกซ้ำ"
   ซึ่ง render อยู่ในโซนนั้นที่เดียว (`QueuePanel.tsx:103`) ถ้าโซนไม่ขึ้น `getByRole` จะ throw
   → ถือว่าพิสูจน์ได้ แต่ **อ้อม** ถ้า reviewer ต้องการหลักฐานตรงๆ ควรเพิ่ม assert ข้อความ "พักไว้"
   หนึ่งบรรทัด (ไฟล์นั้น branch 1553 แก้ค้างอยู่ รอบนี้จึงตั้งใจไม่แตะ)
2. **เทสต์ flash ผูกกับชื่อ class `animate-pulse`** ผ่าน helper `flashing()` ถ้าเกณฑ์ UI overhaul
   รอบหน้าเปลี่ยนวิธีทำ flash เป็นอย่างอื่น (เช่น CSS animation ชื่อใหม่) เทสต์จะแดงทั้งที่
   behaviour ไม่ได้พัง — จุดแก้อยู่ที่เดียวคือ helper `flashing()` ใน `DisplayScreen.test.tsx`
3. **เทสต์ recall จำลอง patch ของ `recall()` ด้วยมือ** (emit order ที่ `status: 'serving'` +
   `announcedAt: 200`) ไม่ได้เรียก `recall()` จริง ถ้าวันหนึ่ง `recall()` เลิกเซ็ต `announcedAt`
   เทสต์ Display จะยังเขียว — แต่ `queueActions.test.ts:37` จะแดงแทน จึงยังมีตาข่ายรับอยู่
4. **`AUTOPILOT.md` บน branch นี้กับบน branch `0008` ตอนนี้ต่างกัน** ทั้งคู่แก้หัวข้อ Undo เหมือนกัน
   (port ข้อความชุดเดียวกันมา) แต่ถ้า merge ทั้งสอง branch จะ **conflict ที่ `AUTOPILOT.md`**
   เกือบแน่นอน วิธีแก้ที่ถูกคือ merge branch นี้แล้วทิ้งฝั่ง 0008 ไป (เนื้อหาเหมือนกัน + ของรอบนี้ใหม่กว่า)
   ส่วน 1553 แก้ `AUTOPILOT.md` คนละจุด (ติ๊กช่อง Undo) อาจ conflict เบาๆ ได้เหมือนกัน
