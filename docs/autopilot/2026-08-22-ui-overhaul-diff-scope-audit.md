# UI-overhaul diff-scope audit — "Firestore/logic ไม่เปลี่ยน"

รอบ `auto/Booth_Management_6_7/2026-08-22_0054` · ฐาน `main = 735de75`

เกณฑ์ที่ตรวจ (`docs/superpowers/specs/2026-08-03-ui-overhaul-design.md:89`):

> Firestore/logic ไม่มีการเปลี่ยนแปลง (diff เฉพาะ presentation + Tailwind config + src/ui)

**ผลสรุป: ผ่าน** — ไม่มีไฟล์ Firestore หรือไฟล์ logic ไฟล์ใดถูกแตะโดยงานของ spec นี้เลย
ทั้งในส่วนที่ merge แล้ว ในทุก branch ที่ยังไม่ merge และในทุก commit บน `main` หลังจากนั้น
รอบนี้ **ไม่ได้แก้ production เลยสักบรรทัด** เพิ่มเฉพาะไฟล์เทสต์ใหม่ + เอกสารฉบับนี้

---

## 1. คำสั่งที่ใช้ และ commit ที่อ้างอิง (ตรวจซ้ำจากจุดเดียวกันได้)

| ก้อน | ช่วง | คำสั่ง |
|---|---|---|
| A — งานที่ merge แล้ว | `3304e66..4c8a5d6` | `git diff --stat 3304e66 4c8a5d6` |
| B — ทุก branch ที่ยังไม่ merge | ทุก ref ที่ไม่อยู่บน `main` | `git log --all --not main --name-only --pretty=format:` |
| C — commit บน `main` หลัง merge | `4c8a5d6..main` | `git log --oneline 3304e66..main` |

- `4c8a5d6` = merge commit ของ UI overhaul (`Merge UI Overhaul: Neon Clarity design system across all screens`)
- `3304e66` = parent สายหลัก (`docs: UI overhaul implementation plan`) — ฐานเทียบเดียวกับที่รอบ 2026-08-17_0039 ใช้

**ก้อน B ใช้ `git log --all --not main` ไม่ใช่ `git diff main...<branch>` ทีละอัน**
ให้ผลเดียวกันแต่จบในคำสั่งเดียว และเลี่ยงข้อจำกัดของ shell ในกล่องนี้ที่บล็อก `$var`/`$(...)`
(เขียน loop ไม่ได้ → การยิงทีละ branch 27 ครั้งคือทางเดียวถ้าใช้ `git diff`)

---

## 2. การตีความเกณฑ์ — "ชนิดของการเปลี่ยนแปลง" ไม่ใช่ "ที่อยู่ของไฟล์"

เกณฑ์เขียน allow-list ไว้สามหมวด: *presentation · Tailwind config · `src/ui`*
ถ้าอ่านหมวดแรกเป็น **path literal** จะไม่มีไดเรกทอรีชื่อ `presentation` อยู่จริงในโปรเจคนี้เลย
และ **ทุกหน้าจอจะผิดเกณฑ์ทันที** ทั้งที่ spec สั่งให้ restyle ทุกหน้าด้วยตัวเอง

หลักฐานที่บังคับให้อ่านเป็น **บทบาทของโมดูล**:

1. **`:78`** — บรรทัดที่นิยามคำเอง: *"Firestore/logic ไม่แตะ — เปลี่ยนแค่ presentation.
   **ไม่แก้ repo, metrics, cart logic, comms logic**"* → ระบุสิ่งที่ห้ามเป็น **ชื่อบทบาท**
   (repo / metrics / cart logic / comms logic) ไม่ใช่ path
2. **`:81` (§7 P2)** — *"ไล่ restyle ทีละหน้า (Setup → Order Station → Display → QueuePanel →
   Dashboard → PIN/Comms/chrome), **หน้าละ task**"* → `src/screens/`, `src/comms/*.tsx`,
   `src/dashboard/PinGate.tsx` **ต้องถูกแตะ** ตามแผนของ spec เอง
3. **`:70`** — ข้อห้ามที่เขียนไว้คู่กันคือห้ามเปลี่ยน *ข้อความ / accessible name / `data-testid`*
   ซึ่งเป็นข้อห้ามระดับ **พฤติกรรม** ไม่ใช่ระดับ path → เจตนาของทั้งหมวดนี้คือ "อย่าเปลี่ยนสิ่งที่ระบบทำ"

