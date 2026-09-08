# SUMMARY — รอบ `auto/Booth_Management_6_7/2026-09-09_0037`

## What I did

- **ยกงานทั้งหมดขึ้น branch นี้** จาก `auto/Booth_Management_6_7/2026-09-09_0026`
  (`763a0c1`) ด้วย `git checkout <tip> -- .` — 49 path (เทสต์ audit 20+ ไฟล์,
  บันทึก `docs/autopilot/` 20 ไฟล์, `AUTOPILOT.md`, และการแก้ `src/` ที่รอบก่อนๆ ทำไว้)
  branch นี้ถูกตัดจาก **`main` เปล่าๆ (`735de75`)** ถ้าไม่ยก PR ของรอบนี้จะเสนอ tree
  ที่ไม่มีงานสะสมทั้งหมดอยู่เลย
- **รัน Verify command เต็ม** (`npm test && npm run build`) แล้วเทียบผลกับ baseline
  ที่ `_0026` บันทึกไว้ — **ตรงทุกตัวเลข รวมทั้ง content hash ของ bundle ทั้งสามตัว**
- **ไม่ได้แตะ `src/` เลยสักบรรทัด** และไม่ได้เริ่มงานใหม่ — เพราะ `## Next task`
  ที่ยกมาสั่งไว้ตรงตัวว่าไม่มีงานที่ agent ทำต่อเองได้แล้ว
- **แก้ `## Next task` ใน `AUTOPILOT.md`** ให้บันทึกรอบนี้ (ครั้งที่ยี่สิบสี่ ·
  รอบที่แปดติดที่ยืนยันคำสั่งนี้ · หกรอบที่ bundle hash นิ่ง)

## Why

- **ยกก่อนเสมอ ถึงจะไม่มีงานทำ** — คำสั่งใน `AUTOPILOT.md` เขียนไว้ชัด และเหตุผลคือ
  branch ที่ไม่ได้ยก **เท่ากับ `main` เปล่าๆ** ถ้ามีคนเผลอ merge สลับลำดับ งานสะสม
  ทั้งหมดจะหายเงียบๆ
- **ใช้ `checkout <tip> -- .` ทั้ง tree รวด แทนการไล่ path ทีละไฟล์** เพราะ
  `git merge-base HEAD <tip>` **คืนค่าเท่ากับ `HEAD` เอง** = `<tip>` เป็น strict
  descendant ของที่ยืนอยู่ = ไม่มีงานบน branch นี้ที่ `<tip>` ขาด ซึ่งเป็น**เงื่อนไขเดียว**
  ที่ทำให้ blanket checkout ปลอดภัย ยืนยันหลังกดด้วย
  `git diff --cached --name-only <tip>` → **ว่างเปล่า = byte-identical**
  (คำเตือน "blanket checkout ลบงาน" ยังจริงอยู่ในกรณีที่ `merge-base` ≠ `HEAD`)
- **ไม่หางานใหม่ทำ** — เกณฑ์ครบ 20/20 แล้ว และคำสั่งห้ามไว้ตรงตัว การเริ่มงานที่ไม่มี
  คนสั่งในรอบ unattended คือ scope creep ที่ย้อนกลับไม่ได้
- `merge` / `cherry-pick` ไม่ใช่ตัวเลือก — ต้องการ approval ที่รอบ unattended ให้ไม่ได้

## Verification

รัน Verify command เองครบทั้งสองครึ่ง:

```
$ npm test
 Test Files  59 passed (59)
      Tests  453 passed (453)
   Duration  38.59s

$ npm run build          # tsc -b && vite build
✓ 116 modules transformed.
dist/assets/index-bTUIGpdg.css   16.31 kB │ gzip:   4.22 kB
dist/assets/index-CyVIMiFT.js   852.15 kB │ gzip: 257.63 kB
✓ built in 1.02s
PWA v1.3.0 · mode generateSW · precache 5 entries (849.13 KiB)
  dist/sw.js · dist/workbox-9c191d2f.js
```

**ทั้งสองพยานตรงกับ baseline ที่ `_0026` บันทึกไว้:**

| หลักฐาน | ค่า | ตรงกับ baseline |
|---|---|---|
| ไฟล์เทสต์ · เทสต์ | 59 · 453 เขียวหมด | ✅ |
| `tsc -b` | ผ่าน | ✅ |
| vite modules | 116 | ✅ |
| css hash + ขนาด | `index-bTUIGpdg.css` 16.31 kB | ✅ |
| js hash | `index-CyVIMiFT.js` | ✅ |
| workbox hash | `workbox-9c191d2f.js` | ✅ |
| PWA precache | 5 entries | ✅ |

