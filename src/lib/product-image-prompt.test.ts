import { describe, expect, it } from "vitest";
import { productImagePrompt, productImageInputSchema } from "./product-image-prompt";

const input = { productId: "3fd608b4-a270-47bd-b77f-26465783f221", name: "Decant Afnan 9AM", brand: "Afnan", volume: "5ml", productType: "decant", instructions: "Fundo claro" };
describe("foto do produto editado", () => {
  it("usa o nome, marca e volume do perfume editado como alvo", () => {
    const prompt = productImagePrompt(input, false);
    expect(prompt).toContain('Produto alvo: "Decant Afnan 9AM". Marca: "Afnan". Volume: "5ml". Tipo: "decant".');
    expect(prompt).toContain("Não copie o produto, marca, nome ou rótulo da imagem 1");
  });
  it("preserva a identidade da foto real quando fornecida", () => {
    expect(productImagePrompt(input, true)).toContain("A imagem 2 é o produto alvo real. Preserve rigorosamente seu frasco");
  });
  it("exige um produto identificado para geração", () => {
    expect(productImageInputSchema.safeParse({ ...input, productId: "" }).success).toBe(false);
  });
});