**ผลของการตีความ (ตัดสินแล้ว ไม่ปล่อยเป็นสถานะ "ไม่รู้"):**

| ไฟล์ | อยู่ในสามหมวดตามตัวอักษรไหม | ตัดสิน |
|---|---|---|
| `src/screens/*.tsx` | ไม่ | **presentation** ✅ — §7 P2 สั่งให้แตะเอง |
| `src/comms/*.tsx` (4 component) | ไม่ | **presentation** ✅ — §7 P2 พูดถึง "Comms/chrome" ตรงตัว |
| `src/dashboard/PinGate.tsx` | ไม่ | **presentation** ✅ — §7 P2 พูดถึง "PIN" ตรงตัว |
| `src/order/QrCode.tsx` | ไม่ | **presentation** ✅ — ทั้งไฟล์คือ `<img>` + `className` ไม่มี logic (แก้รอบ 0006 = เติม `max-w-full h-auto`) |
| `src/ui/*.tsx` | ใช่ | **src/ui** ✅ |
| `tailwind.config.js` | ใช่ | **Tailwind config** ✅ |
| `src/index.css`, `src/theme.ts` | ไม่ | **Tailwind config** ✅ — เป็น token layer เดียวกัน (`html{font-size:120%}`, `.glow-o/.glow-y`, ตาราง `THEME`) |
| `src/i18n/labels.ts` | ไม่ | **presentation** ✅ — แต่ดูข้อ 4 ด้านล่าง มีเงื่อนไข |
| `.gitignore` | ไม่ | **นอกทั้งสามหมวด** ⚠️ ดูข้อ 3.3 |
| `vite.config.ts` | ไม่ | **นอกทั้งสามหมวด** → **จงใจไม่แตะ** ดู §5 |

---

## 3. ก้อน A — งานที่ merge แล้ว (`3304e66..4c8a5d6`, 24 ไฟล์, +617/−315)

### 3.1 ไฟล์ที่ต้อง "ไม่เปลี่ยนเลย" — ไม่เปลี่ยนสักไฟล์

```
git diff --name-only 3304e66 4c8a5d6 -- \
  firestore.rules firestore.indexes.json firebase.json .firebaserc \
  src/lib/firebase.ts src/order/ordersRepo.ts src/order/buildOrder.ts src/order/cart.ts \
  src/order/options.ts src/order/promptpay.ts src/order/queueNumber.ts \
  src/comms/commsRepo.ts src/comms/commsLogic.ts src/comms/types.ts src/comms/useHeartbeat.ts \
  src/expense/expensesRepo.ts src/dashboard/metrics.ts src/dashboard/pinStore.ts \
  src/domain/catalog.ts src/domain/types.ts src/domain/appConfig.ts \
  src/device/deviceConfig.ts src/device/deviceId.ts \
  src/display/chime.ts src/display/queueView.ts src/display/useServingAlert.ts \
  src/queue/queueActions.ts
→ (ว่าง)
```

⚠️ **"diff ว่าง" ไม่มีค่าถ้า pathspec จับไฟล์ไม่ได้ตั้งแต่แรก** — sanity check: ยิง pathspec **ชุดเดียวกัน**
กับช่วง `3304e66..main` ได้ผล **ไม่ว่าง**:

```
src/dashboard/pinStore.ts   src/display/queueView.ts   src/display/useServingAlert.ts
src/domain/appConfig.ts     src/domain/types.ts        src/queue/queueActions.ts
```

→ pathspec จับไฟล์เป็นจริง และ **6 ไฟล์นี้เปลี่ยนนอกช่วงของ overhaul** (ดู §5 ของก้อน C)

### 3.2 24 ไฟล์ที่เปลี่ยนจริง — ตกอยู่ในหมวดที่อนุญาตทั้งหมด

| หมวด | ไฟล์ |
|---|---|
| Tailwind config | `tailwind.config.js` |
| token layer | `src/index.css`, `src/theme.ts` (+ `src/theme.test.ts`) |
| `src/ui` | `Button.tsx` `Chip.tsx` `Panel.tsx` `QueueNumber.tsx` `StatTile.tsx` (+ `Button.test.tsx` `primitives.test.tsx`) |
| presentation | `App.tsx` · `comms/{AlertButtons,BroadcastBar,CommsToast,PresenceBoard}.tsx` · `dashboard/PinGate.tsx` · `screens/{Dashboard,Display,OrderStation,QueuePanel,Setup}*.tsx` · `i18n/labels.ts` |
| **นอกสามหมวด** | `.gitignore` |

