# SUMMARY — รอบ 2026-08-15_0031

เกณฑ์ที่ปิดรอบนี้: **ประกาศซ้ำ** (`2026-08-04-queue-pro-upgrade-design.md`)
> ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

## What I did

- เพิ่มไฟล์ใหม่ `src/screens/DisplayScreen.reannounce.test.tsx` (4 เทสต์) ปิดช่องว่าง
  **การต่อสายระดับหน้าจอ** ของเกณฑ์ "ประกาศซ้ำ": order ที่ serving อยู่แล้ว พอ `announcedAt`
  เด้ง 100 → 200 ต้อง chime + flash ซ้ำ / เด้งของเลขหนึ่งไม่ลามไปเลขอื่นที่ serving อยู่ /
  snapshot ที่เปลี่ยนแค่ `items` ต้อง **ไม่** chime / flash ต้องดับเองใน 2500 ms
- **mutation-check** แล้วจริง: แก้ `DisplayScreen.tsx:26` เป็น `announcedAt: 0` คงที่ →
  เทสต์ใหม่แดง 3 จาก 4 ขณะที่เทสต์เดิมใน `DisplayScreen.test.tsx` **เขียวครบทั้ง 4 ตัว**
  (นี่คือหลักฐานว่าช่องว่างมีอยู่จริงและถูกปิดแล้ว) แล้ว revert — `git diff` ยืนยันว่าไฟล์ component
  ไม่มีการเปลี่ยนแปลงเหลืออยู่เลย
- ติ๊กช่อง **ประกาศซ้ำ** ใน `AUTOPILOT.md` พร้อมอ้างอิงเลขบรรทัดของหลักฐานทั้ง 4 ชั้น
- เขียน `AUTOPILOT.md` ใหม่โดยยึดฉบับของ branch `0020` เป็นฐาน (ฉบับที่อยู่บน main ยังเป็นของเก่า
  ที่สั่งให้ "ทำข้อ Undo ซ้ำ" ซึ่งเป็นคำสั่งที่ผิดและถูกห้ามไว้แล้ว) + เพิ่มกล่องเตือนบนหัวตาราง
  ว่าช่องที่ติ๊กแล้วหลักฐานกระจายอยู่บน branch ที่ยังไม่ merge + เขียนลำดับการ merge ที่แนะนำ
- ตั้ง `## Next task` ใหม่เป็นเกณฑ์ **เรียกเจาะจง** พร้อมสถานะที่สำรวจไว้แล้วและวิธี mutation-check

## Why

- **ทำไมต้องเป็นไฟล์ใหม่ ไม่ใช่ต่อท้าย `DisplayScreen.test.tsx`** — branch `0020` (ยังไม่ merge)
  ต่อท้ายไฟล์นั้นไว้แล้ว และเพิ่ม `data-testid="display-root"` ใน `DisplayScreen.tsx` ด้วย
  ถ้ารอบนี้แตะจุดเดียวกันอีก จะกลายเป็น branch ที่ 4 ที่ conflict กันเอง ทั้งที่งานไม่เกี่ยวกันเลย
  จึงอ่านสถานะ flash จาก `container` ที่ `render()` คืนมาแทนการเพิ่ม testid
  → รอบนี้ **ไม่แตะไฟล์ source สักไฟล์** เพิ่มไฟล์เทสต์ใหม่ไฟล์เดียวจบ merge สะอาด
- **ทำไมถึงเลือกเกณฑ์นี้** — prompt ของรอบนี้ส่ง `## Next task — do ONLY this` มาเป็น **หัวข้อว่าง**
  (ไม่มีเนื้อหาต่อท้าย) ส่วน `AUTOPILOT.md` ที่อยู่บน branch นี้จริงๆ เป็นฉบับของ main ซึ่งสั่งให้
  "ทำข้อ Undo ซ้ำ" — ซึ่งตัว prompt เองระบุชัดว่า **ห้ามทำซ้ำ** จึงย้อนไปดู `AUTOPILOT.md` ของ
  branch ล่าสุด (`0020`) ที่ระบุงานถัดไปไว้ชัดเจน คือ "ประกาศซ้ำ ฝั่ง Display" และทำข้อนั้น
  ไม่ได้คิดงานใหม่ขึ้นมาเอง (เกณฑ์ acceptance ที่ prompt ส่งมาก็ตรงกับฉบับ `0020` เป๊ะ
  ต่างกันแค่ส่วน Next task ที่หายไป)

## Verification

```
npm test      → Test Files 40 passed (40) · Tests 135 passed (135)
npm run build → ✓ built in 1.15s · PWA generateSW · precache 5 entries (846.18 KiB)
```

