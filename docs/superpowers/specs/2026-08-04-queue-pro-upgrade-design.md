# 🎯 Queue System Pro-Upgrade + Display Centering — Design Spec

**Project:** ระบบงานสายสัมพันธ์ ม.6/7 (booth PWA)
**Date:** 2026-08-04
**Status:** Approved for planning (pending user review of this spec)

> ยกระดับระบบคิวให้ **กันพลาดระดับมือโปร** (undo · no-show · re-chime · เรียกเจาะจง · idempotency) แต่ยังใช้ง่าย + จัดจอ Display **กึ่งกลาง** และ **เน้นคิวถัดไป (เตรียมตัว)**

---

## 1. Context / why

ระบบคิวปัจจุบันทำได้: ออกเลข station-prefix (A7) → `waiting`; QueuePanel มี เรียกคิวถัดไป / เสร็จ / ยกเลิก(เหตุผล); Display โชว์ กำลังทำ + คิวถัดไป. **จุดอ่อนที่มือโปรแก้:** กดผิดแล้วย้อนไม่ได้, ลูกค้าไม่อยู่ตอนเรียก (no-show) ไม่มีทางจัดการ, ลูกค้าไม่ได้ยินก็ประกาศซ้ำไม่ได้, เรียกข้ามลำดับไม่ได้. และจอ Display ยังไม่จัดกลาง/ไม่เน้น "คิวถัดไป" ให้ลูกค้าเตรียมตัว. ผู้ใช้ต้องการชุดเต็มแบบมือโปร แต่ **ไม่ให้ยุ่งยาก** (ใช้ Undo แทน popup ยืนยันทุกปุ่ม)

## 2. Data model changes (เพิ่มน้อยที่สุด)

- `OrderStatus` เพิ่มค่า `'skipped'` (พักไว้ รอเรียกซ้ำ) → `'waiting' | 'serving' | 'done' | 'cancelled' | 'skipped'`
- `Order` เพิ่ม `announcedAt?: number` — timestamp ที่ถูก "เด้ง" เพื่อสั่งจอ Display ประกาศซ้ำ (chime + flash)
- Backward-compatible: ทั้งสองเป็น optional/additive; ออเดอร์เก่า + metrics เดิมไม่กระทบ (metrics นับ revenue = paid && !cancelled — `skipped` ไม่ใช่ cancelled แต่เป็นสถานะระหว่างทาง; ยังไม่ done. ต้องยืนยัน: skipped ไม่ควรนับเป็น done — doneCount นับ status==='done' เท่านั้น อยู่แล้ว ✓)

## 3. Part A — Queue logic (pure, idempotent, testable)

**โมดูลใหม่ `src/queue/queueActions.ts`** — pure functions คืน "field patch" ของแต่ละ action (มี guard: ถ้า order ไม่อยู่ในสถานะต้นทางที่ถูกต้อง → คืน `null` = no-op → กันกดชน/กดซ้ำ). QueuePanel เรียก helper แล้วส่ง patch เข้า `updateOrderStatus`:

| Action | จาก → ไป | Patch | Guard |
|---|---|---|---|
| `callNext(orders, station)` | waiting ตัวแรกของ station → serving | `{status:'serving', servingAt, announcedAt}` | มี waiting ของ station |
| `callSpecific(order)` | waiting → serving | เหมือน callNext | order.status==='waiting' |
| `markDone(order)` | serving → done | `{status:'done', doneAt}` | order.status==='serving' |
| `skip(order)` | serving → skipped | `{status:'skipped'}` | order.status==='serving' |
| `recall(order)` | skipped → serving | `{status:'serving', servingAt, announcedAt}` | order.status==='skipped' |
| `reannounce(order)` | serving (ไม่เปลี่ยนสถานะ) | `{announcedAt}` | order.status==='serving' |
| `cancel(order, reason)` | any → cancelled | `{status:'cancelled', cancelReason}` | reason ไม่ว่าง (เดิม) |

