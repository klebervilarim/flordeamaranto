export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

export const installments = (value: number, max = 6) => {
  const n = value >= 300 ? max : value >= 150 ? 3 : 2;
  return { n, value: value / n };
};

export const discountPercent = (price: number, sale?: number | null) =>
  sale && sale < price ? Math.round((1 - sale / price) * 100) : 0;

export const stockLabel = (stock: number) =>
  stock <= 0 ? "Esgotado" : stock <= 5 ? "Últimas unidades" : "Em estoque";