ก่อนเริ่มรอบ: 131 เทสต์ (39 ไฟล์) — เพิ่มขึ้น 4 ตัวพอดีตามที่เขียน ไม่มีตัวไหนถูกลบหรือ skip

mutation-check (`announcedAt: 0` คงที่ ที่ `DisplayScreen.tsx:26`):
```
FAIL DisplayScreen.reannounce.test.tsx > ...re-announcing one serving number...
FAIL DisplayScreen.reannounce.test.tsx > ...the re-announce flash stops on its own...
FAIL DisplayScreen.reannounce.test.tsx > ...already serving chimes and flashes again...
Tests  3 failed | 5 passed (8)   ← 4 เทสต์เดิมของ DisplayScreen.test.tsx เขียวหมด
```
(เทสต์ตัวที่ 4 ของไฟล์ใหม่เขียวตอน mutation ถูกต้องแล้ว เพราะมันยืนยัน "ต้องไม่ chime")

## What I did NOT do

- **ไม่ทำข้อ Undo ซ้ำ** ตามที่ `AUTOPILOT.md` ฉบับบน main สั่ง — คำสั่งนั้นล้าสมัยและถูกห้ามไว้
  งานนั้นเสร็จแล้วบน branch `2026-08-13_1553` รอ merge อย่างเดียว
- **ไม่แตะ `DisplayScreen.tsx` ค้างไว้** — แก้ชั่วคราวเพื่อ mutation-check แล้ว revert ครบ
- **ไม่ merge branch ไหนเลย** — agent ไม่มีสิทธิ์ push/gh ตามสัญญาของรอบ
- **ไม่ทำเกณฑ์ "เรียกเจาะจง" ต่อ** ทั้งที่สำรวจเจอว่ามันน่าจะเขียวอยู่แล้ว — กฎข้อ 1 คือทำงานเดียว
  ต่อรอบ จึงบันทึกสิ่งที่สำรวจเจอไว้ในหัวข้อ Next task ให้รอบหน้าทำต่อได้ทันทีแทน
- ไม่แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`, `.env*`, `.firebaserc`
  ไม่เพิ่ม dependency ไม่แตะ logic บัญชี/เมนู/comms

## Risk

1. **`AUTOPILOT.md` ของ branch นี้ ติ๊กช่อง "No-show" ไว้ แต่หลักฐานของช่องนั้นไม่ได้อยู่บน branch นี้**
   — มันอยู่บน `0020` เพราะยกฉบับของ `0020` มาเป็นฐาน ถ้าใคร merge branch นี้เข้า main เดี่ยวๆ
   จะได้ไฟล์ที่ติ๊ก No-show ไว้โดยที่ main ยังไม่มีเทสต์นั้น จึงใส่กล่องเตือนไว้บนหัวตารางแล้ว
   ว่าช่องไหนหลักฐานอยู่ branch ไหน — **แต่ทางที่ถูกคือ merge `0020` ก่อน branch นี้**
2. **branch ค้าง 4 อันแล้ว** (`0008`, `1553`, `0020`, `0031`) กองสูงขึ้นทุกรอบ ฝั่งโค้ดไม่ชนกันเลย
   สักคู่ แต่ทุกอันชนกันที่ `AUTOPILOT.md` + `SUMMARY.md` เพราะทุกรอบเขียนสองไฟล์นี้ทับ
   ลำดับ merge ที่แนะนำเขียนไว้ท้าย `AUTOPILOT.md` แล้ว — วิธีแก้ conflict คือเอาของ branch ใหม่กว่าเสมอ
3. เทสต์ใหม่อ่าน flash จาก `container.firstElementChild` = **ผูกกับโครงสร้าง DOM ของ
   `DisplayScreen`** (สมมติว่า root element เป็นตัวที่ถือคลาส `animate-pulse`) ถ้าอนาคตมีคนครอบ
   `<div>` ชั้นนอกเพิ่ม เทสต์จะแดงแบบงงๆ ทั้งที่ฟีเจอร์ไม่พัง — แลกมากับการไม่ต้องแตะไฟล์ component
   ซึ่งรอบนี้คุ้มกว่า (ถ้า `0020` merge เข้า main แล้ว รอบหลังๆ เปลี่ยนมาใช้
   `getByTestId('display-root')` ของ `0020` แทนได้เลย จะทนกว่า)
4. `npm run build` ยังเตือน chunk > 500 kB เหมือนเดิม — เป็นของเดิมบน main ไม่ใช่ของใหม่รอบนี้
