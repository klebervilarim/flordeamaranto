import { describe, expect, it } from "vitest";
import { parseNumber, parseProductRows } from "./sheet-parse";
import { decantCatalogFilter, generateDecantSku } from "./decants";

describe("importação da planilha de estoque", () => {
  it("importa Decant 5ml sem SKU pela coluna de tipo", () => {
    const [row] = parseProductRows([["SKU", "Produto", "Tipo de produto", "Volume", "Valor"], ["", "Khamrah", "Decant", "5 ml", 35]]);
    expect(row).toMatchObject({ sku: "", name: "Khamrah", productType: "decant", volume: "5ml", price: 35 });
  });
  it("importa Decant 10ml pela coluna Decant sem coluna SKU", () => {
    expect(parseProductRows([["Descrição", "Decant", "Valor"], ["Khamrah", "10ml", 60]])[0])
      .toMatchObject({ sku: "", productType: "decant", volume: "10ml", price: 60 });
  });
  it("gera códigos estáveis e diferentes para cada volume", () => {
    const sku = generateDecantSku("Khamrah", "Lattafa", "5ml");
    expect(sku).toMatch(/^DEC-5ML-[A-F0-9]{8}$/);
    expect(generateDecantSku(" KHAMRAH ", "LATTAFA", "5ml")).toBe(sku);
    expect(generateDecantSku("Khamrah", "Lattafa", "10ml")).not.toBe(sku);
  });
  it("restringe o filtro 5ml aos Decants", () => {
    expect(decantCatalogFilter(["5ml"])).toEqual({ productTypes: ["decant"], decantVolumes: ["5ml"] });
  });
  it("permite filtrar os dois volumes ou remover o filtro", () => {
    expect(decantCatalogFilter(["5ml", "10ml"])).toEqual({ productTypes: ["decant"], decantVolumes: ["5ml", "10ml"] });
    expect(decantCatalogFilter([])).toEqual({});
  });
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
