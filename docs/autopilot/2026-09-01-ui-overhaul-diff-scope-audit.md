# ui-overhaul #4 — "Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)"

รอบ `auto/Booth_Management_6_7/2026-09-01_0037` · ไฟล์ `src/uiOverhaulDiffScope.audit.test.ts` (12 เทสต์)

**ไม่ได้แก้ `src/` production เลยสักบรรทัด** — โค้ดผ่านเกณฑ์นี้อยู่แล้ว สิ่งที่ขาดคือเทสต์

---

## 1. ช่องว่างที่ปิด

`src/frozenZones.audit.test.ts` (รอบ `_0044`) พิสูจน์ครึ่งพี่น้องของประโยคนี้ไว้แล้ว ในบริบทของสเปก
`queue-pro-upgrade`: โมดูล logic บัญชี/เมนู/comms **เหมือนเดิมทุกไบต์**

แต่ไฟล์นั้นเป็น **whitelist** — พูดได้อย่างเดียวว่า "ไฟล์ที่ลิสต์ไว้ไม่เปลี่ยน"
มันเงียบสนิทกับไฟล์ที่ไม่มีใครนึกถึงจะลิสต์ และ **ไม่เคยมองไปที่ Firestore เลย**

`git ls-files` ยืนยัน: `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`
เป็นไฟล์ tracked จริงทั้งสี่ตัว และก่อนรอบนี้ **ไม่มีเทสต์ตัวไหนในระบบแตะมันเลยแม้แต่ตัวเดียว**

ไฟล์ใหม่จึงถามคำถามกลับด้าน ซึ่งเป็นความหมายตรงตัวของคำว่า *"diff เฉพาะ …"*:
**ทุก path ในดิฟฟ์ของ branch อยู่ในหมวดที่เกณฑ์อนุญาตหรือเปล่า** — ต้องเป็น *census ที่ครบถ้วน*
พร้อมทางออกที่ประกาศไว้ ไม่ใช่ freeze list

| กลุ่ม | อ้างอะไร |
|---|---|
| **R** | `firestore.rules` / `firestore.indexes.json` เหมือนเดิมทุกไบต์เทียบ `git merge-base main HEAD` และ **ไม่มี Firebase config surface รูปทรงไหนเลย**อยู่ในดิฟฟ์ (รวมถึงตัวที่ยังไม่มีใครคิดจะสร้าง เช่น `firestore.indexes.staging.json`) |
| **T** | `tailwind.config.js` มีอยู่จริง, tracked, เป็นไฟล์ token ที่สเปก §7 เรียกว่า single source of truth, และเป็นหมวดที่ **อนุญาต** — รอบ Neon Clarity แก้มันได้โดยไม่สะดุดสวีปนี้ |
| **S** | census: ทุก path ที่เปลี่ยน ตกในหมวดที่อนุญาต หรือถูกประกาศพร้อมเหตุผล |
| **D** | รายการที่ประกาศไม่ใช่เรื่องแต่ง (มีอยู่จริง · tracked · เปลี่ยนจริง · เหตุผลมีเนื้อ) |
| **P** | ไม่มีไฟล์ในหมวด code ที่อนุญาต (`src/ui` / CSS / `.tsx`) เพิ่มหรือลบบรรทัดที่เรียก **Firestore SDK ตรงๆ** |

### สิ่งที่ census ครอบคลุมแต่ whitelist ไม่เคยครอบ