**Undo (ย้อนการกดล่าสุด):** ก่อนใช้ patch, QueuePanel เก็บ snapshot ฟิลด์เดิมของ order นั้น (`{status, servingAt, doneAt, cancelReason, announcedAt}`) ไว้ใน state เป็น `lastAction`. ปุ่ม **↩︎ ย้อนกลับ** เรียก `updateOrderStatus(id, snapshot)` คืนค่าเดิม แล้วล้าง lastAction. เก็บแค่ **1 ครั้งล่าสุด** (พอสำหรับ mis-tap 99% + ง่าย). Undo แทน popup ยืนยัน → กดเร็ว 1 ที แต่พลาดแล้วกู้ได้.

**Idempotency infra:** ทุก action ผ่าน guard ข้างบน → กดซ้ำ/สองเครื่องกดพร้อมกันไม่ทำให้ดึงซ้อนหรือข้ามผิด (ถ้า order ถูกเปลี่ยนไปแล้ว guard คืน null).

**QueuePanel UI (ให้ครบแต่ง่าย):**
- **เรียกคิวถัดไป** — ปุ่มหลักใหญ่ (primary), disabled เมื่อไม่มี waiting
- **คิวที่รอ (waiting):** แต่ละการ์ดมีปุ่ม **เรียก** (เรียกเจาะจง/ข้ามลำดับ)
- **กำลังทำ (serving):** แต่ละการ์ด: **เสร็จ** (primary) · **ข้าม** · **ประกาศซ้ำ** · **ยกเลิก** (ใส่เหตุผล เดิม) — ปุ่มรองเล็กบนการ์ด
- **พักไว้ (skipped):** โซนแยก แต่ละอันมีปุ่ม **เรียกซ้ำ** → serving ทันที
- **↩︎ ย้อนกลับ:** แถบเล็กด้านบน/ล่าง โผล่หลังทำ action ล่าสุด (ข้อความบอกว่าย้อนอะไร)
- ไม่มี popup ยืนยันบนปุ่มปกติ (Undo กันพลาดแทน); "ยกเลิก" ยังต้องเหตุผลเพราะเป็นการลบจริง

## 4. Part B — Display: จัดกลาง + เน้นคิวถัดไป (layout A + callout B)

จอ Display (ลูกค้า) จัด **กึ่งกลางจอทั้งแนวตั้ง-นอน**, responsive ทุกขนาด:
- **กำลังทำ · NOW SERVING** — โชว์ทุกเลขที่ serving พร้อมกัน (ขนานได้) เรียง**กึ่งกลาง** ตัวใหญ่ glow (QueueNumber size=display, clamp ตามจอ) + รายละเอียดเมนู/option ใต้เลข
- **ถัดไป เตรียมตัว · NEXT — GET READY** — เลข waiting ตัวแรก (คิวถัดไป) เด่นเป็น **callout การ์ดเหลือง** กึ่งกลาง พร้อมป้าย "เตรียมตัว" (เอาการเน้นแบบ B มาใส่ layout A)
- **คิวถัดไป (ที่เหลือ)** — waiting ที่เหลือเป็นเม็ดเล็กกึ่งกลาง
- **placeholder** "ยังไม่มีคิว" กึ่งกลางเมื่อว่าง
- **skipped ไม่โชว์บนจอลูกค้า** (เป็นเรื่องหลังบ้าน QueuePanel เท่านั้น)
- **ประกาศซ้ำ (re-chime):** จอ Display เล่นเสียง+ไฟกระพริบเมื่อ (ก) มีเลขใหม่เข้า serving (เดิม) **หรือ (ข) serving order ตัวเดิมมี `announcedAt` เพิ่มขึ้น** (จาก reannounce/recall) → ต่อ `useServingAlert` ให้ดู announcedAt ด้วย

