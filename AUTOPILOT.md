# AUTOPILOT

## Goal

ระบบนี้ถูกใช้งานจริงในงานซุ้มของโรงเรียน โค้ดเดินมาถึงจุดที่ feature ครบตาม plan แล้ว
(129 tests เขียว, `npm run build` ผ่าน, merge Queue Pro-Upgrade เมื่อ 4 ส.ค.)
แต่ **acceptance criteria 20 ข้อ ใน `docs/superpowers/specs/*-design.md` ยังไม่เคยถูกตรวจอย่างเป็นระบบเลย
— ติ๊กไปแล้ว 0 จาก 20 ข้อ**

"เสร็จ" คือ: ทุกข้อใน 20 ข้อนั้น **ถูกพิสูจน์ด้วยเทสต์อัตโนมัติที่รันได้จริง** หรือถูกบันทึกไว้อย่างชัดเจน
ว่าเป็นช่องว่างที่ยังขาด พร้อมระบุว่าขาดตรงไหน — ไม่มีข้อไหนถูกทิ้งไว้ในสถานะ "ไม่รู้"

## Acceptance criteria

> ⚠️ **ช่องที่ติ๊กแล้ว หลักฐานกระจายอยู่บน branch ที่ยังไม่ merge** — ไฟล์นี้เป็นบัญชีรวมข้ามรอบ
> ไม่ใช่สถานะของ main ตอนนี้ main มี 131 เทสต์ และยังไม่มีงานของ 3 branch ข้างล่างนี้เลย
> - `2026-08-13_1553` → ข้อ Undo (แก้ `queueActions.*`, `ordersRepo.*`, `QueuePanel.*`)
> - `2026-08-15_0020` → ข้อ No-show (เพิ่มเทสต์ใน `DisplayScreen.test.tsx` + `data-testid` ใน `DisplayScreen.tsx`)
> - `2026-08-15_0031` → ข้อ ประกาศซ้ำ (ไฟล์ใหม่ `DisplayScreen.reannounce.test.tsx` ล้วนๆ ไม่ชนใคร)
> - `2026-08-15_0042` → ข้อ เรียกเจาะจง (ไฟล์ใหม่ `QueuePanel.callSpecific.test.tsx` ล้วนๆ ไม่ชนใคร)
> - `2026-08-16_0007` → ข้อ Idempotency (ไฟล์ใหม่ `QueuePanel.idempotency.test.tsx` ล้วนๆ ไม่ชนใคร)
>   — รอบนั้นยังไม่ติ๊ก เพราะเจอบั๊กจริงที่ยังไม่ได้แก้
> - `2026-08-16_0030` (branch นี้) → **แก้บั๊กนั้น** + ไฟล์ใหม่ `QueuePanel.cancelGuard.test.tsx`
>   แล้วติ๊กข้อ Idempotency — **เป็น branch เดียวในกองที่แก้ production code ของบั๊กยอดขายหาย**
>   แตะ `QueuePanel.tsx` 2 hunk เล็ก (conflict กับ `_1553` แค่บรรทัดเดียว ดูช่อง Idempotency ข้อ ง.)
>
> เลขบรรทัดที่อ้างถึงในช่องที่ติ๊กแล้ว เป็นเลขบรรทัด **บน branch ของรอบนั้น** ไม่ใช่บน main

**จาก `2026-08-04-queue-pro-upgrade-design.md`**

- [ ] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ✅ **งานนี้ทำเสร็จแล้วจริง และ commit ไว้เรียบร้อยแล้ว** ที่ branch
      `auto/Booth_Management_6_7/2026-08-13_1553` (commit `5ce7f61` + `cc85ddd`, push ขึ้น origin แล้ว)
      แต่ **ยังไม่ถูก merge เข้า main** — main จึงยังไม่มีโค้ดนี้
      — ⚠️ ข้อความเดิมตรงนี้ที่ว่า "โค้ดถูกลบทิ้งเพราะบั๊กของ runner" **ไม่เป็นความจริง**
      git identity เสียจริงตอนกลางวันของ 2026-08-13 แต่ถูกแก้ในวันเดียวกัน แล้วงานถูก commit
      เมื่อ 15:59 น. ของวันนั้นเอง ข้อความเดิมถูกเขียนจาก SUMMARY ของรอบที่ล้มกลางคัน
      จึงค้างอยู่ที่สถานะ "commit ไม่ได้" และไม่เคยถูกอัปเดตอีกเลย
      — รอบ 2026-08-15 ตรวจสอบแล้ว: เอา source ของ branch นั้นมารันจริง ได้ `npm test` = **144 ผ่าน**
      และ `npm run build` ผ่าน งานนั้นสมบูรณ์และเขียว
      — **ห้ามทำซ้ำ** การทำซ้ำ = เปิด PR ที่แก้ไฟล์ชุดเดียวกันซ้อนกันสองอัน สิ่งที่ต้องทำคือ merge PR นั้น
      ติ๊กช่องนี้ตอน merge เข้า main แล้ว (branch 1553 ติ๊กไว้ให้แล้วใน commit ของมันเอง)
      — `docs/autopilot/2026-08-13-undo-audit-findings.md` ยังเป็นบันทึกการวิเคราะห์ที่ถูกต้องอยู่
      แต่หัวข้อ Risk ข้อ 1 ของมัน (เรื่อง commit ไม่ได้) ล้าสมัยแล้ว
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ ครบทั้ง 4 ส่วน พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0020)
      1. `skip`: serving → skipped — `src/queue/queueActions.test.ts:32`
      2. หายจากจอลูกค้า — `src/screens/DisplayScreen.test.tsx` (เทสต์ใหม่ 2 ตัว: ไม่โผล่ทั้ง
         serving / next-up / upnext และไม่แย่ง spotlight "เตรียมตัว" จาก waiting ที่ใหม่กว่า)
      3. ขึ้นโซนพักไว้ — `src/screens/QueuePanel.test.tsx:93` (ทางอ้อม: ปุ่ม "เรียกซ้ำ" ถูก render
         เฉพาะในโซนพักไว้ ถ้าโซนไม่ขึ้น `getByRole` จะ throw)
      4. `recall` → serving + Display ประกาศ chime+flash — `queueActions.test.ts:37`
         + `DisplayScreen.test.tsx` (เทสต์ใหม่ 2 ตัว: chime 1 ครั้ง + flash ติด แล้วดับเองใน 2500ms)
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ ครบทั้งสามชั้น พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0031)
      1. action: `reannounce` เด้ง `announcedAt` เฉพาะ order ที่ serving — `src/queue/queueActions.test.ts:42`
      2. ปุ่ม 🔔 บนการ์ด serving เรียก action นั้นจริง — `src/screens/QueuePanel.test.tsx:98`
      3. ฟังก์ชันล้วน `newlyAnnounced` ยิงเมื่อ `announcedAt` เด้ง — `src/display/queueView.test.ts:29`
      4. **การต่อสาย (wiring) ระดับหน้าจอ** — `src/screens/DisplayScreen.reannounce.test.tsx` (ไฟล์ใหม่ 4 เทสต์
         บน branch นี้): order ที่ serving อยู่แล้ว พอ `announcedAt` เด้ง 100 → 200 ต้อง chime + flash ซ้ำ,
         เด้งของเลขหนึ่งไม่ลามไปเลขอื่นที่ serving อยู่, snapshot ที่เปลี่ยน `items` เฉยๆ ต้อง **ไม่** chime,
         และ flash ต้องดับเองใน 2500ms
      — mutation-check แล้ว: แก้ `DisplayScreen.tsx:26` เป็น `announcedAt: 0` คงที่ → เทสต์ใหม่แดง 3 จาก 4
      ขณะที่ `DisplayScreen.test.tsx` เดิม **เขียวครบทั้ง 4 ตัว** (นี่คือช่องว่างที่ปิดไปรอบนี้) แล้ว revert แล้ว