**ตรวจถึงเนื้อ diff ไม่ใช่แค่ `--stat`** — กวาดบรรทัดที่เปลี่ยนของไฟล์ presentation ทั้งหมด
(`git diff -U0 … | grep` หา `Repo` `await` `async` `firestore` `setDoc` `updateDoc` `collection(`
`serverTimestamp` `Math.` `reduce(` `useEffect` `useState`) ได้ผลคืนมา **เฉพาะ**:

- บรรทัด `{xxx.map((y) => (` ที่ย่อหน้าเปลี่ยน (JSX ล้วน — โผล่ทั้งฝั่ง `-` และ `+` คู่กัน)
- `lineUnitPrice(p, line.selections) * line.qty` — **โผล่ทั้งสองฝั่ง สูตรเดิมเป๊ะ** เปลี่ยนแค่ลำดับ class
  (`font-mono w-16 text-right` → `w-16 text-right font-mono`)
- `itemDetail()` ที่ `DisplayScreen.tsx` — ฟังก์ชัน **จัดรูปข้อความ** อ่านจาก `o.items` ที่มีอยู่แล้ว

**ไม่มีบรรทัดที่เปลี่ยนบรรทัดใดเลยที่มีคำว่า `Repo` / `await` / `firestore` / `setDoc` / `updateDoc`**

### 3.3 ข้อยกเว้นเดียวในก้อน A — บันทึกตรงๆ ไม่กลบ

`.gitignore` +3 บรรทัด (`# Firebase CLI cache` / `.firebase/`) จาก commit `b2a732b`
ซึ่งไหลมาอยู่ในช่วงเดียวกัน — **ไม่ใช่ Firestore ไม่ใช่ logic ไม่ใช่โค้ดที่รัน** จึงไม่ทำให้เกณฑ์ตก
แต่ก็ **ไม่ใช่ presentation ตรงตัว** ผู้ตรวจควรรู้ว่ามีไฟล์นี้อยู่ในช่วง

---

## 4. ก้อน B — ทุก branch ที่ยังไม่ merge (27 branch)

`git log --all --not main --name-only --pretty=format:` คืนมา 40 path
**ตัดไฟล์ `.test.*` / `docs/` / `AUTOPILOT.md` / `SUMMARY.md` ทิ้ง** (เทสต์เปลี่ยนพฤติกรรม production ไม่ได้)
เหลือไฟล์ production **6 ไฟล์** ที่ต้องอธิบาย:

| ไฟล์ | commit ที่แตะ | เป็นงานของ spec ไหน | ผลต่อเกณฑ์นี้ |
|---|---|---|---|
| `src/ui/Button.tsx` | `ef01a6a` | **ui-overhaul** (เกณฑ์ responsive, รอบ 0006) | ✅ อยู่ใน `src/ui` |
| `src/order/QrCode.tsx` | `ef01a6a` | **ui-overhaul** (เกณฑ์ responsive, รอบ 0006) | ✅ presentation (§2) |
| `src/screens/DisplayScreen.tsx` | `b65eb97` (Neon Clarity, รอบ 0051) | **ui-overhaul** | ✅ presentation |
| ″ | `6f4d255` (glanceable), `0162bd0` (no-show) | queue-pro-upgrade | ไม่ใช่งาน spec นี้ |
| `src/screens/QueuePanel.tsx` | `62a6222` `2791ffe` `d72bbc6` `4506a60` `5ce7f61` `6960b71` `7a13ff3` | **queue-pro-upgrade ทั้งหมด** | ไม่ใช่งาน spec นี้ |
| `src/order/ordersRepo.ts` ⚠️ | `2791ffe` `d72bbc6` `4506a60` `5ce7f61` | **queue-pro-upgrade ทั้งหมด** (เกณฑ์ Undo) | ไม่ใช่งาน spec นี้ |
| `src/queue/queueActions.ts` ⚠️ | `2791ffe` `d72bbc6` `4506a60` `5ce7f61` `6960b71` | **queue-pro-upgrade ทั้งหมด** | ไม่ใช่งาน spec นี้ |