**🌏 มองแล้วเข้าใจทันที (language-independent / glanceable) — requirement สำคัญ:** จอ Display ต้องสื่อความหมายได้โดย**ไม่ต้องอ่านตัวหนังสือ** (เผื่อคนอ่านอังกฤษไม่ออก หรือแค่มองผ่านไกลๆ) ด้วย:
- **สีสื่อสถานะเอง:** กำลังทำ = ส้มเรืองแสง (active) · ถัดไป = การ์ดเหลือง (เตรียมตัว) · ที่เหลือ = สีจาง/เทา — เห็นสีก็รู้ทันทีว่าอันไหนกำลังทำ/อันไหนตาต่อไป
- **ไอคอนต่อโซน:** กำลังทำ → 🔔 (ถูกเรียก/กำลังทำ) · ถัดไป → 👉 "ตาคุณแล้ว เตรียมตัว" — ไอคอนสากลสื่อโดยไม่ต้องอ่าน
- **ขนาดบอกลำดับ:** กำลังทำใหญ่สุด → ถัดไปขนาดกลางเด่น → ที่เหลือเม็ดเล็ก (ขนาด = ความสำคัญ)
- **ไฟกระพริบ/pulse ตอนเรียก** = "อันนี้แหละ ตอนนี้" (สากล)
- **ตัวเลขคิว (A7) อ่านได้ทุกภาษา** อยู่แล้ว · label **ไทยเด่น อังกฤษเป็นตัวรองเล็ก** — ไม่ต้องอ่านอังกฤษก็เข้าใจครบทุกอย่าง
- ทดสอบ "5-เมตร/3-วินาที": ยืนห่างหรือมองแวบเดียวต้องรู้ว่าเลขตัวเองกำลังทำ หรือใกล้ถึงคิว

## 5. Architecture / approach

- **Logic แยกเป็น pure functions** (`src/queue/queueActions.ts`) → unit test ครบทุก transition + guard + no-op; QueuePanel เป็นตัวประกอบ (subscribe + call helper + updateOrderStatus + local undo snapshot)
- **Firestore edge เดิม** (`ordersRepo.updateOrderStatus`) รองรับ patch ใดๆ อยู่แล้ว — ไม่ต้องแก้ repo
- **Display alert** ต่อ `useServingAlert`/`queueView` ให้รองรับ announcedAt (re-announce) + กรอง skipped ออกจาก serving/upNext
- **Optimistic** ตามคอนเวนชันเดิม (ไม่ await เพื่อเปลี่ยน UI; Firestore persistence คิวออฟไลน์)
- **i18n:** เพิ่ม label `queue.callSpecific`(เรียก), `queue.skip`(ข้าม), `queue.reannounce`(ประกาศซ้ำ), `queue.recall`(เรียกซ้ำ), `queue.undo`(ย้อนกลับ), `queue.parked`(พักไว้), `display.getReady`(เตรียมตัว), `display.next`(ถัดไป)
- **ธีม:** Neon Clarity เดิม (primitives Button/Panel/QueueNumber) — callout เตรียมตัวใช้ accent เหลือง

## 6. Testing note

ฟีเจอร์นี้ **เปลี่ยนพฤติกรรม** (สถานะใหม่ + ปุ่มใหม่ + re-announce + จอจัดใหม่) → ต่างจากงาน restyle: จะ **เพิ่ม/แก้เทสต์** อย่างถูกต้อง (ไม่ใช่ห้ามแตะเทสต์). Pure `queueActions` ได้ unit test หนักสุด; QueuePanel/Display component test อัปเดตตามปุ่ม/เลย์เอาต์ใหม่; เทสต์เดิมที่ยัง valid ต้องเขียว.

## 7. Success criteria

- [ ] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
- [ ] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + จอ Display ประกาศ (chime+flash)
- [ ] ประกาศซ้ำ: กดบน serving → จอ Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
- [ ] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
- [ ] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
- [ ] Display: จัดกึ่งกลางทุกจอ (responsive), "เตรียมตัว" callout เด่น, skipped ไม่โชว์
- [ ] Display glanceable: มองแวบเดียว/ยืนไกลเข้าใจได้โดยไม่ต้องอ่านอังกฤษ (สี+ไอคอน+ขนาด+ไฟสื่อสถานะ; ไทยเด่น อังกฤษตัวรอง)
- [ ] เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่มีการเปลี่ยน logic บัญชี/เมนู/comms

## 8. Out of scope

เวลารอโดยประมาณ (ETA), auto no-show หลัง N นาที, ปิดรับคิวอัตโนมัติ (max-queue), QR เช็คคิวลูกค้า — ทำภายหลังถ้าต้องการ. ไม่แตะ Order Station/Dashboard/บัญชี/เมนู.

---

*Design จาก brainstorm: เลือกฟีเจอร์กันพลาดครบ 4 + idempotency; Display = layout A (จัดกลาง/หลายเลข) + callout "เตรียมตัว" แบบ B · ต่อยอดจาก Neon Clarity · ม.6/7 · PHANTOM CREW*