- [x] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
      — ✅ พิสูจน์ด้วยเทสต์ที่รันได้จริง (รอบ 2026-08-15_0042) **ไม่ได้แก้โค้ด production เลย
      `QueuePanel.tsx` เหมือน main ทุก byte** — ฟีเจอร์ถูกอยู่แล้ว ที่ขาดคือ *หลักฐาน*
      1. action: `callSpecific` → serving + servingAt + announcedAt, และคืน `null` ถ้าไม่ใช่ waiting
         — `src/queue/queueActions.test.ts:22`
      2. **การต่อสาย (wiring)** — `src/screens/QueuePanel.callSpecific.test.tsx` (ไฟล์ใหม่ 5 เทสต์):
         คิวรอ **3 ใบ** กดใบกลาง → เรียก `o2` ใบเดียว, วนกดครบทั้ง 3 ใบ ใบไหนก็เรียกเลขของตัวเอง,
         กดใบสุดท้ายก่อนแล้วค่อยใบแรก → ลำดับ `['o3','o1']` (นี่คือ "ข้ามลำดับได้" ตรงตัว),
         ปุ่ม "เรียก" ขึ้นเฉพาะ waiting, และไม่ข้ามสถานี
      — ⚠️ **ช่องว่างที่เจอและปิดไปรอบนี้:** เทสต์เดิม `QueuePanel.test.tsx:73` ใช้คิวรอแค่ **2 ใบ**
      แล้วกดใบที่ 2 — บน fixture 2 ใบ "ใบที่กด" กับ "ใบสุดท้าย" **แยกกันไม่ออก**
      mutation-check: แก้ `QueuePanel.tsx:88` ให้ปุ่มส่ง `waiting[waiting.length-1]` เสมอ
      → **เทสต์ทั้ง 131 ตัวของ main เขียวหมด** ทั้งที่ปุ่มพังแล้ว
      ส่วนไฟล์ใหม่แดง 3 จาก 5 ทันที (แก้เป็น `waiting[0]` ก็แดง 3 จาก 5 เหมือนกัน) — revert แล้ว
      — เทสต์ใหม่ยืนยันบน `updateOrderStatus.mock.calls` ด้วย `toStrictEqual` ไม่ใช่ `objectContaining`
      จึงจับได้ทั้ง id ที่ผิด, จำนวนครั้งที่เรียก, และ field ส่วนเกินใน patch
- [x] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
      — ✅ **ติ๊กในรอบ 2026-08-16_0030** หลังบั๊กข้อ ง. ถูกแก้แล้วจริง (ดูท้ายข้อ ง.)
      ⚠️ ติ๊กนี้ครอบคลุม **ฝั่ง client เท่านั้น** — ข้อ ค. (ไม่มี guard ฝั่งเซิร์ฟเวอร์)
      ยังเปิดอยู่และเป็นงานคนละระดับ บันทึกไว้เป็นช่องว่างที่รู้ตัว ไม่ใช่ "ไม่รู้"
      — ตรวจแล้วรอบ 2026-08-16_0007 (รอบนั้นยังไม่ติ๊ก เพราะบั๊กข้อ ง. ยังไม่ได้แก้)
      เทสต์ใหม่ 6 ตัวอยู่ที่ `src/screens/QueuePanel.idempotency.test.tsx` (ไฟล์ใหม่ล้วน ไม่แตะ production)
      **ก. "กดซ้ำ" — พิสูจน์แล้ว เขียว**
      1. กด "เรียกคิวถัดไป" 2 ครั้งรัวก่อน write กลับมา → ยิงที่ `o1` **ทั้งสองครั้ง** ไม่เลื่อนไป `o2`
         (นี่คือ "ไม่ดึงซ้อน" ตรงตัว — ถ้าเลื่อน ลูกค้าจะถูกเรียกพร้อมกันสองคนจากการกดรัวครั้งเดียว)
      2. กด "เสร็จ" 2 ครั้งรัว → snapshot ของ undo ยังชี้ที่ `serving` ของจริง ไม่ถูกครั้งที่ 2 ทับ
      **ข. "guard คืน no-op" — พิสูจน์แล้ว แต่เจอว่า guard ที่ plan ชี้ไว้เป็น dead code**
      3. ยกเลิกโดยไม่กรอกเหตุผล → ไม่ยิง write **และแถบ "ย้อนกลับ" ไม่โผล่**
      4. ยืนยันยกเลิกหลัง order หลุดจาก snapshot → ไม่ยิง write และไม่มีแถบย้อนกลับ
      5. order ที่ `done` แล้ว **ไม่ render ปุ่ม action ใดเลย** — render-gating คือด่านแรกจริงๆ
      — ⚠️ **`if (!patch) return` ที่ `QueuePanel.tsx:25` เข้าไม่ถึงเลยจากทาง UI**
      พิสูจน์แล้ว 2 ทาง: (1) ลบทิ้ง → เทสต์ทั้ง 137 ตัวเขียวหมด (2) เปลี่ยนเป็น `throw` →
      ก็ยังเขียวทั้ง 137 ตัว แปลว่าไม่มี path ไหนในชุดเทสต์เลยที่ทำให้ patch เป็น null
      เหตุผล: ทุกจุดที่เรียก `apply()` ถูก render-gate ไว้แล้วด้วยสถานะที่ `Q.*` ยอมรับพอดี
      → guard ตัวนี้เป็นด่านที่สอง ไม่ใช่ด่านแรก **mutation-check ตามที่ plan สั่งจึงไม่แดง
      และนั่นไม่ใช่ความล้มเหลวของเทสต์ แต่เป็นผลลัพธ์จริงที่ต้องบันทึก**
      — teeth ของเทสต์ใหม่ยืนยันด้วย mutation ที่เทสต์เดิมจับไม่ได้: ใส่ optimistic drop
      (`setOrders(prev => prev.filter(...))` หลัง `apply` ใน `doCallNext`) → เกิด double-pull จริง
      `[['o1',…],['o2',…]]` **เทสต์เดิม 22 ตัวเขียวหมด มีแต่เทสต์ใหม่ที่แดง** — revert แล้ว
      **ค. "สองเครื่องพร้อมกัน" — พิสูจน์ได้แค่ครึ่งเดียว**
      6. `callNext` เป็น pure function ของ snapshot และหยิบ waiting ที่เก่าสุดเสมอ → สองเครื่อง
         ที่อ่าน snapshot เดียวกันจะเลือก **ใบเดียวกัน** ไม่ใช่คนละใบ (ผลคือประกาศซ้ำ ไม่ใช่ดึงซ้อน)
      — ❌ **ช่องว่างที่พิสูจน์ไม่ได้ด้วยเทสต์ระดับนี้:** `updateOrderStatus` ที่
      `src/order/ordersRepo.ts:25-27` เป็น `updateDoc` เปล่าๆ **ไม่มี `runTransaction`
      ไม่มี precondition** → ฝั่งเซิร์ฟเวอร์ไม่มี guard เลย ทุกอย่างเป็น last-write-wins
      การรับประกัน idempotency ทั้งหมดจึงเป็น client-side ล้วน ถ้าจะปิดช่องนี้จริงต้องใช้
      `runTransaction` + อ่านสถานะปัจจุบันก่อนเขียน ซึ่งเกินขอบเขตของเทสต์ระดับ component
      **ง. 🐞 บั๊กจริงที่เจอรอบ _0007 — ✅ แก้แล้วในรอบ 2026-08-16_0030**
      เปิดแผงยกเลิกค้างไว้บนเครื่อง A แล้วเครื่อง B กด "เสร็จ" ใบเดียวกัน → พอเครื่อง A
      กด "ยืนยันยกเลิก" มันเขียนทับ order ที่ `done` แล้วให้กลายเป็น `cancelled` ได้จริง
      (รันจริงได้ `[["o1",{"status":"cancelled","cancelReason":"ลูกค้าเปลี่ยนใจ"}]]` ทั้งที่
      snapshot ล่าสุดเป็น `done`) เหตุ: `cancelId` เป็น state ที่อยู่นานกว่าการ์ดที่เปิดมัน
      และ `mine` กรองแค่ `station` ไม่ได้กรองสถานะ (`QueuePanel.tsx:18`) order ที่ `done`
      จึงยังหาเจอ แล้ว patch ของ "ยกเลิก" เป็น object literal ไม่ผ่าน `Q.*` จึงไม่มี guard
      — ⚠️ **branch `_1553` ไม่ได้แก้บั๊กนี้** (ตรวจแล้ว): `Q.cancel(reason)` ของมันที่
      `queueActions.ts:36-40` guard แค่ว่า reason ต้องไม่ว่าง **ไม่ได้ guard สถานะ order**
      บั๊กนี้จึงรอดข้าม merge ทั้ง 5 branch ไปอยู่บน main
      — **ไม่ได้เขียนเทสต์ pin บั๊กนี้ไว้** เพราะเทสต์ที่ยืนยันพฤติกรรมที่ผิดจะกลายเป็นตัวขวางตอนแก้
      — ✅ **แก้แล้วรอบ 2026-08-16_0030** (`fix(queue): stop a stale cancel panel…`)
      เพิ่ม `cancelPatch(order, why)` ที่ `QueuePanel.tsx` (module level เหนือ component)
      คืน `null` เมื่อสถานะเป็น `done`/`cancelled` แล้วให้ `confirmCancel` ส่งผ่าน `apply()`
      ตามแบบเดียวกับ action อื่นทุกตัว — **"ยกเลิก" เลิกเป็น action พิเศษที่ไม่มี guard แล้ว**
      — เทสต์ 6 ตัวที่ **ไฟล์ใหม่** `src/screens/QueuePanel.cancelGuard.test.tsx`
      (ไม่ได้ต่อท้าย `QueuePanel.idempotency.test.tsx` ตามที่ plan เขียนไว้ เพราะไฟล์นั้น
      มีอยู่เฉพาะบน branch `_0007` การสร้างซ้ำที่นี่จะเป็น add/add conflict ตอน merge)
      — **mutation-check แดงตรงจุด:** revert เหลือ object literal เดิม → เทสต์ใหม่แดง **2 ตัว**
      (เคส `done` และ `cancelled`) ขณะที่ **เทสต์เดิมทั้ง 131 ตัวเขียวหมด** — นี่คือขนาดของช่องว่าง
      ที่ปิดไป เทสต์ยกเลิกเดิมทุกตัว emit snapshot ครั้งเดียวแล้วไม่เปลี่ยนอีก จึงไม่มีตัวไหน
      อยู่ในช่วง "เปิดแผงค้างไว้" ซึ่งเป็นช่วงเดียวที่บั๊กมีตัวตน
      — ผลข้างเคียงที่ดี: `if (!patch) return` (`QueuePanel.tsx:25`) **เลิกเป็น dead code แล้ว**
      ตอนนี้มี path จาก UI ที่ทำให้ patch เป็น null จริง (ข้อ ข. ข้างบนบันทึกว่ามันเคยเข้าไม่ถึง)
