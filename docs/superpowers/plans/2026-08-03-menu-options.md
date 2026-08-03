# Drinks Menu Update + Order Options (Modifiers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the drinks-booth menu (drop soda + yakult-pipo; add สตรอเบอร์รี่โยเกิร์ตปั่น 35฿ and สตรอเบอร์รี่นมสดปั่น 25฿) and add a per-cup **option system**: single-select **sweetness** (ปกติ/น้อย/มาก, free) and a single-select **topping** (ไม่ใส่ / ไข่มุกป็อป +10 / วิปครีม +10). Options adjust the line price, are recorded on the order for audit, and are shown to the drink-maker in the queue.

**Architecture:** Options are declared on `Product` as `optionGroups`. All option pricing and selection resolution are **pure functions** (`src/order/options.ts`, unit-tested). The cart evolves so a line is identified by `sku + selections` (two cups with different toppings are different lines); `cartToOrderItems` bakes option deltas into `unitPrice`/`subtotal` and records the chosen non-default options on the `OrderItem`. `buildOrder` is unchanged (options ride inside items). The OrderStation shows an option picker for products that have option groups; QueuePanel shows the item/option summary so the maker knows what to prepare. Backward compatible: existing orders (no `options`) and option-less products (photo/portrait) keep working.

**Tech Stack:** React 19, TypeScript, Tailwind (PHANTOM CREW), Vitest + @testing-library/react.

## Global Constraints

- **Builds on Plans 1–5 (all merged to `main`).** Reuse `Product`/`OrderItem`/`BoothId` (`src/domain/types.ts`), `L` (`src/i18n/labels.ts`). Firestore stays at the edges (this plan touches no repo — only the catalog, pure logic, and screens).
- **Prices/costs (locked; costs are placeholders, refine later via Dashboard expenses):** สตรอเบอร์รี่โยเกิร์ตปั่น price 35 / cost 14; สตรอเบอร์รี่นมสดปั่น price 25 / cost 10. Toppings: ไข่มุกป็อป +10, วิปครีม +10 (sweetness +0).
- **Option model:** single-select groups only. Sweetness group `sweet` (required): ปกติ(0)/น้อย(0)/มาก(0). Topping group `topping` (optional): ไม่ใส่(0)/ไข่มุกป็อป(+10)/วิปครีม(+10). Both drinks share both groups. Photo/portrait have no option groups.
- **Default selection = the group's FIRST choice** (so order groups with the default first: sweet = [ปกติ, น้อย, มาก], topping = [ไม่ใส่, ไข่มุก, วิป]). Recorded order options = only NON-default (non-first) choices, so a plain cup records nothing and a customized cup records just its deviations.
- **Backward compatible:** `Product.optionGroups?` and `OrderItem.options?` are OPTIONAL. Existing Firestore orders and option-less products remain valid. Products without option groups add to the cart directly (no picker).
- **Bilingual** labels via `L` + the catalog's own th/en option names. **Theme** PHANTOM CREW.
- **Testing:** Vitest. Pure logic (options, cart) → unit tests (bulk of coverage). Components → @testing-library/react. The suite must stay GREEN after every task — tasks that rename products also fix the tests that referenced the old names. Run `npm run build` (`tsc -b`) as well as `npm test`. Commit after each task.

---

### Task 1: Option types on the domain model

**Files:**
- Modify: `src/domain/types.ts`
- Test: `src/domain/types.test.ts`

**Interfaces:**
- Produces: `interface OptionChoice { id; name; nameEn; priceDelta: number }`; `interface OptionGroup { id; name; nameEn; required: boolean; choices: OptionChoice[] }`; `type Selections = Record<string, string>` (groupId → choiceId); `Product` gains `optionGroups?: OptionGroup[]`; `OrderItem` gains `options?: { label: string; priceDelta: number }[]`.

- [ ] **Step 1: Add a failing test to `src/domain/types.test.ts`**

Append (the file already tests `BOOTH_IDS`/`MODES`/`STATIONS`):

