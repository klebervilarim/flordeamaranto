// Regra de parcelamento no cartão (sempre sem juros):
// - Pedidos a partir de R$ 399: até 3x sem juros.
// - Pedidos abaixo de R$ 399: até 2x sem juros.
export const FREE_INSTALLMENTS_THRESHOLD = 399;

export function maxInstallments(orderTotal: number): number {
  return orderTotal >= FREE_INSTALLMENTS_THRESHOLD ? 3 : 2;
}

export function cardChargeAmount(orderTotal: number, installments: number): number {
  // Sem juros: o valor cobrado é sempre o total do pedido.
  void installments;
  return Number(orderTotal.toFixed(2));
}
