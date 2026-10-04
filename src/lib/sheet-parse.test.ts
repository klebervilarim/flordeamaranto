import { describe, expect, it } from "vitest";
import { parseNumber, parseProductRows } from "./sheet-parse";

describe("importação da planilha de estoque", () => {
  it("lê a exportação da tela de Estoque pelos nomes das colunas", () => {
    const rows = [
      ["SKU", "Produto", "Marca", "Estoque atual", "Estoque mínimo", "Status", "Preço de custo", "Preço de venda"],
      ["LAT-0001", "Khamrah", "Lattafa", 5, 1, "OK", 150, 299.9],
    ];
    expect(parseProductRows(rows)).toEqual([
      { sku: "LAT-0001", name: "Khamrah", brand: "Lattafa", price: 299.9, cost: 150, quantity: 5 },
    ]);
  });

  it("lê a planilha padrão (Código, Descrição, Valor, Custo, Quantidade)", () => {
    const rows = [
      ["Código", "Descrição", "Valor", "Custo", "Quantidade"],
      ["NOVO-1", "Perfume Novo", "1.234,50", "800", "3"],
    ];
    expect(parseProductRows(rows)[0]).toEqual({
      sku: "NOVO-1",
      name: "Perfume Novo",
      price: 1234.5,
      cost: 800,
      quantity: 3,
    });
  });

  it("converte valores em reais escritos como texto", () => {
    expect(parseNumber("R$ 299,90")).toBe(299.9);
    expect(parseNumber(374)).toBe(374);
    expect(parseNumber("")).toBeUndefined();
  });
});
