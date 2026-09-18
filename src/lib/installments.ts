// Regra de parcelamento no cartão:
// - No máximo 3 parcelas.
// - Pedidos a partir de R$ 399: até 3x sem juros.
// - Pedidos abaixo de R$ 399: 5% de juros por parcela (2x = 10%, 3x = 15% sobre o total).
// - À vista (1x) nunca tem juros.
export const MAX_INSTALLMENTS = 3;
export const FREE_INSTALLMENTS_THRESHOLD = 399;
export const INSTALLMENT_RATE = 0.05;

export function cardChargeAmount(orderTotal: number, installments: number): number {
  const count = Math.min(Math.max(Math.trunc(installments) || 1, 1), MAX_INSTALLMENTS);
  if (count <= 1) return Number(orderTotal.toFixed(2));
  if (orderTotal >= FREE_INSTALLMENTS_THRESHOLD) return Number(orderTotal.toFixed(2));
  return Number((orderTotal * (1 + INSTALLMENT_RATE * count)).toFixed(2));
}
