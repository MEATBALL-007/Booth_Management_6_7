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
