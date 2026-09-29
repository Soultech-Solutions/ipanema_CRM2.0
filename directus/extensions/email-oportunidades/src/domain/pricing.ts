/** Preço de venda sugerido: preço base do catálogo ou, na falta dele, o último custo + markup. */
export function suggestedPrice (product: { preco: number | null, custo?: number | null }, markupPct: number): number | null {
  if (product.preco != null) {
    return product.preco
  }
  if (product.custo == null || product.custo <= 0) {
    return null
  }
  return Math.round(product.custo * (1 + markupPct / 100) * 100) / 100
}