⚠️ **สองบรรทัดที่ต้องอ่านให้ครบ**: `ordersRepo.ts` (= repo) และ `queueActions.ts` (= logic)
**ถูกแตะจริง** ในกองงานที่ยังไม่ merge — ถ้าอ่านเกณฑ์เป็น "ไฟล์เหล่านี้ห้ามขยับตลอดกาล" จะตกทันที
แต่เกณฑ์อยู่ใน §8 ของ spec **ui-overhaul** และพูดถึง **diff ของงาน overhaul** ไม่ใช่ทั้งประวัติของ repo
ทุก commit ที่แตะสองไฟล์นี้เป็นงานของ spec `2026-08-04-queue-pro-upgrade-design.md`
(ข้อความ commit เป็น `fix(queue): undo now restores absent fields` / `refactor(queue): extract cancel()`)
ซึ่ง **สเปกคนละใบ อนุมัติแยก และมีเกณฑ์ห้ามแตะโดเมนของตัวเองอยู่แล้ว** (ตรวจไปแล้วรอบ 0036)
→ **ไม่ทำให้เกณฑ์นี้ตก แต่ต้องบันทึก ไม่ใช่เงียบ**

**ไม่มี branch ไหนเลยที่งาน ui-overhaul แตะไฟล์โดเมน** — footprint ของ spec นี้ในก้อน B มีแค่ 3 ไฟล์:
`src/ui/Button.tsx`, `src/order/QrCode.tsx`, `src/screens/DisplayScreen.tsx`

---

## 5. ก้อน C — commit บน `main` หลัง merge

`4c8a5d6..main` มี **19 commit** (`git rev-list --count`) ในนั้นมี 4 commit ที่แตะไฟล์โดเมน:

| commit | ไฟล์โดเมนที่แตะ | เป็นงานของ |
|---|---|---|
| `6e2ddae` | `src/domain/types.ts` | queue-pro (skipped status + announcedAt) |
| `898daac` | `src/queue/queueActions.ts` | queue-pro (pure guarded actions) |
| `95da264` | `src/display/useServingAlert.ts`, `src/display/queueView.ts` | queue-pro (re-announce rule) |
| `17e8c2e` | `src/domain/appConfig.ts`, `src/dashboard/pinStore.ts` | **งานความปลอดภัย** (ย้าย PromptPay id + PIN ออกจากซอร์สไปอยู่ `.env`) |

`17e8c2e` ไม่ใช่งานของ spec ไหนในสามใบนี้เลย เป็นงานถอนความลับออกจากซอร์ส
→ **ไม่ทำให้เกณฑ์ตก** แต่บันทึกไว้เพราะเป็นไฟล์โดเมนที่ขยับจริงหลัง overhaul

commit เดียวหลัง merge ที่แตะไฟล์ presentation คือ `0393bd8` (photo booth "กำลังถ่าย / Now Shooting"
แตะ `labels.ts` + `DisplayScreen.tsx`) — เป็น **ฟีเจอร์คนละสาย** ไม่ใช่งาน restyle

---

## 6. `vite.config.ts` — ตัดสินแล้วว่า **ไม่แตะ**

รอบ 0031 พบ drift สองจุดใน manifest แล้ว **จงใจเลื่อนการตัดสินมาที่รอบนี้**:

- **G2** `theme_color`/`background_color` = `#1A1A1A` แต่ Neon Clarity ใช้ `#0a0a0c`
  (`src/theme.ts:4`) → splash screen วาบเทาอ่อนกว่าตัวแอปหนึ่งจังหวะ
  เป็น drift ที่เกิดจากงาน spec นี้เอง: `git show 75659de:tailwind.config.js` → `phantom-bg: '#1A1A1A'`
  **ตอนนั้นตรงกันพอดี** overhaul ย้าย palette แล้วลืม manifest ไว้ข้างหลัง
- **G3** manifest ไม่ประกาศ `lang` → plugin default เป็น `en` ขณะที่ `index.html` เป็น `lang="th"`

**ตัดสิน: ไม่แก้** เหตุผล 3 ข้อ

1. `vite.config.ts` **ไม่อยู่ในหมวดใดเลยจากสามหมวด** ภายใต้การตีความใดก็ตาม — มันไม่ใช่ token
   ของ Tailwind, ไม่ใช่ primitive, และไม่ใช่ view ที่ React เรนเดอร์ มันคือ build/PWA config
   ซึ่งเกณฑ์**ข้างบนมันในลิสต์เดียวกัน** (`tests + build + PWA generate`) เป็นเจ้าของอยู่แล้ว
2. ถ้าแก้ในรอบนี้ = **รอบที่มีหน้าที่พิสูจน์ว่า diff อยู่ในสามหมวด จะเป็นรอบที่ผลักมันออกนอกสามหมวดเอง**
   แล้วต้องมานั่งเขียนข้อแก้ตัวให้ตัวเอง — เป็นการทำลายเกณฑ์ด้วยมือตัวเองเพื่อปิดช่องว่างของเกณฑ์อื่น