**ทำไมต้องดูสองพยานคู่กัน:** content hash พิสูจน์ว่า *ซอร์สที่คอมไพล์เข้า bundle*
เหมือนเดิมทุกไบต์ — mutation ที่ค้างใน `src/` ขยับแฮชเสมอ ถึงเทสต์จะเขียวครบก็ตาม
แต่ **ไฟล์เทสต์ไม่เข้า bundle** ➡️ mutation ที่ค้างในไฟล์ `*.audit.test.*` ไม่ขยับแฮชเลย
ตัวที่เฝ้าฝั่งนั้นคือ **จำนวนเทสต์ 453 + เขียวครบ** ตัวเดียวไม่พอทั้งคู่

การนับรอบ **นับจาก branch จริง ไม่ได้นับจากข้อความในไฟล์**:
`git for-each-ref --sort=-committerdate refs/heads/auto` → **66 branch** และแปดตัวบนสุด
(ไม่นับตัวเอง) คือ `_0026 · _0016 · _0006 · _0041 · _0031 · _0021 · _0011 · _0046`
เรียงต่อกันไม่ขาดช่วง

## What I did NOT do

- **ไม่ได้เริ่มเกณฑ์ใหม่ ไม่ได้เขียนเทสต์ใหม่ ไม่ได้แก้ `src/` เลยสักบรรทัด** —
  `## Next task` สั่งไว้ตรงตัวว่าไม่มีงานที่ agent ทำต่อเองได้ และให้ **ยก → verify →
  แก้บรรทัดนั้น → หยุด**
- **ไม่ได้ทำ mutation check รอบนี้** — ไม่มีเทสต์ใหม่ให้ตรวจความแข็ง และการรัน mutation
  ซ้ำกับเทสต์ที่ยกมาโดยไม่มีการเปลี่ยนแปลง ไม่ให้ข้อมูลใหม่ แต่เสี่ยงทิ้ง mutation ค้างไว้
  ถ้ารอบตายกลางทาง (เกิดมาแล้วสามครั้งในโปรเจคนี้)
- **ไม่ได้ปิดช่องว่างที่บันทึกไว้ 7 ข้อ** (export path · passport · Happy-Hour pricing ·
  ปิดซุ้ม/`countedCash` · PWA icons · toast เสียง · thermometer bar) — ทุกข้อคือ
  **การสร้างฟีเจอร์** ซึ่งแตะ logic บัญชี/เมนู/comms = **Out of scope ห้ามตรงตัว**
  และหลายข้อเป็นการตัดสินใจเชิงดีไซน์ที่ต้องมีคนเลือก
- ไม่ได้แตะ `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc` และไม่ได้เพิ่ม dependency

## Risk

- 🟢 **Verify ผ่านครบ** ไม่มีอะไรค้างให้ runner กั้น PR
- 🚨 **สถานะ "20/20" หมายถึง 13 ข้อพิสูจน์ด้วยเทสต์ · 7 ข้อเป็นช่องว่างที่บันทึกไว้**
  **ไม่ได้แปลว่าระบบทำได้ครบทุกอย่างที่สเปกเขียน** ผู้อ่านที่เห็นแต่ checkbox
  จะเข้าใจผิดได้ง่าย — รายการช่องว่างอยู่ครบใน `AUTOPILOT.md` และ `docs/autopilot/`
- ⚠️ **เทสต์จำนวนมากพิสูจน์ *ค่าที่ประกาศไว้ในซอร์ส* ไม่ใช่พิกเซลที่เรนเดอร์จริง** —
  jsdom ไม่ทำ layout, Tailwind ไม่เคยรัน, ไม่มีเน็ต ไม่มี Firestore จริง
  ข้ออ้างเรื่อง "กึ่งกลาง" · "glanceable" · "realtime" · "sync" เป็น **รูปทรงที่ทำให้
  สิ่งนั้นเป็นไปได้** ไม่ใช่การวัด — **ยังควรมีคนเปิดจอจริงดูก่อนวันงาน**
- ⚠️ **มีเทสต์หลายตัวที่ปัก *ความไม่มี* ของฟีเจอร์ไว้** (`idempotency E1` · `pwa I1` ·
  `alert C5` · `donation T1–T3` · `hq G0/G1` · `offlineSync G1–G5` · `missingFeatures`
  ทั้งไฟล์) **ถ้าวันหนึ่งมันแดง แปลว่ามีคนสร้างฟีเจอร์นั้นแล้ว = นั่นคือการแก้
  ไม่ใช่การถดถอย** ให้ไปอ่านบันทึกก่อน อย่าลบเทสต์
- ⚠️ **`AUTOPILOT.md` ระบุรายชื่อเทสต์ที่ "มี killer ตัวเดียว ห้ามลบ" ไว้เยอะมาก**
  รอบไหนที่จะแก้เทสต์ ต้องอ่านรายการนั้นก่อน
- 📌 **ถ้ารอบหน้ารับ branch มาแล้วเจอเทสต์แดง** ให้เทียบกับตาราง mutation ใน
  `docs/autopilot/` ก่อนสรุปว่าโค้ดพัง — runner เคย commit mutation ที่ค้างจากรอบที่ตาย
  กลางทางไว้ในชื่อ "rescued work" มาแล้ว **สามครั้ง**