- [x] Display: จัดกึ่งกลางทุกจอ (responsive), "เตรียมตัว" callout เด่น, skipped ไม่โชว์
      — ✅ **ติ๊กในรอบ 2026-08-16_0043** แบบเดียวกับข้อ Idempotency คือ 2 ส่วนพิสูจน์ได้จริง
      ส่วนที่ 3 **บันทึกเป็นช่องว่างที่รู้ตัว ไม่ใช่ "ไม่รู้"** (Goal นับข้อนี้ว่าเสร็จ)
      **ไม่ได้แก้ production code เลย `DisplayScreen.tsx` เหมือน main ทุก byte**
      1. **`skipped` ไม่โชว์ — ✅ พิสูจน์แล้วตั้งแต่รอบ `_0020`** (ดูช่อง No-show ส่วนที่ 2)
         ไม่ได้เขียนซ้ำตามที่ plan สั่ง — ระดับ pure function ก็มีอยู่แล้วที่
         `src/display/queueView.test.ts:14` (`upNextOrders` รับเฉพาะ `waiting`)
      2. **"เตรียมตัว" callout เด่น — ✅ พิสูจน์แล้วรอบนี้** เทสต์ 6 ตัวที่ **ไฟล์ใหม่**
         `src/screens/DisplayScreen.callout.test.tsx` (ไฟล์ใหม่ล้วน เพราะ `DisplayScreen.tsx`
         และ `DisplayScreen.test.tsx` ถูก `_0020`/`_0031` แก้ค้างไว้ — สร้างที่นี่ไม่ชนใคร):
         ไม่มี waiting เลย → callout **หายทั้งกล่อง**, waiting 3 ใบ → ได้ใบที่ `createdAt`
         เก่าสุด (ไม่ใช่ใบแรก/ใบสุดท้ายของ array), เลขใน callout **ไม่ถูกนับซ้ำ**ในแถบ upnext,
         waiting ใบเดียว → มี callout แต่ไม่มีแถบ upnext เลย, พอใบที่ spotlight ถูกเรียกไป
         serving แล้วใบถัดไป**รับช่วง callout ต่อ**, และ order ที่ `serving` **ไม่มีวันขึ้น callout**
      3. **จัดกึ่งกลาง responsive — ❌ ช่องว่างที่เทสต์ระดับนี้พิสูจน์ไม่ได้ (ตามที่ plan เตือนไว้)**
         jsdom ไม่ได้ layout จริง: `getBoundingClientRect` คืน 0 ทุกช่อง, Tailwind ไม่ถูก compile
         ในสภาพแวดล้อมเทสต์, และ `md:` breakpoint ประเมินไม่ได้เลยเพราะ `matchMedia` เป็น stub
         การ assert ว่า `className` มี `items-center justify-center` = **เขียนซ้ำ source ของ
         component ตัวเอง** ไม่ได้พิสูจน์ว่ามันจัดกึ่งกลางจริง แถมพังทันทีถ้า refactor ไป
         `grid place-items-center` ทั้งที่ผลลัพธ์เหมือนเดิม → teeth ติดลบ **จึงไม่เขียน**
         จะพิสูจน์ได้ต้องใช้ browser จริง + viewport จริง (Playwright/screenshot ที่ความกว้าง
         ที่ระบุ) ซึ่งต้องเพิ่ม dependency — **ผิด Out of scope ข้อ "ห้ามเพิ่ม dependency ใหม่"**
      — **mutation-check แดงตรงจุด และวัดขนาดช่องว่างได้ชัด** ลองสองแบบ:
         (ก) เปลี่ยน `const [next, ...rest] = upNext` (`DisplayScreen.tsx:25`) ให้หยิบใบ**สุดท้าย**
         → แดง 5 (ใหม่ 3 + **เดิม 2**) แปลว่าเทสต์เดิม**จับแบบนี้ได้อยู่แล้ว** — บันทึกตรงๆ ว่า
         **อันนี้ไม่ใช่ช่องว่าง** ไม่เคลมเกินจริง
         (ข) ทำ guard ของ callout อ่อนลง (`{next && (` → `{next !== null && (` + `next?.queueNumber`)
         = เคสจริงที่จอลูกค้าขึ้นกล่อง "เตรียมตัว" เปล่าค้างไว้ตลอดเวลาที่ไม่มีคิวรอ
         → **แดงแค่ 1 ตัว และเป็นเทสต์ใหม่ทั้งนั้น เทสต์เดิมทั้ง 131 ตัวเขียวหมด**
         — **นี่คือขนาดของช่องว่างที่ปิดไปรอบนี้** revert ทั้งสองแบบแล้ว