```ts
import type { OptionGroup, OptionChoice, Selections, Product, OrderItem } from './types'

test('option types compose into a Product and OrderItem', () => {
  const choice: OptionChoice = { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 }
  const group: OptionGroup = { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [choice] }
  const product: Product = { sku: 's', boothId: 'drinks', name: 'x', nameEn: 'x', price: 35, cost: 14, active: true, optionGroups: [group] }
  const sel: Selections = { topping: 'topping-boba' }
  const item: OrderItem = { sku: 's', name: 'x', qty: 1, unitPrice: 45, subtotal: 45, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] }
  expect(product.optionGroups?.[0].choices[0].priceDelta).toBe(10)
  expect(sel.topping).toBe('topping-boba')
  expect(item.options?.[0].priceDelta).toBe(10)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/types.test.ts`
Expected: FAIL — the new types/fields do not exist (type errors surface at test compile, or the test file fails to run).

- [ ] **Step 3: Add the types to `src/domain/types.ts`**

Add near the `Product`/`OrderItem` definitions:

```ts
export interface OptionChoice {
  id: string
  name: string
  nameEn: string
  priceDelta: number
}

export interface OptionGroup {
  id: string
  name: string
  nameEn: string
  required: boolean
  choices: OptionChoice[]
}

export type Selections = Record<string, string>
```

Add `optionGroups?: OptionGroup[]` to the `Product` interface. Add `options?: { label: string; priceDelta: number }[]` to the `OrderItem` interface.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add option-group types to the domain model"
```

---

### Task 2: Pure option pricing + selection helpers

**Files:**
- Create: `src/order/options.ts`
- Test: `src/order/options.test.ts`

**Interfaces:**
- Consumes: `Product`, `Selections` from types.
- Produces: `defaultSelections(product): Selections` (first choice per group); `optionPriceDelta(product, selections): number`; `lineUnitPrice(product, selections): number` (= price + delta); `selectedOptionLabels(product, selections): { label: string; priceDelta: number }[]` (non-default choices only).

- [ ] **Step 1: Write the failing test `src/order/options.test.ts`**

```ts
import { defaultSelections, optionPriceDelta, lineUnitPrice, selectedOptionLabels } from './options'
import type { Product } from '../domain/types'

