# SUMMARY — รอบ 2026-08-17_0039

งานรอบนี้: ตรวจเกณฑ์ **"Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)"**
ของ `docs/superpowers/specs/2026-08-03-ui-overhaul-design.md` — เป็นข้อที่พิสูจน์ด้วย **git history**
ไม่ใช่ด้วยเทสต์ (plan สั่งไว้ชัดว่าห้ามเขียนเทสต์ประเภท "ไฟล์นี้ต้องไม่เปลี่ยน")

## What I did

- **sync ตัวแผนก่อน** — `AUTOPILOT.md` ในไฟล์ working copy เป็นของ `main` ซึ่งตามหลัง branch ที่ยัง
  ไม่ merge อยู่ 11 อัน (Next task ของมันยังเป็นข้อ **Undo** ที่ทำเสร็จตั้งแต่ 13 ส.ค.) → `git checkout`
  ไฟล์นี้มาจาก `auto/Booth_Management_6_7/2026-08-17_0023` ซึ่งเป็นแผลล่าสุด แล้ว commit แยกไว้ (`57e2803`)
- **หาฐานเทียบและจดไว้** — merge ของ UI overhaul คือ `4c8a5d6`, parent สายหลัก = **`3304e66`**
  (`docs: UI overhaul implementation plan`), สาย feature = `370349f..9d605e7` (10 commit)
  ช่วงที่ตรวจ `3304e66..4c8a5d6` = **24 ไฟล์, +617/−315** และตรวจซ้ำสะสมถึง main ด้วย `3304e66..main`
- **ไล่อ่านครบทั้ง 24 ไฟล์** ไม่ได้ดูแค่ `--stat` — ตรวจถึงระดับ **hunk header** (`git diff -U0`) เพื่อดูว่า
  hunk ตกอยู่เหนือหรือใต้ `return (` ของแต่ละ component แล้วอ่าน diff เต็มของทุกไฟล์ที่เป็น component
- **ติ๊กช่องนั้นใน `AUTOPILOT.md`** พร้อมหลักฐานเต็ม (เลข commit, รายชื่อไฟล์, 3 จุดที่พฤติกรรมเปลี่ยน,
  และไฟล์ 1 ไฟล์ในช่วงที่ไม่ใช่ presentation) + เขียน `## Next task` ข้อถัดไปให้ลงมือได้ทันที
- **ไม่ได้แก้ไฟล์โค้ดเลยแม้แต่ไบต์เดียว และไม่ได้เพิ่มไฟล์เทสต์** รอบนี้แตะแค่ `AUTOPILOT.md` + `SUMMARY.md`

## Why

- **ทำไมถึงติ๊กได้:** ไฟล์ที่เกณฑ์ห้ามเปลี่ยนทั้งหมด **ไม่เปลี่ยนสักไฟล์** ทั้งในช่วง overhaul และสะสมถึง main —
  `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `src/lib/firebase.ts`,
  repo ทั้ง 3 ตัว (`ordersRepo`/`commsRepo`/`expensesRepo`), และ logic ล้วน (`buildOrder`, `cart`,
  `options`, `promptpay`, `queueNumber`, `catalog`, `commsLogic`, `metrics`)
  ส่วน 24 ไฟล์ที่เปลี่ยนตกอยู่ใน 3 หมวดที่เกณฑ์อนุญาต (Tailwind/token · `src/ui` ของใหม่ · presentation)
- **ทำไมต้อง sanity-check pathspec:** "diff ว่าง" ไม่มีค่าเลยถ้า pathspec จับไฟล์ไม่ได้ตั้งแต่แรก
  ตรวจแล้วเจอของจริง: `src/firebase*` ที่ plan เขียนไว้ **ไม่ match อะไรเลย** เพราะไฟล์อยู่ที่
  `src/lib/firebase.ts` → เขียน path เต็มแล้วรันใหม่ และใช้ `src/domain/types.ts` (ไฟล์ที่รู้ว่าเปลี่ยนจริง
  ในช่วง base..main) เป็นตัวควบคุมยืนยันว่าคำสั่งจับไฟล์เป็น
- **ทำไมไม่เขียนเทสต์:** เทสต์ที่ assert ว่า "ไฟล์ X ต้องไม่เปลี่ยน" จะกลายเป็นตัวขวางทุกการแก้ในอนาคต
  (plan ห้ามไว้ตรงๆ) หลักฐานของข้อนี้คือประวัติ git ซึ่งตรวจซ้ำได้เองจากเลข commit ที่จดไว้

## Verification

รันเองครบตาม Verify command (`npm test && npm run build`):

```
Test Files  39 passed (39)
     Tests  131 passed (131)
  Duration  22.42s