- [x] Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ (สี+ไอคอน+ขนาด; ไทยเด่น อังกฤษรอง)
      — ✅ **ติ๊กในรอบ 2026-08-16_0055** แบบเดียวกับข้อ Display: 2 ส่วนพิสูจน์ได้จริงด้วยเทสต์
      ส่วนที่เหลือ **บันทึกเป็นช่องว่างที่รู้ตัว ไม่ใช่ "ไม่รู้"** (Goal นับข้อนี้ว่าเสร็จ)
      **ไม่ได้แก้ production code เลย `DisplayScreen.tsx` และ `labels.ts` เหมือน main ทุก byte**
      เทสต์ใหม่ 9 ตัวใน **ไฟล์ใหม่ 2 ไฟล์** (ไม่ชนกับ branch ไหนเลย):
      `src/i18n/labels.coverage.test.ts` (4) + `src/screens/DisplayScreen.glanceable.test.tsx` (5)
      1. **"ไม่ต้องอ่านอังกฤษ" — ✅ พิสูจน์แล้วทั้งระดับข้อมูลและระดับ render**
         ระดับข้อมูล: `labels.coverage.test.ts` **อ่าน source ของ `DisplayScreen.tsx` จริง** แล้ว regex
         เก็บทุก `L('...')` call site ออกมา (+ `booth.*` ทั้ง 3 ซุ้ม ที่เป็น template literal จึงอ่านไม่ได้)
         แล้วยืนยันว่าทุก key มี `th` ที่ **มีอักษรไทยจริง** (ไม่ใช่แค่ "ไม่ว่าง") และ `th !== en`
         → key ใหม่ที่ลืมใส่ไทยจะแดงทันทีในอนาคต ไม่ต้องมีใครไปไล่ดูเอง
         มีเทสต์ guard กันการ "ผ่านแบบว่างเปล่า" ด้วย (ถ้า regex จับได้ 0 ตัวเพราะ refactor ไป `<BiLabel>`)
         ระดับ render: `DisplayScreen.glanceable.test.tsx` ยืนยันว่าข้อความไทยโผล่ใน DOM จริง
         ทั้งจอที่มีคิว (ชื่อซุ้ม, กำลังทำ, เตรียมตัว, คิวถัดไป) และจอว่าง (ยังไม่มีคิว) ครบทั้ง 3 ซุ้ม
      2. **"ไทยเด่น อังกฤษรอง" — ✅ พิสูจน์ได้ *ในเชิงลำดับการอ่าน*** ทุกคู่ไทย/อังกฤษบนจอ
         ยืนยันว่า `indexOf(ไทย) < indexOf(อังกฤษ)` ในสายข้อความเดียวกัน — เป็นสมบัติของ DOM จริงๆ
         ไม่ใช่การ assert className (ต่างจากเรื่องขนาด/สี ในข้อ 4)
      3. **ไอคอน — ✅ พิสูจน์แล้ว** 🔔 อยู่บนหัวข้อ "กำลังทำ" และ 👉 อยู่บนกล่อง "เตรียมตัว"
         อ่านผ่าน `getAllByRole('heading')` ไม่ต้องเพิ่ม `data-testid`
         + เลขคิวเป็น **ภาษา-อิสระ** จริง (`/^[A-Z]?\d+$/` ไม่มีคำอังกฤษปน)
      4. **สี + ขนาดตัวอักษร — ❌ ช่องว่างเดิม ไม่ได้เขียนเทสต์ (ตั้งใจ)** เหตุผลเต็มอยู่ในช่อง Display
         ส่วนที่ 3 ข้างบนแล้ว: jsdom ไม่ layout, Tailwind ไม่ถูก compile, `matchMedia` เป็น stub
         → assert `className` = เขียนซ้ำ source ตัวเอง teeth ติดลบ **ห้ามติ๊กด้วยหลักฐานปลอม**
      — 🐞 **ช่องว่างจริงของ *ตัวสินค้า* ที่เจอรอบนี้ (ยังไม่ได้แก้):** ป้ายสถานะมุมบนจอลูกค้า
      render แค่ `L('display.live').en` = **"LIVE" ล้วน** ทั้งที่ตาราง label มี `th: 'สด'` อยู่แล้ว
      (`src/screens/DisplayScreen.tsx:40`) — เป็นข้อความเดียวบนจอลูกค้าที่ไม่มีไทยเลย
      **ไม่ได้เขียนเทสต์ pin ไว้** เพราะเทสต์ที่ยืนยันพฤติกรรมที่ผิดจะกลายเป็นตัวขวางตอนแก้
      (บทเรียนเดียวกับบั๊กข้อ Idempotency ง.) และ **ไม่ได้แก้ในรอบนี้** เพราะงานรอบนี้คือ "ตรวจ"
      + `DisplayScreen.tsx` ถูก branch `_0020`/`_0031` แก้ค้างไว้ การแตะจะสร้าง conflict ให้กองที่รอ merge
      → ตัวแก้คือเปลี่ยนบรรทัดนั้นเป็น `{L('display.live').th} · {L('display.live').en}` (1 บรรทัด)
      **ควรทำหลัง merge กองปัจจุบันเสร็จ** ความเสี่ยงต่ำ (ป้ายสถานะ ไม่ใช่ข้อมูลที่ลูกค้าต้องใช้ตัดสินใจ)
      — **mutation-check แดงตรงจุด และเทสต์เดิมทั้ง 131 ตัวเขียวหมดทั้งสองแบบ** = ขนาดของช่องว่างที่ปิดไป
         (ก) `display.upNext` → `{ th: 'Up Next', en: 'Up Next' }` (เคสจริง: เพิ่ม/แก้ label แล้วลืมไทย)
         → **แดง 3 ตัว ใหม่ทั้งหมด** (`labels.coverage` 2 + `glanceable` 1)
         (ข) ลบ 👉 ออกจากหัวข้อ "เตรียมตัว" → **แดง 1 ตัว และเป็นเทสต์ใหม่**
         revert ทั้งสองแบบแล้ว (`git status` สะอาด)
- [x] เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms
      — ✅ **ติ๊กในรอบ 2026-08-17_0005** ครบทั้ง 2 ส่วน + ปิดช่องว่างเชิงอนาคตของส่วนที่ 3
      **ไม่ได้แก้ production code เลย** (เทสต์ใหม่ 7 ตัวใน **ไฟล์ใหม่** `src/order/promptpay.pin.test.ts`)
      1. **เทสต์เขียว + build ผ่าน — รันจริง จดตัวเลขจริง**
         `npm test` = **138 ผ่าน / 40 ไฟล์** บน branch นี้ (บน main = 131 / 39 — รันยืนยันแล้วต้นรอบ)
         `npm run build` = `tsc -b` + `vite build` ผ่าน
         PWA: **`dist/sw.js` + `dist/manifest.webmanifest` ถูกสร้างจริง** (`generateSW`, precache 5 entries)
         — **จดไว้เฉยๆ ตามที่ plan สั่ง ไม่ได้ไปติ๊กช่อง `PWA generate` ของ `ui-overhaul`** (คนละข้อ คนละรอบ)
      2. **"ไม่เปลี่ยน logic บัญชี/เมนู/comms" — ✅ จริง พิสูจน์ด้วย `git diff` ไม่ใช่เทสต์**
         เทียบ `abd1288` (parent สายหลักของ merge Queue Pro-Upgrade `81763eb`, 4 ส.ค.) → `main` (`a505b12`)
         ไฟล์พวกนี้ **ไม่เปลี่ยนเลยแม้แต่ไบต์เดียว**: `src/order/buildOrder.ts`, `cart.ts`, `options.ts`,
         `promptpay.ts`, `queueNumber.ts`, `src/domain/catalog.ts` (**เมนูอยู่ที่นี่ ไม่มี `src/menu/`**),
         `src/comms/commsLogic.ts`, `commsRepo.ts`, `types.ts`, `src/dashboard/metrics.ts`,
         `src/expense/expensesRepo.ts`
         — มี 2 ไฟล์ใน `src/domain/` ที่เปลี่ยน **และทั้งคู่ไม่ใช่ logic บัญชี/เมนู/comms**:
         (ก) `types.ts` — เพิ่ม `'skipped'` เข้า `OrderStatus` + `announcedAt?` = ตัวฟีเจอร์คิวเอง (เพิ่มล้วน)
         (ข) `appConfig.ts` — commit `17e8c2e` ย้าย `promptpayId`/`dashboardPin` ไป `import.meta.env`
             = config ของ deploy ไม่ใช่สูตรคำนวณ (สูตรอยู่ `promptpay.ts` ซึ่งไม่เปลี่ยน)
      3. **ส่วนที่ *เคย* เป็นช่องว่างเชิงอนาคต — ตรวจครบทุกไฟล์ ปิดไป 1 ไฟล์**
         เปิดอ่านเทสต์ของทุกไฟล์ในข้อ 2 ว่า assert *ตัวเลขจริง* หรือแค่ "ถูกเรียก":
         `buildOrder` (total=85), `cart` (45+70, subtotal 90), `options` (delta 10, unit 45),
         `catalog` (35/7.86, 25/3, [35,25], [14,10], topping [0,10,10]), `metrics` (netDonation=50,
         expectedCash=40, bestSellers ทั้ง object), `commsLogic` (threshold 90s ทั้งสองฝั่ง)
         → **ทั้งหมดปักตัวเลขจริงอยู่แล้ว** `commsRepo` เป็น repo บางๆ assert payload เป๊ะบน mock = พอดีระดับ
         — 🐞 **ยกเว้น `promptpay.test.ts` ซึ่งเป็นเทสต์กลวง** assert แค่ "เป็น string", "ยาว > 0",
         "ขึ้นต้น `00020101`", "คนละ amount ได้คนละค่า", "deterministic" — **ทุกข้อรอดหมดถ้า amount ผิด**
         เพราะยอดที่ผิดก็ยัง deterministic และยังขึ้นต้นด้วย header เหมือนเดิม
         **mutation-check วัดขนาดช่องว่างได้ตรงๆ (รันจริงทั้งสองแบบ แล้ว revert แล้ว `git status` สะอาด):**
         (ก) `{ amount: amount * 2 }` = **เก็บเงินลูกค้าเป็น 2 เท่าทุกใบ** → **เทสต์ทั้ง 131 ตัวของ main
             เขียวหมด** หลังเพิ่มไฟล์ใหม่ → **แดง 2 ตัว และเป็นเทสต์ใหม่ทั้งคู่**
         (ข) ส่ง id ตายตัว `'0899999999'` = **เงินเข้าบัญชีคนอื่นทุกใบ** → main เขียวหมดเหมือนกัน
             หลังเพิ่มไฟล์ใหม่ → **แดง 1 ตัว และเป็นเทสต์ใหม่**
         เทสต์ใหม่ถอด EMVCo TLV เองในไฟล์เทสต์ (**ไม่เพิ่ม dependency**) แล้วปัก: ยอดเงิน (tag 54
         รวมทศนิยม 2 ตำแหน่ง), สกุลเงิน 764 + ประเทศ TH, ปลายทางเป็น id ที่ส่งเข้าไปในรูปสากล (tag 29),
         `01 = 12` (ยอดถูกล็อก ลูกค้าพิมพ์ยอดเองไม่ได้) และ CRC16 ถูกต้อง + เทสต์ยืนยันว่า CRC มีฟัน
      — ⚠️ **ช่องว่างของ *ตัวสินค้า* ที่เจอรอบนี้ (ยังไม่ได้แก้ ไม่ได้เขียนเทสต์ pin ไว้):**
      `appConfig.ts` fallback เป็น `?? ''` แล้ว `promptpay-qr` **ไม่ throw เมื่อ id ว่าง** — ตรวจจริงแล้ว
      มันคืน payload ที่ *หน้าตาถูกต้องทุกอย่าง* แต่จ่ายไปที่ id `0000000000000`
      (`00020101021229370016A000000677010111011300000000000005802TH5303764540535.00630473F2`)
      → ถ้า build โดยลืมตั้ง `VITE_PROMPTPAY_ID` จอจะขึ้น QR ที่สแกนแล้วเงินไม่เข้าใคร
      **และระบบยังบันทึก `paymentStatus: 'paid'` ให้ตามปกติ** (`buildOrder.ts:22` ตั้งค่าตายตัว)
      = ยอดขายหายแบบเงียบๆ ทั้งงาน ไม่ได้เขียนเทสต์ปักไว้เพราะจะกลายเป็นตัวขวางตอนแก้
      (บทเรียนเดียวกับบั๊กข้อ Idempotency ง.) ตัวแก้ที่ควรทำ: ให้ `buildPromptPayPayload` โยน error
      เมื่อ id ว่าง **หรือ** ให้หน้าจอ order ซ่อนช่องทาง QR ไปเลยเมื่อ config ไม่ครบ — **คนละข้อ คนละรอบ**

