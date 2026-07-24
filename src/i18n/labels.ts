const LABELS = {
  'setup.title': { th: 'ตั้งค่าเครื่อง', en: 'Device setup' },
  'setup.chooseBooth': { th: 'เลือกซุ้ม', en: 'Choose booth' },
  'setup.chooseMode': { th: 'เลือกโหมด', en: 'Choose mode' },
  'setup.chooseStation': { th: 'เลือกเครื่อง (station)', en: 'Choose station' },
  'setup.confirm': { th: 'ยืนยัน', en: 'Confirm' },
  'booth.photo': { th: 'โฟโต้บูธ', en: 'Photo booth' },
  'booth.portrait': { th: 'วาดภาพเสมือน', en: 'Caricature' },
  'booth.drinks': { th: 'น้ำปั่น', en: 'Blended drinks' },
  'mode.order': { th: 'รับออเดอร์', en: 'Order station' },
  'mode.display': { th: 'จอโชว์คิว', en: 'Display' },
  'mode.dashboard': { th: 'แดชบอร์ด', en: 'Dashboard' },
  'queue.callNext': { th: 'เรียกคิวถัดไป', en: 'Call next' },
  'queue.done': { th: 'เสร็จ', en: 'Done' },
  'queue.cancel': { th: 'ยกเลิก/แก้ไข', en: 'Cancel/Edit' },
  'queue.waiting': { th: 'คิวรอ', en: 'Waiting' },
  'queue.serving': { th: 'กำลังทำ', en: 'Now serving' },
  'queue.reasonPrompt': { th: 'เหตุผลที่ยกเลิก', en: 'Cancel reason' },
} as const

export type LabelKey = keyof typeof LABELS

export function L(key: LabelKey): { th: string; en: string } {
  return LABELS[key]
}