vite build ✓ built in 1.14s
PWA v1.3.0  mode generateSW  precache 5 entries (845.91 KiB)
files generated: dist/sw.js, dist/workbox-9c191d2f.js
(warning เดียว: chunk > 500 kB — เตือน ไม่ใช่ error)
```

**131 / 39 ไฟล์ = เท่ากับ main เป๊ะ** เพราะรอบนี้ไม่ได้เพิ่มเทสต์และไม่ได้แตะโค้ด (ถ้าตัวเลขขยับ แปลว่าผิด)

คำสั่งตรวจหลักที่รัน (ตรวจซ้ำได้):
- `git log -1 --format='%H %P' 4c8a5d6` → parent สายหลัก `3304e66`
- `git diff 3304e66..4c8a5d6 --stat` → 24 ไฟล์
- `git diff --name-only 3304e66..4c8a5d6 -- <ไฟล์ต้องห้ามทั้งชุด>` → **ว่าง**
- `git diff --name-only 3304e66..main -- <ไฟล์ต้องห้ามทั้งชุด>` → **ว่าง**
- `git diff --name-only 3304e66..main -- src/domain/types.ts` → มีผล (ตัวควบคุม pathspec)
- `git diff 3304e66..4c8a5d6 -U0 -- src/screens src/comms src/App.tsx src/dashboard/PinGate.tsx` → hunk headers

## What I did NOT do

- **ไม่ได้เขียนไฟล์เทสต์ใหม่** — ตามที่ plan สั่ง (เหตุผลข้างบน)
- **ไม่ได้แก้โค้ดที่เจอว่าน่าจะแก้** — ป้าย `LIVE` บนจอลูกค้าที่ไม่มีไทย (`DisplayScreen.tsx:40`)
  ยืนยันรอบนี้ว่าเกิดที่ commit `89ed450` ของ UI overhaul เอง แต่ **ไม่แก้** เพราะ (1) นอกขอบเขตงานรอบนี้
  (2) `DisplayScreen.tsx` ถูก branch `_0020`/`_0031` แก้ค้างไว้ การแตะจะสร้าง conflict ให้กองที่รอ merge
- **ไม่ได้ทำข้อ `Display เลขคิว clamp`** ทั้งที่สำรวจเจอค่าที่ต้องใช้แล้ว — คนละข้อ คนละรอบ
  (จดที่พบไว้ใน `## Next task` ให้รอบหน้าไม่ต้องเริ่มจากศูนย์: `QueueNumber.tsx:3` และ `DisplayScreen.tsx:83`)
- **ไม่ได้ merge หรือ push อะไร** — agent ไม่มีสิทธิ์ ตอนนี้กองรอ merge อยู่ **12 branch**

## Risk

- ⚠️ **ขอบเขตของคำว่า "presentation" เป็นการตัดสินใจของรอบนี้ ผู้ตรวจควรดูเอง** — มี 3 จุดที่
  *พฤติกรรม* เปลี่ยนแม้จะอยู่ในไฟล์ presentation และผมตัดสินว่า **ไม่ละเมิด** เพราะไม่ใช่บัญชี/เมนู/comms:
  1. `PinGate.tsx` เพิ่ม `onKeyDown` → กด Enter = submit (ตัว `unlockDashboard` ไม่เปลี่ยน)
  2. `DisplayScreen.tsx` เพิ่มฟังก์ชัน `itemDetail()` **เหนือ component** — เป็น hunk เดียวในกองทั้งหมด
     ที่อยู่เหนือ `return (` ทำให้จอลูกค้าโชว์รายการสินค้าใต้เลขคิว = **ข้อมูลใหม่บนจอสาธารณะ**
     (อ่านจาก `o.items` ที่มีอยู่แล้ว ไม่ได้คิดเงินใหม่) ถ้าใครถือว่า "สิ่งที่โชว์บนจอลูกค้า" เป็นเรื่อง
     product ไม่ใช่ presentation ข้อนี้คือจุดที่ต้องเถียงกัน
  3. `OrderStation.tsx` ย้ายแผงเลือกตัวเลือกไปเป็น modal เต็มจอ (`fixed inset-0`) — ตรรกะ `confirmPick`
     เหมือนเดิมทุกบรรทัด แต่ flow การกดของคนหน้างานเปลี่ยนจริง
- ⚠️ **`.gitignore` (+3 บรรทัด, commit `b2a732b`) อยู่ในช่วงที่ตรวจ และไม่ใช่ presentation** — ไม่ใช่ Firestore
  ไม่ใช่ logic จึงไม่ละเมิดเกณฑ์ แต่เป็นข้อยกเว้นที่บันทึกไว้ ไม่ได้กลบ
- ⚠️ **หลักฐานข้อนี้เป็นการ "อ่าน diff" ไม่ใช่การรันอะไร** — จุดอ่อนคือถ้าผมอ่านพลาดสักไฟล์ ก็จะติ๊กเกินจริง
  ตัวลดความเสี่ยงคือเลข commit ที่จดไว้ในช่อง (`3304e66..4c8a5d6`) ผู้ตรวจรันคำสั่งเดิมซ้ำได้ใน 1 นาที
- ℹ️ ช่องนี้ติ๊กบน branch นี้ **ไม่ใช่บน main** เหมือนทุกช่องก่อนหน้า — `AUTOPILOT.md` เป็นบัญชีรวมข้ามรอบ
  ไม่ใช่สถานะของ main