**จาก `2026-08-03-ui-overhaul-design.md`**

- [ ] ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)
- [ ] อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ — ไม่มี horizontal scroll, touch target ≥44px
- [ ] tests เขียวครบ + `npm run build` ผ่าน + PWA generate
      — ⚠️ **ตรวจครบแล้วรอบ 2026-08-17_0023 แต่ *ยังติ๊กไม่ได้* และรู้ชัดแล้วว่าติดตรงไหน**
      ต่างจากข้อที่ติ๊กไปก่อนหน้า: ช่องว่างที่เหลือ **ไม่ใช่** "เทสต์ระดับนี้พิสูจน์ไม่ได้"
      แต่เป็น **ตัวสินค้าขาดของจริง** — ปิดได้ด้วยการเพิ่มไฟล์ไอคอน ไม่ใช่ด้วยการเขียนเทสต์เพิ่ม
      **ไม่ได้แก้ production code เลย `vite.config.ts` เหมือน main ทุก byte**
      1. **"tests เขียว + build ผ่าน" — ✅ รันจริงรอบนี้ จดตัวเลขจริง**
         `npm test` บน main (ต้นรอบ) = **131 ผ่าน / 39 ไฟล์**; บน branch นี้ = **137 / 40**
         `npm run build` = `tsc -b` + `vite build` ผ่าน (เตือนเรื่อง chunk > 500 kB เท่านั้น ไม่ใช่ error)
      2. **"PWA generate" — ส่วน service worker ✅ ครบจริง ตรวจถึงการต่อสายแล้ว**
         `dist/sw.js` + `dist/workbox-9c191d2f.js` + `dist/registerSW.js` ถูกสร้าง (`generateSW`, precache 5)
         และ **`dist/index.html` เรียก `registerSW.js` จริง** — บรรทัดที่ปลั๊กอินฉีดเข้ามา:
         `<script id="vite-plugin-pwa:register-sw" src="/registerSW.js">` + `<link rel="manifest" …>`
         → ข้อสงสัยของ plan ที่ว่า "เช็คด้วยว่า index.html เรียก registerSW.js จริงไหม" = **เรียกจริง**
      3. **❌ ช่องว่างที่ทำให้ติ๊กไม่ได้: `manifest.icons` เป็น array ว่าง** (`vite.config.ts:17`)
         build จริงรอบนี้ให้ `dist/manifest.webmanifest` ทั้งไฟล์เท่ากับของรอบ `_0005` เป๊ะ:
         `{"name":"สายสัมพันธ์ ม.6/7","short_name":"Sai Samphan","start_url":"/","display":"standalone",`
         `"background_color":"#1A1A1A","theme_color":"#1A1A1A","lang":"en","scope":"/","icons":[]}`
         → ติดตั้งลงโฮมสกรีน iPad แล้ว **ไม่มีไอคอนแอป** (ต้องมีอย่างน้อย 192×192 + 512×512)
         — เจอเพิ่มรอบนี้: `index.html` ก็**ไม่มี `<link rel="apple-touch-icon">`** ด้วย ซึ่งเป็นทาง
         ที่ Safari บน iOS ใช้จริงเมื่อ manifest ไม่มีไอคอน → บน iPad จึงไม่มี fallback เหลือเลย
         — และ `lang` เป็น `"en"` (ค่า default ของปลั๊กอิน) ทั้งที่ `index.html` เป็น `lang="th"`
         **ตัวแก้ = เพิ่ม `icons` + `lang: 'th'` ใน `VitePWA({ manifest: … })` ของ `vite.config.ts`
         พร้อมไฟล์รูปจริงใน `public/`** — เป็นงาน asset ที่ต้องมีคนตัดสินใจว่าเอารูปจากไหน
         **ไม่ได้ทำในรอบนี้ตามที่ plan สั่ง และไม่ได้เขียนเทสต์ที่ *เรียกร้อง* ไอคอน** เพราะเทสต์แบบนั้น
         จะแดงทันทีและทำให้ Verify ล้มทั้งที่ยังไม่มีใครแก้ได้ (บทเรียนเดียวกับบั๊กข้อ Idempotency ง.)
      4. **สิ่งที่ปิดไปได้จริงรอบนี้: manifest มีตาข่ายกันถอยหลังแล้ว** เทสต์ใหม่ 6 ตัวใน **ไฟล์ใหม่**
         `src/pwaConfig.test.ts` (ไฟล์ใหม่ล้วน ไม่ชน branch ไหน) — ก่อนหน้านี้ **ไม่มีเทสต์แม้แต่ตัวเดียว
         ที่แตะ `vite.config.ts`** ใครลบ field ใน manifest ทิ้ง build ก็ยังเขียวเงียบๆ
         วิธี: `vi.mock('vite-plugin-pwa')` ให้ `VitePWA()` กลายเป็นตัวบันทึก option แล้ว `import`
         `../vite.config` → ได้ object จริงที่ config ส่งเข้าไป **ไม่ต้องรัน build ไม่ต้อง regex source**
         (ลองทางตรงแล้วไม่ได้: `api.webManifestData` ของปลั๊กอินยังเป็น `undefined` จนกว่า
         `configResolved` จะทำงาน — จึงอ่านจากตัว config เปล่าๆ ไม่ได้)
         ปักไว้: `registerType: 'autoUpdate'`, `name`/`short_name`, `display`/`theme_color`/`background_color`,
         `icons` ต้องยังเป็น array อยู่, และ **icon ทุกตัวที่ประกาศต้องมี `src`+`sizes`+`type`ครบ**
         (ข้อหลังตอนนี้ผ่านแบบไม่มีอะไรให้ตรวจ แต่จะ *มีฟัน* ทันทีที่ไอคอนถูกเพิ่มเข้ามาในรอบหน้า)
         + เทสต์ guard กัน "ผ่านแบบว่างเปล่า" (ถ้ามีคนถอด `VitePWA()` ออก เทสต์ที่เหลือจะอ่าน
         `undefined?.field` แล้วเขียวหมดทั้งชุด)
      — **mutation-check แดงตรงจุด รันจริงทั้ง 3 แบบ แล้ว revert แล้ว (`git status` สะอาด):**
         (ก) ลบ `short_name` ออกจาก manifest → **แดง 1 ตัว เป็นเทสต์ใหม่ เทสต์เดิมทั้ง 131 ตัวเขียวหมด**
         (ข) `registerType: 'autoUpdate'` → `'prompt'` (เคสจริง: จอซุ้มที่เปิดค้างทั้งวันจะค้างอยู่ที่
             โค้ดเวอร์ชันเก่าจนกว่าจะมีคนมากดยืนยัน) → **แดง 1 ตัว เป็นเทสต์ใหม่ เดิมเขียวหมด**
         (ค) `icons: [{ src: '/pwa-192.png' }]` (เคสจริง: รอบหน้าเพิ่มไอคอนแล้วลืม `sizes`/`type`)
             → **แดง 1 ตัว** = ยืนยันว่าเทสต์ well-formed มีฟันจริงตอนที่มีของให้ตรวจ