3. ช่องว่างนี้ **ไม่ได้อยู่ในสถานะ "ไม่รู้"** — ถูกบันทึกไว้แล้วในช่องเกณฑ์ข้อ 3 (G2/G3)
   และรอบนี้ล็อกเพิ่มด้วยเทสต์ `GAP:` ที่ `src/diffScope.audit.test.ts` ซึ่ง **จะแดงทันทีที่มีคนแก้**
   เพื่อบังคับให้มาอัปเดตบัญชี

**งานที่เหลือให้คน / รอบอื่น**: แก้ `theme_color`/`background_color` เป็น `#0a0a0c` + เพิ่ม `lang: 'th'`
(2–3 บรรทัด ไม่แตะ logic) **ภายใต้ task ที่ไม่ใช่ spec ui-overhaul** แล้วลบเทสต์ `GAP:` ทิ้ง

---

## 7. ส่วนที่ล็อกด้วยเทสต์ได้ และส่วนที่ล็อกไม่ได้

**ล็อกไม่ได้**: ตัวเกณฑ์เป็นข้ออ้างเกี่ยวกับ **ช่วง git** ("diff ของงาน overhaul")
เทสต์ที่ assert ว่า "ไฟล์เหล่านี้ห้ามเปลี่ยน" จะกลายเป็นตัวขวางทุกการแก้ในอนาคต —
รอบ 2026-08-17_0039 ห้ามไว้ตรงตัวและถูกต้อง → ครึ่งนี้ตรวจด้วยมือครั้งเดียวแล้วเขียนลงเอกสารฉบับนี้

**ล็อกได้**: *เหตุผล*ที่เกณฑ์มีอยู่ = งาน restyle ต้อง**เอื้อมไม่ถึง** Firestore และ logic
ซึ่งเป็น **layering invariant** ที่จริงวันนี้และควรจริงตลอดไป → `src/diffScope.audit.test.ts` (13 เทสต์)

| กลุ่ม | สิ่งที่ปัก |
|---|---|
| A1–A2 | สำมะโนไฟล์: ทุกไฟล์ที่ ship ถูกจัดหมวด, ไฟล์ที่ spec เอ่ยชื่อตามบทบาทยังอยู่ในหมวดที่ถูกป้องกัน |
| B1–B2 | มีแค่ `lib/firebase.ts` + `*Repo.ts` ที่ import firebase ได้ — **restyle กลายเป็น write ไม่ได้** |
| C1–C3 | ไม่มีโมดูลโดเมนไหนถือ class / markup / import จาก `ui`·`screens`·`i18n` |
| C4 | ฝั่ง skin **import skin จริง** (พิสูจน์ว่า C3 มีโอกาสแดง ไม่ได้เขียวเพราะ regex ตาย) |
| D1–D4 | ป้อน fixture ปลอมที่ **ต้องถูกจับ** เข้ากฎแต่ละข้อ — พิสูจน์ว่ากฎมีฟันวันนี้ |
| GAP | manifest ยังถือสีเก่า (§6) |

**ขอบเขตของหลักฐาน**: เทสต์อ่าน **ข้อความในซอร์ส** ไม่ใช่แอปที่รันจริง
class ที่ต่อสตริงตอน runtime หรือ Firestore ที่เอื้อมถึงผ่าน alias ที่ไฟล์นี้ไม่รู้จัก **มองไม่เห็น**
เป็น tripwire บนเส้นทางที่ชัดเจน ไม่ใช่บทพิสูจน์ว่าแยกชั้นได้จริง

**mutation check 11 แบบ ทำนายผลไว้ล่วงหน้าทุกแบบและตรงทุกแบบ**
— **ทุกเทสต์ทั้ง 13 ตัวถูกฆ่าอย่างน้อย 1 แบบ** (ตารางเต็มอยู่ใน `SUMMARY.md` ของรอบนี้)
จุดที่สำคัญที่สุด: ตอนทำ regex `FIRESTORE` ให้ตาบอด → **B2 เขียวต่อไปแบบ vacuous**
มีแค่ B1 (ที่ assert ว่า "ต้องเจอ 4 ไฟล์นี้") กับ D3 ที่แดง
→ เทสต์ "ไม่พบการละเมิด" ทุกตัวในไฟล์นี้ต้องมีคู่ที่ยืนยันว่า **ตัวสแกนยังมองเห็นอะไรอยู่**