`src/lib/firebase.ts` — Firestore client init ที่ **SCOPE ของ `frozenZones` เขียนเตือนตัวเองไว้**
ว่าเป็นรูที่มันมองไม่เห็น ("A change in, say, `src/lib/firebase.ts` would reach `expensesRepo`
without this file noticing") — ตกในหมวด `other` ที่นี่ แปลว่าถ้าวันหนึ่งมันเปลี่ยน
**S2 จะแดงและบังคับให้เขียนคำอธิบาย** รูแคบลงเพราะ census ครบ ไม่ใช่เพราะไปลิสต์ชื่อไฟล์เพิ่ม

### บั๊กในตัวเทสต์เองที่เจอตอนวางแผน mutation

`git diff` **ไม่รายงานอะไรเลยสำหรับ path ที่ยัง untracked** (ไม่มีใน index ก็ไม่มี "before")
แต่ `changedPaths()` ลิสต์ไฟล์ untracked ด้วย → P1 จะสแกนไฟล์ใหม่แล้วได้ **ศูนย์บรรทัด**
`src/ui/Evil.tsx` ที่เต็มไปด้วย `updateDoc` จึงผ่าน census (เป็น `ui-primitive`) และ**ล่องหนจาก P1**
แก้ด้วย `newFileAddedLines()` — อ่าน body ตรงๆ ถือทุกบรรทัดเป็นบรรทัดที่เพิ่ม (M9 พิสูจน์ว่าปิดจริง)

---

## 2. Mutation check — **ทำนายก่อนรัน**

commit ของตารางนี้ (`ทำนาย`) อยู่ก่อน commit ผลลัพธ์ ตรวจได้ที่ `git log`

`fz-` = เทสต์ใน `src/frozenZones.audit.test.ts` · ที่เหลือคือเทสต์ในไฟล์นี้

| # | mutation | ทำนายว่าแดง |
|---|---|---|
| M1 | สร้างไฟล์ untracked `firestore.indexes.staging.json` | R2 · S2 · fz-C1 |
| M2 | `changedPaths()` คืน `[]` (สวีปตาบอด) | S1 · D1 · P1 |
| M3 | `FIREBASE_SURFACE = /^$/` | R0 |
| M4 | `classifyScope` fallback คืน `'presentation'` แทน `'other'` | S0 · S1 · D0 · P1 |
| M5 | ย้ายกฎ `ui-primitive` ขึ้นก่อนกฎ `test` | S0 |
| M6 | เพิ่ม `import { collection } from 'firebase/firestore'` ใน `DisplayScreen.tsx` | P1 |
| M7 | สร้างไฟล์ untracked `src/queue/newThing.ts` | S2 · fz-P1 |
| M8 | สร้างไฟล์ untracked `src/screens/Bogus.tsx` (ไม่มี Firestore) | fz-P1 |
| M9 | สร้างไฟล์ untracked `src/ui/Evil.tsx` ที่มี `updateDoc(` | P1 · fz-P1 |
| M10 | ลบ `queueActions.ts` ออกจาก `DECLARED_OUTSIDE_THE_UI_DIFF` | S2 |
| M11 | พิมพ์ path ที่ประกาศผิด (`queueAction.ts`) | D0 · D1 · S2 |
| M12 | ใส่ `'other'` เข้า `ALLOWED_WITHOUT_DECLARATION` | D0 |
| M13 | ถอด `extend`/token ออกจาก `tailwind.config.js` | T0 · fz-C1 |
| M14 | ถอด `'style-config'` ออกจาก `ALLOWED_WITHOUT_DECLARATION` | T1 |
| M15 | `FIRESTORE_SDK = /^$/` | P0 |

**ทำนายว่าเขียวทั้งที่ควรแดง (ตั้งใจบันทึกไว้):**
- M2 → **R2 กับ S2 เขียว** ทั้งที่ scanner ไม่ได้ตรวจอะไรเลย (`[].filter(...)` = ว่างเสมอ)
  นี่คือกับดัก "สวีปตาบอด" ที่ `_0044` พิสูจน์ไว้ — S1/D1/P1 คือ spine ที่จับได้
- M3 → **R2 เขียว** · M15 → **P1 เขียว** — regex ตาบอดทำให้ filter ไม่เจออะไร
  R0/P0 คือตัวเดียวที่จับได้ นี่คือเหตุผลที่ต้องมีเทสต์ปัก checker
- M12 → **S2 เขียว** เพราะทุกอย่างกลายเป็นหมวดที่อนุญาต — D0 คือด่านเดียว

**เทสต์ที่ทำนายว่าไม่มี killer เลย — และตั้งใจ:**
- **R1** (`firestore.rules` / `firestore.indexes.json` เหมือนเดิมทุกไบต์) — การจะฆ่ามันได้
  ต้อง **แก้ไฟล์ที่ AUTOPILOT ระบุว่า out of scope ห้ามแตะ** จึงเลือกไม่ทำ
  R1 ไม่ vacuous เพราะ **R0 พิสูจน์ plumbing ตัวเดียวกัน**ว่ามันคืนค่าจริงเมื่อไฟล์เปลี่ยน
  (`git diff --name-only <bp> -- src/screens/DisplayScreen.tsx` คืนชื่อไฟล์นั้น)
  บวก anti-vacuity ใน R1 เองที่อ่านเนื้อไฟล์และยืนยันว่าเป็น rules จริง (`rules_version = '2'`,
  `match /databases/...`) กับ indexes ที่ parse เป็น JSON ได้และมี key `indexes`

---

## 3. ผลจริง — **ตรง 14 จาก 15**

| # | ทำนาย | ได้จริง | |
|---|---|---|---|
| M1 | R2 · S2 · fz-C1 | R2 · S2 · fz-C1 | ✅ |
| M2 | S1 · D1 · P1 | S1 · D1 · P1 | ✅ |
| M3 | R0 | R0 | ✅ |
| M4 | S0 · S1 · D0 · P1 | S0 · S1 · D0 · P1 | ✅ |
| M5 | S0 | S0 | ✅ |
| M6 | P1 | P1 · **clamp-Q2** | ❌ |
| M7 | S2 · fz-P1 | S2 · fz-P1 | ✅ |
| M8 | fz-P1 | fz-P1 | ✅ |
| M9 | P1 · fz-P1 | P1 · fz-P1 | ✅ |
| M10 | S2 | S2 | ✅ |
| M11 | D0 · D1 · S2 | D0 · D1 · S2 | ✅ |
| M12 | D0 | D0 | ✅ |
| M13 | T0 · fz-C1 | T0 · fz-C1 | ✅ |
| M14 | T1 | T1 | ✅ |
| M15 | P0 | P0 | ✅ |

**ที่ทำนายว่าเขียวทั้งที่ควรแดง — เกิดขึ้นจริงครบทุกตัว**
M2 → R2/S2 เขียว · M3 → R2 เขียว · M12 → S2 เขียว · M15 → P1 เขียว
`[].filter(อะไรก็ได้)` คือ `[]` เสมอ **`toStrictEqual([])` แยกไม่ออกระหว่างรีโปสะอาดกับ scanner ที่ไม่ได้ตรวจอะไรเลย**
R0 · P0 · S0 · D0 (เทสต์ที่ปัก checker เอง) คือเหตุผลเดียวที่ mutation พวกนี้ตาย

### ตัวที่พลาด — M6

เพิ่ม `import { collection } from 'firebase/firestore'` ที่ `DisplayScreen.tsx`
P1 แดงตามทำนาย **แต่ `displayClampScale.audit.test.tsx` Q2 แดงด้วย**

Q2 ปักค่าเป๊ะแบบ **หมายเลขบรรทัด**: `expect(sweepScreens(read)).toStrictEqual({ display: ['DisplayScreen.tsx:83'], … })`
แทรก import หนึ่งบรรทัด call site เลื่อนไป 84 → แดง

บทเรียนซ้ำของเก่าและยังพลาด: **grep หา readFileSync ก่อนทำนายไม่พอ ต้องอ่านว่ามัน assert อะไร**
รอบนี้ grep เจอว่า `displayClampScale` อ่านซอร์ส แต่ไม่ได้เปิดดูว่ามันปัก *เลขบรรทัด*
**canary ที่ปักเลขบรรทัดจะตายไปกับทุก mutation ที่ทำให้บรรทัดเลื่อน ไม่ว่าอยู่ไฟล์ไหน**

### ความคุ้มครองของ red set

11 จาก 12 เทสต์มี killer — **R1 ไม่มี และเป็นความตั้งใจ** (เหตุผลอยู่ §2)

⚠️ **เทสต์ที่มี killer ตัวเดียว ห้ามลบ**: R0 (M3) · R2 (M1) · T0 (M13) · T1 (M14) · P0 (M15)

📌 **M10 รอบแรกไม่นับ** — สคริปต์ "ลบ declaration" ที่เขียนไว้จริงๆ แล้ว *เปลี่ยนชื่อ key*
ซึ่งคือ M11 (พิมพ์ผิด) สวมป้าย M10 มันเลยแดง D0/D1 ด้วยเหตุผลที่ไม่เกี่ยวกับการลบ declaration
รันใหม่ด้วยการ splice สองบรรทัดทิ้งจริงๆ จึงได้ S2 ตัวเดียวตามทำนาย
**อย่านับ mutation ที่ตัวเองไม่ได้ทำอย่างที่บอกว่าทำ**

📌 **CRLF กินแพตเทิร์นหลายบรรทัดอีกแล้ว** — 6 จาก 7 mutation แรกรายงาน "PATTERN NOT FOUND"
เพราะ working copy เป็น CRLF แต่แพตเทิร์นเขียนด้วย `\n` **mutation ที่ไม่ได้ apply = ไม่ได้ทดสอบอะไร
และมันเงียบมาก** ต้องพิมพ์บอกทุกครั้งที่ replace ไม่โดน ไม่งั้นจะอ่านว่า "เทสต์เขียว = ทนทาน"

### Verify

`npm test` → **50 ไฟล์ · 283 เทสต์ เขียวทั้งหมด**
`npm run build` → `tsc -b` ผ่าน · PWA `generateSW` precache **5 entries (847.52 KiB)**

---

## 4. ขอบเขตของหลักฐาน

**พิสูจน์แล้ว**
- `firestore.rules` / `firestore.indexes.json` ไม่เปลี่ยน — ครบและเป๊ะ `git diff` คือ authority
  เดียวกับที่ reviewer จะใช้
- **ทุก path ในดิฟฟ์ถูกนับครบ** ไม่มี path ไหนอยู่ในสถานะ "ไม่รู้ว่าควรอยู่หมวดไหน"
  นี่คือข้ออ้างที่ `frozenZones` ทำไม่ได้ เพราะ whitelist ไม่มีความเห็นต่อสิ่งที่ไม่ได้ลิสต์

**🚨 ยังไม่พิสูจน์**
- **ว่าการเปลี่ยน `.tsx` เป็น presentation จริง** — `presentation` ตัดสินจาก **path ไม่ใช่เนื้อหา**
  และนี่ไม่ใช่การเดาว่ามันสำคัญ: วันนี้ `src/screens/QueuePanel.tsx` **มี `useRef` Set ของ
  idempotency อยู่จริง** ซึ่งคือ logic ที่อาศัยอยู่ในหน้าจอ และ census ก็ยังเรียกมันว่า `presentation`
  P1 คือตาข่ายเดียวใต้หมวดนี้ และมันจับได้แค่ **สปีชีส์เดียว** คือการเรียก Firestore SDK ตรงๆ
  **business logic ที่เขียนด้วย TypeScript ธรรมดาในหน้าจอ ผ่านฉลุย**
- **ไฟล์ `.tsx` ใหม่ไม่ต้องประกาศ** — `presentation` เป็นหมวดที่อนุญาต การเพิ่มหน้าจอใหม่ทั้งหน้า
  จึงเงียบที่นี่ **fz-P1 ต่างหากที่จับ** (M8 พิสูจน์) — census สองตัวทับกันโดยตั้งใจ
- **พฤติกรรม** — ไม่ได้เดินตาม import closure เหมือนที่ `frozenZones` เขียนเตือนไว้
- **ไม่ได้พูดถึงหน้าตา UI เลย** เกณฑ์นี้พูดถึง *รูปทรงของดิฟฟ์* ล้วนๆ
  "ทุกหน้าเป็นสไตล์ Neon Clarity" เป็นคนละเกณฑ์และยังเปิดอยู่
- ไฟล์ที่ `.gitignore` (`dist/`, `*.tsbuildinfo`) มองไม่เห็นทั้งจาก `git diff` และ `ls-files --others`

---

## 5. ⚠️ ถึงรอบที่จะแก้ `tailwind.config.js` (Neon Clarity)

สวีปนี้ **อนุญาต** — T1 ปักไว้แล้วว่า `style-config` อยู่ใน `ALLOWED_WITHOUT_DECLARATION`

แต่ `classify()` ของ `frozenZones` **ไม่มีหมวด config** มันจะเรียก `tailwind.config.js` ว่า
`'unknown'` แล้ว **C1 จะแดงทันที** (M13 พิสูจน์ให้ดูจริง ไม่ใช่คำเตือนลอยๆ)

**ทางแก้คือ *เพิ่ม* หมวด config เข้าไปใน `classify()`** ห้ามไปคลายกฎที่ route ไฟล์ production
เข้า P1 และห้ามลบเทสต์ทิ้ง