- [x] Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)
      — ✅ **ติ๊กในรอบ 2026-08-17_0039** พิสูจน์ด้วย **git history ไม่ใช่เทสต์** (ตามที่ plan สั่ง)
      **ไม่ได้แก้ไฟล์โค้ดเลยแม้แต่ไบต์เดียว และไม่ได้เพิ่มไฟล์เทสต์** รอบนี้แตะแค่ `AUTOPILOT.md` + `SUMMARY.md`
      **ฐานเทียบที่ใช้ (จดไว้ให้รอบหลังตรวจซ้ำจากจุดเดียวกันได้):**
      merge ของ UI overhaul = `4c8a5d6` → parent สายหลัก = **`3304e66`** (`docs: UI overhaul implementation plan`)
      ช่วงที่ตรวจ = `3304e66..4c8a5d6` (**24 ไฟล์**, +617/−315) และตรวจซ้ำสะสมถึง main ด้วย `3304e66..main`
      1. **ไฟล์ที่ต้อง "ไม่เปลี่ยนเลย" — ไม่เปลี่ยนสักไฟล์ ทั้งสองช่วง** (`git diff --name-only` คืนว่าง):
         `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `src/lib/firebase.ts`(+`.test.ts`),
         `src/order/ordersRepo.ts`, `src/comms/commsRepo.ts`, `src/expense/expensesRepo.ts`,
         `buildOrder.ts`, `cart.ts`, `options.ts`, `promptpay.ts`, `queueNumber.ts`, `catalog.ts`,
         `commsLogic.ts`, `metrics.ts`
         — ⚠️ **sanity check ของ pathspec (สำคัญ: "diff ว่าง" ไม่มีค่าถ้า pathspec จับไฟล์ไม่ได้ตั้งแต่แรก):**
         `src/domain/types.ts` โผล่ในช่วง `3304e66..main` จริง = คำสั่งจับไฟล์เป็น; และเจอว่า `src/firebase*`
         **ไม่ match อะไรเลย** เพราะไฟล์จริงอยู่ที่ `src/lib/firebase.ts` → เขียนเป็น path เต็มแล้วตรวจซ้ำ
      2. **24 ไฟล์ที่เปลี่ยนจริง — ไล่อ่านครบทุกไฟล์ ตกอยู่ใน 3 หมวดที่เกณฑ์อนุญาตทั้งหมด**
         (ก) **Tailwind/token:** `tailwind.config.js` (เพิ่มสี surface/line/muted/success/danger + boxShadow glow),
             `src/index.css` (`html{font-size:120%}` = base +20%, `.glow-o`/`.glow-y`), `src/theme.ts` +`theme.test.ts`
         (ข) **`src/ui/` ของใหม่ล้วน:** `Button`, `Panel`, `Chip`, `StatTile`, `QueueNumber` + เทสต์ 2 ไฟล์
         (ค) **presentation:** `App.tsx`, `PinGate.tsx`, `SetupScreen`, `OrderStation`, `QueuePanel`,
             `DashboardScreen`, `DisplayScreen`, `AlertButtons`, `BroadcastBar`, `CommsToast`, `PresenceBoard`,
             `labels.ts` (**เพิ่ม 2 key: `order.hasOptions`, `display.live` — เพิ่มล้วน ไม่แก้ของเดิม**)
         — ตรวจถึงระดับ **hunk header** (`git diff -U0`) ไม่ใช่แค่ `--stat`: ในไฟล์ component ทุกไฟล์
         hunk ที่ไม่ใช่ import ตกอยู่ **ใต้ `return (`ทั้งหมด** = ครึ่งบนที่เป็น hook/handler ไม่ถูกแตะ
         ยืนยันเพิ่มว่า call site ของ logic เหมือนเดิมเป๊ะ: `buildPromptPayPayload(APP_CONFIG.promptpayId, total)`,
         `lineUnitPrice(p, line.selections) * line.qty`, `setQty(...)`, `ackMessage(top.id, me)`,
         `fire({...base(), kind, ...})`, `m.*` ทุกตัวของ dashboard (ทั้ง 8 `data-testid` เดิมยังอยู่ครบ)
      3. **ข้อยกเว้นเดียวที่ *ไม่ใช่* presentation — บันทึกตรงๆ ไม่กลบ:** `.gitignore` +3 บรรทัด
         (`.firebase/` cache, commit `b2a732b` ที่ไหลมาอยู่ในช่วงเดียวกัน) — **ไม่ใช่ Firestore ไม่ใช่ logic**
         จึงไม่ละเมิดเกณฑ์ แต่ก็ไม่ใช่ presentation ตรงตัว ผู้ตรวจควรรู้ว่ามีไฟล์นี้อยู่ในช่วง
      4. **3 จุดที่ *พฤติกรรม* เปลี่ยนแม้จะอยู่ในไฟล์ presentation (ตรวจแล้วไม่มีข้อไหนเป็นบัญชี/เมนู/comms):**
         (ก) `PinGate.tsx` เพิ่ม `onKeyDown` → กด Enter = submit (ตัว `unlockDashboard` ไม่เปลี่ยน)
         (ข) `DisplayScreen.tsx` เพิ่มฟังก์ชัน `itemDetail()` **เหนือ component** (hunk เดียวในกองที่อยู่เหนือ
             `return (`) = ตัวจัดรูปข้อความล้วน ทำให้จอลูกค้าโชว์รายการสินค้าใต้เลขคิว **ข้อมูลใหม่บนจอ
             แต่ไม่ใช่การคิดเงิน** อ่านจาก `o.items` ที่มีอยู่แล้ว
         (ค) `OrderStation.tsx` ย้ายแผงเลือกตัวเลือกไปเป็น modal (`fixed inset-0`) + เพิ่มชิป "มีตัวเลือก"
             — ตรรกะ `confirmPick`/`pick` เหมือนเดิมทุกบรรทัด
      — 🔗 เชื่อมกับช่อง **Display glanceable**: ป้าย `LIVE` ที่ไม่มีไทย **เกิดที่ commit นี้เอง**
      (`89ed450 feat(ui): restyle Display screen…` ใส่ `{L('display.live').en}` ใน header) ไม่ใช่ของเก่าตกค้าง
      — Verify รอบนี้: `npm test` = **131 ผ่าน / 39 ไฟล์** (เท่ากับ main พอดี เพราะรอบนี้ไม่ได้เพิ่มเทสต์),
      `npm run build` ผ่าน (`generateSW`, precache 5 entries; เตือน chunk > 500 kB เหมือนเดิม)
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

ตรวจข้อ **Display เลขคิวสเกลใหญ่ตามจอด้วย clamp** ของ `2026-08-03-ui-overhaul-design.md`

**สองข้อก่อนหน้าตรวจครบแล้ว อย่าทำซ้ำ** — ผลอยู่ในช่องของมันเอง:
`tests+build+PWA generate` (รอบ `_0023`, ยังไม่ติ๊กเพราะ `manifest.icons` ว่าง = งานของคน) และ
`Firestore/logic ไม่เปลี่ยน` (รอบ `_0039`, **ติ๊กแล้ว** ฐานเทียบ `3304e66..4c8a5d6`)

**ข้อนี้ตรวจได้จริงต่างจากข้อ "จัดกึ่งกลาง responsive"** เพราะ `clamp()` เป็น *ค่าที่เขียนอยู่ในซอร์ส*
ไม่ต้องให้ jsdom คำนวณ layout — สำรวจไว้แล้วรอบ `_0039` (ยังไม่ได้เขียนเทสต์ ปล่อยให้เป็นงานรอบหน้า):
- `src/ui/QueueNumber.tsx:3` — `size="display"` → `text-[clamp(96px,22vw,320px)] leading-none glow-o`
  ส่วน `size="card"` → `text-5xl` (ไม่ clamp — **ตั้งใจ** เพราะการ์ดในแผงคิวไม่ได้สเกลตามจอ)
- `src/screens/DisplayScreen.tsx:83` — กล่อง "เตรียมตัว" ใช้ `text-[clamp(56px,10vw,140px)]` ของตัวเอง
  (**ไม่ได้ผ่าน `QueueNumber`** — เป็นจุดที่หลุดง่ายที่สุดถ้ามีคน refactor)
**วิธีทำที่แนะนำ:** ไฟล์เทสต์ใหม่ `src/ui/QueueNumber.clamp.test.tsx` (ไฟล์ใหม่ล้วน ไม่ชน branch ไหน)
→ `render(<QueueNumber value="A12" size="display" />)` แล้วอ่าน `className` จาก `container`
ปักว่า **มี `clamp(` จริง** และ **ค่ากลางเป็นหน่วย viewport (`vw`)** = ข้อความจริงของเกณฑ์ "สเกลใหญ่ตามจอ"
+ ปักว่า `size="card"` **ไม่มี** clamp (กันการเผลอเอา display scale ไปใส่การ์ด)
⚠️ นี่เป็นการ assert `className` ซึ่งปกติ teeth ติดลบ (เขียนซ้ำ source) — **ข้อนี้เป็นข้อยกเว้นที่รับได้**
เพราะเกณฑ์เขียนชื่อเทคนิค `clamp` มาตรงๆ ระดับซอร์ส แต่ **ห้ามไป assert ตัวเลข 96/22/320 แบบเป๊ะ**
(ค่าปรับได้ตามงานออกแบบ ปักไว้จะกลายเป็นตัวขวาง) — ปักแค่ *รูปแบบ* ด้วย regex เช่น `/clamp\([^)]*vw/`
⚠️ ส่วนของ `DisplayScreen.tsx:83` **อย่าแตะไฟล์นั้น** (`_0020`/`_0031` ค้างอยู่) ถ้าจะปักให้ทำแบบ
`labels.coverage.test.ts` ของรอบ `_0055` คือ `readFileSync` อ่านซอร์สแล้ว regex — และ**ต้องมีเทสต์ guard
กันผ่านแบบว่างเปล่า** ถ้า regex จับได้ 0 ตัว
**mutation-check ที่ต้องรัน:** เปลี่ยน `text-[clamp(96px,22vw,320px)]` เป็น `text-8xl` คงที่ →
เทสต์ใหม่ต้องแดง เทสต์เดิม 131 ตัวต้องเขียวหมด (นั่นคือขนาดของช่องว่าง) แล้ว revert

**ลำดับที่แนะนำหลังจากนั้น:** ไปกอง `hq-comms` ซึ่งยังไม่มีหลักฐานเลยสักข้อ
(เริ่มจาก `Donation thermometer` เพราะ `metrics.ts` ปักเลขไว้แล้ว เหลือแค่พิสูจน์ *การต่อสาย*
ไปที่หน้าจอ — เป็นแพตเทิร์นเดียวกับรอบ `_0031`/`_0042` ที่ได้ผลมาแล้ว)
เหลือใน `ui-overhaul` อีก 2 ข้อที่ **ตรวจด้วยเทสต์ระดับนี้ไม่ได้** (`Neon Clarity สม่ำเสมอ`,
`อ่านง่ายบน iPad/มือถือ ไม่มี horizontal scroll, touch target ≥44px`) — ทั้งคู่ต้องการ browser จริง
= ชนกำแพงเดียวกับ "จัดกึ่งกลาง responsive" **อย่าเผาทั้งรอบไปกับมัน** ถ้าถึงคิว ให้บันทึกเป็นช่องว่าง
ที่รู้ตัวแล้วข้าม (หมายเหตุ: `min-h-[44px]` ถูกใส่ไว้ทั่วทุกปุ่มแล้วตั้งแต่ UI overhaul — grep ดูได้
แต่ "ไม่มี horizontal scroll" พิสูจน์ไม่ได้ถ้าไม่มี viewport จริง)

⚠️ ไฟล์ที่ branch อื่นแก้ค้างไว้ (ห้ามแตะถ้าเลี่ยงได้): `DisplayScreen.tsx`, `DisplayScreen.test.tsx`
(`_0020`/`_0031`), `queueActions.*`, `ordersRepo.*`, `QueuePanel.tsx` (`_1553`/`_0030`)

หมายเหตุวิธีทำงานที่ได้ผลสองรอบติด (0031, 0042) และควรทำต่อ: เมื่อช่องว่างอยู่ที่ **การต่อสาย**
ให้เขียนเทสต์ไว้ในไฟล์ใหม่ และหลีกเลี่ยงการเพิ่ม `data-testid` ลงในไฟล์ component
(อ่านจาก `container`/role ที่ `render()` คืนมาแทน) วิธีนี้ได้หลักฐานครบโดยไม่แตะไฟล์ที่ branch อื่น
ค้างไว้เลย — merge ได้สะอาด **และให้ยืนยันด้วย `toStrictEqual` บน `mock.calls` เสมอ**
เพราะ `objectContaining`/`toHaveBeenCalledWith` มองข้ามทั้ง field ส่วนเกินและจำนวนครั้งที่เรียก

---

### ค้างอยู่ที่คน ไม่ใช่ agent (ทำคู่ขนานได้ ไม่บล็อกงานข้างบน)

🐞 **เรื่องด่วนกว่าการ merge:** บั๊ก "แผงยกเลิกที่เปิดค้างไว้เขียนทับ order ที่ `done` แล้ว"
ทำให้ **ยอดขายหายได้** (ดูช่อง Idempotency ข้อ ง.) — **ตอนนี้มีตัวแก้แล้ว** บน branch
`auto/Booth_Management_6_7/2026-08-16_0030` แต่ **บั๊กยังอยู่บน main จนกว่า branch นั้นจะ merge**
ถ้างานซุ้มยังเปิดใช้อยู่ ควรบอกคนหน้างานว่า "อย่าเปิดแผงยกเลิกค้างไว้" จนกว่าจะ merge เสร็จ
👉 **ถ้าจะ merge อันเดียว ให้ merge อันนี้ก่อนเพื่อน** — เป็น branch เดียวที่แก้ยอดขายหายจริง

🎨 **งานที่ agent ทำต่อเองไม่ได้ เพราะต้องมีไฟล์รูป:** PWA ยังไม่มีไอคอน (`manifest.icons` ว่าง
+ `index.html` ไม่มี `apple-touch-icon`) → ติดตั้งลงโฮมสกรีน iPad แล้วได้ไอคอนเปล่า
สิ่งที่ต้องทำ: วางไฟล์ `public/pwa-192.png` + `public/pwa-512.png` (และ `apple-touch-icon-180.png`)
แล้วเติมลง `VitePWA({ manifest: { icons: [...], lang: 'th' } })` ใน `vite.config.ts`
— เทสต์ `src/pwaConfig.test.ts` จะตรวจให้เองว่า icon ทุกตัวมี `src`/`sizes`/`type` ครบ
**ห้าม agent สร้างรูปเอง** ต้องเป็นโลโก้จริงของงาน ไม่ใช่ placeholder ที่จะติดไปถึงวันงาน

**ตอนนี้มี branch ค้างรอ merge 12 อัน กองสูงขึ้นทุกรอบ** — agent push/merge เองไม่ได้ (ไม่มีสิทธิ์ push/gh)
แนะนำให้ merge ตามลำดับนี้ (เรียงจากชนน้อยไปมาก):

1. `auto/Booth_Management_6_7/2026-08-15_0008` — แก้ข้อความ plan อย่างเดียว (แตะแค่ `AUTOPILOT.md`, `SUMMARY.md`)
2. `auto/Booth_Management_6_7/2026-08-13_1553` — ข้อ **Undo** แตะ `queueActions.*`, `ordersRepo.*`, `QueuePanel.*`
3. `auto/Booth_Management_6_7/2026-08-15_0020` — ข้อ **No-show** แตะ `DisplayScreen.tsx` + `DisplayScreen.test.tsx`
4. `auto/Booth_Management_6_7/2026-08-15_0031` — ข้อ **ประกาศซ้ำ** เพิ่มไฟล์ใหม่ไฟล์เดียว ไม่ชนโค้ดกับใครเลย
5. `auto/Booth_Management_6_7/2026-08-15_0042` — ข้อ **เรียกเจาะจง** เพิ่มไฟล์ใหม่ไฟล์เดียว ไม่ชนโค้ดกับใครเลย
6. `auto/Booth_Management_6_7/2026-08-16_0007` — ข้อ **Idempotency** เพิ่มไฟล์ใหม่ไฟล์เดียว ไม่ชนโค้ดกับใครเลย
   (`QueuePanel.idempotency.test.tsx`) + เป็น branch ที่บันทึกบั๊กข้างบนไว้
7. `auto/Booth_Management_6_7/2026-08-16_0030` — 🐞 **ตัวแก้บั๊กยอดขายหาย** + ไฟล์ใหม่
   `QueuePanel.cancelGuard.test.tsx` แตะ `QueuePanel.tsx` 2 hunk เล็ก
   — **ถ้าเร่งด่วน เอาอันนี้ขึ้นก่อนได้เลย** มันไม่ขึ้นกับ 6 อันข้างบน (แยก merge จาก main ได้)
8. `auto/Booth_Management_6_7/2026-08-16_0043` — ข้อ **Display (callout)** เพิ่มไฟล์ใหม่ไฟล์เดียว
   (`DisplayScreen.callout.test.tsx`) **ไม่แตะ production code เลย** ไม่ชนโค้ดกับใครทั้งสิ้น
9. `auto/Booth_Management_6_7/2026-08-16_0055` — ข้อ **Display glanceable** เพิ่มไฟล์ใหม่ 2 ไฟล์
   (`src/i18n/labels.coverage.test.ts`, `src/screens/DisplayScreen.glanceable.test.tsx`)
   **ไม่แตะ production code เลย** ไม่ชนโค้ดกับใครทั้งสิ้น
   📌 เกี่ยวกับ 0020/0031 แบบเดียวกับ 0043: เทสต์ glanceable **อ่าน source ของ `DisplayScreen.tsx`
   ด้วย `readFileSync`** (เพื่อเก็บ `L('...')` call site ทุกตัว) ถ้า 0020/0031 ย้าย label
   ไปไฟล์อื่นหรือเปลี่ยนไปใช้ `<BiLabel>` เทสต์ guard จะแดง — **ตั้งใจให้แดง ไม่ใช่ conflict**
10. `auto/Booth_Management_6_7/2026-08-17_0005` — ข้อ **tests+build+ไม่เปลี่ยน logic** เพิ่มไฟล์ใหม่
    ไฟล์เดียว (`src/order/promptpay.pin.test.ts`) **ไม่แตะ production code เลย** ไม่ชนโค้ดกับใคร
11. `auto/Booth_Management_6_7/2026-08-17_0023` — ข้อ **PWA generate (ตรวจแล้ว ยังไม่ติ๊ก)**
    เพิ่มไฟล์ใหม่ไฟล์เดียว (`src/pwaConfig.test.ts`) **ไม่แตะ production code เลย** ไม่ชนโค้ดกับใคร
    — เป็นไฟล์เทสต์แรกของโปรเจคที่แตะ `vite.config.ts` ถ้ารอบหลังมีใครแก้ manifest ให้ดูไฟล์นี้ด้วย
12. `auto/Booth_Management_6_7/2026-08-17_0039` — ข้อ **Firestore/logic ไม่เปลี่ยน (ติ๊กแล้ว)**
    **ไม่มีไฟล์โค้ดเลย** แตะแค่ `AUTOPILOT.md` + `SUMMARY.md` (เป็นข้อที่พิสูจน์ด้วย git history)
    → merge อันไหนก่อนก็ได้ ไม่ชนโค้ดกับใครทั้งสิ้น

ทุกอันจะ conflict กันที่ `AUTOPILOT.md` และ `SUMMARY.md` เท่านั้น (ทุก branch เขียนสองไฟล์นี้)
วิธีแก้: เอาของ branch ที่ใหม่กว่าเสมอ — ของ 0042 เป็น superset ของ 0031, 0020 และ 0008 อยู่แล้ว
ฝั่ง **โค้ด** ไม่ชนกันเลยสักคู่ (1553 = queue/order, 0020 = DisplayScreen, 0031 + 0042 + 0007 + 0043 = ไฟล์ใหม่ล้วน)
📌 **0043 ↔ 0020 ไม่ conflict แต่เกี่ยวกัน:** เทสต์ของ 0043 อ่านผ่าน `data-testid` ที่มีอยู่บน main
อยู่แล้ว (`serving`, `next-up`, `upnext`) ส่วน 0020 แก้ `DisplayScreen.tsx` ไฟล์เดียวกัน
ถ้า 0020 เปลี่ยนชื่อ/ลบ testid พวกนี้ เทสต์ callout จะแดงทันที — **นั่นคือตาข่ายรับ ไม่ใช่ conflict**
**ยกเว้นคู่เดียว: 1553 ↔ 0030** ทั้งคู่แก้บรรทัด `if (order) apply(order, …)` ใน `confirmCancel`
วิธีแก้ conflict: เอาโครงของ 1553 (`Q.cancel`) แล้วย้าย guard สถานะของ 0030 เข้าไปใน `Q.cancel`
โดยให้มันรับ `order` เป็น argument เพิ่ม — `Q.cancel` ของ 1553 guard แค่ reason ว่างเท่านั้น
**ถ้าลืมย้าย guard สถานะ บั๊กยอดขายหายจะกลับมา** เทสต์ `QueuePanel.cancelGuard.test.tsx`
จะแดง 2 ตัวทันทีถ้าลืม (เคส `done` และ `cancelled`) — ปล่อยให้มันเป็นตาข่ายรับ

⚠️ **ข้อควรระวังตอน merge 1553 เข้ากับ 0042:** 1553 แก้ `QueuePanel.tsx` (ย้าย patch ของ "ยกเลิก"
ไปเป็น `Q.cancel(reason)`) ส่วน 0042 **ไม่ได้แก้ `QueuePanel.tsx` เลย** จึงไม่ conflict กัน
แต่เทสต์ใหม่ของ 0042 ยืนยัน `updateOrderStatus.mock.calls` แบบตรงตัว — ถ้า 1553 ทำให้ patch
ของปุ่ม "เรียก" เปลี่ยนรูป เทสต์จะแดงทันที (ซึ่งเป็นเรื่องดี ไม่ใช่ conflict)

**อย่าทำข้อ Undo ซ้ำเด็ดขาด** ไม่ว่ารอบไหน — งานนั้นเสร็จแล้วที่ 1553

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 137 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