const drink: Product = {
  sku: 'd', boothId: 'drinks', name: 'โยเกิร์ต', nameEn: 'Yogurt', price: 35, cost: 14, active: true,
  optionGroups: [
    { id: 'sweet', name: 'ความหวาน', nameEn: 'Sweetness', required: true, choices: [
      { id: 'sweet-normal', name: 'หวานปกติ', nameEn: 'Normal', priceDelta: 0 },
      { id: 'sweet-low', name: 'หวานน้อย', nameEn: 'Less', priceDelta: 0 },
    ] },
    { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [
      { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
      { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    ] },
  ],
}
const plain: Product = { sku: 'p', boothId: 'photo', name: 'x', nameEn: 'x', price: 35, cost: 8, active: true }

test('defaultSelections picks the first choice of each group', () => {
  expect(defaultSelections(drink)).toEqual({ sweet: 'sweet-normal', topping: 'topping-none' })
  expect(defaultSelections(plain)).toEqual({})
})

test('optionPriceDelta sums the chosen choices', () => {
  expect(optionPriceDelta(drink, { sweet: 'sweet-low', topping: 'topping-boba' })).toBe(10)
  expect(optionPriceDelta(drink, defaultSelections(drink))).toBe(0)
})

test('lineUnitPrice adds the delta to the base price', () => {
  expect(lineUnitPrice(drink, { sweet: 'sweet-normal', topping: 'topping-boba' })).toBe(45)
  expect(lineUnitPrice(plain, {})).toBe(35)
})

test('selectedOptionLabels records only non-default (non-first) choices', () => {
  expect(selectedOptionLabels(drink, { sweet: 'sweet-normal', topping: 'topping-none' })).toEqual([])
  expect(selectedOptionLabels(drink, { sweet: 'sweet-low', topping: 'topping-boba' })).toEqual([
    { label: 'หวานน้อย', priceDelta: 0 },
    { label: 'ไข่มุกป็อป', priceDelta: 10 },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/options.test.ts`
Expected: FAIL — `src/order/options.ts` does not exist.

- [ ] **Step 3: Create `src/order/options.ts`**

```ts
import type { Product, Selections } from '../domain/types'

export function defaultSelections(product: Product): Selections {
  const sel: Selections = {}
  for (const g of product.optionGroups ?? []) {
    if (g.choices.length > 0) sel[g.id] = g.choices[0].id
  }
  return sel
}

export function optionPriceDelta(product: Product, selections: Selections): number {
  let delta = 0
  for (const g of product.optionGroups ?? []) {
    const choice = g.choices.find((c) => c.id === selections[g.id])
    if (choice) delta += choice.priceDelta
  }
  return delta
}

export function lineUnitPrice(product: Product, selections: Selections): number {
  return product.price + optionPriceDelta(product, selections)
}

export function selectedOptionLabels(
  product: Product,
  selections: Selections,
): { label: string; priceDelta: number }[] {
  const out: { label: string; priceDelta: number }[] = []
  for (const g of product.optionGroups ?? []) {
    const chosenId = selections[g.id]
    const idx = g.choices.findIndex((c) => c.id === chosenId)
    if (idx > 0) {
      const c = g.choices[idx]
      out.push({ label: c.name, priceDelta: c.priceDelta })
    }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/options.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure option pricing + selection helpers"
```

---

### Task 3: Update the drinks catalog

**Files:**
- Modify: `src/domain/catalog.ts`
- Modify: `src/domain/catalog.test.ts`
- Modify: `src/screens/OrderStation.test.tsx` (rename old drink references)
- Modify: `src/App.test.tsx` (rename old drink reference)

**Interfaces:**
- Consumes: `OptionGroup`, `Product` types; `options.ts` helpers not needed here.
- Produces: `CATALOG.drinks` = `[strawberry-yogurt, strawberry-milk]` each with the shared `SWEET`/`TOPPING` option groups; the old `drink-yakult-pipo`/`drink-soda` are removed. `photo`/`portrait` unchanged (no option groups).

- [ ] **Step 1: Update the drinks assertions in `src/domain/catalog.test.ts`**

Replace the drinks-price/cost expectations with the new menu:

```ts
test('drinks menu is the strawberry line-up with option groups', () => {
  const drinks = productsForBooth('drinks')
  expect(drinks.map((d) => d.sku)).toEqual(['drink-strawberry-yogurt', 'drink-strawberry-milk'])
  expect(drinks.map((d) => d.price)).toEqual([35, 25])
  expect(drinks.map((d) => d.cost)).toEqual([14, 10])
  // both drinks carry sweetness + topping groups
  for (const d of drinks) {
    expect(d.optionGroups?.map((g) => g.id)).toEqual(['sweet', 'topping'])
  }
  // topping deltas
  const topping = drinks[0].optionGroups!.find((g) => g.id === 'topping')!
  expect(topping.choices.map((c) => c.priceDelta)).toEqual([0, 10, 10])
})
```

Keep the existing `photo`/`portrait` assertions and the `CATALOG` keys test. Remove any assertion that referenced `ยาคูลท์ปีโป้ปั่น`/`น้ำอัดลม`/old prices `[30, 25]`/costs `[12, 9]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/catalog.test.ts`
Expected: FAIL — catalog still has the old drinks.

- [ ] **Step 3: Update `src/domain/catalog.ts`**

Define the shared option groups and the new drinks. Replace the `drinks` array:

```ts
import type { Product, BoothId, OptionGroup } from './types'

const SWEET: OptionGroup = {
  id: 'sweet', name: 'ความหวาน', nameEn: 'Sweetness', required: true,
  choices: [
    { id: 'sweet-normal', name: 'หวานปกติ', nameEn: 'Normal', priceDelta: 0 },
    { id: 'sweet-low', name: 'หวานน้อย', nameEn: 'Less sweet', priceDelta: 0 },
    { id: 'sweet-high', name: 'หวานมาก', nameEn: 'Extra sweet', priceDelta: 0 },
  ],
}

const TOPPING: OptionGroup = {
  id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false,
  choices: [
    { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
    { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    { id: 'topping-whip', name: 'วิปครีม', nameEn: 'Whipped cream', priceDelta: 10 },
  ],
}
```

Then in `CATALOG`, replace the `drinks: [...]` entry with:

```ts
  drinks: [
    { sku: 'drink-strawberry-yogurt', boothId: 'drinks', name: 'สตรอเบอร์รี่โยเกิร์ตปั่น', nameEn: 'Strawberry yogurt smoothie', price: 35, cost: 14, active: true, optionGroups: [SWEET, TOPPING] },
    { sku: 'drink-strawberry-milk', boothId: 'drinks', name: 'สตรอเบอร์รี่นมสดปั่น', nameEn: 'Strawberry milk smoothie', price: 25, cost: 10, active: true, optionGroups: [SWEET, TOPPING] },
  ],
```

Keep `photo` and `portrait` exactly as they are (no `optionGroups`). Keep `productsForBooth` unchanged.

- [ ] **Step 4: Fix the old drink-name references in the two screen tests**

In `src/App.test.tsx`, the test that asserts the drinks catalog renders currently clicks/queries `/ยาคูลท์ปีโป้ปั่น/`. Change that query to `/สตรอเบอร์รี่โยเกิร์ตปั่น/`.

In `src/screens/OrderStation.test.tsx`, any query for `/ยาคูลท์ปีโป้ปั่น/` becomes `/สตรอเบอร์รี่โยเกิร์ตปั่น/`. (Task 5 rewrites these tests fully for the picker; for now just rename so the suite stays green — the drink still adds directly at this point because the picker doesn't exist yet.)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — catalog + both screen tests green with the new names. (The OrderStation flow still adds the drink directly; the picker arrives in Task 5.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace drinks menu with strawberry line-up + option groups"
```

---

### Task 4: Cart with options

**Files:**
- Modify: `src/order/cart.ts`
- Modify: `src/order/cart.test.ts`
- Modify: `src/screens/OrderStation.tsx` (cart operations become line-key based; drinks still add with default selections for now)

**Interfaces:**
- Consumes: `Product`, `OrderItem`, `Selections`; `lineUnitPrice`/`selectedOptionLabels` (options.ts).
- Produces: `interface CartLine { sku: string; qty: number; selections: Selections }`; `type Cart = CartLine[]`; `lineKey(sku, selections): string`; `addToCart(cart, sku, selections?): Cart` (merges lines with the same sku+selections); `setQty(cart, key, qty): Cart` (by line key; ≤0 removes); `removeFromCart(cart, key): Cart`; `cartTotal(cart, products): number`; `cartToOrderItems(cart, products): OrderItem[]` (option-aware unitPrice/subtotal + `options` when non-empty).

- [ ] **Step 1: Rewrite `src/order/cart.test.ts`**

```ts
import { addToCart, setQty, removeFromCart, cartTotal, cartToOrderItems, lineKey, type Cart } from './cart'
import type { Product } from '../domain/types'

const DRINK: Product = {
  sku: 'd', boothId: 'drinks', name: 'โยเกิร์ต', nameEn: 'Yogurt', price: 35, cost: 14, active: true,
  optionGroups: [
    { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [
      { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
      { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    ] },
  ],
}
const PLAIN: Product = { sku: 'p', boothId: 'photo', name: 'ภาพ', nameEn: 'Photo', price: 35, cost: 8, active: true }
const PRODUCTS = [DRINK, PLAIN]

test('same sku + same selections stacks into one line', () => {
  let cart: Cart = []
  cart = addToCart(cart, 'p', {})
  cart = addToCart(cart, 'p', {})
  expect(cart).toEqual([{ sku: 'p', qty: 2, selections: {} }])
})

test('same sku + different selections are separate lines', () => {
  let cart: Cart = []
  cart = addToCart(cart, 'd', { topping: 'topping-none' })
  cart = addToCart(cart, 'd', { topping: 'topping-boba' })
  expect(cart).toHaveLength(2)
})

test('cartTotal applies option price deltas', () => {
  const cart: Cart = [
    { sku: 'd', qty: 1, selections: { topping: 'topping-boba' } }, // 35 + 10
    { sku: 'p', qty: 2, selections: {} },                           // 35 * 2
  ]
  expect(cartTotal(cart, PRODUCTS)).toBe(45 + 70)
})

test('cartToOrderItems bakes option price into subtotal and records non-default options', () => {
  const cart: Cart = [{ sku: 'd', qty: 2, selections: { topping: 'topping-boba' } }]
  expect(cartToOrderItems(cart, PRODUCTS)).toEqual([
    { sku: 'd', name: 'โยเกิร์ต', qty: 2, unitPrice: 45, subtotal: 90, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] },
  ])
})

test('a default (no-option) line records no options field', () => {
  const cart: Cart = [{ sku: 'd', qty: 1, selections: { topping: 'topping-none' } }]
  const items = cartToOrderItems(cart, PRODUCTS)
  expect('options' in items[0]).toBe(false)
})

test('setQty and removeFromCart operate by line key', () => {
  const key = lineKey('d', { topping: 'topping-boba' })
  let cart: Cart = [{ sku: 'd', qty: 1, selections: { topping: 'topping-boba' } }]
  cart = setQty(cart, key, 4)
  expect(cart[0].qty).toBe(4)
  cart = removeFromCart(cart, key)
  expect(cart).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/cart.test.ts`
Expected: FAIL — cart still uses the old sku-keyed shape.

- [ ] **Step 3: Rewrite `src/order/cart.ts`**

```ts
import type { Product, OrderItem, Selections } from '../domain/types'
import { lineUnitPrice, selectedOptionLabels } from './options'

export interface CartLine {
  sku: string
  qty: number
  selections: Selections
}
export type Cart = CartLine[]

export function lineKey(sku: string, selections: Selections): string {
  const parts = Object.keys(selections).sort().map((k) => `${k}=${selections[k]}`)
  return `${sku}|${parts.join('&')}`
}

export function addToCart(cart: Cart, sku: string, selections: Selections = {}): Cart {
  const key = lineKey(sku, selections)
  const existing = cart.find((l) => lineKey(l.sku, l.selections) === key)
  if (existing) return cart.map((l) => (lineKey(l.sku, l.selections) === key ? { ...l, qty: l.qty + 1 } : l))
  return [...cart, { sku, qty: 1, selections }]
}

export function setQty(cart: Cart, key: string, qty: number): Cart {
  if (qty <= 0) return removeFromCart(cart, key)
  return cart.map((l) => (lineKey(l.sku, l.selections) === key ? { ...l, qty } : l))
}

export function removeFromCart(cart: Cart, key: string): Cart {
  return cart.filter((l) => lineKey(l.sku, l.selections) !== key)
}

export function cartToOrderItems(cart: Cart, products: Product[]): OrderItem[] {
  return cart
    .map((l) => {
      const p = products.find((x) => x.sku === l.sku)
      if (!p) return null
      const unitPrice = lineUnitPrice(p, l.selections)
      const options = selectedOptionLabels(p, l.selections)
      const item: OrderItem = { sku: p.sku, name: p.name, qty: l.qty, unitPrice, subtotal: unitPrice * l.qty }
      return options.length > 0 ? { ...item, options } : item
    })
    .filter((x): x is OrderItem => x !== null)
}

export function cartTotal(cart: Cart, products: Product[]): number {
  return cartToOrderItems(cart, products).reduce((s, it) => s + it.subtotal, 0)
}
```

- [ ] **Step 4: Update `src/screens/OrderStation.tsx` cart operations to line-key based**

The component currently keys cart operations by `sku`. Update so:
- Product tiles call `setCart((c) => addToCart(c, p.sku, defaultSelections(p)))` (import `defaultSelections` from `../order/options`). (Full picker UI comes in Task 5; for now every product adds with its default selections — drinks get default sweetness/no-topping, option-less products get `{}`.)
- The cart line rows compute `const key = lineKey(line.sku, line.selections)` and call `setQty(c, key, line.qty ± 1)` / removal by `key`. Render the product via `products.find((x) => x.sku === line.sku)!`.
- `cartTotal`/`cartToOrderItems` calls are unchanged (same signatures).
Keep all other markup (payment, queue number, QueuePanel, comms) intact.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — cart tests green; OrderStation tests still pass (drinks add with default selections; totals unchanged for default cups). If an OrderStation test asserted a specific cart-total testid, confirm it still holds (a default drink is its base price).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build completes, no type errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: cart lines carry per-cup option selections + option-aware pricing"
```

---

### Task 5: Order Station option picker

**Files:**
- Modify: `src/screens/OrderStation.tsx`
- Modify: `src/i18n/labels.ts` (add picker labels)
- Modify: `src/screens/OrderStation.test.tsx`

**Interfaces:**
- Consumes: `defaultSelections` (options); `addToCart`; `OptionGroup`/`Selections`; `L`.
- Produces: OrderStation shows, for a product WITH `optionGroups`, an inline option picker (one single-select row per group) with an **เพิ่ม/Add** button that adds the line with the chosen selections; a product WITHOUT option groups adds directly on tap. Cart line rows display the product name plus the selected non-default option labels.

- [ ] **Step 1: Add picker labels to `src/i18n/labels.ts`**

```ts
  'order.chooseOptions': { th: 'เลือกตัวเลือก', en: 'Choose options' },
  'order.add': { th: 'เพิ่มลงตะกร้า', en: 'Add' },
  'order.cancelPick': { th: 'ยกเลิก', en: 'Cancel' },
```

- [ ] **Step 2: Update `src/screens/OrderStation.test.tsx`**

Replace the two existing order-flow tests so the drink goes through the picker. Keep the top-of-file mocks (ordersRepo, QueuePanel stub, qrcode, commsRepo). New tests:

```tsx
test('adding a drink with a topping opens the picker and prices the option in', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่โยเกิร์ตปั่น/ })) // 35, has options
  // picker appears
  await user.click(screen.getByRole('button', { name: /ไข่มุกป็อป/ }))               // +10
  await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('45')

  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  const persisted = createOrder.mock.calls[0][0]
  expect(persisted.total).toBe(45)
  expect(persisted.items[0].options).toEqual([{ label: 'ไข่มุกป็อป', priceDelta: 10 }])
})

test('a default drink (no option changes) adds at base price with no recorded options', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)
  await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่นมสดปั่น/ })) // 25
  await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('25')
})
```

(Adjust `createOrder` reference to the existing hoisted mock spy in this file. Keep any existing tests that don't reference drinks, e.g. the inter-booth alert-buttons test from Plan 5.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/screens/OrderStation.test.tsx`
Expected: FAIL — no picker exists; the drink adds directly and `เพิ่มลงตะกร้า` is not found.

- [ ] **Step 4: Add the picker to `src/screens/OrderStation.tsx`**

Add picker state and logic:
```tsx
import { defaultSelections } from '../order/options'
import type { Selections } from '../domain/types'
// ...
const [picking, setPicking] = useState<string | null>(null)     // sku being configured
const [pick, setPick] = useState<Selections>({})

const onProductTap = (p: typeof products[number]) => {
  setIssued(null)
  if (p.optionGroups && p.optionGroups.length > 0) {
    setPicking(p.sku)
    setPick(defaultSelections(p))
  } else {
    setCart((c) => addToCart(c, p.sku, {}))
  }
}
const confirmPick = () => {
  if (!picking) return
  setCart((c) => addToCart(c, picking, pick))
  setPicking(null)
  setPick({})
}
```
Wire the product tiles to `onProductTap(p)`. Render the picker when `picking` is set (find the product by sku); for each `optionGroups` group, render its choices as buttons that set `setPick((s) => ({ ...s, [group.id]: choice.id }))` with the active choice highlighted; an **เพิ่มลงตะกร้า** button calls `confirmPick()` and a **ยกเลิก** button clears `picking`. Use `L('order.chooseOptions')`, `L('order.add')`, `L('order.cancelPick')`.
In the cart line rows, after the product name, render the selected non-default labels via `selectedOptionLabels(product, line.selections)` (import it) joined with `·`, so the operator sees e.g. "สตรอเบอร์รี่โยเกิร์ตปั่น · ไข่มุกป็อป".

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/OrderStation.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Order Station option picker (sweetness + topping per cup)"
```

---

### Task 6: Show item + options to the drink-maker (QueuePanel) + final verification

**Files:**
- Modify: `src/screens/QueuePanel.tsx`
- Modify: `src/screens/QueuePanel.test.tsx`

**Interfaces:**
- Consumes: `Order`/`OrderItem` (each order's `items` with optional `options`).
- Produces: each serving/waiting card in QueuePanel shows a compact item summary (e.g. `โยเกิร์ต ×1 · ไข่มุกป็อป`) beneath the queue number so the maker knows what to prepare.

- [ ] **Step 1: Add the failing test to `src/screens/QueuePanel.test.tsx`**

Add (keep the existing call-next/done/cancel tests; the `order()` factory already builds orders — extend one to carry items with options):

```ts
test('serving card shows the item summary with options for the maker', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({
    id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving',
    items: [{ sku: 'd', name: 'โยเกิร์ต', qty: 1, unitPrice: 45, subtotal: 45, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] }],
  })]))
  const card = screen.getByText(/โยเกิร์ต/)
  expect(card).toHaveTextContent('ไข่มุกป็อป')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/QueuePanel.test.tsx`
Expected: FAIL — the card shows only the queue number, not the item summary.

- [ ] **Step 3: Update `src/screens/QueuePanel.tsx`**

In the serving card (and the waiting card if desired), under the `queueNumber`, render a compact summary of `o.items`: for each item show `name ×qty` and, if `item.options?.length`, append `· ${item.options.map((op) => op.label).join(' · ')}`. Small muted text (`text-xs opacity-70`), does not disrupt the existing done/cancel buttons.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Confirm metrics/best-sellers are unaffected**

Reason-check (no code change): `computeDashboardMetrics` aggregates best-sellers by `sku` and sums `order.total`/`item.subtotal`. Options ride inside `subtotal` and don't change `sku`, so per-booth totals, net donation, and best-sellers remain correct with option-bearing orders. (The existing `metrics.test.ts` still passes, confirming no regression.)

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build completes, no type errors, PWA generates.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: show item + option summary in the queue for the drink-maker"
```

---

## Self-Review

**Coverage:**
- New drinks menu (strawberry yogurt 35, strawberry milk 25; soda + yakult removed) → Task 3 ✓
- Sweetness (ปกติ/น้อย/มาก, free) + topping (ไม่ใส่ / ไข่มุกป็อป +10 / วิป +10), single-select, 1 topping/cup → Tasks 1, 2, 3 ✓
- Option price baked into line price + order total → Tasks 2, 4 ✓
- Options recorded on the order for audit (non-default only) → Tasks 2, 4 ✓
- Option picker at the Order Station → Task 5 ✓
- Drink-maker sees the options in the queue → Task 6 ✓
- Costs are placeholders (14/10; toppings tracked via Dashboard expenses) → Task 3 ✓; net donation stays expense-based and correct → Task 6 Step 5 ✓
- Backward compatible (optional fields; option-less products unchanged; existing orders valid) → Tasks 1, 4 ✓
- Suite stays green each task (product renames fix their dependent tests in the same task) → Tasks 3, 4, 5 ✓

**Placeholder scan:** No TBD/TODO. Costs are intentionally placeholder estimates per the locked decision.

**Type consistency:** `OptionGroup`/`OptionChoice`/`Selections` (Task 1) consumed by Tasks 2, 3, 4, 5. `defaultSelections`/`lineUnitPrice`/`selectedOptionLabels`/`optionPriceDelta` (Task 2) consumed by Tasks 4, 5. `CartLine`/`Cart`/`lineKey`/`addToCart`/`setQty`/`removeFromCart`/`cartTotal`/`cartToOrderItems` (Task 4) consumed by Task 5 and OrderStation. `OrderItem.options` (Task 1) written by Task 4, read by Task 6. `buildOrder` unchanged (options ride inside items). No drift.

---

*Menu + Order Options · mid-stream change (drinks booth switched to strawberry yogurt smoothies) · ต่อยอดจาก Plans 1–5 · ม.6/7 · PHANTOM CREW*
